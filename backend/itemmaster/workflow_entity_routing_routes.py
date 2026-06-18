"""
itemmaster/workflow_entity_routing_routes.py
──────────────────────────────────────────────────────────────────────────────
REST API — Workflow Entity Card Routing

Ye module track karta hai ki Workflow Builder ke har entity card
(Item Info Master, Analysis Fields, Custom Fields, etc.) ke liye
kaunsa company+dept ya specific user set hai — with full audit logs.

ENDPOINTS
─────────

  ── Routing CRUD ─────────────────────────────────────────────────────────────
  POST   /item-master/entity-routing
         Create/upsert routing for a single entity card

  GET    /item-master/entity-routing/flow/{flow_id}
         Get all routing rules for a flow (full routing_map)

  GET    /item-master/entity-routing/{routing_id}
         Get one routing rule by its ID

  PUT    /item-master/entity-routing/{routing_id}
         Update a routing rule

  DELETE /item-master/entity-routing/{routing_id}
         Soft-delete (clear) one routing rule

  ── Bulk Operations ───────────────────────────────────────────────────────────
  POST   /item-master/entity-routing/bulk-save
         Save ALL routing rules for a flow in one call (Save Routing button)

  POST   /item-master/entity-routing/clear
         Clear routing for one or more cards (or all cards) in a flow

  ── Forward Target Lookup ─────────────────────────────────────────────────────
  POST   /item-master/entity-routing/lookup
         Given flow_id + entity_key, return where to forward (used by popup)

  GET    /item-master/entity-routing/lookup/{flow_id}/{entity_key}
         Quick GET version of lookup (no source_dept or entity_id filter)

  ── Audit Logs ────────────────────────────────────────────────────────────────
  GET    /item-master/entity-routing/{routing_id}/logs
         Full audit log for one routing rule

  GET    /item-master/entity-routing/logs/flow/{flow_id}
         All routing change logs for a flow (admin audit view)

  GET    /item-master/entity-routing/logs/all
         All routing logs across all flows (super-admin view, paginated)

  ── Restore ───────────────────────────────────────────────────────────────────
  POST   /item-master/entity-routing/{routing_id}/restore
         Restore a routing rule to a historical snapshot from logs

  ── Summary ───────────────────────────────────────────────────────────────────
  GET    /item-master/entity-routing/summary/{flow_id}
         Full routing summary for a flow (name, company, all card routings)
"""

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from itemmaster.workflow_entity_routing_models import (
    ItemMasterWorkflowEntityRouting,
    ItemMasterWorkflowEntityRoutingLog,
    RoutingType,
    RoutingLogAction,
)
from itemmaster.workflow_entity_routing_schemas import (
    EntityRoutingCreate,
    EntityRoutingUpdate,
    EntityRoutingResponse,
    BulkEntityRoutingSave,
    BulkEntityRoutingResponse,
    FlowRoutingSummary,
    EntityRoutingLogResponse,
    EntityRoutingRestoreRequest,
    EntityRoutingClearRequest,
    EntityRoutingClearResponse,
    EntityForwardRoutingLookup,
    EntityForwardRoutingResult,
)

router = APIRouter()
log = logging.getLogger("itemmaster.entity_routing")


# ═══════════════════════════════════════════════════════════════════════════════
#  INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _get_company_name(db: Session, company_id: Optional[int]) -> Optional[str]:
    if not company_id:
        return None
    try:
        import db_models as gm
        co = db.query(gm.Company).filter(gm.Company.id == company_id).first()
        return co.company_name if co else f"Company #{company_id}"
    except Exception:
        return f"Company #{company_id}"


def _get_dept_name(db: Session, dept_id: Optional[int]) -> Optional[str]:
    if not dept_id:
        return None
    try:
        import db_models as gm
        d = db.query(gm.Department).filter(gm.Department.id == dept_id).first()
        return d.department_name if d else f"Dept #{dept_id}"
    except Exception:
        return f"Dept #{dept_id}"


