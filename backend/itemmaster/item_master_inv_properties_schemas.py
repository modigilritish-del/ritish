"""
itemmaster/item_master_inv_properties_schemas.py
─────────────────────────────────────────────────────────────────────────────
Pydantic schemas for all 27 Item Master Inventory Properties field tables.

Pattern per table:
  - XxxCreate   — POST body
  - XxxUpdate   — PUT body (all fields optional)
  - XxxResponse — API response

LOV fields accept the selected value string (code - description snapshot).
Numeric fields accept Decimal values.
Yes/No fields store yes_no_id (FK to yes_no_master.id — tells YES or NO row),
              yes_no_pair_id, label_type ('yes'/'no'), label (snapshot).
─────────────────────────────────────────────────────────────────────────────
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED RESPONSE BASE
# ─────────────────────────────────────────────────────────────────────────────

class _InvPResponseBase(BaseModel):
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

class _InvPYesNoResponseBase(_InvPResponseBase):
    yes_no_id:      Optional[int] = None   # FK to yes_no_master.id (yes row or no row)
    yes_no_pair_id: Optional[int] = None   # shared pair id
    label_type:     Optional[str] = None   # 'yes' or 'no'  ← tells you what is stored
    label:          Optional[str] = None   # snapshot e.g. 'YES', 'NO'


# ═════════════════════════════════════════════════════════════════════════════
#  PAGE 1 — STOCK / GRADE FIELDS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  1.  STOCK CHECK LEVEL AT ITEM  (LOV)
# ─────────────────────────────────────────────────────────────────────────────

class StockCheckLevelAtItemCreate(BaseModel):
    entity_id:                 int
    request_id:                Optional[str] = None
    item_code:                 Optional[str] = None
    stock_check_level_at_item: Optional[str] = None   # e.g. '1 - No Check'
    created_by:                Optional[int] = None


class StockCheckLevelAtItemUpdate(BaseModel):
    stock_check_level_at_item: Optional[str] = None
    item_code:                 Optional[str] = None
    updated_by:                Optional[int] = None


class StockCheckLevelAtItemResponse(_InvPResponseBase):
    stock_check_level_at_item: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
#  2.  RESERVATION ALLOWED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ReservationAllowedCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None   # 'yes' or 'no'
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class ReservationAllowedUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class ReservationAllowedResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  3.  OVER-RESERVATION ALLOWED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class OverReservationAllowedCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class OverReservationAllowedUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class OverReservationAllowedResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  4.  AUTO RELEASE  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class AutoReleaseCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class AutoReleaseUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class AutoReleaseResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  5.  AUTO RELEASE HOURS  (Numeric)
# ─────────────────────────────────────────────────────────────────────────────

class AutoReleaseHoursCreate(BaseModel):
    entity_id:          int
    request_id:         Optional[str]     = None
    item_code:          Optional[str]     = None
    auto_release_hours: Optional[Decimal] = None
    created_by:         Optional[int]     = None


class AutoReleaseHoursUpdate(BaseModel):
    auto_release_hours: Optional[Decimal] = None
    item_code:          Optional[str]     = None
    updated_by:         Optional[int]     = None


class AutoReleaseHoursResponse(_InvPResponseBase):
    auto_release_hours: Optional[Decimal] = None


# ─────────────────────────────────────────────────────────────────────────────
#  6.  HOLD  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class HoldCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class HoldUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class HoldResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  7.  GRADE 1 REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class Grade1RequiredCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class Grade1RequiredUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class Grade1RequiredResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  8.  GRADE 2 REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class Grade2RequiredCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class Grade2RequiredUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class Grade2RequiredResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  9.  DEFAULT VALUE FOR GRADE 1  (LOV)
# ─────────────────────────────────────────────────────────────────────────────

class DefaultValueForGrade1Create(BaseModel):
    entity_id:                 int
    request_id:                Optional[str] = None
    item_code:                 Optional[str] = None
    default_value_for_grade_1: Optional[str] = None   # e.g. 'A - Grade A'
    created_by:                Optional[int] = None


class DefaultValueForGrade1Update(BaseModel):
    default_value_for_grade_1: Optional[str] = None
    item_code:                 Optional[str] = None
    updated_by:                Optional[int] = None


class DefaultValueForGrade1Response(_InvPResponseBase):
    default_value_for_grade_1: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
#  10.  DEFAULT VALUE FOR GRADE 2  (LOV)
# ─────────────────────────────────────────────────────────────────────────────

class DefaultValueForGrade2Create(BaseModel):
    entity_id:                 int
    request_id:                Optional[str] = None
    item_code:                 Optional[str] = None
    default_value_for_grade_2: Optional[str] = None   # e.g. 'A - Grade A'
    created_by:                Optional[int] = None


class DefaultValueForGrade2Update(BaseModel):
    default_value_for_grade_2: Optional[str] = None
    item_code:                 Optional[str] = None
    updated_by:                Optional[int] = None


class DefaultValueForGrade2Response(_InvPResponseBase):
    default_value_for_grade_2: Optional[str] = None


# ═════════════════════════════════════════════════════════════════════════════
#  PAGE 2 — BATCH & BARCODE FIELDS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  11.  BATCH CATEGORY-BATCH ITEMS  (LOV)
# ─────────────────────────────────────────────────────────────────────────────

class BatchCategoryBatchItemsCreate(BaseModel):
    entity_id:                  int
    request_id:                 Optional[str] = None
    item_code:                  Optional[str] = None
    batch_category_batch_items: Optional[str] = None   # e.g. 'BC001 - Batch Category 1'
    created_by:                 Optional[int] = None


class BatchCategoryBatchItemsUpdate(BaseModel):
    batch_category_batch_items: Optional[str] = None
    item_code:                  Optional[str] = None
    updated_by:                 Optional[int] = None


class BatchCategoryBatchItemsResponse(_InvPResponseBase):
    batch_category_batch_items: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
#  12.  ZERO RATED SALES ITEM  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ZeroRatedSalesItemCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class ZeroRatedSalesItemUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class ZeroRatedSalesItemResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  13.  BARCODE TYPE  (LOV)
# ─────────────────────────────────────────────────────────────────────────────

class BarcodeTypeCreate(BaseModel):
    entity_id:    int
    request_id:   Optional[str] = None
    item_code:    Optional[str] = None
    barcode_type: Optional[str] = None   # e.g. 'EAN13 - EAN-13'
    created_by:   Optional[int] = None


class BarcodeTypeUpdate(BaseModel):
    barcode_type: Optional[str] = None
    item_code:    Optional[str] = None
    updated_by:   Optional[int] = None


class BarcodeTypeResponse(_InvPResponseBase):
    barcode_type: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
#  14.  INHOUSE / MANUFACTURER BARCODE  (LOV)
# ─────────────────────────────────────────────────────────────────────────────

class InhouseManufacturerBarcodeCreate(BaseModel):
    entity_id:                    int
    request_id:                   Optional[str] = None
    item_code:                    Optional[str] = None
    inhouse_manufacturer_barcode: Optional[str] = None   # e.g. 'INHOUSE - Inhouse Barcode'
    created_by:                   Optional[int] = None


class InhouseManufacturerBarcodeUpdate(BaseModel):
    inhouse_manufacturer_barcode: Optional[str] = None
    item_code:                    Optional[str] = None
    updated_by:                   Optional[int] = None


class InhouseManufacturerBarcodeResponse(_InvPResponseBase):
    inhouse_manufacturer_barcode: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
#  15.  BARCODE GENERATION  (LOV)
# ─────────────────────────────────────────────────────────────────────────────

class BarcodeGenerationCreate(BaseModel):
    entity_id:          int
    request_id:         Optional[str] = None
    item_code:          Optional[str] = None
    barcode_generation: Optional[str] = None   # e.g. 'A - Automatic'
    created_by:         Optional[int] = None


class BarcodeGenerationUpdate(BaseModel):
    barcode_generation: Optional[str] = None
    item_code:          Optional[str] = None
    updated_by:         Optional[int] = None


class BarcodeGenerationResponse(_InvPResponseBase):
    barcode_generation: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
#  16.  BARCODE PRICELIST UPDATION  (LOV)
# ─────────────────────────────────────────────────────────────────────────────

class BarcodePricelistUpdationCreate(BaseModel):
    entity_id:                  int
    request_id:                 Optional[str] = None
    item_code:                  Optional[str] = None
    barcode_pricelist_updation: Optional[str] = None   # e.g. 'A - Automatic'
    created_by:                 Optional[int] = None


class BarcodePricelistUpdationUpdate(BaseModel):
    barcode_pricelist_updation: Optional[str] = None
    item_code:                  Optional[str] = None
    updated_by:                 Optional[int] = None


class BarcodePricelistUpdationResponse(_InvPResponseBase):
    barcode_pricelist_updation: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
#  17.  MARKUP PERC FOR BARCODE PRICE  (Numeric)
# ─────────────────────────────────────────────────────────────────────────────

class MarkupPercForBarcodePriceCreate(BaseModel):
    entity_id:                     int
    request_id:                    Optional[str]     = None
    item_code:                     Optional[str]     = None
    markup_perc_for_barcode_price: Optional[Decimal] = None
    created_by:                    Optional[int]     = None


class MarkupPercForBarcodePriceUpdate(BaseModel):
    markup_perc_for_barcode_price: Optional[Decimal] = None
    item_code:                     Optional[str]     = None
    updated_by:                    Optional[int]     = None


class MarkupPercForBarcodePriceResponse(_InvPResponseBase):
    markup_perc_for_barcode_price: Optional[Decimal] = None


# ─────────────────────────────────────────────────────────────────────────────
#  18.  SERIAL NUMBER CATEGORY  (LOV)
# ─────────────────────────────────────────────────────────────────────────────

class SerialNumberCategoryCreate(BaseModel):
    entity_id:              int
    request_id:             Optional[str] = None
    item_code:              Optional[str] = None
    serial_number_category: Optional[str] = None   # e.g. 'SNC001 - Category 1'
    created_by:             Optional[int] = None


class SerialNumberCategoryUpdate(BaseModel):
    serial_number_category: Optional[str] = None
    item_code:              Optional[str] = None
    updated_by:             Optional[int] = None


class SerialNumberCategoryResponse(_InvPResponseBase):
    serial_number_category: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
#  19.  TEMPERATURE CHECK REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class TemperatureCheckRequiredCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class TemperatureCheckRequiredUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class TemperatureCheckRequiredResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  20.  WEIGHT CHECK REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class WeightCheckRequiredCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class WeightCheckRequiredUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class WeightCheckRequiredResponse(_InvPYesNoResponseBase):
    pass


# ═════════════════════════════════════════════════════════════════════════════
#  PAGE 3 — DIMENSION & TOLERANCE FIELDS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  21.  VOLUME CHECK REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class VolumeCheckRequiredCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class VolumeCheckRequiredUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class VolumeCheckRequiredResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  22.  DIMENSION CHECK REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class DimensionCheckRequiredCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class DimensionCheckRequiredUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class DimensionCheckRequiredResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  23.  ALL DIMENSIONS REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class AllDimensionsRequiredCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class AllDimensionsRequiredUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class AllDimensionsRequiredResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  24.  GROUP BY BATCH/SRNO/PACK  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class GroupByBatchSrnoPackCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class GroupByBatchSrnoPackUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class GroupByBatchSrnoPackResponse(_InvPYesNoResponseBase):
    pass


# ─────────────────────────────────────────────────────────────────────────────
#  25.  SO POSITIVE TOLERANCE %  (Numeric)
# ─────────────────────────────────────────────────────────────────────────────

class SoPositiveTolerancePctCreate(BaseModel):
    entity_id:                 int
    request_id:                Optional[str]     = None
    item_code:                 Optional[str]     = None
    so_positive_tolerance_pct: Optional[Decimal] = None
    created_by:                Optional[int]     = None


class SoPositiveTolerancePctUpdate(BaseModel):
    so_positive_tolerance_pct: Optional[Decimal] = None
    item_code:                 Optional[str]     = None
    updated_by:                Optional[int]     = None


class SoPositiveTolerancePctResponse(_InvPResponseBase):
    so_positive_tolerance_pct: Optional[Decimal] = None


# ─────────────────────────────────────────────────────────────────────────────
#  26.  SO NEGATIVE TOLERANCE %  (Numeric)
# ─────────────────────────────────────────────────────────────────────────────

class SoNegativeTolerancePctCreate(BaseModel):
    entity_id:                 int
    request_id:                Optional[str]     = None
    item_code:                 Optional[str]     = None
    so_negative_tolerance_pct: Optional[Decimal] = None
    created_by:                Optional[int]     = None


class SoNegativeTolerancePctUpdate(BaseModel):
    so_negative_tolerance_pct: Optional[Decimal] = None
    item_code:                 Optional[str]     = None
    updated_by:                Optional[int]     = None


class SoNegativeTolerancePctResponse(_InvPResponseBase):
    so_negative_tolerance_pct: Optional[Decimal] = None


# ─────────────────────────────────────────────────────────────────────────────
#  27.  SO TOLERANCE REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class SoToleranceRequiredCreate(BaseModel):
    entity_id:      int
    request_id:     Optional[str] = None
    item_code:      Optional[str] = None
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    created_by:     Optional[int] = None


class SoToleranceRequiredUpdate(BaseModel):
    yes_no_id:      Optional[int] = None
    yes_no_pair_id: Optional[int] = None
    label_type:     Optional[str] = None
    label:          Optional[str] = None
    item_code:      Optional[str] = None
    updated_by:     Optional[int] = None


class SoToleranceRequiredResponse(_InvPYesNoResponseBase):
    pass