"""role/role_rbac_routes.py - Complete RBAC API Routes - FIXED"""
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional
import json
import re

from database import get_db
import db_models as models
from role import role_models as rbac_models
from role import role_schemas as schemas
from user import user_models

router = APIRouter()

# ==================== UTILITY FUNCTIONS ====================

def generate_code(name: str, prefix: str = "PAGE", length: int = 6) -> str:
    """Generate unique code"""
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', name).upper()
    code = f"{prefix}-{clean_name[:length]}"
    return code

# ==================== PAGE MANAGEMENT ====================

@router.get("/pages", response_model=List[schemas.PageResponse])
async def get_all_pages(
    is_active: Optional[bool] = None,
    parent_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all pages with optional filters"""
    query = db.query(rbac_models.Page)
    
    if is_active is not None:
        query = query.filter(rbac_models.Page.is_active == is_active)
    
    if parent_id is not None:
        query = query.filter(rbac_models.Page.parent_page_id == parent_id)
    
    return query.order_by(rbac_models.Page.display_order, rbac_models.Page.page_name).all()


@router.post("/pages", response_model=schemas.PageResponse)
async def create_page(
    page_name: str = Form(...),
    page_url: str = Form(...),
    icon_name: Optional[str] = Form(None),
    parent_page_id: Optional[int] = Form(None),
    display_order: int = Form(0),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Create new page/module"""
    existing = db.query(rbac_models.Page).filter(
        rbac_models.Page.page_url == page_url
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Page URL already exists")
    
    page_code = generate_code(page_name, "PAGE", 6)
    counter = 1
    while db.query(rbac_models.Page).filter(rbac_models.Page.page_code == page_code).first():
        page_code = generate_code(f"{page_name}{counter}", "PAGE", 6)
        counter += 1
    
    if parent_page_id:
        parent = db.query(rbac_models.Page).filter(rbac_models.Page.id == parent_page_id).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent page not found")
    
    db_page = rbac_models.Page(
        page_name=page_name.strip(),
        page_code=page_code,
        page_url=page_url.strip(),
        icon_name=icon_name.strip() if icon_name else None,
        parent_page_id=parent_page_id,
        display_order=display_order,
        description=description,
        is_active=True
    )
    
    db.add(db_page)
    db.commit()
    db.refresh(db_page)
    
    return db_page


@router.put("/pages/{page_id}", response_model=schemas.PageResponse)
async def update_page(
    page_id: int,
    page_name: Optional[str] = Form(None),
    page_url: Optional[str] = Form(None),
    icon_name: Optional[str] = Form(None),
    parent_page_id: Optional[int] = Form(None),
    display_order: Optional[int] = Form(None),
    is_active: Optional[bool] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Update existing page"""
    page = db.query(rbac_models.Page).filter(rbac_models.Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    if page_name:
        page.page_name = page_name.strip()
    if page_url:
        page.page_url = page_url.strip()
    if icon_name:
        page.icon_name = icon_name.strip()
    if parent_page_id is not None:
        page.parent_page_id = parent_page_id
    if display_order is not None:
        page.display_order = display_order
    if is_active is not None:
        page.is_active = is_active
    if description is not None:
        page.description = description
    
    db.commit()
    db.refresh(page)
    return page


@router.delete("/pages/{page_id}")
async def delete_page(page_id: int, db: Session = Depends(get_db)):
    """Delete page and all its permissions"""
    page = db.query(rbac_models.Page).filter(rbac_models.Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    page_name = page.page_name
    db.delete(page)
    db.commit()
    
    return {"message": f"Page '{page_name}' deleted successfully"}


# ==================== PAGE PERMISSIONS ====================

@router.post("/pages/{page_id}/permissions", response_model=schemas.PagePermissionResponse)
async def add_page_permission(
    page_id: int,
    permission_type: str = Form(...),
    db: Session = Depends(get_db)
):
    """Add permission type to a page"""
    page = db.query(rbac_models.Page).filter(rbac_models.Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    existing = db.query(rbac_models.PagePermission).filter(
        rbac_models.PagePermission.page_id == page_id,
        rbac_models.PagePermission.permission_type == permission_type.upper()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Permission already exists for this page")
    
    permission = rbac_models.PagePermission(
        page_id=page_id,
        permission_type=permission_type.upper(),
        is_enabled=True
    )
    
    db.add(permission)
    db.commit()
    db.refresh(permission)
    
    return permission


@router.get("/pages/{page_id}/permissions", response_model=List[schemas.PagePermissionResponse])
async def get_page_permissions(page_id: int, db: Session = Depends(get_db)):
    """Get all permissions for a page"""
    return db.query(rbac_models.PagePermission).filter(
        rbac_models.PagePermission.page_id == page_id
    ).all()


@router.delete("/page-permissions/{permission_id}")
async def delete_page_permission(permission_id: int, db: Session = Depends(get_db)):
    """Delete page permission"""
    permission = db.query(rbac_models.PagePermission).filter(
        rbac_models.PagePermission.id == permission_id
    ).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    db.delete(permission)
    db.commit()
    
    return {"message": "Permission deleted successfully"}


# ==================== RBAC ACCESS MANAGEMENT ====================

@router.post("/grant-access", response_model=dict)
async def grant_page_access(
    company_id: int = Form(...),
    role_id: int = Form(...),
    department_id: int = Form(...),
    designation_id: int = Form(...),
    page_permissions_json: str = Form(...),
    db: Session = Depends(get_db)
):
    """Grant page access to Company -> Role -> Department -> Designation"""
    if not db.query(models.Company).filter(models.Company.id == company_id).first():
        raise HTTPException(status_code=400, detail="Invalid company")
    if not db.query(models.Role).filter(models.Role.id == role_id).first():
        raise HTTPException(status_code=400, detail="Invalid role")
    if not db.query(models.Department).filter(models.Department.id == department_id).first():
        raise HTTPException(status_code=400, detail="Invalid department")
    if not db.query(models.Designation).filter(models.Designation.id == designation_id).first():
        raise HTTPException(status_code=400, detail="Invalid designation")
    
    try:
        page_permissions = json.loads(page_permissions_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid page_permissions format")
    
    created_count = 0
    skipped_count = 0
    
    for item in page_permissions:
        page_id = item.get("page_id")
        permission_ids = item.get("permission_ids", [])
        
        page = db.query(rbac_models.Page).filter(rbac_models.Page.id == page_id).first()
        if not page:
            continue
        
        for perm_id in permission_ids:
            permission = db.query(rbac_models.PagePermission).filter(
                rbac_models.PagePermission.id == perm_id,
                rbac_models.PagePermission.page_id == page_id
            ).first()
            
            if not permission:
                continue
            
            existing = db.query(rbac_models.CompanyRolePageAccess).filter(
                rbac_models.CompanyRolePageAccess.company_id == company_id,
                rbac_models.CompanyRolePageAccess.role_id == role_id,
                rbac_models.CompanyRolePageAccess.department_id == department_id,
                rbac_models.CompanyRolePageAccess.designation_id == designation_id,
                rbac_models.CompanyRolePageAccess.page_id == page_id,
                rbac_models.CompanyRolePageAccess.permission_id == perm_id
            ).first()
            
            if existing:
                existing.is_granted = True
                skipped_count += 1
            else:
                access = rbac_models.CompanyRolePageAccess(
                    company_id=company_id,
                    role_id=role_id,
                    department_id=department_id,
                    designation_id=designation_id,
                    page_id=page_id,
                    permission_id=perm_id,
                    is_granted=True
                )
                db.add(access)
                created_count += 1
    
    db.commit()
    
    return {
        "message": "Access granted successfully",
        "created": created_count,
        "updated": skipped_count
    }


@router.get("/company-roles/{company_id}")
async def get_company_unique_roles(company_id: int, db: Session = Depends(get_db)):
    """Get unique roles, departments, designations for a company"""
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
                "role_name": access.role.role_name
            }
        
        if access.department_id not in departments_dict:
            departments_dict[access.department_id] = {
                "id": access.department.id,
                "department_name": access.department.department_name
            }
        
        if access.designation_id not in designations_dict:
            designations_dict[access.designation_id] = {
                "id": access.designation.id,
                "designation_name": access.designation.designation_name
            }
    
    return {
        "roles": list(roles_dict.values()),
        "departments": list(departments_dict.values()),
        "designations": list(designations_dict.values())
    }


@router.get("/access-by-role")
async def get_access_by_role(
    company_id: int,
    role_id: int,
    department_id: int,
    designation_id: int,
    db: Session = Depends(get_db)
):
    """Get all granted access for specific Role-Dept-Designation in a company"""
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
    
    result = []
    for access in accesses:
        result.append({
            "access_id": access.id,
            "page_id": access.page_id,
            "page_name": access.page.page_name,
            "permission_id": access.permission_id,
            "permission_type": access.permission.permission_type
        })
    
    return result


@router.delete("/revoke-access/{access_id}")
async def revoke_page_access(access_id: int, db: Session = Depends(get_db)):
    """Revoke specific page permission access"""
    access = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.id == access_id
    ).first()
    
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    
    db.delete(access)
    db.commit()
    
    return {"message": "Access revoked successfully"}


# ==================== 🔥 FIXED: USER ACCESSIBLE MENU (SINGLE ENDPOINT) ====================

@router.get("/users/{user_id}/accessible-menu")
async def get_user_accessible_menu(
    user_id: int,
    company_id: int,
    db: Session = Depends(get_db)
):
    """
    Get complete menu structure accessible to user with debug logging
    """
    
    print(f"\n{'='*80}")
    print(f"🔍 [ACCESSIBLE MENU] Request for User ID: {user_id}, Company ID: {company_id}")
    print(f"{'='*80}")
    
    user_access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == company_id
    ).first()
    
    if not user_access:
        print(f"❌ ERROR: User {user_id} doesn't have access to company {company_id}")
        raise HTTPException(
            status_code=404, 
            detail=f"User doesn't have access to company ID {company_id}"
        )
    
    print(f"✅ User Access Found:")
    print(f"   - Company ID: {user_access.company_id}")
    print(f"   - Role ID: {user_access.role_id}")
    print(f"   - Department ID: {user_access.department_id}")
    print(f"   - Designation ID: {user_access.designation_id}")
    
    exact_match_query = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.company_id == company_id,
        rbac_models.CompanyRolePageAccess.role_id == user_access.role_id,
        rbac_models.CompanyRolePageAccess.department_id == user_access.department_id,
        rbac_models.CompanyRolePageAccess.designation_id == user_access.designation_id,
        rbac_models.CompanyRolePageAccess.is_granted == True
    )
    
    exact_match_count = exact_match_query.count()
    print(f"   Exact match records found: {exact_match_count}")
    
    if exact_match_count == 0:
        print(f"\n⚠️  WARNING: No pages granted to this role/dept/desg combination")
        
        return {
            "user_id": user_id,
            "company_id": company_id,
            "role": {
                "id": user_access.role.id,
                "name": user_access.role.role_name
            },
            "department": {
                "id": user_access.department.id,
                "name": user_access.department.department_name
            },
            "designation": {
                "id": user_access.designation.id,
                "name": user_access.designation.designation_name
            },
            "total_pages": 0,
            "menu": [],
            "debug_info": {
                "error": "No pages granted to this role/dept/desg combination",
                "user_ids": {
                    "company_id": company_id,
                    "role_id": user_access.role_id,
                    "department_id": user_access.department_id,
                    "designation_id": user_access.designation_id
                },
                "suggestion": "Please grant access using RoleAccessForCompaniesPlant page with these exact IDs"
            }
        }
    
    accesses = exact_match_query.options(
        joinedload(rbac_models.CompanyRolePageAccess.page),
        joinedload(rbac_models.CompanyRolePageAccess.permission)
    ).all()
    
    print(f"   Total access records retrieved: {len(accesses)}")
    
    pages_dict = {}
    for access in accesses:
        page = access.page
        if not page.is_active:
            continue
        
        if page.id not in pages_dict:
            pages_dict[page.id] = {
                "id": page.id,
                "page_name": page.page_name,
                "page_url": page.page_url,
                "page_code": page.page_code,
                "icon_name": page.icon_name,
                "parent_page_id": page.parent_page_id,
                "display_order": page.display_order,
                "description": page.description,
                "permissions": []
            }
            print(f"   ✅ Added page: {page.page_name} (ID: {page.id})")
        
        if access.permission.permission_type not in pages_dict[page.id]["permissions"]:
            pages_dict[page.id]["permissions"].append(access.permission.permission_type)
    
    all_pages = sorted(pages_dict.values(), key=lambda x: x["display_order"])
    
    def build_hierarchy(pages, parent_id=None):
        result = []
        for page in pages:
            if page["parent_page_id"] == parent_id:
                children = build_hierarchy(pages, page["id"])
                page_copy = page.copy()
                if children:
                    page_copy["children"] = children
                result.append(page_copy)
        return result
    
    menu_structure = build_hierarchy(all_pages)
    
    print(f"✅ [SUCCESS] Returning menu with {len(all_pages)} total pages\n")
    
    return {
        "user_id": user_id,
        "company_id": company_id,
        "role": {
            "id": user_access.role.id,
            "name": user_access.role.role_name
        },
        "department": {
            "id": user_access.department.id,
            "name": user_access.department.department_name
        },
        "designation": {
            "id": user_access.designation.id,
            "name": user_access.designation.designation_name
        },
        "total_pages": len(all_pages),
        "menu": menu_structure
    }


# ==================== DEBUG ENDPOINT ====================

@router.get("/debug/user-access/{user_id}")
async def debug_user_access(
    user_id: int,
    company_id: int,
    db: Session = Depends(get_db)
):
    """Debug endpoint to check user's access setup"""
    
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        return {"error": "User not found"}
    
    user_access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == company_id
    ).first()
    
    if not user_access:
        return {
            "error": "User has no access to this company",
            "user_id": user_id,
            "company_id": company_id
        }
    
    rbac_access = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.company_id == company_id,
        rbac_models.CompanyRolePageAccess.role_id == user_access.role_id,
        rbac_models.CompanyRolePageAccess.department_id == user_access.department_id,
        rbac_models.CompanyRolePageAccess.designation_id == user_access.designation_id
    ).count()
    
    total_pages = db.query(rbac_models.Page).filter(
        rbac_models.Page.is_active == True
    ).count()
    
    return {
        "user_info": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email
        },
        "user_access": {
            "company_id": user_access.company_id,
            "company_name": user_access.company.company_name,
            "role_id": user_access.role_id,
            "role_name": user_access.role.role_name,
            "department_id": user_access.department_id,
            "department_name": user_access.department.department_name,
            "designation_id": user_access.designation_id,
            "designation_name": user_access.designation.designation_name
        },
        "rbac_status": {
            "pages_granted_to_this_combo": rbac_access,
            "total_pages_in_system": total_pages,
            "has_access": rbac_access > 0
        },
        "next_steps": {
            "if_no_access": "Go to RoleAccessForCompaniesPlant page and grant access using the exact IDs shown in user_access above",
            "required_ids": {
                "company_id": user_access.company_id,
                "role_id": user_access.role_id,
                "department_id": user_access.department_id,
                "designation_id": user_access.designation_id
            }
        }
    }


