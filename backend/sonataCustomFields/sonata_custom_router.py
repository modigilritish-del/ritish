"""sonataCustomFields/sonata_custom_router.py - Item Capacity & Item Grade API Routes"""
from fastapi import APIRouter, HTTPException, Depends, Form, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
import re

from database import get_db
import db_models as models
from sonataCustomFields import sonata_custom_models as sc
from user import user_models

router = APIRouter()


# ==================== UTILITIES ====================

def get_user_accessible_companies(db: Session, user_id: int) -> List[int]:
    query = db.query(user_models.UserCompanyAccess.company_id).filter(
        user_models.UserCompanyAccess.user_id == user_id
    ).distinct()
    return [cid for (cid,) in query.all() if cid]


def get_user_accessible_plants(db: Session, user_id: int, company_ids: List[int] = None) -> List[int]:
    query = db.query(user_models.UserCompanyAccess.plant_id).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.plant_id.isnot(None)
    )
    if company_ids:
        query = query.filter(user_models.UserCompanyAccess.company_id.in_(company_ids))
    return [pid for (pid,) in query.distinct().all() if pid]


def check_company_access(db: Session, user_id: int, company_id: int) -> bool:
    return db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == company_id
    ).first() is not None


def capitalize_properly(name: str) -> str:
    return ' '.join(w.capitalize() for w in name.strip().split())


def generate_code(name: str, slug: str, model, db: Session) -> str:
    """
    Auto-generate code: {SLUG}-{XXXX}-{0001}
    slug = 'CAP' for capacity, 'GRD' for grade
    XXXX = first 4 alpha chars of name
    """
    alpha = re.sub(r'[^a-zA-Z]', '', name.strip().upper())
    base4 = (alpha[:4]).ljust(4, 'X')
    prefix = f"{slug}-{base4}"
    counter = 1
    while True:
        candidate = f"{prefix}-{counter:04d}"
        exists = db.query(model).filter(model.code == candidate).first()
        if not exists:
            return candidate
        counter += 1


def build_record_response(r, company_model, plant_model) -> dict:
    return {
        "id":           r.id,
        "code":         r.code,
        "name":         r.name,
        "description":  r.description,
        "is_active":    r.is_active,
        "companies": [
            {"id": c.company.id, "code": c.company.company_code, "name": c.company.company_name}
            for c in r.companies if c.company
        ],
        "plants": [
            {"id": p.plant.id, "code": p.plant.plant_code, "name": p.plant.plant_name}
            for p in r.plants if p.plant
        ],
        "created_by":      r.created_by,
        "created_by_name": f"{r.creator.full_name}" if r.creator else None,
        "updated_by":      r.updated_by,
        "updated_by_name": f"{r.updater.full_name}" if r.updater else None,
        "created_at":      r.created_at,
        "updated_at":      r.updated_at,
    }


# ==================== ITEM CAPACITY ====================

@router.get("/sonata-item-capacity/by-user/{user_id}")
async def get_item_capacities(
    user_id:    int,
    company_id: Optional[int]  = Query(None),
    plant_id:   Optional[int]  = Query(None),
    is_active:  Optional[bool] = Query(None),
    search:     Optional[str]  = Query(None),
    db: Session = Depends(get_db)
):
    """Get all Item Capacities accessible to user"""
    accessible_companies = get_user_accessible_companies(db, user_id)
    if not accessible_companies:
        return {"data": [], "total": 0}

    query = db.query(sc.SonataItemCapacity).options(
        joinedload(sc.SonataItemCapacity.companies).joinedload(sc.SonataItemCapacityCompany.company),
        joinedload(sc.SonataItemCapacity.plants).joinedload(sc.SonataItemCapacityPlant.plant),
        joinedload(sc.SonataItemCapacity.creator),
        joinedload(sc.SonataItemCapacity.updater),
    ).join(sc.SonataItemCapacityCompany).filter(
        sc.SonataItemCapacityCompany.company_id.in_(accessible_companies)
    )

    if company_id:
        query = query.filter(sc.SonataItemCapacityCompany.company_id == company_id)
    if plant_id:
        query = query.join(sc.SonataItemCapacityPlant, sc.SonataItemCapacity.id == sc.SonataItemCapacityPlant.item_capacity_id).filter(
            sc.SonataItemCapacityPlant.plant_id == plant_id
        )
    if is_active is not None:
        query = query.filter(sc.SonataItemCapacity.is_active == is_active)
    if search:
        t = f"%{search.strip()}%"
        query = query.filter(
            sc.SonataItemCapacity.name.ilike(t) | sc.SonataItemCapacity.code.ilike(t)
        )

    records = query.distinct().order_by(sc.SonataItemCapacity.created_at.desc()).all()
    return {"data": [build_record_response(r, sc.SonataItemCapacityCompany, sc.SonataItemCapacityPlant) for r in records], "total": len(records)}


