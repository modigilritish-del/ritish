"""
itemmaster/workflow_routes.py
─────────────────────────────────────────────────────────────────────────────
Dynamic Approval Workflow Engine  –  All API Endpoints

ENDPOINT MAP
────────────
TEMPLATE MANAGEMENT (admin)
  POST   /workflow/templates/                        create template + steps
  GET    /workflow/templates/                        list all templates
  GET    /workflow/templates/{template_id}           get one template (with steps)
  PUT    /workflow/templates/{template_id}           update template meta
  DELETE /workflow/templates/{template_id}           soft delete (is_active=False)

STEP MANAGEMENT (admin)
  POST   /workflow/templates/{template_id}/steps/    add step to template
  PUT    /workflow/steps/{step_id}                   update step
  DELETE /workflow/steps/{step_id}                   delete step

APPROVER MANAGEMENT (admin)
  POST   /workflow/steps/{step_id}/approvers/        add approver to step
  DELETE /workflow/approvers/{approver_id}           remove approver

NOTIFICATION MANAGEMENT (admin)
  POST   /workflow/notifications/                    add notification rule
  GET    /workflow/notifications/{template_id}       list for template
  DELETE /workflow/notifications/{notif_id}          remove rule

INSTANCE (runtime)
  POST   /workflow/submit/                           submit request → create instance
  POST   /workflow/resubmit/{instance_id}           resubmit a RETURNED instance
  POST   /workflow/action/{instance_id}              approve / reject / return / comment
  GET    /workflow/instance/{instance_id}            full instance with timeline
  GET    /workflow/status/{entity_type}/{entity_id}  quick status of a request

INBOX (approver's queue)
  GET    /workflow/inbox/{user_id}                   all pending items for this user

REQUEST TRACKER (submitter's view)
  GET    /workflow/my-requests/{user_id}             all requests submitted by user
  GET    /workflow/timeline/{entity_type}/{entity_id} step-by-step timeline
"""

from datetime import datetime, timedelta
from typing import List, Optional, AsyncGenerator
import asyncio
import json
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from database import get_db
import db_models as gmodels                     # Company, Role, Dept, Desg
from user import user_models as umodels         # User, UserCompanyAccess
from itemmaster.workflow_models import (
    WorkflowTemplate, WorkflowStep, WorkflowStepApprover,
    WorkflowInstance, WorkflowStepInstance, WorkflowAction,
    WorkflowNotification, WorkflowPageRegistry, WorkflowUserNotification,
    WorkflowStatusEnum, StepStatusEnum, ActionTypeEnum, ApprovalTypeEnum,
)
from itemmaster.workflow_schemas import (
    WorkflowTemplateCreate, WorkflowTemplateUpdate, WorkflowTemplateResponse,
    WorkflowStepCreate, WorkflowStepUpdate, WorkflowStepResponse,
    StepApproverCreate, StepApproverResponse,
    WorkflowInstanceCreate, WorkflowInstanceResponse,
    WorkflowActionCreate, WorkflowActionResponse,
    NotificationCreate, NotificationResponse,
    InboxItem, RequestTimeline, TimelineStep,
    WorkflowPageRegistryResponse,
    UserNotificationResponse, UserNotificationUnreadCount,
)

router = APIRouter()

# ─── SSE subscriber registry ─────────────────────────────────────────────────
# Maps user_id → list of asyncio.Queue instances (one per open SSE connection)
_sse_subscribers: dict[int, list[asyncio.Queue]] = {}

# ─── Nightly 11:59 PM scheduler ──────────────────────────────────────────────
# All SSE pushes are held in this list and flushed at 11:59 PM every night.
# DB rows are written immediately (no data loss), only the live SSE push is delayed.
# Format: list of {"user_id": int, "payload": dict}
_pending_sse_pushes: list[dict] = []
_scheduler_started: bool = False


def _queue_sse_push(user_id: int, payload: dict):
    """
    Immediately push SSE notification to user's open connections.
    DB row is already committed before this is called, so frontend
    gets correct data when it re-fetches after receiving the event.
    """
    _push_notification_to_user(user_id, payload)
    log.info(f"[notify] immediate SSE push sent to user_id={user_id}")


async def _nightly_sse_flush_loop():
    """
    Background asyncio task.
    Sleeps until tonight's 11:59 PM, fires all pending SSE pushes,
    then waits until the next night's 11:59 PM, and so on.
    """
    while True:
        # Calculate seconds until tonight 23:59:00
        now = datetime.now()
        target = now.replace(hour=23, minute=59, second=0, microsecond=0)
        if now >= target:
            # Already past 11:59 PM today — aim for tomorrow
            target = target + timedelta(days=1)
        sleep_seconds = (target - now).total_seconds()
        log.info(f"[scheduler] next nightly flush in {sleep_seconds:.0f}s (at {target.strftime('%Y-%m-%d %H:%M:%S')})")
        await asyncio.sleep(sleep_seconds)

        # Fire all pending SSE pushes
        pushes = _pending_sse_pushes.copy()
        _pending_sse_pushes.clear()
        log.info(f"[scheduler] 11:59 PM — firing {len(pushes)} queued SSE push(es)")
        for item in pushes:
            _push_notification_to_user(item["user_id"], item["payload"])


def _ensure_scheduler_started():
    """
    Lazily starts the nightly scheduler background task the first time it is needed.
    Safe to call multiple times — starts only once per process.
    Uses get_running_loop() + call_soon_threadsafe() so it works correctly
    whether called from an async handler or a sync handler running in an
    AnyIO worker thread.
    """
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True
    try:
        loop = asyncio.get_running_loop()
        loop.call_soon_threadsafe(
            lambda: asyncio.ensure_future(_nightly_sse_flush_loop())
        )
        log.info("[scheduler] nightly 11:59 PM SSE flush task started")
    except RuntimeError:
        log.warning("[scheduler] could not start scheduler — no running event loop")


def _push_notification_to_user(user_id: int, payload: dict):
    """
    Called synchronously (from normal FastAPI route handlers) to push a
    notification event to all open SSE connections for the given user.
    Each open tab / device has its own Queue registered in _sse_subscribers.
    """
    queues = _sse_subscribers.get(user_id, [])
    for q in queues:
        try:
            q.put_nowait(payload)
        except asyncio.QueueFull:
            pass  # drop if queue is full — client will catch up via next poll


# ═══════════════════════════════════════════════════════════════════════════════
#  INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _load_template(db: Session, template_id: int) -> WorkflowTemplate:
    t = (
        db.query(WorkflowTemplate)
        .options(
            joinedload(WorkflowTemplate.steps)
            .joinedload(WorkflowStep.approvers)
            .joinedload(WorkflowStepApprover.role),
            joinedload(WorkflowTemplate.steps)
            .joinedload(WorkflowStep.approvers)
            .joinedload(WorkflowStepApprover.department),
            joinedload(WorkflowTemplate.steps)
            .joinedload(WorkflowStep.approvers)
            .joinedload(WorkflowStepApprover.designation),
            joinedload(WorkflowTemplate.company),
            joinedload(WorkflowTemplate.creator),
            joinedload(WorkflowTemplate.updater),
        )
        .filter(WorkflowTemplate.id == template_id)
        .first()
    )
    if not t:
        raise HTTPException(404, "Workflow template not found")
    return t


def _load_instance(db: Session, instance_id: int) -> WorkflowInstance:
    inst = (
        db.query(WorkflowInstance)
        .options(
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.actions)
            .joinedload(WorkflowAction.performer),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_role),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_dept),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_desg),
            joinedload(WorkflowInstance.actions)
            .joinedload(WorkflowAction.performer),
            joinedload(WorkflowInstance.submitter),
        )
        .filter(WorkflowInstance.id == instance_id)
        .first()
    )
    if not inst:
        raise HTTPException(404, "Workflow instance not found")
    return inst


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


def _get_approver_from_pairs(db, user_id: int) -> set:
    """
    Returns the set of (from_company_id, from_department_id) pairs that
    this user is configured to approve — directly from wf_step_approver table.

    Logic:
      1. Find all active WorkflowStepApprover rows where this user's
         UserCompanyAccess matches the TO fields (role_id, department_id,
         designation_id, company_id).
      2. Collect their (from_company_id, from_department_id) pairs.

    These pairs represent the EXACT company+dept combinations whose
    requests this user should see on WorkflowMyRequests page.

    NULL from_company_id or from_department_id = wildcard (matches any).
    Returns None if user has no approver rules at all (show nothing).
    Returns set of pairs (can include None values for wildcards).
    """
    user_accesses = _get_user_accesses(db, user_id)
    if not user_accesses:
        return set()

    all_active_rules = (
        db.query(WorkflowStepApprover)
        .filter(WorkflowStepApprover.is_active == True)
        .all()
    )

    matched_from_pairs = set()
    for rule in all_active_rules:
        # Skip fully-wildcard TO rules
        if (rule.role_id is None and rule.department_id is None and
                rule.designation_id is None and rule.company_id is None):
            continue
        # Check if this user matches the TO fields of this rule
        for access in user_accesses:
            if rule.role_id is not None and rule.role_id != access.role_id:
                continue
            if rule.department_id is not None and rule.department_id != access.department_id:
                continue
            if rule.designation_id is not None and rule.designation_id != access.designation_id:
                continue
            if rule.company_id is not None and rule.company_id != access.company_id:
                continue
            # This user IS the approver for this rule
            # Add the FROM pair (what requests they should see)
            matched_from_pairs.add((rule.from_company_id, rule.from_department_id))
            break

    return matched_from_pairs


