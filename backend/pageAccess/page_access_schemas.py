"""pageAccess/page_access_schemas.py
   Pydantic schemas for Page–Company Access Control System

   REMOVED: PlantBrief, plant_id fields
   REMOVED: PageUserOverrideCreate, PageUserOverrideResponse
   REMOVED: AccessiblePage, UserAccessiblePagesResponse
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─────────────────────────────────────────────────────────────────────────────
# Brief helpers (nested in responses)
# ─────────────────────────────────────────────────────────────────────────────

class UserBrief(BaseModel):
    id:        int
    full_name: Optional[str] = None
    email:     Optional[str] = None
    class Config:
        from_attributes = True

class CompanyBrief(BaseModel):
    id:           int
    company_name: str
    company_code: Optional[str] = None
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# PageRegistry
# ─────────────────────────────────────────────────────────────────────────────

class PageCreate(BaseModel):
    page_key:    str   = Field(..., min_length=1, max_length=200)
    page_name:   str   = Field(..., min_length=1, max_length=255)
    page_route:  str   = Field(..., min_length=1, max_length=500)
    icon:        Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    created_by:  Optional[int] = None


class PageUpdate(BaseModel):
    page_name:   Optional[str] = Field(None, max_length=255)
    page_route:  Optional[str] = Field(None, max_length=500)
    icon:        Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    is_active:   Optional[bool] = None


class PageResponse(BaseModel):
    id:          int
    page_key:    str
    page_name:   str
    page_route:  str
    icon:        Optional[str] = None
    description: Optional[str] = None
    is_active:   bool
    created_by:  Optional[int] = None
    creator:     Optional[UserBrief] = None
    created_at:  datetime
    updated_at:  datetime

    class Config:
        from_attributes = True


class PageLOV(BaseModel):
    """Lightweight list for dropdowns"""
    id:         int
    page_key:   str
    page_name:  str
    page_route: str
    icon:       Optional[str] = None
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# PageCompanyAccess  (no plant_id)
# ─────────────────────────────────────────────────────────────────────────────

class PageCompanyAccessCreate(BaseModel):
    page_id:    int
    company_id: int
    created_by: Optional[int] = None


class PageCompanyAccessResponse(BaseModel):
    id:         int
    page_id:    int
    company_id: int
    is_active:  bool
    created_by: Optional[int] = None
    created_at: datetime

    page:    Optional[PageLOV]      = None
    company: Optional[CompanyBrief] = None
    creator: Optional[UserBrief]    = None

    class Config:
        from_attributes = True