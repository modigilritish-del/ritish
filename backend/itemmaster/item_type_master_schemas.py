"""itemmaster/item_type_master_schemas.py
   Pydantic schemas for Item Type Master
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─────────────────────────────────────────────────────────────────────────────
# Brief helpers
# ─────────────────────────────────────────────────────────────────────────────

class UserBrief(BaseModel):
    id:        int
    full_name: Optional[str] = None
    username:  Optional[str] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Name History
# ─────────────────────────────────────────────────────────────────────────────

class NameHistoryResponse(BaseModel):
    id:           int
    item_type_id: int
    old_name:     str
    new_name:     str
    changed_by:   Optional[int]       = None
    changer:      Optional[UserBrief] = None
    changed_at:   datetime

    class Config:
        from_attributes = True

# ✅ Alias used by item_type_master_routes.py
ItemTypeNameHistoryResponse = NameHistoryResponse


# ─────────────────────────────────────────────────────────────────────────────
# Item Type Master – Create
# ─────────────────────────────────────────────────────────────────────────────

class ItemTypeCreate(BaseModel):
    code: Optional[str] = Field(
        None, max_length=30,
        description="Short unique code e.g. RM, FG — auto-generated from Name if omitted"
    )
    name:        str            = Field(..., min_length=1, max_length=150,
                                        description="Full display name — title-cased automatically")
    description: Optional[str] = Field(None, description="Optional description / notes")
    created_by:  Optional[int] = None


# ─────────────────────────────────────────────────────────────────────────────
# Item Type Master – Update
# ─────────────────────────────────────────────────────────────────────────────

class ItemTypeUpdate(BaseModel):
    code:        Optional[str]  = Field(None, max_length=30)
    name:        Optional[str]  = Field(None, max_length=150)
    description: Optional[str]  = None
    is_active:   Optional[bool] = None
    updated_by:  Optional[int]  = None


# ─────────────────────────────────────────────────────────────────────────────
# Item Type Master – Response (full)
# ─────────────────────────────────────────────────────────────────────────────

class ItemTypeResponse(BaseModel):
    id:           int
    code:         str
    name:         str
    description:  Optional[str] = None
    is_active:    bool
    created_by:   Optional[int] = None
    updated_by:   Optional[int] = None
    creator:      Optional[UserBrief] = None
    updater:      Optional[UserBrief] = None
    created_at:   datetime
    updated_at:   datetime
    name_history: List[NameHistoryResponse] = []

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# Simple list item (no history) – used for dropdowns / LOV
# ─────────────────────────────────────────────────────────────────────────────

class ItemTypeLOV(BaseModel):
    id:   int
    code: str
    name: str

    class Config:
        from_attributes = True