"""itemmaster/item_creation_req_schemas.py
   Pydantic schemas for Item Code Creation Request
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


# ─────────────────────────────────────────────────────────────────────────────
# Optional Documents
# ─────────────────────────────────────────────────────────────────────────────

class OptionalDocumentCreate(BaseModel):
    reference_image_url:    Optional[str] = None
    vendor_quotation_url:   Optional[str] = None
    sample_photo_url:       Optional[str] = None
    product_link:           Optional[str] = None


class OptionalDocumentResponse(OptionalDocumentCreate):
    id:                         int
    item_master_basic_info_id:  int
    created_at:                 Optional[datetime] = None
    updated_at:                 Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Item Basic Info  – Create / Update / Response
# ─────────────────────────────────────────────────────────────────────────────

class ItemBasicInfoCreate(BaseModel):
    item_name:          str
    item_description:   Optional[str] = None
    item_short_name:    Optional[str] = None
    item_type:          Optional[str] = None
    department:         Optional[str] = None
    required_date:      Optional[date] = None
    business_reason:    Optional[str] = None

    # company / plant chosen by user (from their access list)
    company_id:         Optional[int] = None
    plant_id:           Optional[int] = None

    # who is creating  (frontend passes logged-in user id)
    created_by:         Optional[int] = None

    # optional documents inline
    optional_documents: Optional[OptionalDocumentCreate] = None


class ItemBasicInfoUpdate(BaseModel):
    item_name:          Optional[str] = None
    item_description:   Optional[str] = None
    item_short_name:    Optional[str] = None
    item_type:          Optional[str] = None
    department:         Optional[str] = None
    required_date:      Optional[date] = None
    business_reason:    Optional[str] = None
    company_id:         Optional[int] = None
    plant_id:           Optional[int] = None
    updated_by:         Optional[int] = None
    is_active:          Optional[bool] = None
    optional_documents: Optional[OptionalDocumentCreate] = None


class CompanyBrief(BaseModel):
    id:           int
    company_name: str
    company_code: Optional[str] = None

    class Config:
        from_attributes = True


class PlantBrief(BaseModel):
    id:         int
    plant_name: str
    plant_code: Optional[str] = None

    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    id:         int
    full_name:  Optional[str] = None
    username:   Optional[str] = None

    class Config:
        from_attributes = True


class ItemBasicInfoResponse(BaseModel):
    id:                 int
    request_id:         Optional[str] = None
    item_name:          str
    item_description:   Optional[str] = None
    item_short_name:    Optional[str] = None
    item_type:          Optional[str] = None
    department:         Optional[str] = None
    required_date:      Optional[date] = None
    business_reason:    Optional[str] = None
    is_active:          bool

    company_id:         Optional[int] = None
    plant_id:           Optional[int] = None
    created_by:         Optional[int] = None
    creator_role_id:    Optional[int] = None
    creator_dept_id:    Optional[int] = None
    creator_desg_id:    Optional[int] = None
    updated_by:         Optional[int] = None

    company:            Optional[CompanyBrief] = None
    plant:              Optional[PlantBrief] = None
    creator:            Optional[UserBrief] = None
    optional_documents: Optional[OptionalDocumentResponse] = None

    created_at:         Optional[datetime] = None
    updated_at:         Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# For the "companies + plants by user access" helper endpoint
# ─────────────────────────────────────────────────────────────────────────────

class PlantOption(BaseModel):
    id:         int
    plant_name: str
    plant_code: Optional[str] = None

    class Config:
        from_attributes = True


class CompanyWithPlantsOption(BaseModel):
    id:           int
    company_name: str
    company_code: Optional[str] = None
    plants:       list[PlantOption] = []

    class Config:
        from_attributes = True