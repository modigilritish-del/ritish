"""productClassification/product_routers.py - Item Master Product & Classification Routes
   Exact API contract for frontend files:
     AddProduct.jsx              →  /api/item-product/*
     AddProductClassification.jsx → /api/item-product-classification/*

   Scope support:
     Global       → company_id=None, plant_id=None, is_multi_company=False
     Company-wide → company_id set, plant_id=None
     Plant-specific → company_id set, plant_id set
     Multi-company  → is_multi_company=True, rows in ProductCompanyMapping

   Future mapping endpoints (ready to use):
     GET  /api/item-product/{id}/companies        → list mapped companies
     POST /api/item-product/{id}/companies        → add company mapping
     DELETE /api/item-product/{id}/companies/{cid}→ remove company mapping
     GET  /api/item-product/{id}/plants           → list mapped plants
     POST /api/item-product/{id}/plants           → add plant mapping
     DELETE /api/item-product/{id}/plants/{pid}   → remove plant mapping
"""
import re
from fastapi import APIRouter, HTTPException, Depends, Query, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Optional

from database import get_db
import db_models as models
from productClassification import product_models as prod_models
from category import category_models as cat_models

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  Pydantic schemas (inline)
# ─────────────────────────────────────────────────────────────────────────────

class ProductCreateBody(BaseModel):
    subcategory_id: int
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    created_by: Optional[int] = None
    # ── Scope (all optional) ─────────────────────────────────────────────────
    # None, None       → Global
    # company_id only  → Company-wide
    # company_id + plant_id → Plant-specific
    # company_ids list → Multi-company
    company_id:  Optional[int]       = None
    company_ids: Optional[List[int]] = None
    plant_id:    Optional[int]       = None
    # ─────────────────────────────────────────────────────────────────────────


class ClassificationCreateBody(BaseModel):
    product_id: int
    name: str
    description: Optional[str] = None
    grade: Optional[str] = None
    quality_standard: Optional[str] = None
    certification: Optional[str] = None
    created_by: Optional[int] = None


# Mapping bodies (for future endpoints)
class CompanyMappingBody(BaseModel):
    company_id: int


class PlantMappingBody(BaseModel):
    plant_id: int
    is_primary: bool = False


# ─────────────────────────────────────────────────────────────────────────────
#  Code-generation helpers
# ─────────────────────────────────────────────────────────────────────────────

def _clean(name: str) -> str:
    return re.sub(r'[^A-Z0-9]', '', name.upper())


def _generate_product_code(name: str, sub_category: cat_models.SubCategory, db: Session) -> str:
    slug = _clean(name)[:4] or "XXXX"
    base = f"{sub_category.sub_category_code}-PRD-{slug}"
    existing = db.query(prod_models.Product.product_code).filter(
        prod_models.Product.product_code.like(f"{base}-%")
    ).all()
    nums = []
    for (c,) in existing:
        try: nums.append(int(c.rsplit("-", 1)[-1]))
        except ValueError: pass
    return f"{base}-{max(nums, default=0) + 1:04d}"


def _preview_product_code(name: str, sub_category: cat_models.SubCategory) -> str:
    slug = _clean(name)[:4] or "XXXX"
    return f"{sub_category.sub_category_code}-PRD-{slug}-0001"


def _generate_classification_code(name: str, product: prod_models.Product, db: Session) -> str:
    slug = _clean(name)[:4] or "XXXX"
    base = f"{product.product_code}-CLS-{slug}"
    existing = db.query(prod_models.ProductClassification.classification_code).filter(
        prod_models.ProductClassification.classification_code.like(f"{base}-%")
    ).all()
    nums = []
    for (c,) in existing:
        try: nums.append(int(c.rsplit("-", 1)[-1]))
        except ValueError: pass
    return f"{base}-{max(nums, default=0) + 1:03d}"


def _preview_classification_code(name: str, product: prod_models.Product) -> str:
    slug = _clean(name)[:4] or "XXXX"
    return f"{product.product_code}-CLS-{slug}-001"


