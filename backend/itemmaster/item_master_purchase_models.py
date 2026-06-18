"""
itemmaster/item_master_purchase_models.py
─────────────────────────────────────────────────────────────────────────────
SQLAlchemy ORM models for Item Master Purchase tab.

6 separate tables — one per field.
Every table stores:
  - entity_id   → FK to item_basic_info_item_master.id
  - request_id  → snapshot string (e.g. ICR-20240315-00001)
  - item_code   → item code string (snapshot at save time)
  - is_active, created_by, updated_by, created_at, updated_at  (audit)

LOV fields store the selected value string (code - description snapshot).
Numeric fields store percentage values.

Tables
──────
1.  item_master_pur_vendor_analysis
2.  item_master_pur_analysis_property_class
3.  item_master_pur_positive_tolerance
4.  item_master_pur_negative_tolerance
5.  item_master_pur_physical_stock_variance
6.  item_master_pur_receipt_variance
─────────────────────────────────────────────────────────────────────────────
"""

from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


# ─────────────────────────────────────────────────────────────────────────────
#  SHARED MIXIN  — common audit columns every table carries
# ─────────────────────────────────────────────────────────────────────────────

class _PurBase:
    """
    Mixin that adds the common columns shared by all 6 purchase tables.
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


# ═════════════════════════════════════════════════════════════════════════════
#  1.  VENDOR ANALYSIS  (LOV — text)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterPurVendorAnalysis(Base, _PurBase):
    """
    Stores the Vendor Analysis LOV selection for the Purchase tab.
    vendor_analysis stores the selected value as a snapshot string.
    """
    __tablename__ = "item_master_pur_vendor_analysis"

    vendor_analysis = Column(
        String(255),
        nullable=True,
        comment="Vendor Analysis LOV value snapshot e.g. 'VA001 - Vendor Analysis Type A'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterPurVendorAnalysis.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterPurVendorAnalysis.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterPurVendorAnalysis.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  2.  ANALYSIS PROPERTY CLASS  (LOV — text)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterPurAnalysisPropertyClass(Base, _PurBase):
    """
    Stores the Analysis Property Class LOV selection for the Purchase tab.
    analysis_property_class stores the selected value as a snapshot string.
    """
    __tablename__ = "item_master_pur_analysis_property_class"

    analysis_property_class = Column(
        String(255),
        nullable=True,
        comment="Analysis Property Class LOV value snapshot e.g. 'APC001 - Property Class A'"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterPurAnalysisPropertyClass.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterPurAnalysisPropertyClass.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterPurAnalysisPropertyClass.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  3.  POSITIVE TOLERANCE %  (numeric)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterPurPositiveTolerance(Base, _PurBase):
    """
    Stores the Positive Tolerance percentage for the Purchase tab.
    """
    __tablename__ = "item_master_pur_positive_tolerance"

    positive_tolerance_percent = Column(
        Numeric(10, 4),
        nullable=True,
        default=0,
        comment="Positive tolerance percentage"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterPurPositiveTolerance.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterPurPositiveTolerance.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterPurPositiveTolerance.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  4.  NEGATIVE TOLERANCE %  (numeric)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterPurNegativeTolerance(Base, _PurBase):
    """
    Stores the Negative Tolerance percentage for the Purchase tab.
    """
    __tablename__ = "item_master_pur_negative_tolerance"

    negative_tolerance_percent = Column(
        Numeric(10, 4),
        nullable=True,
        default=0,
        comment="Negative tolerance percentage"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterPurNegativeTolerance.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterPurNegativeTolerance.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterPurNegativeTolerance.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  5.  PHYSICAL STOCK VARIANCE %  (numeric)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterPurPhysicalStockVariance(Base, _PurBase):
    """
    Stores the Physical Stock Variance percentage for the Purchase tab.
    """
    __tablename__ = "item_master_pur_physical_stock_variance"

    physical_stock_variance_percent = Column(
        Numeric(10, 4),
        nullable=True,
        default=0,
        comment="Physical stock variance percentage"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterPurPhysicalStockVariance.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterPurPhysicalStockVariance.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterPurPhysicalStockVariance.updated_by")


# ═════════════════════════════════════════════════════════════════════════════
#  6.  RECEIPT VARIANCE %  (numeric)
# ═════════════════════════════════════════════════════════════════════════════

class ItemMasterPurReceiptVariance(Base, _PurBase):
    """
    Stores the Receipt Variance percentage for the Purchase tab.
    """
    __tablename__ = "item_master_pur_receipt_variance"

    receipt_variance_percent = Column(
        Numeric(10, 4),
        nullable=True,
        default=0,
        comment="Receipt variance percentage"
    )

    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys="ItemMasterPurReceiptVariance.entity_id")
    creator      = relationship("User",                    foreign_keys="ItemMasterPurReceiptVariance.created_by")
    updater      = relationship("User",                    foreign_keys="ItemMasterPurReceiptVariance.updated_by")