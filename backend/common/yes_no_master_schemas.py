"""common/yes_no_master_schemas.py
   Pydantic schemas for Yes / No Master
   Each row has its own PK. YES and NO rows are linked via yes_no_pair_id.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class UserBrief(BaseModel):
    id:        int
    full_name: Optional[str] = None
    username:  Optional[str] = None

    class Config:
        from_attributes = True


# ── Single row response ───────────────────────────────────────────────────────

class YesNoRowResponse(BaseModel):
    id:             int
    label:          str
    label_type:     str          # 'yes' or 'no'
    yes_no_pair_id: int
    is_active:      bool
    created_by:     Optional[int] = None
    updated_by:     Optional[int] = None
    creator:        Optional[UserBrief] = None
    updater:        Optional[UserBrief] = None
    created_at:     datetime
    updated_at:     datetime

    class Config:
        from_attributes = True


# ── Paired response (YES row + NO row together) ───────────────────────────────

class YesNoPairResponse(BaseModel):
    yes_no_pair_id: int
    yes_id:         int
    no_id:          int
    yes_label:      str
    no_label:       str
    is_active:      bool
    created_by:     Optional[int] = None
    updated_by:     Optional[int] = None
    creator:        Optional[UserBrief] = None
    created_at:     datetime
    updated_at:     datetime

    class Config:
        from_attributes = True


# ── Create (one call creates BOTH yes and no rows) ────────────────────────────

class YesNoCreate(BaseModel):
    yes_label:  str = Field(..., min_length=1, max_length=100)
    no_label:   str = Field(..., min_length=1, max_length=100)
    created_by: Optional[int] = None


# ── Update ────────────────────────────────────────────────────────────────────

class YesNoUpdate(BaseModel):
    yes_label:  Optional[str] = Field(None, max_length=100)
    no_label:   Optional[str] = Field(None, max_length=100)
    is_active:  Optional[bool] = None
    updated_by: Optional[int] = None


# ── LOV ───────────────────────────────────────────────────────────────────────

class YesNoLOV(BaseModel):
    yes_no_pair_id: int
    yes_id:         int
    no_id:          int
    yes_label:      str
    no_label:       str

    class Config:
        from_attributes = True