# ─────────────────────────────────────────────────────────────────────────────
#  Scope helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_product_companies(db: Session, product: prod_models.Product) -> List[dict]:
    """Return list of company dicts for a product (single or multi)."""
    if product.is_multi_company:
        mappings = db.query(prod_models.ProductCompanyMapping).filter(
            prod_models.ProductCompanyMapping.product_id == product.id
        ).options(joinedload(prod_models.ProductCompanyMapping.company)).all()
        return [{"id": m.company.id, "name": m.company.company_name, "code": m.company.company_code}
                for m in mappings]
    elif product.company_id:
        company = db.query(models.Company).filter(models.Company.id == product.company_id).first()
        if company:
            return [{"id": company.id, "name": company.company_name, "code": company.company_code}]
    return []


def _get_product_plants(db: Session, product: prod_models.Product) -> List[dict]:
    """Return list of plant dicts from ProductPlantMapping."""
    mappings = db.query(prod_models.ProductPlantMapping).filter(
        prod_models.ProductPlantMapping.product_id == product.id
    ).options(joinedload(prod_models.ProductPlantMapping.plant)).all()
    return [{"id": m.plant.id, "name": m.plant.plant_name, "code": m.plant.plant_code, "is_primary": m.is_primary}
            for m in mappings]


def _build_scope(product: prod_models.Product, companies: List[dict], plants: List[dict]) -> tuple:
    """Return (scope, scope_label)."""
    if product.is_multi_company:
        codes = ", ".join(c["code"] for c in companies)
        return "multi_company", f"Multi-Company: {codes}"
    elif product.plant_id:
        plant_code = product.plant.plant_code if product.plant else "N/A"
        return "plant", f"Plant-specific — {plant_code}"
    elif product.company_id:
        code = companies[0]["code"] if companies else "N/A"
        return "company", f"Company-wide — {code}"
    else:
        return "global", "Global (all companies & plants)"


# ─────────────────────────────────────────────────────────────────────────────
#  Response helpers
# ─────────────────────────────────────────────────────────────────────────────

def _product_to_dict(p: prod_models.Product, db: Session) -> dict:
    cls_count = db.query(func.count(prod_models.ProductClassification.id)).filter(
        prod_models.ProductClassification.product_id == p.id
    ).scalar()

    sc  = p.sub_category
    cat = sc.category if sc else None
    it  = cat.item_type if cat else None

    companies = _get_product_companies(db, p)
    plants    = _get_product_plants(db, p)
    scope, scope_label = _build_scope(p, companies, plants)

    return {
        "id":           p.id,
        "name":         p.product_name,
        "code":         p.product_code,
        "description":  p.description,
        "sku":          p.sku,
        "barcode":      p.barcode,
        "is_active":    p.is_active,
        "sub_category_id":   p.sub_category_id,
        "subcategory_name":  sc.sub_category_name if sc else None,
        "subcategory_code":  sc.sub_category_code if sc else None,
        "category_id":       cat.id if cat else None,
        "category_name":     cat.category_name if cat else None,
        "category_code":     cat.category_code if cat else None,
        "item_type_id":      it.id if it else None,
        "item_type_name":    it.name if it else None,
        # Scope
        "company_id":        p.company_id,
        "plant_id":          p.plant_id,
        "is_multi_company":  p.is_multi_company,
        "scope":             scope,
        "scope_label":       scope_label,
        "company_name":      companies[0]["name"] if companies else None,
        "plant_name":        (p.plant.plant_name if p.plant else None),
        "companies":         companies if p.is_multi_company else None,
        "plants":            plants if plants else None,
        # Stats
        "total_classifications": cls_count,
        "created_at":  p.created_at,
        "updated_at":  p.updated_at,
    }


