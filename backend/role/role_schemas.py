"""role/role_schemas.py - RBAC Pydantic Schemas"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# ==================== PAGE SCHEMAS ====================

class PageBase(BaseModel):
    page_name: str
    page_url: str
    icon_name: Optional[str] = None
    parent_page_id: Optional[int] = None
    display_order: int = 0
    description: Optional[str] = None

class PageCreate(PageBase):
    pass

class PageUpdate(BaseModel):
    page_name: Optional[str] = None
    page_url: Optional[str] = None
    icon_name: Optional[str] = None
    parent_page_id: Optional[int] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None

class PageResponse(PageBase):
    id: int
    page_code: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class PageWithPermissions(PageResponse):
    """Page with all available permissions"""
    permissions: List[dict]

# ==================== PERMISSION SCHEMAS ====================

class PagePermissionBase(BaseModel):
    page_id: int
    permission_type: str  # CREATE, READ, UPDATE, DELETE, EXPORT

class PagePermissionCreate(PagePermissionBase):
    pass

class PagePermissionResponse(PagePermissionBase):
    id: int
    is_enabled: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== RBAC ACCESS SCHEMAS ====================

class CompanyRolePageAccessCreate(BaseModel):
    """Create access for Company -> Role -> Dept -> Designation -> Page -> Permission"""
    company_id: int
    role_id: int
    department_id: int
    designation_id: int
    page_id: int
    permission_ids: List[int]  # Multiple permissions for same page
    is_granted: bool = True

class CompanyRolePageAccessBulkCreate(BaseModel):
    """Bulk create access for multiple pages"""
    company_id: int
    role_id: int
    department_id: int
    designation_id: int
    page_permissions: List[dict]  # [{"page_id": 1, "permission_ids": [1,2,3]}, ...]

class CompanyRolePageAccessResponse(BaseModel):
    id: int
    company_id: int
    role_id: int
    department_id: int
    designation_id: int
    page_id: int
    permission_id: int
    is_granted: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class RBACAccessDetail(BaseModel):
    """Detailed RBAC access view"""
    id: int
    company: dict
    role: dict
    department: dict
    designation: dict
    page: dict
    permission: dict
    is_granted: bool
    created_at: datetime

# ==================== USER PERMISSION SCHEMAS ====================

class UserPermissionCheck(BaseModel):
    """Check if user has specific permission"""
    user_id: int
    company_id: int
    page_url: str
    permission_type: str

class UserMenuResponse(BaseModel):
    """User's accessible menu structure"""
    page_id: int
    page_name: str
    page_url: str
    icon_name: Optional[str]
    parent_page_id: Optional[int]
    display_order: int
    permissions: List[str]  # List of granted permission types
    sub_pages: List['UserMenuResponse'] = []

class UserAccessMatrix(BaseModel):
    """Complete access matrix for a user"""
    user_id: int
    company_id: int
    pages: List[dict]  # All accessible pages with permissions