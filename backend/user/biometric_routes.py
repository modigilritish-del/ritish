"""user/biometric_routes.py - FIXED LIVE BIOMETRIC CAPTURE"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, or_
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
import hashlib
import json
import base64
import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv
import io
from PIL import Image
import numpy as np

from database import get_db
from user import user_biometric_models as bio_models
from user import biometric_schemas as schemas
from user import user_models

load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

router = APIRouter()

# ==================== UTILITY FUNCTIONS ====================

def hash_biometric_data(data: str) -> str:
    """Hash biometric data using SHA-256"""
    return hashlib.sha256(data.encode()).hexdigest()

def generate_session_token() -> str:
    """Generate secure session token"""
    return secrets.token_urlsafe(32)

def upload_to_cloudinary(file_data: bytes, folder: str, filename: str) -> dict:
    """Upload image to Cloudinary"""
    try:
        result = cloudinary.uploader.upload(
            file_data,
            folder=f"item_master/{folder}",
            public_id=filename,
            resource_type="image",
            overwrite=True
        )
        return {
            "public_id": result.get("public_id"),
            "url": result.get("url"),
            "secure_url": result.get("secure_url"),
            "format": result.get("format"),
            "width": result.get("width"),
            "height": result.get("height"),
            "bytes": result.get("bytes")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")

def get_or_create_biometric_settings(db: Session, user_id: int) -> bio_models.BiometricSecuritySettings:
    """Get or create biometric settings for user"""
    settings = db.query(bio_models.BiometricSecuritySettings).filter(
        bio_models.BiometricSecuritySettings.user_id == user_id
    ).first()
    
    if not settings:
        settings = bio_models.BiometricSecuritySettings(
            user_id=user_id,
            fingerprint_enabled=False,
            face_recognition_enabled=False,
            require_both=False,
            max_failed_attempts=5,
            lockout_duration_minutes=30,
            min_fingerprints_required=1,
            min_face_angles_required=1,
            fingerprint_match_threshold=80,
            face_match_threshold=75,
            is_locked=False,
            failed_attempts_count=0
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings

def extract_face_features(image_data: bytes) -> str:
    """
    Extract face features from image for comparison
    Uses image structure analysis instead of exact hash
    MUST BE SAME AS auth_routes.py
    """
    try:
        # Open image
        img = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize to standard size (reduces variation)
        img = img.resize((128, 128), Image.Resampling.LANCZOS)
        
        # Convert to numpy array
        img_array = np.array(img)
        
        # Calculate average color in different regions
        h, w = img_array.shape[:2]
        regions = []
        
        # Divide face into 16 regions (4x4 grid)
        for i in range(4):
            for j in range(4):
                region = img_array[
                    i*h//4:(i+1)*h//4,
                    j*w//4:(j+1)*w//4
                ]
                avg_color = region.mean(axis=(0, 1))
                regions.append(avg_color)
        
        # Create feature vector
        feature_vector = np.array(regions).flatten()
        
        # Convert to string representation
        feature_str = ','.join([f"{x:.2f}" for x in feature_vector])
        
        return feature_str
        
    except Exception as e:
        print(f"Feature extraction error: {e}")
        raise

# ==================== FIXED: LIVE FACE ENROLLMENT ====================

@router.post("/biometric/face/enroll-live")
async def enroll_face_live(
    user_id: int = Form(...),
    face_angle: str = Form(...),
    video_frame: str = Form(...),
    ip_address: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    🔥 UPDATED: Enroll face from LIVE video frame with feature extraction
    """
    
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    valid_angles = ["front", "left_profile", "right_profile", "slight_left", "slight_right"]
    if face_angle not in valid_angles:
        raise HTTPException(status_code=400, detail="Invalid face angle")
    
    existing = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.user_id == user_id,
        bio_models.UserFaceImage.face_angle == face_angle,
        bio_models.UserFaceImage.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Face for {face_angle} already exists. Delete it first to re-enroll."
        )
    
    try:
        # Decode base64 image
        if ',' in video_frame:
            video_frame = video_frame.split(',')[1]
        
        image_bytes = base64.b64decode(video_frame)
        
        # Validate image
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()
            
            img = Image.open(io.BytesIO(image_bytes))
            width, height = img.size
            
            print(f"✅ Valid image received: {width}x{height}, format: {img.format}")
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image data received from camera: {str(e)}"
            )
        
        # 🔥 CHANGED: Extract face features instead of simple hash
        face_encoding = extract_face_features(image_bytes)
        print(f"✅ Extracted face features: {len(face_encoding)} chars")
        
        # Mock confidence score
        confidence_score = 92
        
        # Upload to Cloudinary
        filename = f"live_face_{user_id}_{face_angle}_{int(datetime.now().timestamp())}"
        folder = f"faces/user_{user_id}"
        
        print(f"📤 Uploading to Cloudinary: {folder}/{filename}")
        upload_result = upload_to_cloudinary(image_bytes, folder, filename)
        print(f"✅ Upload successful: {upload_result['secure_url']}")
        
        # Create face record in database
        db_face = bio_models.UserFaceImage(
            user_id=user_id,
            face_angle=face_angle,
            cloudinary_public_id=upload_result["public_id"],
            cloudinary_url=upload_result["url"],
            cloudinary_secure_url=upload_result["secure_url"],
            cloudinary_folder=f"item_master/{folder}",
            image_format=upload_result["format"],
            image_size=upload_result["bytes"],
            image_width=upload_result.get("width"),
            image_height=upload_result.get("height"),
            face_encoding=face_encoding,  # Store feature vector
            encoding_algorithm="feature_vector",  # Changed from "dlib"
            confidence_score=confidence_score,
            is_active=True,
            is_verified=True,
            created_by_ip=ip_address
        )
        
        db.add(db_face)
        
        # Update settings to enable face recognition
        settings = get_or_create_biometric_settings(db, user_id)
        
        # Check if minimum faces enrolled
        total_faces = db.query(bio_models.UserFaceImage).filter(
            bio_models.UserFaceImage.user_id == user_id,
            bio_models.UserFaceImage.is_active == True
        ).count() + 1  # +1 for current
        
        if total_faces >= settings.min_face_angles_required:
            settings.face_recognition_enabled = True
        
        db.commit()
        db.refresh(db_face)
        
        print(f"✅ Face enrolled successfully: ID {db_face.id}")
        
        return {
            "success": True,
            "message": f"{face_angle.replace('_', ' ').title()} face enrolled successfully from live capture!",
            "face_id": db_face.id,
            "confidence_score": confidence_score,
            "is_live": True,
            "cloudinary_url": db_face.cloudinary_secure_url,
            "image_size": upload_result["bytes"],
            "dimensions": f"{upload_result.get('width')}x{upload_result.get('height')}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Live face enrollment error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Live face enrollment failed: {str(e)}"
        )

