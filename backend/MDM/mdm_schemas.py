"""
MDM/mdm_schemas.py
─────────────────────────────────────────────────────────────────────────────
Pydantic schemas for MDM Step 2 Audit / History tables
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from MDM.mdm_models import MdmActionTypeEnum, MdmEscalationReasonEnum


# ─────────────────────────────────────────────────────────────────────────────
#  MdmStep2AuditLog  —  Create & Response
# ─────────────────────────────────────────────────────────────────────────────

class MdmStep2AuditLogCreate(BaseModel):
    """
    Frontend ya workflow engine se ata hai jab Step 2+ action hoti hai.
    Zyada fields backend automatically fill karta hai (snapshots etc).
    """
    instance_id             : int
    step_instance_id        : Optional[int]   = None
    wf_action_id            : Optional[int]   = None

    entity_type             : str
    entity_id               : int
    request_id_snapshot     : Optional[str]   = None
    item_name_snapshot      : Optional[str]   = None
    item_type_snapshot      : Optional[str]   = None
    item_dept_snapshot      : Optional[str]   = None

    from_company_id         : Optional[int]   = None
    from_company_name       : Optional[str]   = None
    from_department_id      : Optional[int]   = None
    from_department_name    : Optional[str]   = None

    action_type             : MdmActionTypeEnum
    status_before           : Optional[str]   = None
    status_after            : Optional[str]   = None
    step_order_snapshot     : Optional[int]   = None
    step_name_snapshot      : Optional[str]   = None
    comments                : Optional[str]   = None

    performed_by            : Optional[int]   = None
    performer_name_snapshot : Optional[str]   = None
    performer_company_id    : Optional[int]   = None
    performer_company_name  : Optional[str]   = None
    performer_role_id       : Optional[int]   = None
    performer_role_name     : Optional[str]   = None
    performer_dept_id       : Optional[int]   = None
    performer_dept_name     : Optional[str]   = None
    performer_desg_id       : Optional[int]   = None
    performer_desg_name     : Optional[str]   = None

    action_count            : int             = 1
    is_within_sla           : Optional[bool]  = None
    sla_deadline_snapshot   : Optional[datetime] = None
    time_taken_hours        : Optional[int]   = None


class MdmStep2AuditLogResponse(MdmStep2AuditLogCreate):
    id           : int
    performed_at : datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  MdmStep2FieldChangeLog  —  Create & Response
# ─────────────────────────────────────────────────────────────────────────────

class MdmStep2FieldChangeCreate(BaseModel):
    audit_log_id    : int
    entity_type     : str
    entity_id       : int
    instance_id     : Optional[int]   = None
    field_name      : str
    table_name      : Optional[str]   = None
    old_value       : Optional[str]   = None
    new_value       : Optional[str]   = None
    changed_by      : Optional[int]   = None
    changer_name    : Optional[str]   = None
    change_reason   : Optional[str]   = None


class MdmStep2FieldChangeResponse(MdmStep2FieldChangeCreate):
    id          : int
    changed_at  : datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  MdmStep2SessionLog  —  Create & Response
# ─────────────────────────────────────────────────────────────────────────────

class MdmStep2SessionStart(BaseModel):
    """Frontend calls POST /mdm/session/start when user opens MDM My Req page."""
    user_id                 : int
    user_name_snapshot      : Optional[str]   = None
    ip_address              : Optional[str]   = None
    user_agent              : Optional[str]   = None
    page_url                : Optional[str]   = None
    approver_company_id     : Optional[int]   = None
    approver_company_name   : Optional[str]   = None


class MdmStep2SessionEnd(BaseModel):
    """Frontend calls PATCH /mdm/session/{id}/end when user leaves the page."""
    session_end             : Optional[datetime] = None
    session_duration_minutes: Optional[int]   = None
    actions_taken           : int             = 0
    approve_count           : int             = 0
    reject_count            : int             = 0
    return_count            : int             = 0
    view_count              : int             = 0
    entity_ids_acted        : Optional[str]   = None   # comma-separated


class MdmStep2SessionResponse(BaseModel):
    id                      : int
    user_id                 : int
    user_name_snapshot      : Optional[str]   = None
    session_start           : datetime
    session_end             : Optional[datetime] = None
    session_duration_minutes: Optional[int]   = None
    actions_taken           : int
    approve_count           : int
    reject_count            : int
    return_count            : int
    view_count              : int
    entity_ids_acted        : Optional[str]   = None
    ip_address              : Optional[str]   = None
    approver_company_name   : Optional[str]   = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  MdmStep2EscalationLog  —  Create & Response
# ─────────────────────────────────────────────────────────────────────────────

class MdmStep2EscalationCreate(BaseModel):
    instance_id             : int
    step_instance_id        : Optional[int]   = None
    entity_type             : str
    entity_id               : int
    item_name_snapshot      : Optional[str]   = None
    step_order_snapshot     : Optional[int]   = None
    step_name_snapshot      : Optional[str]   = None

    reason                  : MdmEscalationReasonEnum
    reason_note             : Optional[str]   = None
    sla_deadline            : Optional[datetime] = None
    hours_overdue           : Optional[int]   = None

    escalated_by            : Optional[int]   = None
    escalator_name          : Optional[str]   = None
    original_approver_id    : Optional[int]   = None
    original_approver_name  : Optional[str]   = None
    escalated_to_user_id    : Optional[int]   = None
    escalated_to_role_id    : Optional[int]   = None
    escalated_to_name       : Optional[str]   = None


class MdmStep2EscalationResolve(BaseModel):
    resolved_at             : Optional[datetime] = None
    resolution_action       : Optional[str]   = None   # "APPROVE" | "REJECT"
    resolved_by             : Optional[int]   = None


class MdmStep2EscalationResponse(MdmStep2EscalationCreate):
    id              : int
    escalated_at    : datetime
    is_resolved     : bool
    resolved_at     : Optional[datetime] = None
    resolution_action: Optional[str]    = None
    resolved_by     : Optional[int]     = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  ANALYTICS RESPONSE SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────

class MdmApproverStats(BaseModel):
    """Per-approver summary: kitni baar, kitne approve/reject/return."""
    user_id             : int
    user_name           : Optional[str] = None
    total_actions       : int
    approve_count       : int
    reject_count        : int
    return_count        : int
    comment_count       : int
    avg_time_taken_hours: Optional[float] = None
    last_action_at      : Optional[datetime] = None


class MdmRequestHistory(BaseModel):
    """
    Full history for one request:
    list of all Step 2+ audit log entries, field changes, escalations.
    """
    entity_type     : str
    entity_id       : int
    request_id      : Optional[str] = None
    item_name       : Optional[str] = None
    audit_entries   : List[MdmStep2AuditLogResponse]    = []
    field_changes   : List[MdmStep2FieldChangeResponse] = []
    escalations     : List[MdmStep2EscalationResponse]  = []