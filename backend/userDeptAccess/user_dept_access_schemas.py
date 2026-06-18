"""
userDeptAccess/user_dept_access_schemas.py
Pydantic schemas for User Department Data Access Control
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Brief nested helpers ──────────────────────────────────────────────────────

class UserBrief(BaseModel):
    id: int
    full_name: str
    email: str
    user_id: str
    class Config: from_attributes = True

class CompanyBrief(BaseModel):
    id: int
    company_name: str
    company_code: Optional[str] = None
    class Config: from_attributes = True

class DeptBrief(BaseModel):
    id: int
    department_name: str
    class Config: from_attributes = True

class RoleBrief(BaseModel):
    id: int
    role_name: str
    class Config: from_attributes = True

class DesgBrief(BaseModel):
    id: int
    designation_name: str
    class Config: from_attributes = True


# ── Core CRUD schemas ─────────────────────────────────────────────────────────

class UserDeptAccessCreate(BaseModel):
    user_id:       int
    company_id:    int
    department_id: int
    is_granted:    bool = True
    notes:         Optional[str] = None
    created_by:    Optional[int] = None

class UserDeptAccessBulkSet(BaseModel):
    """
    Set ALL dept access for a user in a company in one call.
    Replaces whatever was there before.
    department_ids = [] means revoke all (user sees nothing).
    """
    user_id:        int
    company_id:     int
    department_ids: List[int]
    created_by:     Optional[int] = None
    update_reason:  Optional[str] = None   # ← reason for this change

class UserDeptAccessResponse(BaseModel):
    id:            int
    user_id:       int
    company_id:    int
    department_id: int
    is_granted:    bool
    notes:         Optional[str] = None
    update_reason: Optional[str] = None
    department:    Optional[DeptBrief] = None
    company:       Optional[CompanyBrief] = None
    created_at:    Optional[datetime] = None
    updated_at:    Optional[datetime] = None
    class Config: from_attributes = True


# ── History response ──────────────────────────────────────────────────────────

class UserDeptAccessHistoryResponse(BaseModel):
    id:                    int
    user_id:               int
    company_id:            int
    action:                str
    department_ids_before: Optional[str] = None
    department_ids_after:  Optional[str] = None
    update_reason:         Optional[str] = None
    performed_by:          Optional[int] = None
    performed_by_name:     Optional[str] = None   # resolved from performer
    performed_at:          Optional[datetime] = None
    class Config: from_attributes = True


# ── Page-level response: user detail + their companies + dept access ──────────

class UserAccessDetail(BaseModel):
    """Full detail for a user — shown when admin clicks a user in the list."""
    id:           int
    full_name:    str
    email:        str
    phone:        str
    user_id:      str
    is_active:    bool

    # All companies this user has access to (from UserCompanyAccess)
    company_accesses: List[dict] = []

    # Departments granted globally (from UserDeptDataAccess), per company
    dept_access_by_company: List[dict] = []


# ── Company list item (left panel) ────────────────────────────────────────────

class CompanyWithUserCount(BaseModel):
    id:           int
    company_name: str
    company_code: Optional[str] = None
    user_count:   int


# ── User list item (middle panel after company click) ────────────────────────

class UserInCompany(BaseModel):
    id:           int
    full_name:    str
    email:        str
    user_id:      str
    is_active:    bool
    role_name:    Optional[str] = None
    dept_name:    Optional[str] = None
    desg_name:    Optional[str] = None
    granted_dept_count: int = 0


# ── Allowed dept IDs helper (used by other modules to filter data) ────────────

class UserAllowedDepts(BaseModel):
    user_id:        int
    company_id:     int
    department_ids: List[int]   # empty list = no access at all