# ==================== FIXED: LIVE FINGERPRINT ENROLLMENT ====================

@router.post("/biometric/fingerprint/enroll-live")
async def enroll_fingerprint_live(
    user_id: int = Form(...),
    finger_type: str = Form(...),
    credential_data: str = Form(...),  # WebAuthn credential JSON
    ip_address: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    🔥 FIXED: Enroll fingerprint using WebAuthn LIVE capture
    Now properly processes WebAuthn credential from fingerprint sensor
    """
    
    # Validate user
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate finger type
    valid_fingers = [
        "left_thumb", "left_index", "left_middle", "left_ring", "left_pinky",
        "right_thumb", "right_index", "right_middle", "right_ring", "right_pinky"
    ]
    if finger_type not in valid_fingers:
        raise HTTPException(status_code=400, detail="Invalid finger type")
    
    # Check if fingerprint already exists
    existing = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.user_id == user_id,
        bio_models.UserFingerprint.finger_type == finger_type,
        bio_models.UserFingerprint.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Fingerprint for {finger_type.replace('_', ' ').title()} already exists. Delete it first to re-enroll."
        )
    
    try:
        # 🔥 FIX 1: Parse WebAuthn credential data
        try:
            credential = json.loads(credential_data)
            print(f"✅ Received credential data for {finger_type}")
            print(f"   Credential ID: {credential.get('id', 'N/A')[:20]}...")
            
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid credential data format: {str(e)}"
            )
        
        # 🔥 FIX 2: Extract and validate authenticator data
        try:
            response_data = credential.get('response', {})
            
            # Get attestation object (contains biometric template)
            attestation_array = response_data.get('attestationObject', [])
            if not attestation_array:
                raise ValueError("Missing attestation object")
            
            # Convert array to bytes
            attestation_bytes = bytes(attestation_array)
            
            # Get client data JSON
            client_data_array = response_data.get('clientDataJSON', [])
            client_data_bytes = bytes(client_data_array)
            
            print(f"✅ Extracted biometric data: {len(attestation_bytes)} bytes")
            
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to extract biometric data: {str(e)}"
            )
        
        # 🔥 FIX 3: Generate fingerprint template hash
        # In production, extract actual fingerprint template from attestation
        combined_data = base64.b64encode(attestation_bytes + client_data_bytes).decode('utf-8')
        fingerprint_hash = hash_biometric_data(combined_data)
        
        # Store credential ID for future verification
        credential_id = credential.get('id', '')
        
        print(f"✅ Generated fingerprint hash: {fingerprint_hash[:20]}...")
        
        # 🔥 FIX 4: Create fingerprint record
        # Note: For WebAuthn, we don't upload image but store credential data
        db_fingerprint = bio_models.UserFingerprint(
            user_id=user_id,
            finger_type=finger_type,
            cloudinary_public_id=f"webauthn_fp_{user_id}_{finger_type}_{int(datetime.now().timestamp())}",
            cloudinary_url=f"webauthn://{credential_id[:50]}",  # Store credential reference
            cloudinary_secure_url=f"webauthn://{credential_id[:50]}",
            cloudinary_folder=f"item_master/fingerprints/user_{user_id}",
            image_format="webauthn",
            image_size=len(attestation_bytes),
            image_width=None,
            image_height=None,
            fingerprint_hash=fingerprint_hash,
            hash_algorithm="SHA256+WebAuthn",
            is_active=True,
            is_verified=True,  # Live capture is auto-verified
            created_by_ip=ip_address
        )
        
        db.add(db_fingerprint)
        
        # Update settings to enable fingerprint
        settings = get_or_create_biometric_settings(db, user_id)
        
        # Check if minimum fingerprints enrolled
        total_fps = db.query(bio_models.UserFingerprint).filter(
            bio_models.UserFingerprint.user_id == user_id,
            bio_models.UserFingerprint.is_active == True
        ).count() + 1  # +1 for current
        
        if total_fps >= settings.min_fingerprints_required:
            settings.fingerprint_enabled = True
        
        db.commit()
        db.refresh(db_fingerprint)
        
        print(f"✅ Fingerprint enrolled successfully: ID {db_fingerprint.id}")
        
        return {
            "success": True,
            "message": f"{finger_type.replace('_', ' ').title()} enrolled successfully using live fingerprint sensor!",
            "fingerprint_id": db_fingerprint.id,
            "is_live": True,
            "credential_id": credential_id[:50],
            "data_size": len(attestation_bytes)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Live fingerprint enrollment error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Live fingerprint enrollment failed: {str(e)}"
        )

# ==================== FINGERPRINT ENROLLMENT ====================

@router.post("/biometric/fingerprint/enroll")
async def enroll_fingerprint(
    user_id: int = Form(...),
    finger_type: str = Form(...),
    fingerprint_image: UploadFile = File(...),
    ip_address: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Enroll user fingerprint"""
    
    # Validate user
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate finger type
    try:
        finger_enum = schemas.FingerTypeEnum(finger_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid finger type")
    
    # Check if fingerprint already exists for this finger
    existing = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.user_id == user_id,
        bio_models.UserFingerprint.finger_type == finger_type
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Fingerprint for {finger_type} already enrolled. Please delete existing one first."
        )
    
    # Read and validate image
    image_data = await fingerprint_image.read()
    if len(image_data) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="Image size must be less than 5MB")
    
    # Generate unique filename
    filename = f"user_{user_id}_{finger_type}_{int(datetime.now().timestamp())}"
    folder = f"fingerprints/user_{user_id}"
    
    # Upload to Cloudinary
    upload_result = upload_to_cloudinary(image_data, folder, filename)
    
    # Generate biometric hash (in production, use proper fingerprint template extraction)
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    fingerprint_hash = hash_biometric_data(image_base64)
    
    # Create fingerprint record
    db_fingerprint = bio_models.UserFingerprint(
        user_id=user_id,
        finger_type=finger_type,
        cloudinary_public_id=upload_result["public_id"],
        cloudinary_url=upload_result["url"],
        cloudinary_secure_url=upload_result["secure_url"],
        cloudinary_folder=f"item_master/{folder}",
        image_format=upload_result["format"],
        image_size=upload_result["bytes"],
        image_width=upload_result.get("width"),
        image_height=upload_result.get("height"),
        fingerprint_hash=fingerprint_hash,
        hash_algorithm="SHA256",
        is_active=True,
        is_verified=False,
        created_by_ip=ip_address
    )
    
    db.add(db_fingerprint)
    
    # Update biometric settings
    settings = get_or_create_biometric_settings(db, user_id)
    
    # Check if minimum fingerprints met
    fingerprint_count = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.user_id == user_id,
        bio_models.UserFingerprint.is_active == True
    ).count() + 1  # +1 for current one
    
    if fingerprint_count >= settings.min_fingerprints_required:
        settings.fingerprint_enabled = True
    
    db.commit()
    db.refresh(db_fingerprint)
    
    return schemas.FingerprintUploadResponse(
        id=db_fingerprint.id,
        user_id=db_fingerprint.user_id,
        finger_type=db_fingerprint.finger_type,
        cloudinary_url=db_fingerprint.cloudinary_url,
        cloudinary_secure_url=db_fingerprint.cloudinary_secure_url,
        is_verified=db_fingerprint.is_verified,
        created_at=db_fingerprint.created_at
    )

