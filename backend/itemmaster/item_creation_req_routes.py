"""itemmaster/item_creation_req_routes.py
   FastAPI router  –  Item Code Creation Request
   ─────────────────────────────────────────────
   Endpoints
   ---------
   GET    /item-creation-req/user/{user_id}/companies-plants
       → companies & plants the user has access to  (for dropdowns)

   POST   /item-creation-req/
       → create new request  (auto-resolves creator role/dept/desg)

   GET    /item-creation-req/
       → list all requests  (optional filters: company_id, is_active)

   GET    /item-creation-req/{req_id}
       → single request with full relations

   PUT    /item-creation-req/{req_id}
       → update request

   DELETE /item-creation-req/{req_id}
       → soft-delete  (is_active = False)

   DELETE /item-creation-req/{req_id}/hard
       → permanent delete
"""

import asyncio
import logging
from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List, Optional

from database import get_db, SessionLocal
import db_models as models                                    # Company, Plant …
from user import user_models as user_models                   # User, UserCompanyAccess
from itemmaster.item_creation_req_models import (
    ItemBasicInfoItemMaster,
    OptionalDocumentItemBasicInfoItemMaster,
)
from userDeptAccess import user_dept_access_models as dept_models   # UserDeptDataAccess
from itemmaster.item_creation_req_schemas import (
    ItemBasicInfoCreate,
    ItemBasicInfoUpdate,
    ItemBasicInfoResponse,
    CompanyWithPlantsOption,
    PlantOption,
)

router = APIRouter()

log = logging.getLogger("item_creation_req.scheduler")

# ══════════════════════════════════════════════════════════════════════════════
#  REQUIRED-DATE OVERDUE SCHEDULER
#  ─────────────────────────────────────────────────────────────────────────────
#  Runs every hour in the background.
#  For every active ITEM_CREATION workflow instance whose required_date == today
#  and status is PENDING or IN_REVIEW:
#    1. Sends a notification to every eligible approver (same logic as submit).
#    2. After all hourly notifications, at end of day auto-RETURN the request
#       with a rollback message asking the submitter to update the required_date.
#
#  Implementation uses a pure asyncio background task — no extra dependencies.
# ══════════════════════════════════════════════════════════════════════════════