def _user_can_approve_step(
    db: Session, user_id: int, step_id: int, submitter_id: int = None,
    entity_company_id: int = None, entity_dept_id: int = None,
) -> bool:
    """
    Returns True if the user has any UserCompanyAccess row that matches
    at least one active WorkflowStepApprover for the given step.
    NULL in an approver field = wildcard (matches anything).

    FROM filter matching priority:
      1. entity_company_id / entity_dept_id  — the REQUEST's actual company+dept (most accurate)
      2. submitter's UserCompanyAccess        — fallback if entity fields not provided
    This ensures rules like "Elevent Global + It → Breeze Admin Finance" work correctly
    even when the submitter belongs to a different company.
    """
    approvers = (
        db.query(WorkflowStepApprover)
        .filter(
            WorkflowStepApprover.step_id == step_id,
            WorkflowStepApprover.is_active == True,
        )
        .all()
    )
    if not approvers:
        return False

    user_accesses = _get_user_accesses(db, user_id)

    # Build FROM company/dept sets for matching
    # Priority: entity's actual company/dept > submitter's UserCompanyAccess
    from_company_ids: set = set()
    from_dept_ids:    set = set()

    if entity_company_id is not None:
        from_company_ids.add(entity_company_id)
    if entity_dept_id is not None:
        from_dept_ids.add(entity_dept_id)

    # Also include submitter's accesses as fallback (covers edge cases)
    if submitter_id:
        sub_accesses = db.query(umodels.UserCompanyAccess).filter(
            umodels.UserCompanyAccess.user_id == submitter_id
        ).all()
        for a in sub_accesses:
            if a.company_id:    from_company_ids.add(a.company_id)
            if a.department_id: from_dept_ids.add(a.department_id)

    for approver in approvers:
        # FROM filter: from_company_id must match entity's company (NULL = wildcard)
        if approver.from_company_id is not None and from_company_ids:
            if approver.from_company_id not in from_company_ids:
                continue
        # FROM dept filter: from_department_id must match entity's dept (NULL = wildcard)
        if approver.from_department_id is not None and from_dept_ids:
            if approver.from_department_id not in from_dept_ids:
                continue
        # TO filter: specific user_id match (if set, takes priority over role/dept/desg)
        if approver.user_id is not None:
            if approver.user_id == user_id:
                return True
            continue
        # TO filter: matches the candidate approver user's own access
        for access in user_accesses:
            role_match  = (approver.role_id        is None or approver.role_id        == access.role_id)
            dept_match  = (approver.department_id  is None or approver.department_id  == access.department_id)
            desg_match  = (approver.designation_id is None or approver.designation_id == access.designation_id)
            co_match    = (approver.company_id     is None or approver.company_id     == access.company_id)
            if role_match and dept_match and desg_match and co_match:
                return True
    return False


def _user_is_configured_approver(db: Session, user_id: int) -> bool:
    """
    Returns True ONLY if the user has at least one UserCompanyAccess row
    that STRICTLY matches an active WorkflowStepApprover rule —
    meaning ALL non-NULL TO fields (role_id, department_id, designation_id,
    company_id) must match exactly.

    NULL in an approver field = wildcard for runtime routing (_user_can_approve_step),
    but here we use STRICT matching so plain submitters (who happen to share
    a wildcard match) are never incorrectly granted access to WorkflowMyRequests.

    Rule: at least one of role_id / department_id / designation_id must be
    non-NULL in the approver rule — a fully-wildcard rule (all NULL) is
    considered a misconfiguration and is skipped.
    """
    user_accesses = _get_user_accesses(db, user_id)
    if not user_accesses:
        return False

    all_approver_rules = (
        db.query(WorkflowStepApprover)
        .filter(WorkflowStepApprover.is_active == True)
        .all()
    )
    if not all_approver_rules:
        return False

    for approver in all_approver_rules:
        # Skip fully-wildcard rules (all TO fields NULL) — too broad, anyone matches
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
        for access in user_accesses:
            # STRICT matching: each non-NULL field in the rule must equal the user's field
            if approver.role_id is not None and approver.role_id != access.role_id:
                continue
            if approver.department_id is not None and approver.department_id != access.department_id:
                continue
            if approver.designation_id is not None and approver.designation_id != access.designation_id:
                continue
            if approver.company_id is not None and approver.company_id != access.company_id:
                continue
            # All non-NULL fields matched → user is a configured approver
            return True
    return False


def _evaluate_condition(step: WorkflowStep, entity_data: dict) -> bool:
    """
    Evaluate a step's skip condition against the entity's field values.
    Returns True if the step SHOULD be active (condition satisfied OR no condition).
    """
    if not step.condition_field:
        return True
    field_val = str(entity_data.get(step.condition_field, ""))
    cond_val  = str(step.condition_value or "")
    op        = (step.condition_op or "eq").lower()

    if op == "eq":   return field_val == cond_val
    if op == "neq":  return field_val != cond_val
    if op == "gt":
        try: return float(field_val) > float(cond_val)
        except: return False
    if op == "lt":
        try: return float(field_val) < float(cond_val)
        except: return False
    return True


def _check_user_page_access_for_step(
    db: Session,
    user_id: int,
    matched_access_row,   # Sirf woh UserCompanyAccess row jo approver criteria se match hui
    step_order: int,
) -> bool:
    """
    RBAC CompanyRolePageAccess table se check karo ki approver ke paas
    sahi page ka access granted hai ya nahi.

    WorkflowAdmin.js ka checkPageAccess() exactly yahi karta hai:
      → /rbac/access-by-role?company_id=X&role_id=Y&department_id=Z&designation_id=W
      → CompanyRolePageAccess table query (is_granted=True)
      → page_url ends with "workflow-my-requests"  OR  page_name == "My Requests"

    Step 1  → "workflow-my-requests" / "My Requests" page access chahiye
    Step 2+ → "mdm-my-req" / "MDM My Requests" / "Mdm My Req" page access chahiye

    Agar CompanyRolePageAccess table mein is combo ke liye koi rows hi
    nahi hain (RBAC configure nahi hua) → ALLOW (safe fallback).
    Sirf tab DENY karo jab rows mile HO aur unme target page match na kare.
    """
    import logging as _lg
    _log = _lg.getLogger("workflow.notify")

    if step_order <= 1:
        _target_urls  = {"workflow-my-requests", "workflowmyrequests"}
        _target_names = {"my requests", "workflow my requests", "workflowmyrequests"}
    else:
        _target_urls  = {"mdm-my-req", "mdm-my-requests", "mdmmyreq"}
        _target_names = {"mdm my requests", "mdm my req", "mdmmyreq"}

    _co_id   = getattr(matched_access_row, "company_id",     None)
    _role_id = getattr(matched_access_row, "role_id",        None)
    _dept_id = getattr(matched_access_row, "department_id",  None)
    _desg_id = getattr(matched_access_row, "designation_id", None)

    if not _co_id or not _role_id:
        _log.info(
            f"[page_access_check] user_id={user_id} step={step_order} "
            f"— missing company_id or role_id → ALLOW (fallback)"
        )
        return True

    try:
        from role import role_models as _rbac  # type: ignore

        _CRP = getattr(_rbac, "CompanyRolePageAccess", None)
        if _CRP is None:
            _log.warning("[page_access_check] CompanyRolePageAccess model not found → ALLOW")
            return True

        # Same query as /rbac/access-by-role endpoint
        _q = (
            db.query(_CRP)
            .filter(
                _CRP.company_id == _co_id,
                _CRP.role_id    == _role_id,
                _CRP.is_granted == True,
            )
        )
        if _dept_id is not None:
            _q = _q.filter(_CRP.department_id == _dept_id)
        if _desg_id is not None:
            _q = _q.filter(_CRP.designation_id == _desg_id)

        _rows = _q.all()

        # No RBAC rows for this combo → ALLOW (safe fallback)
        if not _rows:
            _log.info(
                f"[page_access_check] user_id={user_id} step={step_order} "
                f"co={_co_id} role={_role_id} dept={_dept_id} desg={_desg_id} "
                f"— no CompanyRolePageAccess rows → ALLOW (fallback)"
            )
            return True

        for _row in _rows:
            _purl  = (getattr(_row, "page_url",  None) or "").lower().strip("/")
            _pname = (getattr(_row, "page_name", None) or "").lower()
            if any(_purl.endswith(t) for t in _target_urls):
                _log.info(f"[page_access_check] user_id={user_id} MATCH via row.page_url='{_purl}'")
                return True
            if _pname in _target_names:
                _log.info(f"[page_access_check] user_id={user_id} MATCH via row.page_name='{_pname}'")
                return True
            _page_obj = getattr(_row, "page", None)
            if _page_obj:
                _purl2  = (getattr(_page_obj, "page_url",  None) or "").lower().strip("/")
                _pname2 = (getattr(_page_obj, "page_name", None) or "").lower()
                if any(_purl2.endswith(t) for t in _target_urls):
                    _log.info(f"[page_access_check] user_id={user_id} MATCH via page.page_url='{_purl2}'")
                    return True
                if _pname2 in _target_names:
                    _log.info(f"[page_access_check] user_id={user_id} MATCH via page.page_name='{_pname2}'")
                    return True

        _log.info(
            f"[page_access_check] user_id={user_id} step={step_order} "
            f"co={_co_id} role={_role_id} dept={_dept_id} desg={_desg_id} "
            f"— {len(_rows)} RBAC rows found, none match target pages → DENY"
        )
        return False

    except Exception as _e:
        _log.warning(
            f"[page_access_check] RBAC check error for user_id={user_id}: {_e} → ALLOW (fallback)"
        )
        return True


