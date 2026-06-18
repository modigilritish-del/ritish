"""
itemmaster/workflow_entity_routing_schemas.py
──────────────────────────────────────────────────────────────────────────────
Pydantic schemas for Workflow Entity Routing API.

Every entity card in the Workflow Builder can be configured with:
  - DEPT mode  → target company + department
  - USER mode  → specific user

These schemas cover:
  1. Single routing create/update (one card at a time)
  2. Bulk routing save   (save all cards for a flow at once — "Save Routing" button)
  3. Routing read/list   (view current routing for a flow)
  4. Routing log read    (full audit history)
  5. Routing restore     (restore to a historical snapshot from logs)
  6. Routing clear       (remove routing from one card or all cards in a flow)
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ─── Enums (mirror DB enums) ──────────────────────────────────────────────────

class RoutingTypeEnum(str, Enum):
    DEPT = "dept"
    USER = "user"


class RoutingLogActionEnum(str, Enum):
    CREATED  = "CREATED"
    UPDATED  = "UPDATED"
    DELETED  = "DELETED"
    RESTORED = "RESTORED"
    CLEARED  = "CLEARED"


# ─── Shared nested shapes ─────────────────────────────────────────────────────

class RoutingTargetDept(BaseModel):
    """Department-mode routing target."""
    company_id:   int
    company_name: Optional[str] = None
    dept_id:      int
    dept_name:    Optional[str] = None


class RoutingTargetUser(BaseModel):
    """User-mode routing target."""
    user_id:    int
    user_name:  Optional[str] = None
    user_email: Optional[str] = None


# ─── Single Routing Rule ──────────────────────────────────────────────────────

class EntityRoutingCreate(BaseModel):
    """
    Create or update routing for a single entity card.

    For DEPT mode:  provide target_company_id + target_dept_id
    For USER mode:  provide target_user_id
    """
    flow_id:         int
    entity_key:      str = Field(..., min_length=1, max_length=100,
                                 description="Entity card key, e.g. 'item-info-master'")

    routing_type:    RoutingTypeEnum = RoutingTypeEnum.DEPT

    # DEPT mode
    target_company_id:  Optional[int] = None
    target_dept_id:     Optional[int] = None

    # USER mode
    target_user_id:     Optional[int] = None

    # Source context (workflow routing mode: FROM which dept)
    source_dept_id:     Optional[int] = None

    # Per-request override (NULL = default for all requests)
    entity_id:          Optional[int] = None
    request_id:         Optional[str] = None

    routing_notes:      Optional[str] = None

    # Who is saving this routing
    saved_by:           Optional[int] = None

    @validator("target_dept_id", always=True)
    def dept_required_for_dept_mode(cls, v, values):
        if values.get("routing_type") == RoutingTypeEnum.DEPT:
            if not values.get("target_company_id") or not v:
                raise ValueError("target_company_id and target_dept_id are required for dept routing mode")
        return v

    @validator("target_user_id", always=True)
    def user_required_for_user_mode(cls, v, values):
        if values.get("routing_type") == RoutingTypeEnum.USER:
            if not v:
                raise ValueError("target_user_id is required for user routing mode")
        return v


class EntityRoutingUpdate(BaseModel):
    """Partial update — only send fields you want to change."""
    routing_type:       Optional[RoutingTypeEnum]  = None
    target_company_id:  Optional[int]              = None
    target_dept_id:     Optional[int]              = None
    target_user_id:     Optional[int]              = None
    source_dept_id:     Optional[int]              = None
    routing_notes:      Optional[str]              = None
    saved_by:           Optional[int]              = None


# ─── Bulk Routing Save ────────────────────────────────────────────────────────

class BulkEntityRoutingItem(BaseModel):
    """One item inside a bulk save — one entity card's routing."""
    entity_key:         str

    routing_type:       RoutingTypeEnum = RoutingTypeEnum.DEPT

    target_company_id:  Optional[int] = None
    target_dept_id:     Optional[int] = None
    target_user_id:     Optional[int] = None

    source_dept_id:     Optional[int] = None

    entity_id:          Optional[int] = None
    request_id:         Optional[str] = None
    routing_notes:      Optional[str] = None


class BulkEntityRoutingSave(BaseModel):
    """
    Save (upsert) all routing rules for a flow in one call.
    Called when the user clicks 'Save Routing' in the popup.

    routings: list of all entity cards with their routing set.
    clear_missing: if True, any entity_key NOT in this list will have
                   its routing cleared (is_active=False).
                   Default True — recommended for "save all" semantics.
    """
    flow_id:       int
    routings:      List[BulkEntityRoutingItem]
    clear_missing: bool = True
    note:          Optional[str] = None
    saved_by:      Optional[int] = None