async def _required_date_overdue_job():
    """
    Background job — runs every 3600 seconds (1 hour).
    Checks all ITEM_CREATION instances with required_date == today
    and status PENDING or IN_REVIEW.
    Sends hourly reminder notifications to eligible approvers.
    Also performs automatic rollback (RETURN) for these requests.
    """
    from itemmaster.workflow_models import (
        WorkflowInstance, WorkflowStatusEnum, WorkflowUserNotification,
        WorkflowAction, WorkflowStepInstance, WorkflowStepApprover,
        ActionTypeEnum, StepStatusEnum,
    )
    from itemmaster.workflow_routes import _push_notification_to_user

    while True:
        await asyncio.sleep(3600)   # wait 1 hour before first run, then repeat
        try:
            db: Session = SessionLocal()
            try:
                today = date.today()
                log.info(f"[overdue_job] running for date={today}")

                # ── 1. Find all PENDING/IN_REVIEW ITEM_CREATION instances
                #        where required_date == today ─────────────────────────
                active_instances = (
                    db.query(WorkflowInstance)
                    .filter(
                        WorkflowInstance.entity_type == "ITEM_CREATION",
                        WorkflowInstance.status.in_([
                            WorkflowStatusEnum.PENDING,
                            WorkflowStatusEnum.IN_REVIEW,
                        ]),
                    )
                    .all()
                )

                overdue = []
                for inst in active_instances:
                    rec = db.query(ItemBasicInfoItemMaster).filter(
                        ItemBasicInfoItemMaster.id == inst.entity_id
                    ).first()
                    if rec and rec.required_date and rec.required_date == today:
                        overdue.append((inst, rec))

                log.info(f"[overdue_job] {len(overdue)} overdue instance(s) found")

                for inst, rec in overdue:
                    item_label    = rec.item_name or f"Request #{rec.id}"
                    item_type     = rec.item_type or ""
                    required_date = str(rec.required_date)
                    item_dept     = rec.department or ""
                    item_company  = ""
                    if rec.company_id:
                        co = db.query(models.Company).filter(
                            models.Company.id == rec.company_id
                        ).first()
                        if co:
                            item_company = co.company_name

                    submitter = db.query(user_models.User).filter(
                        user_models.User.id == inst.submitted_by
                    ).first()
                    submitter_name = submitter.full_name if submitter else f"User #{inst.submitted_by}"

                    # ── Build notification message ────────────────────────────
                    notif_title = (
                        f"⚠️ Urgent Review Required — Required Date is TODAY: {required_date} | "
                        f"{item_label}" + (f" ({item_type})" if item_type else "")
                    )
                    notif_body = "\n".join(filter(None, [
                        f"🔴 This request has NOT been reviewed and its Required Date is TODAY ({required_date}).",
                        f"Item Name:    {item_label}",
                        f"Item Type:    {item_type}"     if item_type     else "",
                        f"Company:      {item_company}"  if item_company  else "",
                        f"Department:   {item_dept}"     if item_dept     else "",
                        f"Required Date: {required_date}",
                        f"Submitted by: {submitter_name}",
                        f"Status:       {inst.status.value}",
                        f"",
                        f"Please review this request immediately.",
                    ]))

                    # ── 2. Find eligible approvers (same logic as _notify_approvers_for_step)
                    #       Pull from_company/dept from the item record ───────────
                    from_company_ids: set = set()
                    from_dept_ids:    set = set()
                    if rec.company_id:
                        from_company_ids.add(rec.company_id)
                    if rec.department:
                        dept_obj = db.query(models.Department).filter(
                            models.Department.department_name == rec.department
                        ).first()
                        if dept_obj:
                            from_dept_ids.add(dept_obj.id)

                    # Collect all active approver criteria for ANY step in
                    # an ITEM_CREATION template
                    # Simpler: get all step approver criteria linked to ITEM_CREATION template
                    from itemmaster.workflow_models import WorkflowStep, WorkflowTemplate
                    item_creation_templates = (
                        db.query(WorkflowTemplate)
                        .filter(
                            WorkflowTemplate.is_active == True,
                            WorkflowTemplate.code == "ITEM_CREATION",
                        )
                        .all()
                    )
                    tmpl_ids = {t.id for t in item_creation_templates}

                    approver_criteria = []
                    if tmpl_ids:
                        steps = db.query(WorkflowStep).filter(
                            WorkflowStep.template_id.in_(tmpl_ids),
                            WorkflowStep.is_active == True,
                        ).all()
                        step_ids = {s.id for s in steps}
                        if step_ids:
                            approver_criteria = db.query(WorkflowStepApprover).filter(
                                WorkflowStepApprover.step_id.in_(step_ids),
                                WorkflowStepApprover.is_active == True,
                            ).all()

                    # Also include submitter accesses as fallback for FROM matching
                    submitter_accesses = db.query(user_models.UserCompanyAccess).filter(
                        user_models.UserCompanyAccess.user_id == inst.submitted_by
                    ).all()
                    for sa in submitter_accesses:
                        if sa.company_id:    from_company_ids.add(sa.company_id)
                        if sa.department_id: from_dept_ids.add(sa.department_id)

                    all_accesses = db.query(user_models.UserCompanyAccess).all()

                    notified_ids: set = set()
                    for access in all_accesses:
                        uid = access.user_id
                        if not uid or uid in notified_ids:
                            continue
                        matched = False
                        for crit in approver_criteria:
                            if crit.from_company_id is not None and from_company_ids:
                                if crit.from_company_id not in from_company_ids:
                                    continue
                            if crit.from_department_id is not None and from_dept_ids:
                                if crit.from_department_id not in from_dept_ids:
                                    continue
                            role_match = (crit.role_id        is None or crit.role_id        == access.role_id)
                            dept_match = (crit.department_id  is None or crit.department_id  == access.department_id)
                            desg_match = (crit.designation_id is None or crit.designation_id == access.designation_id)
                            co_match   = (crit.company_id     is None or crit.company_id     == access.company_id)
                            if role_match and dept_match and desg_match and co_match:
                                matched = True
                                break

                        if not matched:
                            continue

                        # Save notification row
                        db.add(WorkflowUserNotification(
                            user_id      = uid,
                            instance_id  = inst.id,
                            entity_type  = inst.entity_type,
                            entity_id    = inst.entity_id,
                            event        = ActionTypeEnum.SUBMIT,
                            title        = notif_title,
                            body         = notif_body,
                            triggered_by = None,
                            is_read      = False,
                        ))
                        notified_ids.add(uid)

                        # SSE instant push
                        _push_notification_to_user(uid, {
                            "type":        "notification",
                            "user_id":     uid,
                            "title":       notif_title,
                            "body":        f"⚠️ Required Date is TODAY — {item_label} has not been reviewed yet.",
                            "event":       ActionTypeEnum.SUBMIT.value,
                            "entity_type": inst.entity_type,
                            "entity_id":   inst.entity_id,
                        })

                    # ── 3. Auto-RETURN (rollback) the instance ────────────────
                    #    Mark current active step as RETURNED, instance as RETURNED,
                    #    log a WorkflowAction, and notify the submitter.
                    rollback_comment = (
                        f"⏰ Auto-Rollback: This request was NOT reviewed before its Required Date ({required_date}).\n"
                        f"\n"
                        f"The request has been automatically returned to you.\n"
                        f"Please update the Required Date and resubmit.\n"
                        f"\n"
                        f"Reason: Required Date has passed without review or approval.\n"
                        f"Action needed: Change the Required Date to a future date and resubmit the request."
                    )

                    # Find current active step instance
                    active_step = (
                        db.query(WorkflowStepInstance)
                        .filter(
                            WorkflowStepInstance.instance_id == inst.id,
                            WorkflowStepInstance.status == StepStatusEnum.PENDING,
                            WorkflowStepInstance.is_skipped == False,
                        )
                        .order_by(WorkflowStepInstance.step_order_snapshot)
                        .first()
                    )

                    # Log the RETURN action
                    db.add(WorkflowAction(
                        instance_id      = inst.id,
                        step_instance_id = active_step.id if active_step else None,
                        action_type      = ActionTypeEnum.RETURN,
                        performed_by     = None,   # system-triggered
                        comments         = rollback_comment,
                    ))

                    # Update step status
                    if active_step:
                        active_step.status       = StepStatusEnum.RETURNED
                        active_step.completed_at = datetime.utcnow()

                    # Update instance status
                    inst.status       = WorkflowStatusEnum.RETURNED
                    inst.completed_at = datetime.utcnow()

                    # Notify the submitter
                    if inst.submitted_by:
                        return_title = (
                            f"↩️ Request Auto-Returned — Required Date Passed: {item_label}"
                        )
                        return_body = (
                            f"Your request \"{item_label}\" has been automatically returned "
                            f"because the Required Date ({required_date}) has passed without review.\n"
                            f"\n"
                            f"Please update the Required Date to a future date and resubmit.\n"
                            f"\n"
                            f"Note: The request was not reviewed by the approver before the deadline."
                        )
                        db.add(WorkflowUserNotification(
                            user_id      = inst.submitted_by,
                            instance_id  = inst.id,
                            entity_type  = inst.entity_type,
                            entity_id    = inst.entity_id,
                            event        = ActionTypeEnum.RETURN,
                            title        = return_title,
                            body         = return_body,
                            triggered_by = None,
                            is_read      = False,
                        ))
                        _push_notification_to_user(inst.submitted_by, {
                            "type":        "notification",
                            "user_id":     inst.submitted_by,
                            "title":       return_title,
                            "body":        f"Your request has been auto-returned. Please update the Required Date and resubmit.",
                            "event":       ActionTypeEnum.RETURN.value,
                            "entity_type": inst.entity_type,
                            "entity_id":   inst.entity_id,
                        })

                    db.commit()
                    log.info(
                        f"[overdue_job] instance_id={inst.id} entity_id={inst.entity_id} "
                        f"→ notified {len(notified_ids)} approver(s), auto-returned."
                    )

            finally:
                db.close()

        except Exception as e:
            log.error(f"[overdue_job] unhandled error: {e}", exc_info=True)