def _get_user_info(db: Session, user_id: Optional[int]):
    """Returns (full_name, email) or (None, None)."""
    if not user_id:
        return None, None
    try:
        from user import user_models as um
        u = db.query(um.User).filter(um.User.id == user_id).first()
        if u:
            return (getattr(u, "full_name", None) or f"User #{user_id}"), \
                   (getattr(u, "email", None))
        return f"User #{user_id}", None
    except Exception:
        return f"User #{user_id}", None


def _get_flow(db: Session, flow_id: int):
    """Load flow with name/company — raises 404 if not found."""
    from itemmaster.workflow_builder_models import ItemMasterWorkflowFlow
    flow = db.query(ItemMasterWorkflowFlow).filter(
        ItemMasterWorkflowFlow.id == flow_id
    ).first()
    if not flow:
        raise HTTPException(status_code=404, detail=f"Flow {flow_id} not found")
    return flow


def _routing_to_snapshot(r: ItemMasterWorkflowEntityRouting) -> str:
    """Serialise one routing row to JSON for audit log."""
    return json.dumps({
        "id":                r.id,
        "flow_id":           r.flow_id,
        "entity_key":        r.entity_key,
        "routing_type":      r.routing_type.value if r.routing_type else None,
        "target_company_id": r.target_company_id,
        "target_company_name": r.target_company_name,
        "target_dept_id":    r.target_dept_id,
        "target_dept_name":  r.target_dept_name,
        "target_user_id":    r.target_user_id,
        "target_user_name":  r.target_user_name,
        "target_user_email": r.target_user_email,
        "source_dept_id":    r.source_dept_id,
        "source_dept_name":  r.source_dept_name,
        "entity_id":         r.entity_id,
        "request_id":        r.request_id,
        "routing_notes":     r.routing_notes,
        "is_active":         r.is_active,
    })


def _write_log(
    db: Session,
    routing: ItemMasterWorkflowEntityRouting,
    action: RoutingLogAction,
    changed_by: Optional[int] = None,
    note: Optional[str] = None,
    previous_json: Optional[str] = None,
):
    """Append one audit log row."""
    changed_by_name = None
    if changed_by:
        name, _ = _get_user_info(db, changed_by)
        changed_by_name = name

    log_row = ItemMasterWorkflowEntityRoutingLog(
        routing_id      = routing.id,
        flow_id         = routing.flow_id,
        entity_key      = routing.entity_key,
        action          = action,
        snapshot_json   = _routing_to_snapshot(routing),
        previous_json   = previous_json,
        changed_by      = changed_by,
        changed_by_name = changed_by_name,
        note            = note,
    )
    db.add(log_row)


def _fill_routing_snapshots(
    db: Session,
    routing: ItemMasterWorkflowEntityRouting,
    payload_company_id: Optional[int],
    payload_dept_id: Optional[int],
    payload_user_id: Optional[int],
    payload_source_dept_id: Optional[int],
):
    """Resolve and set all *_name snapshot columns."""
    if payload_company_id:
        routing.target_company_name = _get_company_name(db, payload_company_id)
    if payload_dept_id:
        routing.target_dept_name = _get_dept_name(db, payload_dept_id)
    if payload_source_dept_id:
        routing.source_dept_name = _get_dept_name(db, payload_source_dept_id)
    if payload_user_id:
        uname, uemail = _get_user_info(db, payload_user_id)
        routing.target_user_name  = uname
        routing.target_user_email = uemail


