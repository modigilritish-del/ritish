"""
itemmaster/workflow_builder_models.py
──────────────────────────────────────────────────────────────────────────────
Item Master Workflow Builder — Database Models (fully normalised)

Tables
──────
1.  item_master_workflow_flows          — one row per named flow (per company+plant)
2.  item_master_workflow_group_order    — group display-order for a flow
3.  item_master_workflow_group_entities — entity order inside a group for a flow
4.  item_master_workflow_flow_logs      — every save / restore / delete event
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey,
    Text, UniqueConstraint, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class FlowLogAction(str, enum.Enum):
    CREATED  = "CREATED"
    UPDATED  = "UPDATED"
    DELETED  = "DELETED"
    RESTORED = "RESTORED"
    RESET    = "RESET"


# ─── 1. Flows ─────────────────────────────────────────────────────────────────

class ItemMasterWorkflowFlow(Base):
    """
    One named workflow flow per company (+optional plant).
    A single company can have multiple flows (one per plant, or named variants).
    """
    __tablename__ = "item_master_workflow_flows"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    flow_name  = Column(String(255), nullable=False)          # user-given name
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    plant_id   = Column(Integer, ForeignKey("plants.id",   ondelete="SET NULL"), nullable=True)
    is_active  = Column(Boolean, default=True,  nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)  # system-wide default layout
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint(
            "flow_name", "company_id", "plant_id",
            name="uq_imwf_name_company_plant"
        ),
    )

    # Relationships
    company       = relationship("Company")
    plant         = relationship("Plant")
    group_orders  = relationship(
        "ItemMasterWorkflowGroupOrder",
        back_populates="flow",
        cascade="all, delete-orphan",
        order_by="ItemMasterWorkflowGroupOrder.display_order"
    )
    group_entities = relationship(
        "ItemMasterWorkflowGroupEntity",
        back_populates="flow",
        cascade="all, delete-orphan",
        order_by="ItemMasterWorkflowGroupEntity.entity_order"
    )
    logs = relationship(
        "ItemMasterWorkflowFlowLog",
        back_populates="flow",
        cascade="all, delete-orphan",
        order_by="ItemMasterWorkflowFlowLog.created_at.desc()"
    )


# ─── 2. Group Order ───────────────────────────────────────────────────────────

class ItemMasterWorkflowGroupOrder(Base):
    """
    Stores the left-to-right display order of GROUPS within a flow.
    group_key  — matches GROUPS[i].id from the frontend (e.g. 'basic-info')
    """
    __tablename__ = "item_master_workflow_group_order"

    id            = Column(Integer, primary_key=True, index=True, autoincrement=True)
    flow_id       = Column(Integer, ForeignKey("item_master_workflow_flows.id", ondelete="CASCADE"), nullable=False)
    group_key     = Column(String(100), nullable=False)   # e.g. 'basic-info', 'inventory'
    display_order = Column(Integer,     nullable=False)   # 0-

    __table_args__ = (
        UniqueConstraint("flow_id", "group_key",     name="uq_imwgo_flow_group"),
        UniqueConstraint("flow_id", "display_order", name="uq_imwgo_flow_order"),
    )

    flow = relationship("ItemMasterWorkflowFlow", back_populates="group_orders")


# ─── 3. Group Entities ────────────────────────────────────────────────────────

class ItemMasterWorkflowGroupEntity(Base):
    """
    Stores which entities are present in each group and in what order.
    entity_key — matches GROUPS[i].entities[j].id  (e.g. 'item-info-master')
    """
    __tablename__ = "item_master_workflow_group_entities"

    id           = Column(Integer, primary_key=True, index=True, autoincrement=True)
    flow_id      = Column(Integer, ForeignKey("item_master_workflow_flows.id", ondelete="CASCADE"), nullable=False)
    group_key    = Column(String(100), nullable=False)
    entity_key   = Column(String(100), nullable=False)   # e.g. 'item-info-master'
    entity_order = Column(Integer,     nullable=False)   # 0-based position inside group

    __table_args__ = (
        UniqueConstraint("flow_id", "group_key", "entity_key", name="uq_imwge_flow_group_entity"),
    )

    flow = relationship("ItemMasterWorkflowFlow", back_populates="group_entities")


# ─── 4. Flow Logs ─────────────────────────────────────────────────────────────

class ItemMasterWorkflowFlowLog(Base):
    """
    Audit log — every create / update / delete / restore / reset is recorded.
    snapshot_json stores the full serialised state at that moment so
    you can restore any historical version.
    """
    __tablename__ = "item_master_workflow_flow_logs"

    id            = Column(Integer,  primary_key=True, index=True, autoincrement=True)
    flow_id       = Column(Integer,  ForeignKey("item_master_workflow_flows.id", ondelete="CASCADE"), nullable=False)
    action        = Column(SAEnum(FlowLogAction), nullable=False)
    snapshot_json = Column(Text, nullable=True)   # full JSON snapshot of groupOrder + groupEntityIds
    note          = Column(String(500), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    flow = relationship("ItemMasterWorkflowFlow", back_populates="logs")