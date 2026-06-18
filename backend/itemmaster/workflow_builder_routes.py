"""
itemmaster/workflow_builder_routes.py
──────────────────────────────────────────────────────────────────────────────
REST API for Item Master Workflow Builder.

Endpoints
─────────
POST   /item-master/workflow-flows                    — create new flow
GET    /item-master/workflow-flows                    — list all flows (filter by company/plant)
GET    /item-master/workflow-flows/{flow_id}          — get one flow (full layout)
PUT    /item-master/workflow-flows/{flow_id}/save     — save layout (Save Flow button)
PUT    /item-master/workflow-flows/{flow_id}/reset    — reset to default layout
DELETE /item-master/workflow-flows/{flow_id}          — soft-delete a flow
POST   /item-master/workflow-flows/{flow_id}/restore  — restore from a log snapshot

GET    /item-master/workflow-flows/{flow_id}/logs     — full audit log for a flow
GET    /item-master/workflow-flows/logs/all           — all logs (admin view)

GET    /item-master/workflow-flows/count              — total / per-company counts
"""

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from itemmaster.workflow_builder_models import (
    ItemMasterWorkflowFlow,
    ItemMasterWorkflowGroupOrder,
    ItemMasterWorkflowGroupEntity,
    ItemMasterWorkflowFlowLog,
    FlowLogAction,
)
from itemmaster.workflow_builder_schemas import (
    WorkflowFlowCreate,
    WorkflowFlowSave,
    WorkflowFlowResponse,
    WorkflowFlowSummary,
    WorkflowFlowLogResponse,
    WorkflowFlowRestoreRequest,
)

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _build_layout(flow: ItemMasterWorkflowFlow):
    """Convert ORM rows → grouped layout dicts (mirrors frontend state)."""
    group_order = [
        go.group_key
        for go in sorted(flow.group_orders, key=lambda x: x.display_order)
    ]

    group_entity_ids: dict = {}
    for ge in sorted(flow.group_entities, key=lambda x: x.entity_order):
        group_entity_ids.setdefault(ge.group_key, []).append(ge.entity_key)

    return group_order, group_entity_ids


def _flow_to_response(flow: ItemMasterWorkflowFlow) -> WorkflowFlowResponse:
    group_order, group_entity_ids = _build_layout(flow)
    return WorkflowFlowResponse(
        id=flow.id,
        flow_name=flow.flow_name,
        company_id=flow.company_id,
        plant_id=flow.plant_id,
        is_active=flow.is_active,
        is_default=flow.is_default,
        created_at=flow.created_at,
        updated_at=flow.updated_at,
        company_name=flow.company.company_name if flow.company else None,
        plant_name=flow.plant.plant_name if flow.plant else None,
        group_order=group_order,
        group_entity_ids=group_entity_ids,
    )


def _snapshot(flow: ItemMasterWorkflowFlow) -> str:
    """Serialise current layout to JSON string for audit log."""
    group_order, group_entity_ids = _build_layout(flow)
    return json.dumps({
        "group_order":      group_order,
        "group_entity_ids": group_entity_ids,
    })


def _write_layout(
    db: Session,
    flow: ItemMasterWorkflowFlow,
    group_order: List[str],
    group_entity_ids: dict,
):
    """Replace all group_order + group_entities rows for this flow."""
    # Delete existing
    db.query(ItemMasterWorkflowGroupOrder).filter_by(flow_id=flow.id).delete()
    db.query(ItemMasterWorkflowGroupEntity).filter_by(flow_id=flow.id).delete()

    # Insert group order
    for idx, gk in enumerate(group_order):
        db.add(ItemMasterWorkflowGroupOrder(
            flow_id=flow.id,
            group_key=gk,
            display_order=idx,
        ))

    # Insert entities
    for gk, entity_keys in group_entity_ids.items():
        for eidx, ek in enumerate(entity_keys):
            db.add(ItemMasterWorkflowGroupEntity(
                flow_id=flow.id,
                group_key=gk,
                entity_key=ek,
                entity_order=eidx,
            ))


def _add_log(
    db: Session,
    flow: ItemMasterWorkflowFlow,
    action: FlowLogAction,
    note: Optional[str] = None,
):
    """Append one audit-log row (snapshot taken before calling this)."""
    db.add(ItemMasterWorkflowFlowLog(
        flow_id=flow.id,
        action=action,
        snapshot_json=_snapshot(flow),
        note=note,
    ))


# ─── 1. Create Flow ───────────────────────────────────────────────────────────

