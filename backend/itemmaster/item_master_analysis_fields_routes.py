"""
itemmaster/item_master_analysis_fields_routes.py
─────────────────────────────────────────────────────────────────────────────
FastAPI router for Item Master Analysis Fields.

ENDPOINT MAP
────────────
  POST   /item-master-info/analysis-fields/
  GET    /item-master-info/analysis-fields/{entity_id}
  PUT    /item-master-info/analysis-fields/{record_id}
  DELETE /item-master-info/analysis-fields/{record_id}

  GET    /item-master-info/analysis-fields/history/{entity_id}

  ── LOV helpers (company-scoped, used by frontend) ──
  GET    /item-master-info/analysis-fields/lov/categories
  GET    /item-master-info/analysis-fields/lov/sub-categories?category_id=
  GET    /item-master-info/analysis-fields/lov/products?sub_category_id=&company_id=
  GET    /item-master-info/analysis-fields/lov/classifications?product_id=

─────────────────────────────────────────────────────────────────────────────
NOTE: This file uses "ANALYSIS_FIELDS" as a plain string for table_name in
      the change log. It does NOT require ItemMasterInfoTableEnum to be
      modified — it works as-is with zero changes to any existing file.
─────────────────────────────────────────────────────────────────────────────
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from user import user_models as umodels

# ── Import the new model ──────────────────────────────────────────────────────
from itemmaster.item_master_analysis_fields_model import ItemMasterAnalysisFieldsRecord

# ── Reuse only the change-log model from existing file (NOT the enum) ─────────
from itemmaster.item_master_info_models import ItemMasterInfoChangeLog, ItemMasterInfoTableEnum

# ── Category / SubCat / Product / Classification models ──────────────────────
from category.category_models import Category, SubCategory
from productClassification.product_models import Product, ProductClassification

router = APIRouter()

# String constant — no enum dependency, works without modifying any existing file
TABLE_NAME = ItemMasterInfoTableEnum.ANALYSIS_FIELDS


# ═════════════════════════════════════════════════════════════════════════════
#  SCHEMAS
# ═════════════════════════════════════════════════════════════════════════════

class AnalysisFieldsCreate(BaseModel):
    request_id:         Optional[str] = None
    entity_id:          int
    category_id:        Optional[int] = None
    sub_category_id:    Optional[int] = None
    product_id:         Optional[int] = None
    classification_id:  Optional[int] = None
    notes:              Optional[str] = None
    changed_by:         Optional[int] = None
    change_reason:      Optional[str] = None


class AnalysisFieldsUpdate(BaseModel):
    category_id:        Optional[int] = None
    sub_category_id:    Optional[int] = None
    product_id:         Optional[int] = None
    classification_id:  Optional[int] = None
    notes:              Optional[str] = None
    updated_by:         Optional[int] = None
    change_reason:      Optional[str] = None


class AnalysisFieldsResponse(BaseModel):
    id:                  int
    request_id:          Optional[str] = None
    entity_id:           int
    category_id:         Optional[int] = None
    category_name:       Optional[str] = None
    category_code:       Optional[str] = None
    sub_category_id:     Optional[int] = None
    sub_category_name:   Optional[str] = None
    sub_category_code:   Optional[str] = None
    product_id:          Optional[int] = None
    product_name:        Optional[str] = None
    product_code:        Optional[str] = None
    classification_id:   Optional[int] = None
    classification_name: Optional[str] = None
    classification_code: Optional[str] = None
    notes:               Optional[str] = None
    is_active:           bool
    created_by:          Optional[int] = None
    updated_by:          Optional[int] = None
    created_at:          datetime
    updated_at:          datetime

    class Config:
        from_attributes = True


class AnalysisFieldsChangeLogEntry(BaseModel):
    id:                    int
    request_id:            Optional[str] = None
    entity_id:             int
    table_name:            str
    record_id:             int
    action:                str
    field_name:            Optional[str] = None
    old_value:             Optional[str] = None
    new_value:             Optional[str] = None
    changed_by:            Optional[int] = None
    changer_name_snapshot: Optional[str] = None
    change_reason:         Optional[str] = None
    changed_at:            datetime

    class Config:
        from_attributes = True


class LovItem(BaseModel):
    id:   int
    name: str
    code: str


# ═════════════════════════════════════════════════════════════════════════════
#  INTERNAL HELPERS  (same pattern as item_master_info_routes.py)
# ═════════════════════════════════════════════════════════════════════════════

def _get_changer_name(db: Session, user_id: Optional[int]) -> Optional[str]:
    if not user_id:
        return None
    u = db.query(umodels.User).filter(umodels.User.id == user_id).first()
    return u.full_name if u else None


def _write_log(
    db: Session,
    *,
    request_id:    Optional[str],
    entity_id:     int,
    record_id:     int,
    action:        str,
    field_name:    Optional[str] = None,
    old_value:     Optional[str] = None,
    new_value:     Optional[str] = None,
    changed_by:    Optional[int] = None,
    change_reason: Optional[str] = None,
):
    """Write one row to the shared item_master_info_change_log."""
    db.add(ItemMasterInfoChangeLog(
        request_id            = request_id,
        entity_id             = entity_id,
        table_name            = TABLE_NAME,   # plain string, not enum
        record_id             = record_id,
        action                = action,
        field_name            = field_name,
        old_value             = old_value,
        new_value             = new_value,
        changed_by            = changed_by,
        changer_name_snapshot = _get_changer_name(db, changed_by),
        change_reason         = change_reason,
    ))


def _snapshot_category(db: Session, category_id: Optional[int]):
    if not category_id:
        return None, None
    c = db.query(Category).filter(Category.id == category_id).first()
    return (c.category_name, c.category_code) if c else (None, None)


def _snapshot_sub_category(db: Session, sub_category_id: Optional[int]):
    if not sub_category_id:
        return None, None
    s = db.query(SubCategory).filter(SubCategory.id == sub_category_id).first()
    return (s.sub_category_name, s.sub_category_code) if s else (None, None)


def _snapshot_product(db: Session, product_id: Optional[int]):
    if not product_id:
        return None, None
    p = db.query(Product).filter(Product.id == product_id).first()
    return (p.product_name, p.product_code) if p else (None, None)


def _snapshot_classification(db: Session, classification_id: Optional[int]):
    if not classification_id:
        return None, None
    c = db.query(ProductClassification).filter(
        ProductClassification.id == classification_id
    ).first()
    return (c.classification_name, c.classification_code) if c else (None, None)


# ═════════════════════════════════════════════════════════════════════════════
#  LOV ENDPOINTS  — company-scoped dropdowns for frontend
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-master-info/analysis-fields/lov/categories",
    response_model=List[LovItem],
    summary="LOV — All active categories",
)
def lov_categories(db: Session = Depends(get_db)):
    rows = db.query(Category).filter(Category.is_active == True).all()
    return [LovItem(id=r.id, name=r.category_name, code=r.category_code) for r in rows]


@router.get(
    "/item-master-info/analysis-fields/lov/sub-categories",
    response_model=List[LovItem],
    summary="LOV — Sub-categories filtered by category_id",
)
def lov_sub_categories(
    category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(SubCategory).filter(SubCategory.is_active == True)
    if category_id:
        q = q.filter(SubCategory.category_id == category_id)
    rows = q.all()
    return [LovItem(id=r.id, name=r.sub_category_name, code=r.sub_category_code) for r in rows]


@router.get(
    "/item-master-info/analysis-fields/lov/products",
    response_model=List[LovItem],
    summary="LOV — Products filtered by sub_category_id and company_id",
)
def lov_products(
    sub_category_id: Optional[int] = Query(None),
    company_id:      Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    from sqlalchemy import or_
    q = db.query(Product).filter(Product.is_active == True)
    if sub_category_id:
        q = q.filter(Product.sub_category_id == sub_category_id)
    if company_id:
        q = q.filter(
            or_(
                Product.company_id == None,
                Product.company_id == company_id,
                Product.is_multi_company == True,
            )
        )
    rows = q.all()
    return [LovItem(id=r.id, name=r.product_name, code=r.product_code) for r in rows]


@router.get(
    "/item-master-info/analysis-fields/lov/classifications",
    response_model=List[LovItem],
    summary="LOV — Product classifications filtered by product_id",
)
def lov_classifications(
    product_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(ProductClassification).filter(ProductClassification.is_active == True)
    if product_id:
        q = q.filter(ProductClassification.product_id == product_id)
    rows = q.all()
    return [LovItem(id=r.id, name=r.classification_name, code=r.classification_code) for r in rows]


# ═════════════════════════════════════════════════════════════════════════════
#  CRUD ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-info/analysis-fields/",
    response_model=AnalysisFieldsResponse,
    status_code=201,
    summary="Analysis Fields — Save for a request (one active row per entity_id)",
)
def create_analysis_fields(payload: AnalysisFieldsCreate, db: Session = Depends(get_db)):
    existing = db.query(ItemMasterAnalysisFieldsRecord).filter(
        ItemMasterAnalysisFieldsRecord.entity_id == payload.entity_id,
        ItemMasterAnalysisFieldsRecord.is_active == True,
    ).first()
    if existing:
        raise HTTPException(
            400,
            f"Analysis Fields already set for entity_id={payload.entity_id}. Use PUT to update."
        )

    cat_name,  cat_code  = _snapshot_category(db, payload.category_id)
    scat_name, scat_code = _snapshot_sub_category(db, payload.sub_category_id)
    prod_name, prod_code = _snapshot_product(db, payload.product_id)
    cls_name,  cls_code  = _snapshot_classification(db, payload.classification_id)

    obj = ItemMasterAnalysisFieldsRecord(
        request_id          = payload.request_id,
        entity_id           = payload.entity_id,
        category_id         = payload.category_id,
        category_name       = cat_name,
        category_code       = cat_code,
        sub_category_id     = payload.sub_category_id,
        sub_category_name   = scat_name,
        sub_category_code   = scat_code,
        product_id          = payload.product_id,
        product_name        = prod_name,
        product_code        = prod_code,
        classification_id   = payload.classification_id,
        classification_name = cls_name,
        classification_code = cls_code,
        notes               = payload.notes,
        created_by          = payload.changed_by,
        is_active           = True,
    )
    db.add(obj)
    db.flush()

    for field, value in [
        ("category_id",       str(payload.category_id)       if payload.category_id       else None),
        ("sub_category_id",   str(payload.sub_category_id)   if payload.sub_category_id   else None),
        ("product_id",        str(payload.product_id)        if payload.product_id        else None),
        ("classification_id", str(payload.classification_id) if payload.classification_id else None),
    ]:
        if value:
            _write_log(
                db,
                request_id=payload.request_id, entity_id=payload.entity_id,
                record_id=obj.id, action="CREATE",
                field_name=field, new_value=value,
                changed_by=payload.changed_by, change_reason=payload.change_reason,
            )

    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-info/analysis-fields/{entity_id}",
    response_model=AnalysisFieldsResponse,
    summary="Analysis Fields — Get active record for a request",
)
def get_analysis_fields(entity_id: int, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterAnalysisFieldsRecord).filter(
        ItemMasterAnalysisFieldsRecord.entity_id == entity_id,
        ItemMasterAnalysisFieldsRecord.is_active == True,
    ).order_by(ItemMasterAnalysisFieldsRecord.created_at.desc()).first()
    if not obj:
        raise HTTPException(404, f"No Analysis Fields found for entity_id={entity_id}")
    return obj


@router.put(
    "/item-master-info/analysis-fields/{record_id}",
    response_model=AnalysisFieldsResponse,
    summary="Analysis Fields — Update selections",
)
def update_analysis_fields(
    record_id: int,
    payload: AnalysisFieldsUpdate,
    db: Session = Depends(get_db),
):
    obj = db.query(ItemMasterAnalysisFieldsRecord).filter(
        ItemMasterAnalysisFieldsRecord.id == record_id
    ).first()
    if not obj:
        raise HTTPException(404, "Analysis Fields record not found")

    changes: dict = {}

    if payload.category_id is not None and payload.category_id != obj.category_id:
        cat_name, cat_code = _snapshot_category(db, payload.category_id)
        changes["category_id"] = (str(obj.category_id), str(payload.category_id))
        obj.category_id   = payload.category_id
        obj.category_name = cat_name
        obj.category_code = cat_code

    if payload.sub_category_id is not None and payload.sub_category_id != obj.sub_category_id:
        scat_name, scat_code = _snapshot_sub_category(db, payload.sub_category_id)
        changes["sub_category_id"] = (str(obj.sub_category_id), str(payload.sub_category_id))
        obj.sub_category_id   = payload.sub_category_id
        obj.sub_category_name = scat_name
        obj.sub_category_code = scat_code

    if payload.product_id is not None and payload.product_id != obj.product_id:
        prod_name, prod_code = _snapshot_product(db, payload.product_id)
        changes["product_id"] = (str(obj.product_id), str(payload.product_id))
        obj.product_id   = payload.product_id
        obj.product_name = prod_name
        obj.product_code = prod_code

    if payload.classification_id is not None and payload.classification_id != obj.classification_id:
        cls_name, cls_code = _snapshot_classification(db, payload.classification_id)
        changes["classification_id"] = (str(obj.classification_id), str(payload.classification_id))
        obj.classification_id   = payload.classification_id
        obj.classification_name = cls_name
        obj.classification_code = cls_code

    if payload.notes is not None:
        obj.notes = payload.notes

    if payload.updated_by is not None:
        obj.updated_by = payload.updated_by

    for field, (old, new) in changes.items():
        _write_log(
            db,
            request_id=obj.request_id, entity_id=obj.entity_id,
            record_id=obj.id, action="UPDATE",
            field_name=field, old_value=old, new_value=new,
            changed_by=payload.updated_by, change_reason=payload.change_reason,
        )

    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-info/analysis-fields/{record_id}",
    summary="Analysis Fields — Soft-delete",
)
def delete_analysis_fields(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = db.query(ItemMasterAnalysisFieldsRecord).filter(
        ItemMasterAnalysisFieldsRecord.id == record_id
    ).first()
    if not obj:
        raise HTTPException(404, "Analysis Fields record not found")

    obj.is_active  = False
    obj.updated_by = updated_by

    _write_log(
        db,
        request_id=obj.request_id, entity_id=obj.entity_id,
        record_id=obj.id, action="DELETE",
        changed_by=updated_by,
    )
    db.commit()
    return {"message": "Analysis Fields record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  HISTORY / AUDIT
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-master-info/analysis-fields/history/{entity_id}",
    response_model=List[AnalysisFieldsChangeLogEntry],
    summary="Analysis Fields — Full audit trail for one request",
)
def get_analysis_fields_history(
    entity_id: int,
    limit:     int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    return (
        db.query(ItemMasterInfoChangeLog)
        .filter(
            ItemMasterInfoChangeLog.entity_id  == entity_id,
            ItemMasterInfoChangeLog.table_name == TABLE_NAME,
        )
        .order_by(ItemMasterInfoChangeLog.changed_at.desc())
        .limit(limit)
        .all()
    )