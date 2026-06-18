"""
itemmaster/item_master_warehouse_schemas.py
─────────────────────────────────────────────────────────────────────────────
Pydantic schemas for all 7 Item Master Warehouse field tables.

Pattern per table:
  - XxxCreate   — POST body
  - XxxUpdate   — PUT body (all fields optional)
  - XxxResponse — API response

Numeric fields  : storage_temperature, temperature_tolerance  → Decimal
Yes/No fields   : potency_item, dependency_item, forced_putaway,
                  multi_batch_pallet, item_consider
  → store yes_no_id (FK to yes_no_master.id — tells YES or NO row),
           yes_no_pair_id, label_type ('yes'/'no'), label (snapshot)
─────────────────────────────────────────────────────────────────────────────
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED RESPONSE BASE
# ─────────────────────────────────────────────────────────────────────────────

class _WhResponseBase(BaseModel):
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


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED YES/NO RESPONSE BASE
#  All 4 yes_no columns included — label_type tells you 'yes' or 'no'
# ─────────────────────────────────────────────────────────────────────────────

class _WhYesNoResponseBase(_WhResponseBase):
    yes_no_id:      Optional[int] = None   # FK to yes_no_master.id (yes row or no row)
    yes_no_pair_id: Optional[int] = None   # shared pair id
    label_type:     Optional[str] = None   # 'yes' or 'no'  ← tells you what is stored
    label:          Optional[str] = None   # snapshot e.g. 'YES', 'NO', 'APPLICABLE'


# ═════════════════════════════════════════════════════════════════════════════
#  1.  STORAGE TEMPERATURE  (numeric)
# ═════════════════════════════════════════════════════════════════════════════

class StorageTemperatureCreate(BaseModel):
    entity_id:           int
    request_id:          Optional[str]     = None
    item_code:           Optional[str]     = None
    storage_temperature: Optional[Decimal] = None
    created_by:          Optional[int]     = None


class StorageTemperatureUpdate(BaseModel):
    storage_temperature: Optional[Decimal] = None
    item_code:           Optional[str]     = None
    updated_by:          Optional[int]     = None


class StorageTemperatureResponse(_WhResponseBase):
    storage_temperature: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  2.  TEMPERATURE TOLERANCE  (numeric)
# ═════════════════════════════════════════════════════════════════════════════

class TemperatureToleranceCreate(BaseModel):
    entity_id:             int
    request_id:            Optional[str]     = None
    item_code:             Optional[str]     = None
    temperature_tolerance: Optional[Decimal] = None
    created_by:            Optional[int]     = None


class TemperatureToleranceUpdate(BaseModel):
    temperature_tolerance: Optional[Decimal] = None
    item_code:             Optional[str]     = None
    updated_by:            Optional[int]     = None


class TemperatureToleranceResponse(_WhResponseBase):
    temperature_tolerance: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  3.  POTENCY ITEM  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

class PotencyItemCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None   # 'yes' or 'no'
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class PotencyItemUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class PotencyItemResponse(_WhYesNoResponseBase):
    pass


# ═════════════════════════════════════════════════════════════════════════════
#  4.  DEPENDENCY ITEM  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

class DependencyItemCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class DependencyItemUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class DependencyItemResponse(_WhYesNoResponseBase):
    pass


# ═════════════════════════════════════════════════════════════════════════════
#  5.  FORCED PUTAWAY  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

class ForcedPutawayCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class ForcedPutawayUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class ForcedPutawayResponse(_WhYesNoResponseBase):
    pass


# ═════════════════════════════════════════════════════════════════════════════
#  6.  MULTI-BATCH PALLET  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

class MultiBatchPalletCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class MultiBatchPalletUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class MultiBatchPalletResponse(_WhYesNoResponseBase):
    pass


# ═════════════════════════════════════════════════════════════════════════════
#  7.  ITEM CONSIDER  (yes/no)
# ═════════════════════════════════════════════════════════════════════════════

class ItemConsiderCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class ItemConsiderUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class ItemConsiderResponse(_WhYesNoResponseBase):
    pass