# ═══════════════════════════════════════════════════════════════════════════════
#  1.  POST  /item-master/entity-routing
#      Create or upsert routing for a single entity card
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master/entity-routing",
    response_model=EntityRoutingResponse,
    status_code=201,
    summary="Workflow Entity Routing — Create / upsert routing for one entity card",
)
def create_or_upsert_entity_routing(
    payload: EntityRoutingCreate,
    db: Session = Depends(get_db),
):
    """
    Create or update routing for a single entity card.

    If a routing already exists for (flow_id, entity_key, source_dept_id, entity_id),
    it is updated in-place (upsert). Otherwise a new row is created.
    Full audit log is written on every call.
    """
    _get_flow(db, payload.flow_id)  # validate flow exists

    # Upsert: find existing routing with same key
    existing = db.query(ItemMasterWorkflowEntityRouting).filter(
        ItemMasterWorkflowEntityRouting.flow_id       == payload.flow_id,
        ItemMasterWorkflowEntityRouting.entity_key    == payload.entity_key,
        ItemMasterWorkflowEntityRouting.source_dept_id == payload.source_dept_id,
        ItemMasterWorkflowEntityRouting.entity_id     == payload.entity_id,
    ).first()

    if existing:
        # UPDATE — save previous state for log
        previous = _routing_to_snapshot(existing)

        existing.routing_type      = RoutingType(payload.routing_type.value)
        existing.target_company_id = payload.target_company_id
        existing.target_dept_id    = payload.target_dept_id
        existing.target_user_id    = payload.target_user_id
        existing.source_dept_id    = payload.source_dept_id
        existing.entity_id         = payload.entity_id
        existing.request_id        = payload.request_id
        existing.routing_notes     = payload.routing_notes
        existing.is_active         = True
        existing.updated_by        = payload.saved_by

        _fill_routing_snapshots(
            db, existing,
            payload.target_company_id, payload.target_dept_id,
            payload.target_user_id, payload.source_dept_id,
        )

        db.flush()
        _write_log(db, existing, RoutingLogAction.UPDATED,
                   changed_by=payload.saved_by, previous_json=previous)
        db.commit()
        db.refresh(existing)
        return existing

    # CREATE
    new_routing = ItemMasterWorkflowEntityRouting(
        flow_id         = payload.flow_id,
        entity_key      = payload.entity_key,
        routing_type    = RoutingType(payload.routing_type.value),
        target_company_id = payload.target_company_id,
        target_dept_id  = payload.target_dept_id,
        target_user_id  = payload.target_user_id,
        source_dept_id  = payload.source_dept_id,
        entity_id       = payload.entity_id,
        request_id      = payload.request_id,
        routing_notes   = payload.routing_notes,
        is_active       = True,
        created_by      = payload.saved_by,
        updated_by      = payload.saved_by,
    )
    _fill_routing_snapshots(
        db, new_routing,
        payload.target_company_id, payload.target_dept_id,
        payload.target_user_id, payload.source_dept_id,
    )
    db.add(new_routing)
    db.flush()
    _write_log(db, new_routing, RoutingLogAction.CREATED,
               changed_by=payload.saved_by)
    db.commit()
    db.refresh(new_routing)
    return new_routing