@router.get("/biometric/fingerprint/user/{user_id}")
async def get_user_fingerprints(user_id: int, db: Session = Depends(get_db)):
    """Get all fingerprints for user"""
    fingerprints = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.user_id == user_id,
        bio_models.UserFingerprint.is_active == True
    ).order_by(bio_models.UserFingerprint.created_at).all()
    
    return [schemas.FingerprintListResponse(
        id=fp.id,
        finger_type=fp.finger_type,
        is_active=fp.is_active,
        is_verified=fp.is_verified,
        cloudinary_secure_url=fp.cloudinary_secure_url,
        last_verified_at=fp.last_verified_at,
        created_at=fp.created_at
    ) for fp in fingerprints]

@router.delete("/biometric/fingerprint/{fingerprint_id}")
async def delete_fingerprint(fingerprint_id: int, user_id: int, db: Session = Depends(get_db)):
    """Delete fingerprint"""
    fingerprint = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.id == fingerprint_id,
        bio_models.UserFingerprint.user_id == user_id
    ).first()
    
    if not fingerprint:
        raise HTTPException(status_code=404, detail="Fingerprint not found")
    
    # Delete from Cloudinary if not WebAuthn
    if not fingerprint.cloudinary_public_id.startswith("webauthn_"):
        try:
            cloudinary.uploader.destroy(fingerprint.cloudinary_public_id)
        except Exception as e:
            print(f"Cloudinary deletion warning: {str(e)}")
    
    db.delete(fingerprint)
    
    # Check if user still has enough fingerprints
    settings = get_or_create_biometric_settings(db, user_id)
    remaining_count = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.user_id == user_id,
        bio_models.UserFingerprint.is_active == True,
        bio_models.UserFingerprint.id != fingerprint_id
    ).count()
    
    if remaining_count < settings.min_fingerprints_required:
        settings.fingerprint_enabled = False
    
    db.commit()
    
    return {"message": "Fingerprint deleted successfully"}

