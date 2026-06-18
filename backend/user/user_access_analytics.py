"""user/user_access_analytics.py - Analytics & Statistics for User Plant Company Access"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, distinct, and_, or_
from typing import List, Dict, Any, Optional
from database import get_db
import db_models as models
from user import user_models

router = APIRouter()

# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/analytics/overview")
async def get_access_analytics_overview(db: Session = Depends(get_db)):
    """
    Get complete overview analytics for User Plant Company Access
    Returns all statistics needed for right panel
    """
    
    # Total counts
    total_users = db.query(user_models.User).filter(user_models.User.is_active == True).count()
    total_companies = db.query(models.Company).count()
    total_plants = db.query(models.Plant).count()
    total_roles = db.query(models.Role).count()
    total_departments = db.query(models.Department).count()
    total_designations = db.query(models.Designation).count()
    total_access_records = db.query(user_models.UserCompanyAccess).count()
    
    return {
        "totals": {
            "users": total_users,
            "companies": total_companies,
            "plants": total_plants,
            "roles": total_roles,
            "departments": total_departments,
            "designations": total_designations,
            "access_records": total_access_records
        }
    }


@router.get("/analytics/users-per-company")
async def get_users_per_company(db: Session = Depends(get_db)):
    """
    Get number of users in each company with detailed breakdown
    """
    
    # Query to get user count per company
    company_stats = db.query(
        models.Company.id,
        models.Company.company_name,
        models.Company.company_code,
        func.count(distinct(user_models.UserCompanyAccess.user_id)).label('user_count')
    ).join(
        user_models.UserCompanyAccess,
        models.Company.id == user_models.UserCompanyAccess.company_id
    ).group_by(
        models.Company.id,
        models.Company.company_name,
        models.Company.company_code
    ).all()
    
    result = []
    for comp_id, comp_name, comp_code, user_count in company_stats:
        # Get detailed breakdown for each company
        
        # Users with plant access
        plant_users = db.query(
            distinct(user_models.UserCompanyAccess.user_id)
        ).filter(
            user_models.UserCompanyAccess.company_id == comp_id,
            user_models.UserCompanyAccess.plant_id.isnot(None)
        ).count()
        
        # Users with company-level access only
        company_only_users = db.query(
            distinct(user_models.UserCompanyAccess.user_id)
        ).filter(
            user_models.UserCompanyAccess.company_id == comp_id,
            user_models.UserCompanyAccess.plant_id.is_(None)
        ).count()
        
        # Primary company count
        primary_users = db.query(
            user_models.UserCompanyAccess
        ).filter(
            user_models.UserCompanyAccess.company_id == comp_id,
            user_models.UserCompanyAccess.is_primary_company == True
        ).count()
        
        result.append({
            "company_id": comp_id,
            "company_name": comp_name,
            "company_code": comp_code,
            "total_users": user_count,
            "plant_access_users": plant_users,
            "company_only_users": company_only_users,
            "primary_users": primary_users
        })
    
    return result


@router.get("/analytics/role-department-designation-distribution")
async def get_role_dept_desg_distribution(
    company_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get users grouped by Role-Department-Designation combination
    Optionally filter by company
    """
    
    query = db.query(
        models.Role.id.label('role_id'),
        models.Role.role_name,
        models.Department.id.label('department_id'),
        models.Department.department_name,
        models.Designation.id.label('designation_id'),
        models.Designation.designation_name,
        models.Company.id.label('company_id'),
        models.Company.company_name,
        func.count(distinct(user_models.UserCompanyAccess.user_id)).label('user_count')
    ).join(
        user_models.UserCompanyAccess,
        and_(
            models.Role.id == user_models.UserCompanyAccess.role_id,
            models.Department.id == user_models.UserCompanyAccess.department_id,
            models.Designation.id == user_models.UserCompanyAccess.designation_id
        )
    ).join(
        models.Company,
        models.Company.id == user_models.UserCompanyAccess.company_id
    )
    
    if company_id:
        query = query.filter(user_models.UserCompanyAccess.company_id == company_id)
    
    query = query.group_by(
        models.Role.id,
        models.Role.role_name,
        models.Department.id,
        models.Department.department_name,
        models.Designation.id,
        models.Designation.designation_name,
        models.Company.id,
        models.Company.company_name
    ).order_by(
        models.Company.company_name,
        func.count(distinct(user_models.UserCompanyAccess.user_id)).desc()
    )
    
    results = query.all()
    
    formatted_results = []
    for row in results:
        formatted_results.append({
            "company_id": row.company_id,
            "company_name": row.company_name,
            "role_id": row.role_id,
            "role_name": row.role_name,
            "department_id": row.department_id,
            "department_name": row.department_name,
            "designation_id": row.designation_id,
            "designation_name": row.designation_name,
            "user_count": row.user_count
        })
    
    return formatted_results


