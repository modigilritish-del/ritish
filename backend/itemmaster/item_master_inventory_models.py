"""
itemmaster/item_master_inventory_models.py
─────────────────────────────────────────────────────────────────────────────
SQLAlchemy ORM models for Item Master Inventory tab.

12 separate tables — one per field.
Every table stores:
  - entity_id   → FK to item_basic_info_item_master.id
  - request_id  → snapshot string (e.g. ICR-20240315-00001)
  - item_code   → item code string (snapshot at save time)
  - is_active, created_by, updated_by, created_at, updated_at  (audit)

YES/NO fields store the yes_no_master row id (yes_id or no_id from YesNoMaster).
Numeric fields store the value(s).
LOV/text fields store the value string.

Tables
──────
1.  item_master_inv_parent_item
2.  item_master_inv_packed_item
3.  item_master_inv_superceded
4.  item_master_inv_max_stock
5.  item_master_inv_reorder_quantity
6.  item_master_inv_harmonised_code
7.  item_master_inv_lead_time
8.  item_master_inv_dimension
9.  item_master_inv_minimum_stock
10. item_master_inv_reorder_level
11. item_master_inv_safety_stock_factor
12. item_master_inv_universal_product_code
─────────────────────────────────────────────────────────────────────────────
"""

from sqlalchemy import Column, Integer, String, Numeric, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED MIXIN  — common audit columns every table carries
# ─────────────────────────────────────────────────────────────────────────────

class _InvBase:
    """
    Mixin that adds the common columns shared by all 12 inventory tables.
    Not a SQLAlchemy model itself — included via multiple-inheritance.
    """
    id          = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # ── Request reference ────────────────────────────────────────────────────
    entity_id   = Column(
        Integer,
        ForeignKey("item_basic_info_item_master.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK to item_basic_info_item_master.id"
    )
    request_id  = Column(
        String(30),
        nullable=True,
        index=True,
        comment="ICR request_id snapshot e.g. ICR-20240315-00001"
    )
    item_code   = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Item code snapshot at save time"
    )

    # ── Audit ────────────────────────────────────────────────────────────────
    is_active   = Column(Boolean, default=True, nullable=False)
    created_by  = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by  = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(),
                         onupdate=func.now(), nullable=False)


