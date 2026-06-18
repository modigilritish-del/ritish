"""user/user_routes.py - User Management API Routes - PRIMARY COMPANY IMMUTABLE"""
from fastapi import APIRouter, HTTPException, Depends, Form, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, distinct ,func, or_
from typing import List, Optional
import secrets
import string
import hashlib
from datetime import datetime
import json

from database import get_db
import db_models as models
from user import user_models as user_models
from user import user_schemas as schemas
from role import role_models as rbac_models
from user.email_service import get_email_service
from sqlalchemy.orm import joinedload

router = APIRouter()

# ==================== UTILITY FUNCTIONS ====================

def generate_password(length: int = 12) -> str:
    """Generate random secure password"""
    chars = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(chars) for _ in range(length))

def hash_password(password: str) -> str:
    """Simple password hashing (use bcrypt in production)"""
    return hashlib.sha256(password.encode()).hexdigest()

def get_companies_for_user(db: Session, company_ids: List[int]) -> List[models.Company]:
    """Validate and get companies"""
    companies = db.query(models.Company).filter(models.Company.id.in_(company_ids)).all()
    if len(companies) != len(company_ids):
        raise HTTPException(status_code=400, detail="One or more company IDs are invalid")
    return companies

def get_plants_for_companies(db: Session, plant_ids: List[int], company_ids: List[int]) -> List[models.Plant]:
    """Validate plants belong to selected companies"""
    if not plant_ids:
        return []
    
    plants = db.query(models.Plant).filter(
        models.Plant.id.in_(plant_ids),
        models.Plant.company_id.in_(company_ids)
    ).all()
    
    if len(plants) != len(plant_ids):
        raise HTTPException(
            status_code=400, 
            detail="One or more plant IDs are invalid or don't belong to selected companies"
        )
    return plants

# ==================== NEW: GET COMPANY RBAC DATA ====================

@router.get("/users/{user_id}/available-companies-for-access")
async def get_available_companies_for_access(user_id: int, db: Session = Depends(get_db)):
    """
    Get companies where user doesn't have ALL plants assigned yet.
    Only shows companies with pending plant assignments.
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all companies with their plants
    all_companies = db.query(models.Company).options(
        joinedload(models.Company.company_type),
        joinedload(models.Company.industry_type)
    ).all()
    
    available_companies = []
    
    for company in all_companies:
        # Get total plants for this company
        total_plants = db.query(models.Plant).filter(
            models.Plant.company_id == company.id
        ).count()
        
        # Get plants user already has access to
        user_plant_accesses = db.query(user_models.UserCompanyAccess.plant_id).filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.company_id == company.id,
            user_models.UserCompanyAccess.plant_id.isnot(None)
        ).distinct().all()
        
        assigned_plant_ids = {plant_id for (plant_id,) in user_plant_accesses}
        assigned_count = len(assigned_plant_ids)
        
        # Check for company-level access (plant_id = NULL)
        has_company_level = db.query(user_models.UserCompanyAccess).filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.company_id == company.id,
            user_models.UserCompanyAccess.plant_id.is_(None)
        ).first()
        
        # Show company if:
        # 1. User doesn't have ALL plants, OR
        # 2. User has no company-level access
        if assigned_count < total_plants or not has_company_level:
            available_companies.append({
                "id": company.id,
                "company_name": company.company_name,
                "company_code": company.company_code,
                "company_type": {
                    "id": company.company_type.id,
                    "type_name": company.company_type.type_name
                } if company.company_type else None,
                "industry_type": {
                    "id": company.industry_type.id,
                    "industry_name": company.industry_type.industry_name
                } if company.industry_type else None,
                "total_plants": total_plants,
                "assigned_plants": assigned_count,
                "pending_plants": total_plants - assigned_count,
                "has_company_level_access": has_company_level is not None,
                "is_fully_assigned": assigned_count >= total_plants and has_company_level is not None
            })
    
    return {
        "user_id": user_id,
        "user_name": user.full_name,
        "available_companies": available_companies,
        "total_available": len(available_companies)
    }


@router.get("/users/{user_id}/available-plants-for-company/{company_id}")
async def get_available_plants_for_company(
    user_id: int, 
    company_id: int, 
    db: Session = Depends(get_db)
):
    """
    Get plants that user doesn't have access to yet for a specific company.
    Only shows unassigned plants.
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get all plants for this company
    all_plants = db.query(models.Plant).filter(
        models.Plant.company_id == company_id
    ).options(
        joinedload(models.Plant.plant_type)
    ).all()
    
    # Get plants user already has access to
    user_plant_accesses = db.query(user_models.UserCompanyAccess.plant_id).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == company_id,
        user_models.UserCompanyAccess.plant_id.isnot(None)
    ).distinct().all()
    
    assigned_plant_ids = {plant_id for (plant_id,) in user_plant_accesses}
    
    # Filter to show only unassigned plants
    available_plants = []
    for plant in all_plants:
        if plant.id not in assigned_plant_ids:
            available_plants.append({
                "id": plant.id,
                "plant_name": plant.plant_name,
                "plant_code": plant.plant_code,
                "plant_type": {
                    "id": plant.plant_type.id,
                    "type_name": plant.plant_type.type_name
                } if plant.plant_type else None,
                "is_assigned": False
            })
    
    return {
        "user_id": user_id,
        "company_id": company_id,
        "company_name": company.company_name,
        "total_plants": len(all_plants),
        "assigned_plants": len(assigned_plant_ids),
        "available_plants": available_plants,
        "available_count": len(available_plants)
    }


