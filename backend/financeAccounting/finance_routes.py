"""financeAccounting/finance_routes.py - Finance & Accounting API Routes"""
from fastapi import APIRouter, HTTPException, Depends, Form, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_, text
from typing import List, Optional
import re

from database import get_db
import db_models as models
from financeAccounting import finance_models as fin_models
from financeAccounting import finance_schemas as schemas
from user import user_models

router = APIRouter()


# ==================== DB COLUMN SAFETY HELPERS ====================
# gl_master.gl_head_id and gl_sub_category_id may not exist yet if migration
# hasn't run.  We check once per process and cache the result.

_gl_master_cols: Optional[set] = None

def _get_gl_master_cols(db: Session) -> set:
    global _gl_master_cols
    if _gl_master_cols is None:
        try:
            rows = db.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name='gl_master'")
            ).fetchall()
            _gl_master_cols = {r[0] for r in rows}
        except Exception:
            _gl_master_cols = set()
    return _gl_master_cols

def _has_col(db: Session, col: str) -> bool:
    return col in _get_gl_master_cols(db)


# ==================== UTILITY FUNCTIONS ====================

def get_user_accessible_companies(db: Session, user_id: int) -> List[int]:
    query = db.query(user_models.UserCompanyAccess.company_id).filter(
        user_models.UserCompanyAccess.user_id == user_id
    ).distinct()
    return [cid for (cid,) in query.all() if cid]


def get_user_accessible_plants(db: Session, user_id: int, company_id: int = None) -> List[int]:
    query = db.query(user_models.UserCompanyAccess.plant_id).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.plant_id.isnot(None)
    )
    if company_id:
        query = query.filter(user_models.UserCompanyAccess.company_id == company_id)
    return [pid for (pid,) in query.all() if pid]


def check_user_company_access(db: Session, user_id: int, company_id: int) -> bool:
    return db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == company_id
    ).first() is not None


def capitalize_properly(name: str) -> str:
    return ' '.join(word.capitalize() for word in name.strip().split())


def auto_display_order(db: Session) -> int:
    from sqlalchemy import func as sqlfunc
    max_order = db.query(sqlfunc.max(fin_models.GLSubType.display_order)).scalar()
    return (max_order or 0) + 1


def generate_type_code(name: str, db: Session, model, code_field: str, prefix: str = "") -> str:
    alpha = "".join(c for c in name.strip().upper() if c.isalpha())
    base = (alpha[:4]).ljust(4, "X")
    if prefix:
        base = prefix.upper() + base
    counter = 1
    while True:
        candidate = f"{base}-{counter:04d}"
        exists = db.query(model).filter(getattr(model, code_field) == candidate).first()
        if not exists:
            return candidate
        counter += 1


# ==================== GL TYPE MASTER ENDPOINTS ====================

@router.get("/gl-types", response_model=List[schemas.GLTypeResponse])
async def get_gl_types(is_active: Optional[bool] = Query(None), db: Session = Depends(get_db)):
    query = db.query(fin_models.GLType)
    if is_active is not None:
        query = query.filter(fin_models.GLType.is_active == is_active)
    return query.order_by(fin_models.GLType.type_name).all()


