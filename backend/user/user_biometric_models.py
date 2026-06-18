"""user/user_biometric_models.py - Biometric Authentication Database Models"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class BiometricType(enum.Enum):
    """Types of biometric authentication"""
    FINGERPRINT = "fingerprint"
    FACE = "face"


class FingerType(enum.Enum):
    """Finger types for fingerprint storage"""
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


class FaceAngle(enum.Enum):
    """Face angles for face recognition"""
    FRONT = "front"
    LEFT_PROFILE = "left_profile"
    RIGHT_PROFILE = "right_profile"
    SLIGHT_LEFT = "slight_left"
    SLIGHT_RIGHT = "slight_right"


class UserFingerprint(Base):
    """Store user fingerprint data"""
    __tablename__ = "user_fingerprints"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    finger_type = Column(String(50), nullable=False)  # From FingerType enum
    
    # Cloudinary storage
    cloudinary_public_id = Column(String(500), nullable=False, unique=True, index=True)
    cloudinary_url = Column(Text, nullable=False)
    cloudinary_secure_url = Column(Text, nullable=False)
    cloudinary_folder = Column(String(500), nullable=False)  # item_master/fingerprints/{user_id}
    
    # Fingerprint metadata
    image_format = Column(String(10), nullable=False)  # jpg, png
    image_size = Column(Integer, nullable=False)  # Size in bytes
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)
    
    # Biometric hash for matching (encrypted)
    fingerprint_hash = Column(Text, nullable=False)  # Encrypted biometric template
    hash_algorithm = Column(String(50), nullable=False, default="SHA256")
    
    # Security
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_attempts = Column(Integer, default=0)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_ip = Column(String(50), nullable=True)
    
    # Relationships
    user = relationship("User", backref="fingerprints")


class UserFaceImage(Base):
    """Store user face images for recognition"""
    __tablename__ = "user_face_images"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    face_angle = Column(String(50), nullable=False)  # From FaceAngle enum
    
    # Cloudinary storage
    cloudinary_public_id = Column(String(500), nullable=False, unique=True, index=True)
    cloudinary_url = Column(Text, nullable=False)
    cloudinary_secure_url = Column(Text, nullable=False)
    cloudinary_folder = Column(String(500), nullable=False)  # item_master/faces/{user_id}
    
    # Face metadata
    image_format = Column(String(10), nullable=False)  # jpg, png
    image_size = Column(Integer, nullable=False)  # Size in bytes
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)
    
    # Face encoding for recognition (encrypted)
    face_encoding = Column(Text, nullable=False)  # Encrypted face encoding vector
    encoding_algorithm = Column(String(50), nullable=False, default="dlib")
    confidence_score = Column(Integer, nullable=True)  # 0-100
    
    # Security
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verification_attempts = Column(Integer, default=0)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_ip = Column(String(50), nullable=True)
    
    # Relationships
    user = relationship("User", backref="face_images")


class BiometricLoginAttempt(Base):
    """Log all biometric login attempts for security"""
    __tablename__ = "biometric_login_attempts"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)
    email = Column(String(255), nullable=False, index=True)  # Email used for login attempt
    
    biometric_type = Column(String(50), nullable=False)  # fingerprint or face
    attempt_status = Column(String(50), nullable=False)  # success, failed, rejected, error
    failure_reason = Column(String(500), nullable=True)
    
    # Match details
    match_score = Column(Integer, nullable=True)  # 0-100
    matched_biometric_id = Column(Integer, nullable=True)  # ID of matched fingerprint/face
    
    # Security tracking
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    device_info = Column(Text, nullable=True)
    geolocation = Column(String(255), nullable=True)
    
    # Timestamps
    attempted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", backref="biometric_attempts")


class BiometricSecuritySettings(Base):
    """User-specific biometric security settings"""
    __tablename__ = "biometric_security_settings"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    
    # Feature toggles
    fingerprint_enabled = Column(Boolean, default=False, nullable=False)
    face_recognition_enabled = Column(Boolean, default=False, nullable=False)
    require_both = Column(Boolean, default=False, nullable=False)  # Require both fingerprint AND face
    
    # Security settings
    max_failed_attempts = Column(Integer, default=5, nullable=False)
    lockout_duration_minutes = Column(Integer, default=30, nullable=False)
    require_password_with_biometric = Column(Boolean, default=False, nullable=False)
    
    # Minimum requirements
    min_fingerprints_required = Column(Integer, default=1, nullable=False)
    min_face_angles_required = Column(Integer, default=1, nullable=False)
    
    # Match thresholds
    fingerprint_match_threshold = Column(Integer, default=80, nullable=False)  # 0-100
    face_match_threshold = Column(Integer, default=75, nullable=False)  # 0-100
    
    # Status
    is_locked = Column(Boolean, default=False, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    failed_attempts_count = Column(Integer, default=0, nullable=False)
    last_failed_attempt_at = Column(DateTime(timezone=True), nullable=True)
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="biometric_settings", uselist=False)


class BiometricEnrollmentSession(Base):
    """Track biometric enrollment sessions"""
    __tablename__ = "biometric_enrollment_sessions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    session_token = Column(String(255), nullable=False, unique=True, index=True)
    
    biometric_type = Column(String(50), nullable=False)  # fingerprint or face
    status = Column(String(50), nullable=False, default="in_progress")  # in_progress, completed, cancelled, expired
    
    # Progress tracking
    total_required = Column(Integer, nullable=False)
    total_captured = Column(Integer, default=0, nullable=False)
    
    # Session security
    ip_address = Column(String(50), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", backref="enrollment_sessions")