@router.get("/users/{user_id}/assignment-status")
async def get_user_assignment_status(user_id: int, db: Session = Depends(get_db)):
    """
    Get complete assignment status for a user across all companies.
    Shows which companies/plants are fully assigned vs pending.
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all companies
    all_companies = db.query(models.Company).all()
    
    assignment_summary = []
    
    for company in all_companies:
        # Total plants
        total_plants = db.query(models.Plant).filter(
            models.Plant.company_id == company.id
        ).count()
        
        # User's plant assignments
        user_plant_count = db.query(user_models.UserCompanyAccess).filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.company_id == company.id,
            user_models.UserCompanyAccess.plant_id.isnot(None)
        ).count()
        
        # Company-level access
        has_company_access = db.query(user_models.UserCompanyAccess).filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.company_id == company.id,
            user_models.UserCompanyAccess.plant_id.is_(None)
        ).first() is not None
        
        is_fully_assigned = (user_plant_count >= total_plants) and has_company_access
        
        assignment_summary.append({
            "company_id": company.id,
            "company_name": company.company_name,
            "company_code": company.company_code,
            "total_plants": total_plants,
            "assigned_plants": user_plant_count,
            "pending_plants": total_plants - user_plant_count,
            "has_company_level_access": has_company_access,
            "is_fully_assigned": is_fully_assigned,
            "assignment_percentage": round((user_plant_count / total_plants * 100) if total_plants > 0 else 0, 2)
        })
    
    # Calculate overall statistics
    total_companies = len(all_companies)
    fully_assigned = sum(1 for item in assignment_summary if item["is_fully_assigned"])
    partially_assigned = sum(1 for item in assignment_summary if item["assigned_plants"] > 0 and not item["is_fully_assigned"])
    not_assigned = total_companies - fully_assigned - partially_assigned
    
    return {
        "user_id": user_id,
        "user_name": user.full_name,
        "email": user.email,
        "overall_stats": {
            "total_companies": total_companies,
            "fully_assigned_companies": fully_assigned,
            "partially_assigned_companies": partially_assigned,
            "not_assigned_companies": not_assigned,
            "completion_percentage": round((fully_assigned / total_companies * 100) if total_companies > 0 else 0, 2)
        },
        "company_assignments": assignment_summary
    }


@router.post("/users/{user_id}/bulk-add-access")
async def bulk_add_user_access(
    user_id: int,
    company_id: int = Form(...),
    plant_ids: str = Form(...),  # JSON array of plant IDs
    db: Session = Depends(get_db)
):
    """
    Bulk add access for multiple plants at once.
    Automatically uses user's existing role/dept/desg.
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Parse plant IDs
    try:
        plant_id_list = json.loads(plant_ids)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid plant_ids format")
    
    if not plant_id_list:
        raise HTTPException(status_code=400, detail="At least one plant must be selected")
    
    # Get user's existing access to retrieve role/dept/desg
    existing_access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id
    ).first()
    
    if not existing_access:
        raise HTTPException(
            status_code=404, 
            detail="User has no existing access. Cannot add new access without initial role/dept/desg."
        )
    
    role_id = existing_access.role_id
    department_id = existing_access.department_id
    designation_id = existing_access.designation_id
    
    # Validate company
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=400, detail="Invalid company")
    
    # Validate all plants belong to the company
    plants = db.query(models.Plant).filter(
        models.Plant.id.in_(plant_id_list),
        models.Plant.company_id == company_id
    ).all()
    
    if len(plants) != len(plant_id_list):
        raise HTTPException(
            status_code=400, 
            detail="One or more plant IDs are invalid or don't belong to the selected company"
        )
    
    added_count = 0
    skipped_count = 0
    errors = []
    
    for plant in plants:
        # Check if access already exists
        existing = db.query(user_models.UserCompanyAccess).filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.company_id == company_id,
            user_models.UserCompanyAccess.plant_id == plant.id
        ).first()
        
        if existing:
            skipped_count += 1
            continue
        
        try:
            new_access = user_models.UserCompanyAccess(
                user_id=user_id,
                company_id=company_id,
                plant_id=plant.id,
                role_id=role_id,
                department_id=department_id,
                designation_id=designation_id,
                is_primary_company=False,
                is_primary_plant=False
            )
            db.add(new_access)
            added_count += 1
        except Exception as e:
            errors.append(f"Failed to add access for plant {plant.plant_name}: {str(e)}")
    
    if added_count > 0:
        db.commit()
    
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    dept = db.query(models.Department).filter(models.Department.id == department_id).first()
    desg = db.query(models.Designation).filter(models.Designation.id == designation_id).first()
    
    return {
        "message": f"Bulk access operation completed",
        "user_id": user_id,
        "company_name": company.company_name,
        "added_count": added_count,
        "skipped_count": skipped_count,
        "total_requested": len(plant_id_list),
        "locked_values_used": {
            "role": role.role_name,
            "department": dept.department_name,
            "designation": desg.designation_name
        },
        "errors": errors if errors else None
    }
@router.get("/companies/{company_id}/rbac-options")
async def get_company_rbac_options(company_id: int, db: Session = Depends(get_db)):
    """
    Get unique roles, departments, designations for a company
    that have page access configured in company_role_page_access table
    """
    accesses = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.company_id == company_id
    ).options(
        joinedload(rbac_models.CompanyRolePageAccess.role),
        joinedload(rbac_models.CompanyRolePageAccess.department),
        joinedload(rbac_models.CompanyRolePageAccess.designation)
    ).all()
    
    roles_dict = {}
    departments_dict = {}
    designations_dict = {}
    
    for access in accesses:
        if access.role_id not in roles_dict:
            roles_dict[access.role_id] = {
                "id": access.role.id,
                "role_name": access.role.role_name,
                "role_code": access.role.role_code
            }
        
        if access.department_id not in departments_dict:
            departments_dict[access.department_id] = {
                "id": access.department.id,
                "department_name": access.department.department_name,
                "department_code": access.department.department_code
            }
        
        if access.designation_id not in designations_dict:
            designations_dict[access.designation_id] = {
                "id": access.designation.id,
                "designation_name": access.designation.designation_name,
                "designation_code": access.designation.designation_code
            }
    
    return {
        "company_id": company_id,
        "roles": list(roles_dict.values()),
        "departments": list(departments_dict.values()),
        "designations": list(designations_dict.values())
    }


