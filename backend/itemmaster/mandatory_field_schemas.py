"""
itemmaster/mandatory_field_schemas.py
─────────────────────────────────────────────────────────────────────────────
Pydantic schemas for Mandatory Field Configuration.
Zero changes to any existing schema.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ─────────────────────────────────────────────────────────────────────────────
# Single field entry inside fields_config JSON
# ─────────────────────────────────────────────────────────────────────────────

class FieldEntry(BaseModel):
    field_key:    str                        # e.g. "item_name"
    label:        str                        # e.g. "Item Name"
    is_mandatory: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# Create
# ─────────────────────────────────────────────────────────────────────────────

class MandatoryFieldConfigCreate(BaseModel):
    page_key:      str
    page_label:    Optional[str] = None
    company_id:    int
    plant_id:      Optional[int] = None      # None = company-level
    fields_config: List[FieldEntry] = []
    created_by:    Optional[int] = None
    note:          Optional[str] = None      # stored in the log row


# ─────────────────────────────────────────────────────────────────────────────
# Update  (only fields_config + optional plant/note/updated_by)
# ─────────────────────────────────────────────────────────────────────────────

class MandatoryFieldConfigUpdate(BaseModel):
    fields_config: List[FieldEntry]
    updated_by:    Optional[int] = None
    note:          Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Brief nested schemas
# ─────────────────────────────────────────────────────────────────────────────

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
    id:        int
    full_name: Optional[str] = None
    username:  Optional[str] = None
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Response
# ─────────────────────────────────────────────────────────────────────────────

class MandatoryFieldConfigResponse(BaseModel):
    id:            int
    page_key:      str
    page_label:    Optional[str] = None
    company_id:    int
    plant_id:      Optional[int] = None
    fields_config: List[Any] = []
    is_active:     bool
    created_by:    Optional[int] = None
    updated_by:    Optional[int] = None
    company:       Optional[CompanyBrief] = None
    plant:         Optional[PlantBrief]   = None
    creator:       Optional[UserBrief]    = None
    updater:       Optional[UserBrief]    = None
    created_at:    Optional[datetime] = None
    updated_at:    Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Log response
# ─────────────────────────────────────────────────────────────────────────────

class MandatoryFieldConfigLogResponse(BaseModel):
    id:             int
    config_id:      Optional[int] = None
    page_key:       str
    company_id:     Optional[int] = None
    plant_id:       Optional[int] = None
    change_type:    str
    snapshot:       List[Any] = []
    changed_fields: Optional[Any] = None
    note:           Optional[str] = None
    performed_by:   Optional[int] = None
    performed_at:   Optional[datetime] = None
    performer:      Optional[UserBrief] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Resolve endpoint response — used by frontend at form render time
# Returns only the mandatory field_keys for a given page+company+plant
# ─────────────────────────────────────────────────────────────────────────────

class ResolvedMandatoryFields(BaseModel):
    page_key:        str
    company_id:      int
    plant_id:        Optional[int] = None
    scope:           str                  # "plant" | "company" | "none"
    mandatory_keys:  List[str] = []       # list of field_key strings that are mandatory
    all_fields:      List[Any] = []       # full FieldEntry list for reference