@router.on_event("startup")
async def start_required_date_scheduler():
    """Start the overdue required-date background job on router startup."""
    asyncio.create_task(_required_date_overdue_job())
    log.info("[overdue_job] required-date overdue scheduler started (runs every 1 hour)")


# ══════════════════════════════════════════════════════════════════════════════
#  1.  GET  companies + plants accessible by the user
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-creation-req/user/{user_id}/companies-plants",
    response_model=List[CompanyWithPlantsOption],
    summary="Get companies and plants the user has access to"
)
def get_user_companies_plants(user_id: int, db: Session = Depends(get_db)):
    """
    Returns the list of companies (and their plants) that the logged-in user
    has been granted access to  –  used to populate the Company / Plant
    dropdowns on the Item Code Creation Request form.

    Sources (merged, no duplicates):
      1. UserCompanyAccess  – companies where is_primary_company = True
      2. UserDeptDataAccess – companies where is_granted = True
         (added by admin via UserDeptAccessPage)

    Plants come from UserCompanyAccess rows for the matched company.
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ── Source 1: primary companies from UserCompanyAccess ────────────────────
    primary_accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.is_primary_company == True,
        )
        .all()
    )
    primary_company_ids = {acc.company_id for acc in primary_accesses}

    # ── Source 2: companies from UserDeptDataAccess (is_granted = True) ───────
    dept_access_rows = (
        db.query(dept_models.UserDeptDataAccess)
        .filter(
            dept_models.UserDeptDataAccess.user_id == user_id,
            dept_models.UserDeptDataAccess.is_granted == True,
        )
        .all()
    )
    dept_access_company_ids = {row.company_id for row in dept_access_rows}

    # Merge both sources
    all_company_ids = primary_company_ids | dept_access_company_ids

    if not all_company_ids:
        return []

    # ── Build company_map ─────────────────────────────────────────────────────
    company_map: dict[int, dict] = {}
    for cid in all_company_ids:
        company = db.query(models.Company).filter(models.Company.id == cid).first()
        if not company:
            continue
        company_map[cid] = {
            "id":           company.id,
            "company_name": company.company_name,
            "company_code": company.company_code,
            "plants":       {}
        }

    # ── Plants: from UserCompanyAccess for all matched companies ─────────────
    all_accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.company_id.in_(all_company_ids),
        )
        .all()
    )
    for acc in all_accesses:
        cid = acc.company_id
        if cid not in company_map:
            continue
        if acc.plant_id:
            pid = acc.plant_id
            if pid not in company_map[cid]["plants"]:
                plant = db.query(models.Plant).filter(models.Plant.id == pid).first()
                if plant:
                    company_map[cid]["plants"][pid] = PlantOption(
                        id=plant.id,
                        plant_name=plant.plant_name,
                        plant_code=getattr(plant, "plant_code", None)
                    )

    # ── Serialise to response schema ──────────────────────────────────────────
    result = []
    for entry in company_map.values():
        result.append(CompanyWithPlantsOption(
            id=entry["id"],
            company_name=entry["company_name"],
            company_code=entry["company_code"],
            plants=list(entry["plants"].values())
        ))

    return result




# ══════════════════════════════════════════════════════════════════════════════
#  1b. GET  dept-access granted companies + departments for a user
#       Merges UserCompanyAccess (user's own dept) + UserDeptDataAccess (admin grants)
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-creation-req/user/{user_id}/dept-access",
    summary="Get companies and their accessible departments for the logged-in user"
)
def get_user_dept_access(user_id: int, db: Session = Depends(get_db)):
    """
    Returns per-company dept list for the dropdown in ItemCodeCreationReq form.

    RULE:
      PRIMARY company   → user's OWN dept (UserCompanyAccess, is_primary_company=True)
                          + any extra admin grants (UserDeptDataAccess), merged.
      NON-PRIMARY       → ONLY admin grants (UserDeptDataAccess, is_granted=True).
                          UserCompanyAccess dept is NOT included — user may have the
                          same dept name in many companies but that does NOT mean they
                          have data-access there unless admin explicitly grants it.

    Response: [{ company_id, company_name, company_code, is_primary, departments:[...] }]
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ── Step 1: find user's PRIMARY company + own dept ────────────────────────
    primary_access = (
        db.query(user_models.UserCompanyAccess)
        .filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.is_primary_company == True,
        )
        .first()
    )
    primary_company_id = primary_access.company_id if primary_access else None

    # ── Step 2: build company_map from ALL companies user has access to ───────
    all_accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(user_models.UserCompanyAccess.user_id == user_id)
        .all()
    )
    company_map: dict[int, dict] = {}
    for acc in all_accesses:
        cid = acc.company_id
        if cid not in company_map:
            company = db.query(models.Company).filter(models.Company.id == cid).first()
            if not company:
                continue
            company_map[cid] = {
                "company_id":   company.id,
                "company_name": company.company_name,
                "company_code": getattr(company, "company_code", None),
                "is_primary":   (cid == primary_company_id),
                "departments":  {}   # dept_id → {id, department_name, department_code}
            }
        # PRIMARY company only: add own dept from UserCompanyAccess
        if cid == primary_company_id and acc.department_id and acc.department:
            dept_id = acc.department_id
            if dept_id not in company_map[cid]["departments"]:
                company_map[cid]["departments"][dept_id] = {
                    "id":              acc.department.id,
                    "department_name": acc.department.department_name or "",
                    "department_code": getattr(acc.department, "department_code", None) or "",
                }

    # ── Step 3: add admin-granted depts (UserDeptDataAccess) for all companies ─
    granted_rows = (
        db.query(dept_models.UserDeptDataAccess)
        .filter(
            dept_models.UserDeptDataAccess.user_id == user_id,
            dept_models.UserDeptDataAccess.is_granted == True,
        )
        .all()
    )
    for row in granted_rows:
        cid = row.company_id
        if cid not in company_map:
            # Company not in user's UserCompanyAccess — skip
            continue
        if row.department_id and row.department:
            dept_id = row.department_id
            if dept_id not in company_map[cid]["departments"]:
                company_map[cid]["departments"][dept_id] = {
                    "id":              row.department.id,
                    "department_name": row.department.department_name or "",
                    "department_code": getattr(row.department, "department_code", None) or "",
                }

    # ── Step 4: serialise ─────────────────────────────────────────────────────
    result = []
    for entry in company_map.values():
        result.append({
            "company_id":   entry["company_id"],
            "company_name": entry["company_name"],
            "company_code": entry["company_code"],
            "is_primary":   entry["is_primary"],
            "departments":  list(entry["departments"].values()),
        })

    return result

