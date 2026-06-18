"""
MDM/mdm_access_routes.py
─────────────────────────────────────────────────────────────────────────────
MDM (Master Data Management) — Page Access Control Backend

PURPOSE
-------
Yeh module MDM My Requests page (MdmMyReq.jsx) ke liye backend support
provide karta hai:

  1. GET  /mdm/access-check/{user_id}
     → Check karta hai ki kya user Step 2+ workflow approver hai.
        Agar hai toh MDM My Req page access milegi.
        Frontend (MdmMyReq.jsx) ka RBAC check pehle se hai; yeh
        additional backend gate hai.

  2. GET  /mdm/inbox/{user_id}
     → Step 2+ pending requests jo is user ke approval ka wait kar rahi hain.
        Internally /workflow/inbox/{user_id} hi call hoti hai lekin
        sirf step_order > 1 wali rows return karta hai.

  3. GET  /mdm/my-actions/{user_id}
     → Requests jis par yeh user (Step 2+ approver) pehle action le chuka hai.

  4. GET  /mdm/step2-notification-check/{user_id}
     → Debug: kya is user ko Step 1 approve hone ki notification milegi?
        (Yeh wf_step_approver rows check karta hai for step_order >= 2)

─────────────────────────────────────────────────────────────────────────────
AUDIT / HISTORY ENDPOINTS  (nayi — MDM/mdm_models.py tables use karti hain)
─────────────────────────────────────────────────────────────────────────────

  5. POST  /mdm/audit/log
     → Step 2+ action hone par ek MdmStep2AuditLog row insert karo.
        workflow_routes.py ke take_action endpoint ke baad call karo.

  6. GET   /mdm/audit/request/{entity_type}/{entity_id}
     → Ek specific request ka poora Step 2+ audit trail (A to Z history).

  7. GET   /mdm/audit/approver/{user_id}
     → Ek approver ne kya kya kiya: saari audit log entries newest-first.

  8. GET   /mdm/audit/approver/{user_id}/stats
     → Approver ke liye summary stats: kitne approve/reject/return, avg time.

  9. POST  /mdm/audit/field-change
     → Jab koi field change ho (RETURN ke baad submitter edit kare ya
        approver correct kare), ek MdmStep2FieldChangeLog row insert karo.

 10. GET   /mdm/audit/field-changes/{entity_id}
     → Ek request ke saare field-level changes.

 11. POST  /mdm/session/start
     → Jab approver MDM My Req page open kare, session log start karo.

 12. PATCH /mdm/session/{session_id}/end
     → Jab approver page se chale jaye, session end karo with summary.

 13. GET   /mdm/session/user/{user_id}
     → Approver ki saari sessions — kitna time spend kiya, kitne actions.

 14. POST  /mdm/escalation/
     → Naya escalation log create karo (SLA breach ya manual).

 15. PATCH /mdm/escalation/{escalation_id}/resolve
     → Escalation resolve mark karo.

 16. GET   /mdm/escalation/unresolved
     → Saari unresolved escalations (admin view).

 17. GET   /mdm/audit/full-history/{entity_type}/{entity_id}
     → Ek request ka COMPLETE history: audit logs + field changes + escalations.
        MdmRequestHistory schema return karta hai.

INTEGRATION
-----------
main.py mein pehle se hai:
    from MDM.mdm_access_routes import router as mdm_router
    app.include_router(mdm_router, prefix="/api", tags=["🗂️ MDM — Master Data Management"])

main.py mein sirf yeh do lines add karo (table creation ke liye):
    from MDM import mdm_models

WORKFLOW
--------
Step 1 approve hota hai
    → _advance_instance() → _notify_approvers_for_step() for Step 2
    → Step 2 approvers ko notification jaati hai (wf_user_notification)
    → MdmMyReq.jsx SSE stream par event aata hai → auto-refresh
    → /mdm/inbox/{user_id} mein naya item dikhta hai
    → Approver action leta hai → POST /mdm/audit/log → MdmStep2AuditLog row
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from database import get_db
from user import user_models as umodels
from itemmaster.workflow_models import (
    WorkflowInstance, WorkflowStepInstance, WorkflowStepApprover,
    WorkflowAction, WorkflowTemplate, WorkflowStep,
    WorkflowStatusEnum, StepStatusEnum, ActionTypeEnum,
)
from MDM.mdm_models import (
    MdmStep2AuditLog, MdmStep2FieldChangeLog,
    MdmStep2SessionLog, MdmStep2EscalationLog,
    MdmActionTypeEnum, MdmEscalationReasonEnum,
)
from MDM.mdm_schemas import (
    MdmStep2AuditLogCreate, MdmStep2AuditLogResponse,
    MdmStep2FieldChangeCreate, MdmStep2FieldChangeResponse,
    MdmStep2SessionStart, MdmStep2SessionEnd, MdmStep2SessionResponse,
    MdmStep2EscalationCreate, MdmStep2EscalationResolve, MdmStep2EscalationResponse,
    MdmApproverStats, MdmRequestHistory,
)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  INTERNAL HELPERS  (original — unchanged)
# ─────────────────────────────────────────────────────────────────────────────

def _get_user_accesses(db: Session, user_id: int):
    """Return all UserCompanyAccess rows for a user."""
    return (
        db.query(umodels.UserCompanyAccess)
        .options(
            joinedload(umodels.UserCompanyAccess.role),
            joinedload(umodels.UserCompanyAccess.department),
            joinedload(umodels.UserCompanyAccess.designation),
        )
        .filter(umodels.UserCompanyAccess.user_id == user_id)
        .all()
    )


def _user_is_step2plus_approver(db: Session, user_id: int) -> bool:
    """
    Returns True if the user is configured as an approver for ANY step
    with step_order >= 2 in any active workflow template.

    Logic:
      1. Get all wf_step_approver rows where step's step_order >= 2
      2. Check if user's UserCompanyAccess matches any of those approver rows
         (same strict matching as _user_is_configured_approver in workflow_routes.py)
    """
    user_accesses = _get_user_accesses(db, user_id)
    if not user_accesses:
        return False

    # Get all step 2+ approver rules (active steps only)
    step2_approvers = (
        db.query(WorkflowStepApprover)
        .join(WorkflowStep, WorkflowStepApprover.step_id == WorkflowStep.id)
        .filter(
            WorkflowStepApprover.is_active == True,
            WorkflowStep.step_order >= 2,
            WorkflowStep.is_active == True,
        )
        .all()
    )

    if not step2_approvers:
        return False

    for approver in step2_approvers:
        # Skip fully-wildcard rules (all TO fields NULL)
        if (approver.role_id is None and
                approver.department_id is None and
                approver.designation_id is None and
                approver.company_id is None):
            continue

        # Specific user_id assignment check (takes priority)
        if approver.user_id is not None:
            if approver.user_id == user_id:
                return True
            continue

        # STRICT matching: each non-NULL field in the rule must equal the user's field
        for access in user_accesses:
            if approver.role_id is not None and approver.role_id != access.role_id:
                continue
            if approver.department_id is not None and approver.department_id != access.department_id:
                continue
            if approver.designation_id is not None and approver.designation_id != access.designation_id:
                continue
            if approver.company_id is not None and approver.company_id != access.company_id:
                continue
            return True

    return False


def _get_approver_from_pairs_step2plus(db: Session, user_id: int) -> set:
    """
    Same as workflow_routes._get_approver_from_pairs but only for step_order >= 2.
    Returns set of (from_company_id, from_department_id) pairs.
    """
    user_accesses = _get_user_accesses(db, user_id)
    if not user_accesses:
        return set()

    step2_rules = (
        db.query(WorkflowStepApprover)
        .join(WorkflowStep, WorkflowStepApprover.step_id == WorkflowStep.id)
        .filter(
            WorkflowStepApprover.is_active == True,
            WorkflowStep.step_order >= 2,
            WorkflowStep.is_active == True,
        )
        .all()
    )

    matched_from_pairs = set()
    for rule in step2_rules:
        if (rule.role_id is None and rule.department_id is None and
                rule.designation_id is None and rule.company_id is None):
            continue
        for access in user_accesses:
            if rule.role_id is not None and rule.role_id != access.role_id:
                continue
            if rule.department_id is not None and rule.department_id != access.department_id:
                continue
            if rule.designation_id is not None and rule.designation_id != access.designation_id:
                continue
            if rule.company_id is not None and rule.company_id != access.company_id:
                continue
            matched_from_pairs.add((rule.from_company_id, rule.from_department_id))
            break

    return matched_from_pairs


# ─────────────────────────────────────────────────────────────────────────────
#  ORIGINAL ENDPOINTS  (unchanged — 1:1 copy)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/mdm/access-check/{user_id}",
    summary="MDM — Check if user is a Step 2+ approver (MDM My Req page access gate)",
)
def mdm_access_check(user_id: int, db: Session = Depends(get_db)):
    """
    Returns:
      { "has_access": true/false, "user_id": int, "reason": str }

    Frontend (MdmMyReq.jsx) already has its own RBAC check via the menu system.
    Yeh additional backend verification hai jo directly wf_step_approver table
    check karta hai — useful for debugging and for future API-level enforcement.
    """
    user = db.query(umodels.User).filter(umodels.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    if not user.is_active:
        return {"has_access": False, "user_id": user_id, "reason": "User is inactive"}

    is_approver = _user_is_step2plus_approver(db, user_id)

    return {
        "has_access": is_approver,
        "user_id":    user_id,
        "reason":     (
            "User is configured as Step 2+ workflow approver"
            if is_approver
            else "User is not configured as a Step 2+ workflow approver"
        ),
    }


@router.get(
    "/mdm/inbox/{user_id}",
    summary="MDM — Step 2+ pending requests for this approver",
)
def mdm_inbox(
    user_id:     int,
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Returns WorkflowStepInstance rows (step_order >= 2) that are PENDING
    and this user is authorised to approve.

    This is the same data as /workflow/inbox/{user_id} but filtered to
    step_order >= 2 — so MDM page only shows Step 2+ requests.

    Access gate: only Step 2+ configured approvers get data; others get [].
    """
    # Access gate
    if not _user_is_step2plus_approver(db, user_id):
        return []

    # Get approver FROM pairs for this user (step 2+)
    approver_from_pairs = _get_approver_from_pairs_step2plus(db, user_id)

    # Fetch all PENDING step instances for step_order >= 2
    import db_models as gmodels  # Company, Department, etc.

    q = (
        db.query(WorkflowStepInstance)
        .options(
            joinedload(WorkflowStepInstance.instance)
            .joinedload(WorkflowInstance.submitter),
        )
        .join(WorkflowStepInstance.instance)
        .filter(
            WorkflowStepInstance.status == StepStatusEnum.PENDING,
            WorkflowStepInstance.is_skipped == False,
            WorkflowStepInstance.step_order_snapshot >= 2,
            WorkflowInstance.status.in_([
                WorkflowStatusEnum.PENDING,
                WorkflowStatusEnum.IN_REVIEW,
            ]),
        )
    )
    if entity_type:
        q = q.filter(WorkflowInstance.entity_type == entity_type)

    all_pending = q.all()

    # Import the same _user_can_approve_step logic from workflow_routes
    from itemmaster.workflow_routes import _user_can_approve_step

    result = []
    for si in all_pending:
        # Must be the CURRENT active step (lowest order among pending)
        pending_orders = [
            s.step_order_snapshot for s in si.instance.step_instances
            if s.status == StepStatusEnum.PENDING and not s.is_skipped
        ]
        if not pending_orders:
            continue
        if si.step_order_snapshot != min(pending_orders):
            continue

        # Resolve entity company/dept for FROM filter matching
        _ent_co_id   = None
        _ent_dept_id = None
        if si.instance.entity_type == "ITEM_CREATION":
            try:
                from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
                _req = db.query(ItemBasicInfoItemMaster).filter(
                    ItemBasicInfoItemMaster.id == si.instance.entity_id
                ).first()
                if _req:
                    _ent_co_id = _req.company_id
                    if _req.department:
                        import db_models as _gm
                        _dept = db.query(_gm.Department).filter(
                            _gm.Department.department_name.ilike(_req.department)
                        ).first()
                        if _dept: _ent_dept_id = _dept.id
            except Exception:
                pass

        # FROM-pair gate
        if approver_from_pairs:
            matched = False
            for (from_co, from_dept) in approver_from_pairs:
                co_ok   = (from_co   is None or from_co   == _ent_co_id)
                dept_ok = (from_dept is None or from_dept == _ent_dept_id)
                if co_ok and dept_ok:
                    matched = True
                    break
            if not matched:
                continue
        else:
            continue

        if _user_can_approve_step(
            db, user_id, si.step_id,
            submitter_id=si.instance.submitted_by,
            entity_company_id=_ent_co_id,
            entity_dept_id=_ent_dept_id,
        ):
            result.append({
                "instance_id":      si.instance_id,
                "entity_type":      si.instance.entity_type,
                "entity_id":        si.instance.entity_id,
                "instance_status":  si.instance.status.value,
                "step_instance_id": si.id,
                "step_name":        si.step_name_snapshot,
                "step_order":       si.step_order_snapshot,
                "step_status":      si.status.value,
                "submitted_by_name": (
                    si.instance.submitter.full_name
                    if si.instance.submitter else None
                ),
                "submitted_at": si.instance.submitted_at,
                "due_at":       si.due_at,
            })

    return result


