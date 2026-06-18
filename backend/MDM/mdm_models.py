"""
MDM/mdm_models.py
─────────────────────────────────────────────────────────────────────────────
MDM (Master Data Management) — Advanced Audit & History Tables
─────────────────────────────────────────────────────────────────────────────

PURPOSE
-------
Yeh file MDM Step 2+ workflow ke liye advance-level audit/history tracking
provide karti hai. Existing workflow_models.py ki WorkflowAction table se
zyada granular aur MDM-specific logging yahan hoti hai.

TABLES
------
  1. MdmStep2AuditLog
     ─ Every Step 2+ approver action ka complete snapshot:
       kya tha (before), kya kiya (action), kya ho gaya (after),
       kisne kiya, kab kiya, kitne baar kiya, kis company/dept se aaya,
       kis company/role ne approve/reject/return kiya — A to Z history.

  2. MdmStep2FieldChangeLog
     ─ Jab bhi koi Step 2 approver request ke fields change karta hai
       (e.g. item_type correct karna, description update karna), har field
       ka old → new value record hota hai. Line-item level audit.

  3. MdmStep2SessionLog
     ─ Har baar jab koi Step 2 approver MDM My Req page open karta hai
       aur kisi request pe action leta hai uska session log:
       IP, user agent, session duration, kaunse actions liye, kab login/logout.

  4. MdmStep2EscalationLog
     ─ Agar koi request SLA breach karti hai ya manually escalate hoti hai
       to uska log: kaun escalate kiya, kisko, kab, kyun.

DESIGN NOTES
─────────────────────────────────────────────────────────────────────────────
  • Yeh sab tables APPEND-ONLY hain — koi row kabhi UPDATE ya DELETE nahi hoti.
  • Foreign keys sirf workflow_models.py aur user_models.py ki tables pe hain —
    nayi dependent tables MDM ke bahar nahi banaye gaye.
  • main.py mein import karke Base.metadata.create_all() se tables ban jayenge.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, Enum as SAEnum, func, Index, BigInteger
)
from sqlalchemy.orm import relationship
import enum
from database import Base


# ═══════════════════════════════════════════════════════════════════════════════
#  ENUMS (MDM-specific)
# ═══════════════════════════════════════════════════════════════════════════════

class MdmActionTypeEnum(str, enum.Enum):
    """What action did the Step 2+ approver take?"""
    APPROVE   = "APPROVE"
    REJECT    = "REJECT"
    RETURN    = "RETURN"
    COMMENT   = "COMMENT"
    VIEW      = "VIEW"         # only viewed, no decision yet
    ESCALATE  = "ESCALATE"     # manually escalated to higher authority


class MdmEscalationReasonEnum(str, enum.Enum):
    SLA_BREACH      = "SLA_BREACH"       # SLA deadline crossed
    MANUAL          = "MANUAL"           # manually escalated by approver
    AUTO_REASSIGN   = "AUTO_REASSIGN"    # system auto-reassigned
    APPROVER_ABSENT = "APPROVER_ABSENT"  # original approver unavailable


# ═══════════════════════════════════════════════════════════════════════════════
#  1.  MdmStep2AuditLog  —  Complete A-to-Z history of every Step 2+ action
# ═══════════════════════════════════════════════════════════════════════════════

class MdmStep2AuditLog(Base):
    """
    Immutable, append-only audit log for every Step 2+ approver action.

    Captures the COMPLETE context at the time of action:
      • Which request (entity_type + entity_id + request_id snapshot)
      • Which workflow instance + step
      • What the status WAS before (status_before)
      • What action was taken (action_type)
      • What the status BECAME after (status_after)
      • Who took the action (performed_by) — with their company, role,
        department, designation snapshots at that moment
      • FROM where the request came (request's company + dept)
      • When it happened (performed_at)
      • How many times this specific user has acted on this request (action_count)
      • Comments / reason provided
      • Whether this was within SLA deadline

    WHY THIS IS BETTER THAN WorkflowAction ALONE:
      WorkflowAction has: instance_id, step_instance_id, action_type,
      performed_by, comments, created_at — enough for basic flow.

      MdmStep2AuditLog ALSO has:
        ✅ status_before / status_after   (before-after snapshot)
        ✅ approver company/role/dept/desg snapshots (at time of action)
        ✅ request's company + dept snapshots (kahan se aaya)
        ✅ action_count (kitni baar is user ne is request pe action liya)
        ✅ is_within_sla (SLA mein tha ya breach hua)
        ✅ step_order_snapshot (konsa step tha)
        ✅ item_name_snapshot, item_type_snapshot (item details at action time)
        ✅ wf_action_id link (maps back to WorkflowAction for join queries)
    """
    __tablename__ = "mdm_step2_audit_log"

    id                      = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    # ── Workflow linkage ───────────────────────────────────────────────────────
    instance_id             = Column(Integer, ForeignKey("wf_instance.id",       ondelete="CASCADE"),    nullable=False, index=True)
    step_instance_id        = Column(Integer, ForeignKey("wf_step_instance.id",  ondelete="SET NULL"),   nullable=True,  index=True)
    wf_action_id            = Column(Integer, ForeignKey("wf_action.id",         ondelete="SET NULL"),   nullable=True,  index=True)

    # ── Request identity snapshots (copied at action time, immune to future edits) ─
    entity_type             = Column(String(100), nullable=False)           # e.g. "ITEM_CREATION"
    entity_id               = Column(Integer,     nullable=False, index=True)
    request_id_snapshot     = Column(String(50),  nullable=True)            # e.g. "ICR-20240315-00001"
    item_name_snapshot      = Column(String(255), nullable=True)
    item_type_snapshot      = Column(String(100), nullable=True)
    item_dept_snapshot      = Column(String(150), nullable=True)            # department field on item

    # ── FROM: request's company + dept at time of action ──────────────────────
    from_company_id         = Column(Integer, ForeignKey("companies.id",    ondelete="SET NULL"), nullable=True)
    from_company_name       = Column(String(255), nullable=True)            # snapshot
    from_department_id      = Column(Integer, ForeignKey("departments.id",  ondelete="SET NULL"), nullable=True)
    from_department_name    = Column(String(150), nullable=True)            # snapshot

    # ── Action details ─────────────────────────────────────────────────────────
    action_type             = Column(SAEnum(MdmActionTypeEnum), nullable=False, index=True)
    status_before           = Column(String(50),  nullable=True)            # e.g. "IN_REVIEW"
    status_after            = Column(String(50),  nullable=True)            # e.g. "APPROVED"
    step_order_snapshot     = Column(Integer,     nullable=True)            # step number (2, 3, …)
    step_name_snapshot      = Column(String(255), nullable=True)
    comments                = Column(Text,        nullable=True)

    # ── WHO took the action — approver identity snapshots ─────────────────────
    performed_by            = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    performer_name_snapshot = Column(String(255), nullable=True)            # full_name at action time
    performer_company_id    = Column(Integer, ForeignKey("companies.id",    ondelete="SET NULL"), nullable=True)
    performer_company_name  = Column(String(255), nullable=True)            # snapshot
    performer_role_id       = Column(Integer, ForeignKey("roles.id",        ondelete="SET NULL"), nullable=True)
    performer_role_name     = Column(String(150), nullable=True)            # snapshot
    performer_dept_id       = Column(Integer, ForeignKey("departments.id",  ondelete="SET NULL"), nullable=True)
    performer_dept_name     = Column(String(150), nullable=True)            # snapshot
    performer_desg_id       = Column(Integer, ForeignKey("designations.id", ondelete="SET NULL"), nullable=True)
    performer_desg_name     = Column(String(150), nullable=True)            # snapshot

    # ── Frequency / SLA tracking ───────────────────────────────────────────────
    # action_count: kitni baar is user ne is same instance pe action liya hai
    # (1 = pehli baar, 2 = doosri baar after resubmit, etc.)
    action_count            = Column(Integer, default=1, nullable=False)
    is_within_sla           = Column(Boolean, nullable=True)                # NULL = no SLA configured
    sla_deadline_snapshot   = Column(DateTime(timezone=True), nullable=True) # SLA deadline at action time
    time_taken_hours        = Column(Integer, nullable=True)                # hours from step_start to action

    # ── Timestamp ─────────────────────────────────────────────────────────────
    performed_at            = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # ── Relationships ──────────────────────────────────────────────────────────
    performer               = relationship("User",        foreign_keys=[performed_by])
    from_company            = relationship("Company",     foreign_keys=[from_company_id])
    from_department         = relationship("Department",  foreign_keys=[from_department_id])
    performer_company       = relationship("Company",     foreign_keys=[performer_company_id])
    performer_role          = relationship("Role",        foreign_keys=[performer_role_id])
    performer_dept          = relationship("Department",  foreign_keys=[performer_dept_id])
    performer_desg          = relationship("Designation", foreign_keys=[performer_desg_id])

    __table_args__ = (
        Index("ix_mdm_audit_instance_step", "instance_id", "step_order_snapshot"),
        Index("ix_mdm_audit_performer_entity", "performed_by", "entity_id"),
        Index("ix_mdm_audit_from_company", "from_company_id", "performed_at"),
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  2.  MdmStep2FieldChangeLog  —  Field-level before→after changes
# ═══════════════════════════════════════════════════════════════════════════════

class MdmStep2FieldChangeLog(Base):
    """
    Line-item level audit: jab koi Step 2 approver ya submitter (after RETURN)
    request ke kisi field ki value change karta hai.

    One row per field per change event.

    Example:
      audit_log_id=55, field_name="item_type",
      old_value="Raw Material", new_value="Finished Goods",
      changed_by=12, changed_at=...

    This answers: "Who changed what field, from what value, to what value, when?"

    linked_audit_log_id → links back to MdmStep2AuditLog row for context.
    """
    __tablename__ = "mdm_step2_field_change_log"

    id                  = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    # Link back to the parent audit log entry
    audit_log_id        = Column(
        BigInteger,
        ForeignKey("mdm_step2_audit_log.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    # Which entity this change belongs to
    entity_type         = Column(String(100), nullable=False)
    entity_id           = Column(Integer,     nullable=False, index=True)
    instance_id         = Column(Integer,     ForeignKey("wf_instance.id", ondelete="CASCADE"), nullable=True)

    # Field-level change
    field_name          = Column(String(150), nullable=False)   # e.g. "item_type", "department"
    table_name          = Column(String(150), nullable=True)    # e.g. "item_basic_info_item_master"
    old_value           = Column(Text,        nullable=True)    # value before change (stringified)
    new_value           = Column(Text,        nullable=True)    # value after change  (stringified)

    # Who changed it + when
    changed_by          = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    changer_name        = Column(String(255), nullable=True)    # snapshot
    changed_at          = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Optional: reason for the change (approver's note or return comment)
    change_reason       = Column(Text, nullable=True)

    # Relationships
    changer             = relationship("User", foreign_keys=[changed_by])

    __table_args__ = (
        Index("ix_mdm_field_entity_field", "entity_id", "field_name"),
        Index("ix_mdm_field_changed_by",   "changed_by", "changed_at"),
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  3.  MdmStep2SessionLog  —  Approver page session tracking
# ═══════════════════════════════════════════════════════════════════════════════

class MdmStep2SessionLog(Base):
    """
    Tracks every time a Step 2 approver accesses MDM My Req page and
    takes any action. Session-level aggregated view.

    One row = one page visit session.

    Answers:
      • Kitni baar user ne MDM page open kiya?
      • Har session mein kitna time spend kiya?
      • Ek session mein kitne requests approve/reject/return kiye?
      • Kaunse entity_ids pe action liya?

    session_start / session_end are managed by frontend via
    POST /mdm/session/start and PATCH /mdm/session/{id}/end endpoints.
    """
    __tablename__ = "mdm_step2_session_log"

    id                      = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    user_id                 = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),  nullable=False, index=True)
    user_name_snapshot      = Column(String(255), nullable=True)

    session_start           = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    session_end             = Column(DateTime(timezone=True), nullable=True)
    session_duration_minutes= Column(Integer, nullable=True)    # calculated on session_end

    # How many actions were taken in this session
    actions_taken           = Column(Integer, default=0, nullable=False)
    approve_count           = Column(Integer, default=0, nullable=False)
    reject_count            = Column(Integer, default=0, nullable=False)
    return_count            = Column(Integer, default=0, nullable=False)
    view_count              = Column(Integer, default=0, nullable=False)

    # Which entity_ids were acted upon (comma-separated for simplicity)
    entity_ids_acted        = Column(Text, nullable=True)   # e.g. "12,15,18"

    # Client context (optional, filled by frontend if available)
    ip_address              = Column(String(50),  nullable=True)
    user_agent              = Column(String(500), nullable=True)
    page_url                = Column(String(255), nullable=True)    # e.g. "/mdm-my-req"

    # Company context of the approver during this session
    approver_company_id     = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    approver_company_name   = Column(String(255), nullable=True)

    # Relationships
    user                    = relationship("User", foreign_keys=[user_id])
    approver_company        = relationship("Company", foreign_keys=[approver_company_id])

    __table_args__ = (
        Index("ix_mdm_session_user_start", "user_id", "session_start"),
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  4.  MdmStep2EscalationLog  —  SLA breach & escalation tracking
# ═══════════════════════════════════════════════════════════════════════════════

class MdmStep2EscalationLog(Base):
    """
    Append-only log of every escalation event for a Step 2+ request.

    An escalation happens when:
      1. SLA deadline is crossed (auto-detected)
      2. Approver manually escalates to a higher authority
      3. System auto-reassigns due to approver absence

    Answers:
      • Kaun kaun si requests SLA breach karti hain?
      • Kisko escalate kiya gaya, kab, kyun?
      • Escalate karne ke baad kitne time mein resolve hua?
    """
    __tablename__ = "mdm_step2_escalation_log"

    id                      = Column(BigInteger, primary_key=True, autoincrement=True, index=True)

    instance_id             = Column(Integer, ForeignKey("wf_instance.id",      ondelete="CASCADE"),   nullable=False, index=True)
    step_instance_id        = Column(Integer, ForeignKey("wf_step_instance.id", ondelete="SET NULL"),  nullable=True)

    entity_type             = Column(String(100), nullable=False)
    entity_id               = Column(Integer,     nullable=False, index=True)
    item_name_snapshot      = Column(String(255), nullable=True)
    step_order_snapshot     = Column(Integer,     nullable=True)
    step_name_snapshot      = Column(String(255), nullable=True)

    # Escalation type
    reason                  = Column(SAEnum(MdmEscalationReasonEnum), nullable=False)
    reason_note             = Column(Text, nullable=True)       # free-text reason

    # SLA details at time of escalation
    sla_deadline            = Column(DateTime(timezone=True), nullable=True)
    escalated_at            = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    hours_overdue           = Column(Integer, nullable=True)    # how many hours past SLA

    # Who escalated (NULL if system/auto)
    escalated_by            = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    escalator_name          = Column(String(255), nullable=True)

    # Who was the original approver that didn't act
    original_approver_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    original_approver_name  = Column(String(255), nullable=True)

    # Who it was escalated TO
    escalated_to_user_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    escalated_to_role_id    = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    escalated_to_name       = Column(String(255), nullable=True)

    # Was it resolved? (updated in-place ONLY for resolved_at — rest is immutable)
    is_resolved             = Column(Boolean, default=False, nullable=False)
    resolved_at             = Column(DateTime(timezone=True), nullable=True)
    resolution_action       = Column(String(50), nullable=True)  # e.g. "APPROVE", "REJECT"
    resolved_by             = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    escalator               = relationship("User", foreign_keys=[escalated_by])
    original_approver       = relationship("User", foreign_keys=[original_approver_id])
    escalated_to_user       = relationship("User", foreign_keys=[escalated_to_user_id])
    escalated_to_role       = relationship("Role", foreign_keys=[escalated_to_role_id])
    resolver                = relationship("User", foreign_keys=[resolved_by])

    __table_args__ = (
        Index("ix_mdm_escalation_instance", "instance_id", "escalated_at"),
        Index("ix_mdm_escalation_unresolved", "is_resolved", "escalated_at"),
    )