@router.post(
    "/item-master/workflow-flows",
    response_model=WorkflowFlowResponse,
    summary="📋 Item Master – Create Workflow Flow",
)
def create_workflow_flow(
    payload: WorkflowFlowCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new named workflow flow for a company (+optional plant).
    Duplicate (flow_name + company_id + plant_id) is rejected.
    """
    # Duplicate check
    existing = (
        db.query(ItemMasterWorkflowFlow)
        .filter_by(
            flow_name=payload.flow_name,
            company_id=payload.company_id,
            plant_id=payload.plant_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Flow '{payload.flow_name}' already exists for this company/plant.",
        )

    flow = ItemMasterWorkflowFlow(
        flow_name=payload.flow_name,
        company_id=payload.company_id,
        plant_id=payload.plant_id,
        is_active=True,
        is_default=False,
    )
    db.add(flow)
    db.flush()   # get flow.id

    # Write initial layout if provided
    if payload.group_order and payload.group_entity_ids:
        _write_layout(db, flow, payload.group_order, payload.group_entity_ids)
    
    db.flush()

    # First log
    db.add(ItemMasterWorkflowFlowLog(
        flow_id=flow.id,
        action=FlowLogAction.CREATED,
        snapshot_json=json.dumps({
            "group_order":      payload.group_order or [],
            "group_entity_ids": payload.group_entity_ids or {},
        }),
        note="Flow created",
    ))

    db.commit()
    db.refresh(flow)
    return _flow_to_response(flow)


# ─── 2. List Flows ────────────────────────────────────────────────────────────

@router.get(
    "/item-master/workflow-flows",
    response_model=List[WorkflowFlowSummary],
    summary="📋 Item Master – List Workflow Flows",
)
def list_workflow_flows(
    company_id: Optional[int] = Query(None, description="Filter by company"),
    plant_id:   Optional[int] = Query(None, description="Filter by plant"),
    is_active:  Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
):
    q = db.query(ItemMasterWorkflowFlow)
    if company_id is not None:
        q = q.filter_by(company_id=company_id)
    if plant_id is not None:
        q = q.filter_by(plant_id=plant_id)
    if is_active is not None:
        q = q.filter_by(is_active=is_active)

    flows = q.order_by(ItemMasterWorkflowFlow.created_at.desc()).all()

    result = []
    for f in flows:
        result.append(WorkflowFlowSummary(
            id=f.id,
            flow_name=f.flow_name,
            company_id=f.company_id,
            company_name=f.company.company_name if f.company else None,
            plant_id=f.plant_id,
            plant_name=f.plant.plant_name if f.plant else None,
            is_active=f.is_active,
            is_default=f.is_default,
            total_logs=len(f.logs),
            created_at=f.created_at,
            updated_at=f.updated_at,
        ))
    return result


# ─── 3. Get One Flow ──────────────────────────────────────────────────────────

@router.get(
    "/item-master/workflow-flows/{flow_id}",
    response_model=WorkflowFlowResponse,
    summary="📋 Item Master – Get Workflow Flow",
)
def get_workflow_flow(flow_id: int, db: Session = Depends(get_db)):
    flow = db.query(ItemMasterWorkflowFlow).filter_by(id=flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Workflow flow not found.")
    return _flow_to_response(flow)


# ─── 4. Save Flow (💾 Save Flow button) ──────────────────────────────────────

@router.put(
    "/item-master/workflow-flows/{flow_id}/save",
    response_model=WorkflowFlowResponse,
    summary="💾 Item Master – Save Flow Layout",
)
def save_workflow_flow(
    flow_id: int,
    payload: WorkflowFlowSave,
    db: Session = Depends(get_db),
):
    """
    Called when the user clicks 'Save Flow'.
    Replaces all group_order + group_entities rows atomically,
    then appends an UPDATED log with the previous snapshot.
    """
    flow = db.query(ItemMasterWorkflowFlow).filter_by(id=flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Workflow flow not found.")
    if not flow.is_active:
        raise HTTPException(status_code=400, detail="Cannot save a deleted (inactive) flow.")

    # Audit log BEFORE overwriting
    _add_log(db, flow, FlowLogAction.UPDATED, note=payload.note or "Manual save")

    # Overwrite layout
    _write_layout(db, flow, payload.group_order, payload.group_entity_ids)

    db.commit()
    db.refresh(flow)
    return _flow_to_response(flow)


# ─── 5. Reset Flow ───────────────────────────────────────────────────────────

@router.put(
    "/item-master/workflow-flows/{flow_id}/reset",
    response_model=WorkflowFlowResponse,
    summary="🔄 Item Master – Reset Flow to Default",
)
def reset_workflow_flow(
    flow_id: int,
    payload: WorkflowFlowSave,   # caller sends the default layout
    db: Session = Depends(get_db),
):
    """
    Reset active custom flow to default layout.
    The frontend sends the DEFAULT_GROUP_ORDER and DEFAULT_GROUP_ENTITY_IDS.
    """
    flow = db.query(ItemMasterWorkflowFlow).filter_by(id=flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Workflow flow not found.")

    _add_log(db, flow, FlowLogAction.RESET, note="Reset to default layout")
    _write_layout(db, flow, payload.group_order, payload.group_entity_ids)

    db.commit()
    db.refresh(flow)
    return _flow_to_response(flow)


# ─── 6. Delete Flow (soft) ───────────────────────────────────────────────────

@router.delete(
    "/item-master/workflow-flows/{flow_id}",
    summary="🗑️ Item Master – Delete Workflow Flow",
)
def delete_workflow_flow(flow_id: int, db: Session = Depends(get_db)):
    flow = db.query(ItemMasterWorkflowFlow).filter_by(id=flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Workflow flow not found.")
    if flow.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete the default flow.")

    _add_log(db, flow, FlowLogAction.DELETED, note="Flow soft-deleted")
    flow.is_active = False

    db.commit()
    return {
        "success": True,
        "message": f"Flow '{flow.flow_name}' deleted (soft).",
        "flow_id": flow_id,
    }


# ─── 7. Restore from Log ─────────────────────────────────────────────────────

@router.post(
    "/item-master/workflow-flows/{flow_id}/restore",
    response_model=WorkflowFlowResponse,
    summary="♻️ Item Master – Restore Flow from Log Snapshot",
)
def restore_workflow_flow(
    flow_id: int,
    payload: WorkflowFlowRestoreRequest,
    db: Session = Depends(get_db),
):
    """
    Restore a flow's layout from a historical audit-log snapshot.
    This lets you 'undo' any save and roll back to a previous version.
    """
    flow = db.query(ItemMasterWorkflowFlow).filter_by(id=flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Workflow flow not found.")

    log_entry = (
        db.query(ItemMasterWorkflowFlowLog)
        .filter_by(id=payload.log_id, flow_id=flow_id)
        .first()
    )
    if not log_entry or not log_entry.snapshot_json:
        raise HTTPException(status_code=404, detail="Log snapshot not found.")

    try:
        snap = json.loads(log_entry.snapshot_json)
        group_order      = snap["group_order"]
        group_entity_ids = snap["group_entity_ids"]
    except (json.JSONDecodeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid snapshot: {exc}")

    # Log the restore event (with current-state snapshot before overwriting)
    _add_log(
        db, flow, FlowLogAction.RESTORED,
        note=f"Restored from log #{payload.log_id} ({log_entry.action.value} on {log_entry.created_at})"
    )

    # Re-activate if it was soft-deleted
    flow.is_active = True

    _write_layout(db, flow, group_order, group_entity_ids)

    db.commit()
    db.refresh(flow)
    return _flow_to_response(flow)


# ─── 8. Get Flow Logs ────────────────────────────────────────────────────────

@router.get(
    "/item-master/workflow-flows/{flow_id}/logs",
    response_model=List[WorkflowFlowLogResponse],
    summary="📜 Item Master – Get Workflow Flow Logs",
)
def get_flow_logs(
    flow_id: int,
    limit:  int = Query(50,  ge=1,  le=500),
    offset: int = Query(0,   ge=0),
    db: Session = Depends(get_db),
):
    flow = db.query(ItemMasterWorkflowFlow).filter_by(id=flow_id).first()
    if not flow:
        raise HTTPException(status_code=404, detail="Workflow flow not found.")

    logs = (
        db.query(ItemMasterWorkflowFlowLog)
        .filter_by(flow_id=flow_id)
        .order_by(ItemMasterWorkflowFlowLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        WorkflowFlowLogResponse(
            id=lg.id,
            flow_id=lg.flow_id,
            action=lg.action.value,
            snapshot_json=lg.snapshot_json,
            note=lg.note,
            created_at=lg.created_at,
        )
        for lg in logs
    ]


# ─── 9. All Logs (admin) ─────────────────────────────────────────────────────

@router.get(
    "/item-master/workflow-flows/logs/all",
    response_model=List[WorkflowFlowLogResponse],
    summary="📜 Item Master – All Workflow Flow Logs (Admin)",
)
def get_all_flow_logs(
    company_id: Optional[int] = Query(None),
    limit:  int = Query(100, ge=1, le=1000),
    offset: int = Query(0,   ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(ItemMasterWorkflowFlowLog)

    if company_id is not None:
        q = (
            q.join(ItemMasterWorkflowFlow, ItemMasterWorkflowFlowLog.flow_id == ItemMasterWorkflowFlow.id)
             .filter(ItemMasterWorkflowFlow.company_id == company_id)
        )

    logs = (
        q.order_by(ItemMasterWorkflowFlowLog.created_at.desc())
         .offset(offset)
         .limit(limit)
         .all()
    )
    return [
        WorkflowFlowLogResponse(
            id=lg.id,
            flow_id=lg.flow_id,
            action=lg.action.value,
            snapshot_json=lg.snapshot_json,
            note=lg.note,
            created_at=lg.created_at,
        )
        for lg in logs
    ]


# ─── 10. Flow Counts ─────────────────────────────────────────────────────────

@router.get(
    "/item-master/workflow-flows/count",
    summary="📊 Item Master – Workflow Flow Counts",
)
def get_flow_counts(db: Session = Depends(get_db)):
    """Returns total active flows + breakdown per company."""
    all_flows = (
        db.query(ItemMasterWorkflowFlow)
        .filter_by(is_active=True)
        .all()
    )
    per_company: dict = {}
    for f in all_flows:
        cname = f.company.company_name if f.company else str(f.company_id)
        per_company.setdefault(cname, {"company_id": f.company_id, "count": 0})
        per_company[cname]["count"] += 1

    return {
        "total_active_flows": len(all_flows),
        "per_company": list(per_company.values()),
    }