# ═══════════════════════════════════════════════════════════════════════════════
#  2.  GET  /item-master/entity-routing/flow/{flow_id}
#      All routing rules for a flow
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-master/entity-routing/flow/{flow_id}",
    response_model=List[EntityRoutingResponse],
    summary="Workflow Entity Routing — Get all routing rules for a flow",
)
def get_flow_routings(
    flow_id: int,
    active_only: bool = Query(True),
    entity_key: Optional[str] = Query(None, description="Filter by entity card key"),
    source_dept_id: Optional[int] = Query(None),
    entity_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Returns all routing rules for a given flow, with optional filters."""
    q = db.query(ItemMasterWorkflowEntityRouting).filter(
        ItemMasterWorkflowEntityRouting.flow_id == flow_id
    )
    if active_only:
        q = q.filter(ItemMasterWorkflowEntityRouting.is_active == True)
    if entity_key:
        q = q.filter(ItemMasterWorkflowEntityRouting.entity_key == entity_key)
    if source_dept_id is not None:
        q = q.filter(ItemMasterWorkflowEntityRouting.source_dept_id == source_dept_id)
    if entity_id is not None:
        q = q.filter(ItemMasterWorkflowEntityRouting.entity_id == entity_id)

    return q.order_by(
        ItemMasterWorkflowEntityRouting.entity_key,
        ItemMasterWorkflowEntityRouting.source_dept_id,
    ).all()


# ═══════════════════════════════════════════════════════════════════════════════
#  3.  GET  /item-master/entity-routing/{routing_id}
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-master/entity-routing/{routing_id}",
    response_model=EntityRoutingResponse,
    summary="Workflow Entity Routing — Get one routing rule by ID",
)
def get_routing_by_id(routing_id: int, db: Session = Depends(get_db)):
    r = db.query(ItemMasterWorkflowEntityRouting).filter(
        ItemMasterWorkflowEntityRouting.id == routing_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Routing {routing_id} not found")
    return r


# ═══════════════════════════════════════════════════════════════════════════════
#  4.  PUT  /item-master/entity-routing/{routing_id}
# ═══════════════════════════════════════════════════════════════════════════════

@router.put(
    "/item-master/entity-routing/{routing_id}",
    response_model=EntityRoutingResponse,
    summary="Workflow Entity Routing — Update a routing rule",
)
def update_routing(
    routing_id: int,
    payload: EntityRoutingUpdate,
    db: Session = Depends(get_db),
):
    r = db.query(ItemMasterWorkflowEntityRouting).filter(
        ItemMasterWorkflowEntityRouting.id == routing_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Routing {routing_id} not found")

    previous = _routing_to_snapshot(r)

    if payload.routing_type is not None:
        r.routing_type = RoutingType(payload.routing_type.value)
    if payload.target_company_id is not None:
        r.target_company_id   = payload.target_company_id
        r.target_company_name = _get_company_name(db, payload.target_company_id)
    if payload.target_dept_id is not None:
        r.target_dept_id   = payload.target_dept_id
        r.target_dept_name = _get_dept_name(db, payload.target_dept_id)
    if payload.target_user_id is not None:
        r.target_user_id = payload.target_user_id
        uname, uemail    = _get_user_info(db, payload.target_user_id)
        r.target_user_name  = uname
        r.target_user_email = uemail
    if payload.source_dept_id is not None:
        r.source_dept_id   = payload.source_dept_id
        r.source_dept_name = _get_dept_name(db, payload.source_dept_id)
    if payload.routing_notes is not None:
        r.routing_notes = payload.routing_notes
    r.updated_by = payload.saved_by

    db.flush()
    _write_log(db, r, RoutingLogAction.UPDATED,
               changed_by=payload.saved_by, previous_json=previous)
    db.commit()
    db.refresh(r)
    return r


# ═══════════════════════════════════════════════════════════════════════════════
#  5.  DELETE  /item-master/entity-routing/{routing_id}  (soft-delete)
# ═══════════════════════════════════════════════════════════════════════════════

@router.delete(
    "/item-master/entity-routing/{routing_id}",
    summary="Workflow Entity Routing — Soft-delete (clear) one routing rule",
)
def delete_routing(
    routing_id: int,
    deleted_by: Optional[int] = Query(None),
    note: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    r = db.query(ItemMasterWorkflowEntityRouting).filter(
        ItemMasterWorkflowEntityRouting.id == routing_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Routing {routing_id} not found")

    previous = _routing_to_snapshot(r)
    r.is_active  = False
    r.updated_by = deleted_by
    db.flush()
    _write_log(db, r, RoutingLogAction.DELETED,
               changed_by=deleted_by, note=note, previous_json=previous)
    db.commit()
    return {"detail": f"Routing {routing_id} cleared", "routing_id": routing_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  6.  POST  /item-master/entity-routing/bulk-save
#      Save ALL routing rules for a flow in one call (Save Routing button)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master/entity-routing/bulk-save",
    response_model=BulkEntityRoutingResponse,
    status_code=201,
    summary="Workflow Entity Routing — Bulk save all routings for a flow",
)
def bulk_save_routings(
    payload: BulkEntityRoutingSave,
    db: Session = Depends(get_db),
):
    """
    Upsert all entity routing rules for a flow in one transaction.
    Called when the user clicks 'Save Routing' in the builder popup.

    If clear_missing=True (default), any entity_key NOT in the payload
    will be soft-deleted (is_active=False).

    Fully atomic — all saves or none commit.
    """
    _get_flow(db, payload.flow_id)

    saved_count   = 0
    cleared_count = 0
    skipped_count = 0
    saved_routings: List[ItemMasterWorkflowEntityRouting] = []

    incoming_keys = set()

    for item in payload.routings:
        # Determine unique key
        key_tuple = (
            payload.flow_id,
            item.entity_key,
            item.source_dept_id,
            item.entity_id,
        )
        incoming_keys.add(key_tuple)

        existing = db.query(ItemMasterWorkflowEntityRouting).filter(
            ItemMasterWorkflowEntityRouting.flow_id        == payload.flow_id,
            ItemMasterWorkflowEntityRouting.entity_key     == item.entity_key,
            ItemMasterWorkflowEntityRouting.source_dept_id == item.source_dept_id,
            ItemMasterWorkflowEntityRouting.entity_id      == item.entity_id,
        ).first()

        if existing:
            # Check if anything actually changed
            same = (
                existing.routing_type.value == item.routing_type.value
                and existing.target_company_id == item.target_company_id
                and existing.target_dept_id    == item.target_dept_id
                and existing.target_user_id    == item.target_user_id
                and existing.routing_notes     == item.routing_notes
                and existing.is_active         == True
            )
            if same:
                skipped_count += 1
                saved_routings.append(existing)
                continue

            previous = _routing_to_snapshot(existing)
            existing.routing_type      = RoutingType(item.routing_type.value)
            existing.target_company_id = item.target_company_id
            existing.target_dept_id    = item.target_dept_id
            existing.target_user_id    = item.target_user_id
            existing.source_dept_id    = item.source_dept_id
            existing.entity_id         = item.entity_id
            existing.request_id        = item.request_id
            existing.routing_notes     = item.routing_notes
            existing.is_active         = True
            existing.updated_by        = payload.saved_by
            _fill_routing_snapshots(
                db, existing,
                item.target_company_id, item.target_dept_id,
                item.target_user_id, item.source_dept_id,
            )
            db.flush()
            _write_log(db, existing, RoutingLogAction.UPDATED,
                       changed_by=payload.saved_by,
                       note=payload.note,
                       previous_json=previous)
            saved_count += 1
            saved_routings.append(existing)

        else:
            new_r = ItemMasterWorkflowEntityRouting(
                flow_id         = payload.flow_id,
                entity_key      = item.entity_key,
                routing_type    = RoutingType(item.routing_type.value),
                target_company_id = item.target_company_id,
                target_dept_id  = item.target_dept_id,
                target_user_id  = item.target_user_id,
                source_dept_id  = item.source_dept_id,
                entity_id       = item.entity_id,
                request_id      = item.request_id,
                routing_notes   = item.routing_notes,
                is_active       = True,
                created_by      = payload.saved_by,
                updated_by      = payload.saved_by,
            )
            _fill_routing_snapshots(
                db, new_r,
                item.target_company_id, item.target_dept_id,
                item.target_user_id, item.source_dept_id,
            )
            db.add(new_r)
            db.flush()
            _write_log(db, new_r, RoutingLogAction.CREATED,
                       changed_by=payload.saved_by, note=payload.note)
            saved_count += 1
            saved_routings.append(new_r)

    # Clear missing entity_keys if requested
    if payload.clear_missing:
        all_existing = db.query(ItemMasterWorkflowEntityRouting).filter(
            ItemMasterWorkflowEntityRouting.flow_id   == payload.flow_id,
            ItemMasterWorkflowEntityRouting.is_active == True,
        ).all()
        for r in all_existing:
            key_tuple = (payload.flow_id, r.entity_key, r.source_dept_id, r.entity_id)
            if key_tuple not in incoming_keys:
                previous = _routing_to_snapshot(r)
                r.is_active  = False
                r.updated_by = payload.saved_by
                db.flush()
                _write_log(db, r, RoutingLogAction.CLEARED,
                           changed_by=payload.saved_by,
                           note=f"Cleared by bulk-save (not in new payload)",
                           previous_json=previous)
                cleared_count += 1

    db.commit()
    for r in saved_routings:
        db.refresh(r)

    return BulkEntityRoutingResponse(
        flow_id       = payload.flow_id,
        saved_count   = saved_count,
        cleared_count = cleared_count,
        skipped_count = skipped_count,
        routings      = saved_routings,
        note          = payload.note,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  7.  POST  /item-master/entity-routing/clear
#      Clear routing for one or more (or all) entity cards in a flow
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master/entity-routing/clear",
    response_model=EntityRoutingClearResponse,
    summary="Workflow Entity Routing — Clear routing for entity cards",
)
def clear_entity_routing(
    payload: EntityRoutingClearRequest,
    db: Session = Depends(get_db),
):
    """
    Soft-delete routing rules for:
    - specific entity_keys (if entity_keys list provided), OR
    - ALL entity cards in the flow (if entity_keys is empty)
    """
    q = db.query(ItemMasterWorkflowEntityRouting).filter(
        ItemMasterWorkflowEntityRouting.flow_id   == payload.flow_id,
        ItemMasterWorkflowEntityRouting.is_active == True,
    )
    if payload.entity_keys:
        q = q.filter(ItemMasterWorkflowEntityRouting.entity_key.in_(payload.entity_keys))

    rows = q.all()
    cleared_keys = []
    for r in rows:
        previous = _routing_to_snapshot(r)
        r.is_active  = False
        r.updated_by = payload.cleared_by
        db.flush()
        _write_log(db, r, RoutingLogAction.CLEARED,
                   changed_by=payload.cleared_by,
                   note=payload.note or "Manually cleared",
                   previous_json=previous)
        cleared_keys.append(r.entity_key)

    db.commit()
    return EntityRoutingClearResponse(
        flow_id       = payload.flow_id,
        cleared_count = len(rows),
        cleared_keys  = cleared_keys,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  8.  POST  /item-master/entity-routing/lookup
#      Resolve forwarding target for an entity card (used by ItemInfoForwardPopup)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master/entity-routing/lookup",
    response_model=EntityForwardRoutingResult,
    summary="Workflow Entity Routing — Lookup forwarding target for entity card",
)
def lookup_entity_routing(
    payload: EntityForwardRoutingLookup,
    db: Session = Depends(get_db),
):
    """
    Given flow_id + entity_key (+ optional source_dept_id + entity_id),
    returns where to forward the task.

    Lookup priority:
    1. Per-request override: flow_id + entity_key + source_dept_id + entity_id (most specific)
    2. Per-source-dept default: flow_id + entity_key + source_dept_id + entity_id=NULL
    3. Flow-level default: flow_id + entity_key + source_dept_id=NULL + entity_id=NULL

    Returns routing_found=False if none configured.
    """
    candidates = []

    # Priority 1: most specific (request-level)
    if payload.entity_id and payload.source_dept_id:
        row = db.query(ItemMasterWorkflowEntityRouting).filter(
            ItemMasterWorkflowEntityRouting.flow_id        == payload.flow_id,
            ItemMasterWorkflowEntityRouting.entity_key     == payload.entity_key,
            ItemMasterWorkflowEntityRouting.source_dept_id == payload.source_dept_id,
            ItemMasterWorkflowEntityRouting.entity_id      == payload.entity_id,
            ItemMasterWorkflowEntityRouting.is_active      == True,
        ).first()
        if row:
            candidates.append(row)

    # Priority 2: source-dept default
    if payload.source_dept_id:
        row = db.query(ItemMasterWorkflowEntityRouting).filter(
            ItemMasterWorkflowEntityRouting.flow_id        == payload.flow_id,
            ItemMasterWorkflowEntityRouting.entity_key     == payload.entity_key,
            ItemMasterWorkflowEntityRouting.source_dept_id == payload.source_dept_id,
            ItemMasterWorkflowEntityRouting.entity_id.is_(None),
            ItemMasterWorkflowEntityRouting.is_active      == True,
        ).first()
        if row:
            candidates.append(row)

    # Priority 3: flow-level default
    row = db.query(ItemMasterWorkflowEntityRouting).filter(
        ItemMasterWorkflowEntityRouting.flow_id        == payload.flow_id,
        ItemMasterWorkflowEntityRouting.entity_key     == payload.entity_key,
        ItemMasterWorkflowEntityRouting.source_dept_id.is_(None),
        ItemMasterWorkflowEntityRouting.entity_id.is_(None),
        ItemMasterWorkflowEntityRouting.is_active      == True,
    ).first()
    if row:
        candidates.append(row)

    if not candidates:
        return EntityForwardRoutingResult(
            flow_id       = payload.flow_id,
            entity_key    = payload.entity_key,
            routing_found = False,
        )

    r = candidates[0]
    return EntityForwardRoutingResult(
        flow_id             = r.flow_id,
        entity_key          = r.entity_key,
        routing_found       = True,
        routing_type        = r.routing_type.value if r.routing_type else None,
        target_company_id   = r.target_company_id,
        target_company_name = r.target_company_name,
        target_dept_id      = r.target_dept_id,
        target_dept_name    = r.target_dept_name,
        target_user_id      = r.target_user_id,
        target_user_name    = r.target_user_name,
        target_user_email   = r.target_user_email,
        source_dept_id      = r.source_dept_id,
        source_dept_name    = r.source_dept_name,
        routing_id          = r.id,
        routing_notes       = r.routing_notes,
    )


@router.get(
    "/item-master/entity-routing/lookup/{flow_id}/{entity_key}",
    response_model=EntityForwardRoutingResult,
    summary="Workflow Entity Routing — Quick GET lookup for entity card routing",
)
def lookup_entity_routing_get(
    flow_id: int,
    entity_key: str,
    source_dept_id: Optional[int] = Query(None),
    entity_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """GET version of the lookup endpoint — no request body needed."""
    from itemmaster.workflow_entity_routing_schemas import EntityForwardRoutingLookup as _L
    return lookup_entity_routing(
        _L(flow_id=flow_id, entity_key=entity_key,
           source_dept_id=source_dept_id, entity_id=entity_id),
        db,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  9.  GET  /item-master/entity-routing/{routing_id}/logs
#      Audit log for one routing rule
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-master/entity-routing/{routing_id}/logs",
    response_model=List[EntityRoutingLogResponse],
    summary="Workflow Entity Routing — Audit log for one routing rule",
)
def get_routing_logs(
    routing_id: int,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return (
        db.query(ItemMasterWorkflowEntityRoutingLog)
        .filter(ItemMasterWorkflowEntityRoutingLog.routing_id == routing_id)
        .order_by(ItemMasterWorkflowEntityRoutingLog.created_at.desc())
        .limit(limit)
        .all()
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  10.  GET  /item-master/entity-routing/logs/flow/{flow_id}
#       All routing logs for a flow
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-master/entity-routing/logs/flow/{flow_id}",
    response_model=List[EntityRoutingLogResponse],
    summary="Workflow Entity Routing — All routing logs for a flow",
)
def get_flow_routing_logs(
    flow_id: int,
    entity_key: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Full audit trail for every routing change in a flow.
    Useful for admin audit view in the builder popup.
    """
    q = db.query(ItemMasterWorkflowEntityRoutingLog).filter(
        ItemMasterWorkflowEntityRoutingLog.flow_id == flow_id
    )
    if entity_key:
        q = q.filter(ItemMasterWorkflowEntityRoutingLog.entity_key == entity_key)
    return (
        q.order_by(ItemMasterWorkflowEntityRoutingLog.created_at.desc())
        .offset(offset).limit(limit)
        .all()
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  11.  GET  /item-master/entity-routing/logs/all
#       All routing logs (super-admin, paginated)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-master/entity-routing/logs/all",
    response_model=List[EntityRoutingLogResponse],
    summary="Workflow Entity Routing — All routing logs (admin, paginated)",
)
def get_all_routing_logs(
    flow_id: Optional[int] = Query(None),
    entity_key: Optional[str] = Query(None),
    changed_by: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(ItemMasterWorkflowEntityRoutingLog)
    if flow_id:
        q = q.filter(ItemMasterWorkflowEntityRoutingLog.flow_id == flow_id)
    if entity_key:
        q = q.filter(ItemMasterWorkflowEntityRoutingLog.entity_key == entity_key)
    if changed_by:
        q = q.filter(ItemMasterWorkflowEntityRoutingLog.changed_by == changed_by)
    if action:
        q = q.filter(ItemMasterWorkflowEntityRoutingLog.action == action.upper())
    return (
        q.order_by(ItemMasterWorkflowEntityRoutingLog.created_at.desc())
        .offset(offset).limit(limit)
        .all()
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  12.  POST  /item-master/entity-routing/{routing_id}/restore
#       Restore to a historical snapshot
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-master/entity-routing/{routing_id}/restore",
    response_model=EntityRoutingResponse,
    summary="Workflow Entity Routing — Restore routing to a historical snapshot",
)
def restore_routing(
    routing_id: int,
    payload: EntityRoutingRestoreRequest,
    db: Session = Depends(get_db),
):
    """
    Restore a routing rule to any historical state saved in the audit log.
    A new RESTORED log entry is created so the restore itself is audited.
    """
    r = db.query(ItemMasterWorkflowEntityRouting).filter(
        ItemMasterWorkflowEntityRouting.id == routing_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Routing {routing_id} not found")

    log_row = db.query(ItemMasterWorkflowEntityRoutingLog).filter(
        ItemMasterWorkflowEntityRoutingLog.id         == payload.log_id,
        ItemMasterWorkflowEntityRoutingLog.routing_id == routing_id,
    ).first()
    if not log_row or not log_row.snapshot_json:
        raise HTTPException(status_code=404,
                            detail=f"Log {payload.log_id} not found or has no snapshot")

    try:
        snap = json.loads(log_row.snapshot_json)
    except Exception:
        raise HTTPException(status_code=422, detail="Snapshot JSON is corrupt")

    previous = _routing_to_snapshot(r)

    r.routing_type      = RoutingType(snap.get("routing_type", "dept"))
    r.target_company_id = snap.get("target_company_id")
    r.target_company_name = snap.get("target_company_name")
    r.target_dept_id    = snap.get("target_dept_id")
    r.target_dept_name  = snap.get("target_dept_name")
    r.target_user_id    = snap.get("target_user_id")
    r.target_user_name  = snap.get("target_user_name")
    r.target_user_email = snap.get("target_user_email")
    r.source_dept_id    = snap.get("source_dept_id")
    r.source_dept_name  = snap.get("source_dept_name")
    r.routing_notes     = snap.get("routing_notes")
    r.is_active         = True
    r.updated_by        = payload.restored_by

    db.flush()
    _write_log(
        db, r, RoutingLogAction.RESTORED,
        changed_by=payload.restored_by,
        note=payload.note or f"Restored from log #{payload.log_id}",
        previous_json=previous,
    )
    db.commit()
    db.refresh(r)
    return r


# ═══════════════════════════════════════════════════════════════════════════════
#  13.  GET  /item-master/entity-routing/summary/{flow_id}
#       Full routing summary for a flow
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-master/entity-routing/summary/{flow_id}",
    response_model=FlowRoutingSummary,
    summary="Workflow Entity Routing — Full routing summary for a flow",
)
def get_flow_routing_summary(
    flow_id: int,
    db: Session = Depends(get_db),
):
    """
    Returns a complete FlowRoutingSummary:
    - Flow metadata (name, company, plant)
    - routing_map: { entity_key → routing rule or null }
    - Counts: how many cards have routing configured

    Used by the builder popup to show the full routing state on open.
    """
    flow = _get_flow(db, flow_id)

    routings = db.query(ItemMasterWorkflowEntityRouting).filter(
        ItemMasterWorkflowEntityRouting.flow_id   == flow_id,
        ItemMasterWorkflowEntityRouting.is_active == True,
    ).all()

    from itemmaster.workflow_entity_routing_schemas import EntityRoutingResponse as _R
    routing_map: dict = {}
    for r in routings:
        # Keyed by entity_key (for simple lookup; per-source-dept stored separately)
        key = r.entity_key
        if key not in routing_map:
            routing_map[key] = _R.from_orm(r)

    return FlowRoutingSummary(
        flow_id       = flow.id,
        flow_name     = flow.flow_name,
        company_id    = flow.company_id,
        company_name  = flow.company.company_name if flow.company else None,
        plant_id      = flow.plant_id,
        plant_name    = flow.plant.plant_name if flow.plant else None,
        routing_map   = routing_map,
        total_entities_routed = len(routing_map),
        total_entities        = len(routing_map),
    )