# ==================== OTHER ENDPOINTS ====================

@router.get("/users/{user_id}/accessible-pages")
async def get_user_accessible_pages(
    user_id: int,
    company_id: int,
    db: Session = Depends(get_db)
):
    """Get all pages accessible to user in a specific company"""
    user_access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == company_id
    ).first()
    
    if not user_access:
        raise HTTPException(status_code=404, detail="User doesn't have access to this company")
    
    accesses = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.company_id == company_id,
        rbac_models.CompanyRolePageAccess.role_id == user_access.role_id,
        rbac_models.CompanyRolePageAccess.department_id == user_access.department_id,
        rbac_models.CompanyRolePageAccess.designation_id == user_access.designation_id,
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
                "icon_name": page.icon_name,
                "parent_page_id": page.parent_page_id,
                "display_order": page.display_order,
                "permissions": []
            }
        
        pages_dict[page.id]["permissions"].append(access.permission.permission_type)
    
    pages_list = list(pages_dict.values())
    
    return {
        "user_id": user_id,
        "company_id": company_id,
        "total_pages": len(pages_list),
        "pages": sorted(pages_list, key=lambda x: x["display_order"])
    }


@router.post("/users/{user_id}/check-permission")
async def check_user_permission(
    user_id: int,
    company_id: int = Form(...),
    page_url: str = Form(...),
    permission_type: str = Form(...),
    db: Session = Depends(get_db)
):
    """Check if user has specific permission"""
    user_access = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == company_id
    ).first()
    
    if not user_access:
        return {"has_permission": False, "reason": "No company access"}
    
    page = db.query(rbac_models.Page).filter(
        rbac_models.Page.page_url == page_url,
        rbac_models.Page.is_active == True
    ).first()
    
    if not page:
        return {"has_permission": False, "reason": "Page not found"}
    
    permission = db.query(rbac_models.PagePermission).filter(
        rbac_models.PagePermission.page_id == page.id,
        rbac_models.PagePermission.permission_type == permission_type.upper()
    ).first()
    
    if not permission:
        return {"has_permission": False, "reason": "Permission not defined for page"}
    
    access = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.company_id == company_id,
        rbac_models.CompanyRolePageAccess.role_id == user_access.role_id,
        rbac_models.CompanyRolePageAccess.department_id == user_access.department_id,
        rbac_models.CompanyRolePageAccess.designation_id == user_access.designation_id,
        rbac_models.CompanyRolePageAccess.page_id == page.id,
        rbac_models.CompanyRolePageAccess.permission_id == permission.id,
        rbac_models.CompanyRolePageAccess.is_granted == True
    ).first()
    
    return {
        "has_permission": access is not None,
        "page_name": page.page_name,
        "permission_type": permission_type.upper()
    }