@router.get("/companies/{company_id}/accessible-pages")
async def get_company_accessible_pages(
    company_id: int,
    role_id: int,
    department_id: int,
    designation_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all pages accessible for specific company + role + dept + desg combination
    """
    accesses = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.company_id == company_id,
        rbac_models.CompanyRolePageAccess.role_id == role_id,
        rbac_models.CompanyRolePageAccess.department_id == department_id,
        rbac_models.CompanyRolePageAccess.designation_id == designation_id,
        rbac_models.CompanyRolePageAccess.is_granted == True
    ).options(
        joinedload(rbac_models.CompanyRolePageAccess.page),
        joinedload(rbac_models.CompanyRolePageAccess.permission)
    ).all()
    
    pages_dict = {}
    for access in accesses:
        page = access.page
        if not page.is_active:
            continue
        
        if page.id not in pages_dict:
            pages_dict[page.id] = {
                "page_id": page.id,
                "page_name": page.page_name,
                "page_url": page.page_url,
                "permissions": []
            }
        
        pages_dict[page.id]["permissions"].append(access.permission.permission_type)
    
    return {
        "company_id": company_id,
        "role_id": role_id,
        "department_id": department_id,
        "designation_id": designation_id,
        "pages": list(pages_dict.values())
    }


# ==================== USER CREATION ====================

@router.post("/users/register", response_model=schemas.UserCredentialsResponse)
async def register_user(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    company_ids: str = Form(...),
    plant_ids: str = Form(default="[]"),
    role_id: int = Form(...),
    department_id: int = Form(...),
    designation_id: int = Form(...),
    primary_company_id: Optional[int] = Form(None),
    primary_plant_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """Register new user with multiple companies and plants"""
    try:
        company_id_list = json.loads(company_ids)
        plant_id_list = json.loads(plant_ids)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid company_ids or plant_ids format")
    
    if not company_id_list:
        raise HTTPException(status_code=400, detail="At least one company must be selected")
    
    email = email.strip().lower()
    phone = phone.strip()
    full_name = full_name.strip()
    
    if db.query(user_models.User).filter(user_models.User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if db.query(user_models.User).filter(user_models.User.phone == phone).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    if not db.query(models.Role).filter(models.Role.id == role_id).first():
        raise HTTPException(status_code=400, detail="Invalid role ID")
    
    if not db.query(models.Department).filter(models.Department.id == department_id).first():
        raise HTTPException(status_code=400, detail="Invalid department ID")
    
    if not db.query(models.Designation).filter(models.Designation.id == designation_id).first():
        raise HTTPException(status_code=400, detail="Invalid designation ID")
    
    companies = get_companies_for_user(db, company_id_list)
    plants = get_plants_for_companies(db, plant_id_list, company_id_list)
    
    if primary_company_id and primary_company_id not in company_id_list:
        raise HTTPException(status_code=400, detail="Primary company must be in selected companies")
    
    if primary_plant_id and primary_plant_id not in plant_id_list:
        raise HTTPException(status_code=400, detail="Primary plant must be in selected plants")
    
    if not primary_company_id:
        primary_company_id = company_id_list[0]
    
    if primary_plant_id:
        primary_plant = db.query(models.Plant).filter(models.Plant.id == primary_plant_id).first()
        if primary_plant and primary_plant.company_id != primary_company_id:
            raise HTTPException(
                status_code=400, 
                detail="Primary plant must belong to primary company"
            )
    
    user_login_id = email
    auto_password = generate_password()
    hashed_password = hash_password(auto_password)
    
    db_user = user_models.User(
        full_name=full_name,
        email=email,
        phone=phone,
        user_id=user_login_id,
        password=hashed_password,
        is_active=True
    )
    
    db.add(db_user)
    db.flush()
    
    for company in companies:
        company_plants = [p for p in plants if p.company_id == company.id]
        
        if not company_plants:
            access = user_models.UserCompanyAccess(
                user_id=db_user.id,
                company_id=company.id,
                plant_id=None,
                role_id=role_id,
                department_id=department_id,
                designation_id=designation_id,
                is_primary_company=(company.id == primary_company_id),
                is_primary_plant=False
            )
            db.add(access)
        else:
            for plant in company_plants:
                access = user_models.UserCompanyAccess(
                    user_id=db_user.id,
                    company_id=company.id,
                    plant_id=plant.id,
                    role_id=role_id,
                    department_id=department_id,
                    designation_id=designation_id,
                    is_primary_company=(company.id == primary_company_id),
                    is_primary_plant=(plant.id == primary_plant_id)
                )
                db.add(access)
    
    for company in companies:
        stmt = user_models.user_companies.insert().values(
            user_id=db_user.id,
            company_id=company.id,
            is_primary=(company.id == primary_company_id)
        )
        db.execute(stmt)
    
    for plant in plants:
        stmt = user_models.user_plants.insert().values(
            user_id=db_user.id,
            plant_id=plant.id,
            company_id=plant.company_id,
            is_primary=(plant.id == primary_plant_id)
        )
        db.execute(stmt)
    
    db.commit()
    db.refresh(db_user)
    
    try:
        email_service = get_email_service()
        email_sent = email_service.send_password_email(
            to_email=db_user.email,
            full_name=db_user.full_name,
            user_login_id=user_login_id,
            password=auto_password,
            is_reset=False
        )
        
        if email_sent:
            message = "User registered successfully. Credentials have been sent to the user's email."
        else:
            message = "User registered successfully. Please save these credentials securely. (Email notification failed)"
    except Exception as e:
        print(f"Email service error: {str(e)}")
        message = "User registered successfully. Please save these credentials securely. (Email service unavailable)"
    
    return schemas.UserCredentialsResponse(
        user_id=db_user.id,
        full_name=db_user.full_name,
        email=db_user.email,
        user_login_id=user_login_id,
        auto_generated_password=auto_password,
        message=message
    )

# ==================== USER RETRIEVAL ====================

@router.get("/users", response_model=List[schemas.UserListResponse])
async def get_all_users(
    current_user_id: Optional[int] = Query(None, description="Filter by current user's accessible companies/plants"),
    company_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    Get all users with optional filtering
    If current_user_id provided, returns ONLY users sharing companies/plants with current user
    AND shows ONLY the accessible companies/plants count
    """
    
    # Get current user's accessible companies and plants
    current_user_company_ids = set()
    current_user_plant_ids = set()
    
    if current_user_id:
        current_user_accesses = db.query(user_models.UserCompanyAccess).filter(
            user_models.UserCompanyAccess.user_id == current_user_id
        ).all()
        
        if not current_user_accesses:
            return []
        
        for access in current_user_accesses:
            current_user_company_ids.add(access.company_id)
            if access.plant_id:
                current_user_plant_ids.add(access.plant_id)
        
        print(f"🔍 Current User {current_user_id} has access to:")
        print(f"   Companies: {current_user_company_ids}")
        print(f"   Plants: {current_user_plant_ids}")
        
        # Find users with shared access
        shared_access_query = db.query(user_models.UserCompanyAccess.user_id).filter(
            or_(
                user_models.UserCompanyAccess.company_id.in_(current_user_company_ids),
                user_models.UserCompanyAccess.plant_id.in_(current_user_plant_ids)
            )
        ).distinct()
        
        shared_user_ids = [uid for (uid,) in shared_access_query.all()]
        
        print(f"✅ Found {len(shared_user_ids)} users with shared access")
        
        query = db.query(user_models.User).filter(
            user_models.User.id.in_(shared_user_ids)
        ).options(
            joinedload(user_models.User.company_accesses)
        )
    else:
        query = db.query(user_models.User).options(
            joinedload(user_models.User.company_accesses)
        )
    
    if is_active is not None:
        query = query.filter(user_models.User.is_active == is_active)
    
    users = query.all()
    
    result = []
    for user in users:
        if company_id:
            if not any(acc.company_id == company_id for acc in user.company_accesses):
                continue
        
        # Get primary company
        primary_company = None
        for acc in user.company_accesses:
            if acc.is_primary_company:
                primary_company = acc.company.company_name
                break
        
        # 🔥 FIX: Count ONLY companies/plants that current user has access to
        if current_user_id and (current_user_company_ids or current_user_plant_ids):
            accessible_companies = set(
                acc.company_id for acc in user.company_accesses 
                if acc.company_id in current_user_company_ids
            )
            accessible_plants = set(
                acc.plant_id for acc in user.company_accesses 
                if acc.plant_id and acc.plant_id in current_user_plant_ids
            )
            
            total_companies = len(accessible_companies)
            total_plants = len(accessible_plants)
        else:
            # Original behavior for non-filtered queries
            unique_companies = set(acc.company_id for acc in user.company_accesses)
            unique_plants = set(acc.plant_id for acc in user.company_accesses if acc.plant_id)
            total_companies = len(unique_companies)
            total_plants = len(unique_plants)
        
        result.append(schemas.UserListResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone,
            user_id=user.user_id,
            is_active=user.is_active,
            total_companies=total_companies,
            total_plants=total_plants,
            primary_company=primary_company,
            created_at=user.created_at
        ))
    
    return result

