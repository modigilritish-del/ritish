"""category/category_routes.py - Item Master Category & Sub-Category Routes
   Exact API contract for frontend files:
     AddCategories.js  →  /api/item-category/*
     AddSubCategories.js → /api/item-sub-category/*
"""
import re
from fastapi import APIRouter, HTTPException, Depends, Query, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from typing import Optional

from database import get_db
from category import category_models as cat_models
from itemmaster.item_type_master_models import ItemTypeMaster

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  Pydantic schemas
# ─────────────────────────────────────────────────────────────────────────────

class CategoryCreateBody(BaseModel):
    item_type_id: int
    name: str
    description: Optional[str] = None


class SubCategoryCreateBody(BaseModel):
    category_id: int
    name: str
    description: Optional[str] = None
    created_by: Optional[int] = None


# ─────────────────────────────────────────────────────────────────────────────
#  Utility helpers
# ─────────────────────────────────────────────────────────────────────────────

def _clean(name: str) -> str:
    return re.sub(r'[^A-Z0-9]', '', name.upper())


def _get_item_type(db: Session, item_type_id: int) -> ItemTypeMaster:
    obj = db.query(ItemTypeMaster).filter(ItemTypeMaster.id == item_type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Item Type not found")
    return obj


def _generate_category_code(name: str, item_type: ItemTypeMaster, db: Session) -> str:
    """Format: {ItemTypeCode}-CAT-{name_slug}-{NNN}"""
    slug = _clean(name)[:4] or "XXXX"
    base = f"{item_type.code}-CAT-{slug}"
    existing = db.query(cat_models.Category.category_code).filter(
        cat_models.Category.category_code.like(f"{base}-%")
    ).all()
    nums = []
    for (c,) in existing:
        try:
            nums.append(int(c.rsplit("-", 1)[-1]))
        except ValueError:
            pass
    seq = max(nums, default=0) + 1
    return f"{base}-{seq:03d}"


def _preview_category_code(name: str, item_type: ItemTypeMaster) -> str:
    slug = _clean(name)[:4] or "XXXX"
    return f"{item_type.code}-CAT-{slug}-001"


def _generate_sub_category_code(name: str, category: cat_models.Category, db: Session) -> str:
    """Format: {CategoryCode}-SC-{name_slug}-{NNN}"""
    slug = _clean(name)[:4] or "XXXX"
    base = f"{category.category_code}-SC-{slug}"
    existing = db.query(cat_models.SubCategory.sub_category_code).filter(
        cat_models.SubCategory.sub_category_code.like(f"{base}-%")
    ).all()
    nums = []
    for (c,) in existing:
        try:
            nums.append(int(c.rsplit("-", 1)[-1]))
        except ValueError:
            pass
    seq = max(nums, default=0) + 1
    return f"{base}-{seq:03d}"


def _preview_sub_category_code(name: str, category: cat_models.Category) -> str:
    slug = _clean(name)[:4] or "XXXX"
    return f"{category.category_code}-SC-{slug}-001"


def _category_to_dict(cat: cat_models.Category, db: Session) -> dict:
    subcat_count = db.query(func.count(cat_models.SubCategory.id)).filter(
        cat_models.SubCategory.category_id == cat.id
    ).scalar()

    return {
        "id": cat.id,
        "name": cat.category_name,
        "code": cat.category_code,
        "description": cat.description,
        "is_active": cat.is_active,
        "item_type_id": cat.item_type_id,
        "item_type_name": cat.item_type.name if cat.item_type else None,
        "item_type_code": cat.item_type.code if cat.item_type else None,
        "total_subcategories": subcat_count,
        "created_at": cat.created_at,
        "updated_at": cat.updated_at,
    }


def _subcat_to_dict(sc: cat_models.SubCategory) -> dict:
    return {
        "id": sc.id,
        "name": sc.sub_category_name,
        "code": sc.sub_category_code,
        "description": sc.description,
        "is_active": sc.is_active,
        "category_id": sc.category_id,
        "created_at": sc.created_at,
        "updated_at": sc.updated_at,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  ITEM-CATEGORY
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/item-category/preview-code")
async def preview_category_code(
    name: str = Query(..., min_length=1),
    item_type_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """GET /api/item-category/preview-code?name=&item_type_id="""
    item_type = _get_item_type(db, item_type_id)
    return {"preview_code": _preview_category_code(name, item_type)}


@router.get("/item-category/lov")
async def get_category_lov(
    item_type_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """GET /api/item-category/lov?item_type_id=  — used by AddSubCategories, AddProduct, AddProductClassification"""
    q = db.query(cat_models.Category).options(
        joinedload(cat_models.Category.item_type)
    ).filter(cat_models.Category.is_active == True)
    if item_type_id:
        q = q.filter(cat_models.Category.item_type_id == item_type_id)
    cats = q.order_by(cat_models.Category.category_name).all()
    return [
        {
            "id": c.id,
            "name": c.category_name,
            "code": c.category_code,
            "item_type_id": c.item_type_id,
            "item_type_name": c.item_type.name if c.item_type else None,
        }
        for c in cats
    ]


@router.get("/item-category/")
async def list_categories(
    item_type_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """GET /api/item-category/  — used by AddCategories.js view tab"""
    q = db.query(cat_models.Category).options(
        joinedload(cat_models.Category.item_type),
    )
    if item_type_id:
        q = q.filter(cat_models.Category.item_type_id == item_type_id)
    if is_active is not None:
        q = q.filter(cat_models.Category.is_active == is_active)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(
            cat_models.Category.category_name.ilike(term),
            cat_models.Category.category_code.ilike(term)
        ))
    cats = q.order_by(cat_models.Category.category_name).all()
    return [_category_to_dict(c, db) for c in cats]


@router.post("/item-category/")
async def create_category(body: CategoryCreateBody, db: Session = Depends(get_db)):
    """POST /api/item-category/"""
    # Validate item type
    item_type = _get_item_type(db, body.item_type_id)

    # Generate code
    code = _generate_category_code(body.name, item_type, db)

    # Check duplicate name under same item_type
    if db.query(cat_models.Category).filter(
        cat_models.Category.category_name == body.name.strip(),
        cat_models.Category.item_type_id == body.item_type_id
    ).first():
        raise HTTPException(status_code=400, detail=f"Category '{body.name}' already exists under this Item Type")

    db_cat = cat_models.Category(
        item_type_id=body.item_type_id,
        category_name=body.name.strip(),
        category_code=code,
        description=body.description.strip() if body.description else None,
        is_active=True,
    )
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)

    return {
        "id": db_cat.id,
        "name": db_cat.category_name,
        "code": db_cat.category_code,
        "message": "Category created successfully",
    }


@router.post("/item-category/import")
async def import_category(
    name: str = Form(...),
    item_type_id: int = Form(...),
    description: Optional[str] = Form(None),
    user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """POST /api/item-category/import — Form-based single-record import used by ExcelImportPopup.
    Accepts FormData so the reusable ExcelImportPopup component works without modification.
    Code is always auto-generated from Item Type code + Name (same logic as manual create).
    """
    # Validate item type
    item_type = _get_item_type(db, item_type_id)

    name = name.strip()

    # Generate code
    code = _generate_category_code(name, item_type, db)

    # Check duplicate name under same item_type
    if db.query(cat_models.Category).filter(
        cat_models.Category.category_name == name,
        cat_models.Category.item_type_id == item_type_id
    ).first():
        raise HTTPException(status_code=400, detail=f"Category '{name}' already exists under this Item Type")

    db_cat = cat_models.Category(
        item_type_id=item_type_id,
        category_name=name,
        category_code=code,
        description=description.strip() if description else None,
        is_active=True,
        created_by=user_id,
    )
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)

    return {
        "id": db_cat.id,
        "name": db_cat.category_name,
        "code": db_cat.category_code,
        "message": "Category created successfully",
    }


@router.delete("/item-category/{category_id}")
async def delete_category(
    category_id: int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """DELETE /api/item-category/{id}?updated_by=  — soft delete"""
    cat = db.query(cat_models.Category).filter(cat_models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    active_sub = db.query(cat_models.SubCategory).filter(
        cat_models.SubCategory.category_id == category_id,
        cat_models.SubCategory.is_active == True
    ).count()
    if active_sub > 0:
        raise HTTPException(status_code=400, detail=f"Cannot deactivate: {active_sub} active sub-categories exist")

    cat.is_active = False
    if updated_by:
        cat.updated_by = updated_by
    db.commit()
    return {"message": f"Category '{cat.category_name}' deactivated successfully"}


# ═════════════════════════════════════════════════════════════════════════════
#  ITEM-SUB-CATEGORY
# ═════════════════════════════════════════════════════════════════════════════

@router.get("/item-sub-category/preview-code")
async def preview_sub_category_code(
    name: str = Query(..., min_length=1),
    category_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """GET /api/item-sub-category/preview-code?name=&category_id="""
    cat = db.query(cat_models.Category).filter(cat_models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"preview_code": _preview_sub_category_code(name, cat)}


@router.get("/item-sub-category/lov")
async def get_sub_category_lov(
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """GET /api/item-sub-category/lov?category_id=  — used by AddProduct, AddProductClassification"""
    q = db.query(cat_models.SubCategory).filter(cat_models.SubCategory.is_active == True)
    if category_id:
        q = q.filter(cat_models.SubCategory.category_id == category_id)
    subs = q.order_by(cat_models.SubCategory.sub_category_name).all()
    return [{"id": s.id, "name": s.sub_category_name, "code": s.sub_category_code, "category_id": s.category_id}
            for s in subs]


@router.get("/item-sub-category/")
async def list_sub_categories(
    category_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """GET /api/item-sub-category/?category_id=&is_active=  — used by AddSubCategories view tab"""
    q = db.query(cat_models.SubCategory)
    if category_id:
        q = q.filter(cat_models.SubCategory.category_id == category_id)
    if is_active is not None:
        q = q.filter(cat_models.SubCategory.is_active == is_active)
    subs = q.order_by(cat_models.SubCategory.sub_category_name).all()
    return [_subcat_to_dict(s) for s in subs]


@router.post("/item-sub-category/")
async def create_sub_category(body: SubCategoryCreateBody, db: Session = Depends(get_db)):
    """POST /api/item-sub-category/"""
    cat = db.query(cat_models.Category).filter(cat_models.Category.id == body.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Duplicate name check
    if db.query(cat_models.SubCategory).filter(
        cat_models.SubCategory.category_id == body.category_id,
        cat_models.SubCategory.sub_category_name == body.name.strip()
    ).first():
        raise HTTPException(status_code=400, detail=f"Sub-category '{body.name}' already exists in this category")

    code = _generate_sub_category_code(body.name, cat, db)

    db_sub = cat_models.SubCategory(
        category_id=body.category_id,
        sub_category_name=body.name.strip(),
        sub_category_code=code,
        description=body.description.strip() if body.description else None,
        is_active=True,
        created_by=body.created_by,
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)

    return {
        "id": db_sub.id,
        "name": db_sub.sub_category_name,
        "code": db_sub.sub_category_code,
        "message": "Sub-category created successfully",
    }


@router.post("/item-sub-category/import")
async def import_sub_category(
    name: str = Form(...),
    category_id: int = Form(...),
    description: Optional[str] = Form(None),
    user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    """POST /api/item-sub-category/import — Form-based single-record import used by ExcelImportPopup.
    Accepts FormData so the reusable ExcelImportPopup component works without modification.
    Code is always auto-generated from Category code + Name (same logic as manual create).
    """
    cat = db.query(cat_models.Category).filter(cat_models.Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    name = name.strip()

    # Duplicate name check
    if db.query(cat_models.SubCategory).filter(
        cat_models.SubCategory.category_id == category_id,
        cat_models.SubCategory.sub_category_name == name
    ).first():
        raise HTTPException(status_code=400, detail=f"Sub-category '{name}' already exists in this category")

    code = _generate_sub_category_code(name, cat, db)

    db_sub = cat_models.SubCategory(
        category_id=category_id,
        sub_category_name=name,
        sub_category_code=code,
        description=description.strip() if description else None,
        is_active=True,
        created_by=user_id,
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)

    return {
        "id": db_sub.id,
        "name": db_sub.sub_category_name,
        "code": db_sub.sub_category_code,
        "message": "Sub-category created successfully",
    }


@router.delete("/item-sub-category/{sub_category_id}")
async def delete_sub_category(
    sub_category_id: int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """DELETE /api/item-sub-category/{id}?updated_by=  — soft delete"""
    sub = db.query(cat_models.SubCategory).filter(cat_models.SubCategory.id == sub_category_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Sub-category not found")

    sub.is_active = False
    if updated_by:
        sub.updated_by = updated_by
    db.commit()
    return {"message": f"Sub-category '{sub.sub_category_name}' deactivated successfully"}