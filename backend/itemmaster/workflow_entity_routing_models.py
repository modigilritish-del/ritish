"""
itemmaster/workflow_entity_routing_models.py
──────────────────────────────────────────────────────────────────────────────
Workflow Entity Routing — Database Models

WHAT THIS SOLVES
────────────────
In the Workflow Builder, every entity card (e.g. "Item Info Master",
"Analysis Fields", "Custom Fields") can have its OWN routing rule:
  - Which workflow FLOW handles it (flow_id → ItemMasterWorkflowFlow)
  - Which target COMPANY + DEPARTMENT receives it
  - OR which specific USER receives it (user routing mode)

This is SEPARATE from the flow layout (group/entity order).
Layout = how cards are arranged visually.
Routing = where each card's task is sent (forwarded to).

TABLES
──────
1.  imwf_entity_routing        — one row per (flow_id, entity_key) routing rule
2.  imwf_entity_routing_logs   — immutable audit log for every routing change

DESIGN
──────
- flow_id + entity_key = unique composite key (one routing per card per flow)
- routing_type: "dept" | "user"
    "dept" → target_company_id + target_dept_id
    "user" → target_user_id
- Soft-delete via is_active (routing can be cleared without deleting audit trail)
- All snapshots stored in logs for full history & restore
- Indexed for 1-crore-user-scale reads (flow_id, entity_key, company_id lookups)
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey,
    Text, UniqueConstraint, Enum as SAEnum, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class RoutingType(str, enum.Enum):
    DEPT = "dept"   # route to a company + department
    USER = "user"   # route to a specific user


class RoutingLogAction(str, enum.Enum):
    CREATED  = "CREATED"
    UPDATED  = "UPDATED"
    DELETED  = "DELETED"
    RESTORED = "RESTORED"
    CLEARED  = "CLEARED"


# ─── 1. Entity Routing ────────────────────────────────────────────────────────

class ItemMasterWorkflowEntityRouting(Base):
    """
    One row = routing rule for ONE entity card inside ONE flow.

    KEY:  flow_id + entity_key  (unique — one routing per card per flow)

    routing_type = "dept"
        → target_company_id  (required)
        → target_dept_id     (required)
        → target_user_id     (NULL)

    routing_type = "user"
        → target_user_id     (required)
        → target_company_id  (NULL or snapshot context)
        → target_dept_id     (NULL or snapshot context)

    Snapshot columns (*_name) store human-readable names at the time of
    saving, so logs remain readable even if the FK targets are renamed/deleted.
    """
    __tablename__ = "imwf_entity_routing"

    id              = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # ── Which flow + which entity card ───────────────────────────────────────
    flow_id         = Column(
        Integer,
        ForeignKey("item_master_workflow_flows.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    entity_key      = Column(String(100), nullable=False, index=True)
    # e.g. 'item-info-master', 'item-master-analysis-fields', 'custom-fields'

    # ── Routing mode ─────────────────────────────────────────────────────────
    routing_type    = Column(SAEnum(RoutingType), nullable=False, default=RoutingType.DEPT)

    # ── Target: Department mode ───────────────────────────────────────────────
    target_company_id   = Column(
        Integer,
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    target_company_name = Column(String(255), nullable=True,
                                 comment="Snapshot — company name at save time")

    target_dept_id      = Column(
        Integer,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    target_dept_name    = Column(String(255), nullable=True,
                                 comment="Snapshot — dept name at save time")

    # ── Target: User mode ─────────────────────────────────────────────────────
    target_user_id      = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    target_user_name    = Column(String(255), nullable=True,
                                 comment="Snapshot — user full_name at save time")
    target_user_email   = Column(String(255), nullable=True,
                                 comment="Snapshot — user email at save time")

    # ── Context (which entity/request this routing applies to) ───────────────
    # Optional: if set, this routing only applies to this specific ICR request
    # If NULL → applies to ALL requests for this flow+entity_key (default routing)
    entity_id       = Column(Integer, nullable=True, index=True,
                             comment="NULL=default routing; int=per-request override")
    request_id      = Column(String(30), nullable=True, index=True,
                             comment="ICR request_id snapshot")

    # ── Source department (which source dept this routing is FROM) ────────────
    # In workflow routing mode, each SOURCE dept maps to a target
    source_dept_id   = Column(
        Integer,
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    source_dept_name = Column(String(255), nullable=True,
                              comment="Snapshot of source dept name")

    # ── Notes ─────────────────────────────────────────────────────────────────
    routing_notes   = Column(Text, nullable=True,
                             comment="Optional instructions from the person setting up routing")

    # ── State ─────────────────────────────────────────────────────────────────
    is_active       = Column(Boolean, default=True, nullable=False, index=True)

    # ── Audit ─────────────────────────────────────────────────────────────────
    created_by      = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    updated_by      = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at      = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # ── Unique constraint ─────────────────────────────────────────────────────
    # One active routing per (flow, entity, source_dept [nullable], entity_id [nullable])
    __table_args__ = (
        UniqueConstraint(
            "flow_id", "entity_key", "source_dept_id", "entity_id",
            name="uq_imwfer_flow_entity_srcdept_entityid"
        ),
        # Performance indexes for high-traffic reads
        Index("ix_imwfer_flow_entity_active",   "flow_id", "entity_key", "is_active"),
        Index("ix_imwfer_flow_entity_srcdept",  "flow_id", "entity_key", "source_dept_id"),
        Index("ix_imwfer_target_company_dept",  "target_company_id", "target_dept_id"),
        Index("ix_imwfer_entity_id_key",        "entity_id", "entity_key"),
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    flow            = relationship("ItemMasterWorkflowFlow")
    target_company  = relationship("Company",    foreign_keys=[target_company_id])
    target_dept     = relationship("Department", foreign_keys=[target_dept_id])
    source_dept     = relationship("Department", foreign_keys=[source_dept_id])
    target_user     = relationship("User",       foreign_keys=[target_user_id])
    creator         = relationship("User",       foreign_keys=[created_by])
    updater         = relationship("User",       foreign_keys=[updated_by])

    logs            = relationship(
        "ItemMasterWorkflowEntityRoutingLog",
        back_populates="routing",
        cascade="all, delete-orphan",
        order_by="ItemMasterWorkflowEntityRoutingLog.created_at.desc()"
    )


# ─── 2. Routing Audit Logs ────────────────────────────────────────────────────

class ItemMasterWorkflowEntityRoutingLog(Base):
    """
    Immutable audit trail for every routing change.

    Every CREATE / UPDATE / DELETE / RESTORE / CLEAR on
    ItemMasterWorkflowEntityRouting creates one row here.

    snapshot_json stores the full routing state so any historical
    version can be viewed or restored.

    NEVER update or delete rows here.
    """
    __tablename__ = "imwf_entity_routing_logs"

    id              = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # ── What changed ──────────────────────────────────────────────────────────
    routing_id      = Column(
        Integer,
        ForeignKey("imwf_entity_routing.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    flow_id         = Column(Integer, nullable=False, index=True,
                             comment="Denormalised for fast flow-level log queries")
    entity_key      = Column(String(100), nullable=False, index=True,
                             comment="Denormalised entity_key snapshot")

    action          = Column(SAEnum(RoutingLogAction), nullable=False)

    # ── Before/after snapshots ────────────────────────────────────────────────
    snapshot_json   = Column(Text, nullable=True,
                             comment="Full JSON snapshot of routing row at this moment")
    previous_json   = Column(Text, nullable=True,
                             comment="Previous state before this change (NULL for CREATE)")

    # ── Who made the change ───────────────────────────────────────────────────
    changed_by      = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    changed_by_name = Column(String(255), nullable=True,
                             comment="Snapshot of user name at change time")
    note            = Column(String(500), nullable=True)

    created_at      = Column(DateTime(timezone=True), server_default=func.now(),
                             nullable=False, index=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    routing         = relationship("ItemMasterWorkflowEntityRouting", back_populates="logs")
    changed_by_user = relationship("User", foreign_keys=[changed_by])