@router.get("/users/{user_id}", response_model=schemas.UserResponse)
async def get_user_details(user_id: int, db: Session = Depends(get_db)):
    """Get complete user details with all accesses"""
    user = db.query(user_models.User).options(
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.company),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.plant),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.role),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.department),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.designation)
    ).filter(user_models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    companies_dict = {}
    for acc in user.company_accesses:
        if acc.company_id not in companies_dict:
            companies_dict[acc.company_id] = schemas.CompanyAccessInfo(
                company_id=acc.company_id,
                company_name=acc.company.company_name,
                is_primary=acc.is_primary_company
            )
    
    plants_dict = {}
    for acc in user.company_accesses:
        if acc.plant_id and acc.plant_id not in plants_dict:
            plants_dict[acc.plant_id] = schemas.PlantAccessInfo(
                plant_id=acc.plant_id,
                plant_name=acc.plant.plant_name,
                plant_code=acc.plant.plant_code,
                company_id=acc.company_id,
                company_name=acc.company.company_name,
                is_primary=acc.is_primary_plant
            )
    
    accesses = []
    for acc in user.company_accesses:
        accesses.append(schemas.UserCompanyAccessDetail(
            id=acc.id,
            company={
                "id": acc.company.id,
                "name": acc.company.company_name,
                "code": acc.company.company_code
            },
            plant={
                "id": acc.plant.id,
                "name": acc.plant.plant_name,
                "code": acc.plant.plant_code
            } if acc.plant else None,
            role={
                "id": acc.role.id,
                "name": acc.role.role_name,
                "code": acc.role.role_code
            },
            department={
                "id": acc.department.id,
                "name": acc.department.department_name,
                "code": acc.department.department_code
            },
            designation={
                "id": acc.designation.id,
                "name": acc.designation.designation_name,
                "code": acc.designation.designation_code
            },
            is_primary_company=acc.is_primary_company,
            is_primary_plant=acc.is_primary_plant,
            created_at=acc.created_at
        ))
    
    return schemas.UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        user_id=user.user_id,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        companies=list(companies_dict.values()),
        plants=list(plants_dict.values()),
        accesses=accesses
    )

# ==================== USER UPDATE ====================

@router.put("/users/{user_id}", response_model=dict)
async def update_user(
    user_id: int,
    full_name: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    user_login_id: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    db: Session = Depends(get_db)
):
    """Update user basic information"""
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if full_name:
        user.full_name = full_name.strip()
    
    if phone:
        phone = phone.strip()
        existing = db.query(user_models.User).filter(
            user_models.User.phone == phone,
            user_models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already in use")
        user.phone = phone
    
    if user_login_id:
        user_login_id = user_login_id.strip()
        existing = db.query(user_models.User).filter(
            user_models.User.user_id == user_login_id,
            user_models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="User ID already in use")
        user.user_id = user_login_id
    
    if is_active is not None:
        user.is_active = is_active
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "User updated successfully",
        "user_id": user.id,
        "full_name": user.full_name,
        "user_login_id": user.user_id
    }

@router.post("/users/{user_id}/reset-password", response_model=dict)
async def reset_password(user_id: int, db: Session = Depends(get_db)):
    """Generate new password for user"""
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_password = generate_password()
    user.password = hash_password(new_password)
    
    db.commit()
    
    try:
        email_service = get_email_service()
        email_sent = email_service.send_password_email(
            to_email=user.email,
            full_name=user.full_name,
            user_login_id=user.user_id,
            password=new_password,
            is_reset=True
        )
        
        if email_sent:
            message = "Password reset successfully. New credentials have been sent to the user's email."
        else:
            message = "Password reset successfully. (Email notification failed)"
    except Exception as e:
        print(f"Email service error: {str(e)}")
        message = "Password reset successfully. (Email service unavailable)"
    
    return {
        "message": message,
        "user_id": user.id,
        "email": user.email,
        "new_password": new_password
    }