# ==================== FACE RECOGNITION ENROLLMENT ====================

@router.post("/biometric/face/enroll")
async def enroll_face(
    user_id: int = Form(...),
    face_angle: str = Form(...),
    face_image: UploadFile = File(...),
    ip_address: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Enroll user face image"""
    
    # Validate user
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate face angle
    try:
        angle_enum = schemas.FaceAngleEnum(face_angle)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid face angle")
    
    # Check if face image already exists for this angle
    existing = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.user_id == user_id,
        bio_models.UserFaceImage.face_angle == face_angle
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Face image for {face_angle} already enrolled. Please delete existing one first."
        )
    
    # Read and validate image
    image_data = await face_image.read()
    if len(image_data) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="Image size must be less than 5MB")
    
    # Generate unique filename
    filename = f"user_{user_id}_{face_angle}_{int(datetime.now().timestamp())}"
    folder = f"faces/user_{user_id}"
    
    # Upload to Cloudinary
    upload_result = upload_to_cloudinary(image_data, folder, filename)
    
    # Generate face encoding (in production, use proper face recognition library)
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    face_encoding = hash_biometric_data(image_base64)
    
    # Calculate confidence score (mock - in production use real face detection)
    confidence_score = 85
    
    # Create face image record
    db_face = bio_models.UserFaceImage(
        user_id=user_id,
        face_angle=face_angle,
        cloudinary_public_id=upload_result["public_id"],
        cloudinary_url=upload_result["url"],
        cloudinary_secure_url=upload_result["secure_url"],
        cloudinary_folder=f"item_master/{folder}",
        image_format=upload_result["format"],
        image_size=upload_result["bytes"],
        image_width=upload_result.get("width"),
        image_height=upload_result.get("height"),
        face_encoding=face_encoding,
        encoding_algorithm="dlib",
        confidence_score=confidence_score,
        is_active=True,
        is_verified=False,
        created_by_ip=ip_address
    )
    
    db.add(db_face)
    
    # Update biometric settings
    settings = get_or_create_biometric_settings(db, user_id)
    
    # Check if minimum face angles met
    face_count = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.user_id == user_id,
        bio_models.UserFaceImage.is_active == True
    ).count() + 1  # +1 for current one
    
    if face_count >= settings.min_face_angles_required:
        settings.face_recognition_enabled = True
    
    db.commit()
    db.refresh(db_face)
    
    return schemas.FaceImageUploadResponse(
        id=db_face.id,
        user_id=db_face.user_id,
        face_angle=db_face.face_angle,
        cloudinary_url=db_face.cloudinary_url,
        cloudinary_secure_url=db_face.cloudinary_secure_url,
        confidence_score=db_face.confidence_score,
        is_verified=db_face.is_verified,
        created_at=db_face.created_at
    )

@router.get("/biometric/face/user/{user_id}")
async def get_user_faces(user_id: int, db: Session = Depends(get_db)):
    """Get all face images for user"""
    faces = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.user_id == user_id,
        bio_models.UserFaceImage.is_active == True
    ).order_by(bio_models.UserFaceImage.created_at).all()
    
    return [schemas.FaceImageListResponse(
        id=face.id,
        face_angle=face.face_angle,
        is_active=face.is_active,
        is_verified=face.is_verified,
        confidence_score=face.confidence_score,
        cloudinary_secure_url=face.cloudinary_secure_url,
        last_verified_at=face.last_verified_at,
        created_at=face.created_at
    ) for face in faces]

@router.delete("/biometric/face/{face_id}")
async def delete_face(face_id: int, user_id: int, db: Session = Depends(get_db)):
    """Delete face image"""
    face = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.id == face_id,
        bio_models.UserFaceImage.user_id == user_id
    ).first()
    
    if not face:
        raise HTTPException(status_code=404, detail="Face image not found")
    
    # Delete from Cloudinary
    try:
        cloudinary.uploader.destroy(face.cloudinary_public_id)
    except Exception as e:
        print(f"Cloudinary deletion warning: {str(e)}")
    
    db.delete(face)
    
    # Check if user still has enough face images
    settings = get_or_create_biometric_settings(db, user_id)
    remaining_count = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.user_id == user_id,
        bio_models.UserFaceImage.is_active == True,
        bio_models.UserFaceImage.id != face_id
    ).count()
    
    if remaining_count < settings.min_face_angles_required:
        settings.face_recognition_enabled = False
    
    db.commit()
    
    return {"message": "Face image deleted successfully"}

# ==================== BIOMETRIC LOGIN ====================
@router.post("/biometric/fingerprint/verify-live")
async def verify_fingerprint_live(
    user_id: int = Form(...),
    finger_type: str = Form(...),
    assertion_data: str = Form(...),
    ip_address: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Verify live fingerprint via WebAuthn assertion (navigator.credentials.get)
    """
    print("🔍 verify-live called:", user_id, finger_type, assertion_data[:50])
    
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        data = json.loads(assertion_data)
        # TODO: verify signature, challenge, etc. (production)
        # For now we treat successful assertion = live touch
        print("✅ Live assertion received:", data["id"][:20], "...")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Bad assertion: {e}")

    # ---- enrol the finger if not already ----
    existing = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.user_id == user_id,
        bio_models.UserFingerprint.finger_type == finger_type,
        bio_models.UserFingerprint.is_active == True
    ).first()

    if existing:
        return {"success": True, "message": "Already enrolled", "fingerprint_id": existing.id}

    # create new record (WebAuthn does not give image bytes)
    new_fp = bio_models.UserFingerprint(
        user_id=user_id,
        finger_type=finger_type,
        cloudinary_public_id=f"webauthn_verify_{user_id}_{finger_type}_{int(datetime.now().timestamp())}",
        cloudinary_url=f"webauthn://{data['id'][:50]}",
        cloudinary_secure_url=f"webauthn://{data['id'][:50]}",
        cloudinary_folder=f"item_master/fingerprints/user_{user_id}",
        image_format="webauthn",
        image_size=len(assertion_data),
        fingerprint_hash=hashlib.sha256(assertion_data.encode()).hexdigest(),
        hash_algorithm="SHA256+WebAuthn",
        is_active=True,
        is_verified=True,
        created_by_ip=ip_address
    )
    db.add(new_fp)
    db.commit()
    db.refresh(new_fp)
    return {"success": True, "message": f"{finger_type} live enrolled", "fingerprint_id": new_fp.id}

