"""itemmaster/item_master_info_models.py
   SQLAlchemy ORM models for Item Master Info — per field separate tables
   ─────────────────────────────────────────────────────────────────────────────
   Tables:
       1.  item_master_uom               — Base UOM
       2.  item_master_max_loose         — Max Loose numeric value
       3.  item_master_stock             — Stock YES/NO  (was part of stock_service)
       4.  item_master_service           — Service YES/NO (was part of stock_service)
       5.  item_master_batch_item        — Batch Item YES/NO
       6.  item_master_serial_item       — Serial Item YES/NO
       7.  item_master_gift_voucher      — Gift Voucher YES/NO
       8.  item_master_extended_warranty — Extended Warranty YES/NO
       9.  item_master_info_change_log   — Universal change log for all above tables

   NOTE: item_master_stock_service has been REMOVED and replaced by
         item_master_stock + item_master_service (same pattern as batch/serial).

   FIX: Mixin uses sqlalchemy.orm.declared_attr so every subclass gets its OWN
        column objects — required for correct multi-table SQLAlchemy mapping.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean,
    DateTime, ForeignKey, func, Enum as SAEnum, Index
)
from sqlalchemy.orm import relationship, declared_attr
import enum
from database import Base


# ═══════════════════════════════════════════════════════════════════════════════
#  ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class YesNoEnum(str, enum.Enum):
    YES = "YES"
    NO  = "NO"


class ItemMasterInfoTableEnum(str, enum.Enum):
    """Identifies which table a change log entry belongs to."""
    UOM               = "UOM"
    MAX_LOOSE         = "MAX_LOOSE"
    STOCK             = "STOCK"           # ← split from old STOCK_SERVICE
    SERVICE           = "SERVICE"         # ← split from old STOCK_SERVICE
    BATCH_ITEM        = "BATCH_ITEM"
    SERIAL_ITEM       = "SERIAL_ITEM"
    GIFT_VOUCHER      = "GIFT_VOUCHER"
    EXTENDED_WARRANTY = "EXTENDED_WARRANTY"
    ANALYSIS_FIELDS   = "ANALYSIS_FIELDS"


# ═══════════════════════════════════════════════════════════════════════════════
#  MIXIN  —  shared audit columns using declared_attr (SQLAlchemy standard)
# ═══════════════════════════════════════════════════════════════════════════════

class ItemMasterAuditMixin:
    """
    Shared columns injected into every Item Master Info table via declared_attr.
    declared_attr is REQUIRED so each subclass gets its OWN Column instance.
    """

    @declared_attr
    def request_id(cls):
        return Column(String(30), nullable=True, index=True,
                      comment="ICR request_id snapshot for fast lookup")

    @declared_attr
    def entity_id(cls):
        return Column(
            Integer,
            ForeignKey("item_basic_info_item_master.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
            comment="FK → ItemBasicInfoItemMaster"
        )

    @declared_attr
    def created_by(cls):
        return Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    @declared_attr
    def updated_by(cls):
        return Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    @declared_attr
    def created_at(cls):
        return Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    @declared_attr
    def updated_at(cls):
        return Column(DateTime(timezone=True), server_default=func.now(),
                      onupdate=func.now(), nullable=False)

    @declared_attr
    def is_active(cls):
        return Column(Boolean, default=True, nullable=False)

    @declared_attr
    def notes(cls):
        return Column(Text, nullable=True,
                      comment="MDM approver notes / mapping comments")

    @declared_attr
    def item_request(cls):
        return relationship(
            "ItemBasicInfoItemMaster",
            foreign_keys=f"[{cls.__name__}.entity_id]",
            lazy="select"
        )

    @declared_attr
    def creator(cls):
        return relationship(
            "User",
            foreign_keys=f"[{cls.__name__}.created_by]",
            lazy="select"
        )

    @declared_attr
    def updater(cls):
        return relationship(
            "User",
            foreign_keys=f"[{cls.__name__}.updated_by]",
            lazy="select"
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  1.  item_master_uom  —  Base UOM
# ═══════════════════════════════════════════════════════════════════════════════

class ItemMasterUOM(ItemMasterAuditMixin, Base):
    """Records the Base UOM selected for an Item Master request."""
    __tablename__ = "item_master_uom"

    id       = Column(Integer, primary_key=True, autoincrement=True)

    uom_code = Column(String(30), nullable=False,
                      comment="UOM code from uom master e.g. KG, PCS, LTR")
    uom_name = Column(String(100), nullable=True,
                      comment="UOM name snapshot at time of mapping")

    __table_args__ = (
        Index("ix_item_master_uom_entity",  "entity_id"),
        Index("ix_item_master_uom_request", "request_id"),
        {"comment": "Base UOM selection per Item Master request"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  2.  item_master_max_loose  —  Max Loose value
# ═══════════════════════════════════════════════════════════════════════════════

class ItemMasterMaxLoose(ItemMasterAuditMixin, Base):
    """Stores the Max Loose numeric value for an Item Master request."""
    __tablename__ = "item_master_max_loose"

    id        = Column(Integer, primary_key=True, autoincrement=True)

    max_loose = Column(Numeric(precision=18, scale=4), nullable=False,
                       comment="Max Loose numeric value e.g. 12.5000")
    uom_code  = Column(String(30), nullable=True,
                       comment="Optional UOM for Max Loose e.g. KG")

    __table_args__ = (
        Index("ix_item_master_max_loose_entity",  "entity_id"),
        Index("ix_item_master_max_loose_request", "request_id"),
        {"comment": "Max Loose value per Item Master request"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  3.  item_master_stock  —  Stock YES/NO
#      Split from old item_master_stock_service — same pattern as batch/serial.
# ═══════════════════════════════════════════════════════════════════════════════

class ItemMasterStock(ItemMasterAuditMixin, Base):
    """
    Stores Stock YES/NO selection for an Item Master request.
    Stock and Service are mutually exclusive — enforced at app layer.
    Same independent-table pattern as item_master_batch_item / item_master_serial_item.
    """
    __tablename__ = "item_master_stock"

    id       = Column(Integer, primary_key=True, autoincrement=True)

    is_stock = Column(SAEnum(YesNoEnum), nullable=False, default=YesNoEnum.NO,
                      comment="Is this item a Stock item? YES/NO")

    __table_args__ = (
        Index("ix_item_master_stock_entity",  "entity_id"),
        Index("ix_item_master_stock_request", "request_id"),
        {"comment": "Stock YES/NO flag per Item Master request"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  4.  item_master_service  —  Service YES/NO
#      Split from old item_master_stock_service — same pattern as batch/serial.
# ═══════════════════════════════════════════════════════════════════════════════

class ItemMasterService(ItemMasterAuditMixin, Base):
    """
    Stores Service YES/NO selection for an Item Master request.
    Stock and Service are mutually exclusive — enforced at app layer.
    Same independent-table pattern as item_master_batch_item / item_master_serial_item.
    """
    __tablename__ = "item_master_service"

    id         = Column(Integer, primary_key=True, autoincrement=True)

    is_service = Column(SAEnum(YesNoEnum), nullable=False, default=YesNoEnum.NO,
                        comment="Is this item a Service item? YES/NO")

    __table_args__ = (
        Index("ix_item_master_service_entity",  "entity_id"),
        Index("ix_item_master_service_request", "request_id"),
        {"comment": "Service YES/NO flag per Item Master request"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  5.  item_master_batch_item  —  Batch Item YES/NO
# ═══════════════════════════════════════════════════════════════════════════════

class ItemMasterBatchItem(ItemMasterAuditMixin, Base):
    """
    Stores Batch Item YES/NO selection for an Item Master request.
    Batch and Serial are mutually exclusive — enforced at app layer.
    """
    __tablename__ = "item_master_batch_item"

    id       = Column(Integer, primary_key=True, autoincrement=True)

    is_batch = Column(SAEnum(YesNoEnum), nullable=False, default=YesNoEnum.NO,
                      comment="Is this a Batch item? YES/NO")

    __table_args__ = (
        Index("ix_item_master_batch_entity",  "entity_id"),
        Index("ix_item_master_batch_request", "request_id"),
        {"comment": "Batch Item YES/NO flag per Item Master request"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  6.  item_master_serial_item  —  Serial Item YES/NO
# ═══════════════════════════════════════════════════════════════════════════════

class ItemMasterSerialItem(ItemMasterAuditMixin, Base):
    """
    Stores Serial Item YES/NO selection for an Item Master request.
    Batch and Serial are mutually exclusive — enforced at app layer.
    """
    __tablename__ = "item_master_serial_item"

    id        = Column(Integer, primary_key=True, autoincrement=True)

    is_serial = Column(SAEnum(YesNoEnum), nullable=False, default=YesNoEnum.NO,
                       comment="Is this a Serial item? YES/NO")

    __table_args__ = (
        Index("ix_item_master_serial_entity",  "entity_id"),
        Index("ix_item_master_serial_request", "request_id"),
        {"comment": "Serial Item YES/NO flag per Item Master request"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  7.  item_master_gift_voucher  —  Gift Voucher YES/NO
# ═══════════════════════════════════════════════════════════════════════════════

class ItemMasterGiftVoucher(ItemMasterAuditMixin, Base):
    """Stores Gift Voucher YES/NO selection for an Item Master request."""
    __tablename__ = "item_master_gift_voucher"

    id              = Column(Integer, primary_key=True, autoincrement=True)

    is_gift_voucher = Column(SAEnum(YesNoEnum), nullable=False, default=YesNoEnum.NO,
                             comment="Is this item a Gift Voucher? YES/NO")

    __table_args__ = (
        Index("ix_item_master_gift_entity",  "entity_id"),
        Index("ix_item_master_gift_request", "request_id"),
        {"comment": "Gift Voucher YES/NO flag per Item Master request"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  8.  item_master_extended_warranty  —  Extended Warranty YES/NO
# ═══════════════════════════════════════════════════════════════════════════════

class ItemMasterExtendedWarranty(ItemMasterAuditMixin, Base):
    """Stores Extended Warranty YES/NO selection for an Item Master request."""
    __tablename__ = "item_master_extended_warranty"

    id                    = Column(Integer, primary_key=True, autoincrement=True)

    has_extended_warranty = Column(SAEnum(YesNoEnum), nullable=False, default=YesNoEnum.NO,
                                   comment="Does this item have Extended Warranty? YES/NO")

    __table_args__ = (
        Index("ix_item_master_warranty_entity",  "entity_id"),
        Index("ix_item_master_warranty_request", "request_id"),
        {"comment": "Extended Warranty YES/NO flag per Item Master request"},
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  9.  item_master_info_change_log  —  Universal Change Log  (immutable)
# ═══════════════════════════════════════════════════════════════════════════════

class ItemMasterInfoChangeLog(Base):
    """
    Universal immutable audit/change-log for ALL Item Master Info tables.

    Every time ANY of the 8 tables above is created or updated,
    one row is inserted here recording:
      • which table changed  (table_name  — uses ItemMasterInfoTableEnum)
      • which request        (request_id + entity_id)
      • which record         (record_id = PK of the changed table)
      • what changed         (field_name, old_value, new_value)
      • who changed it       (changed_by, changer_name_snapshot)
      • when                 (changed_at)
      • action type          (CREATE / UPDATE / DELETE)
    """
    __tablename__ = "item_master_info_change_log"

    id                    = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # ── Which request ──────────────────────────────────────────────────────────
    request_id            = Column(String(30), nullable=True, index=True,
                                   comment="ICR request_id for fast filtering")
    entity_id             = Column(Integer,
                                   ForeignKey("item_basic_info_item_master.id", ondelete="CASCADE"),
                                   nullable=False, index=True)

    # ── Which table + record ───────────────────────────────────────────────────
    table_name            = Column(String(50), nullable=False, index=True,
                                   comment="Which of the 8 tables this log entry belongs to")
    record_id             = Column(Integer, nullable=False,
                                   comment="PK of the changed row in the target table")

    # ── What changed ───────────────────────────────────────────────────────────
    action                = Column(String(10), nullable=False,
                                   comment="CREATE | UPDATE | DELETE")
    field_name            = Column(String(100), nullable=True,
                                   comment="Column name that changed e.g. uom_code, is_stock")
    old_value             = Column(Text, nullable=True,
                                   comment="Value before the change (NULL for CREATE)")
    new_value             = Column(Text, nullable=True,
                                   comment="Value after the change")

    # ── Who changed it ─────────────────────────────────────────────────────────
    changed_by            = Column(Integer,
                                   ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    changer_name_snapshot = Column(String(255), nullable=True,
                                   comment="User full_name at time of change (denormalised)")
    changer_role_snapshot = Column(String(100), nullable=True,
                                   comment="User role name at time of change")

    # ── Context / notes ────────────────────────────────────────────────────────
    change_reason         = Column(Text, nullable=True,
                                   comment="Optional reason / comment for the change")
    ip_address            = Column(String(45), nullable=True,
                                   comment="IP address of the client making the change")

    # ── When ──────────────────────────────────────────────────────────────────
    changed_at            = Column(DateTime(timezone=True), server_default=func.now(),
                                   nullable=False, index=True)

    __table_args__ = (
        Index("ix_im_changelog_request", "request_id"),
        Index("ix_im_changelog_entity",  "entity_id"),
        Index("ix_im_changelog_table",   "table_name"),
        Index("ix_im_changelog_changed", "changed_at"),
        {"comment": "Universal immutable change log for all Item Master Info tables"},
    )

    # Relationships
    item_request = relationship("ItemBasicInfoItemMaster", foreign_keys=[entity_id])
    changer      = relationship("User", foreign_keys=[changed_by])