# ─── Routing Responses ────────────────────────────────────────────────────────

class EntityRoutingResponse(BaseModel):
    id:                 int
    flow_id:            int
    entity_key:         str
    routing_type:       str

    target_company_id:  Optional[int]   = None
    target_company_name: Optional[str]  = None
    target_dept_id:     Optional[int]   = None
    target_dept_name:   Optional[str]   = None

    target_user_id:     Optional[int]   = None
    target_user_name:   Optional[str]   = None
    target_user_email:  Optional[str]   = None

    source_dept_id:     Optional[int]   = None
    source_dept_name:   Optional[str]   = None

    entity_id:          Optional[int]   = None
    request_id:         Optional[str]   = None
    routing_notes:      Optional[str]   = None

    is_active:          bool
    created_by:         Optional[int]   = None
    updated_by:         Optional[int]   = None
    created_at:         datetime
    updated_at:         Optional[datetime] = None

    class Config:
        from_attributes = True


class BulkEntityRoutingResponse(BaseModel):
    """Result of a bulk save operation."""
    flow_id:        int
    saved_count:    int
    cleared_count:  int
    skipped_count:  int
    routings:       List[EntityRoutingResponse]
    note:           Optional[str] = None


# ─── Flow Routing Summary ─────────────────────────────────────────────────────

class FlowRoutingSummary(BaseModel):
    """
    Full routing config for one flow — all entity cards with their routing.
    Used by the builder popup to load existing routing on open.
    """
    flow_id:    int
    flow_name:  str
    company_id: int
    company_name: Optional[str] = None
    plant_id:   Optional[int]   = None
    plant_name: Optional[str]   = None

    # Keyed by entity_key → routing rule (or None if not set)
    routing_map: Dict[str, Optional[EntityRoutingResponse]] = {}

    total_entities_routed: int = 0
    total_entities:        int = 0


# ─── Routing Logs ─────────────────────────────────────────────────────────────

class EntityRoutingLogResponse(BaseModel):
    id:             int
    routing_id:     int
    flow_id:        int
    entity_key:     str
    action:         str
    snapshot_json:  Optional[str] = None
    previous_json:  Optional[str] = None
    changed_by:     Optional[int] = None
    changed_by_name: Optional[str] = None
    note:           Optional[str] = None
    created_at:     datetime

    class Config:
        from_attributes = True


# ─── Restore Request ──────────────────────────────────────────────────────────

class EntityRoutingRestoreRequest(BaseModel):
    """Restore a routing rule to a specific historical snapshot."""
    log_id:    int
    restored_by: Optional[int] = None
    note:      Optional[str] = None


# ─── Clear Request ────────────────────────────────────────────────────────────

class EntityRoutingClearRequest(BaseModel):
    """
    Clear routing for one or more entity cards in a flow.
    If entity_keys is empty, clears ALL routing for the flow.
    """
    flow_id:     int
    entity_keys: List[str] = []     # empty = clear all
    cleared_by:  Optional[int] = None
    note:        Optional[str] = None


class EntityRoutingClearResponse(BaseModel):
    flow_id:       int
    cleared_count: int
    cleared_keys:  List[str]


# ─── Forward Routing Lookup ───────────────────────────────────────────────────

class EntityForwardRoutingLookup(BaseModel):
    """
    Given a flow + entity_key (+ optional source_dept_id + entity_id),
    return where this card's task should be forwarded.
    Used internally by the forward popup when workflowMode=true.
    """
    flow_id:        int
    entity_key:     str
    source_dept_id: Optional[int] = None
    entity_id:      Optional[int] = None   # override lookup if per-request routing set


class EntityForwardRoutingResult(BaseModel):
    """
    The resolved forwarding target for one entity card.
    routing_found = False means no routing is configured → use fallback / manual.
    """
    flow_id:        int
    entity_key:     str
    routing_found:  bool

    routing_type:   Optional[str]  = None   # "dept" | "user"

    target_company_id:   Optional[int]  = None
    target_company_name: Optional[str]  = None
    target_dept_id:      Optional[int]  = None
    target_dept_name:    Optional[str]  = None
    target_user_id:      Optional[int]  = None
    target_user_name:    Optional[str]  = None
    target_user_email:   Optional[str]  = None

    source_dept_id:      Optional[int]  = None
    source_dept_name:    Optional[str]  = None

    routing_id:     Optional[int]  = None   # FK to imwf_entity_routing.id
    routing_notes:  Optional[str]  = None