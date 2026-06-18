"""
itemmaster/item_master_inventory_schemas.py
─────────────────────────────────────────────────────────────────────────────
Pydantic schemas for all 12 Item Master Inventory field tables.

Pattern per table:
  - XxxCreate   — POST body
  - XxxUpdate   — PUT body (all fields optional)
  - XxxResponse — API response

YES/NO tables accept yes_no_id (the specific row id from yes_no_master)
  and label_type ('yes'/'no') from the frontend toggle.
─────────────────────────────────────────────────────────────────────────────
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED RESPONSE FIELDS  (used as base for all 12 response schemas)
# ─────────────────────────────────────────────────────────────────────────────

class _InvResponseBase(BaseModel):
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
#  1.  PARENT ITEM
# ═════════════════════════════════════════════════════════════════════════════

class ParentItemCreate(BaseModel):
    entity_id:            int
    request_id:           Optional[str] = None
    item_code:            Optional[str] = None
    parent_item_entity_id: Optional[int] = None
    parent_item_code:     Optional[str] = None
    parent_item_name:     Optional[str] = None
    created_by:           Optional[int] = None


class ParentItemUpdate(BaseModel):
    parent_item_entity_id: Optional[int] = None
    parent_item_code:     Optional[str] = None
    parent_item_name:     Optional[str] = None
    item_code:            Optional[str] = None
    updated_by:           Optional[int] = None


class ParentItemResponse(_InvResponseBase):
    parent_item_entity_id: Optional[int] = None
    parent_item_code:     Optional[str] = None
    parent_item_name:     Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  2.  PACKED ITEM  (YES / NO)
# ═════════════════════════════════════════════════════════════════════════════

class PackedItemCreate(BaseModel):
    entity_id:     int
    request_id:    Optional[str] = None
    item_code:     Optional[str] = None
    yes_no_id:     Optional[int] = None   # yes_no_master.id (yes_id or no_id)
    yes_no_pair_id: Optional[int] = None  # yes_no_master.yes_no_pair_id
    label_type:    Optional[str] = None   # 'yes' or 'no'
    label:         Optional[str] = None   # e.g. 'YES' or 'NO'
    created_by:    Optional[int] = None


class PackedItemUpdate(BaseModel):
    yes_no_id:     Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:    Optional[str] = None
    label:         Optional[str] = None
    item_code:     Optional[str] = None
    updated_by:    Optional[int] = None


class PackedItemResponse(_InvResponseBase):
    yes_no_id:     Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:    Optional[str] = None
    label:         Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  3.  SUPERCEDED  (YES / NO)
# ═════════════════════════════════════════════════════════════════════════════

class SupercededCreate(BaseModel):
    entity_id:     int
    request_id:    Optional[str] = None
    item_code:     Optional[str] = None
    yes_no_id:     Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:    Optional[str] = None
    label:         Optional[str] = None
    created_by:    Optional[int] = None


class SupercededUpdate(BaseModel):
    yes_no_id:     Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:    Optional[str] = None
    label:         Optional[str] = None
    item_code:     Optional[str] = None
    updated_by:    Optional[int] = None


class SupercededResponse(_InvResponseBase):
    yes_no_id:     Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:    Optional[str] = None
    label:         Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  4.  MAXIMUM STOCK QTY
# ═════════════════════════════════════════════════════════════════════════════

class MaxStockCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str]     = None
    item_code:      Optional[str]     = None
    max_stock_qty1: Optional[Decimal] = None
    max_stock_qty2: Optional[Decimal] = None
    created_by:     Optional[int]     = None


class MaxStockUpdate(BaseModel):
    max_stock_qty1: Optional[Decimal] = None
    max_stock_qty2: Optional[Decimal] = None
    item_code:      Optional[str]     = None
    updated_by:     Optional[int]     = None


class MaxStockResponse(_InvResponseBase):
    max_stock_qty1: Optional[Decimal] = None
    max_stock_qty2: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  5.  REORDER QUANTITY
# ═════════════════════════════════════════════════════════════════════════════

class ReorderQuantityCreate(BaseModel):
    entity_id:    int
    request_id:   Optional[str]     = None
    item_code:    Optional[str]     = None
    reorder_qty1: Optional[Decimal] = None
    reorder_qty2: Optional[Decimal] = None
    created_by:   Optional[int]     = None


class ReorderQuantityUpdate(BaseModel):
    reorder_qty1: Optional[Decimal] = None
    reorder_qty2: Optional[Decimal] = None
    item_code:    Optional[str]     = None
    updated_by:   Optional[int]     = None


class ReorderQuantityResponse(_InvResponseBase):
    reorder_qty1: Optional[Decimal] = None
    reorder_qty2: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  6.  HARMONISED CODE
# ═════════════════════════════════════════════════════════════════════════════

class HarmonisedCodeCreate(BaseModel):
    entity_id:       int
    request_id:      Optional[str] = None
    item_code:       Optional[str] = None
    harmonised_code: Optional[str] = None
    created_by:      Optional[int] = None


class HarmonisedCodeUpdate(BaseModel):
    harmonised_code: Optional[str] = None
    item_code:       Optional[str] = None
    updated_by:      Optional[int] = None


class HarmonisedCodeResponse(_InvResponseBase):
    harmonised_code: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  7.  LEAD TIME
# ═════════════════════════════════════════════════════════════════════════════

class LeadTimeCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str]     = None
    item_code:      Optional[str]     = None
    lead_time_days: Optional[Decimal] = None
    created_by:     Optional[int]     = None


class LeadTimeUpdate(BaseModel):
    lead_time_days: Optional[Decimal] = None
    item_code:      Optional[str]     = None
    updated_by:     Optional[int]     = None


class LeadTimeResponse(_InvResponseBase):
    lead_time_days: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  8.  DIMENSION  (YES / NO)
# ═════════════════════════════════════════════════════════════════════════════

class DimensionCreate(BaseModel):
    entity_id:     int
    request_id:    Optional[str] = None
    item_code:     Optional[str] = None
    yes_no_id:     Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:    Optional[str] = None
    label:         Optional[str] = None
    created_by:    Optional[int] = None


class DimensionUpdate(BaseModel):
    yes_no_id:     Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:    Optional[str] = None
    label:         Optional[str] = None
    item_code:     Optional[str] = None
    updated_by:    Optional[int] = None


class DimensionResponse(_InvResponseBase):
    yes_no_id:     Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:    Optional[str] = None
    label:         Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  9.  MINIMUM STOCK QTY
# ═════════════════════════════════════════════════════════════════════════════

class MinimumStockCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str]     = None
    item_code:      Optional[str]     = None
    min_stock_qty1: Optional[Decimal] = None
    min_stock_qty2: Optional[Decimal] = None
    created_by:     Optional[int]     = None


class MinimumStockUpdate(BaseModel):
    min_stock_qty1: Optional[Decimal] = None
    min_stock_qty2: Optional[Decimal] = None
    item_code:      Optional[str]     = None
    updated_by:     Optional[int]     = None


class MinimumStockResponse(_InvResponseBase):
    min_stock_qty1: Optional[Decimal] = None
    min_stock_qty2: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  10. REORDER LEVEL
# ═════════════════════════════════════════════════════════════════════════════

class ReorderLevelCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str]     = None
    item_code:      Optional[str]     = None
    reorder_level1: Optional[Decimal] = None
    reorder_level2: Optional[Decimal] = None
    created_by:     Optional[int]     = None


class ReorderLevelUpdate(BaseModel):
    reorder_level1: Optional[Decimal] = None
    reorder_level2: Optional[Decimal] = None
    item_code:      Optional[str]     = None
    updated_by:     Optional[int]     = None


class ReorderLevelResponse(_InvResponseBase):
    reorder_level1: Optional[Decimal] = None
    reorder_level2: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  11. SAFETY STOCK FACTOR
# ═════════════════════════════════════════════════════════════════════════════

class SafetyStockFactorCreate(BaseModel):
    entity_id:           int
    request_id:          Optional[str]     = None
    item_code:           Optional[str]     = None
    safety_stock_factor: Optional[Decimal] = None
    created_by:          Optional[int]     = None


class SafetyStockFactorUpdate(BaseModel):
    safety_stock_factor: Optional[Decimal] = None
    item_code:           Optional[str]     = None
    updated_by:          Optional[int]     = None


class SafetyStockFactorResponse(_InvResponseBase):
    safety_stock_factor: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  12. UNIVERSAL PRODUCT CODE
# ═════════════════════════════════════════════════════════════════════════════

class UniversalProductCodeCreate(BaseModel):
    entity_id:             int
    request_id:            Optional[str] = None
    item_code:             Optional[str] = None
    universal_product_code: Optional[str] = None
    created_by:            Optional[int] = None


class UniversalProductCodeUpdate(BaseModel):
    universal_product_code: Optional[str] = None
    item_code:             Optional[str] = None
    updated_by:            Optional[int] = None


class UniversalProductCodeResponse(_InvResponseBase):
    universal_product_code: Optional[str] = None