@router.post("/bulk-grant-pages")
async def bulk_grant_pages(
    company_id: int = Form(...),
    role_id: int = Form(...),
    department_id: int = Form(...),
    designation_id: int = Form(...),
    page_ids: str = Form(...),
    grant_all_permissions: bool = Form(True),
    db: Session = Depends(get_db)
):
    """Bulk grant all permissions for multiple pages"""
    try:
        page_id_list = json.loads(page_ids)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid page_ids format")
    
    created_count = 0
    
    for page_id in page_id_list:
        permissions = db.query(rbac_models.PagePermission).filter(
            rbac_models.PagePermission.page_id == page_id,
            rbac_models.PagePermission.is_enabled == True
        ).all()
        
        for permission in permissions:
            existing = db.query(rbac_models.CompanyRolePageAccess).filter(
                rbac_models.CompanyRolePageAccess.company_id == company_id,
                rbac_models.CompanyRolePageAccess.role_id == role_id,
                rbac_models.CompanyRolePageAccess.department_id == department_id,
                rbac_models.CompanyRolePageAccess.designation_id == designation_id,
                rbac_models.CompanyRolePageAccess.page_id == page_id,
                rbac_models.CompanyRolePageAccess.permission_id == permission.id
            ).first()
            
            if not existing:
                access = rbac_models.CompanyRolePageAccess(
                    company_id=company_id,
                    role_id=role_id,
                    department_id=department_id,
                    designation_id=designation_id,
                    page_id=page_id,
                    permission_id=permission.id,
                    is_granted=True
                )
                db.add(access)
                created_count += 1
    
    db.commit()
    
    return {
        "message": "Bulk access granted successfully",
        "total_permissions_granted": created_count
    }


