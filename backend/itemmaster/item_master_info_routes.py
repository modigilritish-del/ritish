"""itemmaster/item_master_info_routes.py
   FastAPI router — Item Master Info (per-field tables)
   ─────────────────────────────────────────────────────────────────────────────
   ENDPOINT MAP
   ────────────
   UOM
     POST   /item-master-info/uom/
     GET    /item-master-info/uom/{entity_id}
     PUT    /item-master-info/uom/{record_id}
     DELETE /item-master-info/uom/{record_id}

   MAX LOOSE
     POST   /item-master-info/max-loose/
     GET    /item-master-info/max-loose/{entity_id}
     PUT    /item-master-info/max-loose/{record_id}
     DELETE /item-master-info/max-loose/{record_id}

   STOCK   (was stock-service, now independent — same pattern as batch/serial)
     POST   /item-master-info/stock/
     GET    /item-master-info/stock/{entity_id}
     PUT    /item-master-info/stock/{record_id}
     DELETE /item-master-info/stock/{record_id}

   SERVICE (was stock-service, now independent — same pattern as batch/serial)
     POST   /item-master-info/service/
     GET    /item-master-info/service/{entity_id}
     PUT    /item-master-info/service/{record_id}
     DELETE /item-master-info/service/{record_id}

   BATCH ITEM
     POST   /item-master-info/batch-item/
     GET    /item-master-info/batch-item/{entity_id}
     PUT    /item-master-info/batch-item/{record_id}
     DELETE /item-master-info/batch-item/{record_id}

   SERIAL ITEM
     POST   /item-master-info/serial-item/
     GET    /item-master-info/serial-item/{entity_id}
     PUT    /item-master-info/serial-item/{record_id}
     DELETE /item-master-info/serial-item/{record_id}

   GIFT VOUCHER
     POST   /item-master-info/gift-voucher/
     GET    /item-master-info/gift-voucher/{entity_id}
     PUT    /item-master-info/gift-voucher/{record_id}
     DELETE /item-master-info/gift-voucher/{record_id}

   EXTENDED WARRANTY
     POST   /item-master-info/extended-warranty/
     GET    /item-master-info/extended-warranty/{entity_id}
     PUT    /item-master-info/extended-warranty/{record_id}
     DELETE /item-master-info/extended-warranty/{record_id}

   BULK / SUMMARY
     POST   /item-master-info/bulk-upsert/
     GET    /item-master-info/summary/{entity_id}
     GET    /item-master-info/summary/by-request/{request_id}

   CHANGE LOG / AUDIT
     GET    /item-master-info/history/{entity_id}
     GET    /item-master-info/history/by-request/{request_id}
     GET    /item-master-info/history/by-table/{entity_id}/{table_name}
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from user import user_models as umodels
from itemmaster.item_master_info_models import (
    ItemMasterUOM,
    ItemMasterMaxLoose,
    ItemMasterStock,
    ItemMasterService,
    ItemMasterBatchItem,
    ItemMasterSerialItem,
    ItemMasterGiftVoucher,
    ItemMasterExtendedWarranty,
    ItemMasterInfoChangeLog,
    ItemMasterInfoTableEnum,
    YesNoEnum,
)
from itemmaster.item_master_info_schemas import (
    ItemMasterUOMCreate, ItemMasterUOMUpdate, ItemMasterUOMResponse,
    ItemMasterMaxLooseCreate, ItemMasterMaxLooseUpdate, ItemMasterMaxLooseResponse,
    ItemMasterStockCreate, ItemMasterStockUpdate, ItemMasterStockResponse,
    ItemMasterServiceCreate, ItemMasterServiceUpdate, ItemMasterServiceResponse,
    ItemMasterBatchItemCreate, ItemMasterBatchItemUpdate, ItemMasterBatchItemResponse,
    ItemMasterSerialItemCreate, ItemMasterSerialItemUpdate, ItemMasterSerialItemResponse,
    ItemMasterGiftVoucherCreate, ItemMasterGiftVoucherUpdate, ItemMasterGiftVoucherResponse,
    ItemMasterExtendedWarrantyCreate, ItemMasterExtendedWarrantyUpdate, ItemMasterExtendedWarrantyResponse,
    ItemMasterInfoSummary, ItemMasterInfoBulkUpsert, ItemMasterInfoBulkResponse,
    ChangeLogEntry,
)

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════════
#  INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

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
    table_name:    ItemMasterInfoTableEnum,
    record_id:     int,
    action:        str,
    field_name:    Optional[str] = None,
    old_value:     Optional[str] = None,
    new_value:     Optional[str] = None,
    changed_by:    Optional[int] = None,
    change_reason: Optional[str] = None,
):
    # Pass table_name as plain string value to avoid PostgreSQL enum type conflicts
    table_name_str = table_name.value if isinstance(table_name, ItemMasterInfoTableEnum) else str(table_name)
    db.add(ItemMasterInfoChangeLog(
        request_id            = request_id,
        entity_id             = entity_id,
        table_name            = table_name_str,
        record_id             = record_id,
        action                = action,
        field_name            = field_name,
        old_value             = old_value,
        new_value             = new_value,
        changed_by            = changed_by,
        changer_name_snapshot = _get_changer_name(db, changed_by),
        change_reason         = change_reason,
    ))


def _write_logs_for_update(
    db: Session,
    *,
    request_id:    Optional[str],
    entity_id:     int,
    table_name:    ItemMasterInfoTableEnum,
    record_id:     int,
    changed_by:    Optional[int],
    change_reason: Optional[str],
    changes:       dict,
):
    for field, (old, new) in changes.items():
        if str(old) != str(new):
            _write_log(
                db,
                request_id=request_id, entity_id=entity_id,
                table_name=table_name, record_id=record_id,
                action="UPDATE", field_name=field,
                old_value=str(old) if old is not None else None,
                new_value=str(new) if new is not None else None,
                changed_by=changed_by, change_reason=change_reason,
            )


# ═══════════════════════════════════════════════════════════════════════════════
#  1.  UOM ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-info/uom/",
    response_model=ItemMasterUOMResponse,
    status_code=201,
    summary="Item Master UOM — Set Base UOM for a request",
)
def create_uom(payload: ItemMasterUOMCreate, db: Session = Depends(get_db)):
    existing = db.query(ItemMasterUOM).filter(
        ItemMasterUOM.entity_id == payload.entity_id,
        ItemMasterUOM.is_active == True,
    ).first()
    if existing:
        raise HTTPException(400, f"UOM already set for entity_id={payload.entity_id}. Use PUT to update.")

    obj = ItemMasterUOM(
        request_id = payload.request_id,
        entity_id  = payload.entity_id,
        uom_code   = payload.uom_code.strip().upper(),
        uom_name   = payload.uom_name,
        notes      = payload.notes,
        created_by = payload.changed_by,
        is_active  = True,
    )
    db.add(obj)
    db.flush()
    _write_log(db, request_id=payload.request_id, entity_id=payload.entity_id,
               table_name=ItemMasterInfoTableEnum.UOM, record_id=obj.id,
               action="CREATE", field_name="uom_code",
               new_value=payload.uom_code,
               changed_by=payload.changed_by, change_reason=payload.change_reason)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-info/uom/{entity_id}",
    response_model=ItemMasterUOMResponse,
    summary="Item Master UOM — Get Base UOM for a request",
)
def get_uom(entity_id: int, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterUOM).filter(
        ItemMasterUOM.entity_id == entity_id,
        ItemMasterUOM.is_active == True,
    ).order_by(ItemMasterUOM.created_at.desc()).first()
    if not obj:
        raise HTTPException(404, f"No UOM found for entity_id={entity_id}")
    return obj


@router.put(
    "/item-master-info/uom/{record_id}",
    response_model=ItemMasterUOMResponse,
    summary="Item Master UOM — Update Base UOM",
)
def update_uom(record_id: int, payload: ItemMasterUOMUpdate, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterUOM).filter(ItemMasterUOM.id == record_id).first()
    if not obj:
        raise HTTPException(404, "UOM record not found")
    changes = {}
    if payload.uom_code is not None and payload.uom_code.upper() != obj.uom_code:
        changes["uom_code"] = (obj.uom_code, payload.uom_code.upper())
        obj.uom_code = payload.uom_code.strip().upper()
    if payload.uom_name is not None and payload.uom_name != obj.uom_name:
        changes["uom_name"] = (obj.uom_name, payload.uom_name)
        obj.uom_name = payload.uom_name
    if payload.notes is not None:
        obj.notes = payload.notes
    if payload.updated_by is not None:
        obj.updated_by = payload.updated_by
    _write_logs_for_update(db, request_id=obj.request_id, entity_id=obj.entity_id,
                           table_name=ItemMasterInfoTableEnum.UOM, record_id=obj.id,
                           changed_by=payload.updated_by, change_reason=payload.change_reason,
                           changes=changes)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-info/uom/{record_id}",
    summary="Item Master UOM — Soft-delete UOM record",
)
def delete_uom(record_id: int, updated_by: Optional[int] = Query(None), db: Session = Depends(get_db)):
    obj = db.query(ItemMasterUOM).filter(ItemMasterUOM.id == record_id).first()
    if not obj:
        raise HTTPException(404, "UOM record not found")
    obj.is_active = False
    obj.updated_by = updated_by
    _write_log(db, request_id=obj.request_id, entity_id=obj.entity_id,
               table_name=ItemMasterInfoTableEnum.UOM, record_id=obj.id,
               action="DELETE", changed_by=updated_by)
    db.commit()
    return {"message": "UOM record deactivated", "id": record_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  2.  MAX LOOSE ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-info/max-loose/",
    response_model=ItemMasterMaxLooseResponse,
    status_code=201,
    summary="Item Master Max Loose — Set Max Loose value",
)
def create_max_loose(payload: ItemMasterMaxLooseCreate, db: Session = Depends(get_db)):
    existing = db.query(ItemMasterMaxLoose).filter(
        ItemMasterMaxLoose.entity_id == payload.entity_id,
        ItemMasterMaxLoose.is_active == True,
    ).first()
    if existing:
        raise HTTPException(400, f"Max Loose already set for entity_id={payload.entity_id}. Use PUT to update.")

    obj = ItemMasterMaxLoose(
        request_id = payload.request_id,
        entity_id  = payload.entity_id,
        max_loose  = payload.max_loose,
        uom_code   = payload.uom_code,
        notes      = payload.notes,
        created_by = payload.changed_by,
        is_active  = True,
    )
    db.add(obj)
    db.flush()
    _write_log(db, request_id=payload.request_id, entity_id=payload.entity_id,
               table_name=ItemMasterInfoTableEnum.MAX_LOOSE, record_id=obj.id,
               action="CREATE", field_name="max_loose",
               new_value=str(payload.max_loose),
               changed_by=payload.changed_by, change_reason=payload.change_reason)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-info/max-loose/{entity_id}",
    response_model=ItemMasterMaxLooseResponse,
    summary="Item Master Max Loose — Get Max Loose for a request",
)
def get_max_loose(entity_id: int, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterMaxLoose).filter(
        ItemMasterMaxLoose.entity_id == entity_id,
        ItemMasterMaxLoose.is_active == True,
    ).order_by(ItemMasterMaxLoose.created_at.desc()).first()
    if not obj:
        raise HTTPException(404, f"No Max Loose found for entity_id={entity_id}")
    return obj


@router.put(
    "/item-master-info/max-loose/{record_id}",
    response_model=ItemMasterMaxLooseResponse,
    summary="Item Master Max Loose — Update Max Loose value",
)
def update_max_loose(record_id: int, payload: ItemMasterMaxLooseUpdate, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterMaxLoose).filter(ItemMasterMaxLoose.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Max Loose record not found")
    changes = {}
    if payload.max_loose is not None and payload.max_loose != obj.max_loose:
        changes["max_loose"] = (obj.max_loose, payload.max_loose)
        obj.max_loose = payload.max_loose
    if payload.uom_code is not None and payload.uom_code != obj.uom_code:
        changes["uom_code"] = (obj.uom_code, payload.uom_code)
        obj.uom_code = payload.uom_code
    if payload.notes is not None:
        obj.notes = payload.notes
    if payload.updated_by is not None:
        obj.updated_by = payload.updated_by
    _write_logs_for_update(db, request_id=obj.request_id, entity_id=obj.entity_id,
                           table_name=ItemMasterInfoTableEnum.MAX_LOOSE, record_id=obj.id,
                           changed_by=payload.updated_by, change_reason=payload.change_reason,
                           changes=changes)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-info/max-loose/{record_id}",
    summary="Item Master Max Loose — Soft-delete",
)
def delete_max_loose(record_id: int, updated_by: Optional[int] = Query(None), db: Session = Depends(get_db)):
    obj = db.query(ItemMasterMaxLoose).filter(ItemMasterMaxLoose.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Max Loose record not found")
    obj.is_active = False
    obj.updated_by = updated_by
    _write_log(db, request_id=obj.request_id, entity_id=obj.entity_id,
               table_name=ItemMasterInfoTableEnum.MAX_LOOSE, record_id=obj.id,
               action="DELETE", changed_by=updated_by)
    db.commit()
    return {"message": "Max Loose record deactivated", "id": record_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  3.  STOCK ENDPOINTS  (split from stock-service)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-info/stock/",
    response_model=ItemMasterStockResponse,
    status_code=201,
    summary="Item Master Stock — Set Stock flag (YES/NO)",
)
def create_stock(payload: ItemMasterStockCreate, db: Session = Depends(get_db)):
    existing = db.query(ItemMasterStock).filter(
        ItemMasterStock.entity_id == payload.entity_id,
        ItemMasterStock.is_active == True,
    ).first()
    if existing:
        raise HTTPException(400, f"Stock already set for entity_id={payload.entity_id}. Use PUT to update.")

    obj = ItemMasterStock(
        request_id = payload.request_id,
        entity_id  = payload.entity_id,
        is_stock   = payload.is_stock,
        notes      = payload.notes,
        created_by = payload.changed_by,
        is_active  = True,
    )
    db.add(obj)
    db.flush()
    _write_log(db, request_id=payload.request_id, entity_id=payload.entity_id,
               table_name=ItemMasterInfoTableEnum.STOCK, record_id=obj.id,
               action="CREATE", field_name="is_stock",
               new_value=payload.is_stock.value,
               changed_by=payload.changed_by, change_reason=payload.change_reason)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-info/stock/{entity_id}",
    response_model=ItemMasterStockResponse,
    summary="Item Master Stock — Get Stock flag for a request",
)
def get_stock(entity_id: int, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterStock).filter(
        ItemMasterStock.entity_id == entity_id,
        ItemMasterStock.is_active == True,
    ).order_by(ItemMasterStock.created_at.desc()).first()
    if not obj:
        raise HTTPException(404, f"No Stock record for entity_id={entity_id}")
    return obj


@router.put(
    "/item-master-info/stock/{record_id}",
    response_model=ItemMasterStockResponse,
    summary="Item Master Stock — Update Stock flag",
)
def update_stock(record_id: int, payload: ItemMasterStockUpdate, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterStock).filter(ItemMasterStock.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Stock record not found")
    changes = {}
    if payload.is_stock is not None and payload.is_stock != obj.is_stock:
        changes["is_stock"] = (obj.is_stock.value, payload.is_stock.value)
        obj.is_stock = payload.is_stock
    if payload.notes is not None:
        obj.notes = payload.notes
    if payload.updated_by is not None:
        obj.updated_by = payload.updated_by
    _write_logs_for_update(db, request_id=obj.request_id, entity_id=obj.entity_id,
                           table_name=ItemMasterInfoTableEnum.STOCK, record_id=obj.id,
                           changed_by=payload.updated_by, change_reason=payload.change_reason,
                           changes=changes)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-info/stock/{record_id}",
    summary="Item Master Stock — Soft-delete Stock record",
)
def delete_stock(record_id: int, updated_by: Optional[int] = Query(None), db: Session = Depends(get_db)):
    obj = db.query(ItemMasterStock).filter(ItemMasterStock.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Stock record not found")
    obj.is_active = False
    obj.updated_by = updated_by
    _write_log(db, request_id=obj.request_id, entity_id=obj.entity_id,
               table_name=ItemMasterInfoTableEnum.STOCK, record_id=obj.id,
               action="DELETE", changed_by=updated_by)
    db.commit()
    return {"message": "Stock record deactivated", "id": record_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  4.  SERVICE ENDPOINTS  (split from stock-service)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-info/service/",
    response_model=ItemMasterServiceResponse,
    status_code=201,
    summary="Item Master Service — Set Service flag (YES/NO)",
)
def create_service(payload: ItemMasterServiceCreate, db: Session = Depends(get_db)):
    existing = db.query(ItemMasterService).filter(
        ItemMasterService.entity_id == payload.entity_id,
        ItemMasterService.is_active == True,
    ).first()
    if existing:
        raise HTTPException(400, f"Service already set for entity_id={payload.entity_id}. Use PUT to update.")

    obj = ItemMasterService(
        request_id = payload.request_id,
        entity_id  = payload.entity_id,
        is_service = payload.is_service,
        notes      = payload.notes,
        created_by = payload.changed_by,
        is_active  = True,
    )
    db.add(obj)
    db.flush()
    _write_log(db, request_id=payload.request_id, entity_id=payload.entity_id,
               table_name=ItemMasterInfoTableEnum.SERVICE, record_id=obj.id,
               action="CREATE", field_name="is_service",
               new_value=payload.is_service.value,
               changed_by=payload.changed_by, change_reason=payload.change_reason)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-info/service/{entity_id}",
    response_model=ItemMasterServiceResponse,
    summary="Item Master Service — Get Service flag for a request",
)
def get_service(entity_id: int, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterService).filter(
        ItemMasterService.entity_id == entity_id,
        ItemMasterService.is_active == True,
    ).order_by(ItemMasterService.created_at.desc()).first()
    if not obj:
        raise HTTPException(404, f"No Service record for entity_id={entity_id}")
    return obj


@router.put(
    "/item-master-info/service/{record_id}",
    response_model=ItemMasterServiceResponse,
    summary="Item Master Service — Update Service flag",
)
def update_service(record_id: int, payload: ItemMasterServiceUpdate, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterService).filter(ItemMasterService.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Service record not found")
    changes = {}
    if payload.is_service is not None and payload.is_service != obj.is_service:
        changes["is_service"] = (obj.is_service.value, payload.is_service.value)
        obj.is_service = payload.is_service
    if payload.notes is not None:
        obj.notes = payload.notes
    if payload.updated_by is not None:
        obj.updated_by = payload.updated_by
    _write_logs_for_update(db, request_id=obj.request_id, entity_id=obj.entity_id,
                           table_name=ItemMasterInfoTableEnum.SERVICE, record_id=obj.id,
                           changed_by=payload.updated_by, change_reason=payload.change_reason,
                           changes=changes)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-info/service/{record_id}",
    summary="Item Master Service — Soft-delete Service record",
)
def delete_service(record_id: int, updated_by: Optional[int] = Query(None), db: Session = Depends(get_db)):
    obj = db.query(ItemMasterService).filter(ItemMasterService.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Service record not found")
    obj.is_active = False
    obj.updated_by = updated_by
    _write_log(db, request_id=obj.request_id, entity_id=obj.entity_id,
               table_name=ItemMasterInfoTableEnum.SERVICE, record_id=obj.id,
               action="DELETE", changed_by=updated_by)
    db.commit()
    return {"message": "Service record deactivated", "id": record_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  5.  BATCH ITEM ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-info/batch-item/",
    response_model=ItemMasterBatchItemResponse,
    status_code=201,
    summary="Item Master Batch Item — Set Batch flag",
)
def create_batch_item(payload: ItemMasterBatchItemCreate, db: Session = Depends(get_db)):
    existing = db.query(ItemMasterBatchItem).filter(
        ItemMasterBatchItem.entity_id == payload.entity_id,
        ItemMasterBatchItem.is_active == True,
    ).first()
    if existing:
        raise HTTPException(400, f"Batch Item already set for entity_id={payload.entity_id}. Use PUT to update.")

    obj = ItemMasterBatchItem(
        request_id = payload.request_id,
        entity_id  = payload.entity_id,
        is_batch   = payload.is_batch,
        notes      = payload.notes,
        created_by = payload.changed_by,
        is_active  = True,
    )
    db.add(obj)
    db.flush()
    _write_log(db, request_id=payload.request_id, entity_id=payload.entity_id,
               table_name=ItemMasterInfoTableEnum.BATCH_ITEM, record_id=obj.id,
               action="CREATE", field_name="is_batch",
               new_value=payload.is_batch.value,
               changed_by=payload.changed_by, change_reason=payload.change_reason)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-info/batch-item/{entity_id}",
    response_model=ItemMasterBatchItemResponse,
    summary="Item Master Batch Item — Get Batch flag for a request",
)
def get_batch_item(entity_id: int, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterBatchItem).filter(
        ItemMasterBatchItem.entity_id == entity_id,
        ItemMasterBatchItem.is_active == True,
    ).order_by(ItemMasterBatchItem.created_at.desc()).first()
    if not obj:
        raise HTTPException(404, f"No Batch Item record for entity_id={entity_id}")
    return obj


@router.put(
    "/item-master-info/batch-item/{record_id}",
    response_model=ItemMasterBatchItemResponse,
    summary="Item Master Batch Item — Update Batch flag",
)
def update_batch_item(record_id: int, payload: ItemMasterBatchItemUpdate, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterBatchItem).filter(ItemMasterBatchItem.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Batch Item record not found")
    changes = {}
    if payload.is_batch is not None and payload.is_batch != obj.is_batch:
        changes["is_batch"] = (obj.is_batch.value, payload.is_batch.value)
        obj.is_batch = payload.is_batch
    if payload.notes is not None:
        obj.notes = payload.notes
    if payload.updated_by is not None:
        obj.updated_by = payload.updated_by
    _write_logs_for_update(db, request_id=obj.request_id, entity_id=obj.entity_id,
                           table_name=ItemMasterInfoTableEnum.BATCH_ITEM, record_id=obj.id,
                           changed_by=payload.updated_by, change_reason=payload.change_reason,
                           changes=changes)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-info/batch-item/{record_id}",
    summary="Item Master Batch Item — Soft-delete",
)
def delete_batch_item(record_id: int, updated_by: Optional[int] = Query(None), db: Session = Depends(get_db)):
    obj = db.query(ItemMasterBatchItem).filter(ItemMasterBatchItem.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Batch Item record not found")
    obj.is_active = False
    obj.updated_by = updated_by
    _write_log(db, request_id=obj.request_id, entity_id=obj.entity_id,
               table_name=ItemMasterInfoTableEnum.BATCH_ITEM, record_id=obj.id,
               action="DELETE", changed_by=updated_by)
    db.commit()
    return {"message": "Batch Item record deactivated", "id": record_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  6.  SERIAL ITEM ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-info/serial-item/",
    response_model=ItemMasterSerialItemResponse,
    status_code=201,
    summary="Item Master Serial Item — Set Serial flag",
)
def create_serial_item(payload: ItemMasterSerialItemCreate, db: Session = Depends(get_db)):
    existing = db.query(ItemMasterSerialItem).filter(
        ItemMasterSerialItem.entity_id == payload.entity_id,
        ItemMasterSerialItem.is_active == True,
    ).first()
    if existing:
        raise HTTPException(400, f"Serial Item already set for entity_id={payload.entity_id}. Use PUT to update.")

    obj = ItemMasterSerialItem(
        request_id = payload.request_id,
        entity_id  = payload.entity_id,
        is_serial  = payload.is_serial,
        notes      = payload.notes,
        created_by = payload.changed_by,
        is_active  = True,
    )
    db.add(obj)
    db.flush()
    _write_log(db, request_id=payload.request_id, entity_id=payload.entity_id,
               table_name=ItemMasterInfoTableEnum.SERIAL_ITEM, record_id=obj.id,
               action="CREATE", field_name="is_serial",
               new_value=payload.is_serial.value,
               changed_by=payload.changed_by, change_reason=payload.change_reason)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-info/serial-item/{entity_id}",
    response_model=ItemMasterSerialItemResponse,
    summary="Item Master Serial Item — Get Serial flag for a request",
)
def get_serial_item(entity_id: int, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterSerialItem).filter(
        ItemMasterSerialItem.entity_id == entity_id,
        ItemMasterSerialItem.is_active == True,
    ).order_by(ItemMasterSerialItem.created_at.desc()).first()
    if not obj:
        raise HTTPException(404, f"No Serial Item record for entity_id={entity_id}")
    return obj


@router.put(
    "/item-master-info/serial-item/{record_id}",
    response_model=ItemMasterSerialItemResponse,
    summary="Item Master Serial Item — Update Serial flag",
)
def update_serial_item(record_id: int, payload: ItemMasterSerialItemUpdate, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterSerialItem).filter(ItemMasterSerialItem.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Serial Item record not found")
    changes = {}
    if payload.is_serial is not None and payload.is_serial != obj.is_serial:
        changes["is_serial"] = (obj.is_serial.value, payload.is_serial.value)
        obj.is_serial = payload.is_serial
    if payload.notes is not None:
        obj.notes = payload.notes
    if payload.updated_by is not None:
        obj.updated_by = payload.updated_by
    _write_logs_for_update(db, request_id=obj.request_id, entity_id=obj.entity_id,
                           table_name=ItemMasterInfoTableEnum.SERIAL_ITEM, record_id=obj.id,
                           changed_by=payload.updated_by, change_reason=payload.change_reason,
                           changes=changes)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-info/serial-item/{record_id}",
    summary="Item Master Serial Item — Soft-delete",
)
def delete_serial_item(record_id: int, updated_by: Optional[int] = Query(None), db: Session = Depends(get_db)):
    obj = db.query(ItemMasterSerialItem).filter(ItemMasterSerialItem.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Serial Item record not found")
    obj.is_active = False
    obj.updated_by = updated_by
    _write_log(db, request_id=obj.request_id, entity_id=obj.entity_id,
               table_name=ItemMasterInfoTableEnum.SERIAL_ITEM, record_id=obj.id,
               action="DELETE", changed_by=updated_by)
    db.commit()
    return {"message": "Serial Item record deactivated", "id": record_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  7.  GIFT VOUCHER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-info/gift-voucher/",
    response_model=ItemMasterGiftVoucherResponse,
    status_code=201,
    summary="Item Master Gift Voucher — Set Gift Voucher flag",
)
def create_gift_voucher(payload: ItemMasterGiftVoucherCreate, db: Session = Depends(get_db)):
    existing = db.query(ItemMasterGiftVoucher).filter(
        ItemMasterGiftVoucher.entity_id == payload.entity_id,
        ItemMasterGiftVoucher.is_active == True,
    ).first()
    if existing:
        raise HTTPException(400, f"Gift Voucher already set for entity_id={payload.entity_id}. Use PUT to update.")

    obj = ItemMasterGiftVoucher(
        request_id      = payload.request_id,
        entity_id       = payload.entity_id,
        is_gift_voucher = payload.is_gift_voucher,
        notes           = payload.notes,
        created_by      = payload.changed_by,
        is_active       = True,
    )
    db.add(obj)
    db.flush()
    _write_log(db, request_id=payload.request_id, entity_id=payload.entity_id,
               table_name=ItemMasterInfoTableEnum.GIFT_VOUCHER, record_id=obj.id,
               action="CREATE", field_name="is_gift_voucher",
               new_value=payload.is_gift_voucher.value,
               changed_by=payload.changed_by, change_reason=payload.change_reason)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-info/gift-voucher/{entity_id}",
    response_model=ItemMasterGiftVoucherResponse,
    summary="Item Master Gift Voucher — Get flag for a request",
)
def get_gift_voucher(entity_id: int, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterGiftVoucher).filter(
        ItemMasterGiftVoucher.entity_id == entity_id,
        ItemMasterGiftVoucher.is_active == True,
    ).order_by(ItemMasterGiftVoucher.created_at.desc()).first()
    if not obj:
        raise HTTPException(404, f"No Gift Voucher record for entity_id={entity_id}")
    return obj


@router.put(
    "/item-master-info/gift-voucher/{record_id}",
    response_model=ItemMasterGiftVoucherResponse,
    summary="Item Master Gift Voucher — Update flag",
)
def update_gift_voucher(record_id: int, payload: ItemMasterGiftVoucherUpdate, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterGiftVoucher).filter(ItemMasterGiftVoucher.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Gift Voucher record not found")
    changes = {}
    if payload.is_gift_voucher is not None and payload.is_gift_voucher != obj.is_gift_voucher:
        changes["is_gift_voucher"] = (obj.is_gift_voucher.value, payload.is_gift_voucher.value)
        obj.is_gift_voucher = payload.is_gift_voucher
    if payload.notes is not None:
        obj.notes = payload.notes
    if payload.updated_by is not None:
        obj.updated_by = payload.updated_by
    _write_logs_for_update(db, request_id=obj.request_id, entity_id=obj.entity_id,
                           table_name=ItemMasterInfoTableEnum.GIFT_VOUCHER, record_id=obj.id,
                           changed_by=payload.updated_by, change_reason=payload.change_reason,
                           changes=changes)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-info/gift-voucher/{record_id}",
    summary="Item Master Gift Voucher — Soft-delete",
)
def delete_gift_voucher(record_id: int, updated_by: Optional[int] = Query(None), db: Session = Depends(get_db)):
    obj = db.query(ItemMasterGiftVoucher).filter(ItemMasterGiftVoucher.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Gift Voucher record not found")
    obj.is_active = False
    obj.updated_by = updated_by
    _write_log(db, request_id=obj.request_id, entity_id=obj.entity_id,
               table_name=ItemMasterInfoTableEnum.GIFT_VOUCHER, record_id=obj.id,
               action="DELETE", changed_by=updated_by)
    db.commit()
    return {"message": "Gift Voucher record deactivated", "id": record_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  8.  EXTENDED WARRANTY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-info/extended-warranty/",
    response_model=ItemMasterExtendedWarrantyResponse,
    status_code=201,
    summary="Item Master Extended Warranty — Set Extended Warranty flag",
)
def create_extended_warranty(payload: ItemMasterExtendedWarrantyCreate, db: Session = Depends(get_db)):
    existing = db.query(ItemMasterExtendedWarranty).filter(
        ItemMasterExtendedWarranty.entity_id == payload.entity_id,
        ItemMasterExtendedWarranty.is_active == True,
    ).first()
    if existing:
        raise HTTPException(400, f"Extended Warranty already set for entity_id={payload.entity_id}. Use PUT to update.")

    obj = ItemMasterExtendedWarranty(
        request_id            = payload.request_id,
        entity_id             = payload.entity_id,
        has_extended_warranty = payload.has_extended_warranty,
        notes                 = payload.notes,
        created_by            = payload.changed_by,
        is_active             = True,
    )
    db.add(obj)
    db.flush()
    _write_log(db, request_id=payload.request_id, entity_id=payload.entity_id,
               table_name=ItemMasterInfoTableEnum.EXTENDED_WARRANTY, record_id=obj.id,
               action="CREATE", field_name="has_extended_warranty",
               new_value=payload.has_extended_warranty.value,
               changed_by=payload.changed_by, change_reason=payload.change_reason)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-info/extended-warranty/{entity_id}",
    response_model=ItemMasterExtendedWarrantyResponse,
    summary="Item Master Extended Warranty — Get flag for a request",
)
def get_extended_warranty(entity_id: int, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterExtendedWarranty).filter(
        ItemMasterExtendedWarranty.entity_id == entity_id,
        ItemMasterExtendedWarranty.is_active == True,
    ).order_by(ItemMasterExtendedWarranty.created_at.desc()).first()
    if not obj:
        raise HTTPException(404, f"No Extended Warranty record for entity_id={entity_id}")
    return obj


@router.put(
    "/item-master-info/extended-warranty/{record_id}",
    response_model=ItemMasterExtendedWarrantyResponse,
    summary="Item Master Extended Warranty — Update flag",
)
def update_extended_warranty(record_id: int, payload: ItemMasterExtendedWarrantyUpdate, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterExtendedWarranty).filter(ItemMasterExtendedWarranty.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Extended Warranty record not found")
    changes = {}
    if payload.has_extended_warranty is not None and payload.has_extended_warranty != obj.has_extended_warranty:
        changes["has_extended_warranty"] = (obj.has_extended_warranty.value, payload.has_extended_warranty.value)
        obj.has_extended_warranty = payload.has_extended_warranty
    if payload.notes is not None:
        obj.notes = payload.notes
    if payload.updated_by is not None:
        obj.updated_by = payload.updated_by
    _write_logs_for_update(db, request_id=obj.request_id, entity_id=obj.entity_id,
                           table_name=ItemMasterInfoTableEnum.EXTENDED_WARRANTY, record_id=obj.id,
                           changed_by=payload.updated_by, change_reason=payload.change_reason,
                           changes=changes)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-info/extended-warranty/{record_id}",
    summary="Item Master Extended Warranty — Soft-delete",
)
def delete_extended_warranty(record_id: int, updated_by: Optional[int] = Query(None), db: Session = Depends(get_db)):
    obj = db.query(ItemMasterExtendedWarranty).filter(ItemMasterExtendedWarranty.id == record_id).first()
    if not obj:
        raise HTTPException(404, "Extended Warranty record not found")
    obj.is_active = False
    obj.updated_by = updated_by
    _write_log(db, request_id=obj.request_id, entity_id=obj.entity_id,
               table_name=ItemMasterInfoTableEnum.EXTENDED_WARRANTY, record_id=obj.id,
               action="DELETE", changed_by=updated_by)
    db.commit()
    return {"message": "Extended Warranty record deactivated", "id": record_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  BULK UPSERT  —  Save / update all 8 fields at once
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-info/bulk-upsert/",
    response_model=ItemMasterInfoBulkResponse,
    status_code=200,
    summary="Item Master Info — Bulk upsert all fields for one request (8 tables)",
)
def bulk_upsert(payload: ItemMasterInfoBulkUpsert, db: Session = Depends(get_db)):
    """
    Single endpoint to create-or-update all 8 Item Master Info tables for one request.
    If a record already exists for entity_id, it is updated.
    If not, it is created.
    Only fields that are not None in the payload are processed.
    Every change is logged in item_master_info_change_log.
    """
    eid    = payload.entity_id
    rid    = payload.request_id
    by     = payload.performed_by
    reason = payload.change_reason
    tables_updated: list = []
    logs_written   = 0

    def _upsert_yesno(Model, table_enum, flag_field, flag_value):
        nonlocal logs_written
        obj = db.query(Model).filter(
            getattr(Model, 'entity_id') == eid,
            getattr(Model, 'is_active') == True,
        ).first()
        if obj:
            old = getattr(obj, flag_field)
            if old != flag_value:
                setattr(obj, flag_field, flag_value)
                obj.updated_by = by
                _write_log(db, request_id=rid, entity_id=eid,
                           table_name=table_enum, record_id=obj.id,
                           action="UPDATE", field_name=flag_field,
                           old_value=old.value, new_value=flag_value.value,
                           changed_by=by, change_reason=reason)
                logs_written += 1
                tables_updated.append(table_enum.value)
        else:
            obj = Model(request_id=rid, entity_id=eid, notes=payload.notes,
                        created_by=by, is_active=True)
            setattr(obj, flag_field, flag_value)
            db.add(obj)
            db.flush()
            _write_log(db, request_id=rid, entity_id=eid,
                       table_name=table_enum, record_id=obj.id,
                       action="CREATE", field_name=flag_field,
                       new_value=flag_value.value, changed_by=by, change_reason=reason)
            logs_written += 1
            tables_updated.append(table_enum.value)

    # ── 1. UOM ───────────────────────────────────────────────────────────────
    if payload.uom_code is not None:
        obj = db.query(ItemMasterUOM).filter(
            ItemMasterUOM.entity_id == eid, ItemMasterUOM.is_active == True
        ).first()
        if obj:
            changes = {}
            if payload.uom_code != obj.uom_code:
                changes["uom_code"] = (obj.uom_code, payload.uom_code)
                obj.uom_code = payload.uom_code.strip().upper()
            if payload.uom_name and payload.uom_name != obj.uom_name:
                changes["uom_name"] = (obj.uom_name, payload.uom_name)
                obj.uom_name = payload.uom_name
            obj.updated_by = by
            _write_logs_for_update(db, request_id=rid, entity_id=eid,
                                   table_name=ItemMasterInfoTableEnum.UOM, record_id=obj.id,
                                   changed_by=by, change_reason=reason, changes=changes)
            logs_written += len(changes)
        else:
            obj = ItemMasterUOM(request_id=rid, entity_id=eid,
                                uom_code=payload.uom_code.strip().upper(),
                                uom_name=payload.uom_name, notes=payload.notes,
                                created_by=by, is_active=True)
            db.add(obj)
            db.flush()
            _write_log(db, request_id=rid, entity_id=eid,
                       table_name=ItemMasterInfoTableEnum.UOM, record_id=obj.id,
                       action="CREATE", field_name="uom_code",
                       new_value=payload.uom_code, changed_by=by, change_reason=reason)
            logs_written += 1
        tables_updated.append("UOM")

    # ── 2. MAX LOOSE ─────────────────────────────────────────────────────────
    if payload.max_loose is not None:
        obj = db.query(ItemMasterMaxLoose).filter(
            ItemMasterMaxLoose.entity_id == eid, ItemMasterMaxLoose.is_active == True
        ).first()
        if obj:
            changes = {}
            if payload.max_loose != obj.max_loose:
                changes["max_loose"] = (obj.max_loose, payload.max_loose)
                obj.max_loose = payload.max_loose
            if payload.max_loose_uom and payload.max_loose_uom != obj.uom_code:
                changes["uom_code"] = (obj.uom_code, payload.max_loose_uom)
                obj.uom_code = payload.max_loose_uom
            obj.updated_by = by
            _write_logs_for_update(db, request_id=rid, entity_id=eid,
                                   table_name=ItemMasterInfoTableEnum.MAX_LOOSE, record_id=obj.id,
                                   changed_by=by, change_reason=reason, changes=changes)
            logs_written += len(changes)
        else:
            obj = ItemMasterMaxLoose(request_id=rid, entity_id=eid,
                                     max_loose=payload.max_loose,
                                     uom_code=payload.max_loose_uom,
                                     notes=payload.notes, created_by=by, is_active=True)
            db.add(obj)
            db.flush()
            _write_log(db, request_id=rid, entity_id=eid,
                       table_name=ItemMasterInfoTableEnum.MAX_LOOSE, record_id=obj.id,
                       action="CREATE", field_name="max_loose",
                       new_value=str(payload.max_loose), changed_by=by, change_reason=reason)
            logs_written += 1
        tables_updated.append("MAX_LOOSE")

    # ── 3. STOCK  (independent table) ────────────────────────────────────────
    if payload.is_stock is not None:
        _upsert_yesno(ItemMasterStock, ItemMasterInfoTableEnum.STOCK, "is_stock", payload.is_stock)

    # ── 4. SERVICE  (independent table) ──────────────────────────────────────
    if payload.is_service is not None:
        _upsert_yesno(ItemMasterService, ItemMasterInfoTableEnum.SERVICE, "is_service", payload.is_service)

    # ── 5. BATCH ITEM ────────────────────────────────────────────────────────
    if payload.is_batch is not None:
        _upsert_yesno(ItemMasterBatchItem, ItemMasterInfoTableEnum.BATCH_ITEM, "is_batch", payload.is_batch)

    # ── 6. SERIAL ITEM ───────────────────────────────────────────────────────
    if payload.is_serial is not None:
        _upsert_yesno(ItemMasterSerialItem, ItemMasterInfoTableEnum.SERIAL_ITEM, "is_serial", payload.is_serial)

    # ── 7. GIFT VOUCHER ──────────────────────────────────────────────────────
    if payload.is_gift_voucher is not None:
        _upsert_yesno(ItemMasterGiftVoucher, ItemMasterInfoTableEnum.GIFT_VOUCHER, "is_gift_voucher", payload.is_gift_voucher)

    # ── 8. EXTENDED WARRANTY ─────────────────────────────────────────────────
    if payload.has_extended_warranty is not None:
        _upsert_yesno(ItemMasterExtendedWarranty, ItemMasterInfoTableEnum.EXTENDED_WARRANTY,
                      "has_extended_warranty", payload.has_extended_warranty)

    db.commit()
    summary = _build_summary(db, eid, rid)
    return ItemMasterInfoBulkResponse(
        entity_id=eid, request_id=rid,
        tables_updated=list(set(tables_updated)),
        change_logs=logs_written,
        summary=summary,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  SUMMARY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

def _build_summary(db: Session, entity_id: int, request_id: Optional[str] = None) -> ItemMasterInfoSummary:
    def _get(Model):
        return db.query(Model).filter(
            getattr(Model, 'entity_id') == entity_id,
            getattr(Model, 'is_active') == True,
        ).order_by(getattr(Model, 'created_at').desc()).first()

    recent = (
        db.query(ItemMasterInfoChangeLog)
        .filter(ItemMasterInfoChangeLog.entity_id == entity_id)
        .order_by(ItemMasterInfoChangeLog.changed_at.desc())
        .limit(20).all()
    )
    return ItemMasterInfoSummary(
        entity_id         = entity_id,
        request_id        = request_id,
        uom               = _get(ItemMasterUOM),
        max_loose         = _get(ItemMasterMaxLoose),
        stock             = _get(ItemMasterStock),       # ← was stock_service
        service           = _get(ItemMasterService),     # ← new
        batch_item        = _get(ItemMasterBatchItem),
        serial_item       = _get(ItemMasterSerialItem),
        gift_voucher      = _get(ItemMasterGiftVoucher),
        extended_warranty = _get(ItemMasterExtendedWarranty),
        recent_changes    = recent,
    )


@router.get(
    "/item-master-info/summary/{entity_id}",
    response_model=ItemMasterInfoSummary,
    summary="Item Master Info — Full summary for one request (all 8 tables)",
)
def get_summary(entity_id: int, db: Session = Depends(get_db)):
    return _build_summary(db, entity_id)


@router.get(
    "/item-master-info/summary/by-request/{request_id}",
    response_model=ItemMasterInfoSummary,
    summary="Item Master Info — Full summary by ICR request_id",
)
def get_summary_by_request(request_id: str, db: Session = Depends(get_db)):
    obj = db.query(ItemMasterUOM).filter(ItemMasterUOM.request_id == request_id).first()
    if not obj:
        obj = db.query(ItemMasterMaxLoose).filter(ItemMasterMaxLoose.request_id == request_id).first()
    if not obj:
        raise HTTPException(404, f"No Item Master Info found for request_id={request_id}")
    return _build_summary(db, obj.entity_id, request_id)


# ═══════════════════════════════════════════════════════════════════════════════
#  CHANGE LOG / AUDIT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-master-info/history/{entity_id}",
    response_model=List[ChangeLogEntry],
    summary="Item Master Info — Full audit trail for one request",
)
def get_history(
    entity_id:  int,
    table_name: Optional[ItemMasterInfoTableEnum] = Query(None),
    limit:      int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    q = db.query(ItemMasterInfoChangeLog).filter(
        ItemMasterInfoChangeLog.entity_id == entity_id
    )
    if table_name:
        q = q.filter(ItemMasterInfoChangeLog.table_name == table_name)
    return q.order_by(ItemMasterInfoChangeLog.changed_at.desc()).limit(limit).all()


@router.get(
    "/item-master-info/history/by-request/{request_id}",
    response_model=List[ChangeLogEntry],
    summary="Item Master Info — Full audit trail by ICR request_id",
)
def get_history_by_request(
    request_id: str,
    limit:      int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    return (
        db.query(ItemMasterInfoChangeLog)
        .filter(ItemMasterInfoChangeLog.request_id == request_id)
        .order_by(ItemMasterInfoChangeLog.changed_at.desc())
        .limit(limit).all()
    )


@router.get(
    "/item-master-info/history/by-table/{entity_id}/{table_name}",
    response_model=List[ChangeLogEntry],
    summary="Item Master Info — Audit trail filtered by table name",
)
def get_history_by_table(
    entity_id:  int,
    table_name: ItemMasterInfoTableEnum,
    limit:      int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return (
        db.query(ItemMasterInfoChangeLog)
        .filter(
            ItemMasterInfoChangeLog.entity_id  == entity_id,
            ItemMasterInfoChangeLog.table_name == table_name,
        )
        .order_by(ItemMasterInfoChangeLog.changed_at.desc())
        .limit(limit).all()
    )