@router.get("/analytics/users-per-plant")
async def get_users_per_plant(
    company_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get number of users in each plant with detailed information
    """
    
    query = db.query(
        models.Plant.id,
        models.Plant.plant_name,
        models.Plant.plant_code,
        models.Company.id.label('company_id'),
        models.Company.company_name,
        func.count(distinct(user_models.UserCompanyAccess.user_id)).label('user_count')
    ).join(
        user_models.UserCompanyAccess,
        models.Plant.id == user_models.UserCompanyAccess.plant_id
    ).join(
        models.Company,
        models.Company.id == models.Plant.company_id
    )
    
    if company_id:
        query = query.filter(models.Plant.company_id == company_id)
    
    query = query.group_by(
        models.Plant.id,
        models.Plant.plant_name,
        models.Plant.plant_code,
        models.Company.id,
        models.Company.company_name
    ).order_by(
        models.Company.company_name,
        func.count(distinct(user_models.UserCompanyAccess.user_id)).desc()
    )
    
    results = query.all()
    
    formatted_results = []
    for plant_id, plant_name, plant_code, comp_id, comp_name, user_count in results:
        # Primary plant users
        primary_users = db.query(user_models.UserCompanyAccess).filter(
            user_models.UserCompanyAccess.plant_id == plant_id,
            user_models.UserCompanyAccess.is_primary_plant == True
        ).count()
        
        formatted_results.append({
            "plant_id": plant_id,
            "plant_name": plant_name,
            "plant_code": plant_code,
            "company_id": comp_id,
            "company_name": comp_name,
            "total_users": user_count,
            "primary_users": primary_users
        })
    
    return formatted_results


@router.get("/analytics/multi-plant-users")
async def get_multi_plant_users(db: Session = Depends(get_db)):
    """
    Get users who have access to multiple plants
    """
    
    # Get users with plant access count
    user_plant_counts = db.query(
        user_models.UserCompanyAccess.user_id,
        func.count(distinct(user_models.UserCompanyAccess.plant_id)).label('plant_count'),
        func.count(distinct(user_models.UserCompanyAccess.company_id)).label('company_count')
    ).filter(
        user_models.UserCompanyAccess.plant_id.isnot(None)
    ).group_by(
        user_models.UserCompanyAccess.user_id
    ).having(
        func.count(distinct(user_models.UserCompanyAccess.plant_id)) > 1
    ).all()
    
    results = []
    for user_id, plant_count, company_count in user_plant_counts:
        # Get user details - FIX: Handle None case properly
        user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
        
        # Skip if user not found
        if user is None:
            continue
        
        # Get plants for this user
        plants_access = db.query(
            models.Plant.id,
            models.Plant.plant_name,
            models.Plant.plant_code,
            models.Company.id.label('company_id'),
            models.Company.company_name,
            user_models.UserCompanyAccess.is_primary_plant
        ).join(
            user_models.UserCompanyAccess,
            models.Plant.id == user_models.UserCompanyAccess.plant_id
        ).join(
            models.Company,
            models.Company.id == models.Plant.company_id
        ).filter(
            user_models.UserCompanyAccess.user_id == user_id
        ).all()
        
        plants_info = [
            {
                "plant_id": p_id,
                "plant_name": p_name,
                "plant_code": p_code,
                "company_id": c_id,
                "company_name": c_name,
                "is_primary": is_primary
            }
            for p_id, p_name, p_code, c_id, c_name, is_primary in plants_access
        ]
        
        # Get unique companies
        companies_info = {
            (p['company_id'], p['company_name'])
            for p in plants_info
        }
        
        results.append({
            "user_id": user_id,
            "user_name": user.full_name,  # FIX: Safe to access now
            "user_email": user.email,     # FIX: Safe to access now
            "total_plants": plant_count,
            "total_companies": company_count,
            "companies": list(companies_info),
            "plants": plants_info
        })
    
    return results


@router.get("/analytics/common-plant-access")
async def get_common_plant_access(db: Session = Depends(get_db)):
    """
    Find users who share the same set of plants but from different companies
    """
    
    # Get plant combinations and their user counts
    plant_combinations = db.query(
        user_models.UserCompanyAccess.user_id,
        func.array_agg(distinct(user_models.UserCompanyAccess.plant_id)).label('plant_ids')
    ).filter(
        user_models.UserCompanyAccess.plant_id.isnot(None)
    ).group_by(
        user_models.UserCompanyAccess.user_id
    ).all()
    
    # Group by plant combination
    combination_groups = {}
    for user_id, plant_ids in plant_combinations:
        plant_tuple = tuple(sorted(plant_ids))
        if plant_tuple not in combination_groups:
            combination_groups[plant_tuple] = []
        combination_groups[plant_tuple].append(user_id)
    
    # Only return combinations with multiple users
    results = []
    for plant_ids, user_ids in combination_groups.items():
        if len(user_ids) > 1:
            # Get plant details
            plants = db.query(models.Plant).filter(
                models.Plant.id.in_(plant_ids)
            ).all()
            
            # Get user details
            users = db.query(user_models.User).filter(
                user_models.User.id.in_(user_ids)
            ).all()
            
            # Get company info
            company_ids = {plant.company_id for plant in plants}
            companies = db.query(models.Company).filter(
                models.Company.id.in_(company_ids)
            ).all()
            
            results.append({
                "plant_combination": [
                    {
                        "plant_id": p.id,
                        "plant_name": p.plant_name,
                        "plant_code": p.plant_code,
                        "company_id": p.company_id
                    } for p in plants
                ],
                "companies": [
                    {
                        "company_id": c.id,
                        "company_name": c.company_name
                    } for c in companies
                ],
                "users": [
                    {
                        "user_id": u.id,
                        "user_name": u.full_name,
                        "user_email": u.email
                    } for u in users
                ],
                "user_count": len(user_ids)
            })
    
    return results


@router.get("/analytics/role-distribution")
async def get_role_distribution(db: Session = Depends(get_db)):
    """
    Get distribution of users across roles with company breakdown
    """
    
    results = db.query(
        models.Role.id,
        models.Role.role_name,
        models.Role.role_code,
        func.count(distinct(user_models.UserCompanyAccess.user_id)).label('user_count')
    ).join(
        user_models.UserCompanyAccess,
        models.Role.id == user_models.UserCompanyAccess.role_id
    ).group_by(
        models.Role.id,
        models.Role.role_name,
        models.Role.role_code
    ).order_by(
        func.count(distinct(user_models.UserCompanyAccess.user_id)).desc()
    ).all()
    
    formatted_results = []
    for role_id, role_name, role_code, user_count in results:
        # Get company breakdown for this role
        company_breakdown = db.query(
            models.Company.company_name,
            func.count(distinct(user_models.UserCompanyAccess.user_id)).label('count')
        ).join(
            user_models.UserCompanyAccess,
            models.Company.id == user_models.UserCompanyAccess.company_id
        ).filter(
            user_models.UserCompanyAccess.role_id == role_id
        ).group_by(
            models.Company.company_name
        ).all()
        
        formatted_results.append({
            "role_id": role_id,
            "role_name": role_name,
            "role_code": role_code,
            "total_users": user_count,
            "company_breakdown": [
                {"company": comp, "users": count} 
                for comp, count in company_breakdown
            ]
        })
    
    return formatted_results


@router.get("/analytics/department-distribution")
async def get_department_distribution(db: Session = Depends(get_db)):
    """
    Get distribution of users across departments
    """
    
    results = db.query(
        models.Department.id,
        models.Department.department_name,
        models.Department.department_code,
        func.count(distinct(user_models.UserCompanyAccess.user_id)).label('user_count')
    ).join(
        user_models.UserCompanyAccess,
        models.Department.id == user_models.UserCompanyAccess.department_id
    ).group_by(
        models.Department.id,
        models.Department.department_name,
        models.Department.department_code
    ).order_by(
        func.count(distinct(user_models.UserCompanyAccess.user_id)).desc()
    ).all()
    
    return [
        {
            "department_id": dept_id,
            "department_name": dept_name,
            "department_code": dept_code,
            "user_count": user_count
        }
        for dept_id, dept_name, dept_code, user_count in results
    ]


@router.get("/analytics/designation-distribution")
async def get_designation_distribution(db: Session = Depends(get_db)):
    """
    Get distribution of users across designations
    """
    
    results = db.query(
        models.Designation.id,
        models.Designation.designation_name,
        models.Designation.designation_code,
        func.count(distinct(user_models.UserCompanyAccess.user_id)).label('user_count')
    ).join(
        user_models.UserCompanyAccess,
        models.Designation.id == user_models.UserCompanyAccess.designation_id
    ).group_by(
        models.Designation.id,
        models.Designation.designation_name,
        models.Designation.designation_code
    ).order_by(
        func.count(distinct(user_models.UserCompanyAccess.user_id)).desc()
    ).all()
    
    return [
        {
            "designation_id": desg_id,
            "designation_name": desg_name,
            "designation_code": desg_code,
            "user_count": user_count
        }
        for desg_id, desg_name, desg_code, user_count in results
    ]


@router.get("/analytics/access-heatmap")
async def get_access_heatmap(db: Session = Depends(get_db)):
    """
    Get heatmap data showing user access patterns
    Company x Plant matrix with user counts
    """
    
    companies = db.query(models.Company).all()
    
    heatmap_data = []
    for company in companies:
        plants = db.query(models.Plant).filter(
            models.Plant.company_id == company.id
        ).all()
        
        plant_data = []
        for plant in plants:
            user_count = db.query(
                distinct(user_models.UserCompanyAccess.user_id)
            ).filter(
                user_models.UserCompanyAccess.company_id == company.id,
                user_models.UserCompanyAccess.plant_id == plant.id
            ).count()
            
            plant_data.append({
                "plant_id": plant.id,
                "plant_name": plant.plant_name,
                "user_count": user_count
            })
        
        heatmap_data.append({
            "company_id": company.id,
            "company_name": company.company_name,
            "plants": plant_data
        })
    
    return heatmap_data