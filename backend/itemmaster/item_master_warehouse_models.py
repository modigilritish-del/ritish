"""
itemmaster/item_master_warehouse_models.py
─────────────────────────────────────────────────────────────────────────────
SQLAlchemy ORM models for Item Master Warehouse tab.

7 separate tables — one per field.
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
Numeric fields store the value.

Tables
──────
1.  item_master_wh_storage_temperature
2.  item_master_wh_temperature_tolerance
3.  item_master_wh_potency_item
4.  item_master_wh_dependency_item
5.  item_master_wh_forced_putaway
6.  item_master_wh_multi_batch_pallet
7.  item_master_wh_item_consider
─────────────────────────────────────────────────────────────────────────────
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED MIXIN  — common audit columns every table carries
# ─────────────────────────────────────────────────────────────────────────────

class _WhBase:
    """
    Mixin that adds the common columns shared by all 7 warehouse tables.
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
#  YES/NO MIXIN  — columns shared by all 5 Yes/No warehouse tables
# ─────────────────────────────────────────────────────────────────────────────

class _WhYesNoBase(_WhBase):
    """
    Extends _WhBase with yes_no_master reference columns.
    Used by all 5 Yes/No fields in the Warehouse tab.
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
        comment="Label snapshot e.g. 'YES', 'NO', 'APPLICABLE'"
    )


# ═════════════════════════════════════════════════════════════════════════════
#  1.  STORAGE TEMPERATURE  (numeric)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterWhStorageTemperature(Base, _WhBase):
    """
    Stores the Storage Temperature value for the Warehouse tab.
    """
    __tablename__ = "item_master_wh_storage_temperature"

    storage_temperature = Column(
        Numeric(10, 2),
        nullable=True,
        default=0,
        comment="Storage temperature value"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterWhStorageTemperature.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterWhStorageTemperature.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterWhStorageTemperature.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  2.  TEMPERATURE TOLERANCE  (numeric)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterWhTemperatureTolerance(Base, _WhBase):
    """
    Stores the Temperature Tolerance value for the Warehouse tab.
    """
    __tablename__ = "item_master_wh_temperature_tolerance"

    temperature_tolerance = Column(
        Numeric(10, 2),
        nullable=True,
        default=0,
        comment="Temperature tolerance value"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterWhTemperatureTolerance.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterWhTemperatureTolerance.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterWhTemperatureTolerance.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  3.  POTENCY ITEM  (boolean checkbox)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterWhPotencyItem(Base, _WhYesNoBase):
    """
    Stores the Potency Item Yes/No selection for the Warehouse tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_wh_potency_item"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterWhPotencyItem.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterWhPotencyItem.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterWhPotencyItem.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterWhPotencyItem.yes_no_id")


# ═════════════════════════════════════════════════════════════════════════════
#  4.  DEPENDENCY ITEM  (boolean checkbox)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterWhDependencyItem(Base, _WhYesNoBase):
    """
    Stores the Dependency Item Yes/No selection for the Warehouse tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_wh_dependency_item"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterWhDependencyItem.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterWhDependencyItem.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterWhDependencyItem.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterWhDependencyItem.yes_no_id")


# ═════════════════════════════════════════════════════════════════════════════
#  5.  FORCED PUTAWAY  (boolean checkbox)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterWhForcedPutaway(Base, _WhYesNoBase):
    """
    Stores the Forced Putaway Yes/No selection for the Warehouse tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_wh_forced_putaway"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterWhForcedPutaway.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterWhForcedPutaway.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterWhForcedPutaway.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterWhForcedPutaway.yes_no_id")


# ═════════════════════════════════════════════════════════════════════════════
#  6.  MULTI-BATCH PALLET  (boolean checkbox)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterWhMultiBatchPallet(Base, _WhYesNoBase):
    """
    Stores the Multi-Batch Pallet Yes/No selection for the Warehouse tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_wh_multi_batch_pallet"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterWhMultiBatchPallet.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterWhMultiBatchPallet.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterWhMultiBatchPallet.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterWhMultiBatchPallet.yes_no_id")


# ═════════════════════════════════════════════════════════════════════════════
#  7.  ITEM CONSIDER  (boolean checkbox)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterWhItemConsider(Base, _WhYesNoBase):
    """
    Stores the Item Consider Yes/No selection for the Warehouse tab.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_wh_item_consider"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterWhItemConsider.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterWhItemConsider.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterWhItemConsider.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterWhItemConsider.yes_no_id")