# ==================== HELPER ENDPOINTS ====================

@router.get("/pages/hierarchy")
async def get_page_hierarchy(db: Session = Depends(get_db)):
    """Get complete page hierarchy for admin UI"""
    all_pages = db.query(rbac_models.Page).filter(
        rbac_models.Page.is_active == True
    ).order_by(rbac_models.Page.display_order).all()
    
    # Build tree
    pages_dict = {}
    root_pages = []
    
    for page in all_pages:
        page_data = {
            "id": page.id,
            "page_name": page.page_name,
            "page_url": page.page_url,
            "icon_name": page.icon_name,
            "display_order": page.display_order,
            "parent_page_id": page.parent_page_id,
            "children": []
        }
        pages_dict[page.id] = page_data
        
        if page.parent_page_id is None:
            root_pages.append(page_data)
    
    # Link children to parents
    for page in all_pages:
        if page.parent_page_id and page.parent_page_id in pages_dict:
            pages_dict[page.parent_page_id]["children"].append(pages_dict[page.id])
    
    return root_pages


@router.get("/pages-with-permissions")
async def get_pages_with_permissions(db: Session = Depends(get_db)):
    """
    Get all pages with their available permissions
    Perfect for building the permission selection UI
    """
    pages = db.query(rbac_models.Page).filter(
        rbac_models.Page.is_active == True
    ).order_by(rbac_models.Page.page_name).all()
    
    result = []
    for page in pages:
        permissions = db.query(rbac_models.PagePermission).filter(
            rbac_models.PagePermission.page_id == page.id,
            rbac_models.PagePermission.is_enabled == True
        ).all()
        
        result.append({
            "page_id": page.id,
            "page_name": page.page_name,
            "page_url": page.page_url,
            "page_code": page.page_code,
            "icon_name": page.icon_name,
            "description": page.description,
            "permissions": [
                {
                    "permission_id": p.id,
                    "permission_type": p.permission_type
                } for p in permissions
            ]
        })
    
    return result

