"""services/preprocessing.py - FIXED for Large Documents"""
import cv2
import numpy as np
from PIL import Image
import io
from typing import Tuple, Optional, List, Dict, Any

class ImagePreprocessor:
    """Smart preprocessing with better rotation detection"""
    
    @staticmethod
    def load_image(file_bytes: bytes) -> np.ndarray:
        """Load image from bytes with size optimization"""
        img_array = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to load image")
        
        # ✅ FIX: Resize very large images to manageable size
        h, w = img.shape[:2]
        max_dimension = 4000  # Maximum width or height
        
        if h > max_dimension or w > max_dimension:
            scale = max_dimension / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            print(f"  📏 Resized from {w}x{h} to {new_w}x{new_h}")
        
        return img
    
    @staticmethod
    def detect_blur_level(img: np.ndarray) -> float:
        """Detect blur level using Laplacian variance"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_score = min(100, (laplacian_var / 500) * 100)
        return float(blur_score)
    
    @staticmethod
    def detect_text_orientation(img: np.ndarray) -> float:
        """🔥 FIXED: Smarter rotation detection"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        h, w = gray.shape[:2]
        
        # Skip rotation for extremely large or landscape images
        if w > h * 1.2:
            print("  ✅ Image is landscape - no rotation needed")
            return 0
        
        # Use edge detection with error handling
        try:
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=80, minLineLength=w//4, maxLineGap=20)
        except Exception as e:
            print(f"  ⚠️ Rotation detection failed: {str(e)} - skipping")
            return 0
        
        if lines is None or len(lines) < 5:
            # Check aspect ratio only
            if h > w * 1.3:
                print("  ⚠️ Portrait image detected - rotating -90°")
                return -90
            return 0
        
        # Analyze line angles
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if abs(x2 - x1) < 10:
                continue
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            angles.append(angle)
        
        if len(angles) < 3:
            return 0
        
        angles = np.array(angles)
        horizontal = np.sum(np.abs(angles) < 15)
        vertical = np.sum(np.abs(np.abs(angles) - 90) < 15)
        
        if horizontal > len(angles) * 0.4:
            print(f"  ✅ Horizontal text detected ({horizontal}/{len(angles)} lines)")
            return 0
        elif vertical > len(angles) * 0.3 and h > w:
            print(f"  ⚠️ Vertical text detected ({vertical}/{len(angles)} lines) - rotating -90°")
            return -90
        
        return 0
    
    @staticmethod
    def rotate_image(img: np.ndarray, angle: float) -> np.ndarray:
        """Rotate image by angle"""
        if abs(angle) < 0.5:
            return img
        
        (h, w) = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        cos = np.abs(M[0, 0])
        sin = np.abs(M[0, 1])
        new_w = int((h * sin) + (w * cos))
        new_h = int((h * cos) + (w * sin))
        
        M[0, 2] += (new_w / 2) - center[0]
        M[1, 2] += (new_h / 2) - center[1]
        
        rotated = cv2.warpAffine(img, M, (new_w, new_h),
                                 flags=cv2.INTER_CUBIC,
                                 borderMode=cv2.BORDER_CONSTANT,
                                 borderValue=(255, 255, 255))
        return rotated
    
    @staticmethod
    def smart_enhance(gray: np.ndarray, blur_level: float) -> np.ndarray:
        """🔥 AGGRESSIVE enhancement for poor quality documents"""
        enhanced = gray.copy()
        
        # Step 1: Strong denoising
        enhanced = cv2.fastNlMeansDenoising(enhanced, None, h=10, templateWindowSize=7, searchWindowSize=21)
        
        # Step 2: CLAHE for contrast
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(enhanced)
        
        # Step 3: Always sharpen (especially for blurry docs)
        if blur_level < 80:
            print(f"  🔍 Image is blurry ({blur_level:.1f}%) - applying STRONG sharpening")
            kernel = np.array([[-1,-1,-1,-1,-1],
                             [-1, 2, 2, 2,-1],
                             [-1, 2, 8, 2,-1],
                             [-1, 2, 2, 2,-1],
                             [-1,-1,-1,-1,-1]]) / 8.0
            enhanced = cv2.filter2D(enhanced, -1, kernel)
        
        return enhanced
    
    @staticmethod
    def adaptive_binarize(img: np.ndarray) -> np.ndarray:
        """🔥 BETTER binarization"""
        # Try Otsu first
        _, binary = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Check quality
        white_ratio = np.sum(binary == 255) / binary.size
        
        # If too much white or black, use adaptive
        if white_ratio > 0.85 or white_ratio < 0.15:
            print("  ⚠️ Otsu failed - using adaptive threshold")
            binary = cv2.adaptiveThreshold(
                img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 21, 10
            )
        
        return binary
    
    @staticmethod
    def calculate_quality_metrics(img: np.ndarray) -> Dict[str, float]:
        """Calculate quality metrics"""
        gray = img if len(img.shape) == 2 else cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness = min(100, (laplacian_var / 500) * 100)
        
        contrast = gray.std()
        contrast_score = min(100, (contrast / 50) * 100)
        
        brightness = gray.mean()
        brightness_score = 100 - abs(brightness - 127) / 127 * 100
        
        quality = (sharpness * 0.5 + contrast_score * 0.3 + brightness_score * 0.2)
        
        return {
            'sharpness': float(sharpness),
            'contrast': float(contrast_score),
            'brightness': float(brightness_score),
            'overall': float(quality)
        }
    
    def preprocess_full_pipeline(
        self, 
        file_bytes: bytes, 
        is_screenshot: bool = False
    ) -> Tuple[np.ndarray, dict]:
        """🔥 MAIN PREPROCESSING - Optimized for large documents"""
        print("\n🚀 Starting smart preprocessing...")
        
        img = self.load_image(file_bytes)
        h, w = img.shape[:2]
        
        print(f"📐 Image size: {w}x{h}")
        
        original_quality = self.calculate_quality_metrics(img)
        print(f"📊 Original Quality: {original_quality['overall']:.1f}%")
        
        blur_level = self.detect_blur_level(img)
        print(f"🔍 Blur Level: {blur_level:.1f}% sharp")
        
        # Rotation detection (skip for very large images)
        rotation_angle = 0
        if w * h < 100_000_000:  # Only rotate if < 100MP
            rotation_angle = self.detect_text_orientation(img)
            if abs(rotation_angle) > 0.5:
                print(f"🔄 Rotating: {rotation_angle:.0f}°")
                img = self.rotate_image(img, rotation_angle)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        
        # AGGRESSIVE enhancement
        enhanced = self.smart_enhance(gray, blur_level)
        
        # Binarization
        binary = self.adaptive_binarize(enhanced)
        
        final_quality = self.calculate_quality_metrics(enhanced)
        print(f"✅ Final Quality: {final_quality['overall']:.1f}%")
        
        metadata = {
            "version": "optimized",
            "original_quality": original_quality,
            "final_quality": final_quality,
            "blur_level": blur_level,
            "rotation_angle": rotation_angle,
            "image_size": {"width": w, "height": h}
        }
        
        return binary, metadata
    
    def preprocess_multi_level(
        self, 
        file_bytes: bytes, 
        is_screenshot: bool = False
    ) -> List[Tuple[np.ndarray, dict]]:
        """For compatibility - returns single version"""
        img, metadata = self.preprocess_full_pipeline(file_bytes, is_screenshot)
        return [(img, metadata)]