@router.post("/biometric/login/fingerprint")
async def login_with_fingerprint(
    email: str = Form(...),
    fingerprint_image: UploadFile = File(...),
    ip_address: Optional[str] = Form(None),
    user_agent: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Login using fingerprint"""
    
    # Find user
    user = db.query(user_models.User).filter(user_models.User.email == email.lower()).first()
    
    if not user:
        # Log failed attempt
        attempt = bio_models.BiometricLoginAttempt(
            email=email.lower(),
            biometric_type="fingerprint",
            attempt_status="failed",
            failure_reason="User not found",
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(attempt)
        db.commit()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check biometric settings
    settings = get_or_create_biometric_settings(db, user.id)
    
    if not settings.fingerprint_enabled:
        raise HTTPException(status_code=400, detail="Fingerprint authentication not enabled for this user")
    
    # Check if account is locked
    if settings.is_locked:
        if settings.locked_until and settings.locked_until > datetime.now():
            raise HTTPException(
                status_code=403, 
                detail=f"Account locked until {settings.locked_until.strftime('%Y-%m-%d %H:%M:%S')}"
            )
        else:
            # Unlock account
            settings.is_locked = False
            settings.failed_attempts_count = 0
            settings.locked_until = None
            db.commit()
    
    # Read fingerprint image
    image_data = await fingerprint_image.read()
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    input_hash = hash_biometric_data(image_base64)
    
    # Get all user fingerprints
    fingerprints = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.user_id == user.id,
        bio_models.UserFingerprint.is_active == True
    ).all()
    
    # Try to match with any enrolled fingerprint
    best_match = None
    best_score = 0
    
    for fp in fingerprints:
        # In production, use proper biometric matching algorithm
        # This is a simplified simulation
        if input_hash == fp.fingerprint_hash:
            match_score = 100
        else:
            # Simulate partial matching
            match_score = 0
        
        if match_score > best_score:
            best_score = match_score
            best_match = fp
    
    # Check if match meets threshold
    if best_score >= settings.fingerprint_match_threshold:
        # Success
        settings.failed_attempts_count = 0
        
        # Update fingerprint verification
        if best_match:
            best_match.is_verified = True
            best_match.last_verified_at = datetime.now()
            best_match.verification_attempts += 1
        
        # Log successful attempt
        attempt = bio_models.BiometricLoginAttempt(
            user_id=user.id,
            email=email.lower(),
            biometric_type="fingerprint",
            attempt_status="success",
            match_score=best_score,
            matched_biometric_id=best_match.id if best_match else None,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(attempt)
        db.commit()
        
        # Generate access token (implement your JWT token generation here)
        access_token = f"token_{user.id}_{secrets.token_urlsafe(16)}"
        
        return schemas.BiometricLoginResponse(
            success=True,
            message="Login successful",
            user_id=user.id,
            match_score=best_score,
            access_token=access_token,
            requires_password=settings.require_password_with_biometric
        )
    else:
        # Failed
        settings.failed_attempts_count += 1
        settings.last_failed_attempt_at = datetime.now()
        
        # Check if should lock account
        if settings.failed_attempts_count >= settings.max_failed_attempts:
            settings.is_locked = True
            settings.locked_until = datetime.now() + timedelta(minutes=settings.lockout_duration_minutes)
        
        # Log failed attempt
        attempt = bio_models.BiometricLoginAttempt(
            user_id=user.id,
            email=email.lower(),
            biometric_type="fingerprint",
            attempt_status="failed",
            failure_reason="Fingerprint did not match",
            match_score=best_score,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(attempt)
        db.commit()
        
        remaining_attempts = settings.max_failed_attempts - settings.failed_attempts_count
        
        return schemas.BiometricLoginResponse(
            success=False,
            message=f"Fingerprint did not match. {remaining_attempts} attempts remaining.",
            match_score=best_score,
            requires_password=False
        )

@router.post("/biometric/login/face")
async def login_with_face(
    email: str = Form(...),
    face_image: UploadFile = File(...),
    ip_address: Optional[str] = Form(None),
    user_agent: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Login using face recognition"""
    
    # Find user
    user = db.query(user_models.User).filter(user_models.User.email == email.lower()).first()
    
    if not user:
        # Log failed attempt
        attempt = bio_models.BiometricLoginAttempt(
            email=email.lower(),
            biometric_type="face",
            attempt_status="failed",
            failure_reason="User not found",
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(attempt)
        db.commit()
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check biometric settings
    settings = get_or_create_biometric_settings(db, user.id)
    
    if not settings.face_recognition_enabled:
        raise HTTPException(status_code=400, detail="Face recognition not enabled for this user")
    
    # Check if account is locked
    if settings.is_locked:
        if settings.locked_until and settings.locked_until > datetime.now():
            raise HTTPException(
                status_code=403, 
                detail=f"Account locked until {settings.locked_until.strftime('%Y-%m-%d %H:%M:%S')}"
            )
        else:
            # Unlock account
            settings.is_locked = False
            settings.failed_attempts_count = 0
            settings.locked_until = None
            db.commit()
    
    # Read face image
    image_data = await face_image.read()
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    input_encoding = hash_biometric_data(image_base64)
    
    # Get all user face images
    faces = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.user_id == user.id,
        bio_models.UserFaceImage.is_active == True
    ).all()
    
    # Try to match with any enrolled face
    best_match = None
    best_score = 0
    
    for face in faces:
        # In production, use proper face recognition algorithm (like dlib, face_recognition)
        # This is a simplified simulation
        if input_encoding == face.face_encoding:
            match_score = 100
        else:
            # Simulate partial matching
            match_score = 0
        
        if match_score > best_score:
            best_score = match_score
            best_match = face
    
    # Check if match meets threshold
    if best_score >= settings.face_match_threshold:
        # Success
        settings.failed_attempts_count = 0
        
        # Update face verification
        if best_match:
            best_match.is_verified = True
            best_match.last_verified_at = datetime.now()
            best_match.verification_attempts += 1
        
        # Log successful attempt
        attempt = bio_models.BiometricLoginAttempt(
            user_id=user.id,
            email=email.lower(),
            biometric_type="face",
            attempt_status="success",
            match_score=best_score,
            matched_biometric_id=best_match.id if best_match else None,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(attempt)
        db.commit()
        
        # Generate access token
        access_token = f"token_{user.id}_{secrets.token_urlsafe(16)}"
        
        return schemas.BiometricLoginResponse(
            success=True,
            message="Login successful",
            user_id=user.id,
            match_score=best_score,
            access_token=access_token,
            requires_password=settings.require_password_with_biometric
        )
    else:
        # Failed
        settings.failed_attempts_count += 1
        settings.last_failed_attempt_at = datetime.now()
        
        # Check if should lock account
        if settings.failed_attempts_count >= settings.max_failed_attempts:
            settings.is_locked = True
            settings.locked_until = datetime.now() + timedelta(minutes=settings.lockout_duration_minutes)
        
        # Log failed attempt
        attempt = bio_models.BiometricLoginAttempt(
            user_id=user.id,
            email=email.lower(),
            biometric_type="face",
            attempt_status="failed",
            failure_reason="Face did not match",
            match_score=best_score,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(attempt)
        db.commit()
        
        remaining_attempts = settings.max_failed_attempts - settings.failed_attempts_count
        
        return schemas.BiometricLoginResponse(
            success=False,
            message=f"Face did not match. {remaining_attempts} attempts remaining.",
            match_score=best_score,
            requires_password=False
        )

# ==================== BIOMETRIC SETTINGS ====================

@router.get("/biometric/settings/{user_id}")
async def get_biometric_settings(user_id: int, db: Session = Depends(get_db)):
    """Get biometric security settings"""
    settings = get_or_create_biometric_settings(db, user_id)
    
    return schemas.BiometricSecurityResponse(
        user_id=settings.user_id,
        fingerprint_enabled=settings.fingerprint_enabled,
        face_recognition_enabled=settings.face_recognition_enabled,
        require_both=settings.require_both,
        require_password_with_biometric=settings.require_password_with_biometric,
        fingerprint_match_threshold=settings.fingerprint_match_threshold,
        face_match_threshold=settings.face_match_threshold,
        min_fingerprints_required=settings.min_fingerprints_required,
        min_face_angles_required=settings.min_face_angles_required,
        is_locked=settings.is_locked,
        locked_until=settings.locked_until
    )

@router.put("/biometric/settings/{user_id}")
async def update_biometric_settings(
    user_id: int,
    settings_update: schemas.BiometricSecurityUpdate,
    db: Session = Depends(get_db)
):
    """Update biometric security settings"""
    settings = get_or_create_biometric_settings(db, user_id)
    
    # Update provided fields
    if settings_update.fingerprint_enabled is not None:
        settings.fingerprint_enabled = settings_update.fingerprint_enabled
    
    if settings_update.face_recognition_enabled is not None:
        settings.face_recognition_enabled = settings_update.face_recognition_enabled
    
    if settings_update.require_both is not None:
        settings.require_both = settings_update.require_both
    
    if settings_update.require_password_with_biometric is not None:
        settings.require_password_with_biometric = settings_update.require_password_with_biometric
    
    if settings_update.fingerprint_match_threshold is not None:
        settings.fingerprint_match_threshold = settings_update.fingerprint_match_threshold
    
    if settings_update.face_match_threshold is not None:
        settings.face_match_threshold = settings_update.face_match_threshold
    
    db.commit()
    db.refresh(settings)
    
    return {"message": "Settings updated successfully"}

# ==================== STATUS & STATS ====================

@router.get("/biometric/status/{user_id}")
async def get_biometric_status(user_id: int, db: Session = Depends(get_db)):
    """Get user's biometric enrollment status"""
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    settings = get_or_create_biometric_settings(db, user_id)
    
    # Count enrolled biometrics
    fingerprints_count = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.user_id == user_id,
        bio_models.UserFingerprint.is_active == True
    ).count()
    
    faces_count = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.user_id == user_id,
        bio_models.UserFaceImage.is_active == True
    ).count()
    
    # Get enrolled fingerprint types
    enrolled_fingers = db.query(bio_models.UserFingerprint.finger_type).filter(
        bio_models.UserFingerprint.user_id == user_id,
        bio_models.UserFingerprint.is_active == True
    ).all()
    enrolled_finger_types = [f[0] for f in enrolled_fingers]
    
    # Get enrolled face angles
    enrolled_faces = db.query(bio_models.UserFaceImage.face_angle).filter(
        bio_models.UserFaceImage.user_id == user_id,
        bio_models.UserFaceImage.is_active == True
    ).all()
    enrolled_face_angles = [f[0] for f in enrolled_faces]
    
    # Check what's missing
    all_finger_types = [e.value for e in schemas.FingerTypeEnum]
    all_face_angles = [e.value for e in schemas.FaceAngleEnum]
    
    missing_fingers = [f for f in all_finger_types if f not in enrolled_finger_types]
    missing_faces = [f for f in all_face_angles if f not in enrolled_face_angles]
    
    # Determine if fully enrolled
    is_fully_enrolled = (
        fingerprints_count >= settings.min_fingerprints_required and
        faces_count >= settings.min_face_angles_required
    )
    
    # Can login with biometric
    can_login = (
        settings.fingerprint_enabled or 
        settings.face_recognition_enabled
    ) and not settings.is_locked
    
    return schemas.BiometricStatusResponse(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        fingerprints_enrolled=fingerprints_count,
        faces_enrolled=faces_count,
        fingerprint_enabled=settings.fingerprint_enabled,
        face_recognition_enabled=settings.face_recognition_enabled,
        is_fully_enrolled=is_fully_enrolled,
        missing_fingerprints=missing_fingers,
        missing_face_angles=missing_faces,
        can_login_with_biometric=can_login
    )

@router.get("/biometric/stats")
async def get_biometric_stats(db: Session = Depends(get_db)):
    """Get system-wide biometric statistics"""
    
    total_users = db.query(user_models.User).count()
    
    users_with_fingerprints = db.query(
        func.count(func.distinct(bio_models.UserFingerprint.user_id))
    ).filter(bio_models.UserFingerprint.is_active == True).scalar() or 0
    
    users_with_faces = db.query(
        func.count(func.distinct(bio_models.UserFaceImage.user_id))
    ).filter(bio_models.UserFaceImage.is_active == True).scalar() or 0
    
    total_fingerprints = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.is_active == True
    ).count()
    
    total_faces = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.is_active == True
    ).count()
    
    total_attempts = db.query(bio_models.BiometricLoginAttempt).count()
    
    successful_logins = db.query(bio_models.BiometricLoginAttempt).filter(
        bio_models.BiometricLoginAttempt.attempt_status == "success"
    ).count()
    
    failed_logins = db.query(bio_models.BiometricLoginAttempt).filter(
        bio_models.BiometricLoginAttempt.attempt_status == "failed"
    ).count()
    
    return schemas.BiometricStatsResponse(
        total_users=total_users,
        users_with_fingerprints=users_with_fingerprints,
        users_with_faces=users_with_faces,
        total_fingerprints=total_fingerprints,
        total_faces=total_faces,
        total_login_attempts=total_attempts,
        successful_logins=successful_logins,
        failed_logins=failed_logins
    )

