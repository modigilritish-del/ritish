"""
itemmaster/item_master_inventory_routes.py
─────────────────────────────────────────────────────────────────────────────
FastAPI router for Item Master Inventory tab — 12 separate field tables.

ENDPOINT MAP
────────────
Each of the 12 fields has 4 endpoints:

  POST   /item-master-inv/{field}/
  GET    /item-master-inv/{field}/{entity_id}
  PUT    /item-master-inv/{field}/{record_id}
  DELETE /item-master-inv/{field}/{record_id}   (soft-delete)

Where {field} is one of:
  parent-item | packed-item | superceded | max-stock | reorder-quantity |
  harmonised-code | lead-time | dimension | minimum-stock | reorder-level |
  safety-stock-factor | universal-product-code

All endpoints follow the EXACT same pattern as
item_master_analysis_fields_routes.py — one active row per entity_id,
soft-delete via is_active=False.
─────────────────────────────────────────────────────────────────────────────
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db

from itemmaster.item_master_inventory_models import (
    ItemMasterInvParentItem,
    ItemMasterInvPackedItem,
    ItemMasterInvSuperceded,
    ItemMasterInvMaxStock,
    ItemMasterInvReorderQuantity,
    ItemMasterInvHarmonisedCode,
    ItemMasterInvLeadTime,
    ItemMasterInvDimension,
    ItemMasterInvMinimumStock,
    ItemMasterInvReorderLevel,
    ItemMasterInvSafetyStockFactor,
    ItemMasterInvUniversalProductCode,
)
from itemmaster.item_master_inventory_schemas import (
    ParentItemCreate,        ParentItemUpdate,        ParentItemResponse,
    PackedItemCreate,        PackedItemUpdate,        PackedItemResponse,
    SupercededCreate,        SupercededUpdate,        SupercededResponse,
    MaxStockCreate,          MaxStockUpdate,          MaxStockResponse,
    ReorderQuantityCreate,   ReorderQuantityUpdate,   ReorderQuantityResponse,
    HarmonisedCodeCreate,    HarmonisedCodeUpdate,    HarmonisedCodeResponse,
    LeadTimeCreate,          LeadTimeUpdate,          LeadTimeResponse,
    DimensionCreate,         DimensionUpdate,         DimensionResponse,
    MinimumStockCreate,      MinimumStockUpdate,      MinimumStockResponse,
    ReorderLevelCreate,      ReorderLevelUpdate,      ReorderLevelResponse,
    SafetyStockFactorCreate, SafetyStockFactorUpdate, SafetyStockFactorResponse,
    UniversalProductCodeCreate, UniversalProductCodeUpdate, UniversalProductCodeResponse,
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
#  1.  PARENT ITEM
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/parent-item/",
    response_model=ParentItemResponse,
    status_code=201,
    summary="Inventory — Save Parent Item",
)
def create_parent_item(payload: ParentItemCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvParentItem, payload.entity_id, "Parent Item")
    obj = ItemMasterInvParentItem(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/parent-item/{entity_id}",
    response_model=ParentItemResponse,
    summary="Inventory — Get Parent Item",
)
def get_parent_item(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvParentItem, entity_id, "Parent Item")


@router.put(
    "/item-master-inv/parent-item/{record_id}",
    response_model=ParentItemResponse,
    summary="Inventory — Update Parent Item",
)
def update_parent_item(record_id: int, payload: ParentItemUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvParentItem, record_id, "Parent Item")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/parent-item/{record_id}",
    summary="Inventory — Soft-delete Parent Item",
)
def delete_parent_item(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvParentItem, record_id, "Parent Item")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Parent Item record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  2.  PACKED ITEM  (YES / NO)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/packed-item/",
    response_model=PackedItemResponse,
    status_code=201,
    summary="Inventory — Save Packed Item (YES/NO)",
)
def create_packed_item(payload: PackedItemCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvPackedItem, payload.entity_id, "Packed Item")
    obj = ItemMasterInvPackedItem(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/packed-item/{entity_id}",
    response_model=PackedItemResponse,
    summary="Inventory — Get Packed Item",
)
def get_packed_item(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvPackedItem, entity_id, "Packed Item")


@router.put(
    "/item-master-inv/packed-item/{record_id}",
    response_model=PackedItemResponse,
    summary="Inventory — Update Packed Item",
)
def update_packed_item(record_id: int, payload: PackedItemUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvPackedItem, record_id, "Packed Item")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/packed-item/{record_id}",
    summary="Inventory — Soft-delete Packed Item",
)
def delete_packed_item(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvPackedItem, record_id, "Packed Item")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Packed Item record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  3.  SUPERCEDED  (YES / NO)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/superceded/",
    response_model=SupercededResponse,
    status_code=201,
    summary="Inventory — Save Superceded (YES/NO)",
)
def create_superceded(payload: SupercededCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvSuperceded, payload.entity_id, "Superceded")
    obj = ItemMasterInvSuperceded(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/superceded/{entity_id}",
    response_model=SupercededResponse,
    summary="Inventory — Get Superceded",
)
def get_superceded(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvSuperceded, entity_id, "Superceded")


@router.put(
    "/item-master-inv/superceded/{record_id}",
    response_model=SupercededResponse,
    summary="Inventory — Update Superceded",
)
def update_superceded(record_id: int, payload: SupercededUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvSuperceded, record_id, "Superceded")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/superceded/{record_id}",
    summary="Inventory — Soft-delete Superceded",
)
def delete_superceded(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvSuperceded, record_id, "Superceded")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Superceded record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  4.  MAXIMUM STOCK QTY
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/max-stock/",
    response_model=MaxStockResponse,
    status_code=201,
    summary="Inventory — Save Maximum Stock Qty",
)
def create_max_stock(payload: MaxStockCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvMaxStock, payload.entity_id, "Maximum Stock Qty")
    obj = ItemMasterInvMaxStock(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/max-stock/{entity_id}",
    response_model=MaxStockResponse,
    summary="Inventory — Get Maximum Stock Qty",
)
def get_max_stock(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvMaxStock, entity_id, "Maximum Stock Qty")


@router.put(
    "/item-master-inv/max-stock/{record_id}",
    response_model=MaxStockResponse,
    summary="Inventory — Update Maximum Stock Qty",
)
def update_max_stock(record_id: int, payload: MaxStockUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvMaxStock, record_id, "Maximum Stock Qty")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/max-stock/{record_id}",
    summary="Inventory — Soft-delete Maximum Stock Qty",
)
def delete_max_stock(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvMaxStock, record_id, "Maximum Stock Qty")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Maximum Stock Qty record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  5.  REORDER QUANTITY
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/reorder-quantity/",
    response_model=ReorderQuantityResponse,
    status_code=201,
    summary="Inventory — Save Reorder Quantity",
)
def create_reorder_quantity(payload: ReorderQuantityCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvReorderQuantity, payload.entity_id, "Reorder Quantity")
    obj = ItemMasterInvReorderQuantity(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/reorder-quantity/{entity_id}",
    response_model=ReorderQuantityResponse,
    summary="Inventory — Get Reorder Quantity",
)
def get_reorder_quantity(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvReorderQuantity, entity_id, "Reorder Quantity")


@router.put(
    "/item-master-inv/reorder-quantity/{record_id}",
    response_model=ReorderQuantityResponse,
    summary="Inventory — Update Reorder Quantity",
)
def update_reorder_quantity(record_id: int, payload: ReorderQuantityUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvReorderQuantity, record_id, "Reorder Quantity")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/reorder-quantity/{record_id}",
    summary="Inventory — Soft-delete Reorder Quantity",
)
def delete_reorder_quantity(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvReorderQuantity, record_id, "Reorder Quantity")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Reorder Quantity record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  6.  HARMONISED CODE
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/harmonised-code/",
    response_model=HarmonisedCodeResponse,
    status_code=201,
    summary="Inventory — Save Harmonised Code",
)
def create_harmonised_code(payload: HarmonisedCodeCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvHarmonisedCode, payload.entity_id, "Harmonised Code")
    obj = ItemMasterInvHarmonisedCode(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/harmonised-code/{entity_id}",
    response_model=HarmonisedCodeResponse,
    summary="Inventory — Get Harmonised Code",
)
def get_harmonised_code(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvHarmonisedCode, entity_id, "Harmonised Code")


@router.put(
    "/item-master-inv/harmonised-code/{record_id}",
    response_model=HarmonisedCodeResponse,
    summary="Inventory — Update Harmonised Code",
)
def update_harmonised_code(record_id: int, payload: HarmonisedCodeUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvHarmonisedCode, record_id, "Harmonised Code")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/harmonised-code/{record_id}",
    summary="Inventory — Soft-delete Harmonised Code",
)
def delete_harmonised_code(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvHarmonisedCode, record_id, "Harmonised Code")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Harmonised Code record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  7.  LEAD TIME
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/lead-time/",
    response_model=LeadTimeResponse,
    status_code=201,
    summary="Inventory — Save Lead Time",
)
def create_lead_time(payload: LeadTimeCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvLeadTime, payload.entity_id, "Lead Time")
    obj = ItemMasterInvLeadTime(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/lead-time/{entity_id}",
    response_model=LeadTimeResponse,
    summary="Inventory — Get Lead Time",
)
def get_lead_time(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvLeadTime, entity_id, "Lead Time")


@router.put(
    "/item-master-inv/lead-time/{record_id}",
    response_model=LeadTimeResponse,
    summary="Inventory — Update Lead Time",
)
def update_lead_time(record_id: int, payload: LeadTimeUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvLeadTime, record_id, "Lead Time")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/lead-time/{record_id}",
    summary="Inventory — Soft-delete Lead Time",
)
def delete_lead_time(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvLeadTime, record_id, "Lead Time")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Lead Time record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  8.  DIMENSION  (YES / NO)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/dimension/",
    response_model=DimensionResponse,
    status_code=201,
    summary="Inventory — Save Dimension (YES/NO)",
)
def create_dimension(payload: DimensionCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvDimension, payload.entity_id, "Dimension")
    obj = ItemMasterInvDimension(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/dimension/{entity_id}",
    response_model=DimensionResponse,
    summary="Inventory — Get Dimension",
)
def get_dimension(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvDimension, entity_id, "Dimension")


@router.put(
    "/item-master-inv/dimension/{record_id}",
    response_model=DimensionResponse,
    summary="Inventory — Update Dimension",
)
def update_dimension(record_id: int, payload: DimensionUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvDimension, record_id, "Dimension")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/dimension/{record_id}",
    summary="Inventory — Soft-delete Dimension",
)
def delete_dimension(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvDimension, record_id, "Dimension")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Dimension record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  9.  MINIMUM STOCK QTY
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/minimum-stock/",
    response_model=MinimumStockResponse,
    status_code=201,
    summary="Inventory — Save Minimum Stock Qty",
)
def create_minimum_stock(payload: MinimumStockCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvMinimumStock, payload.entity_id, "Minimum Stock Qty")
    obj = ItemMasterInvMinimumStock(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/minimum-stock/{entity_id}",
    response_model=MinimumStockResponse,
    summary="Inventory — Get Minimum Stock Qty",
)
def get_minimum_stock(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvMinimumStock, entity_id, "Minimum Stock Qty")


@router.put(
    "/item-master-inv/minimum-stock/{record_id}",
    response_model=MinimumStockResponse,
    summary="Inventory — Update Minimum Stock Qty",
)
def update_minimum_stock(record_id: int, payload: MinimumStockUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvMinimumStock, record_id, "Minimum Stock Qty")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/minimum-stock/{record_id}",
    summary="Inventory — Soft-delete Minimum Stock Qty",
)
def delete_minimum_stock(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvMinimumStock, record_id, "Minimum Stock Qty")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Minimum Stock Qty record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  10. REORDER LEVEL
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/reorder-level/",
    response_model=ReorderLevelResponse,
    status_code=201,
    summary="Inventory — Save Reorder Level",
)
def create_reorder_level(payload: ReorderLevelCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvReorderLevel, payload.entity_id, "Reorder Level")
    obj = ItemMasterInvReorderLevel(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/reorder-level/{entity_id}",
    response_model=ReorderLevelResponse,
    summary="Inventory — Get Reorder Level",
)
def get_reorder_level(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvReorderLevel, entity_id, "Reorder Level")


@router.put(
    "/item-master-inv/reorder-level/{record_id}",
    response_model=ReorderLevelResponse,
    summary="Inventory — Update Reorder Level",
)
def update_reorder_level(record_id: int, payload: ReorderLevelUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvReorderLevel, record_id, "Reorder Level")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/reorder-level/{record_id}",
    summary="Inventory — Soft-delete Reorder Level",
)
def delete_reorder_level(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvReorderLevel, record_id, "Reorder Level")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Reorder Level record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  11. SAFETY STOCK FACTOR
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/safety-stock-factor/",
    response_model=SafetyStockFactorResponse,
    status_code=201,
    summary="Inventory — Save Safety Stock Factor",
)
def create_safety_stock_factor(payload: SafetyStockFactorCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvSafetyStockFactor, payload.entity_id, "Safety Stock Factor")
    obj = ItemMasterInvSafetyStockFactor(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/safety-stock-factor/{entity_id}",
    response_model=SafetyStockFactorResponse,
    summary="Inventory — Get Safety Stock Factor",
)
def get_safety_stock_factor(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvSafetyStockFactor, entity_id, "Safety Stock Factor")


@router.put(
    "/item-master-inv/safety-stock-factor/{record_id}",
    response_model=SafetyStockFactorResponse,
    summary="Inventory — Update Safety Stock Factor",
)
def update_safety_stock_factor(record_id: int, payload: SafetyStockFactorUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvSafetyStockFactor, record_id, "Safety Stock Factor")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/safety-stock-factor/{record_id}",
    summary="Inventory — Soft-delete Safety Stock Factor",
)
def delete_safety_stock_factor(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvSafetyStockFactor, record_id, "Safety Stock Factor")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Safety Stock Factor record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  12. UNIVERSAL PRODUCT CODE
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-inv/universal-product-code/",
    response_model=UniversalProductCodeResponse,
    status_code=201,
    summary="Inventory — Save Universal Product Code",
)
def create_universal_product_code(payload: UniversalProductCodeCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterInvUniversalProductCode, payload.entity_id, "Universal Product Code")
    obj = ItemMasterInvUniversalProductCode(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-inv/universal-product-code/{entity_id}",
    response_model=UniversalProductCodeResponse,
    summary="Inventory — Get Universal Product Code",
)
def get_universal_product_code(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterInvUniversalProductCode, entity_id, "Universal Product Code")


@router.put(
    "/item-master-inv/universal-product-code/{record_id}",
    response_model=UniversalProductCodeResponse,
    summary="Inventory — Update Universal Product Code",
)
def update_universal_product_code(record_id: int, payload: UniversalProductCodeUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterInvUniversalProductCode, record_id, "Universal Product Code")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-inv/universal-product-code/{record_id}",
    summary="Inventory — Soft-delete Universal Product Code",
)
def delete_universal_product_code(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterInvUniversalProductCode, record_id, "Universal Product Code")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Universal Product Code record deactivated", "id": record_id}