def _notify_approvers_for_step(
    db: Session,
    instance: WorkflowInstance,
    step_instance: WorkflowStepInstance,
):
    """
    When a workflow step becomes active, find ALL users who are eligible
    to approve this step and send each a notification + SSE push.
    """
    import logging
    log = logging.getLogger("workflow.notify")

    # ── 1. Load approver criteria for this step ──────────────────────────────
    approvers = (
        db.query(WorkflowStepApprover)
        .filter(
            WorkflowStepApprover.step_id   == step_instance.step_id,
            WorkflowStepApprover.is_active == True,
        )
        .all()
    )
    if not approvers:
        log.warning(f"[notify_approvers] step_id={step_instance.step_id} — no active approver criteria, skipping")
        return

    log.info(f"[notify_approvers] step_id={step_instance.step_id} — {len(approvers)} criteria found")
    for a in approvers:
        log.info(f"  criteria: company_id={a.company_id} role_id={a.role_id} dept_id={a.department_id} desg_id={a.designation_id}")

    # ── 2. Get submitter name + item details ─────────────────────────────────
    submitter = db.query(umodels.User).filter(umodels.User.id == instance.submitted_by).first()
    submitter_name = submitter.full_name if submitter else f"User #{instance.submitted_by}"

    item_label    = f"{instance.entity_type} #{instance.entity_id}"
    item_type     = ""
    required_date = ""
    item_company  = ""
    item_dept     = ""
    if instance.entity_type == "ITEM_CREATION":
        try:
            from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
            rec = db.query(ItemBasicInfoItemMaster).filter(
                ItemBasicInfoItemMaster.id == instance.entity_id
            ).first()
            if rec:
                if rec.item_name:    item_label = rec.item_name
                if rec.item_type:    item_type  = rec.item_type
                if rec.required_date: required_date = str(rec.required_date)
                if rec.department:   item_dept  = rec.department
                if rec.company_id:
                    co = db.query(gmodels.Company).filter(
                        gmodels.Company.id == rec.company_id
                    ).first()
                    if co: item_company = co.company_name
        except Exception:
            pass

    # ── 3. Build FROM company/dept sets for matching ───────────────────────────
    # Priority: entity's actual company+dept (from item record) > submitter's accesses
    # This is the KEY fix: "FROM Elevent Global + It" must match the REQUEST's company/dept,
    # not the submitter's UserCompanyAccess (submitter may be from a different company).
    from_company_ids: set = set()
    from_dept_ids:    set = set()

    if instance.entity_type == "ITEM_CREATION":
        try:
            from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
            req_rec = db.query(ItemBasicInfoItemMaster).filter(
                ItemBasicInfoItemMaster.id == instance.entity_id
            ).first()
            if req_rec:
                if req_rec.company_id:    from_company_ids.add(req_rec.company_id)
                # Resolve dept by name → id for FROM dept matching
                if req_rec.department:
                    dept_obj = db.query(gmodels.Department).filter(
                        gmodels.Department.department_name == req_rec.department
                    ).first()
                    if dept_obj: from_dept_ids.add(dept_obj.id)
        except Exception:
            pass

    # Also include submitter's accesses as fallback
    submitter_access_rows = db.query(umodels.UserCompanyAccess).filter(
        umodels.UserCompanyAccess.user_id == instance.submitted_by
    ).all()
    for a in submitter_access_rows:
        if a.company_id:    from_company_ids.add(a.company_id)
        if a.department_id: from_dept_ids.add(a.department_id)

    # ── 4. Find all UserCompanyAccess rows — no pre-filter ──────────────────
    all_accesses = (
        db.query(umodels.UserCompanyAccess)
        .all()
    )

    log.info(f"[notify_approvers] checking {len(all_accesses)} UserCompanyAccess rows")
    log.info(f"[notify_approvers] effective FROM company_ids={from_company_ids} dept_ids={from_dept_ids}")

    notif_title = f"📋 Review Required: {item_label}" + (f" ({item_type})" if item_type else "") + f" — Step {step_instance.step_order_snapshot}: {step_instance.step_name_snapshot}"
    notif_body  = "\n".join(filter(None, [
        f"Submitted by: {submitter_name}" + (f" | {item_company}" if item_company else "") + (f" · {item_dept}" if item_dept else ""),
        f"Item Name:  {item_label}",
        f"Item Type:  {item_type}"         if item_type     else "",
        f"Company:    {item_company}"      if item_company  else "",
        f"Department: {item_dept}"         if item_dept     else "",
        f"Required Date:  {required_date}" if required_date else "",
        f"Step: {step_instance.step_name_snapshot}",
        f"Please review and take action.",
    ]))

    # ── Step order: determine which page access to check ────────────────────
    # Step 1 approvers → 'WorkflowMyRequests' / 'My Requests' page
    # Step 2+ approvers → 'MDM My Requests' / 'Mdm My Req' page
    _step_order = step_instance.step_order_snapshot

    # ── Group all_accesses by user_id ────────────────────────────────────────
    # UserCompanyAccess rows pe loop karne ki jagah USERS pe loop karo.
    # Ek user ke multiple company/role rows ho sakte hain — sabhi ek saath
    # check karni hain tabhi sahi approver match hoga.
    from collections import defaultdict
    accesses_by_user: dict = defaultdict(list)
    for _acc in all_accesses:
        if _acc.user_id:
            accesses_by_user[_acc.user_id].append(_acc)

    notified = set()
    for uid, user_access_rows in accesses_by_user.items():
        if uid in notified:
            continue

        # ── CHECK A: Sirf active users ko notification jaaye ─────────────────
        _user_obj = db.query(umodels.User).filter(umodels.User.id == uid).first()
        if not _user_obj or not _user_obj.is_active:
            log.info(f"  ⏭ user_id={uid} SKIPPED — user is inactive")
            continue

        # ── CHECK B: Approver match — jis row se match ho, woh track karo ────
        # matched_access_row = woh specific row jis company+role context mein
        # user approver hai. Yahi row page access check mein bhi use hogi.
        # Isse doosri company ka page access kabhi galat match nahi hoga.
        matched = False
        matched_access_row = None
        for a in approvers:
            # FROM filter: from_company_id must match entity's company (NULL = wildcard)
            if a.from_company_id is not None and from_company_ids:
                if a.from_company_id not in from_company_ids:
                    continue
            # FROM dept filter: from_department_id must match entity's dept (NULL = wildcard)
            if a.from_department_id is not None and from_dept_ids:
                if a.from_department_id not in from_dept_ids:
                    continue
            # TO filter: specific user_id match (takes priority over role/dept/desg)
            if a.user_id is not None:
                if a.user_id == uid:
                    matched = True
                    # specific user_id match mein request ki company se matching row prefer karo
                    matched_access_row = next(
                        (r for r in user_access_rows if r.company_id in from_company_ids),
                        user_access_rows[0] if user_access_rows else None
                    )
                    log.info(f"  ✅ user_id={uid} MATCHED by specific user assignment")
                continue
            # TO filter: user ki sabhi access rows mein se matching row dhundo
            for access in user_access_rows:
                role_match = (a.role_id        is None or a.role_id        == access.role_id)
                dept_match = (a.department_id  is None or a.department_id  == access.department_id)
                desg_match = (a.designation_id is None or a.designation_id == access.designation_id)
                co_match   = (a.company_id     is None or a.company_id     == access.company_id)
                if role_match and dept_match and desg_match and co_match:
                    matched = True
                    matched_access_row = access   # ✅ yahi row page check mein jaayegi
                    log.info(f"  ✅ user_id={uid} MATCHED: from_co={a.from_company_id} from_dept={a.from_department_id} to_co={a.company_id} role={a.role_id} dept={a.department_id} desg={a.designation_id} via access(co={access.company_id} role={access.role_id} dept={access.department_id} desg={access.designation_id})")
                    break
                else:
                    log.info(f"  ❌ user_id={uid} access(co={access.company_id} role={access.role_id} dept={access.department_id} desg={access.designation_id}) vs criteria(from_co={a.from_company_id} from_dept={a.from_department_id} to_co={a.company_id} role={a.role_id} dept={a.department_id} desg={a.designation_id})")
            if matched:
                break

        if not matched or matched_access_row is None:
            continue

        # ── CHECK C: Page access gate — sirf matched company+role context mein ─
        # Step 1 → 'WorkflowMyRequests'/'My Requests' page access chahiye
        # Step 2+ → 'MDM My Requests'/'Mdm My Req' page access chahiye
        # SIRF matched_access_row pass karo — usi company context mein page check.
        # Doosri company ki access row se page match hone pe notification nahi jaayegi.
        # pageAccess module nahi mila → safely True (fallback, approver config verified).
        _page_ok = _check_user_page_access_for_step(db, uid, matched_access_row, _step_order)
        if not _page_ok:
            log.info(f"  ⏭ user_id={uid} SKIPPED — no page access for step {_step_order} in company_id={matched_access_row.company_id}")
            continue

        # No duplicate check — every submit/resubmit must create a fresh notification

        db.add(WorkflowUserNotification(
            user_id      = uid,
            instance_id  = instance.id,
            entity_type  = instance.entity_type,
            entity_id    = instance.entity_id,
            event        = ActionTypeEnum.SUBMIT,
            title        = notif_title,
            body         = notif_body,
            triggered_by = instance.submitted_by,
            is_read      = False,
        ))
        db.flush()   # flush before SSE push so row is visible when frontend re-fetches
        notified.add(uid)
        log.info(f"  📨 notification queued for user_id={uid}")

        # Queue SSE push for 11:59 PM nightly flush (DB row already saved above)
        _ensure_scheduler_started()
        _queue_sse_push(uid, {
            "type":        "notification",
            "user_id":     uid,
            "title":       notif_title,
            "body":        f"Request by {submitter_name} needs your review.",
            "event":       ActionTypeEnum.SUBMIT.value,
            "entity_type": instance.entity_type,
            "entity_id":   instance.entity_id,
        })

    log.info(f"[notify_approvers] done — notified {len(notified)} users: {notified}")


def _advance_instance(db: Session, instance: WorkflowInstance):
    """
    After a step completes, find the next PENDING step and activate it.
    If no more steps, mark instance as APPROVED.
    """
    pending_steps = sorted(
        [si for si in instance.step_instances
         if si.status == StepStatusEnum.PENDING and not si.is_skipped],
        key=lambda s: s.step_order_snapshot
    )
    if pending_steps:
        next_step = pending_steps[0]
        next_step.started_at = datetime.utcnow()
        instance.current_step_id = next_step.step_id
        instance.status = WorkflowStatusEnum.IN_REVIEW

        # Set due_at from SLA
        step_def = db.query(WorkflowStep).filter(WorkflowStep.id == next_step.step_id).first()
        if step_def and step_def.sla_hours:
            next_step.due_at = datetime.utcnow() + timedelta(hours=step_def.sla_hours)

        # Notify all matching approvers that this step needs their review
        _notify_approvers_for_step(db, instance, next_step)
    else:
        # All steps done → APPROVED
        instance.status = WorkflowStatusEnum.APPROVED
        instance.completed_at = datetime.utcnow()
        instance.current_step_id = None


def _notify_submitter(
    db: Session,
    instance: WorkflowInstance,
    event: ActionTypeEnum,
    triggered_by_id: int,
    title: str,
    body: str = None,
):
    """
    Create one WorkflowUserNotification row for the original submitter.
    Also pushes instantly to any open SSE connection for that user.
    """
    if not instance.submitted_by:
        return
    notif = WorkflowUserNotification(
        user_id      = instance.submitted_by,
        instance_id  = instance.id,
        entity_type  = instance.entity_type,
        entity_id    = instance.entity_id,
        event        = event,
        title        = title,
        body         = body,
        triggered_by = triggered_by_id,
        is_read      = False,
    )
    db.add(notif)
    db.flush()
    # Queue SSE push for 11:59 PM nightly flush (DB row already saved above)
    _ensure_scheduler_started()
    _queue_sse_push(instance.submitted_by, {
        "type":        "notification",
        "user_id":     instance.submitted_by,
        "title":       title,
        "body":        body or "",
        "event":       event.value,
        "entity_type": instance.entity_type,
        "entity_id":   instance.entity_id,
    })


# ═══════════════════════════════════════════════════════════════════════════════
#  TEMPLATE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════


def _deactivate_entity_if_needed(db: Session, instance) -> None:
    """
    Auto-deactivate the source entity when a workflow is REJECTED or CANCELLED.
    Currently handles ITEM_CREATION. Add more branches here for future entity types.
    """
    if instance.entity_type == "ITEM_CREATION":
        try:
            from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
            rec = db.query(ItemBasicInfoItemMaster).filter(
                ItemBasicInfoItemMaster.id == instance.entity_id
            ).first()
            if rec:
                rec.is_active = False
        except Exception:
            pass