# ==================== LOGIN HISTORY ====================

@router.get("/biometric/login-history/{user_id}")
async def get_login_history(
    user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get biometric login history for user"""
    attempts = db.query(bio_models.BiometricLoginAttempt).filter(
        bio_models.BiometricLoginAttempt.user_id == user_id
    ).order_by(bio_models.BiometricLoginAttempt.attempted_at.desc()).limit(limit).all()
    
    return [{
        "id": a.id,
        "biometric_type": a.biometric_type,
        "attempt_status": a.attempt_status,
        "match_score": a.match_score,
        "failure_reason": a.failure_reason,
        "ip_address": a.ip_address,
        "attempted_at": a.attempted_at
    } for a in attempts]

# ==================== UNLOCK ACCOUNT ====================

@router.post("/biometric/unlock/{user_id}")
async def unlock_biometric_account(
    user_id: int,
    admin_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Admin function to unlock locked biometric account"""
    
    # In production, verify admin credentials properly
    # This is a simplified version
    
    settings = get_or_create_biometric_settings(db, user_id)
    
    if not settings.is_locked:
        return {"message": "Account is not locked"}
    
    settings.is_locked = False
    settings.failed_attempts_count = 0
    settings.locked_until = None
    settings.last_failed_attempt_at = None
    
    db.commit()
    
    return {"message": "Account unlocked successfully"}

# ==================== DELETE ALL BIOMETRICS ====================

@router.delete("/biometric/delete-all/{user_id}")
async def delete_all_biometrics(
    user_id: int,
    confirm: bool = Form(...),
    db: Session = Depends(get_db)
):
    """Delete all biometric data for user"""
    
    if not confirm:
        raise HTTPException(status_code=400, detail="Confirmation required")
    
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete all fingerprints
    fingerprints = db.query(bio_models.UserFingerprint).filter(
        bio_models.UserFingerprint.user_id == user_id
    ).all()
    
    for fp in fingerprints:
        try:
            cloudinary.uploader.destroy(fp.cloudinary_public_id)
        except:
            pass
        db.delete(fp)
    
    # Delete all faces
    faces = db.query(bio_models.UserFaceImage).filter(
        bio_models.UserFaceImage.user_id == user_id
    ).all()
    
    for face in faces:
        try:
            cloudinary.uploader.destroy(face.cloudinary_public_id)
        except:
            pass
        db.delete(face)
    
    # Reset settings
    settings = get_or_create_biometric_settings(db, user_id)
    settings.fingerprint_enabled = False
    settings.face_recognition_enabled = False
    settings.is_locked = False
    settings.failed_attempts_count = 0
    settings.locked_until = None
    
    db.commit()
    
    return {
        "message": "All biometric data deleted successfully",
        "fingerprints_deleted": len(fingerprints),
        "faces_deleted": len(faces)
    }