@router.get(
    "/mdm/my-actions/{user_id}",
    summary="MDM — Requests this user (Step 2+ approver) has already acted on",
)
def mdm_my_actions(
    user_id:     int,
    entity_type: Optional[str] = Query(None),
    limit:       int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Returns WorkflowInstances where this user performed a Step 2+ approver action.
    Access gate: only Step 2+ configured approvers get data; others get [].
    """
    if not _user_is_step2plus_approver(db, user_id):
        return []

    import db_models as gmodels
    from itemmaster.workflow_routes import _user_can_approve_step

    approver_from_pairs = _get_approver_from_pairs_step2plus(db, user_id)

    # Find approver actions by this user (SUBMIT excluded)
    actions = (
        db.query(WorkflowAction)
        .filter(
            WorkflowAction.performed_by == user_id,
            WorkflowAction.action_type.in_([
                ActionTypeEnum.APPROVE,
                ActionTypeEnum.REJECT,
                ActionTypeEnum.RETURN,
                ActionTypeEnum.COMMENT,
            ])
        )
        .order_by(WorkflowAction.created_at.desc())
        .limit(limit)
        .all()
    )

    seen = set()
    result = []
    for action in actions:
        if action.instance_id in seen:
            continue
        seen.add(action.instance_id)

        inst = (
            db.query(WorkflowInstance)
            .options(joinedload(WorkflowInstance.step_instances))
            .filter(WorkflowInstance.id == action.instance_id)
            .first()
        )
        if not inst:
            continue
        if entity_type and inst.entity_type != entity_type:
            continue

        # Resolve entity company/dept
        ent_co_id   = None
        ent_dept_id = None
        if inst.entity_type == "ITEM_CREATION":
            try:
                from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
                rec = db.query(ItemBasicInfoItemMaster).filter(
                    ItemBasicInfoItemMaster.id == inst.entity_id
                ).first()
                if rec:
                    ent_co_id = rec.company_id
                    if rec.department:
                        import db_models as _gm2
                        dept_obj = db.query(_gm2.Department).filter(
                            _gm2.Department.department_name.ilike(rec.department)
                        ).first()
                        if dept_obj: ent_dept_id = dept_obj.id
            except Exception:
                pass

        # FROM-pair gate
        if approver_from_pairs:
            _matched = False
            for (from_co, from_dept) in approver_from_pairs:
                co_ok   = (from_co   is None or from_co   == ent_co_id)
                dept_ok = (from_dept is None or from_dept == ent_dept_id)
                if co_ok and dept_ok:
                    _matched = True
                    break
            if not _matched:
                continue
        else:
            continue

        # Check authorisation on at least one step (step_order >= 2)
        step_ids = [
            si.step_id for si in inst.step_instances
            if si.step_order_snapshot >= 2
        ]
        authorised = any(
            _user_can_approve_step(
                db, user_id, step_id,
                submitter_id=inst.submitted_by,
                entity_company_id=ent_co_id,
                entity_dept_id=ent_dept_id,
            )
            for step_id in step_ids
        )
        if authorised:
            # MDM My Req page sirf IN_REVIEW instances dikhaye
            # (Step 1 approved, Step 2 pending) — RETURNED/REJECTED/CANCELLED nahi
            if inst.status.value not in ("IN_REVIEW", "PENDING"):
                continue
            result.append({
                "instance_id":  inst.id,
                "entity_type":  inst.entity_type,
                "entity_id":    inst.entity_id,
                "status":       inst.status.value,
                "submitted_at": inst.submitted_at,
                "completed_at": inst.completed_at,
            })

    return result


@router.get(
    "/mdm/step2-notification-check/{user_id}",
    summary="MDM Debug — Will this user receive Step 2+ notifications?",
)
def mdm_step2_notification_check(user_id: int, db: Session = Depends(get_db)):
    """
    Debug endpoint: checks if this user will receive notifications when
    a Step 2+ workflow step becomes active.

    Returns matching Step 2+ approver rules for this user.
    """
    user = db.query(umodels.User).filter(umodels.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    user_accesses = _get_user_accesses(db, user_id)

    step2_approvers = (
        db.query(WorkflowStepApprover)
        .options(
            joinedload(WorkflowStepApprover.step),
            joinedload(WorkflowStepApprover.role),
            joinedload(WorkflowStepApprover.department),
            joinedload(WorkflowStepApprover.designation),
            joinedload(WorkflowStepApprover.company),
        )
        .join(WorkflowStep, WorkflowStepApprover.step_id == WorkflowStep.id)
        .filter(
            WorkflowStepApprover.is_active == True,
            WorkflowStep.step_order >= 2,
            WorkflowStep.is_active == True,
        )
        .all()
    )

    matched_rules = []
    for a in step2_approvers:
        if (a.role_id is None and a.department_id is None and
                a.designation_id is None and a.company_id is None):
            continue
        if a.user_id == user_id:
            matched_rules.append({
                "step_id":    a.step_id,
                "step_order": a.step.step_order if a.step else None,
                "step_name":  a.step.step_name  if a.step else None,
                "match_type": "specific_user_id",
                "from_company_id":    a.from_company_id,
                "from_department_id": a.from_department_id,
            })
            continue
        for acc in user_accesses:
            if a.role_id is not None and a.role_id != acc.role_id: continue
            if a.department_id is not None and a.department_id != acc.department_id: continue
            if a.designation_id is not None and a.designation_id != acc.designation_id: continue
            if a.company_id is not None and a.company_id != acc.company_id: continue
            matched_rules.append({
                "step_id":    a.step_id,
                "step_order": a.step.step_order if a.step else None,
                "step_name":  a.step.step_name  if a.step else None,
                "match_type": "role_dept_desg_company",
                "matched_via_access": {
                    "company_id":    acc.company_id,
                    "role_id":       acc.role_id,
                    "department_id": acc.department_id,
                    "designation_id":acc.designation_id,
                },
                "from_company_id":    a.from_company_id,
                "from_department_id": a.from_department_id,
            })
            break

    return {
        "user_id":      user_id,
        "user_name":    user.full_name,
        "is_active":    user.is_active,
        "will_receive_step2_notifications": len(matched_rules) > 0,
        "matched_approver_rules": matched_rules,
        "total_user_accesses":   len(user_accesses),
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  AUDIT LOG ENDPOINTS  (nayi — MDM/mdm_models.py tables)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/mdm/audit/log",
    response_model=MdmStep2AuditLogResponse,
    status_code=201,
    summary="MDM Audit — Log a Step 2+ approver action (called after workflow action)",
)
def mdm_audit_log_create(
    payload: MdmStep2AuditLogCreate,
    db: Session = Depends(get_db),
):
    """
    Step 2+ approver action ke baad yeh endpoint call karo.
    Ek MdmStep2AuditLog row insert hogi with complete context snapshot.

    action_count auto-calculate hota hai:
    is user ne pehle is instance pe kitne approver actions liye hain.
    """
    # action_count: count previous approver actions by this user on this instance
    if payload.performed_by and payload.instance_id:
        prev_count = (
            db.query(MdmStep2AuditLog)
            .filter(
                MdmStep2AuditLog.performed_by == payload.performed_by,
                MdmStep2AuditLog.instance_id  == payload.instance_id,
                MdmStep2AuditLog.action_type  != MdmActionTypeEnum.VIEW,
            )
            .count()
        )
        action_count = prev_count + 1
    else:
        action_count = payload.action_count or 1

    row = MdmStep2AuditLog(
        instance_id             = payload.instance_id,
        step_instance_id        = payload.step_instance_id,
        wf_action_id            = payload.wf_action_id,
        entity_type             = payload.entity_type,
        entity_id               = payload.entity_id,
        request_id_snapshot     = payload.request_id_snapshot,
        item_name_snapshot      = payload.item_name_snapshot,
        item_type_snapshot      = payload.item_type_snapshot,
        item_dept_snapshot      = payload.item_dept_snapshot,
        from_company_id         = payload.from_company_id,
        from_company_name       = payload.from_company_name,
        from_department_id      = payload.from_department_id,
        from_department_name    = payload.from_department_name,
        action_type             = payload.action_type,
        status_before           = payload.status_before,
        status_after            = payload.status_after,
        step_order_snapshot     = payload.step_order_snapshot,
        step_name_snapshot      = payload.step_name_snapshot,
        comments                = payload.comments,
        performed_by            = payload.performed_by,
        performer_name_snapshot = payload.performer_name_snapshot,
        performer_company_id    = payload.performer_company_id,
        performer_company_name  = payload.performer_company_name,
        performer_role_id       = payload.performer_role_id,
        performer_role_name     = payload.performer_role_name,
        performer_dept_id       = payload.performer_dept_id,
        performer_dept_name     = payload.performer_dept_name,
        performer_desg_id       = payload.performer_desg_id,
        performer_desg_name     = payload.performer_desg_name,
        action_count            = action_count,
        is_within_sla           = payload.is_within_sla,
        sla_deadline_snapshot   = payload.sla_deadline_snapshot,
        time_taken_hours        = payload.time_taken_hours,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/mdm/audit/request/{entity_type}/{entity_id}",
    response_model=List[MdmStep2AuditLogResponse],
    summary="MDM Audit — All Step 2+ audit entries for one request (newest first)",
)
def mdm_audit_for_request(
    entity_type : str,
    entity_id   : int,
    limit       : int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    Ek specific request ka poora Step 2+ audit trail.
    Kisne kiya, kya kiya, kab kiya, status pehle kya tha, baad mein kya hua.
    """
    return (
        db.query(MdmStep2AuditLog)
        .filter(
            MdmStep2AuditLog.entity_type == entity_type,
            MdmStep2AuditLog.entity_id   == entity_id,
        )
        .order_by(MdmStep2AuditLog.performed_at.desc())
        .limit(limit)
        .all()
    )


@router.get(
    "/mdm/audit/approver/{user_id}",
    response_model=List[MdmStep2AuditLogResponse],
    summary="MDM Audit — All audit log entries by a specific approver (newest first)",
)
def mdm_audit_by_approver(
    user_id     : int,
    entity_type : Optional[str] = Query(None),
    action_type : Optional[MdmActionTypeEnum] = Query(None),
    limit       : int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    Ek approver ne Step 2+ mein kya kya kiya — puri history.
    Filters: entity_type, action_type (APPROVE/REJECT/RETURN/COMMENT/VIEW).
    """
    q = db.query(MdmStep2AuditLog).filter(MdmStep2AuditLog.performed_by == user_id)
    if entity_type:
        q = q.filter(MdmStep2AuditLog.entity_type == entity_type)
    if action_type:
        q = q.filter(MdmStep2AuditLog.action_type == action_type)
    return q.order_by(MdmStep2AuditLog.performed_at.desc()).limit(limit).all()


@router.get(
    "/mdm/audit/approver/{user_id}/stats",
    response_model=MdmApproverStats,
    summary="MDM Audit — Summary stats for an approver (total actions, approve/reject counts, avg time)",
)
def mdm_approver_stats(
    user_id : int,
    db: Session = Depends(get_db),
):
    """
    Approver ke liye aggregate stats:
      • total_actions (VIEW除く)
      • approve_count, reject_count, return_count, comment_count
      • avg_time_taken_hours
      • last_action_at
    """
    user = db.query(umodels.User).filter(umodels.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    rows = (
        db.query(MdmStep2AuditLog)
        .filter(
            MdmStep2AuditLog.performed_by == user_id,
            MdmStep2AuditLog.action_type  != MdmActionTypeEnum.VIEW,
        )
        .all()
    )

    approve_count  = sum(1 for r in rows if r.action_type == MdmActionTypeEnum.APPROVE)
    reject_count   = sum(1 for r in rows if r.action_type == MdmActionTypeEnum.REJECT)
    return_count   = sum(1 for r in rows if r.action_type == MdmActionTypeEnum.RETURN)
    comment_count  = sum(1 for r in rows if r.action_type == MdmActionTypeEnum.COMMENT)
    times          = [r.time_taken_hours for r in rows if r.time_taken_hours is not None]
    avg_time       = round(sum(times) / len(times), 2) if times else None
    last_action    = max((r.performed_at for r in rows), default=None)

    return MdmApproverStats(
        user_id              = user_id,
        user_name            = user.full_name,
        total_actions        = len(rows),
        approve_count        = approve_count,
        reject_count         = reject_count,
        return_count         = return_count,
        comment_count        = comment_count,
        avg_time_taken_hours = avg_time,
        last_action_at       = last_action,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  FIELD CHANGE LOG ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/mdm/audit/field-change",
    response_model=MdmStep2FieldChangeResponse,
    status_code=201,
    summary="MDM — Log a field-level change on a request (old value → new value)",
)
def mdm_field_change_log(
    payload: MdmStep2FieldChangeCreate,
    db: Session = Depends(get_db),
):
    """
    Jab bhi request ke kisi field ki value change ho (RETURN ke baad
    submitter correct kare ya approver direct kare), ek row insert karo.

    One row per field per change event.
    """
    row = MdmStep2FieldChangeLog(
        audit_log_id    = payload.audit_log_id,
        entity_type     = payload.entity_type,
        entity_id       = payload.entity_id,
        instance_id     = payload.instance_id,
        field_name      = payload.field_name,
        table_name      = payload.table_name,
        old_value       = payload.old_value,
        new_value       = payload.new_value,
        changed_by      = payload.changed_by,
        changer_name    = payload.changer_name,
        change_reason   = payload.change_reason,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/mdm/audit/field-changes/{entity_id}",
    response_model=List[MdmStep2FieldChangeResponse],
    summary="MDM — All field-level changes for a request",
)
def mdm_field_changes_for_request(
    entity_id   : int,
    field_name  : Optional[str] = Query(None, description="Filter by specific field name"),
    limit       : int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    Ek request ke saare field-level changes: kaun sa field, pehle kya tha,
    ab kya hai, kisne change kiya, kab.
    """
    q = db.query(MdmStep2FieldChangeLog).filter(
        MdmStep2FieldChangeLog.entity_id == entity_id
    )
    if field_name:
        q = q.filter(MdmStep2FieldChangeLog.field_name == field_name)
    return q.order_by(MdmStep2FieldChangeLog.changed_at.desc()).limit(limit).all()


# ═══════════════════════════════════════════════════════════════════════════════
#  SESSION LOG ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/mdm/session/start",
    response_model=MdmStep2SessionResponse,
    status_code=201,
    summary="MDM Session — Start a new session log when approver opens MDM My Req page",
)
def mdm_session_start(
    payload: MdmStep2SessionStart,
    db: Session = Depends(get_db),
):
    """
    Frontend ko yeh call karna chahiye jab approver MDM My Req page open kare.
    Returns session_id jo baad mein /mdm/session/{id}/end mein use hoga.
    """
    user = db.query(umodels.User).filter(umodels.User.id == payload.user_id).first()
    user_name = payload.user_name_snapshot or (user.full_name if user else None)

    row = MdmStep2SessionLog(
        user_id               = payload.user_id,
        user_name_snapshot    = user_name,
        ip_address            = payload.ip_address,
        user_agent            = payload.user_agent,
        page_url              = payload.page_url,
        approver_company_id   = payload.approver_company_id,
        approver_company_name = payload.approver_company_name,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch(
    "/mdm/session/{session_id}/end",
    response_model=MdmStep2SessionResponse,
    summary="MDM Session — End a session log when approver leaves MDM My Req page",
)
def mdm_session_end(
    session_id : int,
    payload    : MdmStep2SessionEnd,
    db: Session = Depends(get_db),
):
    """
    Frontend ko yeh call karna chahiye jab approver MDM My Req page se jaye.
    Session summary (actions, approve/reject counts, duration) update hogi.
    """
    row = db.query(MdmStep2SessionLog).filter(MdmStep2SessionLog.id == session_id).first()
    if not row:
        raise HTTPException(404, "Session not found")

    row.session_end             = payload.session_end or datetime.now(timezone.utc)
    row.session_duration_minutes= payload.session_duration_minutes
    row.actions_taken           = payload.actions_taken
    row.approve_count           = payload.approve_count
    row.reject_count            = payload.reject_count
    row.return_count            = payload.return_count
    row.view_count              = payload.view_count
    row.entity_ids_acted        = payload.entity_ids_acted

    # Auto-calculate duration if not provided
    if not row.session_duration_minutes and row.session_start and row.session_end:
        delta = row.session_end - row.session_start
        row.session_duration_minutes = int(delta.total_seconds() / 60)

    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/mdm/session/user/{user_id}",
    response_model=List[MdmStep2SessionResponse],
    summary="MDM Session — All sessions for an approver (newest first)",
)
def mdm_sessions_for_user(
    user_id : int,
    limit   : int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Approver ki saari sessions:
    kitni baar MDM page khola, kitna time spend kiya, kitne actions liye.
    """
    return (
        db.query(MdmStep2SessionLog)
        .filter(MdmStep2SessionLog.user_id == user_id)
        .order_by(MdmStep2SessionLog.session_start.desc())
        .limit(limit)
        .all()
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  ESCALATION LOG ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/mdm/escalation/",
    response_model=MdmStep2EscalationResponse,
    status_code=201,
    summary="MDM Escalation — Log a new escalation (SLA breach or manual)",
)
def mdm_escalation_create(
    payload : MdmStep2EscalationCreate,
    db: Session = Depends(get_db),
):
    row = MdmStep2EscalationLog(
        instance_id             = payload.instance_id,
        step_instance_id        = payload.step_instance_id,
        entity_type             = payload.entity_type,
        entity_id               = payload.entity_id,
        item_name_snapshot      = payload.item_name_snapshot,
        step_order_snapshot     = payload.step_order_snapshot,
        step_name_snapshot      = payload.step_name_snapshot,
        reason                  = payload.reason,
        reason_note             = payload.reason_note,
        sla_deadline            = payload.sla_deadline,
        hours_overdue           = payload.hours_overdue,
        escalated_by            = payload.escalated_by,
        escalator_name          = payload.escalator_name,
        original_approver_id    = payload.original_approver_id,
        original_approver_name  = payload.original_approver_name,
        escalated_to_user_id    = payload.escalated_to_user_id,
        escalated_to_role_id    = payload.escalated_to_role_id,
        escalated_to_name       = payload.escalated_to_name,
        is_resolved             = False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch(
    "/mdm/escalation/{escalation_id}/resolve",
    response_model=MdmStep2EscalationResponse,
    summary="MDM Escalation — Mark an escalation as resolved",
)
def mdm_escalation_resolve(
    escalation_id : int,
    payload       : MdmStep2EscalationResolve,
    db: Session = Depends(get_db),
):
    row = db.query(MdmStep2EscalationLog).filter(
        MdmStep2EscalationLog.id == escalation_id
    ).first()
    if not row:
        raise HTTPException(404, "Escalation not found")
    row.is_resolved       = True
    row.resolved_at       = payload.resolved_at or datetime.now(timezone.utc)
    row.resolution_action = payload.resolution_action
    row.resolved_by       = payload.resolved_by
    db.commit()
    db.refresh(row)
    return row


@router.get(
    "/mdm/escalation/unresolved",
    response_model=List[MdmStep2EscalationResponse],
    summary="MDM Escalation — All unresolved escalations (admin view)",
)
def mdm_escalations_unresolved(
    entity_type : Optional[str] = Query(None),
    limit       : int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(MdmStep2EscalationLog).filter(
        MdmStep2EscalationLog.is_resolved == False
    )
    if entity_type:
        q = q.filter(MdmStep2EscalationLog.entity_type == entity_type)
    return q.order_by(MdmStep2EscalationLog.escalated_at.desc()).limit(limit).all()


@router.get(
    "/mdm/escalation/request/{entity_id}",
    response_model=List[MdmStep2EscalationResponse],
    summary="MDM Escalation — All escalations for a specific request",
)
def mdm_escalations_for_request(
    entity_id   : int,
    db: Session = Depends(get_db),
):
    return (
        db.query(MdmStep2EscalationLog)
        .filter(MdmStep2EscalationLog.entity_id == entity_id)
        .order_by(MdmStep2EscalationLog.escalated_at.desc())
        .all()
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  FULL HISTORY  —  Ek request ka A-to-Z complete history (audit + fields + escalations)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/mdm/audit/full-history/{entity_type}/{entity_id}",
    response_model=MdmRequestHistory,
    summary="MDM — Complete history for one request: audit logs + field changes + escalations",
)
def mdm_full_history(
    entity_type : str,
    entity_id   : int,
    db: Session = Depends(get_db),
):
    """
    Ek request ka COMPLETE MDM history:
      1. MdmStep2AuditLog entries  — kab kab kya kiya (A to Z)
      2. MdmStep2FieldChangeLog    — kaun se fields change hue, pehle kya, ab kya
      3. MdmStep2EscalationLog     — koi escalation/SLA breach hua kya

    MdmMyReq.jsx ke timeline popup ke liye ideal — ek call mein sab kuch.
    """
    # Item name + request_id for display
    item_name  = None
    request_id = None
    if entity_type == "ITEM_CREATION":
        try:
            from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
            rec = db.query(ItemBasicInfoItemMaster).filter(
                ItemBasicInfoItemMaster.id == entity_id
            ).first()
            if rec:
                item_name  = rec.item_name
                request_id = rec.request_id
        except Exception:
            pass

    audit_entries = (
        db.query(MdmStep2AuditLog)
        .filter(
            MdmStep2AuditLog.entity_type == entity_type,
            MdmStep2AuditLog.entity_id   == entity_id,
        )
        .order_by(MdmStep2AuditLog.performed_at.asc())
        .all()
    )

    field_changes = (
        db.query(MdmStep2FieldChangeLog)
        .filter(MdmStep2FieldChangeLog.entity_id == entity_id)
        .order_by(MdmStep2FieldChangeLog.changed_at.asc())
        .all()
    )

    escalations = (
        db.query(MdmStep2EscalationLog)
        .filter(MdmStep2EscalationLog.entity_id == entity_id)
        .order_by(MdmStep2EscalationLog.escalated_at.asc())
        .all()
    )

    return MdmRequestHistory(
        entity_type   = entity_type,
        entity_id     = entity_id,
        request_id    = request_id,
        item_name     = item_name,
        audit_entries = audit_entries,
        field_changes = field_changes,
        escalations   = escalations,
    )