"""ocr_routers.py - Enhanced with Bill of Lading Extraction and All OCR Engine Outputs"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models.ocr import OCRDocument, OCRResult, OCRCache
from schemas import (
    OCRProcessRequest, OCRProcessResponse, OCRDocumentResponse,
    OCRComparisonResponse, OCRStatsResponse, OCRResultResponse
)
from services.advanced_preprocessing import AdvancedPreprocessor
from services.intelligent_bol_extractor import IntelligentBOLExtractor
from utils.image_utils import ImageUtils, DocumentType
from services import (
    ImagePreprocessor, TesseractOCR, VotingSystem, PostProcessor,
    EasyOCREngine, PaddleOCREngine,
    EASYOCR_AVAILABLE, PADDLEOCR_AVAILABLE
)
from services.advanced_bol_preprocessing import (
    AdvancedBOLPreprocessor,
    BOLTextCleaner,
    preprocess_and_extract_bol
)
from services.bol_extractor import BillOfLadingExtractor
from utils.image_utils import ImageUtils
import os
import time
from datetime import datetime
from typing import List, Optional

router = APIRouter()

# ============================================================
# 🔥 FIX: All engines start as None — initialized lazily
#         after the port is open (called from main.py startup)
# ============================================================
preprocessor = ImagePreprocessor()
tesseract = TesseractOCR()
voting_system = VotingSystem()
postprocessor = PostProcessor()
bol_extractor = BillOfLadingExtractor()

easyocr_engine = None
paddleocr_engine = None
advanced_preprocessor = AdvancedPreprocessor()
intelligent_bol_extractor = IntelligentBOLExtractor()

_engines_initialized = False


def initialize_ocr_engines():
    """
    🔥 Called ONCE from main.py @app.on_event('startup').
    Runs AFTER uvicorn has already bound the port, so Render
    never times out waiting for the port to open.
    All functionality is identical — only the timing changes.
    """
    global easyocr_engine, paddleocr_engine, _engines_initialized, EASYOCR_AVAILABLE, PADDLEOCR_AVAILABLE

    if _engines_initialized:
        return

    print("\n🚀 Initializing OCR engines (post-startup)...")

    if EASYOCR_AVAILABLE:
        try:
            easyocr_engine = EasyOCREngine()
            print("✅ EasyOCR engine initialized")
        except Exception as e:
            print(f"⚠️ EasyOCR init failed: {e}")
            EASYOCR_AVAILABLE = False

    if PADDLEOCR_AVAILABLE:
        try:
            paddleocr_engine = PaddleOCREngine()
            print("✅ PaddleOCR engine initialized")
        except Exception as e:
            print(f"⚠️ PaddleOCR init failed: {e}")
            PADDLEOCR_AVAILABLE = False

    _engines_initialized = True
    print("✅ All OCR engines ready\n")


@router.post("/upload", response_model=OCRDocumentResponse)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload document for OCR processing"""
    try:
        file_bytes = await file.read()
        
        is_valid, message = ImageUtils.validate_image(file_bytes, file.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        file_hash = ImageUtils.calculate_hash(file_bytes)
        
        existing = db.query(OCRDocument).filter(OCRDocument.file_hash == file_hash).first()
        if existing:
            print(f"♻️ File exists: {file.filename} (ID: {existing.id})")
            if not os.path.exists(existing.file_path):
                safe_filename = f"{file_hash}_{file.filename}"
                new_path = ImageUtils.save_temp_file(file_bytes, safe_filename)
                existing.file_path = new_path
                db.commit()
                db.refresh(existing)
                print(f"  🔄 Path updated to: {new_path}")
            return existing
        
        img_info = ImageUtils.get_image_info(file_bytes, file.filename)
        safe_filename = f"{file_hash}_{file.filename}"
        file_path = ImageUtils.save_temp_file(file_bytes, safe_filename)
        
        document = OCRDocument(
            file_name=file.filename,
            file_path=file_path,
            file_hash=file_hash,
            file_size=img_info.get("size_bytes", len(file_bytes)),
            mime_type=file.content_type or "application/octet-stream",
            status="uploaded",
            uploaded_at=datetime.now()
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        print(f"✅ Uploaded: {file.filename}")
        return document
    
    except Exception as e:
        db.rollback()
        print(f"❌ Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/process/{document_id}", response_model=OCRProcessResponse)
async def process_document(
    document_id: int, 
    request: OCRProcessRequest, 
    extract_bol: bool = Query(False, description="Extract Bill of Lading structure"),
    db: Session = Depends(get_db)
):
    """
    🔥 Enhanced OCR Processing with Optional Bill of Lading Extraction
    
    Set extract_bol=true to get structured B/L data
    Returns multiple engine outputs + structured BOL data
    """
    start_time = time.time()
    
    document = db.query(OCRDocument).filter(OCRDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        document.status = "processing"
        db.commit()
        
        resolved_path = document.file_path
        if not os.path.exists(resolved_path):
            this_dir = os.path.dirname(os.path.abspath(__file__))
            uploads_dir = os.path.join(this_dir, "uploads")
            if not os.path.isdir(uploads_dir):
                uploads_dir = os.path.join(os.path.dirname(this_dir), "uploads")

            fallback_path = os.path.join(uploads_dir, os.path.basename(resolved_path))
            if os.path.exists(fallback_path):
                resolved_path = fallback_path
                document.file_path = resolved_path
                db.commit()
                print(f"  🔄 Resolved path to: {resolved_path}")
            else:
                raise FileNotFoundError(
                    f"File not found. Please re-upload '{document.file_name}'.\n"
                    f"  DB path   : {document.file_path}\n"
                    f"  Tried also: {fallback_path}"
                )

        with open(resolved_path, "rb") as f:
            file_bytes = f.read()

        cache = db.query(OCRCache).filter(OCRCache.file_hash == document.file_hash).first()
        if cache:
            print(f"🚀 Cache HIT: {document.file_name}")
            cache.hit_count += 1
            cache.last_accessed = datetime.now()
            db.commit()
            
            cached_data = cache.cached_result
            
            if extract_bol and 'bol_data' not in cached_data:
                best_text = cached_data["best_result"]["extracted_text"]
                bol_data = bol_extractor.extract(best_text)
                bol_formatted = bol_extractor.format_output(bol_data)
                cached_data["bol_data"] = bol_data
                cached_data["bol_formatted"] = bol_formatted
                cache.cached_result = cached_data
                db.commit()
            
            return OCRProcessResponse(
                document_id=document.id,
                file_name=document.file_name,
                status="completed",
                results=[OCRResultResponse(**r) for r in cached_data["results"]],
                best_result=OCRResultResponse(**cached_data["best_result"]),
                total_processing_time=cached_data["total_processing_time"],
                cached=True,
                patterns=cached_data.get("patterns"),
                improvements=cached_data.get("improvements"),
                bol_data=cached_data.get("bol_data") if extract_bol else None,
                bol_formatted=cached_data.get("bol_formatted") if extract_bol else None,
                all_results=cached_data.get("all_results", [])
            )
        
        print(f"\n🔥 Processing: {document.file_name}")
        
        doc_type = ImageUtils.detect_document_type(file_bytes, document.file_name)
        print(f"📋 Document type: {doc_type}")
        
        ocr_results = []
        all_ocr_results = []
        final_text = ""
        improvements = {}
        
        if doc_type == DocumentType.PDF_TEXT:
            print("📄 Text-based PDF - Using pdfplumber...")
            extracted = ImageUtils.extract_pdf_text(file_bytes)
            
            if not extracted.get("success"):
                raise ValueError("PDF text extraction failed")
            
            final_text = extracted["text"]
            ocr_results = [{
                "engine": "pdfplumber",
                "text": final_text,
                "confidence": 100.0,
                "processing_time": time.time() - start_time,
                "word_confidences": {},
                "bounding_boxes": []
            }]
            all_ocr_results = ocr_results.copy()
            best_result = ocr_results[0]
            improvements = {"direct_extraction": True, "tables_found": len(extracted.get("tables", []))}
            
        elif doc_type == DocumentType.EXCEL:
            print("📊 Excel file - Using pandas...")
            extracted = ImageUtils.extract_excel_data(file_bytes)
            
            if not extracted.get("success"):
                raise ValueError("Excel extraction failed")
            
            final_text = extracted["text"]
            ocr_results = [{
                "engine": "pandas_excel",
                "text": final_text,
                "confidence": 100.0,
                "processing_time": time.time() - start_time,
                "word_confidences": {},
                "bounding_boxes": []
            }]
            all_ocr_results = ocr_results.copy()
            best_result = ocr_results[0]
            improvements = {"direct_extraction": True, "sheets_found": len(extracted.get("sheets", {}))}
            
        elif doc_type == DocumentType.CSV:
            print("📈 CSV file - Using pandas...")
            extracted = ImageUtils.extract_csv_data(file_bytes)
            
            if not extracted.get("success"):
                raise ValueError("CSV extraction failed")
            
            final_text = extracted["text"]
            ocr_results = [{
                "engine": "pandas_csv",
                "text": final_text,
                "confidence": 100.0,
                "processing_time": time.time() - start_time,
                "word_confidences": {},
                "bounding_boxes": []
            }]
            all_ocr_results = ocr_results.copy()
            best_result = ocr_results[0]
            improvements = {"direct_extraction": True, "rows_found": len(extracted.get("data", []))}
            
        else:
            print("📸 Image/Scanned PDF - Using traditional OCR engines...")
            
            if doc_type == DocumentType.PDF_SCANNED:
                print("📄 Converting scanned PDF pages to images...")
                pdf_pages = ImageUtils.pdf_to_images_all_pages(file_bytes, dpi=200)
                
                all_pages_text = []
                
                for page_info in pdf_pages:
                    page_num = page_info["page_num"]
                    page_img = page_info["image"]
                    
                    print(f"\n📄 Processing Page {page_num}/{len(pdf_pages)}...")
                    
                    page_results = []
                    
                    print(f"  🔍 Running Tesseract on page {page_num}...")
                    try:
                        tesseract_result = tesseract.extract_text(page_img)
                        if tesseract_result.get('text', '').strip():
                            page_results.append({
                                "engine": "tesseract",
                                "text": tesseract_result['text'],
                                "confidence": tesseract_result.get('confidence', 0),
                                "processing_time": tesseract_result.get('processing_time', 0)
                            })
                            print(f"    ✅ Tesseract: {len(tesseract_result['text'])} chars")
                    except Exception as e:
                        print(f"    ❌ Tesseract failed: {e}")
                    
                    if easyocr_engine and EASYOCR_AVAILABLE:
                        print(f"  🔍 Running EasyOCR on page {page_num}...")
                        try:
                            easy_result = easyocr_engine.extract_text(page_img)
                            if easy_result.get('text', '').strip():
                                page_results.append({
                                    "engine": "easyocr",
                                    "text": easy_result['text'],
                                    "confidence": easy_result.get('confidence', 0),
                                    "processing_time": easy_result.get('processing_time', 0)
                                })
                                print(f"    ✅ EasyOCR: {len(easy_result['text'])} chars")
                        except Exception as e:
                            print(f"    ❌ EasyOCR failed: {e}")
                    
                    if paddleocr_engine and PADDLEOCR_AVAILABLE:
                        print(f"  🔍 Running PaddleOCR on page {page_num}...")
                        try:
                            paddle_result = paddleocr_engine.extract_text(page_img)
                            if paddle_result.get('text', '').strip():
                                page_results.append({
                                    "engine": "paddleocr",
                                    "text": paddle_result['text'],
                                    "confidence": paddle_result.get('confidence', 0),
                                    "processing_time": paddle_result.get('processing_time', 0)
                                })
                                print(f"    ✅ PaddleOCR: {len(paddle_result['text'])} chars")
                        except Exception as e:
                            print(f"    ❌ PaddleOCR failed: {e}")
                    
                    if page_results:
                        page_best = voting_system.merge_results(page_results)
                        if page_best.get("text", "").strip():
                            page_text = f"--- Page {page_num} ---\n{page_best['text']}"
                            all_pages_text.append(page_text)
                            ocr_results.extend(page_results)
                            all_ocr_results.extend(page_results)
                        else:
                            print(f"  ⚠️ Page {page_num}: No valid text extracted")
                    else:
                        print(f"  ⚠️ Page {page_num}: All engines failed")
                
                if not all_pages_text:
                    raise ValueError("No text extracted from any page")
                
                final_text = "\n\n".join(all_pages_text)
                best_result = ocr_results[0] if ocr_results else {"text": "", "confidence": 0, "engine": "none"}
                best_result["text"] = final_text
                improvements = {"total_pages_processed": len(pdf_pages), "pages_with_text": len(all_pages_text)}
                
            else:
                preprocessed_img, _ = preprocessor.preprocess_full_pipeline(file_bytes)
                
                if easyocr_engine and EASYOCR_AVAILABLE:
                    print("  🔍 Running EasyOCR...")
                    try:
                        easy_result = easyocr_engine.extract_text(preprocessed_img)
                        if easy_result.get('text', '').strip():
                            ocr_results.append({
                                "engine": "easyocr",
                                "text": easy_result['text'],
                                "confidence": easy_result.get('confidence', 0),
                                "processing_time": easy_result.get('processing_time', 0)
                            })
                            all_ocr_results.append(ocr_results[-1])
                            print(f"    ✅ EasyOCR: {len(easy_result['text'])} chars")
                    except Exception as e:
                        print(f"    ❌ EasyOCR failed: {e}")
                
                if paddleocr_engine and PADDLEOCR_AVAILABLE:
                    print("  🔍 Running PaddleOCR...")
                    try:
                        paddle_result = paddleocr_engine.extract_text(preprocessed_img)
                        if paddle_result.get('text', '').strip():
                            ocr_results.append({
                                "engine": "paddleocr",
                                "text": paddle_result['text'],
                                "confidence": paddle_result.get('confidence', 0),
                                "processing_time": paddle_result.get('processing_time', 0)
                            })
                            all_ocr_results.append(ocr_results[-1])
                            print(f"    ✅ PaddleOCR: {len(paddle_result['text'])} chars")
                    except Exception as e:
                        print(f"    ❌ PaddleOCR failed: {e}")
                
                print("  🔍 Running Tesseract...")
                try:
                    tesseract_result = tesseract.extract_text(preprocessed_img)
                    if tesseract_result.get('text', '').strip():
                        ocr_results.append({
                            "engine": "tesseract",
                            "text": tesseract_result['text'],
                            "confidence": tesseract_result.get('confidence', 0),
                            "processing_time": tesseract_result.get('processing_time', 0)
                        })
                        all_ocr_results.append(ocr_results[-1])
                        print(f"    ✅ Tesseract: {len(tesseract_result['text'])} chars")
                except Exception as e:
                    print(f"    ❌ Tesseract failed: {e}")
                
                if not ocr_results:
                    raise ValueError("All OCR engines failed to extract text")
                
                best_result = voting_system.merge_results(ocr_results)
                
                postprocessed = postprocessor.process_full(best_result["text"], apply_spell_check=True)
                final_text = postprocessed["corrected"]
                best_result["text"] = final_text
                improvements = postprocessed.get("improvements", {})
        
        bol_data = None
        bol_formatted = None
        
        if extract_bol and final_text:
            print("\n🚢 Extracting Bill of Lading structure...")
            bol_data = bol_extractor.extract(final_text)
            bol_formatted = bol_extractor.format_output(bol_data)
            print(f"✅ B/L extracted with {bol_data['extraction_confidence']:.1f}% confidence")
        
        total_time = time.time() - start_time
        
        results_to_save = []
        for ocr_result in ocr_results:
            if ocr_result.get("text", "").strip():
                result_record = OCRResult(
                    document_id=document.id,
                    engine_name=ocr_result["engine"],
                    extracted_text=ocr_result["text"][:50000],
                    confidence_score=ocr_result.get("confidence", 0.0),
                    processing_time=ocr_result.get("processing_time", 0.0),
                    word_confidences=ocr_result.get("word_confidences"),
                    bounding_boxes=ocr_result.get("bounding_boxes")
                )
                db.add(result_record)
                db.commit()
                db.refresh(result_record)
                results_to_save.append(result_record)
        
        document.status = "completed"
        document.processed_at = datetime.now()
        db.commit()
        
        cache_data = {
            "results": [{
                "id": r.id,
                "document_id": r.document_id,
                "engine_name": r.engine_name,
                "extracted_text": r.extracted_text,
                "confidence_score": r.confidence_score,
                "processing_time": r.processing_time,
                "created_at": r.created_at.isoformat(),
                "word_confidences": r.word_confidences,
                "bounding_boxes": r.bounding_boxes
            } for r in results_to_save],
            "all_results": all_ocr_results,
            "best_result": {
                "id": results_to_save[0].id if results_to_save else 0,
                "document_id": document.id,
                "engine_name": best_result.get("engine", "unknown"),
                "extracted_text": final_text[:50000] if final_text else "",
                "confidence_score": best_result.get("confidence", 0.0),
                "processing_time": best_result.get("processing_time", 0.0),
                "created_at": datetime.now().isoformat(),
                "word_confidences": best_result.get("word_confidences", {}),
                "bounding_boxes": best_result.get("bounding_boxes", [])
            },
            "total_processing_time": total_time,
            "patterns": {},
            "improvements": improvements,
            "bol_data": bol_data,
            "bol_formatted": bol_formatted
        }
        
        cache_record = OCRCache(
            document_id=document.id,
            file_hash=document.file_hash,
            cached_result=cache_data,
            hit_count=0,
            created_at=datetime.now()
        )
        db.add(cache_record)
        db.commit()
        
        print(f"✅ Complete in {total_time:.2f}s")
        
        return OCRProcessResponse(
            document_id=document.id,
            file_name=document.file_name,
            status="completed",
            results=[OCRResultResponse(**r) for r in cache_data["results"]],
            best_result=OCRResultResponse(**cache_data["best_result"]),
            total_processing_time=total_time,
            cached=False,
            patterns=cache_data.get("patterns"),
            improvements=cache_data.get("improvements"),
            bol_data=bol_data,
            bol_formatted=bol_formatted,
            all_results=all_ocr_results
        )
    
    except Exception as e:
        document.status = "failed"
        db.commit()
        print(f"❌ Error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/bol/{document_id}")
async def extract_bol_only(document_id: int, db: Session = Depends(get_db)):
    """
    🚢 Extract Bill of Lading structure from already processed document
    """
    document = db.query(OCRDocument).filter(OCRDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    result = db.query(OCRResult).filter(
        OCRResult.document_id == document_id
    ).order_by(OCRResult.confidence_score.desc()).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="No OCR results found")
    
    bol_data = bol_extractor.extract(result.extracted_text)
    bol_formatted = bol_extractor.format_output(bol_data)
    
    return {
        "document_id": document_id,
        "file_name": document.file_name,
        "bol_data": bol_data,
        "bol_formatted": bol_formatted
    }


@router.get("/stats", response_model=OCRStatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    """Get OCR statistics"""
    try:
        total = db.query(OCRDocument).count()
        completed = db.query(OCRDocument).filter(OCRDocument.status == "completed").count()
        failed = db.query(OCRDocument).filter(OCRDocument.status == "failed").count()
        processing = db.query(OCRDocument).filter(OCRDocument.status == "processing").count()
        cache_count = db.execute(text("SELECT COUNT(*) FROM ocr_cache")).scalar()
        
        return OCRStatsResponse(
            total_documents=total,
            completed=completed,
            failed=failed,
            processing=processing,
            cache_entries=cache_count,
            available_engines={
                "tesseract": True,
                "easyocr": EASYOCR_AVAILABLE,
                "paddleocr": PADDLEOCR_AVAILABLE,
                "pdfplumber": True,
                "pandas": True,
                "bol_extractor": True
            }
        )
    except Exception as e:
        print(f"❌ Stats error: {str(e)}")
        return OCRStatsResponse(
            total_documents=0,
            completed=0,
            failed=0,
            processing=0,
            cache_entries=0,
            available_engines={
                "tesseract": True,
                "easyocr": EASYOCR_AVAILABLE,
                "paddleocr": PADDLEOCR_AVAILABLE,
                "pdfplumber": True,
                "pandas": True,
                "bol_extractor": True
            }
        )


@router.delete("/cleanup/{document_id}")
async def cleanup_document(document_id: int, db: Session = Depends(get_db)):
    """Delete document"""
    document = db.query(OCRDocument).filter(OCRDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    ImageUtils.cleanup_temp_file(document.file_path)
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted", "id": document_id}


@router.get("/compare/{document_id}", response_model=OCRComparisonResponse)
async def compare_engines(
    document_id: int, 
    languages: List[str] = ["en"], 
    db: Session = Depends(get_db)
):
    """Compare OCR engines"""
    document = db.query(OCRDocument).filter(OCRDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    start_time = time.time()
    results = db.query(OCRResult).filter(OCRResult.document_id == document_id).all()
    
    if not results:
        raise HTTPException(status_code=404, detail="No results found")
    
    texts = [r.extracted_text for r in results]
    agreement = voting_system.calculate_agreement([{"text": t} for t in texts])
    best = max(results, key=lambda r: r.confidence_score)
    
    return OCRComparisonResponse(
        document_id=document.id,
        file_name=document.file_name,
        results=[OCRResultResponse.from_orm(r) for r in results],
        agreement_score=agreement,
        recommended_engine=best.engine_name,
        processing_time=time.time() - start_time
    )


@router.post("/process-bol")
async def process_bill_of_lading(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    🚢 DEDICATED Bill of Lading Processing Endpoint
    """
    start_time = time.time()
    
    try:
        file_bytes = await file.read()
        
        is_valid, message = ImageUtils.validate_image(file_bytes, file.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        print(f"\n🚢 Processing Bill of Lading: {file.filename}")
        
        ocr_engines = []
        
        if EASYOCR_AVAILABLE and easyocr_engine:
            ocr_engines.append(easyocr_engine)
        
        if PADDLEOCR_AVAILABLE and paddleocr_engine:
            ocr_engines.append(paddleocr_engine)
        
        ocr_engines.append(tesseract)
        
        preprocessed_img, prep_metadata = preprocessor.preprocess_full_pipeline(file_bytes)
        
        ocr_results = []
        for engine in ocr_engines:
            if engine:
                result = engine.extract_text(preprocessed_img)
                if result.get('text', '').strip():
                    ocr_results.append(result)
        
        if not ocr_results:
            raise ValueError("All OCR engines failed to extract text")
        
        best_ocr = voting_system.merge_results(ocr_results)
        raw_text = best_ocr.get('text', '')
        
        from services.fix_ocr_errors import OCRErrorFixer
        error_fixer = OCRErrorFixer()
        corrected_text = error_fixer.fix_common_errors(raw_text)
        
        print(f"  🔧 OCR errors corrected")
        
        from services.advanced_bol_preprocessing import BOLTextCleaner
        text_cleaner = BOLTextCleaner()
        cleaned_text = text_cleaner.clean_bol_text(corrected_text)
        
        bol_data = bol_extractor.extract(cleaned_text)
        bol_formatted = bol_extractor.format_output(bol_data)
        
        total_time = time.time() - start_time
        
        print(f"✅ BOL processing complete in {total_time:.2f}s")
        print(f"   Confidence: {bol_data['extraction_confidence']:.1f}%")
        
        return {
            "status": "success",
            "file_name": file.filename,
            "processing_time": total_time,
            "raw_text": raw_text,
            "corrected_text": corrected_text,
            "cleaned_text": cleaned_text,
            "bol_data": bol_data,
            "bol_formatted": bol_formatted,
            "metadata": {
                "preprocessing": prep_metadata,
                "ocr_confidence": best_ocr.get('confidence', 0),
                "extraction_confidence": bol_data['extraction_confidence'],
                "ocr_corrections_applied": True
            }
        }
    
    except Exception as e:
        print(f"❌ BOL processing error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/clean-bol-text")
async def clean_existing_bol_text(text: str):
    """
    🧹 Clean already extracted BOL text
    """
    try:
        from services.fix_ocr_errors import OCRErrorFixer
        from services.advanced_bol_preprocessing import BOLTextCleaner
        
        error_fixer = OCRErrorFixer()
        text_cleaner = BOLTextCleaner()
        extractor = BillOfLadingExtractor()
        
        corrected = error_fixer.fix_common_errors(text)
        cleaned = text_cleaner.clean_bol_text(corrected)
        bol_data = extractor.extract(cleaned)
        bol_formatted = extractor.format_output(bol_data)
        
        return {
            "status": "success",
            "original_length": len(text),
            "corrected_length": len(corrected),
            "cleaned_length": len(cleaned),
            "original_text": text,
            "corrected_text": corrected,
            "cleaned_text": cleaned,
            "bol_data": bol_data,
            "bol_formatted": bol_formatted
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleaning failed: {str(e)}")
