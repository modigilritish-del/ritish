"""financeAccounting/finance_schemas.py - Pydantic Schemas"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# ==================== GL TYPE SCHEMAS ====================
class GLTypeBase(BaseModel):
    type_code: str = Field(..., max_length=50)
    type_name: str = Field(..., max_length=100)
    description: Optional[str] = None


class GLTypeCreate(GLTypeBase):
    pass


class GLTypeResponse(GLTypeBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ==================== GL SUB TYPE SCHEMAS ====================
class GLSubTypeBase(BaseModel):
    sub_type_code: str = Field(..., max_length=50)
    sub_type_name: str = Field(..., max_length=150)
    description: Optional[str] = None
    gl_type_id: int
    display_order: Optional[int] = None


class GLSubTypeCreate(GLSubTypeBase):
    pass


class GLSubTypeResponse(GLSubTypeBase):
    id: int
    is_active: bool
    created_at: datetime
    gl_type_code: Optional[str] = None
    gl_type_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ==================== BULK CREATE SCHEMAS ====================
class GLTypeBulkItem(BaseModel):
    type_name: str = Field(..., max_length=100)
    description: Optional[str] = None


class GLSubTypeBulkItem(BaseModel):
    sub_type_name: str = Field(..., max_length=150)
    description: Optional[str] = None
    gl_type_id: int
    display_order: Optional[int] = None


class BulkCreateRequest(BaseModel):
    user_id: int
    gl_types: Optional[List[GLTypeBulkItem]] = []
    gl_sub_types: Optional[List[GLSubTypeBulkItem]] = []


class BulkCreateResponse(BaseModel):
    created_types: List[dict] = []
    created_sub_types: List[dict] = []
    errors: List[dict] = []
    total_types_created: int = 0
    total_sub_types_created: int = 0
    total_errors: int = 0


# ==================== GL CATEGORY SCHEMAS ====================
class GLCategoryBase(BaseModel):
    category_name: str = Field(..., max_length=150)
    description: Optional[str] = None
    gl_type_id: int
    gl_sub_type_id: Optional[int] = None


class GLCategoryCreate(GLCategoryBase):
    pass


class GLCategoryResponse(GLCategoryBase):
    id: int
    category_code: str
    is_active: bool
    created_at: datetime
    gl_type_code: Optional[str] = None
    gl_type_name: Optional[str] = None
    gl_sub_type_code: Optional[str] = None
    gl_sub_type_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ==================== GL SUB CATEGORY SCHEMAS ====================
class GLSubCategoryBase(BaseModel):
    sub_category_name: str = Field(..., max_length=150)
    description: Optional[str] = None
    gl_type_id: int
    gl_sub_type_id: Optional[int] = None
    gl_category_id: int


class GLSubCategoryCreate(GLSubCategoryBase):
    pass


class GLSubCategoryResponse(GLSubCategoryBase):
    id: int
    sub_category_code: str
    is_active: bool
    created_at: datetime
    gl_type_code: Optional[str] = None
    gl_type_name: Optional[str] = None
    gl_sub_type_code: Optional[str] = None
    gl_sub_type_name: Optional[str] = None
    gl_category_code: Optional[str] = None
    gl_category_name: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== GL HEAD SCHEMAS ====================
class GLHeadBase(BaseModel):
    gl_head_name: str = Field(..., max_length=200)
    description: Optional[str] = None
    gl_type_id: int
    gl_sub_type_id: Optional[int] = None
    gl_category_id: int
    gl_sub_category_id: int


class GLHeadCreate(GLHeadBase):
    pass


class GLHeadResponse(GLHeadBase):
    id: int
    gl_head_code: str
    is_active: bool
    created_at: datetime
    gl_type_code: Optional[str] = None
    gl_type_name: Optional[str] = None
    gl_sub_type_code: Optional[str] = None
    gl_sub_type_name: Optional[str] = None
    gl_category_code: Optional[str] = None
    gl_category_name: Optional[str] = None
    gl_sub_category_code: Optional[str] = None
    gl_sub_category_name: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== GL MASTER SCHEMAS ====================
class GLMasterBase(BaseModel):
    gl_code: str = Field(..., max_length=50)
    gl_name: str = Field(..., max_length=200)
    gl_type_id: int
    gl_sub_type_id: Optional[int] = None
    gl_category_id: Optional[int] = None
    gl_sub_category_id: Optional[int] = None
    gl_head_id: Optional[int] = None          # ← NEW
    parent_gl_id: Optional[int] = None
    is_postable: bool = True
    currency_code: Optional[str] = None
    remarks: Optional[str] = None


class GLMasterCreate(GLMasterBase):
    company_id: int
    plant_id: Optional[int] = None


class GLMasterResponse(GLMasterBase):
    id: int
    company_id: int
    plant_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class GLMasterDetail(GLMasterResponse):
    company: dict
    plant: Optional[dict] = None
    gl_type: dict
    gl_sub_type: Optional[dict] = None
    gl_category: Optional[dict] = None
    gl_sub_category: Optional[dict] = None
    gl_head: Optional[dict] = None            # ← NEW
    parent_gl: Optional[dict] = None
    child_count: int = 0
    
    class Config:
        from_attributes = True


# ==================== HISTORY SCHEMAS ====================
class GLNameHistoryResponse(BaseModel):
    id: int
    gl_id: int
    old_name: str
    new_name: str
    changed_at: datetime
    reason: Optional[str]
    
    class Config:
        from_attributes = True


class GLStatusHistoryResponse(BaseModel):
    id: int
    gl_id: int
    old_status: bool
    new_status: bool
    changed_at: datetime
    reason: Optional[str]
    
    class Config:
        from_attributes = True