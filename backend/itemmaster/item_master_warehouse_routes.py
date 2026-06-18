"""
itemmaster/item_master_warehouse_routes.py
─────────────────────────────────────────────────────────────────────────────
FastAPI router for Item Master Warehouse tab — 7 separate field tables.

ENDPOINT MAP
────────────
Each of the 7 fields has 4 endpoints:

  POST   /item-master-wh/{field}/
  GET    /item-master-wh/{field}/{entity_id}
  PUT    /item-master-wh/{field}/{record_id}
  DELETE /item-master-wh/{field}/{record_id}   (soft-delete)

Where {field} is one of:
  storage-temperature | temperature-tolerance | potency-item |
  dependency-item | forced-putaway | multi-batch-pallet | item-consider

Yes/No fields (potency-item, dependency-item, forced-putaway,
multi-batch-pallet, item-consider):
  - yes_no_id is validated against yes_no_master on every POST/PUT
  - label_type and label are auto-populated from yes_no_master
    (DB is the source of truth — frontend snapshot is overridden)
  - GET response includes full yes_no_master row via joinedload
─────────────────────────────────────────────────────────────────────────────
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db

from common.yes_no_master_models import YesNoMaster

from itemmaster.item_master_warehouse_models import (
    ItemMasterWhStorageTemperature,
    ItemMasterWhTemperatureTolerance,
    ItemMasterWhPotencyItem,
    ItemMasterWhDependencyItem,
    ItemMasterWhForcedPutaway,
    ItemMasterWhMultiBatchPallet,
    ItemMasterWhItemConsider,
)
from itemmaster.item_master_warehouse_schemas import (
    StorageTemperatureCreate,   StorageTemperatureUpdate,   StorageTemperatureResponse,
    TemperatureToleranceCreate, TemperatureToleranceUpdate, TemperatureToleranceResponse,
    PotencyItemCreate,          PotencyItemUpdate,          PotencyItemResponse,
    DependencyItemCreate,       DependencyItemUpdate,       DependencyItemResponse,
    ForcedPutawayCreate,        ForcedPutawayUpdate,        ForcedPutawayResponse,
    MultiBatchPalletCreate,     MultiBatchPalletUpdate,     MultiBatchPalletResponse,
    ItemConsiderCreate,         ItemConsiderUpdate,         ItemConsiderResponse,
)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  INTERNAL HELPERS — generic CRUD (keeps endpoint code DRY)
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


# ─────────────────────────────────────────────────────────────────────────────
#  YES/NO HELPER — validate yes_no_id and return authoritative label_type/label
# ─────────────────────────────────────────────────────────────────────────────

def _resolve_yes_no(db: Session, yes_no_id: Optional[int], field_label: str) -> dict:
    """
    Validate yes_no_id against yes_no_master.
    Returns dict with yes_no_id, yes_no_pair_id, label_type, label
    sourced directly from DB — never trusts frontend snapshot.
    Raises 400 if yes_no_id is invalid or inactive.
    """
    if yes_no_id is None:
        return {
            "yes_no_id":      None,
            "yes_no_pair_id": None,
            "label_type":     None,
            "label":          None,
        }
    row = db.query(YesNoMaster).filter(
        YesNoMaster.id == yes_no_id,
        YesNoMaster.is_active == True,
    ).first()
    if not row:
        raise HTTPException(
            400,
            f"{field_label}: yes_no_id={yes_no_id} not found or inactive in yes_no_master."
        )
    return {
        "yes_no_id":      row.id,
        "yes_no_pair_id": row.yes_no_pair_id,
        "label_type":     row.label_type,   # 'yes' or 'no' — authoritative from DB
        "label":          row.label,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  1.  STORAGE TEMPERATURE  (numeric — no yes_no logic)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-wh/storage-temperature/",
    response_model=StorageTemperatureResponse,
    status_code=201,
    summary="Warehouse — Save Storage Temperature",
)
def create_storage_temperature(payload: StorageTemperatureCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterWhStorageTemperature, payload.entity_id, "Storage Temperature")
    obj = ItemMasterWhStorageTemperature(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-wh/storage-temperature/{entity_id}",
    response_model=StorageTemperatureResponse,
    summary="Warehouse — Get Storage Temperature",
)
def get_storage_temperature(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterWhStorageTemperature, entity_id, "Storage Temperature")


@router.put(
    "/item-master-wh/storage-temperature/{record_id}",
    response_model=StorageTemperatureResponse,
    summary="Warehouse — Update Storage Temperature",
)
def update_storage_temperature(record_id: int, payload: StorageTemperatureUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterWhStorageTemperature, record_id, "Storage Temperature")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-wh/storage-temperature/{record_id}",
    summary="Warehouse — Soft-delete Storage Temperature",
)
def delete_storage_temperature(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterWhStorageTemperature, record_id, "Storage Temperature")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Storage Temperature record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  2.  TEMPERATURE TOLERANCE  (numeric — no yes_no logic)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-wh/temperature-tolerance/",
    response_model=TemperatureToleranceResponse,
    status_code=201,
    summary="Warehouse — Save Temperature Tolerance",
)
def create_temperature_tolerance(payload: TemperatureToleranceCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterWhTemperatureTolerance, payload.entity_id, "Temperature Tolerance")
    obj = ItemMasterWhTemperatureTolerance(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-wh/temperature-tolerance/{entity_id}",
    response_model=TemperatureToleranceResponse,
    summary="Warehouse — Get Temperature Tolerance",
)
def get_temperature_tolerance(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterWhTemperatureTolerance, entity_id, "Temperature Tolerance")


@router.put(
    "/item-master-wh/temperature-tolerance/{record_id}",
    response_model=TemperatureToleranceResponse,
    summary="Warehouse — Update Temperature Tolerance",
)
def update_temperature_tolerance(record_id: int, payload: TemperatureToleranceUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterWhTemperatureTolerance, record_id, "Temperature Tolerance")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-wh/temperature-tolerance/{record_id}",
    summary="Warehouse — Soft-delete Temperature Tolerance",
)
def delete_temperature_tolerance(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterWhTemperatureTolerance, record_id, "Temperature Tolerance")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Temperature Tolerance record deactivated", "id": record_id}


# ─────────────────────────────────────────────────────────────────────────────
#  YES/NO GET HELPER — joinedload yes_no relationship for full response
# ─────────────────────────────────────────────────────────────────────────────

def _get_active_yn(db: Session, Model, entity_id: int):
    return (
        db.query(Model)
        .options(joinedload(Model.yes_no))
        .filter(Model.entity_id == entity_id, Model.is_active == True)
        .order_by(Model.created_at.desc())
        .first()
    )

def _require_active_yn(db: Session, Model, entity_id: int, label: str):
    obj = _get_active_yn(db, Model, entity_id)
    if not obj:
        raise HTTPException(404, f"No active {label} record found for entity_id={entity_id}")
    return obj

def _require_by_id_yn(db: Session, Model, record_id: int, label: str):
    obj = (
        db.query(Model)
        .options(joinedload(Model.yes_no))
        .filter(Model.id == record_id)
        .first()
    )
    if not obj:
        raise HTTPException(404, f"{label} record id={record_id} not found")
    return obj


# ═════════════════════════════════════════════════════════════════════════════
#  3.  POTENCY ITEM  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-wh/potency-item/",
    response_model=PotencyItemResponse,
    status_code=201,
    summary="Warehouse — Save Potency Item",
)
def create_potency_item(payload: PotencyItemCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterWhPotencyItem, payload.entity_id, "Potency Item")
    yn = _resolve_yes_no(db, payload.yes_no_id, "Potency Item")
    data = payload.model_dump()
    data.update(yn)   # override with authoritative yes_no_master values
    obj = ItemMasterWhPotencyItem(**data)
    db.add(obj)
    db.commit()
    return _require_active_yn(db, ItemMasterWhPotencyItem, payload.entity_id, "Potency Item")


@router.get(
    "/item-master-wh/potency-item/{entity_id}",
    response_model=PotencyItemResponse,
    summary="Warehouse — Get Potency Item",
)
def get_potency_item(entity_id: int, db: Session = Depends(get_db)):
    return _require_active_yn(db, ItemMasterWhPotencyItem, entity_id, "Potency Item")


@router.put(
    "/item-master-wh/potency-item/{record_id}",
    response_model=PotencyItemResponse,
    summary="Warehouse — Update Potency Item",
)
def update_potency_item(record_id: int, payload: PotencyItemUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterWhPotencyItem, record_id, "Potency Item")
    data = payload.model_dump(exclude_unset=True)
    if "yes_no_id" in data:
        yn = _resolve_yes_no(db, data.get("yes_no_id"), "Potency Item")
        data.update(yn)
    for field, value in data.items():
        setattr(obj, field, value)
    db.commit()
    return _require_by_id_yn(db, ItemMasterWhPotencyItem, record_id, "Potency Item")


@router.delete(
    "/item-master-wh/potency-item/{record_id}",
    summary="Warehouse — Soft-delete Potency Item",
)
def delete_potency_item(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterWhPotencyItem, record_id, "Potency Item")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Potency Item record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  4.  DEPENDENCY ITEM  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-wh/dependency-item/",
    response_model=DependencyItemResponse,
    status_code=201,
    summary="Warehouse — Save Dependency Item",
)
def create_dependency_item(payload: DependencyItemCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterWhDependencyItem, payload.entity_id, "Dependency Item")
    yn = _resolve_yes_no(db, payload.yes_no_id, "Dependency Item")
    data = payload.model_dump()
    data.update(yn)
    obj = ItemMasterWhDependencyItem(**data)
    db.add(obj)
    db.commit()
    return _require_active_yn(db, ItemMasterWhDependencyItem, payload.entity_id, "Dependency Item")


@router.get(
    "/item-master-wh/dependency-item/{entity_id}",
    response_model=DependencyItemResponse,
    summary="Warehouse — Get Dependency Item",
)
def get_dependency_item(entity_id: int, db: Session = Depends(get_db)):
    return _require_active_yn(db, ItemMasterWhDependencyItem, entity_id, "Dependency Item")


@router.put(
    "/item-master-wh/dependency-item/{record_id}",
    response_model=DependencyItemResponse,
    summary="Warehouse — Update Dependency Item",
)
def update_dependency_item(record_id: int, payload: DependencyItemUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterWhDependencyItem, record_id, "Dependency Item")
    data = payload.model_dump(exclude_unset=True)
    if "yes_no_id" in data:
        yn = _resolve_yes_no(db, data.get("yes_no_id"), "Dependency Item")
        data.update(yn)
    for field, value in data.items():
        setattr(obj, field, value)
    db.commit()
    return _require_by_id_yn(db, ItemMasterWhDependencyItem, record_id, "Dependency Item")


@router.delete(
    "/item-master-wh/dependency-item/{record_id}",
    summary="Warehouse — Soft-delete Dependency Item",
)
def delete_dependency_item(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterWhDependencyItem, record_id, "Dependency Item")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Dependency Item record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  5.  FORCED PUTAWAY  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-wh/forced-putaway/",
    response_model=ForcedPutawayResponse,
    status_code=201,
    summary="Warehouse — Save Forced Putaway",
)
def create_forced_putaway(payload: ForcedPutawayCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterWhForcedPutaway, payload.entity_id, "Forced Putaway")
    yn = _resolve_yes_no(db, payload.yes_no_id, "Forced Putaway")
    data = payload.model_dump()
    data.update(yn)
    obj = ItemMasterWhForcedPutaway(**data)
    db.add(obj)
    db.commit()
    return _require_active_yn(db, ItemMasterWhForcedPutaway, payload.entity_id, "Forced Putaway")


@router.get(
    "/item-master-wh/forced-putaway/{entity_id}",
    response_model=ForcedPutawayResponse,
    summary="Warehouse — Get Forced Putaway",
)
def get_forced_putaway(entity_id: int, db: Session = Depends(get_db)):
    return _require_active_yn(db, ItemMasterWhForcedPutaway, entity_id, "Forced Putaway")


@router.put(
    "/item-master-wh/forced-putaway/{record_id}",
    response_model=ForcedPutawayResponse,
    summary="Warehouse — Update Forced Putaway",
)
def update_forced_putaway(record_id: int, payload: ForcedPutawayUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterWhForcedPutaway, record_id, "Forced Putaway")
    data = payload.model_dump(exclude_unset=True)
    if "yes_no_id" in data:
        yn = _resolve_yes_no(db, data.get("yes_no_id"), "Forced Putaway")
        data.update(yn)
    for field, value in data.items():
        setattr(obj, field, value)
    db.commit()
    return _require_by_id_yn(db, ItemMasterWhForcedPutaway, record_id, "Forced Putaway")


@router.delete(
    "/item-master-wh/forced-putaway/{record_id}",
    summary="Warehouse — Soft-delete Forced Putaway",
)
def delete_forced_putaway(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterWhForcedPutaway, record_id, "Forced Putaway")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Forced Putaway record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  6.  MULTI-BATCH PALLET  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-wh/multi-batch-pallet/",
    response_model=MultiBatchPalletResponse,
    status_code=201,
    summary="Warehouse — Save Multi-Batch Pallet",
)
def create_multi_batch_pallet(payload: MultiBatchPalletCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterWhMultiBatchPallet, payload.entity_id, "Multi-Batch Pallet")
    yn = _resolve_yes_no(db, payload.yes_no_id, "Multi-Batch Pallet")
    data = payload.model_dump()
    data.update(yn)
    obj = ItemMasterWhMultiBatchPallet(**data)
    db.add(obj)
    db.commit()
    return _require_active_yn(db, ItemMasterWhMultiBatchPallet, payload.entity_id, "Multi-Batch Pallet")


@router.get(
    "/item-master-wh/multi-batch-pallet/{entity_id}",
    response_model=MultiBatchPalletResponse,
    summary="Warehouse — Get Multi-Batch Pallet",
)
def get_multi_batch_pallet(entity_id: int, db: Session = Depends(get_db)):
    return _require_active_yn(db, ItemMasterWhMultiBatchPallet, entity_id, "Multi-Batch Pallet")


@router.put(
    "/item-master-wh/multi-batch-pallet/{record_id}",
    response_model=MultiBatchPalletResponse,
    summary="Warehouse — Update Multi-Batch Pallet",
)
def update_multi_batch_pallet(record_id: int, payload: MultiBatchPalletUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterWhMultiBatchPallet, record_id, "Multi-Batch Pallet")
    data = payload.model_dump(exclude_unset=True)
    if "yes_no_id" in data:
        yn = _resolve_yes_no(db, data.get("yes_no_id"), "Multi-Batch Pallet")
        data.update(yn)
    for field, value in data.items():
        setattr(obj, field, value)
    db.commit()
    return _require_by_id_yn(db, ItemMasterWhMultiBatchPallet, record_id, "Multi-Batch Pallet")


@router.delete(
    "/item-master-wh/multi-batch-pallet/{record_id}",
    summary="Warehouse — Soft-delete Multi-Batch Pallet",
)
def delete_multi_batch_pallet(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterWhMultiBatchPallet, record_id, "Multi-Batch Pallet")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Multi-Batch Pallet record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  7.  ITEM CONSIDER  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-wh/item-consider/",
    response_model=ItemConsiderResponse,
    status_code=201,
    summary="Warehouse — Save Item Consider",
)
def create_item_consider(payload: ItemConsiderCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterWhItemConsider, payload.entity_id, "Item Consider")
    yn = _resolve_yes_no(db, payload.yes_no_id, "Item Consider")
    data = payload.model_dump()
    data.update(yn)
    obj = ItemMasterWhItemConsider(**data)
    db.add(obj)
    db.commit()
    return _require_active_yn(db, ItemMasterWhItemConsider, payload.entity_id, "Item Consider")


@router.get(
    "/item-master-wh/item-consider/{entity_id}",
    response_model=ItemConsiderResponse,
    summary="Warehouse — Get Item Consider",
)
def get_item_consider(entity_id: int, db: Session = Depends(get_db)):
    return _require_active_yn(db, ItemMasterWhItemConsider, entity_id, "Item Consider")


@router.put(
    "/item-master-wh/item-consider/{record_id}",
    response_model=ItemConsiderResponse,
    summary="Warehouse — Update Item Consider",
)
def update_item_consider(record_id: int, payload: ItemConsiderUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterWhItemConsider, record_id, "Item Consider")
    data = payload.model_dump(exclude_unset=True)
    if "yes_no_id" in data:
        yn = _resolve_yes_no(db, data.get("yes_no_id"), "Item Consider")
        data.update(yn)
    for field, value in data.items():
        setattr(obj, field, value)
    db.commit()
    return _require_by_id_yn(db, ItemMasterWhItemConsider, record_id, "Item Consider")


@router.delete(
    "/item-master-wh/item-consider/{record_id}",
    summary="Warehouse — Soft-delete Item Consider",
)
def delete_item_consider(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterWhItemConsider, record_id, "Item Consider")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Item Consider record deactivated", "id": record_id}