@router.get("/sonata-item-capacity/values")
async def get_item_capacity_values(
    user_id:   int            = Query(...),
    is_active: Optional[bool] = Query(True),
    db: Session = Depends(get_db)
):
    """Get Item Capacity list for LOV popup in SonataCustomFields"""
    accessible = get_user_accessible_companies(db, user_id)
    if not accessible:
        return {"data": []}

    query = db.query(sc.SonataItemCapacity).join(sc.SonataItemCapacityCompany).filter(
        sc.SonataItemCapacityCompany.company_id.in_(accessible)
    )
    if is_active is not None:
        query = query.filter(sc.SonataItemCapacity.is_active == is_active)

    records = query.distinct().order_by(sc.SonataItemCapacity.name).all()
    return {"data": [{"id": r.id, "code": r.code, "description": r.name} for r in records]}


@router.post("/sonata-item-capacity", response_model=dict)
async def create_item_capacity(
    name:        str            = Form(...),
    description: Optional[str] = Form(None),
    company_ids: str            = Form(...),   # comma-separated: "1,2,3"
    plant_ids:   Optional[str]  = Form(None),  # comma-separated: "1,2"
    user_id:     int            = Form(...),
    db: Session = Depends(get_db)
):
    """Create Item Capacity for multiple companies + plants"""
    # Parse ids
    c_ids = [int(x.strip()) for x in company_ids.split(',') if x.strip()]
    p_ids = [int(x.strip()) for x in plant_ids.split(',') if x.strip()] if plant_ids else []

    if not c_ids:
        raise HTTPException(status_code=400, detail="At least one company_id required")

    # Access check
    for cid in c_ids:
        if not check_company_access(db, user_id, cid):
            raise HTTPException(status_code=403, detail=f"No access to company {cid}")

    # Validate companies exist
    companies = db.query(models.Company).filter(models.Company.id.in_(c_ids)).all()
    if len(companies) != len(c_ids):
        raise HTTPException(status_code=404, detail="One or more companies not found")

    # Generate code using first company code
    name = capitalize_properly(name)
    code = generate_code(name, "CAP", sc.SonataItemCapacity, db)

    record = sc.SonataItemCapacity(
        name        = name,
        code        = code,
        description = description.strip() if description else None,
        created_by  = user_id,
        updated_by  = user_id,
    )
    db.add(record)
    db.flush()

    # Add company junctions
    for cid in c_ids:
        db.add(sc.SonataItemCapacityCompany(item_capacity_id=record.id, company_id=cid))

    # Add plant junctions
    for pid in p_ids:
        db.add(sc.SonataItemCapacityPlant(item_capacity_id=record.id, plant_id=pid))

    db.commit()
    db.refresh(record)

    return {"message": "Item Capacity created successfully", "id": record.id, "code": record.code, "name": record.name}