# ==================== ACCESS MANAGEMENT ====================

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete user and all associated accesses"""
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_name = user.full_name
    db.delete(user)
    db.commit()
    
    return {"message": f"User '{user_name}' deleted successfully"}

@router.delete("/users/{user_id}/access/{access_id}")
async def delete_user_access(user_id: int, access_id: int, db: Session = Depends(get_db)):
    """
    Delete specific access entry.
    CANNOT DELETE PRIMARY COMPANY ACCESS - PRIMARY COMPANY IS IMMUTABLE.
    """
    access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.id == access_id,
        user_models.UserCompanyAccess.user_id == user_id
    ).first()
    
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    
    # 🔒 PREVENT DELETION OF PRIMARY COMPANY ACCESS
    if access.is_primary_company:
        raise HTTPException(
            status_code=403, 
            detail="Cannot remove primary company access. Primary company is immutable and cannot be changed."
        )
    
    db.delete(access)
    db.commit()
    
    return {"message": "Access removed successfully"}

# ==================== PRIMARY PLANT UPDATE (WITHIN PRIMARY COMPANY ONLY) ====================

@router.post("/users/{user_id}/update-primary-plant", response_model=dict)
async def update_primary_plant(
    user_id: int,
    new_primary_plant_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Update user's primary plant.
    Can ONLY set primary plant to plants that belong to the user's PRIMARY COMPANY.
    PRIMARY COMPANY itself cannot be changed.
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's primary company
    primary_company_access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.is_primary_company == True
    ).first()
    
    if not primary_company_access:
        raise HTTPException(status_code=404, detail="User has no primary company")
    
    primary_company_id = primary_company_access.company_id
    
    # Validate new primary plant exists and belongs to primary company
    new_plant = db.query(models.Plant).filter(
        models.Plant.id == new_primary_plant_id
    ).first()
    
    if not new_plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # 🔒 CRITICAL: Plant must belong to PRIMARY COMPANY
    if new_plant.company_id != primary_company_id:
        raise HTTPException(
            status_code=403, 
            detail=f"Can only set primary plant to plants within your primary company (ID: {primary_company_id}). This plant belongs to company ID: {new_plant.company_id}"
        )
    
    # Check if user has access to this plant
    plant_access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.plant_id == new_primary_plant_id
    ).first()
    
    if not plant_access:
        raise HTTPException(
            status_code=404, 
            detail="User doesn't have access to this plant. Please add access first."
        )
    
    # Remove primary flag from all other plants
    db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.is_primary_plant == True
    ).update({"is_primary_plant": False})
    
    # Set new primary plant
    plant_access.is_primary_plant = True
    
    # Update user_plants association table
    db.execute(
        user_models.user_plants.update().where(
            user_models.user_plants.c.user_id == user_id
        ).values(is_primary=False)
    )
    
    db.execute(
        user_models.user_plants.update().where(
            and_(
                user_models.user_plants.c.user_id == user_id,
                user_models.user_plants.c.plant_id == new_primary_plant_id
            )
        ).values(is_primary=True)
    )
    
    db.commit()
    
    return {
        "message": "Primary plant updated successfully",
        "user_id": user_id,
        "primary_company_id": primary_company_id,
        "primary_company_name": primary_company_access.company.company_name,
        "new_primary_plant_id": new_primary_plant_id,
        "new_primary_plant_name": new_plant.plant_name,
        "note": "Primary company remains unchanged and immutable"
    }

# ==================== GET PRIMARY COMPANY INFO ====================

@router.get("/users/{user_id}/primary-company")
async def get_user_primary_company(user_id: int, db: Session = Depends(get_db)):
    """
    Get user's primary company information.
    This is the IMMUTABLE primary company set during registration.
    """
    primary_access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.is_primary_company == True
    ).options(
        joinedload(user_models.UserCompanyAccess.company)
    ).first()
    
    if not primary_access:
        raise HTTPException(status_code=404, detail="User has no primary company")
    
    # Get all plants in primary company that user has access to
    primary_company_plants = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == primary_access.company_id,
        user_models.UserCompanyAccess.plant_id.isnot(None)
    ).options(
        joinedload(user_models.UserCompanyAccess.plant)
    ).all()
    
    current_primary_plant = None
    for acc in primary_company_plants:
        if acc.is_primary_plant:
            current_primary_plant = {
                "plant_id": acc.plant.id,
                "plant_name": acc.plant.plant_name,
                "plant_code": acc.plant.plant_code
            }
            break
    
    return {
        "user_id": user_id,
        "primary_company": {
            "company_id": primary_access.company_id,
            "company_name": primary_access.company.company_name,
            "company_code": primary_access.company.company_code,
            "is_immutable": True,
            "set_at_registration": True
        },
        "current_primary_plant": current_primary_plant,
        "available_plants_for_primary": [
            {
                "plant_id": acc.plant.id,
                "plant_name": acc.plant.plant_name,
                "plant_code": acc.plant.plant_code,
                "is_primary": acc.is_primary_plant
            } for acc in primary_company_plants
        ],
        "note": "Primary company cannot be changed. Primary plant can only be changed to plants within this primary company."
    }

# ==================== ADD ACCESS (NEW COMPANIES/PLANTS) ====================

@router.post("/users/{user_id}/add-access", response_model=dict)
async def add_user_access(
    user_id: int,
    company_id: int = Form(...),
    plant_id: Optional[int] = Form(None),
    is_primary_plant: bool = Form(False),
    db: Session = Depends(get_db)
):
    """
    Add new company/plant access to user.
    AUTOMATICALLY USES THE SAME ROLE/DEPT/DESG from user's existing access.
    Role/Department/Designation CANNOT be changed - they are immutable.
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 🔒 GET EXISTING ROLE/DEPT/DESG (All access records have same values)
    existing_access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id
    ).first()
    
    if not existing_access:
        raise HTTPException(
            status_code=404, 
            detail="User has no existing access. Cannot add new access without initial role/dept/desg."
        )
    
    # 🔒 USE LOCKED VALUES
    role_id = existing_access.role_id
    department_id = existing_access.department_id
    designation_id = existing_access.designation_id
    
    # Check if user already has a primary company
    existing_primary = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.is_primary_company == True
    ).first()
    
    # Validate company
    if not db.query(models.Company).filter(models.Company.id == company_id).first():
        raise HTTPException(status_code=400, detail="Invalid company")
    
    # Validate plant
    if plant_id and not db.query(models.Plant).filter(
        models.Plant.id == plant_id,
        models.Plant.company_id == company_id
    ).first():
        raise HTTPException(
            status_code=400, 
            detail="Invalid plant or plant doesn't belong to company"
        )
    
    # 🔒 If setting primary plant, ensure it's within primary company
    if is_primary_plant:
        if not existing_primary:
            raise HTTPException(
                status_code=400,
                detail="User has no primary company."
            )
        
        if plant_id:
            plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
            if plant.company_id != existing_primary.company_id:
                raise HTTPException(
                    status_code=403,
                    detail=f"Primary plant can only be set within primary company '{existing_primary.company.company_name}' (ID: {existing_primary.company_id})"
                )
    
    # Check for duplicate
    existing_duplicate = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == company_id,
        user_models.UserCompanyAccess.plant_id == plant_id
    ).first()
    
    if existing_duplicate:
        raise HTTPException(status_code=400, detail="This access already exists")
    
    # If setting as primary plant, remove primary flag from others
    if is_primary_plant:
        db.query(user_models.UserCompanyAccess).filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.is_primary_plant == True
        ).update({"is_primary_plant": False})
    
    # 🔒 CREATE NEW ACCESS WITH LOCKED ROLE/DEPT/DESG
    new_access = user_models.UserCompanyAccess(
        user_id=user_id,
        company_id=company_id,
        plant_id=plant_id,
        role_id=role_id,  # 🔒 Locked value
        department_id=department_id,  # 🔒 Locked value
        designation_id=designation_id,  # 🔒 Locked value
        is_primary_company=False,  # New companies cannot be primary
        is_primary_plant=is_primary_plant
    )
    
    db.add(new_access)
    db.commit()
    
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    dept = db.query(models.Department).filter(models.Department.id == department_id).first()
    desg = db.query(models.Designation).filter(models.Designation.id == designation_id).first()
    
    return {
        "message": "Access added successfully",
        "access_id": new_access.id,
        "locked_values_used": {
            "role": role.role_name,
            "department": dept.department_name,
            "designation": desg.designation_name
        },
        "note": "Role, Department, and Designation are locked and cannot be changed. They were automatically applied from user's registration data."
    }

