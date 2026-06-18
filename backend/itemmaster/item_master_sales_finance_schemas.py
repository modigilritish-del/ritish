"""
itemmaster/item_master_sales_finance_schemas.py
─────────────────────────────────────────────────────────────────────────────
Pydantic schemas for Item Master Sales & Finance field tables.

SALES  (3 tables): ItemClass, VedClass, PriceControlCode
FINANCE (6 tables): TaxGroup, MethodOfCosting, BatchCosting,
                    StandardPrice, CostingMethodNo, SerialNoCosting

Pattern per table:
  - XxxCreate   — POST body
  - XxxUpdate   — PUT body (all fields optional)
  - XxxResponse — API response
─────────────────────────────────────────────────────────────────────────────
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED RESPONSE BASE
# ─────────────────────────────────────────────────────────────────────────────

class _SFResponseBase(BaseModel):
    id:         int
    entity_id:  int
    request_id: Optional[str] = None
    item_code:  Optional[str] = None
    is_active:  bool
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ═════════════════════════════════════════════════════════════════════════════
#  SALES — 1.  ITEM CLASS
# ═════════════════════════════════════════════════════════════════════════════

class ItemClassCreate(BaseModel):
    entity_id:  int
    request_id: Optional[str] = None
    item_code:  Optional[str] = None
    item_class: Optional[str] = None   # 'Always' | 'Sometimes' | 'Never'
    created_by: Optional[int] = None


class ItemClassUpdate(BaseModel):
    item_class: Optional[str] = None
    item_code:  Optional[str] = None
    updated_by: Optional[int] = None


class ItemClassResponse(_SFResponseBase):
    item_class: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  SALES — 2.  VED CLASS
# ═════════════════════════════════════════════════════════════════════════════

class VedClassCreate(BaseModel):
    entity_id:  int
    request_id: Optional[str] = None
    item_code:  Optional[str] = None
    ved_class:  Optional[str] = None   # 'Vital' | 'Essential' | 'Desirable'
    created_by: Optional[int] = None


class VedClassUpdate(BaseModel):
    ved_class:  Optional[str] = None
    item_code:  Optional[str] = None
    updated_by: Optional[int] = None


class VedClassResponse(_SFResponseBase):
    ved_class: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  SALES — 3.  PRICE CONTROL CODE
# ═════════════════════════════════════════════════════════════════════════════

class PriceControlCodeCreate(BaseModel):
    entity_id:          int
    request_id:         Optional[str] = None
    item_code:          Optional[str] = None
    price_control_code: Optional[str] = None
    created_by:         Optional[int] = None


class PriceControlCodeUpdate(BaseModel):
    price_control_code: Optional[str] = None
    item_code:          Optional[str] = None
    updated_by:         Optional[int] = None


class PriceControlCodeResponse(_SFResponseBase):
    price_control_code: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 4.  TAX GROUP
# ═════════════════════════════════════════════════════════════════════════════

class TaxGroupCreate(BaseModel):
    entity_id:  int
    request_id: Optional[str] = None
    item_code:  Optional[str] = None
    tax_group:  Optional[str] = None
    created_by: Optional[int] = None


class TaxGroupUpdate(BaseModel):
    tax_group:  Optional[str] = None
    item_code:  Optional[str] = None
    updated_by: Optional[int] = None


class TaxGroupResponse(_SFResponseBase):
    tax_group: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 5.  METHOD OF COSTING
# ═════════════════════════════════════════════════════════════════════════════

class MethodOfCostingCreate(BaseModel):
    entity_id:         int
    request_id:        Optional[str] = None
    item_code:         Optional[str] = None
    method_of_costing: Optional[str] = None
    created_by:        Optional[int] = None


class MethodOfCostingUpdate(BaseModel):
    method_of_costing: Optional[str] = None
    item_code:         Optional[str] = None
    updated_by:        Optional[int] = None


class MethodOfCostingResponse(_SFResponseBase):
    method_of_costing: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 6.  BATCH COSTING  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

class BatchCostingCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None   # FK to yes_no_master.id
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None   # 'yes' or 'no'
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class BatchCostingUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class BatchCostingResponse(_SFResponseBase):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None   # 'yes' or 'no' — tells you what is stored
    label:          Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 7.  STANDARD PRICE  (Numeric)
# ═════════════════════════════════════════════════════════════════════════════

class StandardPriceCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str]     = None
    item_code:      Optional[str]     = None
    standard_price: Optional[Decimal] = None
    created_by:     Optional[int]     = None


class StandardPriceUpdate(BaseModel):
    standard_price: Optional[Decimal] = None
    item_code:      Optional[str]     = None
    updated_by:     Optional[int]     = None


class StandardPriceResponse(_SFResponseBase):
    standard_price: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 8.  COSTING METHOD NO.
# ═════════════════════════════════════════════════════════════════════════════

class CostingMethodNoCreate(BaseModel):
    entity_id:         int
    request_id:        Optional[str] = None
    item_code:         Optional[str] = None
    costing_method_no: Optional[str] = None
    created_by:        Optional[int] = None


class CostingMethodNoUpdate(BaseModel):
    costing_method_no: Optional[str] = None
    item_code:         Optional[str] = None
    updated_by:        Optional[int] = None


class CostingMethodNoResponse(_SFResponseBase):
    costing_method_no: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — 9.  SERIAL NO. COSTING  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

class SerialNoCostingCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None   # FK to yes_no_master.id
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None   # 'yes' or 'no'
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class SerialNoCostingUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class SerialNoCostingResponse(_SFResponseBase):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None   # 'yes' or 'no' — tells you what is stored
    label:          Optional[str] = None