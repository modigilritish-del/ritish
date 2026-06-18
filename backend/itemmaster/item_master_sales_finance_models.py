"""
itemmaster/item_master_sales_finance_models.py
─────────────────────────────────────────────────────────────────────────────
SQLAlchemy ORM models for Item Master Sales & Finance tab.

SALES — 3 separate tables:
  1.  item_master_sales_item_class
  2.  item_master_sales_ved_class
  3.  item_master_sales_price_control_code

FINANCE — 6 separate tables:
  4.  item_master_finance_tax_group
  5.  item_master_finance_method_of_costing
  6.  item_master_finance_batch_costing      ← yes_no_master reference
  7.  item_master_finance_standard_price
  8.  item_master_finance_costing_method_no
  9.  item_master_finance_serial_no_costing  ← yes_no_master reference

Yes/No fields store: yes_no_id (FK), yes_no_pair_id, label_type, label
─────────────────────────────────────────────────────────────────────────────
"""

from sqlalchemy import Column, Integer, String, Numeric, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED MIXIN  — common audit columns every table carries
# ─────────────────────────────────────────────────────────────────────────────

class _SFBase:
    """
    Mixin — common columns shared by all 9 sales & finance tables.
    Not a SQLAlchemy model itself.
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
#  YES/NO MIXIN  — for Finance Yes/No fields (batch_costing, serial_no_costing)
# ─────────────────────────────────────────────────────────────────────────────

class _SFYesNoBase(_SFBase):
    """
    Extends _SFBase with yes_no_master reference columns.
    label_type = 'yes' or 'no' tells you exactly what was selected.
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
        comment="'yes' or 'no' — tells you exactly what is stored"
    )
    label          = Column(
        String(100),
        nullable=True,
        comment="Label snapshot e.g. 'YES', 'NO', 'APPLICABLE'"
    )


# ═════════════════════════════════════════════════════════════════════════════
#  SALES — TABLE 1:  ITEM CLASS
#  Values: 'Always' | 'Sometimes' | 'Never'  (dropdown)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterSalesItemClass(Base, _SFBase):
    """
    Stores the Item Class selection for the Sales Details section.
    item_class is a fixed dropdown: Always / Sometimes / Never.
    """
    __tablename__ = "item_master_sales_item_class"

    item_class = Column(
        String(50),
        nullable=True,
        comment="Item Class — Always | Sometimes | Never"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterSalesItemClass.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterSalesItemClass.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterSalesItemClass.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  SALES — TABLE 2:  VED CLASS
#  Values: 'Vital' | 'Essential' | 'Desirable'  (dropdown)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterSalesVedClass(Base, _SFBase):
    """
    Stores the VED Class selection for the Sales Details section.
    ved_class is a fixed dropdown: Vital / Essential / Desirable.
    """
    __tablename__ = "item_master_sales_ved_class"

    ved_class = Column(
        String(50),
        nullable=True,
        comment="VED Class — Vital | Essential | Desirable"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterSalesVedClass.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterSalesVedClass.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterSalesVedClass.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  SALES — TABLE 3:  PRICE CONTROL CODE
#  Free-text input / LOV search field
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterSalesPriceControlCode(Base, _SFBase):
    """
    Stores the Price Control Code for the Sales Details section.
    Free-text / LOV lookup field.
    """
    __tablename__ = "item_master_sales_price_control_code"

    price_control_code = Column(
        String(100),
        nullable=True,
        comment="Price Control Code"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterSalesPriceControlCode.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterSalesPriceControlCode.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterSalesPriceControlCode.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — TABLE 4:  TAX GROUP
#  Free-text / LOV search field
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterFinanceTaxGroup(Base, _SFBase):
    """
    Stores the Tax Group for the Finance Details section.
    Free-text / LOV lookup field.
    """
    __tablename__ = "item_master_finance_tax_group"

    tax_group = Column(
        String(150),
        nullable=True,
        comment="Tax Group name / code"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterFinanceTaxGroup.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterFinanceTaxGroup.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterFinanceTaxGroup.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — TABLE 5:  METHOD OF COSTING
#  Free-text input (e.g. 'WAC - WEIGHTED AVERAGE COST')
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterFinanceMethodOfCosting(Base, _SFBase):
    """
    Stores the Method of Costing for the Finance Details section.
    e.g. 'WAC - WEIGHTED AVERAGE COST', 'FIFO', etc.
    """
    __tablename__ = "item_master_finance_method_of_costing"

    method_of_costing = Column(
        String(200),
        nullable=True,
        comment="Method of Costing e.g. WAC - WEIGHTED AVERAGE COST"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterFinanceMethodOfCosting.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterFinanceMethodOfCosting.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterFinanceMethodOfCosting.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — TABLE 6:  BATCH COSTING  (Boolean checkbox)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterFinanceBatchCosting(Base, _SFYesNoBase):
    """
    Stores the Batch Costing Yes/No selection for the Finance Details section.
    label_type = 'yes' means batch costing is enabled.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_finance_batch_costing"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterFinanceBatchCosting.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterFinanceBatchCosting.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterFinanceBatchCosting.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterFinanceBatchCosting.yes_no_id")


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — TABLE 7:  STANDARD PRICE  (Numeric)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterFinanceStandardPrice(Base, _SFBase):
    """
    Stores the Standard Price for the Finance Details section.
    Uses Numeric(18,4) for monetary precision.
    """
    __tablename__ = "item_master_finance_standard_price"

    standard_price = Column(
        Numeric(18, 4),
        nullable=True,
        default=0,
        comment="Standard Price"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterFinanceStandardPrice.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterFinanceStandardPrice.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterFinanceStandardPrice.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — TABLE 8:  COSTING METHOD NO.
#  Free-text / short numeric string (e.g. '1', '2')
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterFinanceCostingMethodNo(Base, _SFBase):
    """
    Stores the Costing Method Number for the Finance Details section.
    Stored as String to handle codes like '1A', '2B' etc.
    """
    __tablename__ = "item_master_finance_costing_method_no"

    costing_method_no = Column(
        String(50),
        nullable=True,
        comment="Costing Method Number e.g. 1, 2, 1A"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterFinanceCostingMethodNo.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterFinanceCostingMethodNo.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterFinanceCostingMethodNo.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  FINANCE — TABLE 9:  SERIAL NO. COSTING  (Boolean checkbox)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterFinanceSerialNoCosting(Base, _SFYesNoBase):
    """
    Stores the Serial No. Costing Yes/No selection for the Finance Details section.
    label_type = 'yes' means serial no. costing is enabled.
    References yes_no_master for proper id tracking.
    """
    __tablename__ = "item_master_finance_serial_no_costing"

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterFinanceSerialNoCosting.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterFinanceSerialNoCosting.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterFinanceSerialNoCosting.updated_by")
    yes_no       = relationship("YesNoMaster",             foreign_keys="ItemMasterFinanceSerialNoCosting.yes_no_id")