@router.get("/users/{user_id}/role-info")
async def get_user_role_info(user_id: int, db: Session = Depends(get_db)):
    """
    Get user's role, department, designation info.
    These are IMMUTABLE and set at registration.
    """
    # Get any access record (all will have same role/dept/desg)
    access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id
    ).options(
        joinedload(user_models.UserCompanyAccess.role),
        joinedload(user_models.UserCompanyAccess.department),
        joinedload(user_models.UserCompanyAccess.designation)
    ).first()
    
    if not access:
        raise HTTPException(status_code=404, detail="User has no access configured")
    
    return {
        "user_id": user_id,
        "role": {
            "id": access.role.id,
            "role_name": access.role.role_name,
            "role_code": access.role.role_code
        },
        "department": {
            "id": access.department.id,
            "department_name": access.department.department_name,
            "department_code": access.department.department_code
        },
        "designation": {
            "id": access.designation.id,
            "designation_name": access.designation.designation_name,
            "designation_code": access.designation.designation_code
        },
        "note": "These values are immutable and set at registration time"
    }
@router.get("/users/filtered-by-access")
async def get_filtered_users_by_access(
    current_user_id: int = Query(..., description="Current user ID to filter by"),
    db: Session = Depends(get_db)
):
    """
    Get users that share at least one company or plant with the current user.
    Returns ONLY users who have access to companies/plants that current user also has access to.
    """
    
    # Step 1: Get current user's accessible companies and plants
    current_user_accesses = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == current_user_id
    ).all()
    
    if not current_user_accesses:
        return []  # Return empty array, not object
    
    # Extract current user's company and plant IDs
    current_user_company_ids = set()
    current_user_plant_ids = set()
    
    for access in current_user_accesses:
        current_user_company_ids.add(access.company_id)
        if access.plant_id:
            current_user_plant_ids.add(access.plant_id)
    
    print(f"🔍 Current User {current_user_id} has access to:")
    print(f"   Companies: {current_user_company_ids}")
    print(f"   Plants: {current_user_plant_ids}")
    
    # Step 2: Find all users who share at least one company or plant
    shared_access_query = db.query(user_models.UserCompanyAccess).filter(
        or_(
            user_models.UserCompanyAccess.company_id.in_(current_user_company_ids),
            user_models.UserCompanyAccess.plant_id.in_(current_user_plant_ids)
        ),
        user_models.UserCompanyAccess.user_id != current_user_id  # Exclude current user
    ).options(
        joinedload(user_models.UserCompanyAccess.user)
    )
    
    shared_accesses = shared_access_query.all()
    
    # Step 3: Build unique user list
    users_dict = {}
    
    for access in shared_accesses:
        user = access.user
        
        if user.id not in users_dict:
            # Get primary company for this user
            primary_company = None
            for user_access in user.company_accesses:
                if user_access.is_primary_company:
                    primary_company = user_access.company.company_name
                    break
            
            # Count unique companies and plants
            unique_companies = set(acc.company_id for acc in user.company_accesses)
            unique_plants = set(acc.plant_id for acc in user.company_accesses if acc.plant_id)
            
            users_dict[user.id] = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "user_id": user.user_id,
                "is_active": user.is_active,
                "total_companies": len(unique_companies),
                "total_plants": len(unique_plants),
                "primary_company": primary_company,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "shared_companies": [],
                "shared_plants": []
            }
        
        # Track which companies/plants are shared with current user
        if access.company_id in current_user_company_ids:
            if access.company_id not in users_dict[user.id]["shared_companies"]:
                users_dict[user.id]["shared_companies"].append(access.company_id)
        
        if access.plant_id and access.plant_id in current_user_plant_ids:
            if access.plant_id not in users_dict[user.id]["shared_plants"]:
                users_dict[user.id]["shared_plants"].append(access.plant_id)
    
    result = list(users_dict.values())
    
    print(f"✅ Found {len(result)} users sharing access with user {current_user_id}")
    
    # IMPORTANT: Return list directly, not wrapped in object
    return result




