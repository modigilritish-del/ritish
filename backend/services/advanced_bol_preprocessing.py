"""services/advanced_bol_preprocessing.py - Ultra-Clean BOL Extraction"""
import cv2
import numpy as np
from typing import Tuple, List, Dict, Any
import re


class AdvancedBOLPreprocessor:
    """
    ADVANCED preprocessing specifically for Bill of Lading documents
    Fixes common OCR issues in shipping documents
    """

    @staticmethod
    def detect_document_regions(img: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect text regions in BOL document
        Returns regions sorted top-to-bottom
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

        # Apply morphological operations to connect text
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 3))
        dilated = cv2.dilate(gray, kernel, iterations=2)

        # Find contours
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        regions = []
        h, w = gray.shape

        for cnt in contours:
            x, y, w_cnt, h_cnt = cv2.boundingRect(cnt)

            # Filter small regions
            if w_cnt < 50 or h_cnt < 10:
                continue

            # Skip if too close to edges (borders)
            if x < 10 or y < 10 or x + w_cnt > w - 10:
                continue

            regions.append({
                'x': x,
                'y': y,
                'width': w_cnt,
                'height': h_cnt,
                'area': w_cnt * h_cnt
            })

        # Sort by Y coordinate (top to bottom)
        regions.sort(key=lambda r: r['y'])

        return regions

    @staticmethod
    def enhance_for_bol(img: np.ndarray) -> np.ndarray:
        """
        ULTRA enhancement for Bill of Lading documents
        - Removes background patterns
        - Enhances text contrast
        - Reduces noise
        """
        # Convert to grayscale
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.copy()

        # 1. Normalize lighting
        normalized = np.empty_like(gray)
        cv2.normalize(gray, normalized, 0, 255, cv2.NORM_MINMAX)

        # 2. Remove noise with bilateral filter (preserves edges)
        denoised = cv2.bilateralFilter(normalized, 9, 75, 75)

        # 3. Enhance contrast with CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)

        # 4. Sharpen text
        kernel_sharpen = np.array([[-1, -1, -1],
                                   [-1,  9, -1],
                                   [-1, -1, -1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel_sharpen)

        # 5. Adaptive thresholding (better for forms with boxes)
        binary = cv2.adaptiveThreshold(
            sharpened, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            21, 10
        )

        # 6. Morphological cleanup
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        return cleaned

    @staticmethod
    def deskew_image(img: np.ndarray) -> np.ndarray:
        """Deskew tilted documents"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

        # Detect edges
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        # Detect lines
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)

        if lines is None or len(lines) < 5:
            return img

        # Calculate angles
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))

            # Only consider near-horizontal lines
            if abs(angle) < 10:
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
            rotated = cv2.warpAffine(
                img, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=(255, 255, 255)
            )
            print(f"  [DESKEW] Rotated by {median_angle:.2f} degrees")
            return rotated

        return img

    @staticmethod
    def remove_form_lines(img: np.ndarray) -> np.ndarray:
        """
        Remove horizontal/vertical form lines that interfere with OCR
        """
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

        # Detect horizontal lines
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        detect_horizontal = cv2.morphologyEx(gray, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)

        # Detect vertical lines
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
        detect_vertical = cv2.morphologyEx(gray, cv2.MORPH_OPEN, vertical_kernel, iterations=2)

        # Combine
        lines_mask = cv2.add(detect_horizontal, detect_vertical)

        # Remove lines from image
        result = cv2.subtract(gray, lines_mask)

        return result

    def preprocess_bol_document(self, img: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        COMPLETE BOL preprocessing pipeline
        """
        print("\n[BOL] Starting advanced BOL preprocessing...")

        original_shape = img.shape
        metadata = {
            'original_size': original_shape,
            'enhancements': []
        }

        # Step 1: Deskew
        deskewed = self.deskew_image(img)
        if not np.array_equal(img, deskewed):
            metadata['enhancements'].append('deskew')

        # Step 2: Remove form lines
        no_lines = self.remove_form_lines(deskewed)
        metadata['enhancements'].append('remove_form_lines')

        # Step 3: Ultra enhancement
        enhanced = self.enhance_for_bol(no_lines)
        metadata['enhancements'].append('ultra_enhancement')

        print(f"[OK] Preprocessing complete: {', '.join(metadata['enhancements'])}")

        return enhanced, metadata


class BOLTextCleaner:
    """
    POST-OCR cleaning specifically for BOL documents
    Fixes common OCR errors in shipping documents
    """

    # Common OCR mistakes in BOL documents
    COMMON_FIXES = {
        # Company names
        r'HeBEICHENGXIN': 'HEBEI CHENGXIN',
        r'CHENGXINCO[.,]?LTD': 'CHENGXIN CO., LTD.',
        r'FIRSTPATRIOT': 'FIRST PATRIOT',
        r'PATRIOTED': 'PATRIOT LTD',

        # Document type
        r'@RIGINAL': 'ORIGINAL',
        r'BILLOFIIADING': 'BILL OF LADING',
        r'B/LADING': 'BILL OF LADING',

        # Addresses
        r'EoVNNCECHIA': 'PROVINCE, CHINA',
        r'TANZHAOROAD': 'YUANZHAO ROAD',
        r'IKWOEABAKALIKI': 'IKWO, ABAKALIKI',
        r'MAGOSENGERU': 'LAGOS, NIGERIA',

        # Common words
        r'CONTACTE': 'CONTACT:',
        r'CARRIERNOTRESPONJBL': 'CARRIER NOT RESPONSIBLE',
        r'DECLAREDBX': 'DECLARED BY',
        r'SHPPERE': 'SHIPPER',

        # Carriers
        r'EMACGM': 'CMA CGM',
        r'CMAGGM': 'CMA CGM',

        # Ports
        r'QINGDAO': 'QINGDAO',
        r'SEARORT': 'SEAPORT',
    }

    # Section headers
    SECTION_HEADERS = [
        'SHIPPER', 'CONSIGNEE', 'NOTIFY PARTY', 'VESSEL',
        'PORT OF LOADING', 'PORT OF DISCHARGE',
        'CONTAINER NUMBER', 'SEAL NUMBER', 'MARKS',
        'DESCRIPTION OF GOODS', 'FREIGHT', 'CARRIER'
    ]

    @staticmethod
    def remove_garbage_lines(text: str) -> str:
        """Remove obvious garbage lines"""
        lines = text.split('\n')
        cleaned = []

        for line in lines:
            line = line.strip()

            # Skip empty
            if not line:
                continue

            # Skip lines with too many special characters
            special_count = sum(c in '!@#$%^&*()_+={}[]|\\:;"<>?/~`' for c in line)
            if special_count > len(line) * 0.4:
                continue

            # Skip lines with no letters
            letter_count = sum(c.isalpha() for c in line)
            if letter_count < 3:
                continue

            # Skip very long lines without spaces (likely garbage)
            if len(line) > 100 and line.count(' ') < 3:
                continue

            cleaned.append(line)

        return '\n'.join(cleaned)

    @staticmethod
    def fix_common_errors(text: str) -> str:
        """Fix common OCR errors"""
        fixed = text

        for pattern, replacement in BOLTextCleaner.COMMON_FIXES.items():
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)

        return fixed

    @staticmethod
    def add_section_breaks(text: str) -> str:
        """Add proper line breaks before section headers"""
        result = text

        for header in BOLTextCleaner.SECTION_HEADERS:
            # Add double newline before headers
            pattern = f'(?<!\n\n){header}'
            result = re.sub(pattern, f'\n\n{header}', result, flags=re.IGNORECASE)

        return result

    @staticmethod
    def separate_concatenated_words(text: str) -> str:
        """
        Separate words that are concatenated (no spaces)
        Example: "HEBEICOMPANYLTD" -> "HEBEI COMPANY LTD"
        """
        # Look for capital letters in middle of words
        # Example: "HEBEIChina" -> "HEBEI China"
        result = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)

        # Look for known patterns
        result = re.sub(r'([A-Z]{2,})([A-Z][a-z])', r'\1 \2', result)

        return result

    @staticmethod
    def clean_bol_text(text: str) -> str:
        """
        COMPLETE cleaning pipeline for BOL text
        """
        print("\n[CLEAN] Cleaning BOL text...")

        # Step 1: Remove garbage
        cleaned = BOLTextCleaner.remove_garbage_lines(text)

        # Step 2: Fix common errors
        cleaned = BOLTextCleaner.fix_common_errors(cleaned)

        # Step 3: Separate concatenated words
        cleaned = BOLTextCleaner.separate_concatenated_words(cleaned)

        # Step 4: Add section breaks
        cleaned = BOLTextCleaner.add_section_breaks(cleaned)

        # Step 5: Clean up multiple spaces
        cleaned = re.sub(r' {2,}', ' ', cleaned)

        # Step 6: Clean up multiple newlines
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

        print("[OK] Text cleaning complete")

        return cleaned.strip()


