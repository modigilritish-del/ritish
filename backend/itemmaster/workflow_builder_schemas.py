"""
itemmaster/workflow_builder_schemas.py
──────────────────────────────────────────────────────────────────────────────
Pydantic schemas for Item Master Workflow Builder API.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


# ─── Nested payload shapes (mirror frontend state) ────────────────────────────

class CompanyRef(BaseModel):
    id:   int
    name: str

class PlantRef(BaseModel):
    id:   int
    name: str


# ─── Flow Create ──────────────────────────────────────────────────────────────

class WorkflowFlowCreate(BaseModel):
    """
    Called when the user clicks 'Done' in the AddFlowWizard.
    groupOrder and groupEntityIds are optional at creation time
    (they'll be saved on the first 'Save Flow' click).
    """
    flow_name:        str = Field(..., min_length=1, max_length=255)
    company_id:       int
    plant_id:         Optional[int] = None

    # Optional initial layout
    group_order:       Optional[List[str]]            = None   # ['basic-info','inventory',…]
    group_entity_ids:  Optional[Dict[str, List[str]]] = None   # {'basic-info':['item-info-master',…],…}


# ─── Flow Save (Save Flow button) ─────────────────────────────────────────────

class WorkflowFlowSave(BaseModel):
    """
    Full state snapshot sent when the user clicks 'Save Flow'.
    """
    group_order:      List[str]             = Field(..., description="Ordered list of group keys")
    group_entity_ids: Dict[str, List[str]]  = Field(..., description="Per-group ordered entity keys")
    note:             Optional[str]         = None


# ─── Flow Response ────────────────────────────────────────────────────────────

class GroupOrderItem(BaseModel):
    group_key:     str
    display_order: int

    class Config:
        from_attributes = True

class GroupEntityItem(BaseModel):
    group_key:    str
    entity_key:   str
    entity_order: int

    class Config:
        from_attributes = True

class WorkflowFlowResponse(BaseModel):
    id:         int
    flow_name:  str
    company_id: int
    plant_id:   Optional[int]
    is_active:  bool
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime]

    # Derived convenience fields
    company_name: Optional[str] = None
    plant_name:   Optional[str] = None

    # Current layout
    group_order:      List[str]             = []
    group_entity_ids: Dict[str, List[str]]  = {}

    class Config:
        from_attributes = True


# ─── Log Response ─────────────────────────────────────────────────────────────

class WorkflowFlowLogResponse(BaseModel):
    id:            int
    flow_id:       int
    action:        str
    snapshot_json: Optional[str]
    note:          Optional[str]
    created_at:    datetime

    class Config:
        from_attributes = True


# ─── Restore Request ──────────────────────────────────────────────────────────

class WorkflowFlowRestoreRequest(BaseModel):
    log_id: int   # restore flow to this historical snapshot


# ─── List / Summary ───────────────────────────────────────────────────────────

class WorkflowFlowSummary(BaseModel):
    """Lightweight list item — no full layout data."""
    id:           int
    flow_name:    str
    company_id:   int
    company_name: Optional[str] = None
    plant_id:     Optional[int] = None
    plant_name:   Optional[str] = None
    is_active:    bool
    is_default:   bool
    total_logs:   int = 0
    created_at:   datetime
    updated_at:   Optional[datetime]

    class Config:
        from_attributes = True