"""
itemmaster/mandatory_field_routes.py
─────────────────────────────────────────────────────────────────────────────
FastAPI router — Mandatory Field Configuration
ZERO changes to any existing route/model/schema.

Register in main.py:
    from itemmaster.mandatory_field_routes import router as mf_router
    app.include_router(mf_router, prefix="/api", tags=["Mandatory Fields"])

Endpoints
---------
POST   /mandatory-fields/
    Create a new config row for (page_key, company_id, plant_id).
    Writes CREATE log.

GET    /mandatory-fields/
    List all configs. Filter by ?page_key=&company_id=&plant_id=

GET    /mandatory-fields/{config_id}
    Get single config with full relations.

PUT    /mandatory-fields/{config_id}
    Update fields_config. Computes diff and writes UPDATE log.

GET    /mandatory-fields/{config_id}/logs
    Full audit log for this config.

GET    /mandatory-fields/resolve
    ?page_key=item-code-creation-req&company_id=1&plant_id=2
    Returns the effective mandatory field keys (plant-level first, else company-level).
    Used by frontend to highlight mandatory fields at form render time.

GET    /mandatory-fields/logs/all
    All logs across all configs (admin view). Filter by ?page_key=&company_id=
"""

import json
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session, joinedload

from database import get_db
from itemmaster.mandatory_field_models import MandatoryFieldConfig, MandatoryFieldConfigLog
from itemmaster.mandatory_field_schemas import (
    MandatoryFieldConfigCreate,
    MandatoryFieldConfigUpdate,
    MandatoryFieldConfigResponse,
    MandatoryFieldConfigLogResponse,
    ResolvedMandatoryFields,
    FieldEntry,
)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load_full(db: Session, config_id: int) -> MandatoryFieldConfig:
    cfg = (
        db.query(MandatoryFieldConfig)
        .options(
            joinedload(MandatoryFieldConfig.company),
            joinedload(MandatoryFieldConfig.plant),
            joinedload(MandatoryFieldConfig.creator),
            joinedload(MandatoryFieldConfig.updater),
        )
        .filter(MandatoryFieldConfig.id == config_id)
        .first()
    )
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    return cfg


def _compute_diff(old_list: list, new_list: list) -> dict:
    """Return { field_key: {old: bool, new: bool} } for changed mandatory values."""
    old_map = {f["field_key"]: f.get("is_mandatory", False) for f in (old_list or [])}
    new_map = {f["field_key"]: f.get("is_mandatory", False) for f in (new_list or [])}
    all_keys = set(old_map) | set(new_map)
    diff = {}
    for k in all_keys:
        o = old_map.get(k, False)
        n = new_map.get(k, False)
        if o != n:
            diff[k] = {"old": o, "new": n}
    return diff


def _fields_to_json(fields: List[FieldEntry]) -> list:
    return [f.dict() for f in fields]


# ═════════════════════════════════════════════════════════════════════════════
#  1.  POST  /mandatory-fields/  — Create
# ═════════════════════════════════════════════════════════════════════════════

