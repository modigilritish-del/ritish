"""user/biometric_schemas.py - Biometric API Schemas"""
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class FingerTypeEnum(str, Enum):
    """Finger types"""
    LEFT_THUMB = "left_thumb"
    LEFT_INDEX = "left_index"
    LEFT_MIDDLE = "left_middle"
    LEFT_RING = "left_ring"
    LEFT_PINKY = "left_pinky"
    RIGHT_THUMB = "right_thumb"
    RIGHT_INDEX = "right_index"
    RIGHT_MIDDLE = "right_middle"
    RIGHT_RING = "right_ring"
    RIGHT_PINKY = "right_pinky"


class FaceAngleEnum(str, Enum):
    """Face angles"""
    FRONT = "front"
    LEFT_PROFILE = "left_profile"
    RIGHT_PROFILE = "right_profile"
    SLIGHT_LEFT = "slight_left"
    SLIGHT_RIGHT = "slight_right"


# ==================== FINGERPRINT SCHEMAS ====================

class FingerprintUploadResponse(BaseModel):
    """Response after fingerprint upload"""
    id: int
    user_id: int
    finger_type: str
    cloudinary_url: str
    cloudinary_secure_url: str
    is_verified: bool
    created_at: datetime

class FingerprintListResponse(BaseModel):
    """List of user's fingerprints"""
    id: int
    finger_type: str
    is_active: bool
    is_verified: bool
    cloudinary_secure_url: str
    last_verified_at: Optional[datetime]
    created_at: datetime


# ==================== FACE RECOGNITION SCHEMAS ====================

class FaceImageUploadResponse(BaseModel):
    """Response after face image upload"""
    id: int
    user_id: int
    face_angle: str
    cloudinary_url: str
    cloudinary_secure_url: str
    confidence_score: int
    is_verified: bool
    created_at: datetime

class FaceImageListResponse(BaseModel):
    """List of user's face images"""
    id: int
    face_angle: str
    is_active: bool
    is_verified: bool
    confidence_score: int
    cloudinary_secure_url: str
    last_verified_at: Optional[datetime]
    created_at: datetime


# ==================== ENROLLMENT SCHEMAS ====================

class EnrollmentStartRequest(BaseModel):
    """Start biometric enrollment session"""
    user_id: int
    biometric_type: str = Field(..., pattern="^(fingerprint|face)$")

class EnrollmentStartResponse(BaseModel):
    """Enrollment session details"""
    session_token: str
    user_id: int
    biometric_type: str
    total_required: int
    expires_at: datetime
    message: str

class EnrollmentProgressResponse(BaseModel):
    """Enrollment progress"""
    session_token: str
    biometric_type: str
    total_required: int
    total_captured: int
    remaining: int
    status: str
    items_captured: List[Dict[str, Any]]


# ==================== BIOMETRIC LOGIN SCHEMAS ====================

class BiometricLoginRequest(BaseModel):
    """Biometric login request"""
    email: EmailStr
    biometric_type: str = Field(..., pattern="^(fingerprint|face)$")

class BiometricVerifyRequest(BaseModel):
    """Verify biometric for login"""
    email: EmailStr
    biometric_type: str
    biometric_id: Optional[int] = None  # Specific fingerprint/face ID to verify

class BiometricLoginResponse(BaseModel):
    """Biometric login response"""
    success: bool
    message: str
    user_id: Optional[int] = None
    match_score: Optional[int] = None
    access_token: Optional[str] = None
    requires_password: bool = False


# ==================== SECURITY SETTINGS SCHEMAS ====================

class BiometricSecurityUpdate(BaseModel):
    """Update biometric security settings"""
    fingerprint_enabled: Optional[bool] = None
    face_recognition_enabled: Optional[bool] = None
    require_both: Optional[bool] = None
    require_password_with_biometric: Optional[bool] = None
    fingerprint_match_threshold: Optional[int] = Field(None, ge=0, le=100)
    face_match_threshold: Optional[int] = Field(None, ge=0, le=100)

class BiometricSecurityResponse(BaseModel):
    """Biometric security settings"""
    user_id: int
    fingerprint_enabled: bool
    face_recognition_enabled: bool
    require_both: bool
    require_password_with_biometric: bool
    fingerprint_match_threshold: int
    face_match_threshold: int
    min_fingerprints_required: int
    min_face_angles_required: int
    is_locked: bool
    locked_until: Optional[datetime]


# ==================== STATUS & STATS SCHEMAS ====================

class BiometricStatusResponse(BaseModel):
    """User's biometric enrollment status"""
    user_id: int
    email: str
    full_name: str
    fingerprints_enrolled: int
    faces_enrolled: int
    fingerprint_enabled: bool
    face_recognition_enabled: bool
    is_fully_enrolled: bool
    missing_fingerprints: List[str]
    missing_face_angles: List[str]
    can_login_with_biometric: bool

class BiometricStatsResponse(BaseModel):
    """System-wide biometric stats"""
    total_users: int
    users_with_fingerprints: int
    users_with_faces: int
    total_fingerprints: int
    total_faces: int
    total_login_attempts: int
    successful_logins: int
    failed_logins: int


# ==================== DELETION SCHEMAS ====================

class BiometricDeleteRequest(BaseModel):
    """Delete specific biometric"""
    user_id: int
    biometric_type: str
    biometric_id: int

class BiometricDeleteAllRequest(BaseModel):
    """Delete all biometrics for user"""
    user_id: int
    confirm: bool = Field(..., description="Must be True to confirm deletion")