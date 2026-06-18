"""services/advanced_preprocessing.py - Ultra-Smart Image Enhancement"""
import cv2
import numpy as np
from typing import Tuple, Dict, Any

class AdvancedPreprocessor:
    """Advanced preprocessing pipeline for better OCR accuracy"""

    @staticmethod
    def detect_and_fix_skew(img: np.ndarray) -> np.ndarray:
        """Detect and fix document skew (rotation)"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

        # Edge detection
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        # Detect lines
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)

        if lines is None or len(lines) < 5:
            return img

        # Calculate angles
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if abs(x2 - x1) > 10:  # Ignore vertical lines
                angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
                if abs(angle) < 10:  # Only near-horizontal lines
                    angles.append(angle)

        if not angles:
            return img

        # Get median angle
        median_angle = np.median(angles)

        # Rotate if needed
        if abs(median_angle) > 0.5:
            (h, w) = img.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            rotated = cv2.warpAffine(img, M, (w, h),
                                     flags=cv2.INTER_CUBIC,
                                     borderMode=cv2.BORDER_CONSTANT,
                                     borderValue=(255, 255, 255))
            print(f"  [DESKEW] Rotated by {median_angle:.2f} degrees")
            return rotated

        return img

    @staticmethod
    def remove_noise_and_enhance(img: np.ndarray) -> np.ndarray:
        """Remove noise and enhance text"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

        # 1. Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)

        # 2. Normalize brightness
        normalized = np.empty_like(denoised)
        cv2.normalize(denoised, normalized, 0, 255, cv2.NORM_MINMAX)

        # 3. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(normalized)

        # 4. Sharpen
        kernel = np.array([[-1, -1, -1],
                          [-1,  9, -1],
                          [-1, -1, -1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)

        return sharpened

    @staticmethod
    def adaptive_binarize(img: np.ndarray) -> np.ndarray:
        """Smart binarization based on image content"""
        # Try Otsu first
        _, otsu = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Check if Otsu worked well
        white_ratio = np.sum(otsu == 255) / otsu.size

        if 0.2 < white_ratio < 0.85:
            return otsu

        # If Otsu failed, use adaptive
        adaptive = cv2.adaptiveThreshold(
            img, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            21, 10
        )

        return adaptive

    @staticmethod
    def remove_borders(img: np.ndarray) -> np.ndarray:
        """Remove document borders/frames"""
        contours, _ = cv2.findContours(img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return img

        # Find largest contour
        largest = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)

        # Crop with margin
        margin = 10
        return img[max(0, y-margin):min(img.shape[0], y+h+margin),
                  max(0, x-margin):min(img.shape[1], x+w+margin)]

    def process_for_ocr(self, img: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Complete preprocessing pipeline"""
        print("\n[START] Advanced preprocessing...")

        metadata = {"steps": []}

        # Step 1: Deskew
        deskewed = self.detect_and_fix_skew(img)
        if not np.array_equal(img, deskewed):
            metadata["steps"].append("deskew")

        # Step 2: Enhance
        enhanced = self.remove_noise_and_enhance(deskewed)
        metadata["steps"].append("enhance")

        # Step 3: Binarize
        binary = self.adaptive_binarize(enhanced)
        metadata["steps"].append("binarize")

        # Step 4: Remove borders
        cleaned = self.remove_borders(binary)
        if cleaned.shape != binary.shape:
            metadata["steps"].append("remove_borders")

        print(f"[OK] Preprocessing: {' -> '.join(metadata['steps'])}")

        return cleaned, metadata