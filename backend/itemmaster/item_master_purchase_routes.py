"""
itemmaster/item_master_purchase_routes.py
─────────────────────────────────────────────────────────────────────────────
FastAPI router for Item Master Purchase tab — 6 separate field tables.

ENDPOINT MAP
────────────
Each of the 6 fields has 4 endpoints:

  POST   /item-master-pur/{field}/
  GET    /item-master-pur/{field}/{entity_id}
  PUT    /item-master-pur/{field}/{record_id}
  DELETE /item-master-pur/{field}/{record_id}   (soft-delete)

Where {field} is one of:
  vendor-analysis | analysis-property-class | positive-tolerance |
  negative-tolerance | physical-stock-variance | receipt-variance

All endpoints follow the EXACT same pattern as item_master_inventory_routes.py
— one active row per entity_id, soft-delete via is_active=False.
─────────────────────────────────────────────────────────────────────────────
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db

from itemmaster.item_master_purchase_models import (
    ItemMasterPurVendorAnalysis,
    ItemMasterPurAnalysisPropertyClass,
    ItemMasterPurPositiveTolerance,
    ItemMasterPurNegativeTolerance,
    ItemMasterPurPhysicalStockVariance,
    ItemMasterPurReceiptVariance,
)
from itemmaster.item_master_purchase_schemas import (
    VendorAnalysisCreate,          VendorAnalysisUpdate,          VendorAnalysisResponse,
    AnalysisPropertyClassCreate,   AnalysisPropertyClassUpdate,   AnalysisPropertyClassResponse,
    PositiveToleranceCreate,       PositiveToleranceUpdate,       PositiveToleranceResponse,
    NegativeToleranceCreate,       NegativeToleranceUpdate,       NegativeToleranceResponse,
    PhysicalStockVarianceCreate,   PhysicalStockVarianceUpdate,   PhysicalStockVarianceResponse,
    ReceiptVarianceCreate,         ReceiptVarianceUpdate,         ReceiptVarianceResponse,
)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  INTERNAL HELPER  — generic CRUD factory (keeps endpoint code DRY)
# ─────────────────────────────────────────────────────────────────────────────

def _get_active(db: Session, Model, entity_id: int):
    """Return the single active row for entity_id, or None."""
    return (
        db.query(Model)
        .filter(Model.entity_id == entity_id, Model.is_active == True)
        .order_by(Model.created_at.desc())
        .first()
    )


def _require_active(db: Session, Model, entity_id: int, label: str):
    obj = _get_active(db, Model, entity_id)
    if not obj:
        raise HTTPException(404, f"No active {label} record found for entity_id={entity_id}")
    return obj


def _require_by_id(db: Session, Model, record_id: int, label: str):
    obj = db.query(Model).filter(Model.id == record_id).first()
    if not obj:
        raise HTTPException(404, f"{label} record id={record_id} not found")
    return obj


def _guard_duplicate(db: Session, Model, entity_id: int, label: str):
    if _get_active(db, Model, entity_id):
        raise HTTPException(
            400,
            f"{label} already exists for entity_id={entity_id}. Use PUT to update."
        )


# ═════════════════════════════════════════════════════════════════════════════
#  1.  VENDOR ANALYSIS
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-pur/vendor-analysis/",
    response_model=VendorAnalysisResponse,
    status_code=201,
    summary="Purchase — Save Vendor Analysis",
)
def create_vendor_analysis(payload: VendorAnalysisCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterPurVendorAnalysis, payload.entity_id, "Vendor Analysis")
    obj = ItemMasterPurVendorAnalysis(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-pur/vendor-analysis/{entity_id}",
    response_model=VendorAnalysisResponse,
    summary="Purchase — Get Vendor Analysis",
)
def get_vendor_analysis(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterPurVendorAnalysis, entity_id, "Vendor Analysis")


@router.put(
    "/item-master-pur/vendor-analysis/{record_id}",
    response_model=VendorAnalysisResponse,
    summary="Purchase — Update Vendor Analysis",
)
def update_vendor_analysis(record_id: int, payload: VendorAnalysisUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterPurVendorAnalysis, record_id, "Vendor Analysis")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-pur/vendor-analysis/{record_id}",
    summary="Purchase — Soft-delete Vendor Analysis",
)
def delete_vendor_analysis(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterPurVendorAnalysis, record_id, "Vendor Analysis")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Vendor Analysis record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  2.  ANALYSIS PROPERTY CLASS
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-pur/analysis-property-class/",
    response_model=AnalysisPropertyClassResponse,
    status_code=201,
    summary="Purchase — Save Analysis Property Class",
)
def create_analysis_property_class(payload: AnalysisPropertyClassCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterPurAnalysisPropertyClass, payload.entity_id, "Analysis Property Class")
    obj = ItemMasterPurAnalysisPropertyClass(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-pur/analysis-property-class/{entity_id}",
    response_model=AnalysisPropertyClassResponse,
    summary="Purchase — Get Analysis Property Class",
)
def get_analysis_property_class(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterPurAnalysisPropertyClass, entity_id, "Analysis Property Class")


@router.put(
    "/item-master-pur/analysis-property-class/{record_id}",
    response_model=AnalysisPropertyClassResponse,
    summary="Purchase — Update Analysis Property Class",
)
def update_analysis_property_class(record_id: int, payload: AnalysisPropertyClassUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterPurAnalysisPropertyClass, record_id, "Analysis Property Class")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-pur/analysis-property-class/{record_id}",
    summary="Purchase — Soft-delete Analysis Property Class",
)
def delete_analysis_property_class(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterPurAnalysisPropertyClass, record_id, "Analysis Property Class")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Analysis Property Class record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  3.  POSITIVE TOLERANCE %
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-pur/positive-tolerance/",
    response_model=PositiveToleranceResponse,
    status_code=201,
    summary="Purchase — Save Positive Tolerance %",
)
def create_positive_tolerance(payload: PositiveToleranceCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterPurPositiveTolerance, payload.entity_id, "Positive Tolerance")
    obj = ItemMasterPurPositiveTolerance(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-pur/positive-tolerance/{entity_id}",
    response_model=PositiveToleranceResponse,
    summary="Purchase — Get Positive Tolerance %",
)
def get_positive_tolerance(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterPurPositiveTolerance, entity_id, "Positive Tolerance")


@router.put(
    "/item-master-pur/positive-tolerance/{record_id}",
    response_model=PositiveToleranceResponse,
    summary="Purchase — Update Positive Tolerance %",
)
def update_positive_tolerance(record_id: int, payload: PositiveToleranceUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterPurPositiveTolerance, record_id, "Positive Tolerance")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-pur/positive-tolerance/{record_id}",
    summary="Purchase — Soft-delete Positive Tolerance %",
)
def delete_positive_tolerance(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterPurPositiveTolerance, record_id, "Positive Tolerance")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Positive Tolerance record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  4.  NEGATIVE TOLERANCE %
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-pur/negative-tolerance/",
    response_model=NegativeToleranceResponse,
    status_code=201,
    summary="Purchase — Save Negative Tolerance %",
)
def create_negative_tolerance(payload: NegativeToleranceCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterPurNegativeTolerance, payload.entity_id, "Negative Tolerance")
    obj = ItemMasterPurNegativeTolerance(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-pur/negative-tolerance/{entity_id}",
    response_model=NegativeToleranceResponse,
    summary="Purchase — Get Negative Tolerance %",
)
def get_negative_tolerance(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterPurNegativeTolerance, entity_id, "Negative Tolerance")


@router.put(
    "/item-master-pur/negative-tolerance/{record_id}",
    response_model=NegativeToleranceResponse,
    summary="Purchase — Update Negative Tolerance %",
)
def update_negative_tolerance(record_id: int, payload: NegativeToleranceUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterPurNegativeTolerance, record_id, "Negative Tolerance")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-pur/negative-tolerance/{record_id}",
    summary="Purchase — Soft-delete Negative Tolerance %",
)
def delete_negative_tolerance(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterPurNegativeTolerance, record_id, "Negative Tolerance")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Negative Tolerance record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  5.  PHYSICAL STOCK VARIANCE %
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-pur/physical-stock-variance/",
    response_model=PhysicalStockVarianceResponse,
    status_code=201,
    summary="Purchase — Save Physical Stock Variance %",
)
def create_physical_stock_variance(payload: PhysicalStockVarianceCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterPurPhysicalStockVariance, payload.entity_id, "Physical Stock Variance")
    obj = ItemMasterPurPhysicalStockVariance(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-pur/physical-stock-variance/{entity_id}",
    response_model=PhysicalStockVarianceResponse,
    summary="Purchase — Get Physical Stock Variance %",
)
def get_physical_stock_variance(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterPurPhysicalStockVariance, entity_id, "Physical Stock Variance")


@router.put(
    "/item-master-pur/physical-stock-variance/{record_id}",
    response_model=PhysicalStockVarianceResponse,
    summary="Purchase — Update Physical Stock Variance %",
)
def update_physical_stock_variance(record_id: int, payload: PhysicalStockVarianceUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterPurPhysicalStockVariance, record_id, "Physical Stock Variance")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-pur/physical-stock-variance/{record_id}",
    summary="Purchase — Soft-delete Physical Stock Variance %",
)
def delete_physical_stock_variance(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterPurPhysicalStockVariance, record_id, "Physical Stock Variance")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Physical Stock Variance record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  6.  RECEIPT VARIANCE %
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-pur/receipt-variance/",
    response_model=ReceiptVarianceResponse,
    status_code=201,
    summary="Purchase — Save Receipt Variance %",
)
def create_receipt_variance(payload: ReceiptVarianceCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterPurReceiptVariance, payload.entity_id, "Receipt Variance")
    obj = ItemMasterPurReceiptVariance(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-pur/receipt-variance/{entity_id}",
    response_model=ReceiptVarianceResponse,
    summary="Purchase — Get Receipt Variance %",
)
def get_receipt_variance(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterPurReceiptVariance, entity_id, "Receipt Variance")


@router.put(
    "/item-master-pur/receipt-variance/{record_id}",
    response_model=ReceiptVarianceResponse,
    summary="Purchase — Update Receipt Variance %",
)
def update_receipt_variance(record_id: int, payload: ReceiptVarianceUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterPurReceiptVariance, record_id, "Receipt Variance")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-pur/receipt-variance/{record_id}",
    summary="Purchase — Soft-delete Receipt Variance %",
)
def delete_receipt_variance(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterPurReceiptVariance, record_id, "Receipt Variance")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Receipt Variance record deactivated", "id": record_id}