@router.get("/users/filtered-by-access-detailed")
async def get_filtered_users_with_access_intersection(
    current_user_id: int = Query(..., description="Current user ID to filter by"),
    db: Session = Depends(get_db)
):
    """
    🔥 NEW ENDPOINT: Get users filtered by current user's access
    Shows ONLY the companies/plants that current user has access to
    
    Example:
    - Current User: Company A (Plant 1, 2), Company B (Plant 3)
    - Target User: Company A (Plant 1, 2, 3, 4), Company B (Plant 3, 5), Company C (Plant 6)
    - Result: Shows Company A (Plant 1, 2), Company B (Plant 3) for target user
    """
    
    # Step 1: Get current user's accessible companies and plants
    current_user_accesses = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == current_user_id
    ).all()
    
    if not current_user_accesses:
        return []
    
    # Extract current user's accessible company and plant IDs
    current_user_company_ids = set()
    current_user_plant_ids = set()
    current_user_company_level_access = set()  # Companies with NULL plant (company-level access)
    
    for access in current_user_accesses:
        current_user_company_ids.add(access.company_id)
        if access.plant_id:
            current_user_plant_ids.add(access.plant_id)
        else:
            # Company-level access (plant_id is NULL)
            current_user_company_level_access.add(access.company_id)
    
    print(f"🔍 Current User {current_user_id} Access:")
    print(f"   Companies: {current_user_company_ids}")
    print(f"   Plants: {current_user_plant_ids}")
    print(f"   Company-level access: {current_user_company_level_access}")
    
    # Step 2: Find all users who share at least one company or plant
    shared_access_query = db.query(user_models.UserCompanyAccess).filter(
        or_(
            user_models.UserCompanyAccess.company_id.in_(current_user_company_ids),
            user_models.UserCompanyAccess.plant_id.in_(current_user_plant_ids)
        ),
        user_models.UserCompanyAccess.user_id != current_user_id  # Exclude current user
    ).options(
        joinedload(user_models.UserCompanyAccess.user),
        joinedload(user_models.UserCompanyAccess.company),
        joinedload(user_models.UserCompanyAccess.plant),
        joinedload(user_models.UserCompanyAccess.role),
        joinedload(user_models.UserCompanyAccess.department),
        joinedload(user_models.UserCompanyAccess.designation)
    ).all()
    
    # Step 3: Build filtered user data
    users_dict = {}
    
    for access in shared_access_query:
        user = access.user
        
        # 🔥 CHECK: Is this access visible to current user?
        is_visible = False
        
        # Case 1: Current user has company-level access to this company
        if access.company_id in current_user_company_level_access:
            is_visible = True
        
        # Case 2: Current user has access to this specific plant
        elif access.plant_id and access.plant_id in current_user_plant_ids:
            is_visible = True
        
        # Case 3: Both have company-level access to same company
        elif access.plant_id is None and access.company_id in current_user_company_ids:
            is_visible = True
        
        if not is_visible:
            continue  # Skip this access - current user can't see it
        
        # Initialize user entry
        if user.id not in users_dict:
            users_dict[user.id] = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "user_id": user.user_id,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "companies": {},
                "plants": {},
                "accesses": []
            }
        
        user_data = users_dict[user.id]
        
        # Add company info
        if access.company_id not in user_data["companies"]:
            user_data["companies"][access.company_id] = {
                "company_id": access.company_id,
                "company_name": access.company.company_name,
                "company_code": access.company.company_code,
                "is_primary": access.is_primary_company
            }
        
        # Add plant info
        if access.plant_id and access.plant_id not in user_data["plants"]:
            user_data["plants"][access.plant_id] = {
                "plant_id": access.plant_id,
                "plant_name": access.plant.plant_name,
                "plant_code": access.plant.plant_code,
                "company_id": access.company_id,
                "company_name": access.company.company_name,
                "is_primary": access.is_primary_plant
            }
        
        # Add access detail
        user_data["accesses"].append({
            "id": access.id,
            "company": {
                "id": access.company.id,
                "name": access.company.company_name,
                "code": access.company.company_code
            },
            "plant": {
                "id": access.plant.id,
                "name": access.plant.plant_name,
                "code": access.plant.plant_code
            } if access.plant else None,
            "role": {
                "id": access.role.id,
                "name": access.role.role_name,
                "code": access.role.role_code
            },
            "department": {
                "id": access.department.id,
                "name": access.department.department_name,
                "code": access.department.department_code
            },
            "designation": {
                "id": access.designation.id,
                "name": access.designation.designation_name,
                "code": access.designation.designation_code
            },
            "is_primary_company": access.is_primary_company,
            "is_primary_plant": access.is_primary_plant,
            "created_at": access.created_at.isoformat() if access.created_at else None
        })
    
    # Step 4: Convert to list and add computed fields
    result = []
    for user_data in users_dict.values():
        user_data["companies"] = list(user_data["companies"].values())
        user_data["plants"] = list(user_data["plants"].values())
        user_data["total_companies"] = len(user_data["companies"])
        user_data["total_plants"] = len(user_data["plants"])
        
        # Get primary company name
        primary_company = None
        for company in user_data["companies"]:
            if company["is_primary"]:
                primary_company = company["company_name"]
                break
        user_data["primary_company"] = primary_company
        
        result.append(user_data)
    
    print(f"✅ Returning {len(result)} filtered users with access intersection")
    
    return result


@router.get("/users/{user_id}/accessible-companies-plants")
async def get_user_accessible_companies_plants(user_id: int, db: Session = Depends(get_db)):
    """Get all companies and plants that a user has access to"""
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    accesses = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id
    ).options(
        joinedload(user_models.UserCompanyAccess.company),
        joinedload(user_models.UserCompanyAccess.plant)
    ).all()
    
    companies_dict = {}
    plants_list = []
    primary_company_id = None
    
    for acc in accesses:
        if acc.company_id not in companies_dict:
            companies_dict[acc.company_id] = {
                "id": acc.company.id,
                "company_name": acc.company.company_name,
                "company_code": acc.company.company_code,
                "is_primary": acc.is_primary_company
            }
        
        if acc.is_primary_company:
            primary_company_id = acc.company_id
        
        if acc.plant_id:
            plants_list.append({
                "id": acc.plant.id,
                "plant_name": acc.plant.plant_name,
                "plant_code": acc.plant.plant_code,
                "company_id": acc.company_id,
                "is_primary": acc.is_primary_plant
            })
    
    return {
        "user_id": user_id,
        "companies": list(companies_dict.values()),
        "plants": plants_list,
        "primary_company_id": primary_company_id
    }

# ==================== HELPER ENDPOINTS ====================

@router.get("/companies/{company_id}/plants-for-user")
async def get_plants_for_user_selection(company_id: int, db: Session = Depends(get_db)):
    """Get all plants for a company (for user assignment)"""
    plants = db.query(models.Plant).filter(
        models.Plant.company_id == company_id
    ).options(
        joinedload(models.Plant.plant_type)
    ).all()
    
    return [{
        "id": p.id,
        "plant_name": p.plant_name,
        "plant_code": p.plant_code,
        "company_id": p.company_id,
        "plant_type": p.plant_type.type_name if p.plant_type else None
    } for p in plants]


