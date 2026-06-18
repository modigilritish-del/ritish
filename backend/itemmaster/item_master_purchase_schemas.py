"""
itemmaster/item_master_purchase_schemas.py
─────────────────────────────────────────────────────────────────────────────
Pydantic schemas for all 6 Item Master Purchase field tables.

Pattern per table:
  - XxxCreate   — POST body
  - XxxUpdate   — PUT body (all fields optional)
  - XxxResponse — API response

LOV fields accept the selected value string (code - description snapshot).
Numeric fields accept Decimal values for percentage storage.
─────────────────────────────────────────────────────────────────────────────
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED RESPONSE FIELDS  (used as base for all 6 response schemas)
# ─────────────────────────────────────────────────────────────────────────────

class _PurResponseBase(BaseModel):
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
#  1.  VENDOR ANALYSIS  (LOV)
# ═════════════════════════════════════════════════════════════════════════════

class VendorAnalysisCreate(BaseModel):
    entity_id:       int
    request_id:      Optional[str] = None
    item_code:       Optional[str] = None
    vendor_analysis: Optional[str] = None   # e.g. 'VA001 - Vendor Analysis Type A'
    created_by:      Optional[int] = None


class VendorAnalysisUpdate(BaseModel):
    vendor_analysis: Optional[str] = None
    item_code:       Optional[str] = None
    updated_by:      Optional[int] = None


class VendorAnalysisResponse(_PurResponseBase):
    vendor_analysis: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  2.  ANALYSIS PROPERTY CLASS  (LOV)
# ═════════════════════════════════════════════════════════════════════════════

class AnalysisPropertyClassCreate(BaseModel):
    entity_id:               int
    request_id:              Optional[str] = None
    item_code:               Optional[str] = None
    analysis_property_class: Optional[str] = None   # e.g. 'APC001 - Property Class A'
    created_by:              Optional[int] = None


class AnalysisPropertyClassUpdate(BaseModel):
    analysis_property_class: Optional[str] = None
    item_code:               Optional[str] = None
    updated_by:              Optional[int] = None


class AnalysisPropertyClassResponse(_PurResponseBase):
    analysis_property_class: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  3.  POSITIVE TOLERANCE %
# ═════════════════════════════════════════════════════════════════════════════

class PositiveToleranceCreate(BaseModel):
    entity_id:                  int
    request_id:                 Optional[str]     = None
    item_code:                  Optional[str]     = None
    positive_tolerance_percent: Optional[Decimal] = None
    created_by:                 Optional[int]     = None


class PositiveToleranceUpdate(BaseModel):
    positive_tolerance_percent: Optional[Decimal] = None
    item_code:                  Optional[str]     = None
    updated_by:                 Optional[int]     = None


class PositiveToleranceResponse(_PurResponseBase):
    positive_tolerance_percent: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  4.  NEGATIVE TOLERANCE %
# ═════════════════════════════════════════════════════════════════════════════

class NegativeToleranceCreate(BaseModel):
    entity_id:                  int
    request_id:                 Optional[str]     = None
    item_code:                  Optional[str]     = None
    negative_tolerance_percent: Optional[Decimal] = None
    created_by:                 Optional[int]     = None


class NegativeToleranceUpdate(BaseModel):
    negative_tolerance_percent: Optional[Decimal] = None
    item_code:                  Optional[str]     = None
    updated_by:                 Optional[int]     = None


class NegativeToleranceResponse(_PurResponseBase):
    negative_tolerance_percent: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  5.  PHYSICAL STOCK VARIANCE %
# ═════════════════════════════════════════════════════════════════════════════

class PhysicalStockVarianceCreate(BaseModel):
    entity_id:                       int
    request_id:                      Optional[str]     = None
    item_code:                       Optional[str]     = None
    physical_stock_variance_percent: Optional[Decimal] = None
    created_by:                      Optional[int]     = None


class PhysicalStockVarianceUpdate(BaseModel):
    physical_stock_variance_percent: Optional[Decimal] = None
    item_code:                       Optional[str]     = None
    updated_by:                      Optional[int]     = None


class PhysicalStockVarianceResponse(_PurResponseBase):
    physical_stock_variance_percent: Optional[Decimal] = None


# ═════════════════════════════════════════════════════════════════════════════
#  6.  RECEIPT VARIANCE %
# ═════════════════════════════════════════════════════════════════════════════

class ReceiptVarianceCreate(BaseModel):
    entity_id:                int
    request_id:               Optional[str]     = None
    item_code:                Optional[str]     = None
    receipt_variance_percent: Optional[Decimal] = None
    created_by:               Optional[int]     = None


class ReceiptVarianceUpdate(BaseModel):
    receipt_variance_percent: Optional[Decimal] = None
    item_code:                Optional[str]     = None
    updated_by:               Optional[int]     = None


class ReceiptVarianceResponse(_PurResponseBase):
    receipt_variance_percent: Optional[Decimal] = None