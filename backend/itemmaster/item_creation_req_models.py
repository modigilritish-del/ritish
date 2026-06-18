"""itemmaster/item_creation_req_models.py
   SQLAlchemy ORM models for Item Code Creation Request
"""

from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, Boolean,
    ForeignKey, func
)
from sqlalchemy.orm import relationship
from database import Base


class ItemBasicInfoItemMaster(Base):
    """
    Stores the initial business request for creating an Item Code.
    Linked to company, plant, creator user (with role/dept/designation).
    """
    __tablename__ = "item_basic_info_item_master"

    id                  = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # ── Request ID (auto-generated, e.g. ICR-20240315-00001) ─────────
    request_id          = Column(String(30), nullable=True, unique=True, index=True)

    # ── Core item fields ──────────────────────────────────────────────
    item_name           = Column(String(255), nullable=False)
    item_description    = Column(Text, nullable=True)
    item_short_name     = Column(String(100), nullable=True)
    item_type           = Column(String(100), nullable=True)   # e.g. Raw Material
    department          = Column(String(150), nullable=True)
    required_date       = Column(Date, nullable=True)
    business_reason     = Column(Text, nullable=True)

    # ── Company / Plant (from user's access) ──────────────────────────
    company_id          = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    plant_id            = Column(Integer, ForeignKey("plants.id",   ondelete="SET NULL"), nullable=True)

    # ── Creator – user id + role / dept / designation at time of creation ─
    created_by          = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    creator_role_id     = Column(Integer, nullable=True)   # snapshot from user_roles at save time
    creator_dept_id     = Column(Integer, nullable=True)   # snapshot from user_departments
    creator_desg_id     = Column(Integer, nullable=True)   # snapshot from user_designations

    updated_by          = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # ── Status ────────────────────────────────────────────────────────
    is_active           = Column(Boolean, default=True)

    # ── Timestamps ────────────────────────────────────────────────────
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ── Relationships ─────────────────────────────────────────────────
    company             = relationship("Company",  foreign_keys=[company_id])
    plant               = relationship("Plant",    foreign_keys=[plant_id])
    creator             = relationship("User",     foreign_keys=[created_by])
    updater             = relationship("User",     foreign_keys=[updated_by])

    # one-to-one optional documents
    optional_documents  = relationship(
        "OptionalDocumentItemBasicInfoItemMaster",
        back_populates="item_basic_info",
        uselist=False,
        cascade="all, delete-orphan"
    )


class OptionalDocumentItemBasicInfoItemMaster(Base):
    """
    Stores optional document / photo URLs for an Item Basic Info request.
    Photos are NOT stored as binary – only URLs are stored.
    """
    __tablename__ = "optional_document_item_basic_info_item_master"

    id                      = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_master_basic_info_id = Column(
        Integer,
        ForeignKey("item_basic_info_item_master.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )

    # URL fields – store cloud/S3/CDN URL, NOT binary
    reference_image_url     = Column(Text, nullable=True)
    vendor_quotation_url    = Column(Text, nullable=True)
    sample_photo_url        = Column(Text, nullable=True)
    product_link            = Column(Text, nullable=True)

    # Timestamps
    created_at              = Column(DateTime(timezone=True), server_default=func.now())
    updated_at              = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship back to parent
    item_basic_info         = relationship(
        "ItemBasicInfoItemMaster",
        back_populates="optional_documents"
    )