# ══════════════════════════════════════════════════════════════════════════════
#  2.  POST  create a new request
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/item-creation-req/",
    response_model=ItemBasicInfoResponse,
    status_code=201,
    summary="Create Item Code Creation Request"
)
def create_item_creation_request(payload: ItemBasicInfoCreate, db: Session = Depends(get_db)):

    # Generate unique request_id: ICR-YYYYMMDD-XXXXX
    today_str = date.today().strftime("%Y%m%d")
    prefix    = f"ICR-{today_str}-"
    last = (
        db.query(ItemBasicInfoItemMaster)
        .filter(ItemBasicInfoItemMaster.request_id.like(f"{prefix}%"))
        .order_by(ItemBasicInfoItemMaster.request_id.desc())
        .first()
    )
    if last and last.request_id:
        try:
            last_num = int(last.request_id.split("-")[-1])
        except ValueError:
            last_num = 0
    else:
        last_num = 0
    new_request_id = f"{prefix}{last_num + 1:05d}"

    # Create main record
    req = ItemBasicInfoItemMaster(
        request_id        = new_request_id,
        item_name         = payload.item_name,
        item_description  = payload.item_description,
        item_short_name   = payload.item_short_name,
        item_type         = payload.item_type,
        department        = payload.department,
        required_date     = payload.required_date,
        business_reason   = payload.business_reason,
        company_id        = payload.company_id,
        plant_id          = payload.plant_id,
        created_by        = payload.created_by,
    )
    db.add(req)
    db.flush()   # get req.id before committing

    # Optional documents
    if payload.optional_documents:
        od = payload.optional_documents
        doc = OptionalDocumentItemBasicInfoItemMaster(
            item_master_basic_info_id = req.id,
            reference_image_url       = od.reference_image_url,
            vendor_quotation_url      = od.vendor_quotation_url,
            sample_photo_url          = od.sample_photo_url,
            product_link              = od.product_link,
        )
        db.add(doc)

    db.commit()
    db.refresh(req)

    return _load_full(db, req.id)


