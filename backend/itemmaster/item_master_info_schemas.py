"""itemmaster/item_master_info_schemas.py
   Pydantic schemas for Item Master Info — per field separate tables
   ─────────────────────────────────────────────────────────────────────────────
   CHANGE: item_master_stock_service split into:
     • item_master_stock   → ItemMasterStock*   (is_stock YES/NO)
     • item_master_service → ItemMasterService* (is_service YES/NO)
   Same pattern as batch/serial.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from itemmaster.item_master_info_models import YesNoEnum, ItemMasterInfoTableEnum


# ─────────────────────────────────────────────────────────────────────────────
#  Shared brief schemas
# ─────────────────────────────────────────────────────────────────────────────

class UserBrief(BaseModel):
    id:        int
    full_name: Optional[str] = None
    username:  Optional[str] = None
    class Config:
        from_attributes = True


class ChangeLogEntry(BaseModel):
    """Single change log row — returned in history endpoints."""
    id:                    int
    request_id:            Optional[str]  = None
    entity_id:             int
    table_name:            ItemMasterInfoTableEnum
    record_id:             int
    action:                str            # CREATE | UPDATE | DELETE
    field_name:            Optional[str]  = None
    old_value:             Optional[str]  = None
    new_value:             Optional[str]  = None
    changed_by:            Optional[int]  = None
    changer_name_snapshot: Optional[str]  = None
    changer_role_snapshot: Optional[str]  = None
    change_reason:         Optional[str]  = None
    changed_at:            datetime
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  Shared base for all create payloads
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInfoBase(BaseModel):
    request_id:    Optional[str] = None
    entity_id:     int
    notes:         Optional[str] = None
    changed_by:    Optional[int] = None
    change_reason: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
#  1.  item_master_uom
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterUOMCreate(ItemMasterInfoBase):
    uom_code: str = Field(..., max_length=30, description="UOM code e.g. KG, PCS, LTR")
    uom_name: Optional[str] = Field(None, max_length=100)

class ItemMasterUOMUpdate(BaseModel):
    uom_code:     Optional[str] = None
    uom_name:     Optional[str] = None
    notes:        Optional[str] = None
    updated_by:   Optional[int] = None
    change_reason:Optional[str] = None

class ItemMasterUOMResponse(BaseModel):
    id:         int
    request_id: Optional[str] = None
    entity_id:  int
    uom_code:   str
    uom_name:   Optional[str] = None
    notes:      Optional[str] = None
    is_active:  bool
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  2.  item_master_max_loose
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterMaxLooseCreate(ItemMasterInfoBase):
    max_loose: Decimal = Field(..., description="Max Loose numeric value e.g. 12.5")
    uom_code:  Optional[str] = Field(None, max_length=30)

class ItemMasterMaxLooseUpdate(BaseModel):
    max_loose:    Optional[Decimal] = None
    uom_code:     Optional[str]     = None
    notes:        Optional[str]     = None
    updated_by:   Optional[int]     = None
    change_reason:Optional[str]     = None

class ItemMasterMaxLooseResponse(BaseModel):
    id:         int
    request_id: Optional[str]  = None
    entity_id:  int
    max_loose:  Decimal
    uom_code:   Optional[str]  = None
    notes:      Optional[str]  = None
    is_active:  bool
    created_by: Optional[int]  = None
    updated_by: Optional[int]  = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  3.  item_master_stock  —  Stock YES/NO  (split from stock_service)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterStockCreate(ItemMasterInfoBase):
    is_stock: YesNoEnum = YesNoEnum.NO

class ItemMasterStockUpdate(BaseModel):
    is_stock:     Optional[YesNoEnum] = None
    notes:        Optional[str]       = None
    updated_by:   Optional[int]       = None
    change_reason:Optional[str]       = None

class ItemMasterStockResponse(BaseModel):
    id:         int
    request_id: Optional[str]  = None
    entity_id:  int
    is_stock:   YesNoEnum
    notes:      Optional[str]  = None
    is_active:  bool
    created_by: Optional[int]  = None
    updated_by: Optional[int]  = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  4.  item_master_service  —  Service YES/NO  (split from stock_service)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterServiceCreate(ItemMasterInfoBase):
    is_service: YesNoEnum = YesNoEnum.NO

class ItemMasterServiceUpdate(BaseModel):
    is_service:   Optional[YesNoEnum] = None
    notes:        Optional[str]       = None
    updated_by:   Optional[int]       = None
    change_reason:Optional[str]       = None

class ItemMasterServiceResponse(BaseModel):
    id:         int
    request_id: Optional[str]  = None
    entity_id:  int
    is_service: YesNoEnum
    notes:      Optional[str]  = None
    is_active:  bool
    created_by: Optional[int]  = None
    updated_by: Optional[int]  = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  5.  item_master_batch_item
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterBatchItemCreate(ItemMasterInfoBase):
    is_batch: YesNoEnum = YesNoEnum.NO

class ItemMasterBatchItemUpdate(BaseModel):
    is_batch:     Optional[YesNoEnum] = None
    notes:        Optional[str]       = None
    updated_by:   Optional[int]       = None
    change_reason:Optional[str]       = None

class ItemMasterBatchItemResponse(BaseModel):
    id:         int
    request_id: Optional[str]  = None
    entity_id:  int
    is_batch:   YesNoEnum
    notes:      Optional[str]  = None
    is_active:  bool
    created_by: Optional[int]  = None
    updated_by: Optional[int]  = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  6.  item_master_serial_item
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterSerialItemCreate(ItemMasterInfoBase):
    is_serial: YesNoEnum = YesNoEnum.NO

class ItemMasterSerialItemUpdate(BaseModel):
    is_serial:    Optional[YesNoEnum] = None
    notes:        Optional[str]       = None
    updated_by:   Optional[int]       = None
    change_reason:Optional[str]       = None

class ItemMasterSerialItemResponse(BaseModel):
    id:         int
    request_id: Optional[str]  = None
    entity_id:  int
    is_serial:  YesNoEnum
    notes:      Optional[str]  = None
    is_active:  bool
    created_by: Optional[int]  = None
    updated_by: Optional[int]  = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  7.  item_master_gift_voucher
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterGiftVoucherCreate(ItemMasterInfoBase):
    is_gift_voucher: YesNoEnum = YesNoEnum.NO

class ItemMasterGiftVoucherUpdate(BaseModel):
    is_gift_voucher: Optional[YesNoEnum] = None
    notes:           Optional[str]       = None
    updated_by:      Optional[int]       = None
    change_reason:   Optional[str]       = None

class ItemMasterGiftVoucherResponse(BaseModel):
    id:              int
    request_id:      Optional[str]  = None
    entity_id:       int
    is_gift_voucher: YesNoEnum
    notes:           Optional[str]  = None
    is_active:       bool
    created_by:      Optional[int]  = None
    updated_by:      Optional[int]  = None
    created_at:      datetime
    updated_at:      datetime
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  8.  item_master_extended_warranty
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterExtendedWarrantyCreate(ItemMasterInfoBase):
    has_extended_warranty: YesNoEnum = YesNoEnum.NO

class ItemMasterExtendedWarrantyUpdate(BaseModel):
    has_extended_warranty: Optional[YesNoEnum] = None
    notes:                 Optional[str]        = None
    updated_by:            Optional[int]        = None
    change_reason:         Optional[str]        = None

class ItemMasterExtendedWarrantyResponse(BaseModel):
    id:                    int
    request_id:            Optional[str]   = None
    entity_id:             int
    has_extended_warranty: YesNoEnum
    notes:                 Optional[str]   = None
    is_active:             bool
    created_by:            Optional[int]   = None
    updated_by:            Optional[int]   = None
    created_at:            datetime
    updated_at:            datetime
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  UNIFIED SUMMARY  —  All fields for one request in one response
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInfoSummary(BaseModel):
    entity_id:          int
    request_id:         Optional[str]                              = None

    uom:                Optional[ItemMasterUOMResponse]            = None
    max_loose:          Optional[ItemMasterMaxLooseResponse]       = None
    stock:              Optional[ItemMasterStockResponse]          = None   # ← was stock_service
    service:            Optional[ItemMasterServiceResponse]        = None   # ← new
    batch_item:         Optional[ItemMasterBatchItemResponse]      = None
    serial_item:        Optional[ItemMasterSerialItemResponse]     = None
    gift_voucher:       Optional[ItemMasterGiftVoucherResponse]    = None
    extended_warranty:  Optional[ItemMasterExtendedWarrantyResponse] = None

    recent_changes:     List[ChangeLogEntry] = []

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  BULK UPSERT  —  Save all 8 tables in one API call
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInfoBulkUpsert(BaseModel):
    """
    Single payload to create/update all 8 Item Master Info tables at once.
    MDM approver fills the mapping page and hits Save — one call saves all.
    Null fields are skipped.
    """
    entity_id:     int
    request_id:    Optional[str] = None
    performed_by:  Optional[int] = None
    change_reason: Optional[str] = None
    notes:         Optional[str] = None

    # UOM
    uom_code:              Optional[str]       = None
    uom_name:              Optional[str]       = None
    # Max Loose
    max_loose:             Optional[Decimal]   = None
    max_loose_uom:         Optional[str]       = None
    # Stock (separate table)
    is_stock:              Optional[YesNoEnum] = None
    # Service (separate table)
    is_service:            Optional[YesNoEnum] = None
    # Batch
    is_batch:              Optional[YesNoEnum] = None
    # Serial
    is_serial:             Optional[YesNoEnum] = None
    # Gift Voucher
    is_gift_voucher:       Optional[YesNoEnum] = None
    # Extended Warranty
    has_extended_warranty: Optional[YesNoEnum] = None


class ItemMasterInfoBulkResponse(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    tables_updated: List[str]     = []
    change_logs:    int           = 0
    summary:        Optional[ItemMasterInfoSummary] = None