@router.post("/workflow/templates/", response_model=WorkflowTemplateResponse, status_code=201,
             summary="Create workflow template with steps and approvers")
def create_template(payload: WorkflowTemplateCreate, db: Session = Depends(get_db)):
    # Duplicate code check
    if db.query(WorkflowTemplate).filter(WorkflowTemplate.code == payload.code.upper()).first():
        raise HTTPException(400, f"Template with code '{payload.code}' already exists")

    tmpl = WorkflowTemplate(
        code=payload.code.upper(),
        name=payload.name,
        description=payload.description,
        company_id=payload.company_id,
        entity_page=payload.entity_page or None,
        created_by=payload.created_by or None,
    )
    db.add(tmpl)
    db.flush()

    # Insert page registry row (audit trail)
    if payload.entity_page:
        reg = WorkflowPageRegistry(
            entity_page=payload.entity_page,
            page_name=payload.name,
            template_id=tmpl.id,
            created_by=payload.created_by or None,
            is_active=True,
        )
        db.add(reg)

    for step_data in sorted(payload.steps, key=lambda s: s.step_order):
        step = WorkflowStep(
            template_id=tmpl.id,
            step_order=step_data.step_order,
            step_name=step_data.step_name,
            step_description=step_data.step_description,
            approval_type=step_data.approval_type,
            condition_field=step_data.condition_field,
            condition_value=step_data.condition_value,
            condition_op=step_data.condition_op,
            sla_hours=step_data.sla_hours,
        )
        db.add(step)
        db.flush()

        for apr in step_data.approvers:
            db.add(WorkflowStepApprover(
                step_id=step.id,
                role_id=apr.role_id,
                department_id=apr.department_id,
                designation_id=apr.designation_id,
                company_id=apr.company_id,
                user_id=apr.user_id,
                from_company_id=apr.from_company_id,
                from_department_id=apr.from_department_id,
            ))

    db.commit()
    return _load_template(db, tmpl.id)


@router.get("/workflow/templates/", response_model=List[WorkflowTemplateResponse],
            summary="List all workflow templates")
def list_templates(
    company_id: Optional[int] = Query(None),
    is_active:  Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(WorkflowTemplate)
    if company_id is not None:
        q = q.filter(WorkflowTemplate.company_id == company_id)
    if is_active is not None:
        q = q.filter(WorkflowTemplate.is_active == is_active)
    templates = q.order_by(WorkflowTemplate.id).all()
    return [_load_template(db, t.id) for t in templates]


@router.get("/workflow/templates/{template_id}", response_model=WorkflowTemplateResponse,
            summary="Get one workflow template")
def get_template(template_id: int, db: Session = Depends(get_db)):
    return _load_template(db, template_id)


@router.put("/workflow/templates/{template_id}", response_model=WorkflowTemplateResponse,
            summary="Update workflow template")
def update_template(template_id: int, payload: WorkflowTemplateUpdate, db: Session = Depends(get_db)):
    tmpl = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(404, "Template not found")
    old_page = tmpl.entity_page
    for field in ("name", "description", "company_id", "is_active", "entity_page", "updated_by"):
        v = getattr(payload, field, None)
        if v is not None:
            setattr(tmpl, field, v)

    # If entity_page changed, deactivate old registry rows + insert new one
    new_page = getattr(payload, "entity_page", None)
    if new_page and new_page != old_page:
        db.query(WorkflowPageRegistry).filter(
            WorkflowPageRegistry.template_id == template_id,
            WorkflowPageRegistry.is_active == True,
        ).update({"is_active": False})
        db.add(WorkflowPageRegistry(
            entity_page=new_page,
            page_name=tmpl.name,
            template_id=template_id,
            created_by=getattr(payload, "updated_by", None),
            is_active=True,
        ))

    db.commit()
    return _load_template(db, template_id)


@router.delete("/workflow/templates/{template_id}", summary="Deactivate workflow template")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    tmpl = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(404, "Template not found")
    tmpl.is_active = False
    db.commit()
    return {"message": f"Template {template_id} deactivated"}


# ═══════════════════════════════════════════════════════════════════════════════
#  STEP MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/templates/{template_id}/steps/", response_model=WorkflowStepResponse,
             status_code=201, summary="Add step to template")
def add_step(template_id: int, payload: WorkflowStepCreate, db: Session = Depends(get_db)):
    tmpl = db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(404, "Template not found")

    step = WorkflowStep(
        template_id=template_id,
        step_order=payload.step_order,
        step_name=payload.step_name,
        step_description=payload.step_description,
        approval_type=payload.approval_type,
        condition_field=payload.condition_field,
        condition_value=payload.condition_value,
        condition_op=payload.condition_op,
        sla_hours=payload.sla_hours,
    )
    db.add(step)
    db.flush()

    for apr in payload.approvers:
        db.add(WorkflowStepApprover(
            step_id=step.id,
            role_id=apr.role_id,
            department_id=apr.department_id,
            designation_id=apr.designation_id,
            company_id=apr.company_id,
            user_id=apr.user_id,
            from_company_id=apr.from_company_id,
            from_department_id=apr.from_department_id,
        ))
    db.commit()
    db.refresh(step)
    return step


@router.put("/workflow/steps/{step_id}", response_model=WorkflowStepResponse,
            summary="Update a workflow step")
def update_step(step_id: int, payload: WorkflowStepUpdate, db: Session = Depends(get_db)):
    step = db.query(WorkflowStep).filter(WorkflowStep.id == step_id).first()
    if not step:
        raise HTTPException(404, "Step not found")
    for field in ("step_order", "step_name", "step_description", "approval_type",
                  "condition_field", "condition_value", "condition_op", "sla_hours", "is_active"):
        v = getattr(payload, field, None)
        if v is not None:
            setattr(step, field, v)
    db.commit()
    db.refresh(step)
    return step


@router.delete("/workflow/steps/{step_id}", summary="Delete a workflow step")
def delete_step(step_id: int, db: Session = Depends(get_db)):
    step = db.query(WorkflowStep).filter(WorkflowStep.id == step_id).first()
    if not step:
        raise HTTPException(404, "Step not found")
    db.delete(step)
    db.commit()
    return {"message": f"Step {step_id} deleted"}


# ═══════════════════════════════════════════════════════════════════════════════
#  APPROVER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/steps/{step_id}/approvers/", response_model=StepApproverResponse,
             status_code=201, summary="Add approver to step")
def add_approver(step_id: int, payload: StepApproverCreate, db: Session = Depends(get_db)):
    step = db.query(WorkflowStep).filter(WorkflowStep.id == step_id).first()
    if not step:
        raise HTTPException(404, "Step not found")
    apr = WorkflowStepApprover(
        step_id=step_id,
        role_id=payload.role_id,
        department_id=payload.department_id,
        designation_id=payload.designation_id,
        company_id=payload.company_id,
        user_id=payload.user_id,
        from_company_id=payload.from_company_id,
        from_department_id=payload.from_department_id,
    )
    db.add(apr)
    db.commit()
    db.refresh(apr)
    return apr


@router.put("/workflow/approvers/{approver_id}", response_model=StepApproverResponse,
            summary="Update approver row (toggle is_active, change role/dept etc)")
def update_approver(approver_id: int, payload: StepApproverCreate, db: Session = Depends(get_db)):
    apr = db.query(WorkflowStepApprover).filter(WorkflowStepApprover.id == approver_id).first()
    if not apr:
        raise HTTPException(404, "Approver not found")
    apr.role_id            = payload.role_id
    apr.department_id      = payload.department_id
    apr.designation_id     = payload.designation_id
    apr.company_id         = payload.company_id
    apr.user_id            = payload.user_id
    apr.from_company_id    = payload.from_company_id
    apr.from_department_id = payload.from_department_id
    if payload.is_active is not None:
        apr.is_active = payload.is_active
    db.commit()
    db.refresh(apr)
    return apr


@router.delete("/workflow/approvers/{approver_id}", summary="Remove approver from step")
def delete_approver(approver_id: int, db: Session = Depends(get_db)):
    apr = db.query(WorkflowStepApprover).filter(WorkflowStepApprover.id == approver_id).first()
    if not apr:
        raise HTTPException(404, "Approver not found")
    db.delete(apr)
    db.commit()
    return {"message": f"Approver {approver_id} removed"}


# ═══════════════════════════════════════════════════════════════════════════════
#  NOTIFICATION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/notifications/", response_model=NotificationResponse,
             status_code=201, summary="Add notification rule")
def add_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    notif = WorkflowNotification(**payload.dict())
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


@router.get("/workflow/notifications/{template_id}", response_model=List[NotificationResponse],
            summary="List notification rules for template")
def list_notifications(template_id: int, db: Session = Depends(get_db)):
    return (
        db.query(WorkflowNotification)
        .filter(WorkflowNotification.template_id == template_id,
                WorkflowNotification.is_active == True)
        .all()
    )


@router.delete("/workflow/notifications/{notif_id}", summary="Remove notification rule")
def delete_notification(notif_id: int, db: Session = Depends(get_db)):
    n = db.query(WorkflowNotification).filter(WorkflowNotification.id == notif_id).first()
    if not n:
        raise HTTPException(404, "Notification not found")
    db.delete(n)
    db.commit()
    return {"message": f"Notification {notif_id} removed"}


# ═══════════════════════════════════════════════════════════════════════════════
#  PAGE REGISTRY — audit endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/workflow/page-registry/",
    response_model=List[WorkflowPageRegistryResponse],
    summary="List all page → template registry entries (audit)"
)
def list_page_registry(
    entity_page: Optional[str] = Query(None, description="Filter by page path"),
    is_active:   Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """
    Returns the full audit history of which template was configured for which page.
    is_active=True  → only the current active mapping per page.
    is_active=False → only superseded (historical) entries.
    Omit is_active  → full history.
    """
    q = (
        db.query(WorkflowPageRegistry)
        .options(
            joinedload(WorkflowPageRegistry.template),
            joinedload(WorkflowPageRegistry.creator),
        )
        .order_by(WorkflowPageRegistry.created_at.desc())
    )
    if entity_page:
        q = q.filter(WorkflowPageRegistry.entity_page == entity_page)
    if is_active is not None:
        q = q.filter(WorkflowPageRegistry.is_active == is_active)
    return q.all()


@router.get(
    "/workflow/page-registry/{entity_page}",
    response_model=WorkflowPageRegistryResponse,
    summary="Get active template registry entry for a specific page"
)
def get_page_registry(entity_page: str, db: Session = Depends(get_db)):
    """
    Returns the currently active template configured for the given page path.
    Raises 404 if no template has been configured for that page yet.
    """
    reg = (
        db.query(WorkflowPageRegistry)
        .options(
            joinedload(WorkflowPageRegistry.template),
            joinedload(WorkflowPageRegistry.creator),
        )
        .filter(
            WorkflowPageRegistry.entity_page == entity_page,
            WorkflowPageRegistry.is_active == True,
        )
        .order_by(WorkflowPageRegistry.created_at.desc())
        .first()
    )
    if not reg:
        raise HTTPException(404, f"No active workflow template configured for page '{entity_page}'")
    return reg


# ═══════════════════════════════════════════════════════════════════════════════
#  INSTANCE – SUBMIT
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/submit/", response_model=WorkflowInstanceResponse,
             status_code=201, summary="Submit a request into the workflow")
