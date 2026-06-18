"""
itemmaster/workflow_schemas.py
Pydantic schemas for Dynamic Approval Workflow Engine
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from itemmaster.workflow_models import (
    WorkflowStatusEnum, StepStatusEnum, ActionTypeEnum,
    ApprovalTypeEnum, NotificationEventEnum
)


# ─────────────────────────────────────────────────────────────────────────────
#  BRIEF helpers (used inside nested responses)
# ─────────────────────────────────────────────────────────────────────────────

class RoleBrief(BaseModel):
    id: int
    role_name: str
    class Config: from_attributes = True

class DeptBrief(BaseModel):
    id: int
    department_name: str
    class Config: from_attributes = True

class DesgBrief(BaseModel):
    id: int
    designation_name: str
    class Config: from_attributes = True

class CompanyBrief(BaseModel):
    id: int
    company_name: str
    class Config: from_attributes = True

class UserBrief(BaseModel):
    id: int
    full_name: Optional[str] = None
    class Config: from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  WORKFLOW STEP APPROVER
# ─────────────────────────────────────────────────────────────────────────────

class StepApproverCreate(BaseModel):
    role_id:            Optional[int] = None
    department_id:      Optional[int] = None
    designation_id:     Optional[int] = None
    company_id:         Optional[int] = None
    user_id:            Optional[int] = None   # specific user assignment (optional)
    from_company_id:    Optional[int] = None
    from_department_id: Optional[int] = None
    is_active:          Optional[bool] = True

class StepApproverResponse(StepApproverCreate):
    id:              int
    step_id:         int
    is_active:       bool
    role:            Optional[RoleBrief] = None
    department:      Optional[DeptBrief] = None
    designation:     Optional[DesgBrief] = None
    company:         Optional[CompanyBrief] = None
    user:            Optional[UserBrief] = None
    class Config: from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  WORKFLOW STEP
# ─────────────────────────────────────────────────────────────────────────────

class WorkflowStepCreate(BaseModel):
    step_order:       int
    step_name:        str
    step_description: Optional[str] = None
    approval_type:    ApprovalTypeEnum = ApprovalTypeEnum.ANY
    condition_field:  Optional[str] = None
    condition_value:  Optional[str] = None
    condition_op:     Optional[str] = None   # "eq" | "neq" | "gt" | "lt"
    sla_hours:        int = 0
    approvers:        List[StepApproverCreate] = []

class WorkflowStepUpdate(BaseModel):
    step_order:       Optional[int] = None
    step_name:        Optional[str] = None
    step_description: Optional[str] = None
    approval_type:    Optional[ApprovalTypeEnum] = None
    condition_field:  Optional[str] = None
    condition_value:  Optional[str] = None
    condition_op:     Optional[str] = None
    sla_hours:        Optional[int] = None
    is_active:        Optional[bool] = None

class WorkflowStepResponse(BaseModel):
    id:               int
    template_id:      int
    step_order:       int
    step_name:        str
    step_description: Optional[str] = None
    approval_type:    ApprovalTypeEnum
    condition_field:  Optional[str] = None
    condition_value:  Optional[str] = None
    condition_op:     Optional[str] = None
    sla_hours:        int
    is_active:        bool
    approvers:        List[StepApproverResponse] = []
    class Config: from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  WORKFLOW TEMPLATE
# ─────────────────────────────────────────────────────────────────────────────

class WorkflowTemplateCreate(BaseModel):
    code:        str = Field(..., max_length=50)
    name:        str
    description: Optional[str] = None
    company_id:  Optional[int] = None
    entity_page: Optional[str] = None   # frontend page path e.g. "item-code-creation-req"
    created_by:  Optional[int] = None   # user_id of admin creating the template
    steps:       List[WorkflowStepCreate] = []

class WorkflowTemplateUpdate(BaseModel):
    name:        Optional[str] = None
    description: Optional[str] = None
    company_id:  Optional[int] = None
    entity_page: Optional[str] = None
    updated_by:  Optional[int] = None
    is_active:   Optional[bool] = None

class WorkflowTemplateResponse(BaseModel):
    id:          int
    code:        str
    name:        str
    description: Optional[str] = None
    is_active:   bool
    company_id:  Optional[int] = None
    entity_page: Optional[str] = None
    company:     Optional[CompanyBrief] = None
    creator:     Optional[UserBrief] = None
    updater:     Optional[UserBrief] = None
    steps:       List[WorkflowStepResponse] = []
    created_at:  Optional[datetime] = None
    updated_at:  Optional[datetime] = None
    class Config: from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  WORKFLOW PAGE REGISTRY
# ─────────────────────────────────────────────────────────────────────────────

class WorkflowPageRegistryResponse(BaseModel):
    id:           int
    entity_page:  str
    page_name:    Optional[str] = None
    template_id:  int
    template:     Optional[WorkflowTemplateResponse] = None
    created_by:   Optional[int] = None
    creator:      Optional[UserBrief] = None
    created_at:   Optional[datetime] = None
    is_active:    bool
    class Config: from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  WORKFLOW ACTION
# ─────────────────────────────────────────────────────────────────────────────

class WorkflowActionCreate(BaseModel):
    action_type:      ActionTypeEnum
    performed_by:     int               # user_id
    comments:         Optional[str] = None

class WorkflowActionResponse(BaseModel):
    id:               int
    instance_id:      int
    step_instance_id: Optional[int] = None
    action_type:      ActionTypeEnum
    performed_by:     Optional[int] = None
    performer:        Optional[UserBrief] = None
    comments:         Optional[str] = None
    created_at:       datetime
    class Config: from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  WORKFLOW STEP INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

class StepInstanceResponse(BaseModel):
    id:                     int
    step_id:                int
    step_order_snapshot:    int
    step_name_snapshot:     str
    approval_type_snapshot: ApprovalTypeEnum
    status:                 StepStatusEnum
    is_skipped:             bool
    assigned_role:          Optional[RoleBrief] = None
    assigned_dept:          Optional[DeptBrief] = None
    assigned_desg:          Optional[DesgBrief] = None
    started_at:             Optional[datetime] = None
    completed_at:           Optional[datetime] = None
    due_at:                 Optional[datetime] = None
    actions:                List[WorkflowActionResponse] = []
    class Config: from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  WORKFLOW INSTANCE
# ─────────────────────────────────────────────────────────────────────────────

class WorkflowInstanceCreate(BaseModel):
    template_code:  str               # e.g. "ITEM_CREATION"
    entity_type:    str               # e.g. "ITEM_CREATION"
    entity_id:      int
    submitted_by:   int               # user_id

class WorkflowInstanceResponse(BaseModel):
    id:              int
    template_id:     int
    entity_type:     str
    entity_id:       int
    status:          WorkflowStatusEnum
    submitted_by:    Optional[int] = None
    submitter:       Optional[UserBrief] = None
    submitted_at:    Optional[datetime] = None
    completed_at:    Optional[datetime] = None
    current_step_id: Optional[int] = None
    step_instances:  List[StepInstanceResponse] = []
    actions:         List[WorkflowActionResponse] = []
    created_at:      datetime
    updated_at:      datetime
    class Config: from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  NOTIFICATION CONFIG
# ─────────────────────────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    template_id:      int
    step_id:          Optional[int] = None
    event:            NotificationEventEnum
    role_id:          Optional[int] = None
    department_id:    Optional[int] = None
    designation_id:   Optional[int] = None
    notify_submitter: bool = False

class NotificationResponse(NotificationCreate):
    id:               int
    is_active:        bool
    role:             Optional[RoleBrief] = None
    department:       Optional[DeptBrief] = None
    designation:      Optional[DesgBrief] = None
    class Config: from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  HELPER – Inbox item (what an approver sees in their queue)
# ─────────────────────────────────────────────────────────────────────────────

class InboxItem(BaseModel):
    instance_id:        int
    entity_type:        str
    entity_id:          int
    instance_status:    WorkflowStatusEnum
    step_instance_id:   int
    step_name:          str
    step_order:         int
    step_status:        StepStatusEnum
    submitted_by_name:  Optional[str] = None
    submitted_at:       Optional[datetime] = None
    due_at:             Optional[datetime] = None
    # Full entity snapshot (what was requested)
    entity_data:        Optional[Any] = None


# ─────────────────────────────────────────────────────────────────────────────
#  HELPER – Full status timeline (for submitter to track their request)
# ─────────────────────────────────────────────────────────────────────────────

class TimelineStep(BaseModel):
    step_order:    int
    step_name:     str
    status:        StepStatusEnum
    is_skipped:    bool
    assigned_role: Optional[str] = None
    assigned_dept: Optional[str] = None
    assigned_desg: Optional[str] = None
    started_at:    Optional[datetime] = None
    completed_at:  Optional[datetime] = None
    due_at:        Optional[datetime] = None
    actions:       List[WorkflowActionResponse] = []

class RequestTimeline(BaseModel):
    instance_id:    int
    entity_id:      int
    overall_status: WorkflowStatusEnum
    submitted_at:   Optional[datetime] = None
    completed_at:   Optional[datetime] = None
    steps:          List[TimelineStep] = []

# ─────────────────────────────────────────────────────────────────────────────
#  USER NOTIFICATION INBOX
# ─────────────────────────────────────────────────────────────────────────────

class UserNotificationResponse(BaseModel):
    id:           int
    user_id:      int
    instance_id:  int
    entity_type:  Optional[str] = None
    entity_id:    Optional[int] = None
    event:        ActionTypeEnum
    title:        str
    body:         Optional[str] = None
    triggered_by: Optional[int] = None
    trigger_user: Optional[UserBrief] = None
    is_read:      bool
    read_at:      Optional[datetime] = None
    created_at:   datetime

    class Config: from_attributes = True


class UserNotificationUnreadCount(BaseModel):
    user_id:      int
    unread_count: int