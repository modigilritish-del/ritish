"""sonataCustomFields/sonata_custom_schemas.py - Sonata Custom Fields Pydantic Schemas"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# ==================== BASE ====================
class SonataCustomFieldBase(BaseModel):
    field_name:  str           = Field(..., max_length=150)
    description: Optional[str] = None


# ==================== CREATE ====================
class SonataCustomFieldCreate(SonataCustomFieldBase):
    company_id: int
    user_id:    int


# ==================== UPDATE ====================
class SonataCustomFieldUpdate(BaseModel):
    description: Optional[str]  = None
    is_active:   Optional[bool] = None
    user_id:     int


# ==================== RESPONSE ====================
class SonataCustomFieldResponse(SonataCustomFieldBase):
    id:              int
    company_id:      int
    field_code:      str
    is_active:       bool
    created_by:      Optional[int]      = None
    updated_by:      Optional[int]      = None
    created_at:      datetime
    updated_at:      Optional[datetime] = None

    # Joined fields
    company_name:    Optional[str] = None
    company_code:    Optional[str] = None
    created_by_name: Optional[str] = None
    updated_by_name: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== LIST RESPONSE ====================
class SonataCustomFieldListResponse(BaseModel):
    data:  List[SonataCustomFieldResponse]
    total: int