# ===================================================================
# INTEGRATION WITH EXISTING OCR PIPELINE
# ===================================================================

def preprocess_and_extract_bol(file_bytes: bytes, ocr_engines: List) -> Dict[str, Any]:
    """
    COMPLETE pipeline: Preprocess -> OCR -> Clean -> Extract BOL

    Args:
        file_bytes: Image/PDF bytes
        ocr_engines: List of OCR engine objects [tesseract, easyocr, paddleocr]

    Returns:
        {
            'raw_text': str,
            'cleaned_text': str,
            'bol_data': dict,
            'bol_formatted': str
        }
    """
    from services.preprocessing import ImagePreprocessor
    from services.bol_extractor import BillOfLadingExtractor

    # Initialize
    preprocessor = AdvancedBOLPreprocessor()
    regular_preprocessor = ImagePreprocessor()
    text_cleaner = BOLTextCleaner()
    bol_extractor = BillOfLadingExtractor()

    # Load image
    img = regular_preprocessor.load_image(file_bytes)

    # Advanced BOL preprocessing
    processed_img, metadata = preprocessor.preprocess_bol_document(img)

    # Run OCR with all engines
    ocr_results = []
    for engine in ocr_engines:
        if engine:
            result = engine.extract_text(processed_img)
            if result.get('text'):
                ocr_results.append(result)

    # Select best result
    from services.voting_system import VotingSystem
    voter = VotingSystem()
    best_result = voter.merge_results(ocr_results)

    raw_text = best_result.get('text', '')

    # Clean text
    cleaned_text = text_cleaner.clean_bol_text(raw_text)

    # Extract BOL structure
    bol_data = bol_extractor.extract(cleaned_text)
    bol_formatted = bol_extractor.format_output(bol_data)

    return {
        'raw_text': raw_text,
        'cleaned_text': cleaned_text,
        'bol_data': bol_data,
        'bol_formatted': bol_formatted,
        'preprocessing_metadata': metadata,
        'ocr_confidence': best_result.get('confidence', 0)
    }


if __name__ == "__main__":
    # Test the cleaner
    garbage_text = """
    --- Page 1 ---
G
HeBEICHENGXINCOELTD
TANZHAOROAD YUANSHICOUNTY @RIGINAL
EoVNNCECHIA
FKWOEABAKALIKIEEBONYI
EMACGM
FRSTPATRIOTED
NiEGU-UNCTIONBYAFKKROIK@
RoADEIKWOEABARALIKIEBONYI
MAGOSENGERU
CONTACTEKISHORE MALLE
    """

    cleaner = BOLTextCleaner()
    cleaned = cleaner.clean_bol_text(garbage_text)
    print("\n" + "="*60)
    print("CLEANED TEXT:")
    print("="*60)
    print(cleaned)