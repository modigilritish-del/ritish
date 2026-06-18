"""
itemmaster/item_master_analysis_fields_model.py
─────────────────────────────────────────────────────────────────────────────
SQLAlchemy model for Item Master Analysis Fields.

Stores Category → SubCategory → Product → ProductClassification
selections for a given Item Creation Request (entity_id + request_id).

Pattern:  exactly same as ItemMasterUOM / ItemMasterBatchItem etc.
Table:    item_master_analysis_fields
Log:      item_master_info_change_log  (shared — same _write_log helper)

─────────────────────────────────────────────────────────────────────────────
STEP 1 (one-time setup):
  In your item_master_info_models.py, add  ANALYSIS_FIELDS  to
  ItemMasterInfoTableEnum:

    class ItemMasterInfoTableEnum(str, enum.Enum):
        UOM               = "UOM"
        MAX_LOOSE         = "MAX_LOOSE"
        STOCK             = "STOCK"
        SERVICE           = "SERVICE"
        BATCH_ITEM        = "BATCH_ITEM"
        SERIAL_ITEM       = "SERIAL_ITEM"
        GIFT_VOUCHER      = "GIFT_VOUCHER"
        EXTENDED_WARRANTY = "EXTENDED_WARRANTY"
        ANALYSIS_FIELDS   = "ANALYSIS_FIELDS" 

─────────────────────────────────────────────────────────────────────────────
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class ItemMasterAnalysisFieldsRecord(Base):
    """
    Stores the Analysis Fields (Category / SubCategory / Product /
    ProductClassification) selected by the MDM team for one ICR request.

    One active row per entity_id.
    History tracked via item_master_info_change_log.
    """
    __tablename__ = "item_master_analysis_fields"

    id              = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # ── Source request ────────────────────────────────────────────────────────
    request_id      = Column(String(30),  nullable=True, index=True,
                             comment="ICR request_id e.g. ICR-20240315-00001")
    entity_id       = Column(Integer,
                             ForeignKey("item_basic_info_item_master.id", ondelete="CASCADE"),
                             nullable=False, index=True)

    # ── Category ──────────────────────────────────────────────────────────────
    category_id     = Column(Integer,
                             ForeignKey("item_master_categories.id", ondelete="SET NULL"),
                             nullable=True, index=True)
    category_name   = Column(String(255), nullable=True,
                             comment="Snapshot of category_name at save time")
    category_code   = Column(String(80),  nullable=True,
                             comment="Snapshot of category_code at save time")

    # ── Sub-Category ──────────────────────────────────────────────────────────
    sub_category_id     = Column(Integer,
                                 ForeignKey("item_master_sub_categories.id", ondelete="SET NULL"),
                                 nullable=True, index=True)
    sub_category_name   = Column(String(255), nullable=True)
    sub_category_code   = Column(String(80),  nullable=True)

    # ── Product ───────────────────────────────────────────────────────────────
    product_id          = Column(Integer,
                                 ForeignKey("item_master_products.id", ondelete="SET NULL"),
                                 nullable=True, index=True)
    product_name        = Column(String(255), nullable=True)
    product_code        = Column(String(100), nullable=True)

    # ── Product Classification ────────────────────────────────────────────────
    classification_id   = Column(Integer,
                                 ForeignKey("item_master_product_classifications.id", ondelete="SET NULL"),
                                 nullable=True, index=True)
    classification_name = Column(String(255), nullable=True)
    classification_code = Column(String(120), nullable=True)

    # ── Meta ──────────────────────────────────────────────────────────────────
    notes       = Column(Text,    nullable=True)
    is_active   = Column(Boolean, default=True, nullable=False)

    created_by  = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by  = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(),
                         onupdate=func.now(), nullable=False)

    __table_args__ = ({'extend_existing': True})

    # ── Relationships ─────────────────────────────────────────────────────────
    item_request     = relationship("ItemBasicInfoItemMaster", foreign_keys=[entity_id])
    category         = relationship("Category",               foreign_keys=[category_id])
    sub_category     = relationship("SubCategory",            foreign_keys=[sub_category_id])
    product          = relationship("Product",                foreign_keys=[product_id])
    classification   = relationship("ProductClassification",  foreign_keys=[classification_id])
    creator          = relationship("User",                   foreign_keys=[created_by])
    updater          = relationship("User",                   foreign_keys=[updated_by])