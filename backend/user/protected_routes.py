"""user/protected_routes.py - User Data Access with Authentication"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List

from database import get_db
from user import user_models, user_schemas
from user.auth_middleware import get_current_user, get_user_companies, get_user_plants

router = APIRouter()

# ==================== GET CURRENT USER PROFILE ====================

@router.get("/profile/me", response_model=user_schemas.UserResponse)
async def get_my_profile(
    current_user: user_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current logged-in user's complete profile
    🔒 Protected - Requires authentication token
    """
    user = db.query(user_models.User).options(
        joinedload(user_models.User.company_accesses).joinedload(user_models.user_models.UserCompanyAccess.company),
        joinedload(user_models.User.company_accesses).joinedload(user_models.user_models.UserCompanyAccess.plant),
        joinedload(user_models.User.company_accesses).joinedload(user_models.user_models.UserCompanyAccess.role),
        joinedload(user_models.User.company_accesses).joinedload(user_models.user_models.UserCompanyAccess.department),
        joinedload(user_models.User.company_accesses).joinedload(user_models.user_models.UserCompanyAccess.designation)
    ).filter(user_models.User.id == current_user.id).first()
    
    # Build response
    companies_dict = {}
    for acc in user.company_accesses:
        if acc.company_id not in companies_dict:
            companies_dict[acc.company_id] = user_schemas.CompanyAccessInfo(
                company_id=acc.company_id,
                company_name=acc.company.company_name,
                is_primary=acc.is_primary_company
            )
    
    plants_dict = {}
    for acc in user.company_accesses:
        if acc.plant_id and acc.plant_id not in plants_dict:
            plants_dict[acc.plant_id] = user_schemas.PlantAccessInfo(
                plant_id=acc.plant_id,
                plant_name=acc.plant.plant_name,
                plant_code=acc.plant.plant_code,
                company_id=acc.company_id,
                company_name=acc.company.company_name,
                is_primary=acc.is_primary_plant
            )
    
    accesses = []
    for acc in user.company_accesses:
        accesses.append(user_schemas.UserCompanyAccessDetail(
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
    
    return user_schemas.UserResponse(
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

# ==================== GET USER'S COMPANIES ====================

@router.get("/profile/my-companies")
async def get_my_companies(
    current_user: user_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all companies accessible by current user
    🔒 Protected - Returns only current user's companies
    """
    company_ids = get_user_companies(current_user, db)
    
    from db_models import Company
    companies = db.query(Company).filter(Company.id.in_(company_ids)).all()
    
    # Get primary company
    from user.user_models import UserCompanyAccess
    primary_access = db.query(UserCompanyAccess).filter(
        UserCompanyAccess.user_id == current_user.id,
        UserCompanyAccess.is_primary_company == True
    ).first()
    
    return {
        "user_id": current_user.id,
        "total_companies": len(companies),
        "primary_company_id": primary_access.company_id if primary_access else None,
        "companies": [
            {
                "id": c.id,
                "company_name": c.company_name,
                "company_code": c.company_code,
                "is_primary": c.id == (primary_access.company_id if primary_access else None)
            }
            for c in companies
        ]
    }

# ==================== GET USER'S PLANTS ====================

@router.get("/profile/my-plants")
async def get_my_plants(
    current_user: user_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all plants accessible by current user
    🔒 Protected - Returns only current user's plants
    """
    plant_ids = get_user_plants(current_user, db)
    
    from db_models import Plant
    plants = db.query(Plant).filter(Plant.id.in_(plant_ids)).options(
        joinedload(Plant.company)
    ).all()
    
    # Get primary plant
    from user.user_models import UserCompanyAccess
    primary_access = db.query(UserCompanyAccess).filter(
        UserCompanyAccess.user_id == current_user.id,
        UserCompanyAccess.is_primary_plant == True
    ).first()
    
    return {
        "user_id": current_user.id,
        "total_plants": len(plants),
        "primary_plant_id": primary_access.plant_id if primary_access else None,
        "plants": [
            {
                "id": p.id,
                "plant_name": p.plant_name,
                "plant_code": p.plant_code,
                "company_id": p.company_id,
                "company_name": p.company.company_name,
                "is_primary": p.id == (primary_access.plant_id if primary_access else None)
            }
            for p in plants
        ]
    }

# ==================== GET USER'S ACCESSIBLE PAGES (RBAC) ====================

@router.get("/profile/my-accessible-pages")
async def get_my_accessible_pages(
    current_user: user_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all pages/features accessible by current user based on RBAC
    🔒 Protected - Returns current user's page access
    """
    from role.role_models import CompanyRolePageAccess
    from user.user_models import UserCompanyAccess
    
    # Get user's access records
    user_accesses = db.query(UserCompanyAccess).filter(
        UserCompanyAccess.user_id == current_user.id
    ).all()
    
    # Collect all accessible pages
    all_pages = {}
    
    for access in user_accesses:
        # Query RBAC for this combination
        page_accesses = db.query(CompanyRolePageAccess).filter(
            CompanyRolePageAccess.company_id == access.company_id,
            CompanyRolePageAccess.role_id == access.role_id,
            CompanyRolePageAccess.department_id == access.department_id,
            CompanyRolePageAccess.designation_id == access.designation_id,
            CompanyRolePageAccess.is_granted == True
        ).options(
            joinedload(CompanyRolePageAccess.page),
            joinedload(CompanyRolePageAccess.permission)
        ).all()
        
        for page_acc in page_accesses:
            page = page_acc.page
            if not page.is_active:
                continue
            
            page_key = f"{access.company_id}_{page.id}"
            
            if page_key not in all_pages:
                all_pages[page_key] = {
                    "page_id": page.id,
                    "page_name": page.page_name,
                    "page_url": page.page_url,
                    "company_id": access.company_id,
                    "permissions": set()
                }
            
            all_pages[page_key]["permissions"].add(page_acc.permission.permission_type)
    
    # Convert sets to lists
    result = []
    for page_data in all_pages.values():
        page_data["permissions"] = list(page_data["permissions"])
        result.append(page_data)
    
    return {
        "user_id": current_user.id,
        "total_accessible_pages": len(result),
        "pages": result
    }

# ==================== CHECK USER PERMISSION ====================

@router.get("/profile/check-permission")
async def check_my_permission(
    company_id: int,
    page_url: str,
    permission_type: str,
    current_user: user_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if current user has specific permission for a page
    🔒 Protected - Checks current user's permission
    """
    from role.role_models import CompanyRolePageAccess, Page, Permission
    from user.user_models import UserCompanyAccess
    
    # Get user's access for this company
    user_access = db.query(UserCompanyAccess).filter(
        UserCompanyAccess.user_id == current_user.id,
        UserCompanyAccess.company_id == company_id
    ).first()
    
    if not user_access:
        return {
            "has_permission": False,
            "reason": "No access to this company"
        }
    
    # Get page
    page = db.query(Page).filter(Page.page_url == page_url).first()
    if not page or not page.is_active:
        return {
            "has_permission": False,
            "reason": "Page not found or inactive"
        }
    
    # Get permission
    permission = db.query(Permission).filter(
        Permission.permission_type == permission_type
    ).first()
    if not permission:
        return {
            "has_permission": False,
            "reason": "Permission type not found"
        }
    
    # Check RBAC
    access = db.query(CompanyRolePageAccess).filter(
        CompanyRolePageAccess.company_id == company_id,
        CompanyRolePageAccess.role_id == user_access.role_id,
        CompanyRolePageAccess.department_id == user_access.department_id,
        CompanyRolePageAccess.designation_id == user_access.designation_id,
        CompanyRolePageAccess.page_id == page.id,
        CompanyRolePageAccess.permission_id == permission.id,
        CompanyRolePageAccess.is_granted == True
    ).first()
    
    return {
        "has_permission": access is not None,
        "user_id": current_user.id,
        "company_id": company_id,
        "page_url": page_url,
        "permission_type": permission_type
    }

# ==================== UPDATE MY PROFILE ====================

@router.put("/profile/update")
async def update_my_profile(
    full_name: str = None,
    phone: str = None,
    current_user: user_models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile
    🔒 Protected - Users can only update their own profile
    """
    if full_name:
        current_user.full_name = full_name.strip()
    
    if phone:
        phone = phone.strip()
        # Check if phone already taken by another user
        existing = db.query(user_models.User).filter(
            user_models.User.phone == phone,
            user_models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already in use")
        current_user.phone = phone
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Profile updated successfully",
        "user": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "phone": current_user.phone
        }
    }