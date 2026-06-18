"""
MDM/item_info_forward_models.py
─────────────────────────────────────────────────────────────────────────────
SQLAlchemy model for Item Info Forward Log.

Tracks every time an MDM approver forwards an Item Info mapping task
to a company+department for filling in the Item Info Master page.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class ItemInfoForwardLog(Base):
    """
    Immutable audit log — every forward action by an MDM approver.

    One row = one forward action:
      - Which request was forwarded (entity_id + request_id)
      - Who forwarded it (forwarded_by = MDM approver user_id)
      - To which company+dept (target_company_id + target_dept_id)
      - Who was notified (notified_user_ids, comma-separated)
      - When (forwarded_at)

    NEVER update or delete rows here.
    """
    __tablename__ = "item_info_forward_log"

    id                   = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # ── Source request ────────────────────────────────────────────────────────
    entity_id            = Column(Integer,
                                  ForeignKey("item_basic_info_item_master.id", ondelete="CASCADE"),
                                  nullable=False, index=True)
    request_id           = Column(String(30), nullable=True, index=True,
                                  comment="ICR request_id snapshot for fast lookup")
    item_name_snapshot   = Column(String(255), nullable=True,
                                  comment="Item name at time of forwarding")

    # ── Target company + dept ─────────────────────────────────────────────────
    target_company_id    = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"),
                                  nullable=True, index=True)
    target_company_name  = Column(String(255), nullable=True,
                                  comment="Company name snapshot")
    target_dept_id       = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"),
                                  nullable=True, index=True)
    target_dept_name     = Column(String(255), nullable=True,
                                  comment="Department name snapshot")

    # ── Who forwarded ─────────────────────────────────────────────────────────
    forwarded_by         = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"),
                                  nullable=True, index=True)
    forwarder_name       = Column(String(255), nullable=True,
                                  comment="MDM approver name snapshot")
    forward_notes        = Column(Text, nullable=True,
                                  comment="Optional message from MDM approver to recipient")

    # ── Who was notified ──────────────────────────────────────────────────────
    notified_user_ids    = Column(Text, nullable=True,
                                  comment="Comma-separated user IDs who received notification")
    notified_user_names  = Column(Text, nullable=True,
                                  comment="Comma-separated user names snapshot")
    notified_count       = Column(Integer, default=0, nullable=False)

    # ── Status ────────────────────────────────────────────────────────────────
    status               = Column(String(30), nullable=False, default="sent",
                                  comment="sent | no_eligible_users | no_access")

    # ── When ─────────────────────────────────────────────────────────────────
    forwarded_at         = Column(DateTime(timezone=True), server_default=func.now(),
                                  nullable=False, index=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    item_request   = relationship("ItemBasicInfoItemMaster", foreign_keys=[entity_id])
    target_company = relationship("Company",    foreign_keys=[target_company_id])
    target_dept    = relationship("Department", foreign_keys=[target_dept_id])
    forwarder      = relationship("User",       foreign_keys=[forwarded_by])