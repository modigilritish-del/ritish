"""itemmaster/item_type_master_routes.py
   FastAPI router — Item Type Master (root of hierarchy)
"""

import re
from fastapi import APIRouter, HTTPException, Depends, Query, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db
from itemmaster.item_type_master_models import ItemTypeMaster, ItemTypeNameHistory
from itemmaster.item_type_master_schemas import (
    ItemTypeCreate, ItemTypeUpdate,
    ItemTypeResponse, ItemTypeLOV,
    ItemTypeNameHistoryResponse,
)

router = APIRouter(tags=["Item Type Master"])


# ── Inlined utility functions (no external code_utils dependency) ─────────────

def capitalize_properly(name: str) -> str:
    SMALL_WORDS = {"of", "and", "or", "the", "a", "an", "in", "on", "at", "to", "for", "with", "by"}
    words = name.strip().split()
    result = []
    for i, word in enumerate(words):
        if i == 0 or word.lower() not in SMALL_WORDS:
            result.append(word.capitalize())
        else:
            result.append(word.lower())
    return " ".join(result)


def _slugify(name: str, max_chars: int = 6) -> str:
    clean = re.sub(r'[^A-Z0-9]', '', name.upper())
    return clean[:max_chars] if clean else "ITEM"


def preview_item_type_code(name: str) -> str:
    slug = _slugify(name)
    return f"{slug}-001"


def generate_item_type_code(name: str, db: Session) -> str:
    slug = _slugify(name)
    base = slug
    existing = (
        db.query(ItemTypeMaster.code)
        .filter(ItemTypeMaster.code.like(f"{base}-%"))
        .all()
    )
    nums = []
    for (code,) in existing:
        try:
            nums.append(int(code.rsplit("-", 1)[-1]))
        except ValueError:
            pass
    seq = max(nums, default=0) + 1
    return f"{base}-{seq:03d}"


# ── internal helpers ──────────────────────────────────────────────────────────

