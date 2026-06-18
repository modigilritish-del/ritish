#backend/main_ocr.py
import cv2
import numpy as np
from pdf2image import convert_from_path

from services import (
    ImagePreprocessor,
    TesseractOCR,
    EasyOCREngine,
    PaddleOCREngine,
    VotingSystem,
    PostProcessor,
    EASYOCR_AVAILABLE,
    PADDLEOCR_AVAILABLE
)

# ===============================
# CONFIG
# ===============================
POPPLER_PATH = r"C:\poppler\Library\bin"   # change if needed
DPI = 300

# ===============================
# PDF → IMAGES
# ===============================
def pdf_to_images(pdf_path):
    print("\n📄 Converting PDF to images...")
    pages = convert_from_path(
        pdf_path,
        dpi=DPI,
        poppler_path=POPPLER_PATH
    )
    print(f"✅ {len(pages)} page(s) converted")
    return pages

# ===============================
# OCR PIPELINE
# ===============================
def run_ocr_on_image(pil_image):
    preprocessor = ImagePreprocessor()
    voter = VotingSystem()
    postprocessor = PostProcessor()

    easyocr_engine = EasyOCREngine() if EASYOCR_AVAILABLE else None
    paddle_engine = PaddleOCREngine() if PADDLEOCR_AVAILABLE else None
    tesseract = TesseractOCR()

    # PIL → bytes
    _, img_encoded = cv2.imencode(".png", np.array(pil_image))
    file_bytes = img_encoded.tobytes()

    # 🔥 PREPROCESS (NO BINARIZATION)
    processed_img, _ = preprocessor.preprocess_full_pipeline(file_bytes)

    results = []

    # 🔥 ORDER MATTERS (EasyOCR FIRST)
    if easyocr_engine:
        results.append(easyocr_engine.extract_text(processed_img))

    if paddle_engine:
        results.append(paddle_engine.extract_text(processed_img))

    results.append(tesseract.extract_text(processed_img))

    # 🔥 SELECT BEST
    best = voter.merge_results(results)

    # 🔥 POST PROCESS
    final = postprocessor.process_full(best.get("text", ""))

    return final["corrected"]

# ===============================
# RUNNER
# ===============================
def run_ocr(pdf_path):
    pages = pdf_to_images(pdf_path)

    output_pages = []

    for i, page in enumerate(pages, start=1):
        print(f"\n🧠 OCR PAGE {i}")
        text = run_ocr_on_image(page)
        output_pages.append(text)

    final_text = "\n\n".join(output_pages)

    print("\n" + "=" * 80)
    print("📄 FINAL OCR OUTPUT")
    print("=" * 80)
    print(final_text)

    return final_text

