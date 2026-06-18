"""
MDM/item_info_forward_routes.py
─────────────────────────────────────────────────────────────────────────────
FastAPI router — Item Info Forward

ENDPOINTS
─────────
  GET  /mdm/item-info-forward/companies/{user_id}
       Returns the MDM approver's accessible companies+depts WITH page-access
       status for 'add-item-info' page — used to populate the forward popup.

  POST /mdm/item-info-forward/access-check
       Check if a specific company+dept has access to 'add-item-info' page.

  POST /mdm/item-info-forward/send
       MDM approver sends the forward notification to eligible users
       in the target company+department. Logs to ItemInfoForwardLog.

  GET  /mdm/item-info-forward/log/{entity_id}
       Full forward history for one request.

FLOW
────
  1. MDM approver opens Start Mapping → popup shows their accessible companies
  2. Each company shows its depts WITH green/red access indicator
     (calls /rbac/access-by-role for each company+role+dept combo)
  3. Approver picks company+dept and clicks "Forward" (optionally adds note)
  4. Backend: find all users with that company+dept+role access AND
     'add-item-info' page access → send WorkflowUserNotification to each
  5. Log the forward in ItemInfoForwardLog
  6. Frontend: show success + notified users list
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from user import user_models as umodels
from itemmaster.workflow_models import WorkflowUserNotification, ActionTypeEnum
from MDM.item_info_forward_models import ItemInfoForwardLog
from MDM.item_info_forward_schemas import (
    ItemInfoAccessCheckRequest, ItemInfoAccessCheckResponse,
    CompanyWithDeptAccess, DeptAccessStatus,
    ItemInfoForwardRequest, ItemInfoForwardResponse,
    ItemInfoForwardLogResponse,
)

router = APIRouter()
log = logging.getLogger("mdm.item_info_forward")

# Page path / name for "add-item-info" — must match what's in CompanyRolePageAccess
ITEM_INFO_PAGE_PATHS = {"add-item-info", "additeminfo", "item-info", "iteminfo"}
ITEM_INFO_PAGE_NAMES = {"add item info", "item info", "item info master", "additeminfo"}


# ═══════════════════════════════════════════════════════════════════════════════
#  INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _has_item_info_page_access(
    db: Session,
    company_id:     int,
    role_id:        int,
    department_id:  Optional[int] = None,
    designation_id: Optional[int] = None,
) -> bool:
    """
    Returns True if this company+role+dept+desg combination has access to
    the 'add-item-info' page in CompanyRolePageAccess.

    Same logic as WorkflowAdmin.js checkPageAccess() + workflow_routes.py
    _check_user_page_access_for_step().

    Fallback: if no RBAC rows found for this combo → True (safe, open).
    """
    try:
        from role import role_models as _rbac
        _CRP = getattr(_rbac, "CompanyRolePageAccess", None)
        if _CRP is None:
            return True  # RBAC model not found → allow

        q = (
            db.query(_CRP)
            .filter(
                _CRP.company_id == company_id,
                _CRP.role_id    == role_id,
                _CRP.is_granted == True,
            )
        )
        if department_id is not None:
            q = q.filter(_CRP.department_id == department_id)
        if designation_id is not None:
            q = q.filter(_CRP.designation_id == designation_id)

        rows = q.all()
        if not rows:
            return True  # No RBAC rows → allow (safe fallback)

        for row in rows:
            url  = (getattr(row, "page_url",  None) or "").lower().strip("/")
            name = (getattr(row, "page_name", None) or "").lower()
            if any(url.endswith(p) for p in ITEM_INFO_PAGE_PATHS):
                return True
            if name in ITEM_INFO_PAGE_NAMES:
                return True
            # Also check nested page object
            pg = getattr(row, "page", None)
            if pg:
                purl  = (getattr(pg, "page_url",  None) or "").lower().strip("/")
                pname = (getattr(pg, "page_name", None) or "").lower()
                if any(purl.endswith(p) for p in ITEM_INFO_PAGE_PATHS):
                    return True
                if pname in ITEM_INFO_PAGE_NAMES:
                    return True
        return False

    except Exception as e:
        log.warning(f"[item_info_access] RBAC check error: {e} → allow (fallback)")
        return True


def _get_company_name(db: Session, company_id: int) -> str:
    try:
        import db_models as gm
        co = db.query(gm.Company).filter(gm.Company.id == company_id).first()
        return co.company_name if co else f"Company #{company_id}"
    except:
        return f"Company #{company_id}"


def _get_dept_name(db: Session, dept_id: int) -> str:
    try:
        import db_models as gm
        d = db.query(gm.Department).filter(gm.Department.id == dept_id).first()
        return d.department_name if d else f"Dept #{dept_id}"
    except:
        return f"Dept #{dept_id}"


def _get_item_name(db: Session, entity_id: int) -> Optional[str]:
    try:
        from itemmaster.item_creation_req_models import ItemBasicInfoItemMaster
        rec = db.query(ItemBasicInfoItemMaster).filter(
            ItemBasicInfoItemMaster.id == entity_id
        ).first()
        return rec.item_name if rec else None
    except:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
#  1.  GET  /mdm/item-info-forward/companies/{user_id}
#      Returns MDM approver's accessible companies with dept access status
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/mdm/item-info-forward/companies/{user_id}",
    response_model=List[CompanyWithDeptAccess],
    summary="Item Info Forward — Get approver's companies with dept access status",
)
def get_approver_companies_with_access(
    user_id: int,
    db: Session = Depends(get_db),
):
    """
    Returns all companies the MDM approver has access to,
    with each company's depts and whether those depts have 'add-item-info' page access.

    Used to populate the forward popup's company+dept selector.
    """
    # Get all UserCompanyAccess rows for this user
    accesses = (
        db.query(umodels.UserCompanyAccess)
        .options(
            joinedload(umodels.UserCompanyAccess.company),
            joinedload(umodels.UserCompanyAccess.role),
            joinedload(umodels.UserCompanyAccess.department),
            joinedload(umodels.UserCompanyAccess.designation),
        )
        .filter(umodels.UserCompanyAccess.user_id == user_id)
        .all()
    )

    # ── Same logic as item_creation_req_routes.get_user_dept_access ──────────
    # Step 1: Find PRIMARY company + own dept
    from userDeptAccess import user_dept_access_models as dept_models

    primary_access = next(
        (a for a in accesses if a.is_primary_company), None
    )
    primary_company_id = primary_access.company_id if primary_access else None

    # Step 2: Build company_map — one entry per company, prefer primary flag
    company_map: dict = {}
    for acc in accesses:
        cid = acc.company_id
        if cid not in company_map or acc.is_primary_company:
            company_map[cid] = acc

    # Step 3: Build per-company dept dict (same rule as get_user_dept_access)
    #   PRIMARY company   → own dept from UserCompanyAccess + admin grants merged
    #   NON-PRIMARY       → ONLY admin grants (UserDeptDataAccess, is_granted=True)
    company_depts: dict = {cid: {} for cid in company_map}

    # 3a. PRIMARY company: add own dept from UserCompanyAccess
    for acc in accesses:
        cid = acc.company_id
        if cid != primary_company_id:
            continue
        if acc.department_id and acc.department:
            dept_id = acc.department_id
            if dept_id not in company_depts[cid]:
                company_depts[cid][dept_id] = acc.department_id

    # 3b. Admin-granted depts (UserDeptDataAccess) for ALL companies
    granted_rows = (
        db.query(dept_models.UserDeptDataAccess)
        .filter(
            dept_models.UserDeptDataAccess.user_id    == user_id,
            dept_models.UserDeptDataAccess.is_granted == True,
        )
        .all()
    )
    for row in granted_rows:
        cid = row.company_id
        if cid not in company_depts:
            continue
        dept_id = row.department_id
        if dept_id and dept_id not in company_depts[cid]:
            company_depts[cid][dept_id] = dept_id

    # Build granted_map: { company_id: [dept_id, ...] }
    granted_map: dict = {cid: list(depts.keys()) for cid, depts in company_depts.items()}

    # Step 4: Load dept names in one query
    try:
        import db_models as gm
        all_dept_ids = list({did for dids in granted_map.values() for did in dids})
        dept_objs = db.query(gm.Department).filter(gm.Department.id.in_(all_dept_ids)).all()
        dept_name_map = {d.id: d.department_name for d in dept_objs}
    except:
        dept_name_map = {}
    # Fallback: use relationship name if DB query missed any
    for acc in accesses:
        if acc.department_id and acc.department_id not in dept_name_map:
            if acc.department:
                dept_name_map[acc.department_id] = acc.department.department_name
    for row in granted_rows:
        if row.department_id and row.department_id not in dept_name_map:
            if row.department:
                dept_name_map[row.department_id] = row.department.department_name

    # Step 5: Build result
    result = []
    for cid, acc in company_map.items():
        if not acc.company:
            continue

        granted_depts = granted_map.get(cid, [])

        # For each dept, check add-item-info page access
        depts_with_access = []
        for dept_id in granted_depts:
            has_access = _has_item_info_page_access(
                db,
                company_id     = cid,
                role_id        = acc.role_id,
                department_id  = dept_id,
                designation_id = acc.designation_id,
            )
            depts_with_access.append(DeptAccessStatus(
                department_id   = dept_id,
                department_name = dept_name_map.get(dept_id, f"Dept #{dept_id}"),
                has_page_access = has_access,
            ))

        result.append(CompanyWithDeptAccess(
            company_id        = cid,
            company_name      = acc.company.company_name,
            company_code      = acc.company.company_code,
            is_primary        = acc.is_primary_company or False,
            role_id           = acc.role_id,
            role_name         = acc.role.role_name if acc.role else None,
            department_id     = acc.department_id,
            department_name   = acc.department.department_name if acc.department else None,
            designation_id    = acc.designation_id,
            designation_name  = acc.designation.designation_name if acc.designation else None,
            granted_dept_ids  = granted_depts,
            depts_with_access = depts_with_access,
        ))

    result.sort(key=lambda x: (0 if x.is_primary else 1, x.company_name))
    return result


# ═══════════════════════════════════════════════════════════════════════════════
#  2.  POST  /mdm/item-info-forward/access-check
#      Check if a specific company+dept has 'add-item-info' page access
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/mdm/item-info-forward/access-check",
    response_model=ItemInfoAccessCheckResponse,
    summary="Item Info Forward — Check page access for a company+dept combo",
)
def check_item_info_access(
    payload: ItemInfoAccessCheckRequest,
    db: Session = Depends(get_db),
):
    """
    Checks if a specific company+role+dept+desg has access to 'add-item-info'.
    Called when approver selects a dept in the forward popup to show green/red indicator.
    """
    has = _has_item_info_page_access(
        db,
        company_id     = payload.company_id,
        role_id        = payload.role_id,
        department_id  = payload.department_id,
        designation_id = payload.designation_id,
    )
    return ItemInfoAccessCheckResponse(
        company_id     = payload.company_id,
        role_id        = payload.role_id,
        department_id  = payload.department_id,
        designation_id = payload.designation_id,
        has_access     = has,
        reason         = (
            "Access granted — this department can access Item Info Master page"
            if has else
            "No access — this department does not have 'add-item-info' page access"
        ),
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  3.  POST  /mdm/item-info-forward/send
#      Send forward notification to eligible users
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/mdm/item-info-forward/send",
    response_model=ItemInfoForwardResponse,
    status_code=201,
    summary="Item Info Forward — Send notification to target company+dept users",
)
def send_item_info_forward(
    payload: ItemInfoForwardRequest,
    db: Session = Depends(get_db),
):
    """
    MDM approver forwards the Item Info mapping task.

    Logic:
    1. Find all UserCompanyAccess rows for target company+dept
    2. Filter: only active users WITH 'add-item-info' page access
    3. Send WorkflowUserNotification to each eligible user
    4. Log in ItemInfoForwardLog
    5. Return who was notified
    """
    # Resolve names
    co_name   = _get_company_name(db, payload.target_company_id)
    dept_name = _get_dept_name(db, payload.target_department_id)
    item_name = payload.item_name or _get_item_name(db, payload.entity_id) or f"Request #{payload.entity_id}"
    req_id    = payload.request_id or ""

    # Get forwarder name
    forwarder = db.query(umodels.User).filter(umodels.User.id == payload.forwarded_by).first()
    forwarder_name = forwarder.full_name if forwarder else f"User #{payload.forwarded_by}"

    # Find target users: UserCompanyAccess where company_id + department_id match
    target_accesses = (
        db.query(umodels.UserCompanyAccess)
        .options(joinedload(umodels.UserCompanyAccess.role),
                 joinedload(umodels.UserCompanyAccess.designation))
        .filter(
            umodels.UserCompanyAccess.company_id    == payload.target_company_id,
            umodels.UserCompanyAccess.department_id == payload.target_department_id,
        )
        .all()
    )

    if not target_accesses:
        log.info(f"[forward] No users found for company={payload.target_company_id} dept={payload.target_department_id}")
        _log_forward(db, payload, co_name, dept_name, item_name, forwarder_name, [], "no_eligible_users")
        return ItemInfoForwardResponse(
            entity_id       = payload.entity_id,
            request_id      = req_id,
            item_name       = item_name,
            target_company  = co_name,
            target_dept     = dept_name,
            notified_count  = 0,
            notified_users  = [],
            forward_id      = 0,
            status          = "no_eligible_users",
        )

    # Build notification content
    notif_title = (
        f"📋 Item Info Mapping Required: {item_name}"
        + (f" ({req_id})" if req_id else "")
    )
    notif_body = "\n".join(filter(None, [
        f"MDM Approver {forwarder_name} has forwarded an Item Info mapping task to you.",
        f"",
        f"Item Name:  {item_name}",
        f"Request ID: {req_id}" if req_id else "",
        f"Company:    {co_name}",
        f"Department: {dept_name}",
        f"",
        payload.forward_notes or "",
        f"",
        f"Please open the 'Item Info' page and fill in the required details.",
    ]))

    # Filter + notify
    notified_user_ids  = []
    notified_user_names = []

    for acc in target_accesses:
        uid = acc.user_id
        if not uid:
            continue

        # Check user is active
        user_obj = db.query(umodels.User).filter(umodels.User.id == uid).first()
        if not user_obj or not user_obj.is_active:
            log.info(f"[forward] Skipping inactive user_id={uid}")
            continue

        # Check page access
        has_access = _has_item_info_page_access(
            db,
            company_id     = payload.target_company_id,
            role_id        = acc.role_id,
            department_id  = payload.target_department_id,
            designation_id = acc.designation_id,
        )
        if not has_access:
            log.info(f"[forward] user_id={uid} has no add-item-info page access — skipping")
            continue

        # Send notification via WorkflowUserNotification
        # entity_id is used for deep-link navigation to the request
        db.add(WorkflowUserNotification(
            user_id      = uid,
            instance_id  = 0,   # 0 = no workflow instance (direct forward, not a workflow step)
            entity_type  = "ITEM_CREATION",
            entity_id    = payload.entity_id,
            event        = ActionTypeEnum.SUBMIT,
            title        = notif_title,
            body         = notif_body,
            triggered_by = payload.forwarded_by,
            is_read      = False,
        ))
        notified_user_ids.append(uid)
        notified_user_names.append(user_obj.full_name or f"User #{uid}")
        log.info(f"[forward] Notification queued for user_id={uid} ({user_obj.full_name})")

    db.flush()

    if not notified_user_ids:
        status = "no_eligible_users"
        log.info(f"[forward] No eligible users after access check for company={payload.target_company_id} dept={payload.target_department_id}")
    else:
        status = "sent"

    # Log the forward action
    forward_log = _log_forward(
        db, payload, co_name, dept_name, item_name, forwarder_name,
        list(zip(notified_user_ids, notified_user_names)), status
    )
    db.commit()

    # SSE push to notified users
    try:
        from itemmaster.workflow_routes import _push_notification_to_user
        for uid in notified_user_ids:
            _push_notification_to_user(uid, {
                "type":        "notification",
                "user_id":     uid,
                "title":       notif_title,
                "body":        f"Item Info mapping task forwarded by {forwarder_name}",
                "event":       ActionTypeEnum.SUBMIT.value,
                "entity_type": "ITEM_CREATION",
                "entity_id":   payload.entity_id,
            })
    except Exception as e:
        log.warning(f"[forward] SSE push failed: {e}")

    return ItemInfoForwardResponse(
        entity_id       = payload.entity_id,
        request_id      = req_id,
        item_name       = item_name,
        target_company  = co_name,
        target_dept     = dept_name,
        notified_count  = len(notified_user_ids),
        notified_users  = notified_user_names,
        forward_id      = forward_log.id if forward_log else 0,
        status          = status,
    )


def _log_forward(db, payload, co_name, dept_name, item_name, forwarder_name, notified, status):
    """Insert one ItemInfoForwardLog row. Returns the created row."""
    try:
        uid_str  = ",".join(str(u[0]) for u in notified)
        name_str = ",".join(u[1] for u in notified)
        row = ItemInfoForwardLog(
            entity_id           = payload.entity_id,
            request_id          = payload.request_id,
            item_name_snapshot  = item_name,
            target_company_id   = payload.target_company_id,
            target_company_name = co_name,
            target_dept_id      = payload.target_department_id,
            target_dept_name    = dept_name,
            forwarded_by        = payload.forwarded_by,
            forwarder_name      = forwarder_name,
            forward_notes       = payload.forward_notes,
            notified_user_ids   = uid_str,
            notified_user_names = name_str,
            notified_count      = len(notified),
            status              = status,
        )
        db.add(row)
        db.flush()
        return row
    except Exception as e:
        log.error(f"[forward] Log write failed: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
#  4.  GET  /mdm/item-info-forward/log/{entity_id}
#      Full forward history for one request
# ═══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/mdm/item-info-forward/log/{entity_id}",
    response_model=List[ItemInfoForwardLogResponse],
    summary="Item Info Forward — Full forward history for one request",
)
def get_forward_log(
    entity_id: int,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return (
        db.query(ItemInfoForwardLog)
        .filter(ItemInfoForwardLog.entity_id == entity_id)
        .order_by(ItemInfoForwardLog.forwarded_at.desc())
        .limit(limit)
        .all()
    )


@router.get(
    "/mdm/item-info-forward/log/by-request/{request_id}",
    response_model=List[ItemInfoForwardLogResponse],
    summary="Item Info Forward — Forward history by ICR request_id",
)
def get_forward_log_by_request(request_id: str, db: Session = Depends(get_db)):
    return (
        db.query(ItemInfoForwardLog)
        .filter(ItemInfoForwardLog.request_id == request_id)
        .order_by(ItemInfoForwardLog.forwarded_at.desc())
        .all()
    )