# ══════════════════════════════════════════════════════════════════════════════
#  3.  GET  list all requests
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-creation-req/",
    response_model=List[ItemBasicInfoResponse],
    summary="List Item Code Creation Requests"
)
def list_item_creation_requests(
    company_id: Optional[int] = Query(None),
    plant_id:   Optional[int] = Query(None),
    is_active:  Optional[bool] = Query(None),
    created_by: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(ItemBasicInfoItemMaster)

    if company_id is not None:
        q = q.filter(ItemBasicInfoItemMaster.company_id == company_id)
    if plant_id is not None:
        q = q.filter(ItemBasicInfoItemMaster.plant_id == plant_id)
    if is_active is not None:
        q = q.filter(ItemBasicInfoItemMaster.is_active == is_active)
    if created_by is not None:
        q = q.filter(ItemBasicInfoItemMaster.created_by == created_by)

    records = q.order_by(ItemBasicInfoItemMaster.created_at.desc()).all()
    return [_load_full(db, r.id) for r in records]


# ══════════════════════════════════════════════════════════════════════════════
#  4.  GET  single request
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/item-creation-req/{req_id}",
    response_model=ItemBasicInfoResponse,
    summary="Get single Item Code Creation Request"
)
def get_item_creation_request(req_id: int, db: Session = Depends(get_db)):
    return _load_full(db, req_id)


