"""
MDM/item_info_forward_schemas.py
─────────────────────────────────────────────────────────────────────────────
Pydantic schemas for Item Info Forward — MDM approver forwards a mapping
request to a specific company+department user for Item Info Master filling.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─────────────────────────────────────────────────────────────────────────────
#  Access check request/response
# ─────────────────────────────────────────────────────────────────────────────

class ItemInfoAccessCheckRequest(BaseModel):
    """
    Check if a specific company+dept combination has access to 'add-item-info' page.
    MDM approver triggers this before deciding to forward.
    """
    company_id:     int
    role_id:        int
    department_id:  Optional[int] = None
    designation_id: Optional[int] = None


class ItemInfoAccessCheckResponse(BaseModel):
    company_id:     int
    role_id:        int
    department_id:  Optional[int] = None
    designation_id: Optional[int] = None
    has_access:     bool
    page_url:       Optional[str] = None   # matched page url
    page_name:      Optional[str] = None   # matched page name
    reason:         str                    # human-readable reason


# ─────────────────────────────────────────────────────────────────────────────
#  Company + Dept with access status — for the popup display
# ─────────────────────────────────────────────────────────────────────────────

class DeptAccessStatus(BaseModel):
    department_id:   int
    department_name: str
    has_page_access: bool   # does this dept have add-item-info page access?


class CompanyWithDeptAccess(BaseModel):
    """One company row shown in the forward popup."""
    company_id:       int
    company_name:     str
    company_code:     Optional[str] = None
    is_primary:       bool
    role_id:          Optional[int] = None
    role_name:        Optional[str] = None
    department_id:    Optional[int] = None
    department_name:  Optional[str] = None
    designation_id:   Optional[int] = None
    designation_name: Optional[str] = None
    granted_dept_ids: List[int] = []     # from UserDeptDataAccess
    depts_with_access: List[DeptAccessStatus] = []


# ─────────────────────────────────────────────────────────────────────────────
#  Forward request — send notification to target company+dept users
# ─────────────────────────────────────────────────────────────────────────────

class ItemInfoForwardRequest(BaseModel):
    """
    MDM approver forwards the Item Info mapping task to users who have
    access to the 'add-item-info' page in the target company+department.
    """
    # Source: the Item Creation Request being mapped
    entity_id:      int
    request_id:     Optional[str] = None
    item_name:      Optional[str] = None

    # Target: which company+dept to forward to
    target_company_id:    int
    target_department_id: int

    # Who is forwarding (MDM approver)
    forwarded_by:   int
    forward_notes:  Optional[str] = None   # optional message to the recipient


class ItemInfoForwardResponse(BaseModel):
    """Result of forwarding — how many users were notified."""
    entity_id:       int
    request_id:      Optional[str] = None
    item_name:       Optional[str] = None
    target_company:  str
    target_dept:     str
    notified_count:  int            # how many users received notification
    notified_users:  List[str] = [] # full_name of notified users
    forward_id:      int            # FK to ItemInfoForwardLog.id
    status:          str            # "sent" | "no_eligible_users" | "no_access"


# ─────────────────────────────────────────────────────────────────────────────
#  Forward Log — audit record
# ─────────────────────────────────────────────────────────────────────────────

class ItemInfoForwardLogResponse(BaseModel):
    id:                   int
    entity_id:            int
    request_id:           Optional[str]  = None
    item_name_snapshot:   Optional[str]  = None
    target_company_id:    int
    target_company_name:  Optional[str]  = None
    target_dept_id:       int
    target_dept_name:     Optional[str]  = None
    forwarded_by:         Optional[int]  = None
    forwarder_name:       Optional[str]  = None
    forward_notes:        Optional[str]  = None
    notified_user_ids:    Optional[str]  = None   # comma-separated
    notified_count:       int
    status:               str
    forwarded_at:         datetime

    class Config:
        from_attributes = True