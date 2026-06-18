"""user/auth_middleware.py - Authentication & Authorization Middleware"""
from fastapi import HTTPException, Depends, Header
from sqlalchemy.orm import Session
from typing import Optional
import secrets
from datetime import datetime, timedelta

from database import get_db
from user import user_models

# Token storage (in production, use Redis or database)
active_tokens = {}

class TokenManager:
    """Manage authentication tokens"""
    
    @staticmethod
    def create_token(user_id: int) -> str:
        """Create new authentication token"""
        token = f"token_{user_id}_{secrets.token_urlsafe(32)}"
        active_tokens[token] = {
            "user_id": user_id,
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(hours=24)
        }
        return token
    
    @staticmethod
    def verify_token(token: str) -> Optional[int]:
        """Verify token and return user_id"""
        if token not in active_tokens:
            return None
        
        token_data = active_tokens[token]
        
        # Check if expired
        if datetime.now() > token_data["expires_at"]:
            del active_tokens[token]
            return None
        
        return token_data["user_id"]
    
    @staticmethod
    def revoke_token(token: str):
        """Revoke/delete token"""
        if token in active_tokens:
            del active_tokens[token]

# ==================== DEPENDENCY FUNCTIONS ====================

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> user_models.User:
    """
    Get current authenticated user from token
    Usage: current_user: User = Depends(get_current_user)
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing. Please login first."
        )
    
    # Extract token (supports "Bearer <token>" or just "<token>")
    token = authorization.replace("Bearer ", "").strip()
    
    # Verify token
    user_id = TokenManager.verify_token(token)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token. Please login again."
        )
    
    # Get user from database
    user = db.query(user_models.User).filter(
        user_models.User.id == user_id,
        user_models.User.is_active == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found or account disabled"
        )
    
    return user

def verify_user_access(
    target_user_id: int,
    current_user: user_models.User = Depends(get_current_user)
):
    """
    Verify that current user can access target user's data
    For now, users can only access their own data
    (Add admin role check here if needed)
    """
    if bool(current_user.id != target_user_id):
        raise HTTPException(
            status_code=403,
            detail="Access denied. You can only access your own data."
        )
    
    return current_user

# ==================== HELPER FUNCTIONS ====================

def get_user_companies(user: user_models.User, db: Session) -> list:
    """Get all company IDs accessible by user"""
    from user.user_models import UserCompanyAccess
    
    accesses = db.query(UserCompanyAccess).filter(
        UserCompanyAccess.user_id == user.id
    ).all()
    
    return list(set(acc.company_id for acc in accesses))

def get_user_plants(user: user_models.User, db: Session) -> list:
    """Get all plant IDs accessible by user"""
    from user.user_models import UserCompanyAccess
    
    accesses = db.query(UserCompanyAccess).filter(
        UserCompanyAccess.user_id == user.id,
        UserCompanyAccess.plant_id.isnot(None)
    ).all()
    
    return list(set(acc.plant_id for acc in accesses))

def check_user_has_company_access(
    user: user_models.User,
    company_id: int,
    db: Session
) -> bool:
    """Check if user has access to specific company"""
    from user.user_models import UserCompanyAccess
    
    access = db.query(UserCompanyAccess).filter(
        UserCompanyAccess.user_id == user.id,
        UserCompanyAccess.company_id == company_id
    ).first()
    
    return access is not None

def check_user_has_plant_access(
    user: user_models.User,
    plant_id: int,
    db: Session
) -> bool:
    """Check if user has access to specific plant"""
    from user.user_models import UserCompanyAccess
    
    access = db.query(UserCompanyAccess).filter(
        UserCompanyAccess.user_id == user.id,
        UserCompanyAccess.plant_id == plant_id
    ).first()
    
    return access is not None