@router.put("/sonata-item-capacity/{record_id}", response_model=dict)
async def update_item_capacity(
    record_id:   int,
    description: Optional[str]  = Form(None),
    is_active:   Optional[bool] = Form(None),
    user_id:     int            = Form(...),
    db: Session = Depends(get_db)
):
    """Update Item Capacity description / status"""
    record = db.query(sc.SonataItemCapacity).filter(sc.SonataItemCapacity.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Item Capacity not found")

    if description is not None:
        record.description = description.strip() if description else None
    if is_active is not None:
        record.is_active = is_active
    record.updated_by = user_id
    db.commit()

    return {"message": "Updated successfully", "id": record_id}


# ==================== ITEM GRADE ====================

@router.get("/sonata-item-grade/by-user/{user_id}")
async def get_item_grades(
    user_id:    int,
    company_id: Optional[int]  = Query(None),
    plant_id:   Optional[int]  = Query(None),
    is_active:  Optional[bool] = Query(None),
    search:     Optional[str]  = Query(None),
    db: Session = Depends(get_db)
):
    """Get all Item Grades accessible to user"""
    accessible_companies = get_user_accessible_companies(db, user_id)
    if not accessible_companies:
        return {"data": [], "total": 0}

    query = db.query(sc.SonataItemGrade).options(
        joinedload(sc.SonataItemGrade.companies).joinedload(sc.SonataItemGradeCompany.company),
        joinedload(sc.SonataItemGrade.plants).joinedload(sc.SonataItemGradePlant.plant),
        joinedload(sc.SonataItemGrade.creator),
        joinedload(sc.SonataItemGrade.updater),
    ).join(sc.SonataItemGradeCompany).filter(
        sc.SonataItemGradeCompany.company_id.in_(accessible_companies)
    )

    if company_id:
        query = query.filter(sc.SonataItemGradeCompany.company_id == company_id)
    if plant_id:
        query = query.join(sc.SonataItemGradePlant, sc.SonataItemGrade.id == sc.SonataItemGradePlant.item_grade_id).filter(
            sc.SonataItemGradePlant.plant_id == plant_id
        )
    if is_active is not None:
        query = query.filter(sc.SonataItemGrade.is_active == is_active)
    if search:
        t = f"%{search.strip()}%"
        query = query.filter(
            sc.SonataItemGrade.name.ilike(t) | sc.SonataItemGrade.code.ilike(t)
        )

    records = query.distinct().order_by(sc.SonataItemGrade.created_at.desc()).all()
    return {"data": [build_record_response(r, sc.SonataItemGradeCompany, sc.SonataItemGradePlant) for r in records], "total": len(records)}


@router.get("/sonata-item-grade/values")
async def get_item_grade_values(
    user_id:   int            = Query(...),
    is_active: Optional[bool] = Query(True),
    db: Session = Depends(get_db)
):
    """Get Item Grade list for LOV popup in SonataCustomFields"""
    accessible = get_user_accessible_companies(db, user_id)
    if not accessible:
        return {"data": []}

    query = db.query(sc.SonataItemGrade).join(sc.SonataItemGradeCompany).filter(
        sc.SonataItemGradeCompany.company_id.in_(accessible)
    )
    if is_active is not None:
        query = query.filter(sc.SonataItemGrade.is_active == is_active)

    records = query.distinct().order_by(sc.SonataItemGrade.name).all()
    return {"data": [{"id": r.id, "code": r.code, "description": r.name} for r in records]}


@router.post("/sonata-item-grade", response_model=dict)
async def create_item_grade(
    name:        str            = Form(...),
    description: Optional[str] = Form(None),
    company_ids: str            = Form(...),   # comma-separated
    plant_ids:   Optional[str]  = Form(None),  # comma-separated
    user_id:     int            = Form(...),
    db: Session = Depends(get_db)
):
    """Create Item Grade for multiple companies + plants"""
    c_ids = [int(x.strip()) for x in company_ids.split(',') if x.strip()]
    p_ids = [int(x.strip()) for x in plant_ids.split(',') if x.strip()] if plant_ids else []

    if not c_ids:
        raise HTTPException(status_code=400, detail="At least one company_id required")

    for cid in c_ids:
        if not check_company_access(db, user_id, cid):
            raise HTTPException(status_code=403, detail=f"No access to company {cid}")

    companies = db.query(models.Company).filter(models.Company.id.in_(c_ids)).all()
    if len(companies) != len(c_ids):
        raise HTTPException(status_code=404, detail="One or more companies not found")

    name = capitalize_properly(name)
    code = generate_code(name, "GRD", sc.SonataItemGrade, db)

    record = sc.SonataItemGrade(
        name        = name,
        code        = code,
        description = description.strip() if description else None,
        created_by  = user_id,
        updated_by  = user_id,
    )
    db.add(record)
    db.flush()

    for cid in c_ids:
        db.add(sc.SonataItemGradeCompany(item_grade_id=record.id, company_id=cid))
    for pid in p_ids:
        db.add(sc.SonataItemGradePlant(item_grade_id=record.id, plant_id=pid))

    db.commit()
    db.refresh(record)

    return {"message": "Item Grade created successfully", "id": record.id, "code": record.code, "name": record.name}


@router.put("/sonata-item-grade/{record_id}", response_model=dict)
async def update_item_grade(
    record_id:   int,
    description: Optional[str]  = Form(None),
    is_active:   Optional[bool] = Form(None),
    user_id:     int            = Form(...),
    db: Session = Depends(get_db)
):
    """Update Item Grade description / status"""
    record = db.query(sc.SonataItemGrade).filter(sc.SonataItemGrade.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Item Grade not found")

    if description is not None:
        record.description = description.strip() if description else None
    if is_active is not None:
        record.is_active = is_active
    record.updated_by = user_id
    db.commit()

    return {"message": "Updated successfully", "id": record_id}


# ==================== LOOKUP: Companies & Plants by user ====================

@router.get("/sonata-lookup/companies/{user_id}")
async def lookup_companies(user_id: int, db: Session = Depends(get_db)):
    """Get companies accessible to user for dropdown/LOV"""
    c_ids = get_user_accessible_companies(db, user_id)
    if not c_ids:
        return {"data": []}
    companies = db.query(models.Company).filter(models.Company.id.in_(c_ids), models.Company.is_active == True).all()
    return {"data": [{"id": c.id, "code": c.company_code, "name": c.company_name} for c in companies]}


@router.get("/sonata-lookup/plants/{user_id}")
async def lookup_plants(
    user_id:    int,
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get plants accessible to user, optionally filtered by company"""
    c_ids = get_user_accessible_companies(db, user_id)
    if not c_ids:
        return {"data": []}

    p_ids = get_user_accessible_plants(db, user_id, c_ids)
    if not p_ids:
        return {"data": []}

    query = db.query(models.Plant).filter(models.Plant.id.in_(p_ids))
    if company_id:
        query = query.filter(models.Plant.company_id == company_id)

    plants = query.all()
    return {"data": [{"id": p.id, "code": p.plant_code, "name": p.plant_name, "company_id": p.company_id} for p in plants]}