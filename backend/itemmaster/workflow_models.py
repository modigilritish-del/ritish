"""
itemmaster/workflow_models.py
─────────────────────────────────────────────────────────────────────────────
Dynamic Approval Workflow Engine  –  Item Master Module
─────────────────────────────────────────────────────────────────────────────

DESIGN PHILOSOPHY
-----------------
Fully normalised, ERP-grade, zero hard-coding.

Three concerns are kept SEPARATE:

  1. WORKFLOW DEFINITION  – admin defines steps, who approves each step
     WorkflowTemplate      → one template per "process" (e.g. Item Creation)
     WorkflowStep          → ordered steps inside a template
     WorkflowStepApprover  → which Role+Dept+Desg approves each step
                             (multiple approvers per step = parallel approval)

  2. WORKFLOW INSTANCE    – one live run per submitted document
     WorkflowInstance      → ties a template to a specific request
     WorkflowStepInstance  → live state of every step for this run
     WorkflowAction        → immutable audit log of every approve/reject/return

  3. NOTIFICATION CONFIG  – who gets notified at each step / event
     WorkflowNotification  → role+dept+desg + event type

WHY THIS IS DYNAMIC
-------------------
* Add a new process?  → insert a WorkflowTemplate + Steps + Approvers.
  No code change needed.

* Add a new approver to a step?  → insert a WorkflowStepApprover row.

* Change step order?  → update step_order column.

* Multi-level approval (L1 → L2 → L3)?  → add more steps.

* Parallel approval (Finance AND Quality both must approve)?
  → add two WorkflowStepApprover rows for the same step,
    set approval_type = 'ALL'.

* Any-one-of approval?  → set approval_type = 'ANY'.

* Conditional routing?  → use condition_field + condition_value on a step.

This means the ENTIRE ERP can use this single engine for:
  Item Creation, PO Approval, GRN, Invoice, Vendor Onboarding …
  Just add a new WorkflowTemplate.
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, UniqueConstraint, Enum as SAEnum, func, Index
)
from sqlalchemy.orm import relationship
import enum
from database import Base


# ═══════════════════════════════════════════════════════════════════════════════
#  ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowStatusEnum(str, enum.Enum):
    DRAFT      = "DRAFT"       # saved but not submitted
    PENDING    = "PENDING"     # submitted, waiting for first approver
    IN_REVIEW  = "IN_REVIEW"   # at least one step started
    APPROVED   = "APPROVED"    # all steps approved
    REJECTED   = "REJECTED"    # any step rejected (final)
    RETURNED   = "RETURNED"    # returned to submitter for correction
    CANCELLED  = "CANCELLED"   # cancelled by submitter


class StepStatusEnum(str, enum.Enum):
    PENDING   = "PENDING"
    APPROVED  = "APPROVED"
    REJECTED  = "REJECTED"
    RETURNED  = "RETURNED"
    SKIPPED   = "SKIPPED"     # conditional step skipped


class ActionTypeEnum(str, enum.Enum):
    SUBMIT   = "SUBMIT"
    APPROVE  = "APPROVE"
    REJECT   = "REJECT"
    RETURN   = "RETURN"       # send back to submitter
    REASSIGN = "REASSIGN"
    CANCEL   = "CANCEL"
    COMMENT  = "COMMENT"      # comment without decision


class ApprovalTypeEnum(str, enum.Enum):
    ANY = "ANY"   # any one approver in the step is enough
    ALL = "ALL"   # all listed approvers must approve


class NotificationEventEnum(str, enum.Enum):
    ON_SUBMIT    = "ON_SUBMIT"
    ON_APPROVE   = "ON_APPROVE"
    ON_REJECT    = "ON_REJECT"
    ON_RETURN    = "ON_RETURN"
    ON_COMPLETE  = "ON_COMPLETE"


# ═══════════════════════════════════════════════════════════════════════════════
#  1.  WORKFLOW DEFINITION TABLES
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowTemplate(Base):
    """
    One row = one process type.
    e.g.  code="ITEM_CREATION"  name="Item Code Creation Request"
          code="PO_APPROVAL"    name="Purchase Order Approval"
    """
    __tablename__ = "wf_template"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    code         = Column(String(50),  nullable=False, unique=True, index=True)
    name         = Column(String(255), nullable=False)
    description  = Column(Text, nullable=True)
    is_active    = Column(Boolean, default=True)
    # which company this template belongs to (NULL = global / all companies)
    company_id   = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)

    # which frontend page this template is for (e.g. "item-code-creation-req")
    # matches adminworkflowlinks.js path values
    entity_page  = Column(String(200), nullable=True, index=True)

    # who created / last updated this template
    created_by   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by   = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    company      = relationship("Company", foreign_keys=[company_id])
    creator      = relationship("User",    foreign_keys=[created_by])
    updater      = relationship("User",    foreign_keys=[updated_by])
    steps        = relationship("WorkflowStep", back_populates="template",
                                order_by="WorkflowStep.step_order",
                                cascade="all, delete-orphan")
    instances    = relationship("WorkflowInstance", back_populates="template")


class WorkflowStep(Base):
    """
    One row = one step inside a template.
    Steps are ordered by step_order (1, 2, 3 …).

    condition_field / condition_value  →  optional skip logic
      e.g. condition_field="item_type"  condition_value="Capital"
      means this step only activates when item_type == "Capital"
      (evaluated at runtime by the engine)
    """
    __tablename__ = "wf_step"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    template_id      = Column(Integer, ForeignKey("wf_template.id", ondelete="CASCADE"), nullable=False)
    step_order       = Column(Integer, nullable=False)          # 1-based
    step_name        = Column(String(255), nullable=False)      # e.g. "HOD Review"
    step_description = Column(Text, nullable=True)
    approval_type    = Column(SAEnum(ApprovalTypeEnum), default=ApprovalTypeEnum.ANY, nullable=False)
    is_active        = Column(Boolean, default=True)

    # Optional conditional skip
    condition_field  = Column(String(100), nullable=True)   # field name on the request
    condition_value  = Column(String(255), nullable=True)   # value that activates this step
    condition_op     = Column(String(20),  nullable=True)   # "eq" | "neq" | "gt" | "lt"

    # SLA in hours (0 = no SLA)
    sla_hours        = Column(Integer, default=0)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("template_id", "step_order", name="uq_template_step_order"),
    )

    # Relationships
    template         = relationship("WorkflowTemplate", back_populates="steps")
    approvers        = relationship("WorkflowStepApprover", back_populates="step",
                                    cascade="all, delete-orphan")
    step_instances   = relationship("WorkflowStepInstance", back_populates="step")


class WorkflowStepApprover(Base):
    """
    Who can approve a specific step.
    Matched against the logged-in user's UserCompanyAccess row.

    NULL in any of role_id / department_id / designation_id = wildcard.
    e.g.  role_id=5, department_id=NULL, designation_id=NULL
          → anyone with role 5 (any dept, any desg) can approve this step.
    """
    __tablename__ = "wf_step_approver"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    step_id         = Column(Integer, ForeignKey("wf_step.id", ondelete="CASCADE"), nullable=False)

    # TO: approver identity — matched against UserCompanyAccess of the acting user
    role_id         = Column(Integer, ForeignKey("roles.id",        ondelete="CASCADE"), nullable=True)
    department_id   = Column(Integer, ForeignKey("departments.id",  ondelete="CASCADE"), nullable=True)
    designation_id  = Column(Integer, ForeignKey("designations.id", ondelete="CASCADE"), nullable=True)
    company_id      = Column(Integer, ForeignKey("companies.id",    ondelete="CASCADE"), nullable=True)

    # TO: specific user assignment (optional, overrides role/dept/desg matching if set)
    user_id         = Column(Integer, ForeignKey("users.id",        ondelete="SET NULL"), nullable=True)

    # FROM: request origin filter — NULL = wildcard (any company / any department)
    from_company_id    = Column(Integer, ForeignKey("companies.id",   ondelete="SET NULL"), nullable=True)
    from_department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    is_active       = Column(Boolean, default=True)

    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    step            = relationship("WorkflowStep", back_populates="approvers")
    role            = relationship("Role",        foreign_keys=[role_id])
    department      = relationship("Department",  foreign_keys=[department_id])
    designation     = relationship("Designation", foreign_keys=[designation_id])
    company         = relationship("Company",     foreign_keys=[company_id])
    user            = relationship("User",        foreign_keys=[user_id])
    from_company    = relationship("Company",     foreign_keys=[from_company_id])
    from_department = relationship("Department",  foreign_keys=[from_department_id])


# ═══════════════════════════════════════════════════════════════════════════════
#  2.  WORKFLOW INSTANCE TABLES  (live runs)
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowInstance(Base):
    """
    One row = one live approval run for one specific request.

    entity_type  →  which module/table  (e.g. "ITEM_CREATION")
    entity_id    →  the PK of that record  (e.g. ItemBasicInfoItemMaster.id)

    This design lets the same engine handle ANY entity —
    just pass a different entity_type + entity_id.
    """
    __tablename__ = "wf_instance"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    template_id      = Column(Integer, ForeignKey("wf_template.id", ondelete="RESTRICT"), nullable=False)
    entity_type      = Column(String(100), nullable=False)   # "ITEM_CREATION"
    entity_id        = Column(Integer,     nullable=False)   # FK to the actual record
    status           = Column(SAEnum(WorkflowStatusEnum), default=WorkflowStatusEnum.DRAFT, nullable=False)

    submitted_by     = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at     = Column(DateTime(timezone=True), nullable=True)
    completed_at     = Column(DateTime(timezone=True), nullable=True)

    # Which step is currently active (NULL when DRAFT or COMPLETED)
    current_step_id  = Column(Integer, ForeignKey("wf_step.id", ondelete="SET NULL"), nullable=True)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        # One active instance per entity at a time
        UniqueConstraint("entity_type", "entity_id", name="uq_instance_entity"),
        Index("ix_wf_instance_entity", "entity_type", "entity_id"),
    )

    # Relationships
    template         = relationship("WorkflowTemplate", back_populates="instances")
    submitter        = relationship("User", foreign_keys=[submitted_by])
    current_step     = relationship("WorkflowStep", foreign_keys=[current_step_id])
    step_instances   = relationship("WorkflowStepInstance", back_populates="instance",
                                    order_by="WorkflowStepInstance.step_order_snapshot",
                                    cascade="all, delete-orphan")
    actions          = relationship("WorkflowAction", back_populates="instance",
                                    order_by="WorkflowAction.created_at",
                                    cascade="all, delete-orphan")


class WorkflowStepInstance(Base):
    """
    One row per step per instance.
    Created when the workflow is submitted (all steps pre-created as PENDING).
    step_order_snapshot is copied from WorkflowStep at submission time
    so that future template changes don't affect running instances.
    """
    __tablename__ = "wf_step_instance"

    id                    = Column(Integer, primary_key=True, autoincrement=True)
    instance_id           = Column(Integer, ForeignKey("wf_instance.id", ondelete="CASCADE"), nullable=False)
    step_id               = Column(Integer, ForeignKey("wf_step.id",     ondelete="RESTRICT"), nullable=False)
    step_order_snapshot   = Column(Integer, nullable=False)
    step_name_snapshot    = Column(String(255), nullable=False)
    approval_type_snapshot= Column(SAEnum(ApprovalTypeEnum), nullable=False)
    status                = Column(SAEnum(StepStatusEnum), default=StepStatusEnum.PENDING, nullable=False)
    is_skipped            = Column(Boolean, default=False)

    assigned_to_role_id   = Column(Integer, ForeignKey("roles.id",        ondelete="SET NULL"), nullable=True)
    assigned_to_dept_id   = Column(Integer, ForeignKey("departments.id",  ondelete="SET NULL"), nullable=True)
    assigned_to_desg_id   = Column(Integer, ForeignKey("designations.id", ondelete="SET NULL"), nullable=True)

    started_at            = Column(DateTime(timezone=True), nullable=True)
    completed_at          = Column(DateTime(timezone=True), nullable=True)
    due_at                = Column(DateTime(timezone=True), nullable=True)  # SLA deadline

    created_at            = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    instance              = relationship("WorkflowInstance", back_populates="step_instances")
    step                  = relationship("WorkflowStep", back_populates="step_instances")
    actions               = relationship("WorkflowAction", back_populates="step_instance")
    assigned_role         = relationship("Role",        foreign_keys=[assigned_to_role_id])
    assigned_dept         = relationship("Department",  foreign_keys=[assigned_to_dept_id])
    assigned_desg         = relationship("Designation", foreign_keys=[assigned_to_desg_id])


class WorkflowAction(Base):
    """
    Immutable audit trail.
    Every action (submit, approve, reject, comment …) is logged here.
    NEVER update or delete rows in this table.
    """
    __tablename__ = "wf_action"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    instance_id      = Column(Integer, ForeignKey("wf_instance.id",      ondelete="CASCADE"), nullable=False)
    step_instance_id = Column(Integer, ForeignKey("wf_step_instance.id", ondelete="SET NULL"), nullable=True)
    action_type      = Column(SAEnum(ActionTypeEnum), nullable=False)
    performed_by     = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    comments         = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    instance         = relationship("WorkflowInstance", back_populates="actions")
    step_instance    = relationship("WorkflowStepInstance", back_populates="actions")
    performer        = relationship("User", foreign_keys=[performed_by])


# ═══════════════════════════════════════════════════════════════════════════════
#  WORKFLOW PAGE REGISTRY
#  Audit table: which page → which template, created by whom and when.
#  One row per (page_path, template) link.  Immutable — never updated.
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowPageRegistry(Base):
    """
    Audit / registry table that records every time a workflow template
    is linked to a frontend page path.

    entity_page   →  page path from adminworkflowlinks.js
                     e.g. "item-code-creation-req"
    template_id   →  the WorkflowTemplate that was configured for this page
    created_by    →  admin user who created/linked the template
    created_at    →  when the link was made

    This table is APPEND-ONLY (no updates). If a template is replaced,
    a new row is inserted and the old row's is_active is set to False.
    """
    __tablename__ = "wf_page_registry"

    id            = Column(Integer, primary_key=True, autoincrement=True)

    # Frontend page this template is configured for
    entity_page   = Column(String(200), nullable=False, index=True)
    page_name     = Column(String(255), nullable=True)   # human-readable label

    # The template linked to this page
    template_id   = Column(Integer, ForeignKey("wf_template.id", ondelete="CASCADE"), nullable=False)

    # Audit: who did this, when
    created_by    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    # Soft flag — False means this mapping was superseded by a newer one
    is_active     = Column(Boolean, default=True, nullable=False)

    # Relationships
    template      = relationship("WorkflowTemplate")
    creator       = relationship("User", foreign_keys=[created_by])


# ═══════════════════════════════════════════════════════════════════════════════
#  3.  NOTIFICATION CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowNotification(Base):
    """
    Which role+dept+desg gets notified on which event for a given template/step.
    step_id = NULL → applies to all steps in the template.
    """
    __tablename__ = "wf_notification"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    template_id    = Column(Integer, ForeignKey("wf_template.id", ondelete="CASCADE"), nullable=False)
    step_id        = Column(Integer, ForeignKey("wf_step.id",     ondelete="CASCADE"), nullable=True)
    event          = Column(SAEnum(NotificationEventEnum), nullable=False)
    role_id        = Column(Integer, ForeignKey("roles.id",        ondelete="CASCADE"), nullable=True)
    department_id  = Column(Integer, ForeignKey("departments.id",  ondelete="CASCADE"), nullable=True)
    designation_id = Column(Integer, ForeignKey("designations.id", ondelete="CASCADE"), nullable=True)
    notify_submitter = Column(Boolean, default=False)  # also notify the original submitter
    is_active      = Column(Boolean, default=True)

    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    template       = relationship("WorkflowTemplate")
    step           = relationship("WorkflowStep")
    role           = relationship("Role",        foreign_keys=[role_id])
    department     = relationship("Department",  foreign_keys=[department_id])
    designation    = relationship("Designation", foreign_keys=[designation_id])


# ═══════════════════════════════════════════════════════════════════════════════
#  4.  USER NOTIFICATION INBOX
#  Per-user notification rows — created automatically by take_action on
#  APPROVE / REJECT / RETURN events.  Never updated, only read + mark-read.
# ═══════════════════════════════════════════════════════════════════════════════

class WorkflowUserNotification(Base):
    """
    One row = one notification delivered to one specific user.

    Created automatically when:
      APPROVE → submitter is notified their request moved forward / was fully approved
      REJECT  → submitter is notified their request was rejected (with reason)
      RETURN  → submitter is notified with rollback details
                 (which fields to fix + description written by approver)

    Columns
    -------
    user_id       : the user who receives this notification (always the submitter)
    instance_id   : which workflow instance this is about
    entity_type   : e.g. "ITEM_CREATION"  (for deep-link navigation)
    entity_id     : the underlying record id  (e.g. item_basic_info_item_master.id)
    event         : APPROVE | REJECT | RETURN
    title         : short human-readable title  e.g. "Your request was approved ✅"
    body          : full message — for RETURN includes which fields + description
    triggered_by  : user_id of the approver who triggered this
    is_read       : False = unread (shows badge), True = user has seen it
    read_at       : when the user marked it read
    """
    __tablename__ = "wf_user_notification"

    id            = Column(Integer, primary_key=True, autoincrement=True, index=True)

    user_id       = Column(Integer, ForeignKey("users.id",       ondelete="CASCADE"),  nullable=False, index=True)
    instance_id   = Column(Integer, ForeignKey("wf_instance.id", ondelete="CASCADE"),  nullable=False, index=True)

    entity_type   = Column(String(100), nullable=True)
    entity_id     = Column(Integer,     nullable=True)

    event         = Column(SAEnum(ActionTypeEnum), nullable=False)  # APPROVE | REJECT | RETURN

    title         = Column(String(255), nullable=False)
    body          = Column(Text,        nullable=True)

    triggered_by  = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    is_read       = Column(Boolean, default=False, nullable=False)
    read_at       = Column(DateTime(timezone=True), nullable=True)

    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user          = relationship("User", foreign_keys=[user_id])
    trigger_user  = relationship("User", foreign_keys=[triggered_by])
    instance      = relationship("WorkflowInstance")