"""common/yes_no_master_routes.py
   FastAPI router — Yes / No Master
   ──────────────────────────────────────────────────────────────────────────────
   Each YES/NO pair = 2 rows in DB, each with its own PK.
   They share yes_no_pair_id.

   Endpoints
   ---------
   POST   /yes-no-master/              → Create pair (2 rows: yes + no)
   GET    /yes-no-master/              → List all pairs
   GET    /yes-no-master/lov           → Active pairs for dropdown
   GET    /yes-no-master/{pair_id}     → Single pair by yes_no_pair_id
   PUT    /yes-no-master/{pair_id}     → Update pair labels / status
   PATCH  /yes-no-master/{pair_id}/toggle → Toggle is_active for both rows
   DELETE /yes-no-master/{pair_id}        → Soft-delete both rows
   DELETE /yes-no-master/{pair_id}/hard   → Hard-delete both rows
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

from database import get_db
from common.yes_no_master_models import YesNoMaster
from common.yes_no_master_schemas import (
    YesNoPairResponse,
    YesNoCreate,
    YesNoUpdate,
    YesNoLOV,
)

router = APIRouter()


# ── internal: build pair response from two rows ───────────────────────────────

def _pair_response(yes_row: YesNoMaster, no_row: YesNoMaster) -> dict:
    return YesNoPairResponse(
        yes_no_pair_id = yes_row.yes_no_pair_id,
        yes_id         = yes_row.id,
        no_id          = no_row.id,
        yes_label      = yes_row.label,
        no_label       = no_row.label,
        is_active      = yes_row.is_active,
        created_by     = yes_row.created_by,
        updated_by     = yes_row.updated_by,
        creator        = yes_row.creator,
        created_at     = yes_row.created_at,
        updated_at     = yes_row.updated_at,
    )


def _load_pair(db: Session, pair_id: int):
    rows = (
        db.query(YesNoMaster)
        .options(joinedload(YesNoMaster.creator), joinedload(YesNoMaster.updater))
        .filter(YesNoMaster.yes_no_pair_id == pair_id)
        .all()
    )
    yes_row = next((r for r in rows if r.label_type == 'yes'), None)
    no_row  = next((r for r in rows if r.label_type == 'no'),  None)
    if not yes_row or not no_row:
        raise HTTPException(status_code=404, detail="Yes/No pair not found")
    return yes_row, no_row


def _next_pair_id(db: Session) -> int:
    max_pair = db.query(func.max(YesNoMaster.yes_no_pair_id)).scalar()
    return (max_pair or 0) + 1


# ══════════════════════════════════════════════════════════════════════════════
#  1.  POST  /yes-no-master/   — Create pair (2 rows)
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/yes-no-master/",
    response_model=YesNoPairResponse,
    status_code=201,
    summary="Create a new Yes/No pair (2 rows, each with own PK)",
)
def create_yes_no(
    yes_label:  str           = Form(...),
    no_label:   str           = Form(...),
    created_by: Optional[int] = Form(None),
    user_id:    Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    yes_label = yes_label.strip().upper()
    no_label  = no_label.strip().upper()

    pair_id = _next_pair_id(db)
    creator = created_by or user_id

    yes_row = YesNoMaster(label=yes_label, label_type='yes', yes_no_pair_id=pair_id, created_by=creator)
    no_row  = YesNoMaster(label=no_label,  label_type='no',  yes_no_pair_id=pair_id, created_by=creator)

    db.add(yes_row)
    db.add(no_row)
    db.commit()
    db.refresh(yes_row)
    db.refresh(no_row)

    yes_row, no_row = _load_pair(db, pair_id)
    return _pair_response(yes_row, no_row)


# ══════════════════════════════════════════════════════════════════════════════
#  2.  GET  /yes-no-master/   — List all pairs
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/yes-no-master/",
    response_model=List[YesNoPairResponse],
    summary="List all Yes/No pairs",
)
def list_yes_no(
    is_active: Optional[bool] = Query(None),
    search:    Optional[str]  = Query(None),
    skip:      int            = Query(0,   ge=0),
    limit:     int            = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(YesNoMaster.yes_no_pair_id).distinct()

    if is_active is not None:
        q = q.filter(YesNoMaster.is_active == is_active)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(YesNoMaster.label.ilike(term))

    pair_ids = [r[0] for r in q.offset(skip).limit(limit).all()]

    result = []
    for pid in pair_ids:
        try:
            yes_row, no_row = _load_pair(db, pid)
            result.append(_pair_response(yes_row, no_row))
        except HTTPException:
            continue
    return result


# ══════════════════════════════════════════════════════════════════════════════
#  3.  GET  /yes-no-master/lov
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/yes-no-master/lov",
    response_model=List[YesNoLOV],
    summary="Active Yes/No pairs for dropdown",
)
def get_yes_no_lov(db: Session = Depends(get_db)):
    pair_ids = [
        r[0] for r in
        db.query(YesNoMaster.yes_no_pair_id)
        .filter(YesNoMaster.is_active == True)
        .distinct()
        .all()
    ]
    result = []
    for pid in pair_ids:
        rows = db.query(YesNoMaster).filter(YesNoMaster.yes_no_pair_id == pid).all()
        yes_row = next((r for r in rows if r.label_type == 'yes'), None)
        no_row  = next((r for r in rows if r.label_type == 'no'),  None)
        if yes_row and no_row:
            result.append(YesNoLOV(
                yes_no_pair_id=pid,
                yes_id=yes_row.id,
                no_id=no_row.id,
                yes_label=yes_row.label,
                no_label=no_row.label,
            ))
    return result


# ══════════════════════════════════════════════════════════════════════════════
#  4.  GET  /yes-no-master/{pair_id}
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/yes-no-master/{pair_id}",
    response_model=YesNoPairResponse,
    summary="Get single Yes/No pair",
)
def get_yes_no(pair_id: int, db: Session = Depends(get_db)):
    yes_row, no_row = _load_pair(db, pair_id)
    return _pair_response(yes_row, no_row)


# ══════════════════════════════════════════════════════════════════════════════
#  5.  PUT  /yes-no-master/{pair_id}
# ══════════════════════════════════════════════════════════════════════════════

@router.put(
    "/yes-no-master/{pair_id}",
    response_model=YesNoPairResponse,
    summary="Update Yes/No pair labels",
)
def update_yes_no(
    pair_id: int,
    payload: YesNoUpdate,
    db: Session = Depends(get_db),
):
    yes_row, no_row = _load_pair(db, pair_id)

    if payload.yes_label is not None:
        yes_row.label = payload.yes_label.strip().upper()
    if payload.no_label is not None:
        no_row.label = payload.no_label.strip().upper()
    if payload.is_active is not None:
        yes_row.is_active = payload.is_active
        no_row.is_active  = payload.is_active
    if payload.updated_by is not None:
        yes_row.updated_by = payload.updated_by
        no_row.updated_by  = payload.updated_by

    db.commit()
    db.refresh(yes_row)
    db.refresh(no_row)
    yes_row, no_row = _load_pair(db, pair_id)
    return _pair_response(yes_row, no_row)


# ══════════════════════════════════════════════════════════════════════════════
#  6.  PATCH  /yes-no-master/{pair_id}/toggle
# ══════════════════════════════════════════════════════════════════════════════

@router.patch(
    "/yes-no-master/{pair_id}/toggle",
    response_model=YesNoPairResponse,
    summary="Toggle Yes/No pair active/inactive",
)
def toggle_yes_no(
    pair_id:    int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    yes_row, no_row = _load_pair(db, pair_id)
    new_status = not yes_row.is_active
    yes_row.is_active = new_status
    no_row.is_active  = new_status
    if updated_by:
        yes_row.updated_by = updated_by
        no_row.updated_by  = updated_by
    db.commit()
    db.refresh(yes_row)
    db.refresh(no_row)
    yes_row, no_row = _load_pair(db, pair_id)
    return _pair_response(yes_row, no_row)


# ══════════════════════════════════════════════════════════════════════════════
#  7.  DELETE  /yes-no-master/{pair_id}  — Soft delete both rows
# ══════════════════════════════════════════════════════════════════════════════

@router.delete(
    "/yes-no-master/{pair_id}",
    summary="Soft-delete Yes/No pair (both rows is_active = False)",
)
def soft_delete_yes_no(
    pair_id:    int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    yes_row, no_row = _load_pair(db, pair_id)
    yes_row.is_active = False
    no_row.is_active  = False
    if updated_by:
        yes_row.updated_by = updated_by
        no_row.updated_by  = updated_by
    db.commit()
    return {"message": f"Pair '{yes_row.label}/{no_row.label}' deactivated", "pair_id": pair_id, "is_active": False}


# ══════════════════════════════════════════════════════════════════════════════
#  8.  DELETE  /yes-no-master/{pair_id}/hard  — Hard delete both rows
# ══════════════════════════════════════════════════════════════════════════════

@router.delete(
    "/yes-no-master/{pair_id}/hard",
    summary="Permanently delete Yes/No pair (both rows)",
)
def hard_delete_yes_no(pair_id: int, db: Session = Depends(get_db)):
    yes_row, no_row = _load_pair(db, pair_id)
    label = f"{yes_row.label}/{no_row.label}"
    db.delete(yes_row)
    db.delete(no_row)
    db.commit()
    return {"message": f"Pair '{label}' permanently deleted", "pair_id": pair_id}