@router.get("/all-granted-access")
async def get_all_granted_access(db: Session = Depends(get_db)):
    """
    Get all granted access with complete details
    Perfect for Right Panel Analytics
    """
    accesses = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.is_granted == True
    ).options(
        joinedload(rbac_models.CompanyRolePageAccess.company),
        joinedload(rbac_models.CompanyRolePageAccess.role),
        joinedload(rbac_models.CompanyRolePageAccess.department),
        joinedload(rbac_models.CompanyRolePageAccess.designation),
        joinedload(rbac_models.CompanyRolePageAccess.page),
        joinedload(rbac_models.CompanyRolePageAccess.permission)
    ).all()
    
    result = []
    for access in accesses:
        result.append({
            "id": access.id,
            "company_id": access.company_id,
            "company_name": access.company.company_name if access.company else "N/A",
            "role_id": access.role_id,
            "role_name": access.role.role_name if access.role else "N/A",
            "department_id": access.department_id,
            "department_name": access.department.department_name if access.department else "N/A",
            "designation_id": access.designation_id,
            "designation_name": access.designation.designation_name if access.designation else "N/A",
            "page_id": access.page_id,
            "page_name": access.page.page_name if access.page else "N/A",
            "page_url": access.page.page_url if access.page else "N/A",
            "permission_id": access.permission_id,
            "permission_type": access.permission.permission_type if access.permission else "N/A",
            "is_granted": access.is_granted,
            "created_at": access.created_at
        })
    
    return result