def _classification_to_dict(c: prod_models.ProductClassification) -> dict:
    p  = c.product
    sc = p.sub_category if p else None
    cat = sc.category if sc else None
    return {
        "id":                 c.id,
        "name":               c.classification_name,
        "code":               c.classification_code,
        "description":        c.description,
        "grade":              c.grade,
        "quality_standard":   c.quality_standard,
        "certification":      c.certification,
        "is_active":          c.is_active,
        "product_id":         c.product_id,
        "product_name":       p.product_name if p else None,
        "product_code":       p.product_code if p else None,
        "subcategory_name":   sc.sub_category_name if sc else None,
        "category_name":      cat.category_name if cat else None,
        "created_at":         c.created_at,
        "updated_at":         c.updated_at,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  ITEM-PRODUCT
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/item-product/preview-code")
async def preview_product_code(
    name: str = Query(..., min_length=1),
    subcategory_id: int = Query(...),
    db: Session = Depends(get_db)
):
    sc = db.query(cat_models.SubCategory).filter(cat_models.SubCategory.id == subcategory_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Sub-category not found")
    return {"preview_code": _preview_product_code(name, sc)}


@router.get("/item-product/lov")
async def get_product_lov(
    subcategory_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(prod_models.Product).filter(prod_models.Product.is_active == True)
    if subcategory_id:
        q = q.filter(prod_models.Product.sub_category_id == subcategory_id)
    prods = q.order_by(prod_models.Product.product_name).all()
    return [{"id": p.id, "name": p.product_name, "code": p.product_code, "sub_category_id": p.sub_category_id}
            for p in prods]


@router.get("/item-product/")
async def list_products(
    item_type_id:   Optional[int]  = Query(None),
    subcategory_id: Optional[int]  = Query(None),
    company_id:     Optional[int]  = Query(None),
    is_active:      Optional[bool] = Query(None),
    search:         Optional[str]  = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(prod_models.Product).options(
        joinedload(prod_models.Product.sub_category)
        .joinedload(cat_models.SubCategory.category)
        .joinedload(cat_models.Category.item_type),
        joinedload(prod_models.Product.company),
        joinedload(prod_models.Product.plant),
    )

    if subcategory_id:
        q = q.filter(prod_models.Product.sub_category_id == subcategory_id)
    if is_active is not None:
        q = q.filter(prod_models.Product.is_active == is_active)
    if item_type_id:
        q = q.join(cat_models.SubCategory, prod_models.Product.sub_category_id == cat_models.SubCategory.id) \
             .join(cat_models.Category, cat_models.SubCategory.category_id == cat_models.Category.id) \
             .filter(cat_models.Category.item_type_id == item_type_id)
    if company_id:
        multi_ids = db.query(prod_models.ProductCompanyMapping.product_id).filter(
            prod_models.ProductCompanyMapping.company_id == company_id
        )
        q = q.filter(or_(
            prod_models.Product.company_id == company_id,
            prod_models.Product.id.in_(multi_ids)
        ))
    if search:
        term = f"%{search}%"
        q = q.filter(or_(
            prod_models.Product.product_name.ilike(term),
            prod_models.Product.product_code.ilike(term),
            prod_models.Product.sku.ilike(term),
        ))

    prods = q.order_by(prod_models.Product.product_name).all()
    return [_product_to_dict(p, db) for p in prods]


@router.post("/item-product/import")
async def import_product(
    name: str = Form(...),
    subcategory_id: int = Form(...),
    description: Optional[str] = Form(None),
    sku: Optional[str] = Form(None),
    barcode: Optional[str] = Form(None),
    user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """POST /api/item-product/import — Form-based single-record import used by ExcelImportPopup.
    Accepts FormData so the reusable ExcelImportPopup component works without modification.
    Scope defaults to Global. Code is always auto-generated.
    NOTE: Defined BEFORE all {product_id} wildcard routes to prevent FastAPI matching
          "import" as a {product_id} path param (causing 405 Method Not Allowed).
    """
    sc = db.query(cat_models.SubCategory).filter(cat_models.SubCategory.id == subcategory_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Sub-category not found")

    name = name.strip()

    # Duplicate name check
    if db.query(prod_models.Product).filter(
        prod_models.Product.sub_category_id == subcategory_id,
        prod_models.Product.product_name == name
    ).first():
        raise HTTPException(status_code=400, detail=f"Product '{name}' already exists in this sub-category")

    # SKU / barcode uniqueness
    if sku and db.query(prod_models.Product).filter(prod_models.Product.sku == sku.strip()).first():
        raise HTTPException(status_code=400, detail=f"SKU '{sku}' already exists")
    if barcode and db.query(prod_models.Product).filter(prod_models.Product.barcode == barcode.strip()).first():
        raise HTTPException(status_code=400, detail=f"Barcode '{barcode}' already exists")

    code = _generate_product_code(name, sc, db)

    db_prod = prod_models.Product(
        sub_category_id  = subcategory_id,
        company_id       = None,
        plant_id         = None,
        is_multi_company = False,
        product_name     = name,
        product_code     = code,
        description      = description.strip() if description else None,
        sku              = sku.strip() if sku else None,
        barcode          = barcode.strip() if barcode else None,
        is_active        = True,
        created_by       = user_id,
    )
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)

    return {
        "id":      db_prod.id,
        "name":    db_prod.product_name,
        "code":    db_prod.product_code,
        "message": "Product created successfully",
    }


@router.post("/item-product/")
async def create_product(body: ProductCreateBody, db: Session = Depends(get_db)):
    sc = db.query(cat_models.SubCategory).filter(
        cat_models.SubCategory.id == body.subcategory_id
    ).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Sub-category not found")

    # Duplicate name check
    if db.query(prod_models.Product).filter(
        prod_models.Product.sub_category_id == body.subcategory_id,
        prod_models.Product.product_name == body.name.strip()
    ).first():
        raise HTTPException(status_code=400, detail=f"Product '{body.name}' already exists in this sub-category")

    # SKU / barcode uniqueness
    if body.sku and db.query(prod_models.Product).filter(prod_models.Product.sku == body.sku.strip()).first():
        raise HTTPException(status_code=400, detail=f"SKU '{body.sku}' already exists")
    if body.barcode and db.query(prod_models.Product).filter(prod_models.Product.barcode == body.barcode.strip()).first():
        raise HTTPException(status_code=400, detail=f"Barcode '{body.barcode}' already exists")

    # Resolve scope
    company_id_list = body.company_ids if body.company_ids else ([body.company_id] if body.company_id else [])
    is_multi        = len(company_id_list) > 1

    if body.plant_id and is_multi:
        raise HTTPException(status_code=400, detail="Plant-specific products can only be created for a single company")

    # Validate companies if provided
    for cid in company_id_list:
        if not db.query(models.Company).filter(models.Company.id == cid).first():
            raise HTTPException(status_code=404, detail=f"Company ID {cid} not found")

    code = _generate_product_code(body.name, sc, db)

    db_prod = prod_models.Product(
        sub_category_id  = body.subcategory_id,
        company_id       = company_id_list[0] if (not is_multi and company_id_list) else None,
        plant_id         = body.plant_id,
        is_multi_company = is_multi,
        product_name     = body.name.strip(),
        product_code     = code,
        description      = body.description.strip() if body.description else None,
        sku              = body.sku.strip() if body.sku else None,
        barcode          = body.barcode.strip() if body.barcode else None,
        is_active        = True,
        created_by       = body.created_by,
    )
    db.add(db_prod)
    db.flush()

    # Add multi-company mappings
    if is_multi:
        for cid in company_id_list:
            db.add(prod_models.ProductCompanyMapping(product_id=db_prod.id, company_id=cid))

    db.commit()
    db.refresh(db_prod)

    return {
        "id":      db_prod.id,
        "name":    db_prod.product_name,
        "code":    db_prod.product_code,
        "message": "Product created successfully",
    }


@router.delete("/item-product/{product_id}")
async def delete_product(
    product_id: int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    prod = db.query(prod_models.Product).filter(prod_models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    active_cls = db.query(prod_models.ProductClassification).filter(
        prod_models.ProductClassification.product_id == product_id,
        prod_models.ProductClassification.is_active == True
    ).count()
    if active_cls > 0:
        raise HTTPException(status_code=400, detail=f"Cannot deactivate: {active_cls} active classifications exist")

    prod.is_active = False
    if updated_by:
        prod.updated_by = updated_by
    db.commit()
    return {"message": f"Product '{prod.product_name}' deactivated successfully"}


# ─────────────────────────────────────────────────────────────────────────────
#  FUTURE MAPPING ENDPOINTS
#  These are ready to use — just call them from frontend when needed.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/item-product/{product_id}/companies")
async def get_product_companies(product_id: int, db: Session = Depends(get_db)):
    """GET /api/item-product/{id}/companies — list all company mappings for a product"""
    prod = db.query(prod_models.Product).filter(prod_models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return _get_product_companies(db, prod)


@router.post("/item-product/{product_id}/companies")
async def add_product_company(product_id: int, body: CompanyMappingBody, db: Session = Depends(get_db)):
    """POST /api/item-product/{id}/companies — map product to a company"""
    prod = db.query(prod_models.Product).filter(prod_models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    if not db.query(models.Company).filter(models.Company.id == body.company_id).first():
        raise HTTPException(status_code=404, detail="Company not found")
    existing = db.query(prod_models.ProductCompanyMapping).filter(
        prod_models.ProductCompanyMapping.product_id == product_id,
        prod_models.ProductCompanyMapping.company_id == body.company_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company already mapped to this product")
    db.add(prod_models.ProductCompanyMapping(product_id=product_id, company_id=body.company_id))
    prod.is_multi_company = True
    prod.company_id = None
    db.commit()
    return {"message": "Company mapped successfully"}


@router.delete("/item-product/{product_id}/companies/{company_id}")
async def remove_product_company(product_id: int, company_id: int, db: Session = Depends(get_db)):
    """DELETE /api/item-product/{id}/companies/{company_id} — remove company mapping"""
    mapping = db.query(prod_models.ProductCompanyMapping).filter(
        prod_models.ProductCompanyMapping.product_id == product_id,
        prod_models.ProductCompanyMapping.company_id == company_id
    ).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    db.delete(mapping)
    # If no more multi mappings, reset is_multi_company
    remaining = db.query(prod_models.ProductCompanyMapping).filter(
        prod_models.ProductCompanyMapping.product_id == product_id
    ).count()
    if remaining <= 1:
        prod = db.query(prod_models.Product).filter(prod_models.Product.id == product_id).first()
        if prod:
            prod.is_multi_company = False
    db.commit()
    return {"message": "Company mapping removed"}


@router.get("/item-product/{product_id}/plants")
async def get_product_plants(product_id: int, db: Session = Depends(get_db)):
    """GET /api/item-product/{id}/plants — list all plant mappings for a product"""
    prod = db.query(prod_models.Product).filter(prod_models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return _get_product_plants(db, prod)


@router.post("/item-product/{product_id}/plants")
async def add_product_plant(product_id: int, body: PlantMappingBody, db: Session = Depends(get_db)):
    """POST /api/item-product/{id}/plants — map product to a plant"""
    prod = db.query(prod_models.Product).filter(prod_models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    if not db.query(models.Plant).filter(models.Plant.id == body.plant_id).first():
        raise HTTPException(status_code=404, detail="Plant not found")
    existing = db.query(prod_models.ProductPlantMapping).filter(
        prod_models.ProductPlantMapping.product_id == product_id,
        prod_models.ProductPlantMapping.plant_id == body.plant_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Plant already mapped to this product")
    # If is_primary, unset previous primary
    if body.is_primary:
        db.query(prod_models.ProductPlantMapping).filter(
            prod_models.ProductPlantMapping.product_id == product_id,
            prod_models.ProductPlantMapping.is_primary == True
        ).update({"is_primary": False})
    db.add(prod_models.ProductPlantMapping(product_id=product_id, plant_id=body.plant_id, is_primary=body.is_primary))
    db.commit()
    return {"message": "Plant mapped successfully"}


@router.delete("/item-product/{product_id}/plants/{plant_id}")
async def remove_product_plant(product_id: int, plant_id: int, db: Session = Depends(get_db)):
    """DELETE /api/item-product/{id}/plants/{plant_id} — remove plant mapping"""
    mapping = db.query(prod_models.ProductPlantMapping).filter(
        prod_models.ProductPlantMapping.product_id == product_id,
        prod_models.ProductPlantMapping.plant_id == plant_id
    ).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    db.delete(mapping)
    db.commit()
    return {"message": "Plant mapping removed"}


# ═════════════════════════════════════════════════════════════════════════════
#  ITEM-PRODUCT-CLASSIFICATION
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/item-product-classification/preview-code")
async def preview_classification_code(
    name: str = Query(..., min_length=1),
    product_id: int = Query(...),
    db: Session = Depends(get_db)
):
    prod = db.query(prod_models.Product).filter(prod_models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"preview_code": _preview_classification_code(name, prod)}


@router.get("/item-product-classification/")
async def list_classifications(
    product_id: Optional[int]  = Query(None),
    is_active:  Optional[bool] = Query(None),
    search:     Optional[str]  = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(prod_models.ProductClassification).options(
        joinedload(prod_models.ProductClassification.product)
        .joinedload(prod_models.Product.sub_category)
        .joinedload(cat_models.SubCategory.category)
    )
    if product_id:
        q = q.filter(prod_models.ProductClassification.product_id == product_id)
    if is_active is not None:
        q = q.filter(prod_models.ProductClassification.is_active == is_active)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(
            prod_models.ProductClassification.classification_name.ilike(term),
            prod_models.ProductClassification.classification_code.ilike(term),
            prod_models.ProductClassification.grade.ilike(term),
        ))
    clss = q.order_by(prod_models.ProductClassification.classification_name).all()
    return [_classification_to_dict(c) for c in clss]


@router.post("/item-product-classification/")
async def create_classification(body: ClassificationCreateBody, db: Session = Depends(get_db)):
    prod = db.query(prod_models.Product).options(
        joinedload(prod_models.Product.sub_category)
    ).filter(prod_models.Product.id == body.product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    if db.query(prod_models.ProductClassification).filter(
        prod_models.ProductClassification.product_id == body.product_id,
        prod_models.ProductClassification.classification_name == body.name.strip()
    ).first():
        raise HTTPException(status_code=400, detail=f"Classification '{body.name}' already exists for this product")

    code = _generate_classification_code(body.name, prod, db)

    db_cls = prod_models.ProductClassification(
        product_id           = body.product_id,
        classification_name  = body.name.strip(),
        classification_code  = code,
        description          = body.description.strip() if body.description else None,
        grade                = body.grade.strip() if body.grade else None,
        quality_standard     = body.quality_standard.strip() if body.quality_standard else None,
        certification        = body.certification.strip() if body.certification else None,
        is_active            = True,
        created_by           = body.created_by,
    )
    db.add(db_cls)
    db.commit()
    db.refresh(db_cls)

    return {
        "id":      db_cls.id,
        "name":    db_cls.classification_name,
        "code":    db_cls.classification_code,
        "message": "Classification created successfully",
    }


@router.post("/item-product-classification/import")
async def import_classification(
    name: str = Form(...),
    product_id: int = Form(...),
    description: Optional[str] = Form(None),
    grade: Optional[str] = Form(None),
    quality_standard: Optional[str] = Form(None),
    certification: Optional[str] = Form(None),
    user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """POST /api/item-product-classification/import — Form-based single-record import used by ExcelImportPopup.
    Accepts FormData so the reusable ExcelImportPopup component works without modification.
    Code is always auto-generated.
    NOTE: Must be defined BEFORE @router.delete("/item-product-classification/{classification_id}")
          to prevent FastAPI matching "import" as a {classification_id} path param (causing 405).
    """
    prod = db.query(prod_models.Product).options(
        joinedload(prod_models.Product.sub_category)
    ).filter(prod_models.Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    name = name.strip()

    if db.query(prod_models.ProductClassification).filter(
        prod_models.ProductClassification.product_id == product_id,
        prod_models.ProductClassification.classification_name == name
    ).first():
        raise HTTPException(status_code=400, detail=f"Classification '{name}' already exists for this product")

    code = _generate_classification_code(name, prod, db)

    db_cls = prod_models.ProductClassification(
        product_id           = product_id,
        classification_name  = name,
        classification_code  = code,
        description          = description.strip() if description else None,
        grade                = grade.strip() if grade else None,
        quality_standard     = quality_standard.strip() if quality_standard else None,
        certification        = certification.strip() if certification else None,
        is_active            = True,
        created_by           = user_id,
    )
    db.add(db_cls)
    db.commit()
    db.refresh(db_cls)

    return {
        "id":      db_cls.id,
        "name":    db_cls.classification_name,
        "code":    db_cls.classification_code,
        "message": "Classification created successfully",
    }


@router.delete("/item-product-classification/{classification_id}")
async def delete_classification(
    classification_id: int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    cls = db.query(prod_models.ProductClassification).filter(
        prod_models.ProductClassification.id == classification_id
    ).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Classification not found")

    cls.is_active = False
    if updated_by:
        cls.updated_by = updated_by
    db.commit()
    return {"message": f"Classification '{cls.classification_name}' deactivated successfully"}