@router.post("/gl-types", response_model=schemas.GLTypeResponse)
async def create_gl_type(
    type_name: str = Form(...),
    description: Optional[str] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    type_name = capitalize_properly(type_name)
    type_code = generate_type_code(type_name, db, fin_models.GLType, "type_code")
    if db.query(fin_models.GLType).filter(fin_models.GLType.type_code == type_code).first():
        raise HTTPException(status_code=400, detail="GL Type code already exists")
    if db.query(fin_models.GLType).filter(fin_models.GLType.type_name == type_name).first():
        raise HTTPException(status_code=400, detail="GL Type name already exists")
    gl_type = fin_models.GLType(
        type_code=type_code, type_name=type_name,
        description=description.strip() if description else None, created_by=user_id
    )
    db.add(gl_type); db.commit(); db.refresh(gl_type)
    return gl_type


@router.put("/gl-types/{type_id}", response_model=schemas.GLTypeResponse)
async def update_gl_type(
    type_id: int,
    type_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    gl_type = db.query(fin_models.GLType).filter(fin_models.GLType.id == type_id).first()
    if not gl_type:
        raise HTTPException(status_code=404, detail="GL Type not found")
    if type_name:
        type_name = capitalize_properly(type_name)
        existing = db.query(fin_models.GLType).filter(fin_models.GLType.type_name == type_name, fin_models.GLType.id != type_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="GL Type name already exists")
        gl_type.type_name = type_name
    if description is not None:
        gl_type.description = description.strip() if description else None
    if is_active is not None:
        gl_type.is_active = is_active
    gl_type.updated_by = user_id
    db.commit(); db.refresh(gl_type)
    return gl_type


# ==================== GL SUB TYPE MASTER ENDPOINTS ====================

@router.get("/gl-sub-types", response_model=List[schemas.GLSubTypeResponse])
async def get_gl_sub_types(
    is_active: Optional[bool] = Query(None),
    gl_type_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(fin_models.GLSubType).options(joinedload(fin_models.GLSubType.gl_type))
    if is_active is not None:
        query = query.filter(fin_models.GLSubType.is_active == is_active)
    if gl_type_id is not None:
        query = query.filter(fin_models.GLSubType.gl_type_id == gl_type_id)
    sub_types = query.order_by(fin_models.GLSubType.gl_type_id, fin_models.GLSubType.display_order, fin_models.GLSubType.sub_type_name).all()
    result = []
    for st in sub_types:
        result.append(schemas.GLSubTypeResponse(
            id=st.id, sub_type_code=st.sub_type_code, sub_type_name=st.sub_type_name,
            description=st.description, gl_type_id=st.gl_type_id, display_order=st.display_order,
            is_active=st.is_active, created_at=st.created_at,
            gl_type_code=st.gl_type.type_code if st.gl_type else None,
            gl_type_name=st.gl_type.type_name if st.gl_type else None,
        ))
    return result


@router.post("/gl-sub-types", response_model=schemas.GLSubTypeResponse)
async def create_gl_sub_type(
    sub_type_name: str = Form(...),
    gl_type_id: int = Form(...),
    description: Optional[str] = Form(None),
    display_order: Optional[int] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    sub_type_name = capitalize_properly(sub_type_name)
    gl_type = db.query(fin_models.GLType).filter(fin_models.GLType.id == gl_type_id, fin_models.GLType.is_active == True).first()
    if not gl_type:
        raise HTTPException(status_code=404, detail="GL Type not found or inactive")
    parent_code = gl_type.type_code if gl_type.type_code else "XXXX"
    alpha = "".join(c for c in sub_type_name.strip().upper() if c.isalpha())
    sub_base = (alpha[:4]).ljust(4, "X")
    counter = 1
    while True:
        sub_type_code = f"{parent_code}-{sub_base}-{counter:04d}"
        if not db.query(fin_models.GLSubType).filter(fin_models.GLSubType.sub_type_code == sub_type_code).first():
            break
        counter += 1
    if db.query(fin_models.GLSubType).filter(fin_models.GLSubType.sub_type_name == sub_type_name).first():
        raise HTTPException(status_code=400, detail="GL Sub-Type name already exists")
    gl_sub_type = fin_models.GLSubType(
        sub_type_code=sub_type_code, sub_type_name=sub_type_name, gl_type_id=gl_type_id,
        description=description.strip() if description else None,
        display_order=display_order if display_order is not None else auto_display_order(db),
        created_by=user_id
    )
    db.add(gl_sub_type); db.commit(); db.refresh(gl_sub_type)
    return schemas.GLSubTypeResponse(
        id=gl_sub_type.id, sub_type_code=gl_sub_type.sub_type_code, sub_type_name=gl_sub_type.sub_type_name,
        description=gl_sub_type.description, gl_type_id=gl_sub_type.gl_type_id,
        display_order=gl_sub_type.display_order, is_active=gl_sub_type.is_active,
        created_at=gl_sub_type.created_at, gl_type_code=gl_type.type_code, gl_type_name=gl_type.type_name,
    )


@router.put("/gl-sub-types/{sub_type_id}", response_model=schemas.GLSubTypeResponse)
async def update_gl_sub_type(
    sub_type_id: int,
    sub_type_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    gl_type_id: Optional[int] = Form(None),
    display_order: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    gl_sub_type = db.query(fin_models.GLSubType).filter(fin_models.GLSubType.id == sub_type_id).first()
    if not gl_sub_type:
        raise HTTPException(status_code=404, detail="GL Sub-Type not found")
    if sub_type_name:
        sub_type_name = capitalize_properly(sub_type_name)
        existing = db.query(fin_models.GLSubType).filter(fin_models.GLSubType.sub_type_name == sub_type_name, fin_models.GLSubType.id != sub_type_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="GL Sub-Type name already exists")
        gl_sub_type.sub_type_name = sub_type_name
    if gl_type_id is not None:
        gl_type = db.query(fin_models.GLType).filter(fin_models.GLType.id == gl_type_id).first()
        if not gl_type:
            raise HTTPException(status_code=404, detail="GL Type not found")
        gl_sub_type.gl_type_id = gl_type_id
    if description is not None:
        gl_sub_type.description = description.strip() if description else None
    if display_order is not None:
        gl_sub_type.display_order = display_order
    if is_active is not None:
        gl_sub_type.is_active = is_active
    gl_sub_type.updated_by = user_id
    db.commit(); db.refresh(gl_sub_type)
    return schemas.GLSubTypeResponse(
        id=gl_sub_type.id, sub_type_code=gl_sub_type.sub_type_code, sub_type_name=gl_sub_type.sub_type_name,
        description=gl_sub_type.description, gl_type_id=gl_sub_type.gl_type_id,
        display_order=gl_sub_type.display_order, is_active=gl_sub_type.is_active,
        created_at=gl_sub_type.created_at,
        gl_type_code=gl_sub_type.gl_type.type_code if gl_sub_type.gl_type else None,
        gl_type_name=gl_sub_type.gl_type.type_name if gl_sub_type.gl_type else None,
    )


# ==================== BULK CREATE ====================

@router.post("/gl-bulk-create", response_model=schemas.BulkCreateResponse)
async def bulk_create_gl_types_and_subtypes(payload: schemas.BulkCreateRequest, db: Session = Depends(get_db)):
    created_types, created_sub_types, errors = [], [], []
    for item in (payload.gl_types or []):
        try:
            type_name = capitalize_properly(item.type_name)
            if db.query(fin_models.GLType).filter(fin_models.GLType.type_name == type_name).first():
                errors.append({"entity": "gl_type", "name": type_name, "reason": "Name already exists"}); continue
            type_code = generate_type_code(type_name, db, fin_models.GLType, "type_code")
            gl_type = fin_models.GLType(type_code=type_code, type_name=type_name, description=item.description, created_by=payload.user_id)
            db.add(gl_type); db.flush()
            created_types.append({"id": gl_type.id, "type_code": gl_type.type_code, "type_name": gl_type.type_name, "description": gl_type.description})
        except Exception as e:
            errors.append({"entity": "gl_type", "name": item.type_name, "reason": str(e)})
    for item in (payload.gl_sub_types or []):
        try:
            sub_type_name = capitalize_properly(item.sub_type_name)
            gl_type = db.query(fin_models.GLType).filter(fin_models.GLType.id == item.gl_type_id).first()
            if not gl_type:
                errors.append({"entity": "gl_sub_type", "name": sub_type_name, "reason": f"GL Type id={item.gl_type_id} not found"}); continue
            if db.query(fin_models.GLSubType).filter(fin_models.GLSubType.sub_type_name == sub_type_name).first():
                errors.append({"entity": "gl_sub_type", "name": sub_type_name, "reason": "Name already exists"}); continue
            type_prefix = gl_type.type_code[:2] if gl_type.type_code else ""
            sub_type_code = generate_type_code(sub_type_name, db, fin_models.GLSubType, "sub_type_code", prefix=f"{type_prefix}-" if type_prefix else "")
            gl_sub_type = fin_models.GLSubType(
                sub_type_code=sub_type_code, sub_type_name=sub_type_name, gl_type_id=item.gl_type_id,
                description=item.description, display_order=item.display_order if item.display_order is not None else auto_display_order(db),
                created_by=payload.user_id
            )
            db.add(gl_sub_type); db.flush()
            created_sub_types.append({"id": gl_sub_type.id, "sub_type_code": gl_sub_type.sub_type_code, "sub_type_name": gl_sub_type.sub_type_name, "gl_type_id": gl_sub_type.gl_type_id, "gl_type_name": gl_type.type_name, "description": gl_sub_type.description})
        except Exception as e:
            errors.append({"entity": "gl_sub_type", "name": item.sub_type_name, "reason": str(e)})
    db.commit()
    return schemas.BulkCreateResponse(created_types=created_types, created_sub_types=created_sub_types, errors=errors, total_types_created=len(created_types), total_sub_types_created=len(created_sub_types), total_errors=len(errors))


@router.get("/gl-preview-code")
async def preview_auto_code(name: str = Query(...), entity: str = Query(...), db: Session = Depends(get_db)):
    if entity == "type":
        code = generate_type_code(name, db, fin_models.GLType, "type_code")
    elif entity == "sub_type":
        code = generate_type_code(name, db, fin_models.GLSubType, "sub_type_code")
    else:
        raise HTTPException(status_code=400, detail="entity must be 'type' or 'sub_type'")
    return {"name": name, "preview_code": code}


# ==================== GL CATEGORY MASTER ENDPOINTS ====================

@router.get("/gl-categories", response_model=List[schemas.GLCategoryResponse])
async def get_gl_categories(
    is_active: Optional[bool] = Query(None),
    gl_type_id: Optional[int] = Query(None),
    gl_sub_type_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(fin_models.GLCategory).options(joinedload(fin_models.GLCategory.gl_type), joinedload(fin_models.GLCategory.gl_sub_type))
    if is_active is not None:
        query = query.filter(fin_models.GLCategory.is_active == is_active)
    if gl_type_id is not None:
        query = query.filter(fin_models.GLCategory.gl_type_id == gl_type_id)
    if gl_sub_type_id is not None:
        query = query.filter(fin_models.GLCategory.gl_sub_type_id == gl_sub_type_id)
    categories = query.order_by(fin_models.GLCategory.category_name).all()
    result = []
    for cat in categories:
        result.append(schemas.GLCategoryResponse(
            id=cat.id, category_code=cat.category_code, category_name=cat.category_name,
            description=cat.description, gl_type_id=cat.gl_type_id, gl_sub_type_id=cat.gl_sub_type_id,
            gl_type_code=cat.gl_type.type_code if cat.gl_type else None,
            gl_type_name=cat.gl_type.type_name if cat.gl_type else None,
            gl_sub_type_code=cat.gl_sub_type.sub_type_code if cat.gl_sub_type else None,
            gl_sub_type_name=cat.gl_sub_type.sub_type_name if cat.gl_sub_type else None,
            is_active=cat.is_active, created_at=cat.created_at
        ))
    return result


@router.post("/gl-categories", response_model=schemas.GLCategoryResponse)
async def create_gl_category(
    category_name: str = Form(...),
    gl_type_id: int = Form(...),
    gl_sub_type_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    category_name = capitalize_properly(category_name)
    gl_type = db.query(fin_models.GLType).filter(fin_models.GLType.id == gl_type_id, fin_models.GLType.is_active == True).first()
    if not gl_type:
        raise HTTPException(status_code=404, detail="GL Type not found or inactive")
    gl_sub_type = None
    if gl_sub_type_id:
        gl_sub_type = db.query(fin_models.GLSubType).filter(fin_models.GLSubType.id == gl_sub_type_id).first()
        if not gl_sub_type:
            raise HTTPException(status_code=404, detail="GL Sub-Type not found")
    parent_code = gl_sub_type.sub_type_code if gl_sub_type else gl_type.type_code
    alpha = "".join(c for c in category_name.strip().upper() if c.isalpha())
    cat_base = (alpha[:4]).ljust(4, "X")
    counter = 1
    while True:
        category_code = f"{parent_code}-{cat_base}-{counter:04d}"
        if not db.query(fin_models.GLCategory).filter(fin_models.GLCategory.category_code == category_code).first():
            break
        counter += 1
    if db.query(fin_models.GLCategory).filter(fin_models.GLCategory.category_name == category_name).first():
        raise HTTPException(status_code=400, detail="GL Category name already exists")
    gl_category = fin_models.GLCategory(
        category_code=category_code, category_name=category_name, gl_type_id=gl_type_id,
        gl_sub_type_id=gl_sub_type_id, description=description.strip() if description else None, created_by=user_id
    )
    db.add(gl_category); db.commit(); db.refresh(gl_category)
    return schemas.GLCategoryResponse(
        id=gl_category.id, category_code=gl_category.category_code, category_name=gl_category.category_name,
        description=gl_category.description, gl_type_id=gl_category.gl_type_id, gl_sub_type_id=gl_category.gl_sub_type_id,
        gl_type_code=gl_type.type_code, gl_type_name=gl_type.type_name,
        gl_sub_type_code=gl_sub_type.sub_type_code if gl_sub_type else None,
        gl_sub_type_name=gl_sub_type.sub_type_name if gl_sub_type else None,
        is_active=gl_category.is_active, created_at=gl_category.created_at
    )


@router.put("/gl-categories/{category_id}", response_model=schemas.GLCategoryResponse)
async def update_gl_category(
    category_id: int,
    category_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    gl_sub_type_id: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    gl_category = db.query(fin_models.GLCategory).filter(fin_models.GLCategory.id == category_id).first()
    if not gl_category:
        raise HTTPException(status_code=404, detail="GL Category not found")
    if category_name:
        category_name = capitalize_properly(category_name)
        existing = db.query(fin_models.GLCategory).filter(fin_models.GLCategory.category_name == category_name, fin_models.GLCategory.id != category_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="GL Category name already exists")
        gl_category.category_name = category_name
    if description is not None:
        gl_category.description = description.strip() if description else None
    if gl_sub_type_id is not None:
        gl_category.gl_sub_type_id = gl_sub_type_id
    if is_active is not None:
        gl_category.is_active = is_active
    gl_category.updated_by = user_id
    db.commit(); db.refresh(gl_category)
    return gl_category


# ==================== GL SUB CATEGORY MASTER ENDPOINTS ====================

@router.get("/gl-sub-categories", response_model=List[schemas.GLSubCategoryResponse])
async def get_gl_sub_categories(
    is_active: Optional[bool] = Query(None),
    gl_type_id: Optional[int] = Query(None),
    gl_sub_type_id: Optional[int] = Query(None),
    gl_category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(fin_models.GLSubCategory).options(
        joinedload(fin_models.GLSubCategory.gl_type), joinedload(fin_models.GLSubCategory.gl_sub_type),
        joinedload(fin_models.GLSubCategory.gl_category),
    )
    if is_active is not None:
        query = query.filter(fin_models.GLSubCategory.is_active == is_active)
    if gl_type_id is not None:
        query = query.filter(fin_models.GLSubCategory.gl_type_id == gl_type_id)
    if gl_sub_type_id is not None:
        query = query.filter(fin_models.GLSubCategory.gl_sub_type_id == gl_sub_type_id)
    if gl_category_id is not None:
        query = query.filter(fin_models.GLSubCategory.gl_category_id == gl_category_id)
    items = query.order_by(fin_models.GLSubCategory.sub_category_name).all()
    result = []
    for sc in items:
        result.append(schemas.GLSubCategoryResponse(
            id=sc.id, sub_category_code=sc.sub_category_code, sub_category_name=sc.sub_category_name,
            description=sc.description, gl_type_id=sc.gl_type_id, gl_sub_type_id=sc.gl_sub_type_id,
            gl_category_id=sc.gl_category_id, is_active=sc.is_active, created_at=sc.created_at,
            gl_type_code=sc.gl_type.type_code if sc.gl_type else None, gl_type_name=sc.gl_type.type_name if sc.gl_type else None,
            gl_sub_type_code=sc.gl_sub_type.sub_type_code if sc.gl_sub_type else None, gl_sub_type_name=sc.gl_sub_type.sub_type_name if sc.gl_sub_type else None,
            gl_category_code=sc.gl_category.category_code if sc.gl_category else None, gl_category_name=sc.gl_category.category_name if sc.gl_category else None,
        ))
    return result


@router.post("/gl-sub-categories", response_model=schemas.GLSubCategoryResponse)
async def create_gl_sub_category(
    sub_category_name: str = Form(...),
    gl_category_id: int = Form(...),
    gl_type_id: int = Form(...),
    gl_sub_type_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    sub_category_name = capitalize_properly(sub_category_name)
    gl_category = db.query(fin_models.GLCategory).filter(fin_models.GLCategory.id == gl_category_id).first()
    if not gl_category:
        raise HTTPException(status_code=404, detail="GL Category not found")
    gl_type = db.query(fin_models.GLType).filter(fin_models.GLType.id == gl_type_id).first()
    if not gl_type:
        raise HTTPException(status_code=404, detail="GL Type not found")
    gl_sub_type = None
    if gl_sub_type_id:
        gl_sub_type = db.query(fin_models.GLSubType).filter(fin_models.GLSubType.id == gl_sub_type_id).first()
        if not gl_sub_type:
            raise HTTPException(status_code=404, detail="GL Sub-Type not found")
    alpha = "".join(c for c in sub_category_name.strip().upper() if c.isalpha())
    sc_base = (alpha[:4]).ljust(4, "X")
    counter = 1
    while True:
        sub_category_code = f"{gl_category.category_code}-{sc_base}-{counter:04d}"
        if not db.query(fin_models.GLSubCategory).filter(fin_models.GLSubCategory.sub_category_code == sub_category_code).first():
            break
        counter += 1
    if db.query(fin_models.GLSubCategory).filter(fin_models.GLSubCategory.sub_category_name == sub_category_name).first():
        raise HTTPException(status_code=400, detail="GL Sub-Category name already exists")
    sc = fin_models.GLSubCategory(
        sub_category_code=sub_category_code, sub_category_name=sub_category_name,
        gl_type_id=gl_type_id, gl_sub_type_id=gl_sub_type_id, gl_category_id=gl_category_id,
        description=description.strip() if description else None, created_by=user_id,
    )
    db.add(sc); db.commit(); db.refresh(sc)
    return schemas.GLSubCategoryResponse(
        id=sc.id, sub_category_code=sc.sub_category_code, sub_category_name=sc.sub_category_name,
        description=sc.description, gl_type_id=sc.gl_type_id, gl_sub_type_id=sc.gl_sub_type_id,
        gl_category_id=sc.gl_category_id, is_active=sc.is_active, created_at=sc.created_at,
        gl_type_code=gl_type.type_code, gl_type_name=gl_type.type_name,
        gl_sub_type_code=gl_sub_type.sub_type_code if gl_sub_type else None, gl_sub_type_name=gl_sub_type.sub_type_name if gl_sub_type else None,
        gl_category_code=gl_category.category_code, gl_category_name=gl_category.category_name,
    )


# ==================== GL HEAD MASTER ENDPOINTS ====================
# Hierarchy Level 5: Type → SubType → Category → SubCategory → GL HEAD

@router.get("/gl-heads")
async def get_gl_heads(
    is_active: Optional[bool] = Query(None),
    gl_type_id: Optional[int] = Query(None),
    gl_sub_type_id: Optional[int] = Query(None),
    gl_category_id: Optional[int] = Query(None),
    gl_sub_category_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get all GL Heads — Account Heads (Level 5 in hierarchy)"""
    query = db.query(fin_models.GLHead).options(
        joinedload(fin_models.GLHead.gl_type),
        joinedload(fin_models.GLHead.gl_sub_type),
        joinedload(fin_models.GLHead.gl_category),
        joinedload(fin_models.GLHead.gl_sub_category),
    )
    if is_active is not None:
        query = query.filter(fin_models.GLHead.is_active == is_active)
    if gl_type_id is not None:
        query = query.filter(fin_models.GLHead.gl_type_id == gl_type_id)
    if gl_sub_type_id is not None:
        query = query.filter(fin_models.GLHead.gl_sub_type_id == gl_sub_type_id)
    if gl_category_id is not None:
        query = query.filter(fin_models.GLHead.gl_category_id == gl_category_id)
    if gl_sub_category_id is not None:
        query = query.filter(fin_models.GLHead.gl_sub_category_id == gl_sub_category_id)

    items = query.order_by(fin_models.GLHead.gl_head_name).all()
    result = []
    for h in items:
        result.append({
            "id": h.id,
            "gl_head_code": h.gl_head_code,
            "gl_head_name": h.gl_head_name,
            "description": h.description,
            "gl_type_id": h.gl_type_id,
            "gl_sub_type_id": h.gl_sub_type_id,
            "gl_category_id": h.gl_category_id,
            "gl_sub_category_id": h.gl_sub_category_id,
            "is_active": h.is_active,
            "created_at": h.created_at,
            "gl_type_code": h.gl_type.type_code if h.gl_type else None,
            "gl_type_name": h.gl_type.type_name if h.gl_type else None,
            "gl_sub_type_code": h.gl_sub_type.sub_type_code if h.gl_sub_type else None,
            "gl_sub_type_name": h.gl_sub_type.sub_type_name if h.gl_sub_type else None,
            "gl_category_code": h.gl_category.category_code if h.gl_category else None,
            "gl_category_name": h.gl_category.category_name if h.gl_category else None,
            "gl_sub_category_code": h.gl_sub_category.sub_category_code if h.gl_sub_category else None,
            "gl_sub_category_name": h.gl_sub_category.sub_category_name if h.gl_sub_category else None,
        })
    return result


@router.post("/gl-heads")
async def create_gl_head(
    gl_head_name: str = Form(...),
    gl_sub_category_id: int = Form(...),
    gl_category_id: int = Form(...),
    gl_type_id: int = Form(...),
    gl_sub_type_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Create GL Head — code auto-generated as SUBCATEGORY_CODE-GHXX-0001"""
    gl_head_name = capitalize_properly(gl_head_name)

    gl_sub_category = db.query(fin_models.GLSubCategory).filter(fin_models.GLSubCategory.id == gl_sub_category_id).first()
    if not gl_sub_category:
        raise HTTPException(status_code=404, detail="GL Sub-Category not found")
    gl_category = db.query(fin_models.GLCategory).filter(fin_models.GLCategory.id == gl_category_id).first()
    if not gl_category:
        raise HTTPException(status_code=404, detail="GL Category not found")
    gl_type = db.query(fin_models.GLType).filter(fin_models.GLType.id == gl_type_id).first()
    if not gl_type:
        raise HTTPException(status_code=404, detail="GL Type not found")
    gl_sub_type = None
    if gl_sub_type_id:
        gl_sub_type = db.query(fin_models.GLSubType).filter(fin_models.GLSubType.id == gl_sub_type_id).first()

    # Auto-generate code: SUBCATEGORY_CODE-GHXX-0001
    alpha = "".join(c for c in gl_head_name.strip().upper() if c.isalpha())
    gh_base = (alpha[:4]).ljust(4, "X")
    counter = 1
    while True:
        gl_head_code = f"{gl_sub_category.sub_category_code}-{gh_base}-{counter:04d}"
        if not db.query(fin_models.GLHead).filter(fin_models.GLHead.gl_head_code == gl_head_code).first():
            break
        counter += 1

    if db.query(fin_models.GLHead).filter(fin_models.GLHead.gl_head_name == gl_head_name).first():
        raise HTTPException(status_code=400, detail="GL Head name already exists")

    gl_head = fin_models.GLHead(
        gl_head_code=gl_head_code, gl_head_name=gl_head_name,
        gl_type_id=gl_type_id, gl_sub_type_id=gl_sub_type_id,
        gl_category_id=gl_category_id, gl_sub_category_id=gl_sub_category_id,
        description=description.strip() if description else None, created_by=user_id,
    )
    db.add(gl_head); db.commit(); db.refresh(gl_head)

    return {
        "id": gl_head.id,
        "gl_head_code": gl_head.gl_head_code,
        "gl_head_name": gl_head.gl_head_name,
        "description": gl_head.description,
        "gl_type_id": gl_head.gl_type_id,
        "gl_sub_type_id": gl_head.gl_sub_type_id,
        "gl_category_id": gl_head.gl_category_id,
        "gl_sub_category_id": gl_head.gl_sub_category_id,
        "is_active": gl_head.is_active,
        "created_at": gl_head.created_at,
        "gl_type_code": gl_type.type_code,
        "gl_type_name": gl_type.type_name,
        "gl_sub_type_code": gl_sub_type.sub_type_code if gl_sub_type else None,
        "gl_sub_type_name": gl_sub_type.sub_type_name if gl_sub_type else None,
        "gl_category_code": gl_category.category_code,
        "gl_category_name": gl_category.category_name,
        "gl_sub_category_code": gl_sub_category.sub_category_code,
        "gl_sub_category_name": gl_sub_category.sub_category_name,
    }


@router.put("/gl-heads/{gl_head_id}")
async def update_gl_head(
    gl_head_id: int,
    gl_head_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Update GL Head"""
    gl_head = db.query(fin_models.GLHead).filter(fin_models.GLHead.id == gl_head_id).first()
    if not gl_head:
        raise HTTPException(status_code=404, detail="GL Head not found")
    if gl_head_name:
        gl_head_name = capitalize_properly(gl_head_name)
        existing = db.query(fin_models.GLHead).filter(fin_models.GLHead.gl_head_name == gl_head_name, fin_models.GLHead.id != gl_head_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="GL Head name already exists")
        gl_head.gl_head_name = gl_head_name
    if description is not None:
        gl_head.description = description.strip() if description else None
    if is_active is not None:
        gl_head.is_active = is_active
    gl_head.updated_by = user_id
    db.commit(); db.refresh(gl_head)
    return {"message": "GL Head updated successfully", "id": gl_head.id, "gl_head_code": gl_head.gl_head_code, "gl_head_name": gl_head.gl_head_name}


# ==================== GL MASTER ENDPOINTS ====================

@router.get("/user/{user_id}/companies-with-plants")
async def get_user_companies_with_plants(user_id: int, db: Session = Depends(get_db)):
    accesses = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id
    ).options(joinedload(user_models.UserCompanyAccess.company), joinedload(user_models.UserCompanyAccess.plant)).all()
    companies_dict = {}
    for access in accesses:
        company_id = access.company_id
        if company_id not in companies_dict:
            companies_dict[company_id] = {"company_id": company_id, "company_name": access.company.company_name, "company_code": access.company.company_code, "plants": []}
        if access.plant_id and access.plant:
            plant_exists = any(p["plant_id"] == access.plant_id for p in companies_dict[company_id]["plants"])
            if not plant_exists:
                companies_dict[company_id]["plants"].append({"plant_id": access.plant_id, "plant_name": access.plant.plant_name, "plant_code": access.plant.plant_code})
    return {"companies": list(companies_dict.values())}


@router.post("/gl-accounts", response_model=dict)
async def create_gl_account(
    gl_name: str = Form(...),
    company_id: int = Form(...),
    gl_type_id: int = Form(...),
    gl_code: Optional[str] = Form(None),
    plant_id: Optional[int] = Form(None),
    gl_sub_type_id: Optional[int] = Form(None),
    gl_category_id: Optional[int] = Form(None),
    gl_sub_category_id: Optional[int] = Form(None),
    gl_head_id: Optional[int] = Form(None),
    parent_gl_id: Optional[int] = Form(None),
    is_postable: bool = Form(True),
    currency_code: Optional[str] = Form(None),
    remarks: Optional[str] = Form(None),
    user_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Create new GL Account — gl_code is optional; auto-generated as COMPANY_CODE-GLXXXX-0001 if blank"""
    gl_name = capitalize_properly(gl_name)

    if not check_user_company_access(db, user_id, company_id):
        raise HTTPException(status_code=403, detail="No access to this company")
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    plant = None
    if plant_id:
        plant = db.query(models.Plant).filter(models.Plant.id == plant_id, models.Plant.company_id == company_id).first()
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found or doesn't belong to company")
    gl_type = db.query(fin_models.GLType).filter(fin_models.GLType.id == gl_type_id).first()
    if not gl_type:
        raise HTTPException(status_code=404, detail="GL Type not found")
    if gl_category_id:
        if not db.query(fin_models.GLCategory).filter(fin_models.GLCategory.id == gl_category_id).first():
            raise HTTPException(status_code=404, detail="GL Category not found")
    if gl_head_id:
        if not db.query(fin_models.GLHead).filter(fin_models.GLHead.id == gl_head_id).first():
            raise HTTPException(status_code=404, detail="GL Head not found")

    # ── Auto-generate GL Code if not provided ──────────────────────────────
    if gl_code and gl_code.strip():
        gl_code = gl_code.strip().upper()
    else:
        # Pattern: COMPANY_CODE-GLXXXX-0001  (XXXX = first 4 alpha chars of gl_name)
        comp_code = (company.company_code or "CO").upper()
        alpha = "".join(c for c in gl_name.upper() if c.isalpha())
        name_base = (alpha[:4]).ljust(4, "X")
        prefix = f"{comp_code}-GL{name_base}-"
        counter = 1
        while True:
            candidate = f"{prefix}{counter:04d}"
            if not db.query(fin_models.GLMaster).filter(
                fin_models.GLMaster.company_id == company_id,
                fin_models.GLMaster.gl_code == candidate
            ).first():
                gl_code = candidate
                break
            counter += 1

    existing = db.query(fin_models.GLMaster).filter(fin_models.GLMaster.company_id == company_id, fin_models.GLMaster.gl_code == gl_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"GL Code '{gl_code}' already exists for this company")

    gl_account = fin_models.GLMaster(
        company_id=company_id, plant_id=plant_id, gl_code=gl_code, gl_name=gl_name,
        gl_type_id=gl_type_id, gl_sub_type_id=gl_sub_type_id, gl_category_id=gl_category_id,
        parent_gl_id=parent_gl_id, is_postable=is_postable,
        currency_code=currency_code.strip().upper() if currency_code else None,
        remarks=remarks.strip() if remarks else None, created_by=user_id
    )
    # Only assign new columns if they exist in the actual DB table
    if _has_col(db, "gl_sub_category_id") and gl_sub_category_id:
        gl_account.gl_sub_category_id = gl_sub_category_id
    if _has_col(db, "gl_head_id") and gl_head_id:
        gl_account.gl_head_id = gl_head_id
    db.add(gl_account); db.commit(); db.refresh(gl_account)
    scope = "Company-wide" if not plant_id else f"Plant: {plant.plant_name if plant else ''}"
    return {"message": "GL Account created successfully", "gl_id": gl_account.id, "gl_code": gl_account.gl_code, "gl_name": gl_account.gl_name, "company_name": company.company_name, "scope": scope}


@router.get("/gl-accounts/by-user/{user_id}")
async def get_gl_accounts_by_user(
    user_id: int,
    company_id: Optional[int] = Query(None),
    plant_id: Optional[int] = Query(None),
    gl_type_id: Optional[int] = Query(None),
    gl_sub_type_id: Optional[int] = Query(None),
    is_postable: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    accessible_companies = get_user_accessible_companies(db, user_id)
    accessible_plants = get_user_accessible_plants(db, user_id)
    if not accessible_companies:
        return {"gl_accounts": [], "total": 0}

    # Only joinedload new columns if they actually exist in the DB table
    _has_head    = _has_col(db, "gl_head_id")
    _has_sub_cat = _has_col(db, "gl_sub_category_id")

    eager_loads = [
        joinedload(fin_models.GLMaster.company),
        joinedload(fin_models.GLMaster.plant),
        joinedload(fin_models.GLMaster.gl_type),
        joinedload(fin_models.GLMaster.gl_sub_type),
        joinedload(fin_models.GLMaster.gl_category),
        joinedload(fin_models.GLMaster.parent_gl),
    ]
    if _has_sub_cat:
        eager_loads.append(joinedload(fin_models.GLMaster.gl_sub_category))
    if _has_head:
        eager_loads.append(joinedload(fin_models.GLMaster.gl_head))

    query = db.query(fin_models.GLMaster).filter(
        or_(
            and_(fin_models.GLMaster.company_id.in_(accessible_companies), fin_models.GLMaster.plant_id.is_(None)),
            fin_models.GLMaster.plant_id.in_(accessible_plants) if accessible_plants else False
        )
    ).options(*eager_loads)
    if company_id:
        query = query.filter(fin_models.GLMaster.company_id == company_id)
    if plant_id:
        query = query.filter(or_(fin_models.GLMaster.plant_id == plant_id, fin_models.GLMaster.plant_id.is_(None)))
    if gl_type_id:
        query = query.filter(fin_models.GLMaster.gl_type_id == gl_type_id)
    if gl_sub_type_id:
        query = query.filter(fin_models.GLMaster.gl_sub_type_id == gl_sub_type_id)
    if is_postable is not None:
        query = query.filter(fin_models.GLMaster.is_postable == is_postable)
    if search:
        query = query.filter(or_(fin_models.GLMaster.gl_code.ilike(f"%{search}%"), fin_models.GLMaster.gl_name.ilike(f"%{search}%")))

    gl_accounts = query.order_by(fin_models.GLMaster.gl_code).all()
    result = []
    for gl in gl_accounts:
        child_count = db.query(func.count(fin_models.GLMaster.id)).filter(fin_models.GLMaster.parent_gl_id == gl.id).scalar()

        # Safe access — only read new columns if they exist
        gl_head_data = None
        if _has_head:
            try:
                gl_head_data = {"id": gl.gl_head.id, "gl_head_code": gl.gl_head.gl_head_code, "gl_head_name": gl.gl_head.gl_head_name} if gl.gl_head else None
            except Exception:
                pass

        gl_sub_cat_data = None
        if _has_sub_cat:
            try:
                gl_sub_cat_data = {"id": gl.gl_sub_category.id, "sub_category_code": gl.gl_sub_category.sub_category_code, "sub_category_name": gl.gl_sub_category.sub_category_name} if gl.gl_sub_category else None
            except Exception:
                pass

        result.append({
            "id": gl.id, "gl_code": gl.gl_code, "gl_name": gl.gl_name,
            "company": {"id": gl.company.id, "name": gl.company.company_name, "code": gl.company.company_code},
            "plant": {"id": gl.plant.id, "name": gl.plant.plant_name, "code": gl.plant.plant_code} if gl.plant else None,
            "gl_type": {"id": gl.gl_type.id, "type_code": gl.gl_type.type_code, "type_name": gl.gl_type.type_name},
            "gl_sub_type": {"id": gl.gl_sub_type.id, "sub_type_code": gl.gl_sub_type.sub_type_code, "sub_type_name": gl.gl_sub_type.sub_type_name} if gl.gl_sub_type else None,
            "gl_category": {"id": gl.gl_category.id, "category_code": gl.gl_category.category_code, "category_name": gl.gl_category.category_name} if gl.gl_category else None,
            "gl_sub_category": gl_sub_cat_data,
            "gl_head": gl_head_data,
            "parent_gl": {"id": gl.parent_gl.id, "gl_code": gl.parent_gl.gl_code, "gl_name": gl.parent_gl.gl_name} if gl.parent_gl else None,
            "is_postable": gl.is_postable, "currency_code": gl.currency_code,
            "scope": "Company-wide" if not gl.plant_id else "Plant-specific",
            "child_count": child_count, "is_active": gl.is_active, "created_at": gl.created_at
        })
    return {"gl_accounts": result, "total": len(result)}


@router.put("/gl-accounts/{gl_id}")
async def update_gl_account(
    gl_id: int,
    gl_name: Optional[str] = Form(None),
    gl_sub_type_id: Optional[int] = Form(None),
    gl_category_id: Optional[int] = Form(None),
    gl_sub_category_id: Optional[int] = Form(None),
    gl_head_id: Optional[int] = Form(None),
    is_postable: Optional[bool] = Form(None),
    currency_code: Optional[str] = Form(None),
    remarks: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    user_id: int = Form(...),
    reason: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    gl = db.query(fin_models.GLMaster).filter(fin_models.GLMaster.id == gl_id).first()
    if not gl:
        raise HTTPException(status_code=404, detail="GL Account not found")
    if not check_user_company_access(db, user_id, gl.company_id):
        raise HTTPException(status_code=403, detail="No access to this GL Account")
    if gl_name and gl_name.strip() != gl.gl_name:
        db.add(fin_models.GLNameHistory(gl_id=gl_id, old_name=gl.gl_name, new_name=capitalize_properly(gl_name), changed_by=user_id, reason=reason))
        gl.gl_name = capitalize_properly(gl_name)
    if is_active is not None and is_active != gl.is_active:
        db.add(fin_models.GLStatusHistory(gl_id=gl_id, old_status=gl.is_active, new_status=is_active, changed_by=user_id, reason=reason))
        gl.is_active = is_active
    if gl_sub_type_id is not None:
        gl.gl_sub_type_id = gl_sub_type_id
    if gl_category_id is not None:
        gl.gl_category_id = gl_category_id
    if gl_sub_category_id is not None and _has_col(db, "gl_sub_category_id"):
        gl.gl_sub_category_id = gl_sub_category_id
    if gl_head_id is not None and _has_col(db, "gl_head_id"):
        gl.gl_head_id = gl_head_id
    if is_postable is not None:
        gl.is_postable = is_postable
    if currency_code is not None:
        gl.currency_code = currency_code.strip().upper() if currency_code else None
    if remarks is not None:
        gl.remarks = remarks.strip() if remarks else None
    gl.updated_by = user_id
    db.commit(); db.refresh(gl)
    return {"message": "GL Account updated successfully", "gl_id": gl.id, "gl_code": gl.gl_code, "gl_name": gl.gl_name}


@router.get("/gl-accounts/{gl_id}/history")
async def get_gl_account_history(gl_id: int, db: Session = Depends(get_db)):
    gl = db.query(fin_models.GLMaster).filter(fin_models.GLMaster.id == gl_id).first()
    if not gl:
        raise HTTPException(status_code=404, detail="GL Account not found")
    name_history = db.query(fin_models.GLNameHistory).filter(fin_models.GLNameHistory.gl_id == gl_id).order_by(fin_models.GLNameHistory.changed_at.desc()).all()
    status_history = db.query(fin_models.GLStatusHistory).filter(fin_models.GLStatusHistory.gl_id == gl_id).order_by(fin_models.GLStatusHistory.changed_at.desc()).all()
    return {
        "gl_id": gl_id, "gl_code": gl.gl_code, "current_name": gl.gl_name, "current_status": gl.is_active,
        "name_changes": [{"old_name": h.old_name, "new_name": h.new_name, "changed_at": h.changed_at, "reason": h.reason} for h in name_history],
        "status_changes": [{"old_status": "Active" if h.old_status else "Inactive", "new_status": "Active" if h.new_status else "Inactive", "changed_at": h.changed_at, "reason": h.reason} for h in status_history]
    }