"""pageAccess/page_access_routes.py
   FastAPI router – Page–Company Access Control System

ENDPOINT MAP
────────────
PAGE REGISTRY
  POST   /page-access/pages/                     Register a new page
  GET    /page-access/pages/                     List all pages (search, is_active filter)
  GET    /page-access/pages/lov                  Lightweight list for dropdowns
  GET    /page-access/pages/{page_id}            Get one page
  PUT    /page-access/pages/{page_id}            Update page
  DELETE /page-access/pages/{page_id}            Soft-delete (is_active=False)
  DELETE /page-access/pages/{page_id}/hard       Hard delete

COMPANY ACCESS  (ONE primary company per page)
  POST   /page-access/company-access/            Attach page → company (409 if already linked to another company)
  GET    /page-access/company-access/            List all rules (filter by page/company)
  DELETE /page-access/company-access/{rule_id}   Remove rule

  GET    /page-access/company/{company_id}/pages Get all page rules for a company

REMOVED: /page-access/user-overrides/*  (per-user overrides removed)
REMOVED: /page-access/user/{user_id}/accessible-pages  (resolver removed)
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db
from pageAccess.page_access_models import PageRegistry, PageCompanyAccess
from pageAccess.page_access_schemas import (
    PageCreate, PageUpdate, PageResponse, PageLOV,
    PageCompanyAccessCreate, PageCompanyAccessResponse,
)

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════════════════
#  INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _load_page(db: Session, page_id: int) -> PageRegistry:
    obj = (
        db.query(PageRegistry)
        .options(joinedload(PageRegistry.creator))
        .filter(PageRegistry.id == page_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Page not found")
    return obj


def _load_company_access(db: Session, rule_id: int) -> PageCompanyAccess:
    obj = (
        db.query(PageCompanyAccess)
        .options(
            joinedload(PageCompanyAccess.page),
            joinedload(PageCompanyAccess.company),
            joinedload(PageCompanyAccess.creator),
        )
        .filter(PageCompanyAccess.id == rule_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Access rule not found")
    return obj


# ═══════════════════════════════════════════════════════════════════════════════
#  1. PAGE REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/page-access/pages/",
    response_model=PageResponse,
    status_code=201,
    summary="Register a new page in the access system",
)
def register_page(payload: PageCreate, db: Session = Depends(get_db)):
    if db.query(PageRegistry).filter(PageRegistry.page_key == payload.page_key).first():
        raise HTTPException(status_code=400,
                            detail=f"Page key '{payload.page_key}' already registered")
    obj = PageRegistry(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _load_page(db, obj.id)


@router.get(
    "/page-access/pages/",
    response_model=List[PageResponse],
    summary="List all registered pages",
)
def list_pages(
    is_active: Optional[bool] = Query(None),
    search:    Optional[str]  = Query(None),
    skip:      int            = Query(0,   ge=0),
    limit:     int            = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(PageRegistry)
    if is_active is not None:
        q = q.filter(PageRegistry.is_active == is_active)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            PageRegistry.page_name.ilike(term) |
            PageRegistry.page_key.ilike(term)  |
            PageRegistry.page_route.ilike(term)
        )
    rows = q.order_by(PageRegistry.page_name).offset(skip).limit(limit).all()
    return [_load_page(db, r.id) for r in rows]


@router.get(
    "/page-access/pages/lov",
    response_model=List[PageLOV],
    summary="Get active pages for dropdown (LOV)",
)
def get_pages_lov(db: Session = Depends(get_db)):
    return (
        db.query(PageRegistry)
        .filter(PageRegistry.is_active == True)
        .order_by(PageRegistry.page_name)
        .all()
    )


@router.get(
    "/page-access/pages/{page_id}",
    response_model=PageResponse,
    summary="Get a single page",
)
def get_page(page_id: int, db: Session = Depends(get_db)):
    return _load_page(db, page_id)


@router.put(
    "/page-access/pages/{page_id}",
    response_model=PageResponse,
    summary="Update a page",
)
def update_page(page_id: int, payload: PageUpdate, db: Session = Depends(get_db)):
    obj = db.query(PageRegistry).filter(PageRegistry.id == page_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Page not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return _load_page(db, obj.id)


@router.delete(
    "/page-access/pages/{page_id}",
    summary="Soft-delete a page (is_active = False)",
)
def soft_delete_page(page_id: int, db: Session = Depends(get_db)):
    obj = db.query(PageRegistry).filter(PageRegistry.id == page_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Page not found")
    obj.is_active = False
    db.commit()
    return {"message": f"Page '{obj.page_name}' deactivated", "id": page_id}


@router.delete(
    "/page-access/pages/{page_id}/hard",
    summary="Permanently delete a page and all its access rules",
)
def hard_delete_page(page_id: int, db: Session = Depends(get_db)):
    obj = db.query(PageRegistry).filter(PageRegistry.id == page_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Page not found")
    name = obj.page_name
    db.delete(obj)
    db.commit()
    return {"message": f"Page '{name}' permanently deleted", "id": page_id}


# ═══════════════════════════════════════════════════════════════════════════════
#  2. COMPANY ACCESS RULES  (ONE primary company per page)
# ═══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/page-access/company-access/",
    response_model=PageCompanyAccessResponse,
    status_code=201,
    summary="Attach a page to a company (one primary company per page)",
)
def attach_page_to_company(
    payload: PageCompanyAccessCreate,
    db: Session = Depends(get_db),
):
    # Ensure page exists
    if not db.query(PageRegistry).filter(PageRegistry.id == payload.page_id).first():
        raise HTTPException(status_code=404, detail="Page not found")

    # ONE PRIMARY COMPANY CHECK:
    # Agar page already kisi company se linked hai, 409 return karo with old company name.
    # Frontend will show confirmation: "This page is already linked to X. Switch to Y?"
    # Agar confirm kare to frontend pehle DELETE karega phir POST karega.
    existing = db.query(PageCompanyAccess).filter(
        PageCompanyAccess.page_id == payload.page_id,
    ).first()

    if existing:
        if existing.company_id == payload.company_id:
            # Same company — re-activate if deactivated, otherwise no-op
            if not existing.is_active:
                existing.is_active = True
                db.commit()
                db.refresh(existing)
                return _load_company_access(db, existing.id)
            raise HTTPException(
                status_code=400,
                detail="This page is already linked to this company"
            )
        # Different company — return 409 with old company name so frontend can prompt
        old_company = existing.company
        old_name = old_company.company_name if old_company else f"Company #{existing.company_id}"
        raise HTTPException(
            status_code=409,
            detail=f"ALREADY_LINKED:{old_name}:{existing.id}"
            # Format: "ALREADY_LINKED:<old_company_name>:<old_rule_id>"
            # Frontend parses this to show: "This page is already linked to <old_company_name>.
            # Do you want to switch to <new_company>? Old link will be removed."
            # If confirmed: DELETE /company-access/<old_rule_id> then POST again
        )

    obj = PageCompanyAccess(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _load_company_access(db, obj.id)


@router.get(
    "/page-access/company-access/",
    response_model=List[PageCompanyAccessResponse],
    summary="List all page–company access rules",
)
def list_company_accesses(
    page_id:    Optional[int]  = Query(None),
    company_id: Optional[int]  = Query(None),
    is_active:  Optional[bool] = Query(None),
    skip:       int            = Query(0,   ge=0),
    limit:      int            = Query(500, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    q = db.query(PageCompanyAccess)
    if page_id    is not None: q = q.filter(PageCompanyAccess.page_id    == page_id)
    if company_id is not None: q = q.filter(PageCompanyAccess.company_id == company_id)
    if is_active  is not None: q = q.filter(PageCompanyAccess.is_active  == is_active)
    rows = q.order_by(PageCompanyAccess.id).offset(skip).limit(limit).all()
    return [_load_company_access(db, r.id) for r in rows]


@router.delete(
    "/page-access/company-access/{rule_id}",
    summary="Remove a page–company access rule",
)
def remove_company_access(rule_id: int, db: Session = Depends(get_db)):
    obj = db.query(PageCompanyAccess).filter(PageCompanyAccess.id == rule_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Access rule not found")
    db.delete(obj)
    db.commit()
    return {"message": "Access rule removed", "id": rule_id}


# ── Convenience: get all pages attached to a specific company ─────────────────
@router.get(
    "/page-access/company/{company_id}/pages",
    response_model=List[PageCompanyAccessResponse],
    summary="Get all page rules for a specific company",
)
def get_pages_for_company(
    company_id: int,
    db: Session = Depends(get_db),
):
    rows = (
        db.query(PageCompanyAccess)
        .filter(
            PageCompanyAccess.company_id == company_id,
            PageCompanyAccess.is_active  == True,
        )
        .order_by(PageCompanyAccess.id)
        .all()
    )
    return [_load_company_access(db, r.id) for r in rows]