def submit_request(payload: WorkflowInstanceCreate, db: Session = Depends(get_db)):
    """
    Creates a WorkflowInstance + all WorkflowStepInstances in PENDING state.
    The first eligible step is activated immediately.
    entity_data is fetched from the DB to evaluate conditional steps.
    """
    # Find template
    tmpl = (
        db.query(WorkflowTemplate)
        .options(joinedload(WorkflowTemplate.steps).joinedload(WorkflowStep.approvers))
        .filter(
            WorkflowTemplate.code == payload.template_code.upper(),
            WorkflowTemplate.is_active == True,
        )
        .first()
    )
    if not tmpl:
        raise HTTPException(404, f"Active workflow template '{payload.template_code}' not found")

    # Check no existing active instance
    existing = (
        db.query(WorkflowInstance)
        .filter(
            WorkflowInstance.entity_type == payload.entity_type,
            WorkflowInstance.entity_id   == payload.entity_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(400, "A workflow instance already exists for this request")

    # Fetch entity data for conditional step evaluation
    # Currently supports ITEM_CREATION; extend here for other entity types
    entity_data = {}
    if payload.entity_type == "ITEM_CREATION":
        from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
        record = db.query(ItemBasicInfoItemMaster).filter(
            ItemBasicInfoItemMaster.id == payload.entity_id
        ).first()
        if record:
            entity_data = {
                "item_type":   record.item_type,
                "department":  record.department,
                "company_id":  record.company_id,
            }

    # Create instance
    instance = WorkflowInstance(
        template_id  = tmpl.id,
        entity_type  = payload.entity_type,
        entity_id    = payload.entity_id,
        status       = WorkflowStatusEnum.PENDING,
        submitted_by = payload.submitted_by,
        submitted_at = datetime.utcnow(),
    )
    db.add(instance)
    db.flush()

    # Create step instances (pre-create all, evaluate skip conditions)
    active_steps = sorted(
        [s for s in tmpl.steps if s.is_active],
        key=lambda s: s.step_order
    )
    step_instances = []
    for step in active_steps:
        should_activate = _evaluate_condition(step, entity_data)
        si = WorkflowStepInstance(
            instance_id            = instance.id,
            step_id                = step.id,
            step_order_snapshot    = step.step_order,
            step_name_snapshot     = step.step_name,
            approval_type_snapshot = step.approval_type,
            status     = StepStatusEnum.PENDING,
            is_skipped = not should_activate,
        )
        db.add(si)
        step_instances.append(si)
    db.flush()

    # Log SUBMIT action
    db.add(WorkflowAction(
        instance_id  = instance.id,
        action_type  = ActionTypeEnum.SUBMIT,
        performed_by = payload.submitted_by,
        comments     = "Request submitted",
    ))

    # Activate first non-skipped step directly from local list
    # (avoids relationship-not-loaded issue with _advance_instance)
    non_skipped = sorted(
        [si for si in step_instances if not si.is_skipped],
        key=lambda s: s.step_order_snapshot
    )
    if non_skipped:
        first_step               = non_skipped[0]
        first_step.started_at    = datetime.utcnow()
        instance.current_step_id = first_step.step_id
        instance.status          = WorkflowStatusEnum.IN_REVIEW
        step_def = next((s for s in tmpl.steps if s.id == first_step.step_id), None)
        if step_def and step_def.sla_hours:
            first_step.due_at = datetime.utcnow() + timedelta(hours=step_def.sla_hours)
        db.flush()
        # ── Fetch item details for rich notification ─────────────────────
        _item_name = f"{instance.entity_type} #{instance.entity_id}"
        _item_type = ""
        _req_date  = ""
        if instance.entity_type == "ITEM_CREATION":
            try:
                from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
                _rec = db.query(ItemBasicInfoItemMaster).filter(
                    ItemBasicInfoItemMaster.id == instance.entity_id
                ).first()
                if _rec:
                    _item_name = _rec.item_name or _item_name
                    _item_type = _rec.item_type or ""
                    _req_date  = str(_rec.required_date) if _rec.required_date else ""
            except Exception:
                pass
        # ── Notify submitter: request submitted & in review ──────────────
        _notify_submitter(
            db, instance, ActionTypeEnum.SUBMIT,
            triggered_by_id = payload.submitted_by,
            title = f"📤 Submitted: {_item_name}" + (f" ({_item_type})" if _item_type else "") + f" — In Review",
            body  = "\n".join(filter(None, [
                f"Your request has been submitted successfully and is now under review.",
                f"Item Name:  {_item_name}",
                f"Item Type:  {_item_type}"   if _item_type else "",
                f"Required Date:  {_req_date}" if _req_date  else "",
                f"Step: {first_step.step_name_snapshot}",
                f"You will be notified when an action is taken.",
            ])),
        )
        # ── Notify all matching approvers ────────────────────────────────
        _notify_approvers_for_step(db, instance, first_step)
    else:
        instance.status           = WorkflowStatusEnum.APPROVED
        instance.completed_at     = datetime.utcnow()
        instance.current_step_id  = None
        # No steps — instantly approved, notify submitter
        _notify_submitter(
            db, instance, ActionTypeEnum.APPROVE,
            triggered_by_id = payload.submitted_by,
            title = "✅ Request Submitted & Instantly Approved",
            body  = "Your request was submitted and approved automatically (no approval steps configured).",
        )

    db.commit()
    return _load_instance(db, instance.id)


# ═══════════════════════════════════════════════════════════════════════════════
#  INSTANCE – ACTION (approve / reject / return / comment)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/workflow/action/{instance_id}", response_model=WorkflowInstanceResponse,
             summary="Take action on a workflow instance (approve / reject / return / comment)")
def take_action(
    instance_id: int,
    payload: WorkflowActionCreate,
    db: Session = Depends(get_db)
):
    instance = _load_instance(db, instance_id)

    if instance.status in (WorkflowStatusEnum.APPROVED,
                           WorkflowStatusEnum.REJECTED,
                           WorkflowStatusEnum.CANCELLED):
        raise HTTPException(400, f"Instance is already {instance.status.value}; no further action allowed")

    # Find the currently active step instance
    active_si = next(
        (si for si in instance.step_instances
         if si.status == StepStatusEnum.PENDING
         and not si.is_skipped
         and si.step_order_snapshot == min(
             s.step_order_snapshot for s in instance.step_instances
             if s.status == StepStatusEnum.PENDING and not s.is_skipped
         )),
        None
    )
    if active_si is None and payload.action_type not in (ActionTypeEnum.CANCEL, ActionTypeEnum.COMMENT):
        raise HTTPException(400, "No active step found")

    # Permission check (skip for CANCEL and COMMENT from submitter)
    if payload.action_type in (ActionTypeEnum.APPROVE, ActionTypeEnum.REJECT, ActionTypeEnum.RETURN):
        if not _user_can_approve_step(db, payload.performed_by, active_si.step_id):
            raise HTTPException(403, "You are not authorised to act on this step")

    # Log the action
    db.add(WorkflowAction(
        instance_id      = instance_id,
        step_instance_id = active_si.id if active_si else None,
        action_type      = payload.action_type,
        performed_by     = payload.performed_by,
        comments         = payload.comments,
    ))

    # ── Resolve approver details for rich notifications ─────────────
    approver_user = db.query(umodels.User).filter(umodels.User.id == payload.performed_by).first()
    approver_name = approver_user.full_name if approver_user else f"User #{payload.performed_by}"

    # Get approver's department from UserCompanyAccess
    approver_dept = None
    if approver_user:
        acc = (
            db.query(umodels.UserCompanyAccess)
            .options(joinedload(umodels.UserCompanyAccess.department))
            .filter(umodels.UserCompanyAccess.user_id == payload.performed_by)
            .first()
        )
        if acc and acc.department:
            approver_dept = acc.department.department_name

    approved_at_str = datetime.utcnow().strftime("%d %b %Y, %I:%M %p") + " UTC"

    # ── Fetch entity (request) company + dept for rich notifications ────────
    entity_company_name = ""
    entity_dept_name    = ""
    entity_item_name    = ""
    if instance.entity_type == "ITEM_CREATION":
        try:
            from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
            ent_rec = db.query(ItemBasicInfoItemMaster).filter(
                ItemBasicInfoItemMaster.id == instance.entity_id
            ).first()
            if ent_rec:
                entity_item_name = ent_rec.item_name or ""
                entity_dept_name = ent_rec.department or ""
                if ent_rec.company_id:
                    co = db.query(gmodels.Company).filter(
                        gmodels.Company.id == ent_rec.company_id
                    ).first()
                    if co: entity_company_name = co.company_name
        except Exception:
            pass

    def _build_approve_body(step_name, step_order, is_final, extra_comment=None):
        lines = [
            f"Item: {entity_item_name}"                                         if entity_item_name    else "",
            f"Company: {entity_company_name} · Dept: {entity_dept_name}"        if entity_company_name else "",
            f"Step {step_order}: {step_name}",
            f"Approved by: {approver_name}" + (f" ({approver_dept})" if approver_dept else ""),
            f"Time: {approved_at_str}",
        ]
        if extra_comment:
            lines.append(f"Note: {extra_comment}")
        if is_final:
            lines.append("🎉 All steps complete — your request is fully APPROVED.")
        return "\n".join(filter(None, lines))

    # ── APPROVE ──────────────────────────────────────────────────────
    if payload.action_type == ActionTypeEnum.APPROVE:
        # For ANY: one approval = step done
        # For ALL: check if all required approvers have approved
        if active_si.approval_type_snapshot == ApprovalTypeEnum.ANY:
            active_si.status       = StepStatusEnum.APPROVED
            active_si.completed_at = datetime.utcnow()
            db.flush()
            _advance_instance(db, instance)
            # Notify submitter
            if instance.status == WorkflowStatusEnum.APPROVED:
                _notify_submitter(
                    db, instance, ActionTypeEnum.APPROVE,
                    payload.performed_by,
                    title = f"✅ Step {active_si.step_order_snapshot} Approved — Request Fully Approved!",
                    body  = _build_approve_body(
                        active_si.step_name_snapshot,
                        active_si.step_order_snapshot,
                        is_final=True,
                        extra_comment=payload.comments,
                    ),
                )
            else:
                _notify_submitter(
                    db, instance, ActionTypeEnum.APPROVE,
                    payload.performed_by,
                    title = f"✅ Step {active_si.step_order_snapshot} Approved — Moving to Next Step",
                    body  = _build_approve_body(
                        active_si.step_name_snapshot,
                        active_si.step_order_snapshot,
                        is_final=False,
                        extra_comment=payload.comments,
                    ),
                )

        else:  # ALL
            approved_actions = (
                db.query(WorkflowAction)
                .filter(
                    WorkflowAction.step_instance_id == active_si.id,
                    WorkflowAction.action_type == ActionTypeEnum.APPROVE,
                )
                .all()
            )
            approver_defs = (
                db.query(WorkflowStepApprover)
                .filter(
                    WorkflowStepApprover.step_id  == active_si.step_id,
                    WorkflowStepApprover.is_active == True,
                )
                .all()
            )
            unique_approvers_acted = {a.performed_by for a in approved_actions}
            if len(unique_approvers_acted) >= len(approver_defs):
                active_si.status       = StepStatusEnum.APPROVED
                active_si.completed_at = datetime.utcnow()
                db.flush()
                _advance_instance(db, instance)
                if instance.status == WorkflowStatusEnum.APPROVED:
                    _notify_submitter(
                        db, instance, ActionTypeEnum.APPROVE,
                        payload.performed_by,
                        title = f"✅ Step {active_si.step_order_snapshot} Approved — Request Fully Approved!",
                        body  = _build_approve_body(
                            active_si.step_name_snapshot,
                            active_si.step_order_snapshot,
                            is_final=True,
                            extra_comment=payload.comments,
                        ),
                    )
                else:
                    _notify_submitter(
                        db, instance, ActionTypeEnum.APPROVE,
                        payload.performed_by,
                        title = f"✅ Step {active_si.step_order_snapshot} Approved — Moving to Next Step",
                        body  = _build_approve_body(
                            active_si.step_name_snapshot,
                            active_si.step_order_snapshot,
                            is_final=False,
                            extra_comment=payload.comments,
                        ),
                    )

    # ── REJECT ───────────────────────────────────────────────────────
    elif payload.action_type == ActionTypeEnum.REJECT:
        active_si.status       = StepStatusEnum.REJECTED
        active_si.completed_at = datetime.utcnow()
        instance.status        = WorkflowStatusEnum.REJECTED
        instance.completed_at  = datetime.utcnow()
        _deactivate_entity_if_needed(db, instance)   # auto-deactivate on REJECT
        _notify_submitter(
            db, instance, ActionTypeEnum.REJECT,
            payload.performed_by,
            title = f"❌ Your request has been rejected at step '{active_si.step_name_snapshot}'",
            body  = "\n".join(filter(None, [
                f"Item: {entity_item_name}"                                   if entity_item_name    else "",
                f"Company: {entity_company_name} · Dept: {entity_dept_name}" if entity_company_name else "",
                f"Rejected by: {approver_name}" + (f" ({approver_dept})" if approver_dept else ""),
                payload.comments or "No reason provided.",
            ])),
        )

    # ── RETURN (send back to submitter for correction) ────────────────
    elif payload.action_type == ActionTypeEnum.RETURN:
        active_si.status       = StepStatusEnum.RETURNED
        active_si.completed_at = datetime.utcnow()
        instance.status        = WorkflowStatusEnum.RETURNED
        _notify_submitter(
            db, instance, ActionTypeEnum.RETURN,
            payload.performed_by,
            title = f"↩️ Your request needs correction — returned from '{active_si.step_name_snapshot}'",
            body  = "\n".join(filter(None, [
                f"Item: {entity_item_name}"                                   if entity_item_name    else "",
                f"Company: {entity_company_name} · Dept: {entity_dept_name}" if entity_company_name else "",
                f"Returned by: {approver_name}" + (f" ({approver_dept})" if approver_dept else ""),
                payload.comments or "Please review and resubmit.",
            ])),
        )

    # ── CANCEL ────────────────────────────────────────────────────────
    elif payload.action_type == ActionTypeEnum.CANCEL:
        if payload.performed_by != instance.submitted_by:
            raise HTTPException(403, "Only the submitter can cancel their own request")
        instance.status       = WorkflowStatusEnum.CANCELLED
        instance.completed_at = datetime.utcnow()
        _deactivate_entity_if_needed(db, instance)   # auto-deactivate on CANCEL
        _notify_submitter(
            db, instance, ActionTypeEnum.CANCEL,
            payload.performed_by,
            title = "🚫 Your request has been cancelled",
            body  = payload.comments or "Cancelled by submitter.",
        )

    db.commit()
    return _load_instance(db, instance_id)


# ═══════════════════════════════════════════════════════════════════════════════
#  INSTANCE – READ
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workflow/instance/{instance_id}", response_model=WorkflowInstanceResponse,
            summary="Get full workflow instance with timeline")
