"""master_admin.py: hardcoded super admin (no database user required)"""
import os, hmac, hashlib, time, inspect
from contextvars import ContextVar
from datetime import datetime, timezone
from functools import wraps
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db

MASTER_ENABLED  = os.environ.get("MASTER_ADMIN_ENABLED", "true").lower() == "true"
MASTER_USERNAME = os.environ.get("MASTER_ADMIN_USER", "ritiadmin")
MASTER_PASSWORD = os.environ.get("MASTER_ADMIN_PASS", "ritiadmin@2001")
MASTER_USER_ID  = 1
_SECRET = os.environ.get("MASTER_ADMIN_SECRET", "ritiadmin-local-secret").encode()
_TOKEN_TTL = 60 * 60 * 24  # 24 hours

_request_token: ContextVar[Optional[str]] = ContextVar("request_token", default=None)


def _sign(exp: int) -> str:
    return hmac.new(_SECRET, f"master:{exp}".encode(), hashlib.sha256).hexdigest()


def make_master_token() -> str:
    exp = int(time.time()) + _TOKEN_TTL
    return f"master-{exp}-{_sign(exp)}"


def is_master_token(token: Optional[str]) -> bool:
    try:
        if not token or not token.startswith("master-"):
            return False
        _, exp, sig = token.split("-", 2)
        return int(exp) > time.time() and hmac.compare_digest(sig, _sign(int(exp)))
    except Exception:
        return False


class MasterUser:
    """Fake super admin: is_/has_/can_ attributes are always True, everything else None."""
    id = MASTER_USER_ID
    user_id = MASTER_USER_ID
    username = MASTER_USERNAME
    email = MASTER_USERNAME
    full_name = "Master Admin"
    role_id = 1
    role = "admin"
    role_name = "admin"
    is_active = True
    is_superuser = True
    is_admin = True
    is_master = True

    def __getattr__(self, name):
        if name.startswith(("is_", "has_", "can_")):
            return True
        return None

    def __getitem__(self, key):
        return getattr(self, key)

    def get(self, key, default=None):
        v = getattr(self, key, None)
        return default if v is None else v


class MasterLoginIn(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str


def _ref(obj, name_attr, code_attr):
    return {
        "id": obj.id,
        "name": getattr(obj, name_attr, None),
        "code": getattr(obj, code_attr, None),
    }


def build_master_user(db: Session) -> dict:
    """Build a complete user object (same shape as GET /users/{id}) with access to every company and plant."""
    now = datetime.now(timezone.utc).isoformat()
    user = {
        "id": MASTER_USER_ID,
        "user_id": MASTER_USERNAME,
        "username": MASTER_USERNAME,
        "email": MASTER_USERNAME,
        "full_name": "Master Admin",
        "phone": "0000000000",
        "is_active": True,
        "is_superuser": True,
        "is_master": True,
        "role": "admin",
        "created_at": now,
        "updated_at": None,
        "companies": [],
        "plants": [],
        "accesses": [],
    }

    try:
        from user import user_models as um

        access_cls = um.UserCompanyAccess
        Company = access_cls.company.property.mapper.class_
        Plant = access_cls.plant.property.mapper.class_
        Role = access_cls.role.property.mapper.class_
        Department = access_cls.department.property.mapper.class_
        Designation = access_cls.designation.property.mapper.class_

        companies = db.query(Company).order_by(Company.id).all()
        plants = db.query(Plant).order_by(Plant.id).all()
        role = db.query(Role).order_by(Role.id).first()
        dept = db.query(Department).order_by(Department.id).first()
        desg = db.query(Designation).order_by(Designation.id).first()

        role_ref = _ref(role, "role_name", "role_code") if role else {"id": 1, "name": "Master Admin", "code": "MASTER"}
        dept_ref = _ref(dept, "department_name", "department_code") if dept else {"id": 1, "name": "Master", "code": "MASTER"}
        desg_ref = _ref(desg, "designation_name", "designation_code") if desg else {"id": 1, "name": "Master", "code": "MASTER"}

        plants_by_company = {}
        for p in plants:
            plants_by_company.setdefault(p.company_id, []).append(p)

        access_id = 0
        for ci, c in enumerate(companies):
            is_first_company = ci == 0
            company_ref = {
                "id": c.id,
                "name": c.company_name,
                "code": getattr(c, "company_code", None),
            }
            user["companies"].append({
                "company_id": c.id,
                "company_name": c.company_name,
                "is_primary": is_first_company,
            })

            # Company-level access (no plant)
            access_id += 1
            user["accesses"].append({
                "id": access_id,
                "company": company_ref,
                "plant": None,
                "role": role_ref,
                "department": dept_ref,
                "designation": desg_ref,
                "is_primary_company": is_first_company,
                "is_primary_plant": False,
                "created_at": now,
            })

            # Plant-level access for every plant in this company
            for pi, p in enumerate(plants_by_company.get(c.id, [])):
                is_first_plant = is_first_company and pi == 0
                plant_ref = {
                    "id": p.id,
                    "name": p.plant_name,
                    "code": getattr(p, "plant_code", None),
                }
                user["plants"].append({
                    "plant_id": p.id,
                    "plant_name": p.plant_name,
                    "plant_code": getattr(p, "plant_code", None),
                    "company_id": c.id,
                    "company_name": c.company_name,
                    "is_primary": is_first_plant,
                })
                access_id += 1
                user["accesses"].append({
                    "id": access_id,
                    "company": company_ref,
                    "plant": plant_ref,
                    "role": role_ref,
                    "department": dept_ref,
                    "designation": desg_ref,
                    "is_primary_company": is_first_company,
                    "is_primary_plant": is_first_plant,
                    "created_at": now,
                })
    except Exception as e:
        print(f"Master admin: could not build access list from database: {e}")

    return user


router = APIRouter()


@router.post("/master-login")
def master_login(body: MasterLoginIn, db: Session = Depends(get_db)):
    ident = (body.username or body.email or "").strip()
    if not (hmac.compare_digest(ident, MASTER_USERNAME)
            and hmac.compare_digest(body.password, MASTER_PASSWORD)):
        raise HTTPException(status_code=401, detail="Invalid master credentials")
    return {
        "success": True,
        "message": "Login successful",
        "access_token": make_master_token(),
        "token_type": "bearer",
        "user": build_master_user(db),
    }


def install_master_admin(app):
    if not MASTER_ENABLED:
        print("Master admin DISABLED")
        return

    # 1) Keep the Bearer token of every request in a context variable
    @app.middleware("http")
    async def _grab_token(request: Request, call_next):
        auth = request.headers.get("authorization", "")
        _request_token.set(auth[7:] if auth.lower().startswith("bearer ") else None)
        return await call_next(request)

    # 2) Login endpoint
    app.include_router(router, prefix="/api", tags=["Master Admin"])

    # 3) Wrap get_current_user: master token returns MasterUser, anything else goes to the original
    from user.auth_middleware import get_current_user as _orig

    @wraps(_orig)
    async def _wrapper(*args, **kwargs):
        if is_master_token(_request_token.get()):
            return MasterUser()
        res = _orig(*args, **kwargs)
        if inspect.isawaitable(res):
            res = await res
        return res

    app.dependency_overrides[_orig] = _wrapper
    print("Master admin ON (login: POST /api/master-login)")