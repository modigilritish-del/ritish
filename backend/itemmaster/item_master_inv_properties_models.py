"""
itemmaster/item_master_inv_properties_models.py
─────────────────────────────────────────────────────────────────────────────
SQLAlchemy ORM models for Item Master Inventory Properties tab.

27 separate tables — one per field.
Every table stores:
  - entity_id   → FK to item_basic_info_item_master.id
  - request_id  → snapshot string (e.g. ICR-20240315-00001)
  - item_code   → item code string (snapshot at save time)
  - is_active, created_by, updated_by, created_at, updated_at  (audit)

Yes/No fields store full yes_no_master references:
  - yes_no_id       → FK to yes_no_master.id  (specific row PK — yes or no row)
  - yes_no_pair_id  → the shared pair id
  - label_type      → 'yes' or 'no'
  - label           → snapshot label e.g. 'YES'
LOV fields store the selected value string (code - description snapshot).
Numeric fields store the value.

Tables
──────
PAGE 1 — Stock / Grade Fields
 1.  item_master_invp_stock_check_level_at_item
 2.  item_master_invp_reservation_allowed
 3.  item_master_invp_over_reservation_allowed
 4.  item_master_invp_auto_release
 5.  item_master_invp_auto_release_hours
 6.  item_master_invp_hold
 7.  item_master_invp_grade_1_required
 8.  item_master_invp_grade_2_required
 9.  item_master_invp_default_value_for_grade_1
10.  item_master_invp_default_value_for_grade_2

PAGE 2 — Batch & Barcode Fields
11.  item_master_invp_batch_category_batch_items
12.  item_master_invp_zero_rated_sales_item
13.  item_master_invp_barcode_type
14.  item_master_invp_inhouse_manufacturer_barcode
15.  item_master_invp_barcode_generation
16.  item_master_invp_barcode_pricelist_updation
17.  item_master_invp_markup_perc_for_barcode_price
18.  item_master_invp_serial_number_category
19.  item_master_invp_temperature_check_required
20.  item_master_invp_weight_check_required

PAGE 3 — Dimension & Tolerance Fields
21.  item_master_invp_volume_check_required
22.  item_master_invp_dimension_check_required
23.  item_master_invp_all_dimensions_required
24.  item_master_invp_group_by_batch_srno_pack
25.  item_master_invp_so_positive_tolerance_pct
26.  item_master_invp_so_negative_tolerance_pct
27.  item_master_invp_so_tolerance_required
─────────────────────────────────────────────────────────────────────────────
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED MIXIN  — common audit columns every table carries
# ─────────────────────────────────────────────────────────────────────────────

class _InvPBase:
    """
    Mixin that adds the common columns shared by all 27 inventory properties tables.
    Not a SQLAlchemy model itself — included via multiple-inheritance.
    """
    id         = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # ── Request reference ────────────────────────────────────────────────────
    entity_id  = Column(
        Integer,
        ForeignKey("item_basic_info_item_master.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK to item_basic_info_item_master.id"
    )
    request_id = Column(
        String(30),
        nullable=True,
        index=True,
        comment="ICR request_id snapshot e.g. ICR-20240315-00001"
    )
    item_code  = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Item code snapshot at save time"
    )

    # ── Audit ────────────────────────────────────────────────────────────────
    is_active  = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)


# ─────────────────────────────────────────────────────────────────────────────
#  YES/NO MIXIN  — columns shared by all Yes/No inventory properties tables
# ─────────────────────────────────────────────────────────────────────────────

class _InvPYesNoBase(_InvPBase):
    """
    Extends _InvPBase with yes_no_master reference columns.
    Used by all Yes/No fields in the Inventory Properties tab.
    """
    yes_no_id      = Column(
        Integer,
        ForeignKey("yes_no_master.id", ondelete="SET NULL"),
        nullable=True,
        comment="FK to yes_no_master.id — the specific yes or no row PK"
    )
    yes_no_pair_id = Column(
        Integer,
        nullable=True,
        comment="Shared pair id — same value for the yes row and no row"
    )
    label_type     = Column(
        String(10),
        nullable=True,
        comment="'yes' or 'no'"
    )
    label          = Column(
        String(100),
        nullable=True,
        comment="Label snapshot e.g. 'YES', 'NO'"
    )


# ═════════════════════════════════════════════════════════════════════════════
#  PAGE 1 — STOCK / GRADE FIELDS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  1.  STOCK CHECK LEVEL AT ITEM  (LOV — text)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpStockCheckLevelAtItem(Base, _InvPBase):
    """
    Stores the Stock Check Level At Item LOV selection for the Inventory Properties tab.
    stock_check_level_at_item stores the selected value as a snapshot string.
    e.g. '1 - No Check', '2 - Warning Only', '3 - Negative Not Allowed', '4 - Strict Check'
    """
    __tablename__ = "item_master_invp_stock_check_level_at_item"

    stock_check_level_at_item = Column(
        String(255),
        nullable=True,
        comment="Stock Check Level At Item LOV value snapshot e.g. '1 - No Check'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpStockCheckLevelAtItem.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpStockCheckLevelAtItem.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpStockCheckLevelAtItem.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  2.  RESERVATION ALLOWED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpReservationAllowed(Base, _InvPYesNoBase):
    """
    Stores the Reservation Allowed Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_reservation_allowed"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpReservationAllowed.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpReservationAllowed.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpReservationAllowed.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpReservationAllowed.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  3.  OVER-RESERVATION ALLOWED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpOverReservationAllowed(Base, _InvPYesNoBase):
    """
    Stores the Over-Reservation Allowed Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_over_reservation_allowed"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpOverReservationAllowed.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpOverReservationAllowed.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpOverReservationAllowed.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpOverReservationAllowed.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  4.  AUTO RELEASE  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpAutoRelease(Base, _InvPYesNoBase):
    """
    Stores the Auto Release Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_auto_release"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpAutoRelease.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpAutoRelease.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpAutoRelease.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpAutoRelease.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  5.  AUTO RELEASE HOURS  (Numeric)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpAutoReleaseHours(Base, _InvPBase):
    """
    Stores the Auto Release Hours numeric value for the Inventory Properties tab.
    """
    __tablename__ = "item_master_invp_auto_release_hours"

    auto_release_hours = Column(
        Numeric(10, 2),
        nullable=True,
        default=0,
        comment="Auto release hours value"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpAutoReleaseHours.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpAutoReleaseHours.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpAutoReleaseHours.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  6.  HOLD  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpHold(Base, _InvPYesNoBase):
    """
    Stores the Hold Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_hold"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpHold.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpHold.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpHold.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpHold.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  7.  GRADE 1 REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpGrade1Required(Base, _InvPYesNoBase):
    """
    Stores the Grade 1 Required Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_grade_1_required"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpGrade1Required.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpGrade1Required.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpGrade1Required.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpGrade1Required.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  8.  GRADE 2 REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpGrade2Required(Base, _InvPYesNoBase):
    """
    Stores the Grade 2 Required Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_grade_2_required"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpGrade2Required.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpGrade2Required.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpGrade2Required.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpGrade2Required.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  9.  DEFAULT VALUE FOR GRADE 1  (LOV — text)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpDefaultValueForGrade1(Base, _InvPBase):
    """
    Stores the Default Value For Grade 1 LOV selection for the Inventory Properties tab.
    default_value_for_grade_1 stores the selected value as a snapshot string.
    e.g. 'A - Grade A', 'B - Grade B', 'NA - Not Applicable'
    """
    __tablename__ = "item_master_invp_default_value_for_grade_1"

    default_value_for_grade_1 = Column(
        String(255),
        nullable=True,
        comment="Default Value For Grade 1 LOV value snapshot e.g. 'A - Grade A'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpDefaultValueForGrade1.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpDefaultValueForGrade1.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpDefaultValueForGrade1.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  10.  DEFAULT VALUE FOR GRADE 2  (LOV — text)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpDefaultValueForGrade2(Base, _InvPBase):
    """
    Stores the Default Value For Grade 2 LOV selection for the Inventory Properties tab.
    default_value_for_grade_2 stores the selected value as a snapshot string.
    e.g. 'A - Grade A', 'B - Grade B', 'NA - Not Applicable'
    """
    __tablename__ = "item_master_invp_default_value_for_grade_2"

    default_value_for_grade_2 = Column(
        String(255),
        nullable=True,
        comment="Default Value For Grade 2 LOV value snapshot e.g. 'A - Grade A'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpDefaultValueForGrade2.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpDefaultValueForGrade2.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpDefaultValueForGrade2.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  PAGE 2 — BATCH & BARCODE FIELDS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  11.  BATCH CATEGORY-BATCH ITEMS  (LOV — text)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpBatchCategoryBatchItems(Base, _InvPBase):
    """
    Stores the Batch Category-Batch Items LOV selection for the Inventory Properties tab.
    batch_category_batch_items stores the selected value as a snapshot string.
    e.g. 'BC001 - Batch Category 1'
    """
    __tablename__ = "item_master_invp_batch_category_batch_items"

    batch_category_batch_items = Column(
        String(255),
        nullable=True,
        comment="Batch Category-Batch Items LOV value snapshot e.g. 'BC001 - Batch Category 1'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpBatchCategoryBatchItems.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpBatchCategoryBatchItems.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpBatchCategoryBatchItems.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  12.  ZERO RATED SALES ITEM  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpZeroRatedSalesItem(Base, _InvPYesNoBase):
    """
    Stores the Zero Rated Sales Item Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_zero_rated_sales_item"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpZeroRatedSalesItem.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpZeroRatedSalesItem.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpZeroRatedSalesItem.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpZeroRatedSalesItem.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  13.  BARCODE TYPE  (LOV — text)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpBarcodeType(Base, _InvPBase):
    """
    Stores the Barcode Type LOV selection for the Inventory Properties tab.
    barcode_type stores the selected value as a snapshot string.
    e.g. 'EAN13 - EAN-13', 'QR - QR Code', 'CODE128 - Code 128'
    """
    __tablename__ = "item_master_invp_barcode_type"

    barcode_type = Column(
        String(255),
        nullable=True,
        comment="Barcode Type LOV value snapshot e.g. 'EAN13 - EAN-13'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpBarcodeType.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpBarcodeType.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpBarcodeType.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  14.  INHOUSE / MANUFACTURER BARCODE  (LOV — text)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpInhouseManufacturerBarcode(Base, _InvPBase):
    """
    Stores the Inhouse / Manufacturer Barcode LOV selection for the Inventory Properties tab.
    inhouse_manufacturer_barcode stores the selected value as a snapshot string.
    e.g. 'INHOUSE - Inhouse Barcode', 'MFR - Manufacturer Barcode'
    """
    __tablename__ = "item_master_invp_inhouse_manufacturer_barcode"

    inhouse_manufacturer_barcode = Column(
        String(255),
        nullable=True,
        comment="Inhouse / Manufacturer Barcode LOV value snapshot e.g. 'INHOUSE - Inhouse Barcode'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpInhouseManufacturerBarcode.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpInhouseManufacturerBarcode.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpInhouseManufacturerBarcode.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  15.  BARCODE GENERATION  (LOV — text)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpBarcodeGeneration(Base, _InvPBase):
    """
    Stores the Barcode Generation LOV selection for the Inventory Properties tab.
    barcode_generation stores the selected value as a snapshot string.
    e.g. 'A - Automatic', 'M - Manual'
    """
    __tablename__ = "item_master_invp_barcode_generation"

    barcode_generation = Column(
        String(255),
        nullable=True,
        comment="Barcode Generation LOV value snapshot e.g. 'A - Automatic'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpBarcodeGeneration.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpBarcodeGeneration.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpBarcodeGeneration.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  16.  BARCODE PRICELIST UPDATION  (LOV — text)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpBarcodePricelistUpdation(Base, _InvPBase):
    """
    Stores the Barcode Pricelist Updation LOV selection for the Inventory Properties tab.
    barcode_pricelist_updation stores the selected value as a snapshot string.
    e.g. 'A - Automatic', 'M - Manual'
    """
    __tablename__ = "item_master_invp_barcode_pricelist_updation"

    barcode_pricelist_updation = Column(
        String(255),
        nullable=True,
        comment="Barcode Pricelist Updation LOV value snapshot e.g. 'A - Automatic'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpBarcodePricelistUpdation.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpBarcodePricelistUpdation.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpBarcodePricelistUpdation.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  17.  MARKUP PERC FOR BARCODE PRICE  (Numeric)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpMarkupPercForBarcodePrice(Base, _InvPBase):
    """
    Stores the Markup Percentage For Barcode Price numeric value for the Inventory Properties tab.
    """
    __tablename__ = "item_master_invp_markup_perc_for_barcode_price"

    markup_perc_for_barcode_price = Column(
        Numeric(10, 4),
        nullable=True,
        default=0,
        comment="Markup percentage for barcode price"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpMarkupPercForBarcodePrice.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpMarkupPercForBarcodePrice.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpMarkupPercForBarcodePrice.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  18.  SERIAL NUMBER CATEGORY  (LOV — text)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpSerialNumberCategory(Base, _InvPBase):
    """
    Stores the Serial Number Category LOV selection for the Inventory Properties tab.
    serial_number_category stores the selected value as a snapshot string.
    e.g. 'SNC001 - Category 1'
    """
    __tablename__ = "item_master_invp_serial_number_category"

    serial_number_category = Column(
        String(255),
        nullable=True,
        comment="Serial Number Category LOV value snapshot e.g. 'SNC001 - Category 1'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpSerialNumberCategory.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpSerialNumberCategory.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpSerialNumberCategory.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  19.  TEMPERATURE CHECK REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpTemperatureCheckRequired(Base, _InvPYesNoBase):
    """
    Stores the Temperature Check Required Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_temperature_check_required"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpTemperatureCheckRequired.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpTemperatureCheckRequired.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpTemperatureCheckRequired.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpTemperatureCheckRequired.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  20.  WEIGHT CHECK REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpWeightCheckRequired(Base, _InvPYesNoBase):
    """
    Stores the Weight Check Required Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_weight_check_required"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpWeightCheckRequired.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpWeightCheckRequired.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpWeightCheckRequired.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpWeightCheckRequired.yes_no_id")


# ═════════════════════════════════════════════════════════════════════════════
#  PAGE 3 — DIMENSION & TOLERANCE FIELDS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
#  21.  VOLUME CHECK REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpVolumeCheckRequired(Base, _InvPYesNoBase):
    """
    Stores the Volume Check Required Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_volume_check_required"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpVolumeCheckRequired.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpVolumeCheckRequired.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpVolumeCheckRequired.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpVolumeCheckRequired.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  22.  DIMENSION CHECK REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpDimensionCheckRequired(Base, _InvPYesNoBase):
    """
    Stores the Dimension Check Required Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_dimension_check_required"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpDimensionCheckRequired.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpDimensionCheckRequired.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpDimensionCheckRequired.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpDimensionCheckRequired.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  23.  ALL DIMENSIONS REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpAllDimensionsRequired(Base, _InvPYesNoBase):
    """
    Stores the All Dimensions Required Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_all_dimensions_required"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpAllDimensionsRequired.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpAllDimensionsRequired.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpAllDimensionsRequired.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpAllDimensionsRequired.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  24.  GROUP BY BATCH/SRNO/PACK  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpGroupByBatchSrnoPack(Base, _InvPYesNoBase):
    """
    Stores the Group By Batch/Srno/Pack Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_group_by_batch_srno_pack"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpGroupByBatchSrnoPack.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpGroupByBatchSrnoPack.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpGroupByBatchSrnoPack.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpGroupByBatchSrnoPack.yes_no_id")


# ─────────────────────────────────────────────────────────────────────────────
#  25.  SO POSITIVE TOLERANCE %  (Numeric)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpSoPositiveTolerancePct(Base, _InvPBase):
    """
    Stores the SO Positive Tolerance percentage for the Inventory Properties tab.
    """
    __tablename__ = "item_master_invp_so_positive_tolerance_pct"

    so_positive_tolerance_pct = Column(
        Numeric(10, 4),
        nullable=True,
        default=0,
        comment="SO positive tolerance percentage"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpSoPositiveTolerancePct.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpSoPositiveTolerancePct.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpSoPositiveTolerancePct.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  26.  SO NEGATIVE TOLERANCE %  (Numeric)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpSoNegativeTolerancePct(Base, _InvPBase):
    """
    Stores the SO Negative Tolerance percentage for the Inventory Properties tab.
    """
    __tablename__ = "item_master_invp_so_negative_tolerance_pct"

    so_negative_tolerance_pct = Column(
        Numeric(10, 4),
        nullable=True,
        default=0,
        comment="SO negative tolerance percentage"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpSoNegativeTolerancePct.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpSoNegativeTolerancePct.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpSoNegativeTolerancePct.updated_by")


# ─────────────────────────────────────────────────────────────────────────────
#  27.  SO TOLERANCE REQUIRED  (Yes/No)
# ─────────────────────────────────────────────────────────────────────────────

class ItemMasterInvpSoToleranceRequired(Base, _InvPYesNoBase):
    """
    Stores the SO Tolerance Required Yes/No selection for the Inventory Properties tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_invp_so_tolerance_required"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvpSoToleranceRequired.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvpSoToleranceRequired.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvpSoToleranceRequired.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterInvpSoToleranceRequired.yes_no_id")