@router.post(
    "/mandatory-fields/",
    response_model=MandatoryFieldConfigResponse,
    summary="Create mandatory field config for a page + company [+ plant]"
)
def create_mandatory_field_config(
    payload: MandatoryFieldConfigCreate,
    db: Session = Depends(get_db)
):
    # Check uniqueness
    existing = (
        db.query(MandatoryFieldConfig)
        .filter(
            MandatoryFieldConfig.page_key  == payload.page_key,
            MandatoryFieldConfig.company_id == payload.company_id,
            MandatoryFieldConfig.plant_id  == payload.plant_id,
        )
        .first()
    )
    if existing:
        scope = f"company_id={payload.company_id}" + (f", plant_id={payload.plant_id}" if payload.plant_id else "")
        raise HTTPException(
            status_code=409,
            detail=f"Config already exists for page='{payload.page_key}' {scope}. Use PUT to update."
        )

    fields_json = _fields_to_json(payload.fields_config)

    cfg = MandatoryFieldConfig(
        page_key      = payload.page_key,
        page_label    = payload.page_label,
        company_id    = payload.company_id,
        plant_id      = payload.plant_id,
        fields_config = fields_json,
        created_by    = payload.created_by,
    )
    db.add(cfg)
    db.flush()   # get cfg.id

    # Write CREATE log
    log_row = MandatoryFieldConfigLog(
        config_id      = cfg.id,
        page_key       = cfg.page_key,
        company_id     = cfg.company_id,
        plant_id       = cfg.plant_id,
        change_type    = "CREATE",
        snapshot       = fields_json,
        changed_fields = None,
        note           = payload.note,
        performed_by   = payload.created_by,
    )
    db.add(log_row)
    db.commit()
    db.refresh(cfg)
    return _load_full(db, cfg.id)


# ═════════════════════════════════════════════════════════════════════════════
#  2.  GET  /mandatory-fields/  — List
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/mandatory-fields/",
    response_model=List[MandatoryFieldConfigResponse],
    summary="List all mandatory field configs"
)
def list_mandatory_field_configs(
    page_key:   Optional[str] = Query(None),
    company_id: Optional[int] = Query(None),
    plant_id:   Optional[int] = Query(None),
    is_active:  Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    q = (
        db.query(MandatoryFieldConfig)
        .options(
            joinedload(MandatoryFieldConfig.company),
            joinedload(MandatoryFieldConfig.plant),
            joinedload(MandatoryFieldConfig.creator),
            joinedload(MandatoryFieldConfig.updater),
        )
    )
    if page_key:
        q = q.filter(MandatoryFieldConfig.page_key == page_key)
    if company_id is not None:
        q = q.filter(MandatoryFieldConfig.company_id == company_id)
    if plant_id is not None:
        q = q.filter(MandatoryFieldConfig.plant_id == plant_id)
    if is_active is not None:
        q = q.filter(MandatoryFieldConfig.is_active == is_active)

    return q.order_by(MandatoryFieldConfig.id.desc()).all()


# ═════════════════════════════════════════════════════════════════════════════
#  3.  GET  /mandatory-fields/{config_id}  — Single
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/mandatory-fields/{config_id}",
    response_model=MandatoryFieldConfigResponse,
    summary="Get single mandatory field config"
)
def get_mandatory_field_config(config_id: int, db: Session = Depends(get_db)):
    return _load_full(db, config_id)


# ═════════════════════════════════════════════════════════════════════════════
#  4.  PUT  /mandatory-fields/{config_id}  — Update
# ═════════════════════════════════════════════════════════════════════════════

@router.put(
    "/mandatory-fields/{config_id}",
    response_model=MandatoryFieldConfigResponse,
    summary="Update mandatory field config and write audit log"
)
def update_mandatory_field_config(
    config_id: int,
    payload: MandatoryFieldConfigUpdate,
    db: Session = Depends(get_db)
):
    cfg = db.query(MandatoryFieldConfig).filter(MandatoryFieldConfig.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")

    old_fields = cfg.fields_config or []
    new_fields = _fields_to_json(payload.fields_config)

    diff = _compute_diff(old_fields, new_fields)

    cfg.fields_config = new_fields
    if payload.updated_by is not None:
        cfg.updated_by = payload.updated_by

    # Write UPDATE log
    log_row = MandatoryFieldConfigLog(
        config_id      = cfg.id,
        page_key       = cfg.page_key,
        company_id     = cfg.company_id,
        plant_id       = cfg.plant_id,
        change_type    = "UPDATE",
        snapshot       = new_fields,
        changed_fields = diff if diff else None,
        note           = payload.note,
        performed_by   = payload.updated_by,
    )
    db.add(log_row)
    db.commit()
    db.refresh(cfg)
    return _load_full(db, cfg.id)


# ═════════════════════════════════════════════════════════════════════════════
#  5.  GET  /mandatory-fields/{config_id}/logs  — Per-config audit log
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/mandatory-fields/{config_id}/logs",
    response_model=List[MandatoryFieldConfigLogResponse],
    summary="Audit log for a specific mandatory field config"
)
def get_mandatory_field_config_logs(config_id: int, db: Session = Depends(get_db)):
    logs = (
        db.query(MandatoryFieldConfigLog)
        .options(joinedload(MandatoryFieldConfigLog.performer))
        .filter(MandatoryFieldConfigLog.config_id == config_id)
        .order_by(MandatoryFieldConfigLog.performed_at.desc())
        .all()
    )
    return logs