def get_instance(instance_id: int, db: Session = Depends(get_db)):
    return _load_instance(db, instance_id)


@router.post("/workflow/resubmit/{instance_id}",
             summary="Resubmit a RETURNED workflow instance (reset steps and restart from beginning)")
def resubmit_instance(
    instance_id: int,
    submitted_by: int = Query(...),
    diff: Optional[str] = Query(None, description="Field-level before→after changes made by submitter"),
    db: Session = Depends(get_db)
):
    """
    Called when a submitter has corrected their request and wants to resubmit.
    Only allowed when instance status is RETURNED.
    Deletes all existing step instances, re-creates them fresh from the template,
    resets the instance to PENDING, and activates the first step.
    """
    instance = (
        db.query(WorkflowInstance)
        .options(
            joinedload(WorkflowInstance.template)
            .joinedload(WorkflowTemplate.steps)
            .joinedload(WorkflowStep.approvers),
        )
        .filter(WorkflowInstance.id == instance_id)
        .first()
    )
    if not instance:
        raise HTTPException(404, "Workflow instance not found")
    if instance.status != WorkflowStatusEnum.RETURNED:
        raise HTTPException(400, f"Only RETURNED instances can be resubmitted. Current status: {instance.status.value}")
    if instance.submitted_by != submitted_by:
        raise HTTPException(403, "Only the original submitter can resubmit this request")

    # Fetch fresh entity data for conditional step evaluation
    entity_data = {}
    if instance.entity_type == "ITEM_CREATION":
        from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
        record = db.query(ItemBasicInfoItemMaster).filter(
            ItemBasicInfoItemMaster.id == instance.entity_id
        ).first()
        if record:
            entity_data = {
                "item_type":  record.item_type,
                "department": record.department,
                "company_id": record.company_id,
            }

    # Reset instance fields
    instance.status           = WorkflowStatusEnum.PENDING
    instance.current_step_id  = None
    instance.completed_at     = None
    instance.submitted_at     = datetime.utcnow()
    db.flush()

    # Reset existing step instances (preserve their rows so old WorkflowActions stay linked)
    # Instead of deleting, we reset status/timestamps so history is preserved in timeline
    existing_sis = db.query(WorkflowStepInstance).filter(
        WorkflowStepInstance.instance_id == instance_id
    ).all()
    existing_step_ids = {si.step_id for si in existing_sis}

    # Re-fetch fresh template steps
    tmpl = instance.template
    active_steps = sorted(
        [s for s in tmpl.steps if s.is_active],
        key=lambda s: s.step_order
    )

    for si in existing_sis:
        si.status       = StepStatusEnum.PENDING
        si.started_at   = None
        si.completed_at = None
        si.due_at       = None
        # Re-evaluate skip condition with fresh entity data
        step = next((s for s in active_steps if s.id == si.step_id), None)
        if step:
            si.is_skipped = not _evaluate_condition(step, entity_data)
            si.step_order_snapshot    = step.step_order
            si.step_name_snapshot     = step.step_name
            si.approval_type_snapshot = step.approval_type

    # Add any NEW steps in template that didn't exist in the original submission
    for step in active_steps:
        if step.id not in existing_step_ids:
            should_activate = _evaluate_condition(step, entity_data)
            si = WorkflowStepInstance(
                instance_id            = instance.id,
                step_id                = step.id,
                step_order_snapshot    = step.step_order,
                step_name_snapshot     = step.step_name,
                approval_type_snapshot = step.approval_type,
                status     = StepStatusEnum.PENDING,
                is_skipped = not should_activate,
            )
            db.add(si)

    db.flush()

    # Log RESUBMIT action with diff
    resubmit_comment = "Request resubmitted after correction"
    if diff and diff.strip():
        resubmit_comment = f"Request resubmitted after correction\n\nChanges made:\n{diff.strip()}"
    db.add(WorkflowAction(
        instance_id  = instance.id,
        action_type  = ActionTypeEnum.SUBMIT,
        performed_by = submitted_by,
        comments     = resubmit_comment,
    ))

    # Activate first non-skipped step from the reset list + notify approvers
    all_sis = existing_sis  # already updated in-place above
    non_skipped_sis = sorted(
        [si for si in all_sis if not si.is_skipped],
        key=lambda s: s.step_order_snapshot
    )
    if non_skipped_sis:
        first_step               = non_skipped_sis[0]
        first_step.started_at    = datetime.utcnow()
        instance.current_step_id = first_step.step_id
        instance.status          = WorkflowStatusEnum.IN_REVIEW
        step_def = next((s for s in active_steps if s.id == first_step.step_id), None)
        if step_def and step_def.sla_hours:
            first_step.due_at = datetime.utcnow() + timedelta(hours=step_def.sla_hours)
        db.flush()
        # ── Fetch item details ────────────────────────────────────────────
        _item_name = f"{instance.entity_type} #{instance.entity_id}"
        _item_type = ""
        _req_date  = ""
        if instance.entity_type == "ITEM_CREATION":
            try:
                from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
                _rec = db.query(ItemBasicInfoItemMaster).filter(
                    ItemBasicInfoItemMaster.id == instance.entity_id
                ).first()
                if _rec:
                    _item_name = _rec.item_name or _item_name
                    _item_type = _rec.item_type or ""
                    _req_date  = str(_rec.required_date) if _rec.required_date else ""
            except Exception:
                pass
        # ── Notify submitter: resubmitted & back in review ───────────────
        _notify_submitter(
            db, instance, ActionTypeEnum.SUBMIT,
            triggered_by_id = submitted_by,
            title = f"🔄 Resubmitted: {_item_name}" + (f" ({_item_type})" if _item_type else "") + f" — Back In Review",
            body  = "\n".join(filter(None, [
                f"Your request has been resubmitted and is back under review.",
                f"Item Name:  {_item_name}",
                f"Item Type:  {_item_type}"   if _item_type else "",
                f"Required Date:  {_req_date}" if _req_date  else "",
                f"Step: {first_step.step_name_snapshot}",
                f"You will be notified when an action is taken.",
            ])),
        )
        # ── Notify all matching approvers ────────────────────────────────
        _notify_approvers_for_step(db, instance, first_step)
    else:
        instance.status           = WorkflowStatusEnum.APPROVED
        instance.completed_at     = datetime.utcnow()
        instance.current_step_id  = None
        _notify_submitter(
            db, instance, ActionTypeEnum.APPROVE,
            triggered_by_id = submitted_by,
            title = "✅ Request Resubmitted & Instantly Approved",
            body  = "Your resubmitted request was approved automatically (no approval steps configured).",
        )

    db.commit()
    return _load_instance(db, instance.id)