@router.post("/auto-grant-synced-pages")
async def auto_grant_synced_pages(
    company_id: int = Form(...),
    role_id: int = Form(...),
    department_id: int = Form(...),
    designation_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Automatically grant newly synced pages to an existing role combination.
    Logic: Detects the permission pattern already granted to this role, then applies
    the same permissions to any new pages that are not yet granted.

    Use case: Access was previously granted manually. New pages were added via Sync Pages.
    Call this endpoint to auto-grant all new pages without manually selecting each one.
    """
    from collections import Counter

    # Step 1: Fetch all pages already granted to this role combination
    existing_grants = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.company_id == company_id,
        rbac_models.CompanyRolePageAccess.role_id == role_id,
        rbac_models.CompanyRolePageAccess.department_id == department_id,
        rbac_models.CompanyRolePageAccess.designation_id == designation_id,
        rbac_models.CompanyRolePageAccess.is_granted == True
    ).all()

    if not existing_grants:
        return {
            "message": "No existing grants found for this role combination. Grant access first manually.",
            "auto_granted": 0,
            "new_pages_granted": 0,
            "pages": []
        }

    # Already granted page IDs
    already_granted_page_ids = set(g.page_id for g in existing_grants)

    # Collect permission types used across all granted pages
    perm_type_counter = Counter()
    for g in existing_grants:
        perm = db.query(rbac_models.PagePermission).filter(
            rbac_models.PagePermission.id == g.permission_id
        ).first()
        if perm:
            perm_type_counter[perm.permission_type] += 1

    # Use all permission types that appear in existing grants (no threshold - grant same perms)
    common_perm_types = set(perm_type_counter.keys())
    if not common_perm_types:
        common_perm_types = {'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'}

    # Step 2: Fetch all active pages that have not yet been granted to this role
    all_new_pages = db.query(rbac_models.Page).filter(
        rbac_models.Page.is_active == True,
        ~rbac_models.Page.id.in_(already_granted_page_ids)
    ).all()

    created_count = 0
    skipped_count = 0
    granted_pages_info = []

    for page in all_new_pages:
        # Fetch permissions for this page that match the role's existing permission pattern
        page_permissions = db.query(rbac_models.PagePermission).filter(
            rbac_models.PagePermission.page_id == page.id,
            rbac_models.PagePermission.is_enabled == True,
            rbac_models.PagePermission.permission_type.in_(common_perm_types)
        ).all()

        if not page_permissions:
            skipped_count += 1
            continue

        page_granted = False
        for perm in page_permissions:
            existing = db.query(rbac_models.CompanyRolePageAccess).filter(
                rbac_models.CompanyRolePageAccess.company_id == company_id,
                rbac_models.CompanyRolePageAccess.role_id == role_id,
                rbac_models.CompanyRolePageAccess.department_id == department_id,
                rbac_models.CompanyRolePageAccess.designation_id == designation_id,
                rbac_models.CompanyRolePageAccess.page_id == page.id,
                rbac_models.CompanyRolePageAccess.permission_id == perm.id
            ).first()

            if not existing:
                access = rbac_models.CompanyRolePageAccess(
                    company_id=company_id,
                    role_id=role_id,
                    department_id=department_id,
                    designation_id=designation_id,
                    page_id=page.id,
                    permission_id=perm.id,
                    is_granted=True
                )
                db.add(access)
                created_count += 1
                page_granted = True

        if page_granted:
            granted_pages_info.append(page.page_name)

    db.commit()

    return {
        "message": "Auto-grant completed successfully",
        "auto_granted_count": created_count,
        "new_pages_granted": len(granted_pages_info),
        "pages": granted_pages_info,
        "skipped_no_permissions": skipped_count,
        "permissions_pattern_used": list(common_perm_types),
        "previously_granted_pages": len(already_granted_page_ids)
    }


@router.get("/stats")
async def get_rbac_stats(db: Session = Depends(get_db)):
    """
    Get comprehensive RBAC statistics
    """
    total_pages = db.query(rbac_models.Page).filter(
        rbac_models.Page.is_active == True
    ).count()
    
    total_permissions = db.query(rbac_models.PagePermission).filter(
        rbac_models.PagePermission.is_enabled == True
    ).count()
    
    total_access_grants = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.is_granted == True
    ).count()
    
    total_companies = db.query(models.Company).count()
    total_roles = db.query(models.Role).count()
    total_departments = db.query(models.Department).count()
    total_designations = db.query(models.Designation).count()
    
    # Get top companies by access grants
    company_stats = db.query(
        rbac_models.CompanyRolePageAccess.company_id,
        func.count(rbac_models.CompanyRolePageAccess.id).label('access_count')
    ).filter(
        rbac_models.CompanyRolePageAccess.is_granted == True
    ).group_by(
        rbac_models.CompanyRolePageAccess.company_id
    ).order_by(
        func.count(rbac_models.CompanyRolePageAccess.id).desc()
    ).limit(10).all()
    
    top_companies = []
    for comp_id, count in company_stats:
        company = db.query(models.Company).filter(models.Company.id == comp_id).first()
        if company:
            top_companies.append({
                "company_id": comp_id,
                "company_name": company.company_name,
                "access_count": count
            })
    
    return {
        "total_pages": total_pages,
        "total_permissions": total_permissions,
        "total_access_grants": total_access_grants,
        "total_companies": total_companies,
        "total_roles": total_roles,
        "total_departments": total_departments,
        "total_designations": total_designations,
        "top_companies": top_companies
    }


@router.get("/access-matrix")
async def get_access_matrix(
    company_id: Optional[int] = None,
    role_id: Optional[int] = None,
    page_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get access matrix with optional filters
    Returns grouped data by different dimensions
    """
    query = db.query(rbac_models.CompanyRolePageAccess).filter(
        rbac_models.CompanyRolePageAccess.is_granted == True
    )
    
    if company_id:
        query = query.filter(rbac_models.CompanyRolePageAccess.company_id == company_id)
    if role_id:
        query = query.filter(rbac_models.CompanyRolePageAccess.role_id == role_id)
    if page_id:
        query = query.filter(rbac_models.CompanyRolePageAccess.page_id == page_id)
    
    accesses = query.options(
        joinedload(rbac_models.CompanyRolePageAccess.company),
        joinedload(rbac_models.CompanyRolePageAccess.role),
        joinedload(rbac_models.CompanyRolePageAccess.page),
        joinedload(rbac_models.CompanyRolePageAccess.permission)
    ).all()
    
    # Group by company
    by_company = {}
    for access in accesses:
        comp_id = access.company_id
        if comp_id not in by_company:
            by_company[comp_id] = {
                "company_name": access.company.company_name if access.company else "N/A",
                "access_count": 0,
                "pages": set()
            }
        by_company[comp_id]["access_count"] += 1
        by_company[comp_id]["pages"].add(access.page.page_name if access.page else "N/A")
    
    # Convert sets to lists for JSON serialization
    for comp_id in by_company:
        by_company[comp_id]["pages"] = list(by_company[comp_id]["pages"])
        by_company[comp_id]["page_count"] = len(by_company[comp_id]["pages"])
    
    return {
        "total_accesses": len(accesses),
        "by_company": by_company,
        "filters_applied": {
            "company_id": company_id,
            "role_id": role_id,
            "page_id": page_id
        }
    }