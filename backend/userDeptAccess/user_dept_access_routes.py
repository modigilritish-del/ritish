"""
userDeptAccess/user_dept_access_routes.py
──────────────────────────────────────────────────────────────────────────────
ENDPOINT #4 KEY FIX:
  Departments shown =
    SELECT DISTINCT department_id
    FROM company_role_page_access
    WHERE company_id = :company_id
      AND is_granted = True

  No role/desg filter. No hardcoding. Pure table lookup.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, distinct
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
import db_models as models
from user import user_models
from userDeptAccess import user_dept_access_models as dept_models

router = APIRouter()


class BulkSetRequest(BaseModel):
    user_id: int
    company_id: int
    department_ids: List[int]
    update_reason: Optional[str] = None
    performed_by: Optional[int] = None


# ══════════════════════════════════════════════════════════════════════════════
# 1. GET /user-dept-access/companies
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/companies")
def get_companies_with_user_count(
    current_user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    # Agar current_user_id diya hai → sirf uski accessible companies dikhao
    if current_user_id:
        accessible = (
            db.query(user_models.UserCompanyAccess.company_id)
            .filter(user_models.UserCompanyAccess.user_id == current_user_id)
            .distinct()
            .all()
        )
        accessible_ids = [row[0] for row in accessible]
        companies = (
            db.query(models.Company)
            .filter(models.Company.id.in_(accessible_ids))
            .order_by(models.Company.company_name)
            .all()
        )
    else:
        companies = db.query(models.Company).order_by(models.Company.company_name).all()

    user_counts = (
        db.query(
            user_models.UserCompanyAccess.company_id,
            func.count(distinct(user_models.UserCompanyAccess.user_id)).label("cnt")
        )
        .filter(user_models.UserCompanyAccess.is_primary_company == True)
        .group_by(user_models.UserCompanyAccess.company_id)
        .all()
    )
    count_map = {row.company_id: row.cnt for row in user_counts}

    return [
        {
            "id": c.id,
            "company_name": c.company_name,
            "company_code": c.company_code,
            "user_count": count_map.get(c.id, 0),
        }
        for c in companies
    ]


# ══════════════════════════════════════════════════════════════════════════════
# 2. GET /user-dept-access/companies/{company_id}/users
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/companies/{company_id}/users")
def get_users_for_company(company_id: int, db: Session = Depends(get_db)):
    accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(
            user_models.UserCompanyAccess.company_id == company_id,
            user_models.UserCompanyAccess.is_primary_company == True,
        )
        .options(
            joinedload(user_models.UserCompanyAccess.user),
            joinedload(user_models.UserCompanyAccess.role),
            joinedload(user_models.UserCompanyAccess.department),
            joinedload(user_models.UserCompanyAccess.designation),
        )
        .all()
    )

    user_map: dict = {}
    for acc in accesses:
        uid = acc.user_id
        if uid not in user_map:
            user_map[uid] = acc

    if not user_map:
        return []

    dept_counts = (
        db.query(
            dept_models.UserDeptDataAccess.user_id,
            func.count(dept_models.UserDeptDataAccess.id).label("cnt")
        )
        .filter(
            dept_models.UserDeptDataAccess.company_id == company_id,
            dept_models.UserDeptDataAccess.is_granted == True,
        )
        .group_by(dept_models.UserDeptDataAccess.user_id)
        .all()
    )
    dept_count_map = {row.user_id: row.cnt for row in dept_counts}

    result = []
    for uid, acc in user_map.items():
        u = acc.user
        if not u:
            continue
        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "user_id": u.user_id,
            "is_active": u.is_active,
            "is_primary_company": acc.is_primary_company,
            "role_name": acc.role.role_name if acc.role else None,
            "dept_name": acc.department.department_name if acc.department else None,
            "desg_name": acc.designation.designation_name if acc.designation else None,
            "granted_dept_count": dept_count_map.get(uid, 0),
        })

    result.sort(key=lambda x: x["full_name"])
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 3. GET /user-dept-access/user/{user_id}/companies
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/user/{user_id}/companies")
def get_user_companies(
    user_id: int,
    current_user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    accesses = (
        db.query(user_models.UserCompanyAccess)
        .filter(user_models.UserCompanyAccess.user_id == user_id)
        .options(
            joinedload(user_models.UserCompanyAccess.company),
            joinedload(user_models.UserCompanyAccess.role),
            joinedload(user_models.UserCompanyAccess.department),
            joinedload(user_models.UserCompanyAccess.designation),
        )
        .all()
    )

    # Agar current_user_id diya → sirf woh companies dikhao jo admin ko bhi accessible hain
    admin_company_ids: Optional[set] = None
    if current_user_id:
        admin_rows = (
            db.query(user_models.UserCompanyAccess.company_id)
            .filter(user_models.UserCompanyAccess.user_id == current_user_id)
            .distinct()
            .all()
        )
        admin_company_ids = {row[0] for row in admin_rows}

    company_map: dict = {}
    for acc in accesses:
        cid = acc.company_id
        # Agar admin filter hai aur yeh company admin ko accessible nahi → skip
        if admin_company_ids is not None and cid not in admin_company_ids:
            continue
        if cid not in company_map:
            company_map[cid] = acc
        elif acc.is_primary_company:
            company_map[cid] = acc

    dept_rows = (
        db.query(dept_models.UserDeptDataAccess)
        .filter(
            dept_models.UserDeptDataAccess.user_id == user_id,
            dept_models.UserDeptDataAccess.is_granted == True,
        )
        .all()
    )
    granted_map: dict = {}
    for row in dept_rows:
        granted_map.setdefault(row.company_id, []).append(row.department_id)

    result = []
    for cid, acc in company_map.items():
        if not acc.company:
            continue
        result.append({
            "company_id": cid,
            "company_name": acc.company.company_name,
            "company_code": acc.company.company_code,
            "is_primary_company": acc.is_primary_company,
            "role_id": acc.role_id,
            "role_name": acc.role.role_name if acc.role else None,
            "department_id": acc.department_id,
            "department_name": acc.department.department_name if acc.department else None,
            "designation_id": acc.designation_id,
            "designation_name": acc.designation.designation_name if acc.designation else None,
            "granted_dept_ids": granted_map.get(cid, []),
            "granted_dept_count": len(granted_map.get(cid, [])),
        })

    result.sort(key=lambda x: (0 if x["is_primary_company"] else 1, x["company_name"]))
    return result


# ══════════════════════════════════════════════════════════════════════════════
# 4. GET /user-dept-access/user/{user_id}/company/{company_id}/departments
#
#  SQL equivalent:
#    SELECT DISTINCT d.id, d.department_name, d.department_code
#    FROM user_company_access uca
#    JOIN departments d ON d.id = uca.department_id
#    WHERE uca.company_id = :company_id
#      AND uca.department_id IS NOT NULL
#    ORDER BY d.department_name;
#
#  Source: UserCompanyAccess — wahi departments jo AddUser mein register hue.
#  Then check user_dept_data_access for already-granted ones.
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/user/{user_id}/company/{company_id}/departments")
def get_user_company_departments(user_id: int, company_id: int, db: Session = Depends(get_db)):

    # Verify user actually has access to this company
    access_exists = (
        db.query(user_models.UserCompanyAccess)
        .filter(
            user_models.UserCompanyAccess.user_id == user_id,
            user_models.UserCompanyAccess.company_id == company_id,
        )
        .first()
    )
    if not access_exists:
        raise HTTPException(
            status_code=404,
            detail=f"No access record found for user {user_id} in company {company_id}"
        )

    # Same source as AddUser /companies/{company_id}/rbac-options
    # SELECT DISTINCT department_id FROM company_role_page_access
    # WHERE company_id = :company_id
    from role import role_models as rbac_models
    dept_id_rows = (
        db.query(distinct(rbac_models.CompanyRolePageAccess.department_id))
        .filter(
            rbac_models.CompanyRolePageAccess.company_id == company_id,
        )
        .all()
    )

    dept_ids = [row[0] for row in dept_id_rows if row[0] is not None]

    if not dept_ids:
        return {
            "user_id": user_id,
            "company_id": company_id,
            "departments": [],
            "granted_dept_ids": [],
        }

    # Load department names
    dept_objs = (
        db.query(models.Department)
        .filter(models.Department.id.in_(dept_ids))
        .order_by(models.Department.department_name)
        .all()
    )

    departments = [
        {
            "id": d.id,
            "department_name": d.department_name,
            "department_code": d.department_code,
        }
        for d in dept_objs
    ]

    # Which ones has the user already been granted data access to?
    granted_rows = (
        db.query(dept_models.UserDeptDataAccess)
        .filter(
            dept_models.UserDeptDataAccess.user_id == user_id,
            dept_models.UserDeptDataAccess.company_id == company_id,
            dept_models.UserDeptDataAccess.is_granted == True,
        )
        .all()
    )
    valid_set = set(dept_ids)
    granted_ids = [
        row.department_id for row in granted_rows
        if row.department_id in valid_set
    ]

    return {
        "user_id": user_id,
        "company_id": company_id,
        "departments": departments,
        "granted_dept_ids": granted_ids,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 5. GET /user-dept-access/user/{user_id}/detail
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/user/{user_id}/detail")
def get_user_detail(user_id: int, db: Session = Depends(get_db)):
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "user_id": user.user_id,
        "is_active": user.is_active,
    }


# ══════════════════════════════════════════════════════════════════════════════
# 6. POST /user-dept-access/bulk-set
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/user-dept-access/bulk-set")
def bulk_set_dept_access(payload: BulkSetRequest, db: Session = Depends(get_db)):
    user = db.query(user_models.User).filter(user_models.User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User id={payload.user_id} not found")

    company = db.query(models.Company).filter(models.Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail=f"Company id={payload.company_id} not found")

    if payload.department_ids:
        found = db.query(models.Department).filter(
            models.Department.id.in_(payload.department_ids)
        ).all()
        found_ids = {d.id for d in found}
        bad = set(payload.department_ids) - found_ids
        if bad:
            raise HTTPException(status_code=400, detail=f"Invalid department ids: {sorted(bad)}")

    # Snapshot before
    existing = db.query(dept_models.UserDeptDataAccess).filter(
        dept_models.UserDeptDataAccess.user_id == payload.user_id,
        dept_models.UserDeptDataAccess.company_id == payload.company_id,
    ).all()
    ids_before = ",".join(str(r.department_id) for r in existing)

    # Delete old
    db.query(dept_models.UserDeptDataAccess).filter(
        dept_models.UserDeptDataAccess.user_id == payload.user_id,
        dept_models.UserDeptDataAccess.company_id == payload.company_id,
    ).delete(synchronize_session=False)

    # Insert new
    new_ids = list(set(payload.department_ids))
    for dept_id in new_ids:
        db.add(dept_models.UserDeptDataAccess(
            user_id=payload.user_id,
            company_id=payload.company_id,
            department_id=dept_id,
            is_granted=True,
            update_reason=payload.update_reason,
            created_by=payload.performed_by,
            updated_by=payload.performed_by,
        ))

    ids_after = ",".join(str(i) for i in sorted(new_ids))
    db.add(dept_models.UserDeptDataAccessHistory(
        user_id=payload.user_id,
        company_id=payload.company_id,
        action="BULK_SET" if new_ids else "CLEARED",
        department_ids_before=ids_before,
        department_ids_after=ids_after,
        update_reason=payload.update_reason,
        performed_by=payload.performed_by,
    ))

    db.commit()

    return {
        "success": True,
        "message": f"Data access updated for '{user.full_name}' in '{company.company_name}'",
        "departments_granted": len(new_ids),
        "department_ids": sorted(new_ids),
    }




# ══════════════════════════════════════════════════════════════════════════════
# DEBUG: Check company_role_page_access data for a company
# GET /user-dept-access/debug/company/{company_id}
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/debug/company/{company_id}")
def debug_company_rbac(company_id: int, db: Session = Depends(get_db)):
    from role import role_models as rbac_models
    rows = (
        db.query(rbac_models.CompanyRolePageAccess)
        .filter(rbac_models.CompanyRolePageAccess.company_id == company_id)
        .options(
            joinedload(rbac_models.CompanyRolePageAccess.department),
            joinedload(rbac_models.CompanyRolePageAccess.role),
        )
        .all()
    )
    dept_set = {}
    for r in rows:
        if r.department_id not in dept_set:
            dept_set[r.department_id] = r.department.department_name if r.department else "?"
    return {
        "company_id": company_id,
        "total_rows": len(rows),
        "distinct_departments": [{"id": k, "name": v} for k, v in dept_set.items()]
    }

# ══════════════════════════════════════════════════════════════════════════════
# 7. GET /user-dept-access/companies/{company_id}/all-departments
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/user-dept-access/companies/{company_id}/all-departments")
def get_all_departments_fallback(company_id: int, db: Session = Depends(get_db)):
    depts = db.query(models.Department).order_by(models.Department.department_name).all()
    return [{"id": d.id, "department_name": d.department_name, "department_code": d.department_code} for d in depts]