@router.get("/workflow/status/{entity_type}/{entity_id}",
            summary="Quick status check for a submitted request")
def get_status(entity_type: str, entity_id: int, db: Session = Depends(get_db)):
    inst = (
        db.query(WorkflowInstance)
        .options(
            joinedload(WorkflowInstance.actions).joinedload(WorkflowAction.performer),
            joinedload(WorkflowInstance.step_instances),
        )
        .filter(
            WorkflowInstance.entity_type == entity_type,
            WorkflowInstance.entity_id   == entity_id,
        )
        .first()
    )
    if not inst:
        return {"status": "NOT_SUBMITTED", "instance_id": None}

    # Last RETURN action comment (for resubmit highlight)
    return_comment = next(
        (a.comments for a in sorted(inst.actions, key=lambda x: x.created_at, reverse=True)
         if a.action_type == ActionTypeEnum.RETURN),
        None
    )

    # Build per-step approval info: list of approved steps with approver details
    step_approvals = []
    for si in sorted(inst.step_instances, key=lambda s: s.step_order_snapshot):
        if si.status == StepStatusEnum.APPROVED:
            # Find the APPROVE action for this step instance
            approve_action = next(
                (a for a in sorted(inst.actions, key=lambda x: x.created_at)
                 if a.step_instance_id == si.id and a.action_type == ActionTypeEnum.APPROVE),
                None
            )
            approver_name = None
            approver_dept = None
            approved_at   = si.completed_at

            if approve_action and approve_action.performer:
                approver_name = approve_action.performer.full_name
                # Fetch department from UserCompanyAccess
                acc = (
                    db.query(umodels.UserCompanyAccess)
                    .options(joinedload(umodels.UserCompanyAccess.department))
                    .filter(umodels.UserCompanyAccess.user_id == approve_action.performed_by)
                    .first()
                )
                if acc and acc.department:
                    approver_dept = acc.department.department_name

            step_approvals.append({
                "step_order": si.step_order_snapshot,
                "step_name":  si.step_name_snapshot,
                "approver_name": approver_name,
                "approver_dept": approver_dept,
                "approved_at":   approved_at.isoformat() if approved_at else None,
            })

    return {
        "status":          inst.status.value,
        "instance_id":     inst.id,
        "submitted_at":    inst.submitted_at,
        "completed_at":    inst.completed_at,
        "current_step_id": inst.current_step_id,
        "return_comment":  return_comment,
        "step_approvals":  step_approvals,   # list of completed approved steps
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  INBOX – approver sees their pending items
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workflow/inbox/{user_id}", response_model=List[InboxItem],
            summary="Approver inbox – all pending items this user can act on")
def get_inbox(
    user_id:        int,
    entity_type:    Optional[str] = Query(None),
    max_step_order: Optional[int] = Query(None, description="If set, only return step instances with step_order_snapshot <= this value. Use max_step_order=1 for WorkflowMyRequests (Step 1 only), omit for all steps."),
    db: Session = Depends(get_db)
):
    """
    Returns every WorkflowStepInstance that:
      1. Is PENDING
      2. Belongs to an IN_REVIEW or PENDING instance
      3. The user is authorised to approve (via WorkflowStepApprover matching)

    max_step_order=1  → WorkflowMyRequests page (Step 1 approvers only)
    max_step_order omitted → all steps (used by MDM My Req via /mdm/inbox which filters step_order>=2 itself)
    """
    # Fetch all PENDING step instances
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
            WorkflowInstance.status.in_([
                WorkflowStatusEnum.PENDING,
                WorkflowStatusEnum.IN_REVIEW,
            ]),
        )
    )
    if entity_type:
        q = q.filter(WorkflowInstance.entity_type == entity_type)
    # ── Step-order ceiling filter ─────────────────────────────────────────────
    # max_step_order=1  → WorkflowMyRequests page: sirf Step 1 pending items
    # max_step_order omitted → sab steps (MDM My Req apni taraf se step>=2 filter karta hai)
    if max_step_order is not None:
        q = q.filter(WorkflowStepInstance.step_order_snapshot <= max_step_order)

    all_pending = q.all()

    # Fetch the (from_company_id, from_department_id) pairs this user
    # is configured to approve — directly from wf_step_approver table.
    # Only requests matching these pairs will be shown in inbox.
    _approver_from_pairs = _get_approver_from_pairs(db, user_id)

    # Filter to only those this user can approve
    inbox = []
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
                        _dept = db.query(gmodels.Department).filter(
                            gmodels.Department.department_name == _req.department
                        ).first()
                        if _dept: _ent_dept_id = _dept.id
            except Exception:
                pass

        # ── FROM-pair gate (wf_step_approver based) ────────────────────
        # Only show request if its (company_id, dept_id) matches one of
        # the (from_company_id, from_department_id) pairs in the approver
        # rules where this user is the configured approver.
        # NULL from_company_id or from_dept_id = wildcard (matches any).
        if _approver_from_pairs:
            matched = False
            for (from_co, from_dept) in _approver_from_pairs:
                co_ok   = (from_co   is None or from_co   == _ent_co_id)
                dept_ok = (from_dept is None or from_dept == _ent_dept_id)
                if co_ok and dept_ok:
                    matched = True
                    break
            if not matched:
                continue
        else:
            # User has no approver rules at all → show nothing
            continue
        # ────────────────────────────────────────────────────────────────

        if _user_can_approve_step(
            db, user_id, si.step_id,
            submitter_id=si.instance.submitted_by,
            entity_company_id=_ent_co_id,
            entity_dept_id=_ent_dept_id,
        ):
            inbox.append(InboxItem(
                instance_id       = si.instance_id,
                entity_type       = si.instance.entity_type,
                entity_id         = si.instance.entity_id,
                instance_status   = si.instance.status,
                step_instance_id  = si.id,
                step_name         = si.step_name_snapshot,
                step_order        = si.step_order_snapshot,
                step_status       = si.status,
                submitted_by_name = si.instance.submitter.full_name if si.instance.submitter else None,
                submitted_at      = si.instance.submitted_at,
                due_at            = si.due_at,
            ))

    return inbox



# ═══════════════════════════════════════════════════════════════════════════════
#  MY ACTIONS – instances where this user took any action (approver history)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workflow/my-actions/{user_id}",
            summary="All workflow instances where this user performed any action (approvers only)")
def my_actions(
    user_id:        int,
    entity_type:    Optional[str] = Query(None),
    limit:          int = Query(200, ge=1, le=500),
    caller_user_id: Optional[int] = Query(None),
    max_step_order: Optional[int] = Query(None, description="If set, only return instances where user acted on a step with step_order <= this value. Use max_step_order=1 for WorkflowMyRequests (Step 1 only)."),
    db: Session = Depends(get_db)
):
    """
    Returns WorkflowInstances where this user performed an approver action.
    Access gate: only strictly-configured approvers see this endpoint.
    Plain submitters and removed approvers receive [].

    max_step_order=1  → WorkflowMyRequests page: sirf Step 1 actions dikhao
    max_step_order omitted → sab steps (MDM My Req apni taraf se step>=2 filter karta hai)
    """
    # ── Access gate ───────────────────────────────────────────────────────────
    if caller_user_id is not None:
        if not _user_is_configured_approver(db, caller_user_id):
            return []

    # Find approver actions only (SUBMIT excluded — submitters must not appear here)
    # Find all actions performed by this user
    q = (
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
    )
    actions = q.all()

    # Dedupe instance_ids + verify user was actually authorised for each instance
    seen_instance_ids = set()
    result = []
    for action in actions:
        if action.instance_id in seen_instance_ids:
            continue
        seen_instance_ids.add(action.instance_id)

        inst = db.query(WorkflowInstance).filter(
            WorkflowInstance.id == action.instance_id
        ).first()
        if not inst:
            continue
        if entity_type and inst.entity_type != entity_type:
            continue

        # Submitter bypass REMOVED — submitters must not see rows on WorkflowMyRequests.
        # They track their own requests via ItemCodeCreationReq page instead.

        # Verify user is authorised for at least one step in this instance
        # Resolve entity company/dept for FROM filter
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
                        dept_obj = db.query(gmodels.Department).filter(
                            gmodels.Department.department_name == rec.department
                        ).first()
                        if dept_obj: ent_dept_id = dept_obj.id
            except Exception:
                pass

        # ── FROM-pair gate (wf_step_approver based) ────────────────────
        # Only show request if its (company_id, dept_id) matches the
        # (from_company_id, from_department_id) of the approver rules
        # where this user is the configured approver.
        _approver_from_pairs_act = _get_approver_from_pairs(db, user_id)
        if _approver_from_pairs_act:
            _act_matched = False
            for (from_co, from_dept) in _approver_from_pairs_act:
                co_ok   = (from_co   is None or from_co   == ent_co_id)
                dept_ok = (from_dept is None or from_dept == ent_dept_id)
                if co_ok and dept_ok:
                    _act_matched = True
                    break
            if not _act_matched:
                continue
        else:
            continue
        # ────────────────────────────────────────────────────────────────

        # Check if user is authorised for ANY step in this instance
        # max_step_order filter: only consider steps up to the ceiling order
        step_ids = [
            si.step_id for si in inst.step_instances
            if max_step_order is None or si.step_order_snapshot <= max_step_order
        ]
        if not step_ids:
            continue
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
            result.append(_fmt_instance(inst))

    return result

