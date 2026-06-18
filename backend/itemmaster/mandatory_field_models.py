"""
itemmaster/mandatory_field_models.py
─────────────────────────────────────────────────────────────────────────────
NEW standalone models for "Mandatory Field Configuration" feature.
Zero changes to any existing model.

Tables created:
  mandatory_field_config        — per company (+ optional plant) field rules
  mandatory_field_config_log    — full audit log (every create / update)
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, JSON, func, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


class MandatoryFieldConfig(Base):
    """
    Stores which fields are mandatory for a given page_key,
    scoped to a company and optionally a plant.

    page_key  — matches adminworkflowlinks[i].path  e.g. "item-code-creation-req"
    company_id — FK to companies.id
    plant_id   — FK to plants.id  (NULL = applies to whole company)

    fields_config — JSON list of field objects:
        [
          { "field_key": "item_name",        "label": "Item Name",        "is_mandatory": true  },
          { "field_key": "item_description",  "label": "Item Description", "is_mandatory": false },
          ...
        ]

    Unique constraint: one config row per (page_key, company_id, plant_id).
    plant_id=NULL means company-level config.
    """
    __tablename__ = "mandatory_field_config"
    __table_args__ = (
        UniqueConstraint("page_key", "company_id", "plant_id", name="uq_mfc_page_company_plant"),
    )

    id             = Column(Integer, primary_key=True, index=True, autoincrement=True)
    page_key       = Column(String(120), nullable=False, index=True)   # e.g. "item-code-creation-req"
    page_label     = Column(String(255), nullable=True)                # human-readable page name

    company_id     = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    plant_id       = Column(Integer, ForeignKey("plants.id",    ondelete="CASCADE"), nullable=True)  # NULL = whole company

    fields_config  = Column(JSON, nullable=False, default=list)        # list of field dicts (see docstring)

    is_active      = Column(Boolean, default=True)
    created_by     = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by     = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # ── Relationships ────────────────────────────────────────────────────────
    company        = relationship("Company",  foreign_keys=[company_id])
    plant          = relationship("Plant",    foreign_keys=[plant_id])
    creator        = relationship("User",     foreign_keys=[created_by])
    updater        = relationship("User",     foreign_keys=[updated_by])


class MandatoryFieldConfigLog(Base):
    """
    Immutable audit log — every create / update of MandatoryFieldConfig
    writes a new row here.  Rows are NEVER deleted.

    change_type   — "CREATE" | "UPDATE"
    snapshot      — full JSON snapshot of fields_config at the time of change
    changed_fields — JSON dict of what changed  { field_key: { old, new } }
    """
    __tablename__ = "mandatory_field_config_log"

    id              = Column(Integer, primary_key=True, index=True, autoincrement=True)
    config_id       = Column(Integer, ForeignKey("mandatory_field_config.id", ondelete="SET NULL"), nullable=True)
    page_key        = Column(String(120), nullable=False)
    company_id      = Column(Integer, nullable=True)
    plant_id        = Column(Integer, nullable=True)

    change_type     = Column(String(20), nullable=False)               # "CREATE" | "UPDATE"
    snapshot        = Column(JSON, nullable=False, default=list)       # full fields_config at this moment
    changed_fields  = Column(JSON, nullable=True)                      # diff  { field_key: {old, new} }
    note            = Column(Text, nullable=True)                      # optional admin comment

    performed_by    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    performed_at    = Column(DateTime(timezone=True), server_default=func.now())

    performer       = relationship("User", foreign_keys=[performed_by])