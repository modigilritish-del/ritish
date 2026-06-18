"""
itemmaster/item_master_sales_finance_routes.py
─────────────────────────────────────────────────────────────────────────────
FastAPI router for Item Master Sales & Finance tab — 9 separate field tables.

ENDPOINT MAP
────────────
SALES (prefix: /item-master-sales)
  POST   /item-master-sales/item-class/
  GET    /item-master-sales/item-class/{entity_id}
  PUT    /item-master-sales/item-class/{record_id}
  DELETE /item-master-sales/item-class/{record_id}

  POST   /item-master-sales/ved-class/
  GET    /item-master-sales/ved-class/{entity_id}
  PUT    /item-master-sales/ved-class/{record_id}
  DELETE /item-master-sales/ved-class/{record_id}

  POST   /item-master-sales/price-control-code/
  GET    /item-master-sales/price-control-code/{entity_id}
  PUT    /item-master-sales/price-control-code/{record_id}
  DELETE /item-master-sales/price-control-code/{record_id}

FINANCE (prefix: /item-master-finance)
  POST   /item-master-finance/tax-group/
  GET    /item-master-finance/tax-group/{entity_id}
  PUT    /item-master-finance/tax-group/{record_id}
  DELETE /item-master-finance/tax-group/{record_id}

  POST   /item-master-finance/method-of-costing/
  GET    /item-master-finance/method-of-costing/{entity_id}
  PUT    /item-master-finance/method-of-costing/{record_id}
  DELETE /item-master-finance/method-of-costing/{record_id}

  POST   /item-master-finance/batch-costing/        ← yes_no validated
  GET    /item-master-finance/batch-costing/{entity_id}
  PUT    /item-master-finance/batch-costing/{record_id}
  DELETE /item-master-finance/batch-costing/{record_id}

  POST   /item-master-finance/standard-price/
  GET    /item-master-finance/standard-price/{entity_id}
  PUT    /item-master-finance/standard-price/{record_id}
  DELETE /item-master-finance/standard-price/{record_id}

  POST   /item-master-finance/costing-method-no/
  GET    /item-master-finance/costing-method-no/{entity_id}
  PUT    /item-master-finance/costing-method-no/{record_id}
  DELETE /item-master-finance/costing-method-no/{record_id}

  POST   /item-master-finance/serial-no-costing/    ← yes_no validated
  GET    /item-master-finance/serial-no-costing/{entity_id}
  PUT    /item-master-finance/serial-no-costing/{record_id}
  DELETE /item-master-finance/serial-no-costing/{record_id}

Yes/No fields (batch-costing, serial-no-costing):
  - yes_no_id validated against yes_no_master on every POST/PUT
  - label_type and label auto-populated from yes_no_master (DB is source of truth)
  - GET response includes full yes_no_master row via joinedload
─────────────────────────────────────────────────────────────────────────────
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db

from common.yes_no_master_models import YesNoMaster

from itemmaster.item_master_sales_finance_models import (
    ItemMasterSalesItemClass,
    ItemMasterSalesVedClass,
    ItemMasterSalesPriceControlCode,
    ItemMasterFinanceTaxGroup,
    ItemMasterFinanceMethodOfCosting,
    ItemMasterFinanceBatchCosting,
    ItemMasterFinanceStandardPrice,
    ItemMasterFinanceCostingMethodNo,
    ItemMasterFinanceSerialNoCosting,
)
from itemmaster.item_master_sales_finance_schemas import (
    ItemClassCreate,        ItemClassUpdate,        ItemClassResponse,
    VedClassCreate,         VedClassUpdate,         VedClassResponse,
    PriceControlCodeCreate, PriceControlCodeUpdate, PriceControlCodeResponse,
    TaxGroupCreate,         TaxGroupUpdate,         TaxGroupResponse,
    MethodOfCostingCreate,  MethodOfCostingUpdate,  MethodOfCostingResponse,
    BatchCostingCreate,     BatchCostingUpdate,     BatchCostingResponse,
    StandardPriceCreate,    StandardPriceUpdate,    StandardPriceResponse,
    CostingMethodNoCreate,  CostingMethodNoUpdate,  CostingMethodNoResponse,
    SerialNoCostingCreate,  SerialNoCostingUpdate,  SerialNoCostingResponse,
)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  INTERNAL HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _get_active(db: Session, Model, entity_id: int):
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
#  YES/NO HELPER — validate yes_no_id and return authoritative values from DB
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


# ─────────────────────────────────────────────────────────────────────────────
#  YES/NO GET HELPERS — joinedload yes_no relationship for full response
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
#  SALES — 1.  ITEM CLASS
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-sales/item-class/",
    response_model=ItemClassResponse,
    status_code=201,
    summary="Sales — Save Item Class",
)
def create_item_class(payload: ItemClassCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterSalesItemClass, payload.entity_id, "Item Class")
    obj = ItemMasterSalesItemClass(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-sales/item-class/{entity_id}",
    response_model=ItemClassResponse,
    summary="Sales — Get Item Class",
)
def get_item_class(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterSalesItemClass, entity_id, "Item Class")


@router.put(
    "/item-master-sales/item-class/{record_id}",
    response_model=ItemClassResponse,
    summary="Sales — Update Item Class",
)
def update_item_class(record_id: int, payload: ItemClassUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterSalesItemClass, record_id, "Item Class")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-sales/item-class/{record_id}",
    summary="Sales — Soft-delete Item Class",
)
def delete_item_class(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterSalesItemClass, record_id, "Item Class")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Item Class record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  SALES — 2.  VED CLASS
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-sales/ved-class/",
    response_model=VedClassResponse,
    status_code=201,
    summary="Sales — Save VED Class",
)
def create_ved_class(payload: VedClassCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterSalesVedClass, payload.entity_id, "VED Class")
    obj = ItemMasterSalesVedClass(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-sales/ved-class/{entity_id}",
    response_model=VedClassResponse,
    summary="Sales — Get VED Class",
)
def get_ved_class(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterSalesVedClass, entity_id, "VED Class")


@router.put(
    "/item-master-sales/ved-class/{record_id}",
    response_model=VedClassResponse,
    summary="Sales — Update VED Class",
)
def update_ved_class(record_id: int, payload: VedClassUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterSalesVedClass, record_id, "VED Class")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-sales/ved-class/{record_id}",
    summary="Sales — Soft-delete VED Class",
)
def delete_ved_class(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterSalesVedClass, record_id, "VED Class")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "VED Class record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  SALES — 3.  PRICE CONTROL CODE
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-sales/price-control-code/",
    response_model=PriceControlCodeResponse,
    status_code=201,
    summary="Sales — Save Price Control Code",
)
def create_price_control_code(payload: PriceControlCodeCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterSalesPriceControlCode, payload.entity_id, "Price Control Code")
    obj = ItemMasterSalesPriceControlCode(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-sales/price-control-code/{entity_id}",
    response_model=PriceControlCodeResponse,
    summary="Sales — Get Price Control Code",
)
def get_price_control_code(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterSalesPriceControlCode, entity_id, "Price Control Code")


@router.put(
    "/item-master-sales/price-control-code/{record_id}",
    response_model=PriceControlCodeResponse,
    summary="Sales — Update Price Control Code",
)
def update_price_control_code(record_id: int, payload: PriceControlCodeUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterSalesPriceControlCode, record_id, "Price Control Code")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-sales/price-control-code/{record_id}",
    summary="Sales — Soft-delete Price Control Code",
)
def delete_price_control_code(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterSalesPriceControlCode, record_id, "Price Control Code")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Price Control Code record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 4.  TAX GROUP
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-finance/tax-group/",
    response_model=TaxGroupResponse,
    status_code=201,
    summary="Finance — Save Tax Group",
)
def create_tax_group(payload: TaxGroupCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterFinanceTaxGroup, payload.entity_id, "Tax Group")
    obj = ItemMasterFinanceTaxGroup(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-finance/tax-group/{entity_id}",
    response_model=TaxGroupResponse,
    summary="Finance — Get Tax Group",
)
def get_tax_group(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterFinanceTaxGroup, entity_id, "Tax Group")


@router.put(
    "/item-master-finance/tax-group/{record_id}",
    response_model=TaxGroupResponse,
    summary="Finance — Update Tax Group",
)
def update_tax_group(record_id: int, payload: TaxGroupUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterFinanceTaxGroup, record_id, "Tax Group")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-finance/tax-group/{record_id}",
    summary="Finance — Soft-delete Tax Group",
)
def delete_tax_group(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterFinanceTaxGroup, record_id, "Tax Group")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Tax Group record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 5.  METHOD OF COSTING
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-finance/method-of-costing/",
    response_model=MethodOfCostingResponse,
    status_code=201,
    summary="Finance — Save Method of Costing",
)
def create_method_of_costing(payload: MethodOfCostingCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterFinanceMethodOfCosting, payload.entity_id, "Method of Costing")
    obj = ItemMasterFinanceMethodOfCosting(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-finance/method-of-costing/{entity_id}",
    response_model=MethodOfCostingResponse,
    summary="Finance — Get Method of Costing",
)
def get_method_of_costing(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterFinanceMethodOfCosting, entity_id, "Method of Costing")


@router.put(
    "/item-master-finance/method-of-costing/{record_id}",
    response_model=MethodOfCostingResponse,
    summary="Finance — Update Method of Costing",
)
def update_method_of_costing(record_id: int, payload: MethodOfCostingUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterFinanceMethodOfCosting, record_id, "Method of Costing")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-finance/method-of-costing/{record_id}",
    summary="Finance — Soft-delete Method of Costing",
)
def delete_method_of_costing(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterFinanceMethodOfCosting, record_id, "Method of Costing")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Method of Costing record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 6.  BATCH COSTING  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-finance/batch-costing/",
    response_model=BatchCostingResponse,
    status_code=201,
    summary="Finance — Save Batch Costing",
)
def create_batch_costing(payload: BatchCostingCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterFinanceBatchCosting, payload.entity_id, "Batch Costing")
    yn = _resolve_yes_no(db, payload.yes_no_id, "Batch Costing")
    data = payload.model_dump()
    data.update(yn)
    obj = ItemMasterFinanceBatchCosting(**data)
    db.add(obj)
    db.commit()
    return _require_active_yn(db, ItemMasterFinanceBatchCosting, payload.entity_id, "Batch Costing")


@router.get(
    "/item-master-finance/batch-costing/{entity_id}",
    response_model=BatchCostingResponse,
    summary="Finance — Get Batch Costing",
)
def get_batch_costing(entity_id: int, db: Session = Depends(get_db)):
    return _require_active_yn(db, ItemMasterFinanceBatchCosting, entity_id, "Batch Costing")


@router.put(
    "/item-master-finance/batch-costing/{record_id}",
    response_model=BatchCostingResponse,
    summary="Finance — Update Batch Costing",
)
def update_batch_costing(record_id: int, payload: BatchCostingUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterFinanceBatchCosting, record_id, "Batch Costing")
    data = payload.model_dump(exclude_unset=True)
    if "yes_no_id" in data:
        yn = _resolve_yes_no(db, data.get("yes_no_id"), "Batch Costing")
        data.update(yn)
    for field, value in data.items():
        setattr(obj, field, value)
    db.commit()
    return _require_by_id_yn(db, ItemMasterFinanceBatchCosting, record_id, "Batch Costing")


@router.delete(
    "/item-master-finance/batch-costing/{record_id}",
    summary="Finance — Soft-delete Batch Costing",
)
def delete_batch_costing(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterFinanceBatchCosting, record_id, "Batch Costing")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Batch Costing record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 7.  STANDARD PRICE
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-finance/standard-price/",
    response_model=StandardPriceResponse,
    status_code=201,
    summary="Finance — Save Standard Price",
)
def create_standard_price(payload: StandardPriceCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterFinanceStandardPrice, payload.entity_id, "Standard Price")
    obj = ItemMasterFinanceStandardPrice(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-finance/standard-price/{entity_id}",
    response_model=StandardPriceResponse,
    summary="Finance — Get Standard Price",
)
def get_standard_price(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterFinanceStandardPrice, entity_id, "Standard Price")


@router.put(
    "/item-master-finance/standard-price/{record_id}",
    response_model=StandardPriceResponse,
    summary="Finance — Update Standard Price",
)
def update_standard_price(record_id: int, payload: StandardPriceUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterFinanceStandardPrice, record_id, "Standard Price")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-finance/standard-price/{record_id}",
    summary="Finance — Soft-delete Standard Price",
)
def delete_standard_price(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterFinanceStandardPrice, record_id, "Standard Price")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Standard Price record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 8.  COSTING METHOD NO.
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-finance/costing-method-no/",
    response_model=CostingMethodNoResponse,
    status_code=201,
    summary="Finance — Save Costing Method No.",
)
def create_costing_method_no(payload: CostingMethodNoCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterFinanceCostingMethodNo, payload.entity_id, "Costing Method No.")
    obj = ItemMasterFinanceCostingMethodNo(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/item-master-finance/costing-method-no/{entity_id}",
    response_model=CostingMethodNoResponse,
    summary="Finance — Get Costing Method No.",
)
def get_costing_method_no(entity_id: int, db: Session = Depends(get_db)):
    return _require_active(db, ItemMasterFinanceCostingMethodNo, entity_id, "Costing Method No.")


@router.put(
    "/item-master-finance/costing-method-no/{record_id}",
    response_model=CostingMethodNoResponse,
    summary="Finance — Update Costing Method No.",
)
def update_costing_method_no(record_id: int, payload: CostingMethodNoUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterFinanceCostingMethodNo, record_id, "Costing Method No.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/item-master-finance/costing-method-no/{record_id}",
    summary="Finance — Soft-delete Costing Method No.",
)
def delete_costing_method_no(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterFinanceCostingMethodNo, record_id, "Costing Method No.")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Costing Method No. record deactivated", "id": record_id}


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 9.  SERIAL NO. COSTING  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master-finance/serial-no-costing/",
    response_model=SerialNoCostingResponse,
    status_code=201,
    summary="Finance — Save Serial No. Costing",
)
def create_serial_no_costing(payload: SerialNoCostingCreate, db: Session = Depends(get_db)):
    _guard_duplicate(db, ItemMasterFinanceSerialNoCosting, payload.entity_id, "Serial No. Costing")
    yn = _resolve_yes_no(db, payload.yes_no_id, "Serial No. Costing")
    data = payload.model_dump()
    data.update(yn)
    obj = ItemMasterFinanceSerialNoCosting(**data)
    db.add(obj)
    db.commit()
    return _require_active_yn(db, ItemMasterFinanceSerialNoCosting, payload.entity_id, "Serial No. Costing")


@router.get(
    "/item-master-finance/serial-no-costing/{entity_id}",
    response_model=SerialNoCostingResponse,
    summary="Finance — Get Serial No. Costing",
)
def get_serial_no_costing(entity_id: int, db: Session = Depends(get_db)):
    return _require_active_yn(db, ItemMasterFinanceSerialNoCosting, entity_id, "Serial No. Costing")


@router.put(
    "/item-master-finance/serial-no-costing/{record_id}",
    response_model=SerialNoCostingResponse,
    summary="Finance — Update Serial No. Costing",
)
def update_serial_no_costing(record_id: int, payload: SerialNoCostingUpdate, db: Session = Depends(get_db)):
    obj = _require_by_id(db, ItemMasterFinanceSerialNoCosting, record_id, "Serial No. Costing")
    data = payload.model_dump(exclude_unset=True)
    if "yes_no_id" in data:
        yn = _resolve_yes_no(db, data.get("yes_no_id"), "Serial No. Costing")
        data.update(yn)
    for field, value in data.items():
        setattr(obj, field, value)
    db.commit()
    return _require_by_id_yn(db, ItemMasterFinanceSerialNoCosting, record_id, "Serial No. Costing")


@router.delete(
    "/item-master-finance/serial-no-costing/{record_id}",
    summary="Finance — Soft-delete Serial No. Costing",
)
def delete_serial_no_costing(
    record_id:  int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = _require_by_id(db, ItemMasterFinanceSerialNoCosting, record_id, "Serial No. Costing")
    obj.is_active  = False
    obj.updated_by = updated_by
    db.commit()
    return {"message": "Serial No. Costing record deactivated", "id": record_id}