# ══════════════════════════════════════════════════════════════════════════════
#  5.  PUT  update
# ══════════════════════════════════════════════════════════════════════════════

@router.put(
    "/item-creation-req/{req_id}",
    response_model=ItemBasicInfoResponse,
    summary="Update Item Code Creation Request"
)
def update_item_creation_request(
    req_id: int,
    payload: ItemBasicInfoUpdate,
    db: Session = Depends(get_db)
):
    req = db.query(ItemBasicInfoItemMaster).filter(ItemBasicInfoItemMaster.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Update scalar fields (only those explicitly set)
    update_fields = {
        "item_name", "item_description", "item_short_name", "item_type",
        "department", "required_date", "business_reason",
        "company_id", "plant_id", "updated_by", "is_active"
    }
    for field in update_fields:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(req, field, value)

    # Update optional documents
    if payload.optional_documents is not None:
        od = payload.optional_documents
        if req.optional_documents:
            doc = req.optional_documents
        else:
            doc = OptionalDocumentItemBasicInfoItemMaster(
                item_master_basic_info_id=req.id
            )
            db.add(doc)

        doc.reference_image_url  = od.reference_image_url  if od.reference_image_url  is not None else doc.reference_image_url
        doc.vendor_quotation_url = od.vendor_quotation_url if od.vendor_quotation_url is not None else doc.vendor_quotation_url
        doc.sample_photo_url     = od.sample_photo_url     if od.sample_photo_url     is not None else doc.sample_photo_url
        doc.product_link         = od.product_link         if od.product_link         is not None else doc.product_link

    db.commit()
    db.refresh(req)
    return _load_full(db, req_id)


# ══════════════════════════════════════════════════════════════════════════════
#  6.  DELETE  soft
# ══════════════════════════════════════════════════════════════════════════════

@router.delete(
    "/item-creation-req/{req_id}",
    summary="Soft-delete Item Code Creation Request (is_active = False)"
)
def soft_delete_item_creation_request(req_id: int, db: Session = Depends(get_db)):
    req = db.query(ItemBasicInfoItemMaster).filter(ItemBasicInfoItemMaster.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    req.is_active = False
    db.commit()
    return {"message": f"Request {req_id} deactivated successfully", "id": req_id}


# ══════════════════════════════════════════════════════════════════════════════
#  7.  DELETE  hard (permanent)
# ══════════════════════════════════════════════════════════════════════════════

@router.delete(
    "/item-creation-req/{req_id}/hard",
    summary="Permanently delete Item Code Creation Request"
)
def hard_delete_item_creation_request(req_id: int, db: Session = Depends(get_db)):
    req = db.query(ItemBasicInfoItemMaster).filter(ItemBasicInfoItemMaster.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    db.delete(req)
    db.commit()
    return {"message": f"Request {req_id} permanently deleted", "id": req_id}


# ══════════════════════════════════════════════════════════════════════════════
#  INTERNAL helper – eager-load everything for response
# ══════════════════════════════════════════════════════════════════════════════

def _load_full(db: Session, req_id: int) -> ItemBasicInfoItemMaster:
    req = (
        db.query(ItemBasicInfoItemMaster)
        .options(
            joinedload(ItemBasicInfoItemMaster.company),
            joinedload(ItemBasicInfoItemMaster.plant),
            joinedload(ItemBasicInfoItemMaster.creator),
            joinedload(ItemBasicInfoItemMaster.optional_documents),
        )
        .filter(ItemBasicInfoItemMaster.id == req_id)
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req