def _load_full(db: Session, type_id: int) -> ItemTypeMaster:
    obj = (
        db.query(ItemTypeMaster)
        .options(
            joinedload(ItemTypeMaster.creator),
            joinedload(ItemTypeMaster.updater),
            joinedload(ItemTypeMaster.name_history)
            .joinedload(ItemTypeNameHistory.changer),
        )
        .filter(ItemTypeMaster.id == type_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Item Type not found")
    return obj


# ══════════════════════════════════════════════════════════════════════════════
#  1.  POST  /item-type-master/
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/item-type-master/", response_model=ItemTypeResponse, status_code=201,
             summary="Create a new Item Type")
def create_item_type(
    name:        str           = Form(...),
    description: Optional[str] = Form(None),
    created_by:  Optional[int] = Form(None),
    user_id:     Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    name = capitalize_properly(name)
    if db.query(ItemTypeMaster).filter(ItemTypeMaster.name == name).first():
        raise HTTPException(status_code=400, detail=f"Item Type '{name}' already exists")

    code = generate_item_type_code(name, db)
    obj = ItemTypeMaster(
        code=code, name=name,
        description=description.strip() if description else None,
        created_by=created_by or user_id,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _load_full(db, obj.id)


# ══════════════════════════════════════════════════════════════════════════════
#  2.  GET  /item-type-master/  (list)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/item-type-master/", response_model=List[ItemTypeResponse],
            summary="List all Item Types")
def list_item_types(
    is_active: Optional[bool] = Query(None),
    search:    Optional[str]  = Query(None),
    skip:      int            = Query(0, ge=0),
    limit:     int            = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(ItemTypeMaster)
    if is_active is not None:
        q = q.filter(ItemTypeMaster.is_active == is_active)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(
            ItemTypeMaster.name.ilike(term) |
            ItemTypeMaster.code.ilike(term) |
            ItemTypeMaster.description.ilike(term)
        )
    records = q.order_by(ItemTypeMaster.name).offset(skip).limit(limit).all()
    return [_load_full(db, r.id) for r in records]


# ══════════════════════════════════════════════════════════════════════════════
#  3.  GET  /item-type-master/lov
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/item-type-master/lov", response_model=List[ItemTypeLOV],
            summary="Active Item Types for dropdowns")
def get_item_type_lov(db: Session = Depends(get_db)):
    return (
        db.query(ItemTypeMaster)
        .filter(ItemTypeMaster.is_active == True)
        .order_by(ItemTypeMaster.name)
        .all()
    )


# ══════════════════════════════════════════════════════════════════════════════
#  4.  GET  /item-type-master/preview-code
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/item-type-master/preview-code", summary="Preview auto-generated code as user types")
def preview_code(name: str = Query(..., min_length=1)):
    return {"preview_code": preview_item_type_code(name)}


# ══════════════════════════════════════════════════════════════════════════════
#  5.  GET  /item-type-master/{type_id}
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/item-type-master/{type_id}", response_model=ItemTypeResponse,
            summary="Get single Item Type with audit history")
def get_item_type(type_id: int, db: Session = Depends(get_db)):
    return _load_full(db, type_id)


# ══════════════════════════════════════════════════════════════════════════════
#  6.  PUT  /item-type-master/{type_id}
# ══════════════════════════════════════════════════════════════════════════════

@router.put("/item-type-master/{type_id}", response_model=ItemTypeResponse,
            summary="Update Item Type — name changes auto-logged")
def update_item_type(type_id: int, payload: ItemTypeUpdate, db: Session = Depends(get_db)):
    obj = db.query(ItemTypeMaster).filter(ItemTypeMaster.id == type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Item Type not found")

    if payload.name is not None:
        new_name = capitalize_properly(payload.name)
        if new_name != obj.name:
            if db.query(ItemTypeMaster).filter(
                ItemTypeMaster.name == new_name, ItemTypeMaster.id != type_id
            ).first():
                raise HTTPException(status_code=409, detail=f"Name '{new_name}' already exists")
            db.add(ItemTypeNameHistory(
                item_type_id=obj.id, old_name=obj.name,
                new_name=new_name, changed_by=payload.updated_by,
            ))
            obj.name = new_name

    if payload.code is not None:
        new_code = payload.code.strip().upper()
        if new_code != obj.code:
            clash = db.query(ItemTypeMaster).filter(
                ItemTypeMaster.code == new_code, ItemTypeMaster.id != type_id
            ).first()
            if clash:
                raise HTTPException(status_code=409, detail=f"Code '{new_code}' already exists")
            obj.code = new_code

    if payload.description is not None:
        obj.description = payload.description.strip() or None
    if payload.is_active is not None:
        obj.is_active = payload.is_active
    if payload.updated_by is not None:
        obj.updated_by = payload.updated_by

    db.commit()
    db.refresh(obj)
    return _load_full(db, obj.id)


# ══════════════════════════════════════════════════════════════════════════════
#  7.  PATCH  /item-type-master/{type_id}/toggle
# ══════════════════════════════════════════════════════════════════════════════

@router.patch("/item-type-master/{type_id}/toggle", response_model=ItemTypeResponse,
              summary="Toggle Item Type active/inactive")
def toggle_item_type(
    type_id:    int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = db.query(ItemTypeMaster).filter(ItemTypeMaster.id == type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Item Type not found")
    obj.is_active = not obj.is_active
    if updated_by:
        obj.updated_by = updated_by
    db.commit()
    db.refresh(obj)
    return _load_full(db, obj.id)


# ══════════════════════════════════════════════════════════════════════════════
#  8.  DELETE  /item-type-master/{type_id}  — Soft delete
# ══════════════════════════════════════════════════════════════════════════════

@router.delete("/item-type-master/{type_id}", summary="Soft-delete Item Type")
def soft_delete_item_type(
    type_id:    int,
    updated_by: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    obj = db.query(ItemTypeMaster).filter(ItemTypeMaster.id == type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Item Type not found")
    obj.is_active = False
    if updated_by:
        obj.updated_by = updated_by
    db.commit()
    return {"message": f"Item Type '{obj.name}' deactivated", "id": type_id, "is_active": False}


# ══════════════════════════════════════════════════════════════════════════════
#  9.  DELETE  /item-type-master/{type_id}/hard  — Hard delete
# ══════════════════════════════════════════════════════════════════════════════

@router.delete("/item-type-master/{type_id}/hard", summary="Permanently delete Item Type")
def hard_delete_item_type(type_id: int, db: Session = Depends(get_db)):
    obj = db.query(ItemTypeMaster).filter(ItemTypeMaster.id == type_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Item Type not found")
    name = obj.name
    db.delete(obj)
    db.commit()
    return {"message": f"Item Type '{name}' permanently deleted", "id": type_id}


# ══════════════════════════════════════════════════════════════════════════════
#  10.  GET  /item-type-master/{type_id}/history
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/item-type-master/{type_id}/history",
            response_model=List[ItemTypeNameHistoryResponse],
            summary="Name-change history for an Item Type")
def get_item_type_history(type_id: int, db: Session = Depends(get_db)):
    if not db.query(ItemTypeMaster).filter(ItemTypeMaster.id == type_id).first():
        raise HTTPException(status_code=404, detail="Item Type not found")
    return (
        db.query(ItemTypeNameHistory)
        .options(joinedload(ItemTypeNameHistory.changer))
        .filter(ItemTypeNameHistory.item_type_id == type_id)
        .order_by(ItemTypeNameHistory.changed_at.desc())
        .all()
    )