# ═════════════════════════════════════════════════════════════════════════════
#  1.  PARENT ITEM
#      Stores the selected parent item (LOV — references another item master row)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvParentItem(Base, _InvBase):
    """
    Stores the Parent Item selection for the Inventory tab.
    parent_item_code / parent_item_name are snapshots from the item master LOV.
    """
    __tablename__ = "item_master_inv_parent_item"

    parent_item_entity_id = Column(
        Integer,
        ForeignKey("item_basic_info_item_master.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK to the chosen parent item row in item_basic_info_item_master"
    )
    parent_item_code = Column(String(100), nullable=True,
                              comment="Parent item code snapshot")
    parent_item_name = Column(String(255), nullable=True,
                              comment="Parent item name snapshot")

    # relationships
    item_request        = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvParentItem.entity_id")
    parent_item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvParentItem.parent_item_entity_id")
    creator             = relationship("User", foreign_keys="ItemMasterInvParentItem.created_by")
    updater             = relationship("User", foreign_keys="ItemMasterInvParentItem.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  2.  PACKED ITEM  (YES / NO)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvPackedItem(Base, _InvBase):
    """
    Stores YES/NO selection for 'Packed Item'.
    yes_no_id  → the specific row id from yes_no_master (either yes_id or no_id).
    yes_no_pair_id → the pair id from yes_no_master for reference.
    label_type → 'yes' or 'no' (snapshot).
    label      → label text snapshot (e.g. 'YES', 'NO').
    """
    __tablename__ = "item_master_inv_packed_item"

    yes_no_id      = Column(
        Integer,
        ForeignKey("yes_no_master.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK to yes_no_master.id — the specific yes or no row selected"
    )
    yes_no_pair_id = Column(Integer, nullable=True,
                            comment="yes_no_pair_id snapshot from yes_no_master")
    label_type     = Column(String(10), nullable=True,
                            comment="'yes' or 'no' snapshot")
    label          = Column(String(100), nullable=True,
                            comment="Label text snapshot e.g. YES / NO")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvPackedItem.entity_id")
    yes_no_row   = relationship("YesNoMaster",              foreign_keys="ItemMasterInvPackedItem.yes_no_id")
    creator      = relationship("User",                     foreign_keys="ItemMasterInvPackedItem.created_by")
    updater      = relationship("User",                     foreign_keys="ItemMasterInvPackedItem.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  3.  SUPERCEDED  (YES / NO)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvSuperceded(Base, _InvBase):
    """
    Stores YES/NO selection for 'Superceded'.
    Same pattern as ItemMasterInvPackedItem.
    """
    __tablename__ = "item_master_inv_superceded"

    yes_no_id      = Column(
        Integer,
        ForeignKey("yes_no_master.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK to yes_no_master.id — the specific yes or no row selected"
    )
    yes_no_pair_id = Column(Integer, nullable=True,
                            comment="yes_no_pair_id snapshot from yes_no_master")
    label_type     = Column(String(10), nullable=True,
                            comment="'yes' or 'no' snapshot")
    label          = Column(String(100), nullable=True,
                            comment="Label text snapshot e.g. YES / NO")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvSuperceded.entity_id")
    yes_no_row   = relationship("YesNoMaster",              foreign_keys="ItemMasterInvSuperceded.yes_no_id")
    creator      = relationship("User",                     foreign_keys="ItemMasterInvSuperceded.created_by")
    updater      = relationship("User",                     foreign_keys="ItemMasterInvSuperceded.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  4.  MAXIMUM STOCK QTY  (two numeric values — qty1 and qty2)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvMaxStock(Base, _InvBase):
    """
    Stores Maximum Stock Qty (two columns — qty1 and qty2 as shown in the UI).
    Uses Numeric(18,4) for precision.
    """
    __tablename__ = "item_master_inv_max_stock"

    max_stock_qty1 = Column(Numeric(18, 4), nullable=True, default=0,
                            comment="Maximum stock quantity — first value")
    max_stock_qty2 = Column(Numeric(18, 4), nullable=True, default=0,
                            comment="Maximum stock quantity — second value")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvMaxStock.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvMaxStock.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvMaxStock.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  5.  REORDER QUANTITY  (two numeric values)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvReorderQuantity(Base, _InvBase):
    """
    Stores Reorder Quantity (two columns — qty1 and qty2 as shown in the UI).
    """
    __tablename__ = "item_master_inv_reorder_quantity"

    reorder_qty1 = Column(Numeric(18, 4), nullable=True, default=0,
                          comment="Reorder quantity — first value")
    reorder_qty2 = Column(Numeric(18, 4), nullable=True, default=0,
                          comment="Reorder quantity — second value")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvReorderQuantity.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvReorderQuantity.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvReorderQuantity.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  6.  HARMONISED CODE  (text)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvHarmonisedCode(Base, _InvBase):
    """
    Stores the Harmonised (HS) Code for the item.
    """
    __tablename__ = "item_master_inv_harmonised_code"

    harmonised_code = Column(String(50), nullable=True,
                             comment="Harmonised / HS tariff code")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvHarmonisedCode.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvHarmonisedCode.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvHarmonisedCode.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  7.  LEAD TIME (in Days)  (numeric)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvLeadTime(Base, _InvBase):
    """
    Stores Lead Time in days.
    """
    __tablename__ = "item_master_inv_lead_time"

    lead_time_days = Column(Numeric(10, 2), nullable=True, default=0,
                            comment="Lead time in days")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvLeadTime.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvLeadTime.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvLeadTime.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  8.  DIMENSION  (YES / NO)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvDimension(Base, _InvBase):
    """
    Stores YES/NO selection for 'Dimension'.
    Same pattern as ItemMasterInvPackedItem.
    """
    __tablename__ = "item_master_inv_dimension"

    yes_no_id      = Column(
        Integer,
        ForeignKey("yes_no_master.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK to yes_no_master.id — the specific yes or no row selected"
    )
    yes_no_pair_id = Column(Integer, nullable=True,
                            comment="yes_no_pair_id snapshot from yes_no_master")
    label_type     = Column(String(10), nullable=True,
                            comment="'yes' or 'no' snapshot")
    label          = Column(String(100), nullable=True,
                            comment="Label text snapshot e.g. YES / NO")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvDimension.entity_id")
    yes_no_row   = relationship("YesNoMaster",              foreign_keys="ItemMasterInvDimension.yes_no_id")
    creator      = relationship("User",                     foreign_keys="ItemMasterInvDimension.created_by")
    updater      = relationship("User",                     foreign_keys="ItemMasterInvDimension.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  9.  MINIMUM STOCK QTY  (two numeric values)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvMinimumStock(Base, _InvBase):
    """
    Stores Minimum Stock Qty (two columns — qty1 and qty2 as shown in the UI).
    """
    __tablename__ = "item_master_inv_minimum_stock"

    min_stock_qty1 = Column(Numeric(18, 4), nullable=True, default=0,
                            comment="Minimum stock quantity — first value")
    min_stock_qty2 = Column(Numeric(18, 4), nullable=True, default=0,
                            comment="Minimum stock quantity — second value")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvMinimumStock.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvMinimumStock.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvMinimumStock.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  10. REORDER LEVEL  (two numeric values)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvReorderLevel(Base, _InvBase):
    """
    Stores Reorder Level (two columns — level1 and level2 as shown in the UI).
    """
    __tablename__ = "item_master_inv_reorder_level"

    reorder_level1 = Column(Numeric(18, 4), nullable=True, default=0,
                            comment="Reorder level — first value")
    reorder_level2 = Column(Numeric(18, 4), nullable=True, default=0,
                            comment="Reorder level — second value")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvReorderLevel.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvReorderLevel.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvReorderLevel.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  11. SAFETY STOCK FACTOR  (numeric)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvSafetyStockFactor(Base, _InvBase):
    """
    Stores Safety Stock Factor (single numeric value).
    """
    __tablename__ = "item_master_inv_safety_stock_factor"

    safety_stock_factor = Column(Numeric(18, 4), nullable=True, default=0,
                                 comment="Safety stock factor")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvSafetyStockFactor.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvSafetyStockFactor.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvSafetyStockFactor.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  12. UNIVERSAL PRODUCT CODE  (text)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterInvUniversalProductCode(Base, _InvBase):
    """
    Stores the Universal Product Code (UPC / barcode) for the item.
    """
    __tablename__ = "item_master_inv_universal_product_code"

    universal_product_code = Column(String(100), nullable=True,
                                    comment="Universal Product Code / Barcode / UPC")

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterInvUniversalProductCode.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterInvUniversalProductCode.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterInvUniversalProductCode.updated_by")