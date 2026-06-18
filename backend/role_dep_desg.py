'''backend/role_dep_desg.py'''
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import db_models as models
import schemas
from database import get_db
import re

router = APIRouter()


def generate_code(name: str, length: int = 6) -> str:
    """Generate code from name"""
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', name).upper()
    code = clean_name[:length]
    if len(code) < length:
        import random
        import string
        code += ''.join(random.choices(string.ascii_uppercase + string.digits, k=length - len(code)))
    return code


def capitalize_properly(name: str) -> str:
    """Capitalize first letter and after spaces"""
    words = name.strip().split()
    return ' '.join(word.capitalize() for word in words)


# ===================================================================
# ROLE ENDPOINTS
# ===================================================================
@router.get("/roles", response_model=List[schemas.RoleResponse])
async def get_roles(q: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all roles with optional search"""
    query = db.query(models.Role)
    if q:
        query = query.filter(models.Role.role_name.ilike(f'%{q}%'))
    return query.order_by(models.Role.role_name).all()


@router.post("/roles", response_model=schemas.RoleResponse)
async def create_role(
    role_name: str = Form(...),
    db: Session = Depends(get_db)
):
    """Create new role"""
    role_name = capitalize_properly(role_name)
    
    # Check duplicate
    existing = db.query(models.Role).filter(
        models.Role.role_name == role_name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")
    
    # Generate unique code
    role_code = generate_code(role_name, 6)
    while db.query(models.Role).filter(models.Role.role_code == role_code).first():
        role_code = generate_code(role_name + str(db.query(models.Role).count()), 6)
    
    db_role = models.Role(role_name=role_name, role_code=role_code)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role


# ===================================================================
# DEPARTMENT ENDPOINTS
# ===================================================================
@router.get("/departments", response_model=List[schemas.DepartmentResponse])
async def get_departments(q: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all departments with optional search"""
    query = db.query(models.Department)
    if q:
        query = query.filter(models.Department.department_name.ilike(f'%{q}%'))
    return query.order_by(models.Department.department_name).all()


@router.post("/departments", response_model=schemas.DepartmentResponse)
async def create_department(
    department_name: str = Form(...),
    db: Session = Depends(get_db)
):
    """Create new department"""
    department_name = capitalize_properly(department_name)
    
    # Check duplicate
    existing = db.query(models.Department).filter(
        models.Department.department_name == department_name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department name already exists")
    
    # Generate unique code
    dept_code = generate_code(department_name, 6)
    while db.query(models.Department).filter(models.Department.department_code == dept_code).first():
        dept_code = generate_code(department_name + str(db.query(models.Department).count()), 6)
    
    db_dept = models.Department(department_name=department_name, department_code=dept_code)
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept


# ===================================================================
# DESIGNATION ENDPOINTS
# ===================================================================
@router.get("/designations", response_model=List[schemas.DesignationResponse])
async def get_designations(q: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all designations with optional search"""
    query = db.query(models.Designation)
    if q:
        query = query.filter(models.Designation.designation_name.ilike(f'%{q}%'))
    return query.order_by(models.Designation.designation_name).all()


@router.post("/designations", response_model=schemas.DesignationResponse)
async def create_designation(
    designation_name: str = Form(...),
    db: Session = Depends(get_db)
):
    """Create new designation"""
    designation_name = capitalize_properly(designation_name)
    
    # Check duplicate
    existing = db.query(models.Designation).filter(
        models.Designation.designation_name == designation_name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Designation name already exists")
    
    # Generate unique code
    desg_code = generate_code(designation_name, 6)
    while db.query(models.Designation).filter(models.Designation.designation_code == desg_code).first():
        desg_code = generate_code(designation_name + str(db.query(models.Designation).count()), 6)
    
    db_desg = models.Designation(designation_name=designation_name, designation_code=desg_code)
    db.add(db_desg)
    db.commit()
    db.refresh(db_desg)
    return db_desg


# ===================================================================
# ROLE ACCESS - MAIN ENDPOINT 
# ===================================================================
# ===================================================================
# ROLE ACCESS - MAIN ENDPOINT (Location fields jaisa)
# ===================================================================
@router.post("/role-access", response_model=dict)
async def create_role_access(
    company_id: int = Form(...),
    role_name: Optional[str] = Form(None),
    department_name: Optional[str] = Form(None),
    designation_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Create Role Access entry with auto-creation
    - Automatically creates Role/Department/Designation if not exists
    - Works exactly like location fields in AddCompany
    - Now supports optional fields - only provided fields will be created
    """
    
    # Validate company exists
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Invalid company ID")
    
    # Validate at least one field is provided
    if not any([role_name, department_name, designation_name]):
        raise HTTPException(status_code=400, detail="At least one field (role, department, or designation) must be provided")
    
    role = None
    department = None
    designation = None
    
    # Get or Create Role (only if provided)
    if role_name:
        role_name = capitalize_properly(role_name.strip())
        role = db.query(models.Role).filter(models.Role.role_name == role_name).first()
        if not role:
            role_code = generate_code(role_name, 6)
            while db.query(models.Role).filter(models.Role.role_code == role_code).first():
                role_code = generate_code(role_name + str(db.query(models.Role).count()), 6)
            role = models.Role(role_name=role_name, role_code=role_code)
            db.add(role)
            db.flush()
    
    # Get or Create Department (only if provided)
    if department_name:
        department_name = capitalize_properly(department_name.strip())
        department = db.query(models.Department).filter(
            models.Department.department_name == department_name
        ).first()
        if not department:
            dept_code = generate_code(department_name, 6)
            while db.query(models.Department).filter(models.Department.department_code == dept_code).first():
                dept_code = generate_code(department_name + str(db.query(models.Department).count()), 6)
            department = models.Department(department_name=department_name, department_code=dept_code)
            db.add(department)
            db.flush()
    
    # Get or Create Designation (only if provided)
    if designation_name:
        designation_name = capitalize_properly(designation_name.strip())
        designation = db.query(models.Designation).filter(
            models.Designation.designation_name == designation_name
        ).first()
        if not designation:
            desg_code = generate_code(designation_name, 6)
            while db.query(models.Designation).filter(models.Designation.designation_code == desg_code).first():
                desg_code = generate_code(designation_name + str(db.query(models.Designation).count()), 6)
            designation = models.Designation(designation_name=designation_name, designation_code=desg_code)
            db.add(designation)
            db.flush()
    
    # For RoleAccess table - we need all three fields
    # If not all provided, just create the individual entries
    if role and department and designation:
        # Check if this combination already exists
        existing = db.query(models.RoleAccess).filter(
            models.RoleAccess.company_id == company_id,
            models.RoleAccess.role_id == role.id,
            models.RoleAccess.department_id == department.id,
            models.RoleAccess.designation_id == designation.id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400, 
                detail="This Role-Department-Designation combination already exists for this company"
            )
        
        # Create RoleAccess entry
        role_access = models.RoleAccess(
            company_id=company_id,
            role_id=role.id,
            department_id=department.id,
            designation_id=designation.id
        )
        db.add(role_access)
        db.commit()
        db.refresh(role_access)
        
        return {
            "message": "Role Access created successfully",
            "role_access_id": role_access.id,
            "company_name": company.company_name,
            "role_name": role.role_name,
            "department_name": department.department_name,
            "designation_name": designation.designation_name
        }
    else:
        # Only individual entries created
        db.commit()
        
        created_items = []
        if role:
            created_items.append(f"Role: {role.role_name}")
        if department:
            created_items.append(f"Department: {department.department_name}")
        if designation:
            created_items.append(f"Designation: {designation.designation_name}")
        
        return {
            "message": "Entries created successfully",
            "company_name": company.company_name,
            "created_items": created_items,
            "note": "RoleAccess entry not created as all three fields are required for that"
        }


@router.get("/role-access/by-company/{company_id}", response_model=List[dict])
async def get_role_access_by_company(company_id: int, db: Session = Depends(get_db)):
    """Get all role access entries for a company"""
    entries = db.query(models.RoleAccess).filter(
        models.RoleAccess.company_id == company_id
    ).all()
    
    result = []
    for entry in entries:
        result.append({
            "id": entry.id,
            "company_id": entry.company_id,
            "role_id": entry.role_id,
            "role_name": entry.role.role_name,
            "department_id": entry.department_id,
            "department_name": entry.department.department_name,
            "designation_id": entry.designation_id,
            "designation_name": entry.designation.designation_name,
            "created_at": entry.created_at
        })
    
    return result
