"""user/user_schemas.py - User Management Schemas"""
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List

# ==================== USER SCHEMAS ====================

class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str

class UserCreate(UserBase):
    """Create user with company/plant assignments"""
    company_ids: List[int] = Field(..., min_items=1, description="At least one company required")
    plant_ids: List[int] = Field(default=[], description="Optional plants")
    role_id: int
    department_id: int
    designation_id: int
    primary_company_id: Optional[int] = None
    primary_plant_id: Optional[int] = None

class UserUpdate(BaseModel):
    """Update user details"""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    user_id: Optional[str] = None
    is_active: Optional[bool] = None

class UserCredentialsResponse(BaseModel):
    """Response with auto-generated credentials"""
    user_id: int
    full_name: str
    email: str
    user_login_id: str
    auto_generated_password: str
    message: str

class CompanyAccessInfo(BaseModel):
    """Company access information"""
    company_id: int
    company_name: str
    is_primary: bool

class PlantAccessInfo(BaseModel):
    """Plant access information"""
    plant_id: int
    plant_name: str
    plant_code: str
    company_id: int
    company_name: str
    is_primary: bool

class UserCompanyAccessDetail(BaseModel):
    """Detailed access information"""
    id: int
    company: dict
    plant: Optional[dict]
    role: dict
    department: dict
    designation: dict
    is_primary_company: bool
    is_primary_plant: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    """Complete user response"""
    id: int
    full_name: str
    email: str
    phone: str
    user_id: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    companies: List[CompanyAccessInfo]
    plants: List[PlantAccessInfo]
    accesses: List[UserCompanyAccessDetail]
    
    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    """Simplified user list response"""
    id: int
    full_name: str
    email: str
    phone: str
    user_id: str
    is_active: bool
    total_companies: int
    total_plants: int
    primary_company: Optional[str]
    created_at: datetime

# ==================== ACCESS MANAGEMENT SCHEMAS ====================

class AddCompanyAccessRequest(BaseModel):
    """Add company access to existing user"""
    user_id: int
    company_ids: List[int]
    plant_ids: List[int] = []
    role_id: int
    department_id: int
    designation_id: int
    make_primary_company: Optional[int] = None
    make_primary_plant: Optional[int] = None

class RemoveAccessRequest(BaseModel):
    """Remove specific access"""
    user_id: int
    access_id: int

class UpdatePasswordRequest(BaseModel):
    """Update user password"""
    user_id: int
    new_password: str