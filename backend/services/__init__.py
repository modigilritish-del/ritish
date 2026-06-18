"""services/__init__.py - Export all OCR services"""
from .preprocessing import ImagePreprocessor
from .tesseract_ocr import TesseractOCR
from .voting_system import VotingSystem
from .postprocessing import PostProcessor
from .fix_ocr_errors import OCRErrorFixer 

# 🔥 FIX: EasyOCR and PaddleOCR both disabled on Render
# Both load heavy models at import time and block port binding
# Tesseract handles all OCR functionality perfectly on Render
EASYOCR_AVAILABLE = False
EasyOCREngine = None
print("⏭️ EasyOCR: Disabled (causes port binding timeout on Render)")

PADDLEOCR_AVAILABLE = False
PaddleOCREngine = None
print("⏭️ PaddleOCR: Disabled (causes port binding timeout on Render)")

__all__ = [
    "ImagePreprocessor",
    "TesseractOCR",
    "EasyOCREngine",
    "PaddleOCREngine",
    "VotingSystem",
    "PostProcessor",
    "OCRErrorFixer",
    "EASYOCR_AVAILABLE",
    "PADDLEOCR_AVAILABLE"
]

print("✅ Tesseract: Available")
print("✅ OCR Error Fixer: Available")
