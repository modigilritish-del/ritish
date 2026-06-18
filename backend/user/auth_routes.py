"""user/auth_routes.py - UPDATED with Proper Token Management"""
import base64
import hashlib
import io
from datetime import datetime, timedelta, timezone

import numpy as np
from fastapi import APIRouter, HTTPException, Depends, Form, UploadFile, File
from PIL import Image
from sqlalchemy.orm import Session

from database import get_db
from user import user_models
from user import user_biometric_models as bio_models
from user.auth_middleware import TokenManager  # Import token manager

router = APIRouter()

# ==================== UTILITY FUNCTIONS ====================

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def get_biometric_settings(db: Session, user_id: int):
    """Get user's biometric settings"""
    settings = db.query(bio_models.BiometricSecuritySettings).filter(
        bio_models.BiometricSecuritySettings.user_id == user_id
    ).first()
    return settings

def extract_face_features(image_data: bytes) -> str:
    """Extract face features from image"""
    try:
        img = Image.open(io.BytesIO(image_data))
        if img.mode != 'RGB':
            img = img.convert('RGB')

        img = img.resize((128, 128), Image.Resampling.LANCZOS)
        img_array = np.array(img)

        h, w = img_array.shape[:2]
        regions = []

        for i in range(4):
            for j in range(4):
                region = img_array[i*h//4:(i+1)*h//4, j*w//4:(j+1)*w//4]
                avg_color = region.mean(axis=(0, 1))
                regions.append(avg_color)

        feature_vector = np.array(regions).flatten()
        return ','.join([f"{x:.2f}" for x in feature_vector])
    except Exception as e:
        print(f"Feature extraction error: {e}")
        raise

def calculate_face_similarity(features1: str, features2: str) -> int:
    """Calculate similarity score 0-100"""
    try:
        vec1 = np.array([float(x) for x in features1.split(',')])
        vec2 = np.array([float(x) for x in features2.split(',')])

        distance = np.linalg.norm(vec1 - vec2)
        max_distance = 500
        similarity = max(0, min(100, 100 - (distance / max_distance * 100)))

        return int(similarity)
    except Exception as e:
        print(f"Similarity calculation error: {e}")
        return 0

# ==================== LOGIN ENDPOINTS ====================

@router.post("/auth/check-login-options")
async def check_login_options(
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    """Check available login methods for user"""
    user = db.query(user_models.User).filter(
        user_models.User.email == email.lower().strip()
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    settings = get_biometric_settings(db, user.id)  # type: ignore[arg-type]

    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "login_options": {
            "password": True,
            "fingerprint": settings.fingerprint_enabled if settings else False,
            "face": settings.face_recognition_enabled if settings else False
        }
    }

@router.post("/auth/login/password")
async def login_with_password(
    user_id: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Login with password - Returns access token"""
    user_id_lower = user_id.lower().strip()

    user = db.query(user_models.User).filter(
        (user_models.User.email == user_id_lower) |
        (user_models.User.user_id == user_id_lower)
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bool(user.is_active):
        raise HTTPException(status_code=403, detail="Account is disabled")

    hashed_input = hash_password(password)
    if hashed_input != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create token using TokenManager
    access_token = TokenManager.create_token(user.id)  # type: ignore[arg-type]

    print(f"✅ Password login successful for user {user.id}")

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "user_id": user.user_id
        },
        "access_token": access_token
    }

@router.post("/auth/login/fingerprint")
async def login_with_fingerprint(
    email: str = Form(...),
    fingerprint_image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Login with fingerprint - Returns access token"""
    print(f"🔍 Fingerprint login attempt for: {email}")

    user = db.query(user_models.User).filter(
        user_models.User.email == email.lower().strip()
    ).first()

    if not user or not bool(user.is_active):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    settings = get_biometric_settings(db, user.id)  # type: ignore[arg-type]
    if not settings or not bool(settings.fingerprint_enabled):
        raise HTTPException(status_code=400, detail="Fingerprint login not enabled")

    # Check account lock
    if bool(settings.is_locked):
        now = datetime.now(timezone.utc)
        if bool(settings.locked_until) and bool(settings.locked_until > now):
            remaining = (settings.locked_until - now).seconds // 60
            raise HTTPException(status_code=403, detail=f"Account locked for {remaining} minutes")
        else:
            settings.is_locked = False  # type: ignore[assignment]
            settings.failed_attempts_count = 0  # type: ignore[assignment]
            db.commit()

    # Process fingerprint
    image_data = await fingerprint_image.read()
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    input_hash = hashlib.sha256(image_base64.encode()).hexdigest()

    # Get enrolled fingerprints
    fingerprints = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.user_id == user.id,
        bio_models.UserFingerprint.is_active == True  # pylint: disable=C0121
    ).all()

    if not fingerprints:
        raise HTTPException(status_code=400, detail="No fingerprints enrolled")

    # Match fingerprint
    best_match = None
    best_score = 0

    for fp in fingerprints:
        if input_hash == fp.fingerprint_hash:
            similarity = 100
        else:
            matches = sum(c1 == c2 for c1, c2 in zip(input_hash, str(fp.fingerprint_hash)))
            similarity = int((matches / len(input_hash)) * 100)

        if similarity > best_score:
            best_score = similarity
            best_match = fp

    # Check threshold
    if bool(best_score >= settings.fingerprint_match_threshold):
        # SUCCESS
        settings.failed_attempts_count = 0  # type: ignore[assignment]
        if best_match:
            best_match.is_verified = True  # type: ignore[assignment]
            best_match.last_verified_at = datetime.now(timezone.utc)  # type: ignore[assignment]

        # Log success
        attempt = bio_models.BiometricLoginAttempt(
            user_id=user.id,
            email=email.lower(),
            biometric_type="fingerprint",
            attempt_status="success",
            match_score=best_score,
            matched_biometric_id=best_match.id if best_match else None
        )
        db.add(attempt)
        db.commit()

        # Create token
        access_token = TokenManager.create_token(user.id)  # type: ignore[arg-type]

        print(f"✅ Fingerprint login successful for user {user.id}")

        return {
            "success": True,
            "message": "Fingerprint login successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "user_id": user.user_id
            },
            "access_token": access_token,
            "match_score": best_score
        }
    else:
        # FAILED
        settings.failed_attempts_count += 1  # type: ignore[assignment]
        settings.last_failed_attempt_at = datetime.now(timezone.utc)  # type: ignore[assignment]

        if bool(settings.failed_attempts_count >= settings.max_failed_attempts):
            settings.is_locked = True  # type: ignore[assignment]
            settings.locked_until = (  # type: ignore[assignment]
                datetime.now(timezone.utc)
                + timedelta(minutes=settings.lockout_duration_minutes)  # type: ignore[arg-type]
            )

        attempt = bio_models.BiometricLoginAttempt(
            user_id=user.id,
            email=email.lower(),
            biometric_type="fingerprint",
            attempt_status="failed",
            failure_reason=f"Match score {best_score}% below threshold",
            match_score=best_score
        )
        db.add(attempt)
        db.commit()

        remaining = settings.max_failed_attempts - settings.failed_attempts_count
        raise HTTPException(
            status_code=401,
            detail=f"Fingerprint did not match. {remaining} attempts remaining"
        )

@router.post("/auth/login/face-live")
async def login_with_face_live(
    email: str = Form(...),
    video_frame: str = Form(...),
    db: Session = Depends(get_db)
):
    """Login with live face capture - Returns access token"""
    print(f"🔍 Face login attempt for: {email}")

    user = db.query(user_models.User).filter(
        user_models.User.email == email.lower().strip()
    ).first()

    if not user or not bool(user.is_active):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    settings = get_biometric_settings(db, user.id)  # type: ignore[arg-type]
    if not settings or not bool(settings.face_recognition_enabled):
        raise HTTPException(status_code=400, detail="Face recognition not enabled")

    # Check lock
    if bool(settings.is_locked):
        now = datetime.now(timezone.utc)
        if bool(settings.locked_until) and bool(settings.locked_until > now):
            remaining = (settings.locked_until - now).seconds // 60
            raise HTTPException(status_code=403, detail=f"Account locked for {remaining} minutes")
        else:
            settings.is_locked = False  # type: ignore[assignment]
            settings.failed_attempts_count = 0  # type: ignore[assignment]
            db.commit()

    # Decode frame
    if ',' in video_frame:
        video_frame = video_frame.split(',')[1]
    image_bytes = base64.b64decode(video_frame)

    # Extract features
    current_features = extract_face_features(image_bytes)

    # Get enrolled faces
    faces = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.user_id == user.id,
        bio_models.UserFaceImage.is_active == True  # pylint: disable=C0121
    ).all()

    if not faces:
        raise HTTPException(status_code=400, detail="No face enrolled")

    # Match face
    best_match = None
    best_score = 0

    for face in faces:
        similarity = calculate_face_similarity(current_features, str(face.face_encoding))
        if similarity > best_score:
            best_score = similarity
            best_match = face

    # Check threshold
    if bool(best_score >= settings.face_match_threshold):
        # SUCCESS
        settings.failed_attempts_count = 0  # type: ignore[assignment]
        if best_match:
            best_match.is_verified = True  # type: ignore[assignment]
            best_match.last_verified_at = datetime.now(timezone.utc)  # type: ignore[assignment]

        attempt = bio_models.BiometricLoginAttempt(
            user_id=user.id,
            email=email.lower(),
            biometric_type="face",
            attempt_status="success",
            match_score=best_score,
            matched_biometric_id=best_match.id if best_match else None
        )
        db.add(attempt)
        db.commit()

        # Create token
        access_token = TokenManager.create_token(user.id)  # type: ignore[arg-type]

        print(f"✅ Face login successful for user {user.id}")

        return {
            "success": True,
            "message": "Face recognition login successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "user_id": user.user_id
            },
            "access_token": access_token,
            "match_score": best_score
        }
    else:
        # FAILED
        settings.failed_attempts_count += 1  # type: ignore[assignment]
        settings.last_failed_attempt_at = datetime.now(timezone.utc)  # type: ignore[assignment]

        if bool(settings.failed_attempts_count >= settings.max_failed_attempts):
            settings.is_locked = True  # type: ignore[assignment]
            settings.locked_until = (  # type: ignore[assignment]
                datetime.now(timezone.utc)
                + timedelta(minutes=settings.lockout_duration_minutes)  # type: ignore[arg-type]
            )

        attempt = bio_models.BiometricLoginAttempt(
            user_id=user.id,
            email=email.lower(),
            biometric_type="face",
            attempt_status="failed",
            failure_reason=f"Match score {best_score}% below threshold",
            match_score=best_score
        )
        db.add(attempt)
        db.commit()

        remaining = settings.max_failed_attempts - settings.failed_attempts_count
        raise HTTPException(
            status_code=401,
            detail=f"Face did not match. {remaining} attempts remaining"
        )

@router.post("/auth/logout")
async def logout(authorization: str = Form(...)):
    """Logout and revoke token"""
    token = authorization.replace("Bearer ", "").strip()
    TokenManager.revoke_token(token)

    return {
        "success": True,
        "message": "Logged out successfully"
    }

@router.get("/auth/verify-token")
async def verify_token(authorization: str = Form(...)):
    """Verify if token is valid"""
    token = authorization.replace("Bearer ", "").strip()
    user_id = TokenManager.verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return {
        "valid": True,
        "user_id": user_id
    }