# ═══════════════════════════════════════════════════════════════════════════════
#  MY REQUESTS – submitter tracks their own submissions
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/workflow/my-requests/{user_id}",
            summary="Submitted requests — visible only to configured approvers on WorkflowMyRequests page")
def my_requests(
    user_id:        int,
    entity_type:    Optional[str] = Query(None),
    status:         Optional[WorkflowStatusEnum] = Query(None),
    skip:           int = Query(0, ge=0),
    limit:          int = Query(50, ge=1, le=200),
    caller_user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns WorkflowInstances submitted by user_id.
    Access gate: only strictly-configured approvers see this endpoint.
    Plain submitters and removed approvers receive [].
    """
    # ── Access gate ───────────────────────────────────────────────────────────
    if caller_user_id is not None:
        if not _user_is_configured_approver(db, caller_user_id):
            return []

    q = (
        db.query(WorkflowInstance)
        .options(
            joinedload(WorkflowInstance.step_instances)
        )
        .filter(WorkflowInstance.submitted_by == user_id)
    )
    if entity_type:
        q = q.filter(WorkflowInstance.entity_type == entity_type)
    if status:
        q = q.filter(WorkflowInstance.status == status)

    records = q.order_by(WorkflowInstance.created_at.desc()).offset(skip).limit(limit).all()

    return [_fmt_instance(r) for r in records]


def _fmt_instance(r: WorkflowInstance) -> dict:
    return {
        "instance_id":  r.id,
        "entity_type":  r.entity_type,
        "entity_id":    r.entity_id,
        "status":       r.status.value,
        "submitted_at": r.submitted_at,
        "completed_at": r.completed_at,
    }


@router.get("/workflow/timeline/{entity_type}/{entity_id}",
            response_model=RequestTimeline,
            summary="Step-by-step timeline for a request")
def get_timeline(entity_type: str, entity_id: int, db: Session = Depends(get_db)):
    inst = (
        db.query(WorkflowInstance)
        .options(
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.actions)
            .joinedload(WorkflowAction.performer),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_role),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_dept),
            joinedload(WorkflowInstance.step_instances)
            .joinedload(WorkflowStepInstance.assigned_desg),
        )
        .filter(
            WorkflowInstance.entity_type == entity_type,
            WorkflowInstance.entity_id   == entity_id,
        )
        .first()
    )
    if not inst:
        raise HTTPException(404, "No workflow instance found for this request")

    steps = []
    for si in sorted(inst.step_instances, key=lambda s: s.step_order_snapshot):
        steps.append(TimelineStep(
            step_order    = si.step_order_snapshot,
            step_name     = si.step_name_snapshot,
            status        = si.status,
            is_skipped    = si.is_skipped,
            assigned_role = si.assigned_role.role_name if si.assigned_role else None,
            assigned_dept = si.assigned_dept.department_name if si.assigned_dept else None,
            assigned_desg = si.assigned_desg.designation_name if si.assigned_desg else None,
            started_at    = si.started_at,
            completed_at  = si.completed_at,
            due_at        = si.due_at,
            actions       = [
                WorkflowActionResponse(
                    id               = a.id,
                    instance_id      = a.instance_id,
                    step_instance_id = a.step_instance_id,
                    action_type      = a.action_type,
                    performed_by     = a.performed_by,
                    performer        = a.performer,
                    comments         = a.comments,
                    created_at       = a.created_at,
                ) for a in si.actions
            ],
        ))

    return RequestTimeline(
        instance_id    = inst.id,
        entity_id      = inst.entity_id,
        overall_status = inst.status,
        submitted_at   = inst.submitted_at,
        completed_at   = inst.completed_at,
        steps          = steps,
    )

# ═══════════════════════════════════════════════════════════════════════════════
#  USER NOTIFICATION INBOX
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/workflow/notifications/user/{user_id}",
    response_model=List[UserNotificationResponse],
    summary="Get all notifications for a user (newest first)",
)
def get_user_notifications(
    user_id:  int,
    is_read:  Optional[bool] = Query(None, description="Filter by read status"),
    limit:    int            = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = (
        db.query(WorkflowUserNotification)
        .options(joinedload(WorkflowUserNotification.trigger_user))
        .filter(WorkflowUserNotification.user_id == user_id)
    )
    if is_read is not None:
        q = q.filter(WorkflowUserNotification.is_read == is_read)
    return q.order_by(WorkflowUserNotification.created_at.desc()).limit(limit).all()


@router.get(
    "/workflow/notifications/user/{user_id}/unread-count",
    response_model=UserNotificationUnreadCount,
    summary="Get unread notification count for a user",
)
def get_unread_count(user_id: int, db: Session = Depends(get_db)):
    count = (
        db.query(WorkflowUserNotification)
        .filter(
            WorkflowUserNotification.user_id  == user_id,
            WorkflowUserNotification.is_read  == False,
        )
        .count()
    )
    return {"user_id": user_id, "unread_count": count}


@router.patch(
    "/workflow/notifications/{notif_id}/read",
    response_model=UserNotificationResponse,
    summary="Mark a single notification as read",
)
def mark_notification_read(notif_id: int, db: Session = Depends(get_db)):
    notif = db.query(WorkflowUserNotification).filter(
        WorkflowUserNotification.id == notif_id
    ).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.commit()
    db.refresh(notif)
    return notif


# ═══════════════════════════════════════════════════════════════════════════════
#  USER NOTIFICATION INBOX
#  GET    /workflow/user-notifications/{user_id}         → list notifications
#  GET    /workflow/user-notifications/{user_id}/unread  → unread count
#  PATCH  /workflow/user-notifications/{notif_id}/read   → mark one as read
#  PATCH  /workflow/user-notifications/{user_id}/read-all→ mark all as read
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/workflow/user-notifications/{user_id}",
    response_model=List[UserNotificationResponse],
    summary="Get all notifications for a user (newest first)",
)
def get_user_notifications(
    user_id:  int,
    is_read:  Optional[bool] = Query(None, description="Filter by read status"),
    limit:    int            = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = (
        db.query(WorkflowUserNotification)
        .options(
            joinedload(WorkflowUserNotification.trigger_user),
        )
        .filter(WorkflowUserNotification.user_id == user_id)
    )
    if is_read is not None:
        q = q.filter(WorkflowUserNotification.is_read == is_read)

    return q.order_by(WorkflowUserNotification.created_at.desc()).limit(limit).all()


@router.get(
    "/workflow/user-notifications/{user_id}/unread",
    response_model=UserNotificationUnreadCount,
    summary="Get unread notification count for a user",
)
def get_unread_count(user_id: int, db: Session = Depends(get_db)):
    count = (
        db.query(WorkflowUserNotification)
        .filter(
            WorkflowUserNotification.user_id  == user_id,
            WorkflowUserNotification.is_read  == False,
        )
        .count()
    )
    return UserNotificationUnreadCount(user_id=user_id, unread_count=count)


@router.patch(
    "/workflow/user-notifications/{notif_id}/read",
    summary="Mark a single notification as read",
)
def mark_notification_read(notif_id: int, db: Session = Depends(get_db)):
    notif = db.query(WorkflowUserNotification).filter(
        WorkflowUserNotification.id == notif_id
    ).first()
    if not notif:
        raise HTTPException(404, "Notification not found")
    if not notif.is_read:
        notif.is_read = True
        notif.read_at = datetime.utcnow()
        db.commit()
    return {"id": notif_id, "is_read": True}


@router.patch(
    "/workflow/user-notifications/{user_id}/read-all",
    summary="Mark ALL notifications for a user as read",
)
def mark_all_read(user_id: int, db: Session = Depends(get_db)):
    updated = (
        db.query(WorkflowUserNotification)
        .filter(
            WorkflowUserNotification.user_id == user_id,
            WorkflowUserNotification.is_read == False,
        )
        .all()
    )
    now = datetime.utcnow()
    for n in updated:
        n.is_read = True
        n.read_at = now
    db.commit()
    return {"user_id": user_id, "marked_read": len(updated)}


@router.get(
    "/workflow/debug/step-approvers/{step_id}",
    summary="DEBUG — list all users who can approve a given step",
)
def debug_step_approvers(step_id: int, db: Session = Depends(get_db)):
    """
    Returns every user who matches the WorkflowStepApprover criteria for this step.
    Use this to verify notification targeting is correct.
    """
    approvers = db.query(WorkflowStepApprover).filter(
        WorkflowStepApprover.step_id   == step_id,
        WorkflowStepApprover.is_active == True,
    ).all()

    criteria = [
        {
            "role_id":        a.role_id,
            "department_id":  a.department_id,
            "designation_id": a.designation_id,
            "company_id":     a.company_id,
        }
        for a in approvers
    ]

    all_users = db.query(umodels.User).filter(umodels.User.is_active == True).all()
    matched = []
    for u in all_users:
        if _user_can_approve_step(db, u.id, step_id):
            matched.append({"user_id": u.id, "full_name": u.full_name, "username": u.username})

    return {
        "step_id":         step_id,
        "approver_criteria": criteria,
        "matched_users":   matched,
        "matched_count":   len(matched),
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  SSE  –  Real-time notification stream
#  GET  /workflow/user-notifications/{user_id}/stream
#  Keeps connection open; pushes JSON events instantly when new notifications
#  are created for this user. Falls back gracefully if client disconnects.
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/workflow/user-notifications/{user_id}/stream",
    summary="SSE stream — real-time notification push for a user",
)
async def notification_stream(user_id: int, request: Request):
    """
    Server-Sent Events endpoint.
    - On connect: sends a 'connected' ping with current unread count
    - On new notification: sends JSON event instantly
    - Heartbeat every 25s to keep connection alive through proxies
    - On disconnect: cleans up queue from registry
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)

    # Register this connection
    if user_id not in _sse_subscribers:
        _sse_subscribers[user_id] = []
    _sse_subscribers[user_id].append(queue)

    async def event_generator() -> AsyncGenerator[str, None]:
        # Send initial ping so client knows stream is live
        yield f"data: {json.dumps({'type': 'connected', 'user_id': user_id})}\n\n"
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                try:
                    # Wait up to 25s for a queued event, then send heartbeat
                    payload = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat — keeps connection alive through load balancers/proxies
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
        finally:
            # Clean up on disconnect
            if user_id in _sse_subscribers:
                try:
                    _sse_subscribers[user_id].remove(queue)
                except ValueError:
                    pass
                if not _sse_subscribers[user_id]:
                    del _sse_subscribers[user_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
            "Connection":        "keep-alive",
        },
    )