# ==================== HELPER ENDPOINTS ====================

@router.get("/users/by-company/{company_id}")
async def get_users_by_company(company_id: int, db: Session = Depends(get_db)):
    """Get all users with access to specific company, with primary company + dept info"""
    accesses = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.company_id == company_id
    ).options(
        joinedload(user_models.UserCompanyAccess.user),
        joinedload(user_models.UserCompanyAccess.department),
    ).all()

    users_set = set()
    result = []

    for acc in accesses:
        if acc.user_id not in users_set:
            users_set.add(acc.user_id)

            # Find primary company name for this user
            primary_access = db.query(user_models.UserCompanyAccess).filter(
                user_models.UserCompanyAccess.user_id == acc.user_id,
                user_models.UserCompanyAccess.is_primary_company == True
            ).options(
                joinedload(user_models.UserCompanyAccess.company),
                joinedload(user_models.UserCompanyAccess.department),
            ).first()

            primary_company_name = (
                primary_access.company.company_name if primary_access and primary_access.company else None
            )
            primary_dept_name = (
                primary_access.department.department_name if primary_access and primary_access.department else None
            )

            result.append({
                "user_id": acc.user.id,
                "full_name": acc.user.full_name,
                "email": acc.user.email,
                "is_active": acc.user.is_active,
                "primary_company": primary_company_name,
                "primary_dept": primary_dept_name,
            })

    return result

# ==================== PASSWORD UPDATE ENDPOINT ====================

@router.post("/users/update-password", response_model=dict)
async def update_user_password(
    user_id: int = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Update user password - For user self-service password change
    """
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long"
        )
    
    # Update password
    user.password = hash_password(new_password)
    user.updated_at = datetime.now()
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Password updated successfully",
        "user_id": user.id,
        "email": user.email,
        "updated_at": user.updated_at.isoformat()
    }
@router.get("/users-with-accesses", response_model=List[dict])
async def get_users_with_detailed_accesses(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    ✅ REACT-COMPATIBLE USER DATA WITH ACCESSES
    Returns proper JSON structure that frontend expects
    Fixed to ensure all data is properly serialized
    """
    from sqlalchemy.orm import joinedload
    
    query = db.query(user_models.User).options(
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.company),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.plant),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.role),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.department),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.designation)
    )
    
    if is_active is not None:
        query = query.filter(user_models.User.is_active == is_active)
    
    users = query.order_by(user_models.User.full_name).all()
    
    result = []
    for user in users:
        # Count unique companies and plants
        unique_companies = set()
        unique_plants = set()
        
        for access in user.company_accesses:
            if access.company_id:
                unique_companies.add(access.company_id)
            if access.plant_id:
                unique_plants.add(access.plant_id)
        
        # ✅ BUILD ACCESSES WITH REACT-COMPATIBLE FIELD NAMES
        accesses_list = []
        for access in user.company_accesses:
            # ✅ CRITICAL FIX: Use "name" field for ALL entities
            access_detail = {
                "id": access.id,
                "company": {
                    "id": access.company.id,
                    "name": access.company.company_name,  # ✅ Frontend expects .name
                    "code": access.company.company_code,
                    "company_name": access.company.company_name  # ✅ Fallback for safety
                } if access.company else None,
                "plant": {
                    "id": access.plant.id,
                    "name": access.plant.plant_name,  # ✅ Frontend expects .name
                    "code": access.plant.plant_code,
                    "plant_name": access.plant.plant_name  # ✅ Fallback for safety
                } if access.plant else None,
                "role": {
                    "id": access.role.id,
                    "name": access.role.role_name,  # ✅ Frontend expects .name
                    "role_name": access.role.role_name  # ✅ Fallback for safety
                } if access.role else None,
                "department": {
                    "id": access.department.id,
                    "name": access.department.department_name,  # ✅ Frontend expects .name
                    "department_name": access.department.department_name  # ✅ Fallback for safety
                } if access.department else None,
                "designation": {
                    "id": access.designation.id,
                    "name": access.designation.designation_name,  # ✅ Frontend expects .name
                    "designation_name": access.designation.designation_name  # ✅ Fallback for safety
                } if access.designation else None,
                "is_primary_company": access.is_primary_company,
                "is_primary_plant": access.is_primary_plant,
                "created_at": access.created_at.isoformat() if access.created_at else None
            }
            accesses_list.append(access_detail)
        
        result.append({
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "user_id": user.user_id,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "total_companies": len(unique_companies),
            "total_plants": len(unique_plants),
            "accesses": accesses_list  # ✅ This is the key - properly structured!
        })
    
    return result


# ✅ ADDITIONAL DEBUG ENDPOINT - Add this to help troubleshoot
@router.get("/debug/users-data-structure", response_model=dict)
async def debug_users_data_structure(db: Session = Depends(get_db)):
    """
    Debug endpoint to check exact data structure being sent
    """
    from sqlalchemy.orm import joinedload
    
    users = db.query(user_models.User).options(
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.company),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.plant),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.role),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.department),
        joinedload(user_models.User.company_accesses).joinedload(user_models.UserCompanyAccess.designation)
    ).limit(1).all()
    
    if not users:
        return {"message": "No users found", "sample_structure": None}
    
    user = users[0]
    
    sample_access = None
    if user.company_accesses:
        access = user.company_accesses[0]
        sample_access = {
            "id": access.id,
            "company": {
                "id": access.company.id if access.company else None,
                "name": access.company.company_name if access.company else None,
                "code": access.company.company_code if access.company else None
            },
            "plant": {
                "id": access.plant.id if access.plant else None,
                "name": access.plant.plant_name if access.plant else None,
                "code": access.plant.plant_code if access.plant else None
            } if access.plant else None,
            "role": {
                "id": access.role.id if access.role else None,
                "name": access.role.role_name if access.role else None
            },
            "department": {
                "id": access.department.id if access.department else None,
                "name": access.department.department_name if access.department else None
            },
            "designation": {
                "id": access.designation.id if access.designation else None,
                "name": access.designation.designation_name if access.designation else None
            }
        }
    
    return {
        "total_users": db.query(user_models.User).count(),
        "sample_user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "total_accesses": len(user.company_accesses),
            "accesses": [sample_access] if sample_access else []
        },
        "message": "Check console for structure"
    }