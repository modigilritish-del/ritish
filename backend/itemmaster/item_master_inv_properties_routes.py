"""
itemmaster/item_master_inv_properties_routes.py
─────────────────────────────────────────────────────────────────────────────
FastAPI router for Item Master Inventory Properties tab — 27 separate field tables.

ENDPOINT MAP
────────────
Each of the 27 fields has 4 endpoints:

  POST   /item-master-invp/{field}/
  GET    /item-master-invp/{field}/{entity_id}
  PUT    /item-master-invp/{field}/{record_id}
  DELETE /item-master-invp/{field}/{record_id}   (soft-delete)

Where {field} is one of:
  PAGE 1 — Stock / Grade:
    stock-check-level-at-item | reservation-allowed | over-reservation-allowed |
    auto-release | auto-release-hours | hold | grade-1-required | grade-2-required |
    default-value-for-grade-1 | default-value-for-grade-2

  PAGE 2 — Batch & Barcode:
    batch-category-batch-items | zero-rated-sales-item | barcode-type |
    inhouse-manufacturer-barcode | barcode-generation | barcode-pricelist-updation |
    markup-perc-for-barcode-price | serial-number-category |
    temperature-check-required | weight-check-required

  PAGE 3 — Dimension & Tolerance:
    volume-check-required | dimension-check-required | all-dimensions-required |
    group-by-batch-srno-pack | so-positive-tolerance-pct | so-negative-tolerance-pct |
    so-tolerance-required

All endpoints follow the EXACT same pattern as item_master_inventory_routes.py —
one active row per entity_id, soft-delete via is_active=False.
─────────────────────────────────────────────────────────────────────────────
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db

from itemmaster.item_master_inv_properties_models import (
    # Page 1 — Stock / Grade
    ItemMasterInvpStockCheckLevelAtItem,
    ItemMasterInvpReservationAllowed,
    ItemMasterInvpOverReservationAllowed,
    ItemMasterInvpAutoRelease,
    ItemMasterInvpAutoReleaseHours,
    ItemMasterInvpHold,
    ItemMasterInvpGrade1Required,
    ItemMasterInvpGrade2Required,
    ItemMasterInvpDefaultValueForGrade1,
    ItemMasterInvpDefaultValueForGrade2,
    # Page 2 — Batch & Barcode
    ItemMasterInvpBatchCategoryBatchItems,
    ItemMasterInvpZeroRatedSalesItem,
    ItemMasterInvpBarcodeType,
    ItemMasterInvpInhouseManufacturerBarcode,
    ItemMasterInvpBarcodeGeneration,
    ItemMasterInvpBarcodePricelistUpdation,
    ItemMasterInvpMarkupPercForBarcodePrice,
    ItemMasterInvpSerialNumberCategory,
    ItemMasterInvpTemperatureCheckRequired,
    ItemMasterInvpWeightCheckRequired,
    # Page 3 — Dimension & Tolerance
    ItemMasterInvpVolumeCheckRequired,
    ItemMasterInvpDimensionCheckRequired,
    ItemMasterInvpAllDimensionsRequired,
    ItemMasterInvpGroupByBatchSrnoPack,
    ItemMasterInvpSoPositiveTolerancePct,
    ItemMasterInvpSoNegativeTolerancePct,
    ItemMasterInvpSoToleranceRequired,
)
from itemmaster.item_master_inv_properties_schemas import (
    # Page 1 — Stock / Grade
    StockCheckLevelAtItemCreate,     StockCheckLevelAtItemUpdate,     StockCheckLevelAtItemResponse,
    ReservationAllowedCreate,        ReservationAllowedUpdate,        ReservationAllowedResponse,
    OverReservationAllowedCreate,    OverReservationAllowedUpdate,    OverReservationAllowedResponse,
    AutoReleaseCreate,               AutoReleaseUpdate,               AutoReleaseResponse,
    AutoReleaseHoursCreate,          AutoReleaseHoursUpdate,          AutoReleaseHoursResponse,
    HoldCreate,                      HoldUpdate,                      HoldResponse,
    Grade1RequiredCreate,            Grade1RequiredUpdate,            Grade1RequiredResponse,
    Grade2RequiredCreate,            Grade2RequiredUpdate,            Grade2RequiredResponse,
    DefaultValueForGrade1Create,     DefaultValueForGrade1Update,     DefaultValueForGrade1Response,
    DefaultValueForGrade2Create,     DefaultValueForGrade2Update,     DefaultValueForGrade2Response,
    # Page 2 — Batch & Barcode
    BatchCategoryBatchItemsCreate,   BatchCategoryBatchItemsUpdate,   BatchCategoryBatchItemsResponse,
    ZeroRatedSalesItemCreate,        ZeroRatedSalesItemUpdate,        ZeroRatedSalesItemResponse,
    BarcodeTypeCreate,               BarcodeTypeUpdate,               BarcodeTypeResponse,
    InhouseManufacturerBarcodeCreate,InhouseManufacturerBarcodeUpdate,InhouseManufacturerBarcodeResponse,
    BarcodeGenerationCreate,         BarcodeGenerationUpdate,         BarcodeGenerationResponse,
    BarcodePricelistUpdationCreate,  BarcodePricelistUpdationUpdate,  BarcodePricelistUpdationResponse,
    MarkupPercForBarcodePriceCreate, MarkupPercForBarcodePriceUpdate, MarkupPercForBarcodePriceResponse,
    SerialNumberCategoryCreate,      SerialNumberCategoryUpdate,      SerialNumberCategoryResponse,
    TemperatureCheckRequiredCreate,  TemperatureCheckRequiredUpdate,  TemperatureCheckRequiredResponse,
    WeightCheckRequiredCreate,       WeightCheckRequiredUpdate,       WeightCheckRequiredResponse,
    # Page 3 — Dimension & Tolerance
    VolumeCheckRequiredCreate,       VolumeCheckRequiredUpdate,       VolumeCheckRequiredResponse,
    DimensionCheckRequiredCreate,    DimensionCheckRequiredUpdate,    DimensionCheckRequiredResponse,
    AllDimensionsRequiredCreate,     AllDimensionsRequiredUpdate,     AllDimensionsRequiredResponse,
    GroupByBatchSrnoPackCreate,      GroupByBatchSrnoPackUpdate,      GroupByBatchSrnoPackResponse,
    SoPositiveTolerancePctCreate,    SoPositiveTolerancePctUpdate,    SoPositiveTolerancePctResponse,
    SoNegativeTolerancePctCreate,    SoNegativeTolerancePctUpdate,    SoNegativeTolerancePctResponse,
    SoToleranceRequiredCreate,       SoToleranceRequiredUpdate,       SoToleranceRequiredResponse,
)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  INTERNAL HELPERS  — generic CRUD (keeps all 27 endpoint blocks DRY)
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
        raise HTTPException(status_code=404, detail=f"{label} not found for entity_id={entity_id}")
    return obj


def _require_by_id(db: Session, Model, record_id: int, label: str):
    obj = db.query(Model).filter(Model.id == record_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{label} record id={record_id} not found")
    return obj


def _guard_duplicate(db: Session, Model, entity_id: int, label: str):
    existing = _get_active(db, Model, entity_id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"{label} already exists for entity_id={entity_id}. Use PUT to update."
        )


# ═════════════════════════════════════════════════════════════════════════════
#  PAGE 1 — STOCK / GRADE FIELDS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  1.  STOCK CHECK LEVEL AT ITEM
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/stock-check-level-at-item/",
    response_model=StockCheckLevelAtItemResponse,
    status_code=201,
    summary="Inv Properties — Save Stock Check Level At Item",
)
def create_stock_check_level_at_item(payload: StockCheckLevelAtItemCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpStockCheckLevelAtItem, payload.entity_id, "Stock Check Level At Item")
    obj = ItemMasterInvpStockCheckLevelAtItem(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/stock-check-level-at-item/{entity_id}",
    response_model=StockCheckLevelAtItemResponse,
    summary="Inv Properties — Get Stock Check Level At Item",
)
def get_stock_check_level_at_item(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpStockCheckLevelAtItem, entity_id, "Stock Check Level At Item")


@router.put(
    "/item-master-invp/stock-check-level-at-item/{record_id}",
    response_model=StockCheckLevelAtItemResponse,
    summary="Inv Properties — Update Stock Check Level At Item",
)
def update_stock_check_level_at_item(record_id: int, payload: StockCheckLevelAtItemUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpStockCheckLevelAtItem, record_id, "Stock Check Level At Item")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/stock-check-level-at-item/{record_id}",
    summary="Inv Properties — Soft-delete Stock Check Level At Item",
)
def delete_stock_check_level_at_item(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpStockCheckLevelAtItem, record_id, "Stock Check Level At Item")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Stock Check Level At Item record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  2.  RESERVATION ALLOWED
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/reservation-allowed/",
    response_model=ReservationAllowedResponse,
    status_code=201,
    summary="Inv Properties — Save Reservation Allowed",
)
def create_reservation_allowed(payload: ReservationAllowedCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpReservationAllowed, payload.entity_id, "Reservation Allowed")
    obj = ItemMasterInvpReservationAllowed(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/reservation-allowed/{entity_id}",
    response_model=ReservationAllowedResponse,
    summary="Inv Properties — Get Reservation Allowed",
)
def get_reservation_allowed(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpReservationAllowed, entity_id, "Reservation Allowed")


@router.put(
    "/item-master-invp/reservation-allowed/{record_id}",
    response_model=ReservationAllowedResponse,
    summary="Inv Properties — Update Reservation Allowed",
)
def update_reservation_allowed(record_id: int, payload: ReservationAllowedUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpReservationAllowed, record_id, "Reservation Allowed")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/reservation-allowed/{record_id}",
    summary="Inv Properties — Soft-delete Reservation Allowed",
)
def delete_reservation_allowed(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpReservationAllowed, record_id, "Reservation Allowed")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Reservation Allowed record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  3.  OVER-RESERVATION ALLOWED
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/over-reservation-allowed/",
    response_model=OverReservationAllowedResponse,
    status_code=201,
    summary="Inv Properties — Save Over-Reservation Allowed",
)
def create_over_reservation_allowed(payload: OverReservationAllowedCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpOverReservationAllowed, payload.entity_id, "Over-Reservation Allowed")
    obj = ItemMasterInvpOverReservationAllowed(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/over-reservation-allowed/{entity_id}",
    response_model=OverReservationAllowedResponse,
    summary="Inv Properties — Get Over-Reservation Allowed",
)
def get_over_reservation_allowed(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpOverReservationAllowed, entity_id, "Over-Reservation Allowed")


@router.put(
    "/item-master-invp/over-reservation-allowed/{record_id}",
    response_model=OverReservationAllowedResponse,
    summary="Inv Properties — Update Over-Reservation Allowed",
)
def update_over_reservation_allowed(record_id: int, payload: OverReservationAllowedUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpOverReservationAllowed, record_id, "Over-Reservation Allowed")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/over-reservation-allowed/{record_id}",
    summary="Inv Properties — Soft-delete Over-Reservation Allowed",
)
def delete_over_reservation_allowed(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpOverReservationAllowed, record_id, "Over-Reservation Allowed")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Over-Reservation Allowed record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  4.  AUTO RELEASE
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/auto-release/",
    response_model=AutoReleaseResponse,
    status_code=201,
    summary="Inv Properties — Save Auto Release",
)
def create_auto_release(payload: AutoReleaseCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpAutoRelease, payload.entity_id, "Auto Release")
    obj = ItemMasterInvpAutoRelease(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/auto-release/{entity_id}",
    response_model=AutoReleaseResponse,
    summary="Inv Properties — Get Auto Release",
)
def get_auto_release(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpAutoRelease, entity_id, "Auto Release")


@router.put(
    "/item-master-invp/auto-release/{record_id}",
    response_model=AutoReleaseResponse,
    summary="Inv Properties — Update Auto Release",
)
def update_auto_release(record_id: int, payload: AutoReleaseUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpAutoRelease, record_id, "Auto Release")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/auto-release/{record_id}",
    summary="Inv Properties — Soft-delete Auto Release",
)
def delete_auto_release(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpAutoRelease, record_id, "Auto Release")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Auto Release record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  5.  AUTO RELEASE HOURS
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/auto-release-hours/",
    response_model=AutoReleaseHoursResponse,
    status_code=201,
    summary="Inv Properties — Save Auto Release Hours",
)
def create_auto_release_hours(payload: AutoReleaseHoursCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpAutoReleaseHours, payload.entity_id, "Auto Release Hours")
    obj = ItemMasterInvpAutoReleaseHours(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/auto-release-hours/{entity_id}",
    response_model=AutoReleaseHoursResponse,
    summary="Inv Properties — Get Auto Release Hours",
)
def get_auto_release_hours(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpAutoReleaseHours, entity_id, "Auto Release Hours")


@router.put(
    "/item-master-invp/auto-release-hours/{record_id}",
    response_model=AutoReleaseHoursResponse,
    summary="Inv Properties — Update Auto Release Hours",
)
def update_auto_release_hours(record_id: int, payload: AutoReleaseHoursUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpAutoReleaseHours, record_id, "Auto Release Hours")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/auto-release-hours/{record_id}",
    summary="Inv Properties — Soft-delete Auto Release Hours",
)
def delete_auto_release_hours(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpAutoReleaseHours, record_id, "Auto Release Hours")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Auto Release Hours record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  6.  HOLD
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/hold/",
    response_model=HoldResponse,
    status_code=201,
    summary="Inv Properties — Save Hold",
)
def create_hold(payload: HoldCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpHold, payload.entity_id, "Hold")
    obj = ItemMasterInvpHold(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/hold/{entity_id}",
    response_model=HoldResponse,
    summary="Inv Properties — Get Hold",
)
def get_hold(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpHold, entity_id, "Hold")


@router.put(
    "/item-master-invp/hold/{record_id}",
    response_model=HoldResponse,
    summary="Inv Properties — Update Hold",
)
def update_hold(record_id: int, payload: HoldUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpHold, record_id, "Hold")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/hold/{record_id}",
    summary="Inv Properties — Soft-delete Hold",
)
def delete_hold(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpHold, record_id, "Hold")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Hold record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  7.  GRADE 1 REQUIRED
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/grade-1-required/",
    response_model=Grade1RequiredResponse,
    status_code=201,
    summary="Inv Properties — Save Grade 1 Required",
)
def create_grade_1_required(payload: Grade1RequiredCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpGrade1Required, payload.entity_id, "Grade 1 Required")
    obj = ItemMasterInvpGrade1Required(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/grade-1-required/{entity_id}",
    response_model=Grade1RequiredResponse,
    summary="Inv Properties — Get Grade 1 Required",
)
def get_grade_1_required(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpGrade1Required, entity_id, "Grade 1 Required")


@router.put(
    "/item-master-invp/grade-1-required/{record_id}",
    response_model=Grade1RequiredResponse,
    summary="Inv Properties — Update Grade 1 Required",
)
def update_grade_1_required(record_id: int, payload: Grade1RequiredUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpGrade1Required, record_id, "Grade 1 Required")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/grade-1-required/{record_id}",
    summary="Inv Properties — Soft-delete Grade 1 Required",
)
def delete_grade_1_required(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpGrade1Required, record_id, "Grade 1 Required")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Grade 1 Required record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  8.  GRADE 2 REQUIRED
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/grade-2-required/",
    response_model=Grade2RequiredResponse,
    status_code=201,
    summary="Inv Properties — Save Grade 2 Required",
)
def create_grade_2_required(payload: Grade2RequiredCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpGrade2Required, payload.entity_id, "Grade 2 Required")
    obj = ItemMasterInvpGrade2Required(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/grade-2-required/{entity_id}",
    response_model=Grade2RequiredResponse,
    summary="Inv Properties — Get Grade 2 Required",
)
def get_grade_2_required(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpGrade2Required, entity_id, "Grade 2 Required")


@router.put(
    "/item-master-invp/grade-2-required/{record_id}",
    response_model=Grade2RequiredResponse,
    summary="Inv Properties — Update Grade 2 Required",
)
def update_grade_2_required(record_id: int, payload: Grade2RequiredUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpGrade2Required, record_id, "Grade 2 Required")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/grade-2-required/{record_id}",
    summary="Inv Properties — Soft-delete Grade 2 Required",
)
def delete_grade_2_required(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpGrade2Required, record_id, "Grade 2 Required")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Grade 2 Required record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  9.  DEFAULT VALUE FOR GRADE 1
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/default-value-for-grade-1/",
    response_model=DefaultValueForGrade1Response,
    status_code=201,
    summary="Inv Properties — Save Default Value For Grade 1",
)
def create_default_value_for_grade_1(payload: DefaultValueForGrade1Create, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpDefaultValueForGrade1, payload.entity_id, "Default Value For Grade 1")
    obj = ItemMasterInvpDefaultValueForGrade1(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/default-value-for-grade-1/{entity_id}",
    response_model=DefaultValueForGrade1Response,
    summary="Inv Properties — Get Default Value For Grade 1",
)
def get_default_value_for_grade_1(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpDefaultValueForGrade1, entity_id, "Default Value For Grade 1")


@router.put(
    "/item-master-invp/default-value-for-grade-1/{record_id}",
    response_model=DefaultValueForGrade1Response,
    summary="Inv Properties — Update Default Value For Grade 1",
)
def update_default_value_for_grade_1(record_id: int, payload: DefaultValueForGrade1Update, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpDefaultValueForGrade1, record_id, "Default Value For Grade 1")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/default-value-for-grade-1/{record_id}",
    summary="Inv Properties — Soft-delete Default Value For Grade 1",
)
def delete_default_value_for_grade_1(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpDefaultValueForGrade1, record_id, "Default Value For Grade 1")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Default Value For Grade 1 record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  10.  DEFAULT VALUE FOR GRADE 2
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/default-value-for-grade-2/",
    response_model=DefaultValueForGrade2Response,
    status_code=201,
    summary="Inv Properties — Save Default Value For Grade 2",
)
def create_default_value_for_grade_2(payload: DefaultValueForGrade2Create, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpDefaultValueForGrade2, payload.entity_id, "Default Value For Grade 2")
    obj = ItemMasterInvpDefaultValueForGrade2(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/default-value-for-grade-2/{entity_id}",
    response_model=DefaultValueForGrade2Response,
    summary="Inv Properties — Get Default Value For Grade 2",
)
def get_default_value_for_grade_2(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpDefaultValueForGrade2, entity_id, "Default Value For Grade 2")


@router.put(
    "/item-master-invp/default-value-for-grade-2/{record_id}",
    response_model=DefaultValueForGrade2Response,
    summary="Inv Properties — Update Default Value For Grade 2",
)
def update_default_value_for_grade_2(record_id: int, payload: DefaultValueForGrade2Update, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpDefaultValueForGrade2, record_id, "Default Value For Grade 2")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/default-value-for-grade-2/{record_id}",
    summary="Inv Properties — Soft-delete Default Value For Grade 2",
)
def delete_default_value_for_grade_2(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpDefaultValueForGrade2, record_id, "Default Value For Grade 2")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Default Value For Grade 2 record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  PAGE 2 — BATCH & BARCODE FIELDS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  11.  BATCH CATEGORY-BATCH ITEMS
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/batch-category-batch-items/",
    response_model=BatchCategoryBatchItemsResponse,
    status_code=201,
    summary="Inv Properties — Save Batch Category-Batch Items",
)
def create_batch_category_batch_items(payload: BatchCategoryBatchItemsCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpBatchCategoryBatchItems, payload.entity_id, "Batch Category-Batch Items")
    obj = ItemMasterInvpBatchCategoryBatchItems(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/batch-category-batch-items/{entity_id}",
    response_model=BatchCategoryBatchItemsResponse,
    summary="Inv Properties — Get Batch Category-Batch Items",
)
def get_batch_category_batch_items(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpBatchCategoryBatchItems, entity_id, "Batch Category-Batch Items")


@router.put(
    "/item-master-invp/batch-category-batch-items/{record_id}",
    response_model=BatchCategoryBatchItemsResponse,
    summary="Inv Properties — Update Batch Category-Batch Items",
)
def update_batch_category_batch_items(record_id: int, payload: BatchCategoryBatchItemsUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpBatchCategoryBatchItems, record_id, "Batch Category-Batch Items")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/batch-category-batch-items/{record_id}",
    summary="Inv Properties — Soft-delete Batch Category-Batch Items",
)
def delete_batch_category_batch_items(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpBatchCategoryBatchItems, record_id, "Batch Category-Batch Items")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Batch Category-Batch Items record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  12.  ZERO RATED SALES ITEM
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/zero-rated-sales-item/",
    response_model=ZeroRatedSalesItemResponse,
    status_code=201,
    summary="Inv Properties — Save Zero Rated Sales Item",
)
def create_zero_rated_sales_item(payload: ZeroRatedSalesItemCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpZeroRatedSalesItem, payload.entity_id, "Zero Rated Sales Item")
    obj = ItemMasterInvpZeroRatedSalesItem(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/zero-rated-sales-item/{entity_id}",
    response_model=ZeroRatedSalesItemResponse,
    summary="Inv Properties — Get Zero Rated Sales Item",
)
def get_zero_rated_sales_item(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpZeroRatedSalesItem, entity_id, "Zero Rated Sales Item")


@router.put(
    "/item-master-invp/zero-rated-sales-item/{record_id}",
    response_model=ZeroRatedSalesItemResponse,
    summary="Inv Properties — Update Zero Rated Sales Item",
)
def update_zero_rated_sales_item(record_id: int, payload: ZeroRatedSalesItemUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpZeroRatedSalesItem, record_id, "Zero Rated Sales Item")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/zero-rated-sales-item/{record_id}",
    summary="Inv Properties — Soft-delete Zero Rated Sales Item",
)
def delete_zero_rated_sales_item(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpZeroRatedSalesItem, record_id, "Zero Rated Sales Item")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Zero Rated Sales Item record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  13.  BARCODE TYPE
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/barcode-type/",
    response_model=BarcodeTypeResponse,
    status_code=201,
    summary="Inv Properties — Save Barcode Type",
)
def create_barcode_type(payload: BarcodeTypeCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpBarcodeType, payload.entity_id, "Barcode Type")
    obj = ItemMasterInvpBarcodeType(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/barcode-type/{entity_id}",
    response_model=BarcodeTypeResponse,
    summary="Inv Properties — Get Barcode Type",
)
def get_barcode_type(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpBarcodeType, entity_id, "Barcode Type")


@router.put(
    "/item-master-invp/barcode-type/{record_id}",
    response_model=BarcodeTypeResponse,
    summary="Inv Properties — Update Barcode Type",
)
def update_barcode_type(record_id: int, payload: BarcodeTypeUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpBarcodeType, record_id, "Barcode Type")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/barcode-type/{record_id}",
    summary="Inv Properties — Soft-delete Barcode Type",
)
def delete_barcode_type(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpBarcodeType, record_id, "Barcode Type")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Barcode Type record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  14.  INHOUSE / MANUFACTURER BARCODE
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/inhouse-manufacturer-barcode/",
    response_model=InhouseManufacturerBarcodeResponse,
    status_code=201,
    summary="Inv Properties — Save Inhouse / Manufacturer Barcode",
)
def create_inhouse_manufacturer_barcode(payload: InhouseManufacturerBarcodeCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpInhouseManufacturerBarcode, payload.entity_id, "Inhouse / Manufacturer Barcode")
    obj = ItemMasterInvpInhouseManufacturerBarcode(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/inhouse-manufacturer-barcode/{entity_id}",
    response_model=InhouseManufacturerBarcodeResponse,
    summary="Inv Properties — Get Inhouse / Manufacturer Barcode",
)
def get_inhouse_manufacturer_barcode(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpInhouseManufacturerBarcode, entity_id, "Inhouse / Manufacturer Barcode")


@router.put(
    "/item-master-invp/inhouse-manufacturer-barcode/{record_id}",
    response_model=InhouseManufacturerBarcodeResponse,
    summary="Inv Properties — Update Inhouse / Manufacturer Barcode",
)
def update_inhouse_manufacturer_barcode(record_id: int, payload: InhouseManufacturerBarcodeUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpInhouseManufacturerBarcode, record_id, "Inhouse / Manufacturer Barcode")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/inhouse-manufacturer-barcode/{record_id}",
    summary="Inv Properties — Soft-delete Inhouse / Manufacturer Barcode",
)
def delete_inhouse_manufacturer_barcode(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpInhouseManufacturerBarcode, record_id, "Inhouse / Manufacturer Barcode")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Inhouse / Manufacturer Barcode record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  15.  BARCODE GENERATION
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/barcode-generation/",
    response_model=BarcodeGenerationResponse,
    status_code=201,
    summary="Inv Properties — Save Barcode Generation",
)
def create_barcode_generation(payload: BarcodeGenerationCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpBarcodeGeneration, payload.entity_id, "Barcode Generation")
    obj = ItemMasterInvpBarcodeGeneration(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/barcode-generation/{entity_id}",
    response_model=BarcodeGenerationResponse,
    summary="Inv Properties — Get Barcode Generation",
)
def get_barcode_generation(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpBarcodeGeneration, entity_id, "Barcode Generation")


@router.put(
    "/item-master-invp/barcode-generation/{record_id}",
    response_model=BarcodeGenerationResponse,
    summary="Inv Properties — Update Barcode Generation",
)
def update_barcode_generation(record_id: int, payload: BarcodeGenerationUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpBarcodeGeneration, record_id, "Barcode Generation")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/barcode-generation/{record_id}",
    summary="Inv Properties — Soft-delete Barcode Generation",
)
def delete_barcode_generation(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpBarcodeGeneration, record_id, "Barcode Generation")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Barcode Generation record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  16.  BARCODE PRICELIST UPDATION
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/barcode-pricelist-updation/",
    response_model=BarcodePricelistUpdationResponse,
    status_code=201,
    summary="Inv Properties — Save Barcode Pricelist Updation",
)
def create_barcode_pricelist_updation(payload: BarcodePricelistUpdationCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpBarcodePricelistUpdation, payload.entity_id, "Barcode Pricelist Updation")
    obj = ItemMasterInvpBarcodePricelistUpdation(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/barcode-pricelist-updation/{entity_id}",
    response_model=BarcodePricelistUpdationResponse,
    summary="Inv Properties — Get Barcode Pricelist Updation",
)
def get_barcode_pricelist_updation(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpBarcodePricelistUpdation, entity_id, "Barcode Pricelist Updation")


@router.put(
    "/item-master-invp/barcode-pricelist-updation/{record_id}",
    response_model=BarcodePricelistUpdationResponse,
    summary="Inv Properties — Update Barcode Pricelist Updation",
)
def update_barcode_pricelist_updation(record_id: int, payload: BarcodePricelistUpdationUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpBarcodePricelistUpdation, record_id, "Barcode Pricelist Updation")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/barcode-pricelist-updation/{record_id}",
    summary="Inv Properties — Soft-delete Barcode Pricelist Updation",
)
def delete_barcode_pricelist_updation(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpBarcodePricelistUpdation, record_id, "Barcode Pricelist Updation")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Barcode Pricelist Updation record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  17.  MARKUP PERC FOR BARCODE PRICE
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/markup-perc-for-barcode-price/",
    response_model=MarkupPercForBarcodePriceResponse,
    status_code=201,
    summary="Inv Properties — Save Markup Perc For Barcode Price",
)
def create_markup_perc_for_barcode_price(payload: MarkupPercForBarcodePriceCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpMarkupPercForBarcodePrice, payload.entity_id, "Markup Perc For Barcode Price")
    obj = ItemMasterInvpMarkupPercForBarcodePrice(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/markup-perc-for-barcode-price/{entity_id}",
    response_model=MarkupPercForBarcodePriceResponse,
    summary="Inv Properties — Get Markup Perc For Barcode Price",
)
def get_markup_perc_for_barcode_price(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpMarkupPercForBarcodePrice, entity_id, "Markup Perc For Barcode Price")


@router.put(
    "/item-master-invp/markup-perc-for-barcode-price/{record_id}",
    response_model=MarkupPercForBarcodePriceResponse,
    summary="Inv Properties — Update Markup Perc For Barcode Price",
)
def update_markup_perc_for_barcode_price(record_id: int, payload: MarkupPercForBarcodePriceUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpMarkupPercForBarcodePrice, record_id, "Markup Perc For Barcode Price")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/markup-perc-for-barcode-price/{record_id}",
    summary="Inv Properties — Soft-delete Markup Perc For Barcode Price",
)
def delete_markup_perc_for_barcode_price(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpMarkupPercForBarcodePrice, record_id, "Markup Perc For Barcode Price")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Markup Perc For Barcode Price record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  18.  SERIAL NUMBER CATEGORY
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/serial-number-category/",
    response_model=SerialNumberCategoryResponse,
    status_code=201,
    summary="Inv Properties — Save Serial Number Category",
)
def create_serial_number_category(payload: SerialNumberCategoryCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpSerialNumberCategory, payload.entity_id, "Serial Number Category")
    obj = ItemMasterInvpSerialNumberCategory(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/serial-number-category/{entity_id}",
    response_model=SerialNumberCategoryResponse,
    summary="Inv Properties — Get Serial Number Category",
)
def get_serial_number_category(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpSerialNumberCategory, entity_id, "Serial Number Category")


@router.put(
    "/item-master-invp/serial-number-category/{record_id}",
    response_model=SerialNumberCategoryResponse,
    summary="Inv Properties — Update Serial Number Category",
)
def update_serial_number_category(record_id: int, payload: SerialNumberCategoryUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpSerialNumberCategory, record_id, "Serial Number Category")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/serial-number-category/{record_id}",
    summary="Inv Properties — Soft-delete Serial Number Category",
)
def delete_serial_number_category(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpSerialNumberCategory, record_id, "Serial Number Category")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Serial Number Category record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  19.  TEMPERATURE CHECK REQUIRED
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/temperature-check-required/",
    response_model=TemperatureCheckRequiredResponse,
    status_code=201,
    summary="Inv Properties — Save Temperature Check Required",
)
def create_temperature_check_required(payload: TemperatureCheckRequiredCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpTemperatureCheckRequired, payload.entity_id, "Temperature Check Required")
    obj = ItemMasterInvpTemperatureCheckRequired(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/temperature-check-required/{entity_id}",
    response_model=TemperatureCheckRequiredResponse,
    summary="Inv Properties — Get Temperature Check Required",
)
def get_temperature_check_required(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpTemperatureCheckRequired, entity_id, "Temperature Check Required")


@router.put(
    "/item-master-invp/temperature-check-required/{record_id}",
    response_model=TemperatureCheckRequiredResponse,
    summary="Inv Properties — Update Temperature Check Required",
)
def update_temperature_check_required(record_id: int, payload: TemperatureCheckRequiredUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpTemperatureCheckRequired, record_id, "Temperature Check Required")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/temperature-check-required/{record_id}",
    summary="Inv Properties — Soft-delete Temperature Check Required",
)
def delete_temperature_check_required(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpTemperatureCheckRequired, record_id, "Temperature Check Required")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Temperature Check Required record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  20.  WEIGHT CHECK REQUIRED
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/weight-check-required/",
    response_model=WeightCheckRequiredResponse,
    status_code=201,
    summary="Inv Properties — Save Weight Check Required",
)
def create_weight_check_required(payload: WeightCheckRequiredCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpWeightCheckRequired, payload.entity_id, "Weight Check Required")
    obj = ItemMasterInvpWeightCheckRequired(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/weight-check-required/{entity_id}",
    response_model=WeightCheckRequiredResponse,
    summary="Inv Properties — Get Weight Check Required",
)
def get_weight_check_required(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpWeightCheckRequired, entity_id, "Weight Check Required")


@router.put(
    "/item-master-invp/weight-check-required/{record_id}",
    response_model=WeightCheckRequiredResponse,
    summary="Inv Properties — Update Weight Check Required",
)
def update_weight_check_required(record_id: int, payload: WeightCheckRequiredUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpWeightCheckRequired, record_id, "Weight Check Required")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/weight-check-required/{record_id}",
    summary="Inv Properties — Soft-delete Weight Check Required",
)
def delete_weight_check_required(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpWeightCheckRequired, record_id, "Weight Check Required")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Weight Check Required record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  PAGE 3 — DIMENSION & TOLERANCE FIELDS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  21.  VOLUME CHECK REQUIRED
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/volume-check-required/",
    response_model=VolumeCheckRequiredResponse,
    status_code=201,
    summary="Inv Properties — Save Volume Check Required",
)
def create_volume_check_required(payload: VolumeCheckRequiredCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpVolumeCheckRequired, payload.entity_id, "Volume Check Required")
    obj = ItemMasterInvpVolumeCheckRequired(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/volume-check-required/{entity_id}",
    response_model=VolumeCheckRequiredResponse,
    summary="Inv Properties — Get Volume Check Required",
)
def get_volume_check_required(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpVolumeCheckRequired, entity_id, "Volume Check Required")


@router.put(
    "/item-master-invp/volume-check-required/{record_id}",
    response_model=VolumeCheckRequiredResponse,
    summary="Inv Properties — Update Volume Check Required",
)
def update_volume_check_required(record_id: int, payload: VolumeCheckRequiredUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpVolumeCheckRequired, record_id, "Volume Check Required")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/volume-check-required/{record_id}",
    summary="Inv Properties — Soft-delete Volume Check Required",
)
def delete_volume_check_required(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpVolumeCheckRequired, record_id, "Volume Check Required")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Volume Check Required record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  22.  DIMENSION CHECK REQUIRED
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/dimension-check-required/",
    response_model=DimensionCheckRequiredResponse,
    status_code=201,
    summary="Inv Properties — Save Dimension Check Required",
)
def create_dimension_check_required(payload: DimensionCheckRequiredCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpDimensionCheckRequired, payload.entity_id, "Dimension Check Required")
    obj = ItemMasterInvpDimensionCheckRequired(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/dimension-check-required/{entity_id}",
    response_model=DimensionCheckRequiredResponse,
    summary="Inv Properties — Get Dimension Check Required",
)
def get_dimension_check_required(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpDimensionCheckRequired, entity_id, "Dimension Check Required")


@router.put(
    "/item-master-invp/dimension-check-required/{record_id}",
    response_model=DimensionCheckRequiredResponse,
    summary="Inv Properties — Update Dimension Check Required",
)
def update_dimension_check_required(record_id: int, payload: DimensionCheckRequiredUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpDimensionCheckRequired, record_id, "Dimension Check Required")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/dimension-check-required/{record_id}",
    summary="Inv Properties — Soft-delete Dimension Check Required",
)
def delete_dimension_check_required(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpDimensionCheckRequired, record_id, "Dimension Check Required")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Dimension Check Required record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  23.  ALL DIMENSIONS REQUIRED
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/all-dimensions-required/",
    response_model=AllDimensionsRequiredResponse,
    status_code=201,
    summary="Inv Properties — Save All Dimensions Required",
)
def create_all_dimensions_required(payload: AllDimensionsRequiredCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpAllDimensionsRequired, payload.entity_id, "All Dimensions Required")
    obj = ItemMasterInvpAllDimensionsRequired(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/all-dimensions-required/{entity_id}",
    response_model=AllDimensionsRequiredResponse,
    summary="Inv Properties — Get All Dimensions Required",
)
def get_all_dimensions_required(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpAllDimensionsRequired, entity_id, "All Dimensions Required")


@router.put(
    "/item-master-invp/all-dimensions-required/{record_id}",
    response_model=AllDimensionsRequiredResponse,
    summary="Inv Properties — Update All Dimensions Required",
)
def update_all_dimensions_required(record_id: int, payload: AllDimensionsRequiredUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpAllDimensionsRequired, record_id, "All Dimensions Required")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/all-dimensions-required/{record_id}",
    summary="Inv Properties — Soft-delete All Dimensions Required",
)
def delete_all_dimensions_required(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpAllDimensionsRequired, record_id, "All Dimensions Required")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "All Dimensions Required record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  24.  GROUP BY BATCH/SRNO/PACK
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/group-by-batch-srno-pack/",
    response_model=GroupByBatchSrnoPackResponse,
    status_code=201,
    summary="Inv Properties — Save Group By Batch/Srno/Pack",
)
def create_group_by_batch_srno_pack(payload: GroupByBatchSrnoPackCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpGroupByBatchSrnoPack, payload.entity_id, "Group By Batch/Srno/Pack")
    obj = ItemMasterInvpGroupByBatchSrnoPack(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/group-by-batch-srno-pack/{entity_id}",
    response_model=GroupByBatchSrnoPackResponse,
    summary="Inv Properties — Get Group By Batch/Srno/Pack",
)
def get_group_by_batch_srno_pack(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpGroupByBatchSrnoPack, entity_id, "Group By Batch/Srno/Pack")


@router.put(
    "/item-master-invp/group-by-batch-srno-pack/{record_id}",
    response_model=GroupByBatchSrnoPackResponse,
    summary="Inv Properties — Update Group By Batch/Srno/Pack",
)
def update_group_by_batch_srno_pack(record_id: int, payload: GroupByBatchSrnoPackUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpGroupByBatchSrnoPack, record_id, "Group By Batch/Srno/Pack")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/group-by-batch-srno-pack/{record_id}",
    summary="Inv Properties — Soft-delete Group By Batch/Srno/Pack",
)
def delete_group_by_batch_srno_pack(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpGroupByBatchSrnoPack, record_id, "Group By Batch/Srno/Pack")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Group By Batch/Srno/Pack record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  25.  SO POSITIVE TOLERANCE %
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/so-positive-tolerance-pct/",
    response_model=SoPositiveTolerancePctResponse,
    status_code=201,
    summary="Inv Properties — Save SO Positive Tolerance %",
)
def create_so_positive_tolerance_pct(payload: SoPositiveTolerancePctCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpSoPositiveTolerancePct, payload.entity_id, "SO Positive Tolerance %")
    obj = ItemMasterInvpSoPositiveTolerancePct(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/so-positive-tolerance-pct/{entity_id}",
    response_model=SoPositiveTolerancePctResponse,
    summary="Inv Properties — Get SO Positive Tolerance %",
)
def get_so_positive_tolerance_pct(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpSoPositiveTolerancePct, entity_id, "SO Positive Tolerance %")


@router.put(
    "/item-master-invp/so-positive-tolerance-pct/{record_id}",
    response_model=SoPositiveTolerancePctResponse,
    summary="Inv Properties — Update SO Positive Tolerance %",
)
def update_so_positive_tolerance_pct(record_id: int, payload: SoPositiveTolerancePctUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpSoPositiveTolerancePct, record_id, "SO Positive Tolerance %")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/so-positive-tolerance-pct/{record_id}",
    summary="Inv Properties — Soft-delete SO Positive Tolerance %",
)
def delete_so_positive_tolerance_pct(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpSoPositiveTolerancePct, record_id, "SO Positive Tolerance %")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "SO Positive Tolerance % record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  26.  SO NEGATIVE TOLERANCE %
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/so-negative-tolerance-pct/",
    response_model=SoNegativeTolerancePctResponse,
    status_code=201,
    summary="Inv Properties — Save SO Negative Tolerance %",
)
def create_so_negative_tolerance_pct(payload: SoNegativeTolerancePctCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpSoNegativeTolerancePct, payload.entity_id, "SO Negative Tolerance %")
    obj = ItemMasterInvpSoNegativeTolerancePct(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/so-negative-tolerance-pct/{entity_id}",
    response_model=SoNegativeTolerancePctResponse,
    summary="Inv Properties — Get SO Negative Tolerance %",
)
def get_so_negative_tolerance_pct(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpSoNegativeTolerancePct, entity_id, "SO Negative Tolerance %")


@router.put(
    "/item-master-invp/so-negative-tolerance-pct/{record_id}",
    response_model=SoNegativeTolerancePctResponse,
    summary="Inv Properties — Update SO Negative Tolerance %",
)
def update_so_negative_tolerance_pct(record_id: int, payload: SoNegativeTolerancePctUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpSoNegativeTolerancePct, record_id, "SO Negative Tolerance %")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/so-negative-tolerance-pct/{record_id}",
    summary="Inv Properties — Soft-delete SO Negative Tolerance %",
)
def delete_so_negative_tolerance_pct(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpSoNegativeTolerancePct, record_id, "SO Negative Tolerance %")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "SO Negative Tolerance % record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  27.  SO TOLERANCE REQUIRED
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/item-master-invp/so-tolerance-required/",
    response_model=SoToleranceRequiredResponse,
    status_code=201,
    summary="Inv Properties — Save SO Tolerance Required",
)
def create_so_tolerance_required(payload: SoToleranceRequiredCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvpSoToleranceRequired, payload.entity_id, "SO Tolerance Required")
    obj = ItemMasterInvpSoToleranceRequired(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-invp/so-tolerance-required/{entity_id}",
    response_model=SoToleranceRequiredResponse,
    summary="Inv Properties — Get SO Tolerance Required",
)
def get_so_tolerance_required(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvpSoToleranceRequired, entity_id, "SO Tolerance Required")


@router.put(
    "/item-master-invp/so-tolerance-required/{record_id}",
    response_model=SoToleranceRequiredResponse,
    summary="Inv Properties — Update SO Tolerance Required",
)
def update_so_tolerance_required(record_id: int, payload: SoToleranceRequiredUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvpSoToleranceRequired, record_id, "SO Tolerance Required")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-invp/so-tolerance-required/{record_id}",
    summary="Inv Properties — Soft-delete SO Tolerance Required",
)
def delete_so_tolerance_required(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvpSoToleranceRequired, record_id, "SO Tolerance Required")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "SO Tolerance Required record deactivated", "id": record_id}