# ═════════════════════════════════════════════════════════════════════════════
#  6.  GET  /mandatory-fields/resolve  — Effective mandatory fields
#  Must be declared BEFORE /{config_id} to avoid route clash
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/mandatory-fields/resolve/effective",
    response_model=ResolvedMandatoryFields,
    summary="Resolve effective mandatory fields for a page + company + optional plant"
)
def resolve_mandatory_fields(
    page_key:   str           = Query(...),
    company_id: int           = Query(...),
    plant_id:   Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Priority:
      1. Plant-level config (page_key + company_id + plant_id)  — if plant_id given
      2. Company-level config (page_key + company_id + plant_id=NULL)
      3. Return empty list (no config = no mandatory fields)
    """
    cfg = None
    scope = "none"

    if plant_id:
        cfg = (
            db.query(MandatoryFieldConfig)
            .filter(
                MandatoryFieldConfig.page_key   == page_key,
                MandatoryFieldConfig.company_id == company_id,
                MandatoryFieldConfig.plant_id   == plant_id,
                MandatoryFieldConfig.is_active  == True,
            )
            .first()
        )
        if cfg:
            scope = "plant"

    if cfg is None:
        cfg = (
            db.query(MandatoryFieldConfig)
            .filter(
                MandatoryFieldConfig.page_key   == page_key,
                MandatoryFieldConfig.company_id == company_id,
                MandatoryFieldConfig.plant_id   == None,
                MandatoryFieldConfig.is_active  == True,
            )
            .first()
        )
        if cfg:
            scope = "company"

    if cfg is None:
        return ResolvedMandatoryFields(
            page_key       = page_key,
            company_id     = company_id,
            plant_id       = plant_id,
            scope          = "none",
            mandatory_keys = [],
            all_fields     = [],
        )

    fields      = cfg.fields_config or []
    mand_keys   = [f["field_key"] for f in fields if f.get("is_mandatory")]

    return ResolvedMandatoryFields(
        page_key       = page_key,
        company_id     = cfg.company_id,
        plant_id       = cfg.plant_id,
        scope          = scope,
        mandatory_keys = mand_keys,
        all_fields     = fields,
    )


# ═════════════════════════════════════════════════════════════════════════════
#  7.  GET  /mandatory-fields/logs/all  — All logs (admin)
# ═════════════════════════════════════════════════════════════════════════════

@router.get(
    "/mandatory-fields/logs/all",
    response_model=List[MandatoryFieldConfigLogResponse],
    summary="All mandatory field config audit logs (admin view)"
)
def get_all_mandatory_field_logs(
    page_key:   Optional[str] = Query(None),
    company_id: Optional[int] = Query(None),
    limit:      int           = Query(200),
    db: Session = Depends(get_db)
):
    q = (
        db.query(MandatoryFieldConfigLog)
        .options(joinedload(MandatoryFieldConfigLog.performer))
    )
    if page_key:
        q = q.filter(MandatoryFieldConfigLog.page_key == page_key)
    if company_id is not None:
        q = q.filter(MandatoryFieldConfigLog.company_id == company_id)

    return q.order_by(MandatoryFieldConfigLog.performed_at.desc()).limit(limit).all()