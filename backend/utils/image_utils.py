"""utils/image_utils.py - FIXED with proper cv2 error handling"""
import hashlib
import os
from pathlib import Path
from typing import Tuple, Dict, Any, List
import numpy as np
from PIL import Image
import io
import pandas as pd

# OpenCV import with validation
try:
    import cv2
    # Verify cv2 has required attributes
    if not hasattr(cv2, 'imdecode'):
        print("❌ WARNING: cv2.imdecode not found - OpenCV may be corrupted")
        print("   Fix: pip uninstall opencv-python opencv-contrib-python")
        print("        pip install opencv-python==4.8.1.78")
        CV2_AVAILABLE = False
    else:
        CV2_AVAILABLE = True
        print("✅ OpenCV loaded successfully")
except ImportError as e:
    print(f"❌ OpenCV import failed: {e}")
    CV2_AVAILABLE = False
    cv2 = None

# PyMuPDF for scanned PDFs - MADE OPTIONAL
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
    print("✅ PyMuPDF available - Scanned PDF support enabled")
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("❌ PyMuPDF not available - Scanned PDFs will use alternative method")
    print("   To enable: pip install PyMuPDF==1.19.6")

# PDFPlumber for text PDFs
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
    print("✅ PDFPlumber available - Text PDF extraction enabled")
except ImportError:
    PDFPLUMBER_AVAILABLE = False
    print("❌ PDFPlumber not available - install: pip install pdfplumber")

# Excel support
try:
    import openpyxl
    EXCEL_AVAILABLE = True
    print("✅ Excel support enabled")
except ImportError:
    EXCEL_AVAILABLE = False
    print("❌ Excel support disabled - install: pip install openpyxl")


class DocumentType:
    """Document type constants"""
    IMAGE = "image"
    PDF_TEXT = "pdf_text"
    PDF_SCANNED = "pdf_scanned"
    EXCEL = "excel"
    CSV = "csv"
    UNKNOWN = "unknown"


class PDFTableExtractor:
    """🔥 ADVANCED: Extract tables from PDFs with structure preservation"""
    
    @staticmethod
    def extract_tables_with_structure(pdf_path_or_bytes) -> List[Dict[str, Any]]:
        """Extract all tables from PDF with full structure"""
        if not PDFPLUMBER_AVAILABLE:
            return []
        
        tables_data = []
        
        try:
            if isinstance(pdf_path_or_bytes, bytes):
                pdf_file = pdfplumber.open(io.BytesIO(pdf_path_or_bytes))
            else:
                pdf_file = pdfplumber.open(pdf_path_or_bytes)
            
            for page_num, page in enumerate(pdf_file.pages, 1):
                page_tables = page.extract_tables()
                
                if page_tables:
                    for table_idx, table in enumerate(page_tables):
                        if table and len(table) > 0:
                            try:
                                # Convert to DataFrame for better handling
                                headers = table[0] if table[0] else [f"Col_{i}" for i in range(len(table[0]))]
                                df = pd.DataFrame(table[1:], columns=headers)
                                
                                # Clean DataFrame
                                df = df.dropna(how='all')  # Remove empty rows
                                df = df.fillna('')  # Fill NaN with empty string
                                
                                tables_data.append({
                                    "page": page_num,
                                    "table_index": table_idx + 1,
                                    "columns": df.columns.tolist(),
                                    "rows": len(df),
                                    "data": df.to_dict('records'),
                                    "raw_table": table,
                                    "text_representation": df.to_string(index=False)
                                })
                                
                                print(f"  📊 Table {table_idx + 1} extracted from page {page_num}: {len(df)} rows × {len(df.columns)} cols")
                            
                            except Exception as e:
                                print(f"  ⚠️ Failed to parse table on page {page_num}: {str(e)}")
            
            pdf_file.close()
            return tables_data
        
        except Exception as e:
            print(f"❌ Table extraction error: {str(e)}")
            return []
    
    @staticmethod
    def tables_to_text(tables: List[Dict[str, Any]]) -> str:
        """Convert extracted tables to formatted text"""
        if not tables:
            return ""
        
        text_parts = []
        for table_info in tables:
            text_parts.append(f"\n{'='*60}")
            text_parts.append(f"TABLE {table_info['table_index']} - Page {table_info['page']}")
            text_parts.append(f"{'='*60}")
            text_parts.append(table_info['text_representation'])
            text_parts.append("")
        
        return "\n".join(text_parts)


class ImageUtils:
    """Universal document processor - Images, PDFs, Excel, CSV"""
    
    @staticmethod
    def calculate_hash(file_bytes: bytes) -> str:
        """Calculate SHA256 hash of file"""
        return hashlib.sha256(file_bytes).hexdigest()
    
    @staticmethod
    def is_pdf(file_bytes: bytes) -> bool:
        """Check if file is a PDF"""
        return file_bytes[:4] == b'%PDF'
    
    @staticmethod
    def load_image_from_bytes(file_bytes: bytes) -> np.ndarray:
        """
        🔥 FIXED: Load image using PIL as fallback if cv2 fails
        """
        if not CV2_AVAILABLE or cv2 is None:
            # Fallback to PIL
            print("  Using PIL for image loading (cv2 unavailable)")
            try:
                pil_image = Image.open(io.BytesIO(file_bytes))
                # Convert to RGB if needed
                if pil_image.mode != 'RGB':
                    pil_image = pil_image.convert('RGB')
                # Convert to numpy array (BGR for OpenCV compatibility)
                img_array = np.array(pil_image)
                # Convert RGB to BGR
                img_array = img_array[:, :, ::-1].copy()
                return img_array
            except Exception as e:
                raise ValueError(f"Failed to load image with PIL: {str(e)}")
        
        # Try cv2 first
        try:
            img_array = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("cv2.imdecode returned None")
            return img
        except Exception as e:
            print(f"  ⚠️ cv2 loading failed: {e}, trying PIL fallback")
            # Fallback to PIL
            try:
                pil_image = Image.open(io.BytesIO(file_bytes))
                if pil_image.mode != 'RGB':
                    pil_image = pil_image.convert('RGB')
                img_array = np.array(pil_image)
                img_array = img_array[:, :, ::-1].copy()  # RGB to BGR
                return img_array
            except Exception as pil_error:
                raise ValueError(f"Both cv2 and PIL failed: {str(pil_error)}")
    
    @staticmethod
    def detect_document_type(file_bytes: bytes, filename: str) -> str:
        """
        Detect document type - ENHANCED
        Returns: DocumentType constant
        """
        ext = os.path.splitext(filename)[1].lower()
        
        # Excel files
        if ext in ['.xlsx', '.xls', '.xlsm']:
            print(f"📊 Detected Excel file: {filename}")
            return DocumentType.EXCEL
        
        # CSV files
        if ext == '.csv':
            print(f"📈 Detected CSV file: {filename}")
            return DocumentType.CSV
        
        # PDF files - Better detection
        if file_bytes[:4] == b'%PDF':
            if PDFPLUMBER_AVAILABLE:
                try:
                    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                        if len(pdf.pages) > 0:
                            # Try first page
                            text = pdf.pages[0].extract_text(
                                x_tolerance=3,
                                y_tolerance=3,
                                layout=True
                            )
                            
                            # If significant text exists, it's text-based
                            if text and len(text.strip()) > 100:
                                print(f"📄 Text-based PDF detected ({len(text.strip())} chars on page 1)")
                                return DocumentType.PDF_TEXT
                except Exception as e:
                    print(f"⚠️ PDF text detection failed: {str(e)}")
            
            print("📄 Scanned/Image PDF detected - will use OCR")
            return DocumentType.PDF_SCANNED
        
        # Image files - Check magic bytes
        if file_bytes[:2] == b'\xff\xd8':  # JPEG
            print(f"🖼️ Detected JPEG image: {filename}")
            return DocumentType.IMAGE
        elif file_bytes[:4] == b'\x89PNG':  # PNG
            print(f"🖼️ Detected PNG image: {filename}")
            return DocumentType.IMAGE
        elif file_bytes[:2] == b'BM':  # BMP
            print(f"🖼️ Detected BMP image: {filename}")
            return DocumentType.IMAGE
        elif file_bytes[:4] in [b'GIF8', b'GIF9']:  # GIF
            print(f"🖼️ Detected GIF image: {filename}")
            return DocumentType.IMAGE
        
        print(f"❌ Unknown file type: {filename}")
        return DocumentType.UNKNOWN
    
    @staticmethod
    def validate_image(file_bytes: bytes, filename: str = "") -> Tuple[bool, str]:
        """
        🔥 FIXED: Validate if document is supported
        Returns: (is_valid, message)
        """
        try:
            doc_type = ImageUtils.detect_document_type(file_bytes, filename)
            
            if doc_type == DocumentType.UNKNOWN:
                return False, "Unsupported file format"
            
            if doc_type in [DocumentType.PDF_TEXT, DocumentType.EXCEL, DocumentType.CSV]:
                return True, f"Valid {doc_type} file"
            
            if doc_type == DocumentType.PDF_SCANNED:
                if not PYMUPDF_AVAILABLE:
                    return False, (
                        "Scanned PDF detected but PyMuPDF not installed. "
                        "Please convert to images or use text-based PDF."
                    )
                return True, "Valid scanned PDF (will use OCR on all pages)"
            
            if doc_type == DocumentType.IMAGE:
                # Try to decode image using the new method
                try:
                    img = ImageUtils.load_image_from_bytes(file_bytes)
                    if img is None:
                        return False, "Invalid or corrupted image"
                    return True, "Valid image"
                except Exception as e:
                    return False, f"Image validation failed: {str(e)}"
            
            return False, "Unknown error during validation"
        
        except Exception as e:
            print(f"❌ Validation error: {str(e)}")
            return False, f"Validation error: {str(e)}"
    
    @staticmethod
    def extract_pdf_text(file_bytes: bytes) -> Dict[str, Any]:
        """
        🔥 Extract text from text-based PDF - COMPLETE EXTRACTION
        Returns: dict with text, tables, metadata
        """
        if not PDFPLUMBER_AVAILABLE:
            return {"success": False, "error": "pdfplumber not installed"}
        
        try:
            full_text = []
            tables = []
            metadata = {}
            
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                metadata = {
                    "total_pages": len(pdf.pages),
                    "metadata": pdf.metadata or {}
                }
                
                print(f"📄 Extracting {len(pdf.pages)} pages from PDF...")
                
                for page_num, page in enumerate(pdf.pages, 1):
                    # Extract text with BEST settings for layout preservation
                    page_text = page.extract_text(
                        x_tolerance=3,
                        y_tolerance=3,
                        layout=True,
                        x_density=7.25,
                        y_density=13
                    )
                    
                    if page_text:
                        cleaned_text = page_text.strip()
                        if cleaned_text:
                            full_text.append(f"--- Page {page_num} ---\n{cleaned_text}")
                            print(f"  ✅ Page {page_num}: {len(cleaned_text)} chars")
                    
                    # Extract tables
                    page_tables = page.extract_tables()
                    if page_tables:
                        for table_idx, table in enumerate(page_tables):
                            if table and len(table) > 0:
                                try:
                                    headers = table[0] if table[0] else None
                                    data_rows = table[1:] if headers else table
                                    
                                    df = pd.DataFrame(data_rows, columns=headers)
                                    
                                    # Clean DataFrame
                                    df = df.dropna(how='all')
                                    df = df.fillna('')
                                    
                                    tables.append({
                                        "page": page_num,
                                        "table_index": table_idx + 1,
                                        "data": df.to_dict('records'),
                                        "columns": df.columns.tolist() if headers else [f"Col_{i}" for i in range(len(table[0]))],
                                        "text": df.to_string(index=False)
                                    })
                                    print(f"  📊 Table {table_idx + 1} on page {page_num}: {len(df)} rows")
                                except Exception as te:
                                    print(f"  ⚠️ Table parsing error: {str(te)}")
            
            result_text = "\n\n".join(full_text)
            
            # Add tables to text if any
            if tables:
                table_texts = [f"\n{'='*60}\nTABLE {t['table_index']} - Page {t['page']}\n{'='*60}\n{t['text']}" for t in tables]
                result_text += "\n\n" + "\n\n".join(table_texts)
            
            if not result_text.strip():
                print("⚠️ No text extracted - might be scanned PDF")
                return {"success": False, "error": "No extractable text found", "scanned": True}
            
            print(f"✅ PDF extracted: {len(result_text)} chars, {len(tables)} tables")
            
            return {
                "type": "pdf_text",
                "text": result_text,
                "tables": tables,
                "metadata": metadata,
                "success": True
            }
        except Exception as e:
            print(f"❌ PDF text extraction error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def extract_excel_data(file_bytes: bytes) -> Dict[str, Any]:
        """Extract data from Excel - ALL SHEETS"""
        if not EXCEL_AVAILABLE:
            return {"success": False, "error": "openpyxl not installed"}
        
        try:
            excel_file = pd.ExcelFile(io.BytesIO(file_bytes))
            sheets_data = {}
            full_text = []
            
            print(f"📊 Extracting {len(excel_file.sheet_names)} sheets from Excel...")
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                
                df = df.dropna(how='all')
                df = df.fillna('')
                
                sheet_text = f"\n{'='*60}\nSHEET: {sheet_name}\n{'='*60}\n"
                sheet_text += df.to_string(index=False)
                full_text.append(sheet_text)
                
                sheets_data[sheet_name] = {
                    "rows": len(df),
                    "columns": df.columns.tolist(),
                    "data": df.to_dict('records')
                }
                
                print(f"  ✅ Sheet '{sheet_name}': {len(df)} rows, {len(df.columns)} columns")
            
            result_text = "\n\n".join(full_text)
            print(f"✅ Excel extracted: {len(excel_file.sheet_names)} sheets, {len(result_text)} chars")
            
            return {
                "type": "excel",
                "text": result_text,
                "sheets": sheets_data,
                "total_sheets": len(excel_file.sheet_names),
                "success": True
            }
        except Exception as e:
            print(f"❌ Excel extraction error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def extract_csv_data(file_bytes: bytes) -> Dict[str, Any]:
        """Extract data from CSV"""
        try:
            for encoding in ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']:
                try:
                    df = pd.read_csv(io.BytesIO(file_bytes), encoding=encoding)
                    print(f"✅ CSV decoded with encoding: {encoding}")
                    break
                except Exception:
                    continue
            else:
                raise ValueError("Could not decode CSV with any known encoding")
            
            df = df.dropna(how='all')
            df = df.fillna('')
            
            text = df.to_string(index=False)
            print(f"✅ CSV extracted: {len(df)} rows, {len(df.columns)} columns")
            
            return {
                "type": "csv",
                "text": text,
                "data": df.to_dict('records'),
                "columns": df.columns.tolist(),
                "rows": len(df),
                "success": True
            }
        except Exception as e:
            print(f"❌ CSV extraction error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def pdf_to_images_all_pages(file_bytes: bytes, dpi: int = 200) -> List[Dict[str, Any]]:
        """
        🔥 FIXED: Convert ALL pages with OPTIMIZED DPI
        Lower DPI = faster processing, less memory
        """
        if not PYMUPDF_AVAILABLE:
            raise ValueError(
                "PyMuPDF not installed - cannot convert scanned PDFs.\n"
                "Install with: pip install PyMuPDF==1.19.6"
            )
        
        try:
            pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
            
            if pdf_document.page_count == 0:
                pdf_document.close()
                raise ValueError("PDF has no pages")
            
            print(f"📄 Converting {pdf_document.page_count} PDF pages to images (DPI: {dpi})...")
            
            images = []
            zoom = dpi / 72
            mat = fitz.Matrix(zoom, zoom)
            
            for page_num in range(pdf_document.page_count):
                print(f"  📄 Processing page {page_num + 1}/{pdf_document.page_count}...")
                
                page = pdf_document[page_num]
                pix = page.get_pixmap(matrix=mat, alpha=False)
                img_bytes = pix.tobytes("png")
                
                # ✅ Convert to numpy array immediately
                img_array = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                
                if img is None:
                    print(f"  ⚠️ Failed to decode page {page_num + 1}, skipping...")
                    continue
                
                images.append({
                    "page_num": page_num + 1,
                    "image": img,  # ✅ Store numpy array, not bytes
                    "width": pix.width,
                    "height": pix.height
                })
                
                print(f"  ✅ Page {page_num + 1}: {pix.width}x{pix.height} pixels")
            
            pdf_document.close()
            
            print(f"✅ All {len(images)} pages converted successfully")
            return images
        
        except Exception as e:
            print(f"❌ PDF to image conversion failed: {str(e)}")
            import traceback
            print(traceback.format_exc())
            raise ValueError(f"PDF conversion failed: {str(e)}")
    
    @staticmethod
    def get_image_info(file_bytes: bytes, filename: str = "") -> Dict[str, Any]:
        """Get document metadata"""
        try:
            doc_type = ImageUtils.detect_document_type(file_bytes, filename)
            
            info = {
                "document_type": doc_type,
                "size_bytes": len(file_bytes),
                "size_mb": round(len(file_bytes) / (1024 * 1024), 2),
                "filename": filename,
                "cv2_available": CV2_AVAILABLE,
                "pymupdf_available": PYMUPDF_AVAILABLE
            }
            
            if doc_type in [DocumentType.PDF_TEXT, DocumentType.PDF_SCANNED]:
                if PDFPLUMBER_AVAILABLE:
                    try:
                        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                            info["total_pages"] = len(pdf.pages)
                    except:
                        pass
            
            elif doc_type == DocumentType.IMAGE:
                try:
                    img = ImageUtils.load_image_from_bytes(file_bytes)
                    if img is not None:
                        info.update({
                            "width": img.shape[1],
                            "height": img.shape[0],
                            "channels": img.shape[2] if len(img.shape) > 2 else 1,
                            "total_pixels": img.shape[0] * img.shape[1]
                        })
                except Exception as e:
                    info["error"] = f"Could not read image dimensions: {str(e)}"
            
            return info
        
        except Exception as e:
            print(f"❌ Error getting image info: {str(e)}")
            return {
                "document_type": DocumentType.UNKNOWN,
                "size_bytes": len(file_bytes),
                "error": str(e)
            }
    
    @staticmethod
    def save_temp_file(file_bytes: bytes, filename: str, upload_dir: str = "uploads") -> str:
        """Save file temporarily"""
        try:
            upload_dir = os.path.abspath(upload_dir)
            Path(upload_dir).mkdir(parents=True, exist_ok=True)
            
            filepath = os.path.join(upload_dir, filename)
            
            with open(filepath, "wb") as f:
                f.write(file_bytes)
            
            print(f"✅ File saved: {filepath} ({len(file_bytes)} bytes)")
            return filepath
        
        except Exception as e:
            print(f"❌ Failed to save file: {str(e)}")
            raise
    
    @staticmethod
    def cleanup_temp_file(filepath: str) -> bool:
        """Delete temporary file"""
        if not filepath or not os.path.exists(filepath):
            return False
        
        try:
            os.remove(filepath)
            print(f"✅ Cleaned up: {filepath}")
            return True
        except Exception as e:
            print(f"⚠️ Cleanup failed for {filepath}: {str(e)}")
            return False
    
    @staticmethod
    def batch_cleanup(directory: str, older_than_hours: int = 24) -> int:
        """Clean up old files"""
        import time
        
        if not os.path.exists(directory):
            return 0
        
        deleted_count = 0
        cutoff_time = time.time() - (older_than_hours * 3600)
        
        try:
            for filename in os.listdir(directory):
                filepath = os.path.join(directory, filename)
                
                if os.path.isfile(filepath):
                    file_modified = os.path.getmtime(filepath)
                    
                    if file_modified < cutoff_time:
                        try:
                            os.remove(filepath)
                            deleted_count += 1
                        except:
                            pass
            
            if deleted_count > 0:
                print(f"✅ Cleaned up {deleted_count} old files from {directory}")
            
            return deleted_count
        
        except Exception as e:
            print(f"❌ Batch cleanup error: {str(e)}")
            return deleted_count


# Export classes
__all__ = [
    'ImageUtils',
    'DocumentType',
    'PDFTableExtractor',
    'PYMUPDF_AVAILABLE',
    'PDFPLUMBER_AVAILABLE',
    'EXCEL_AVAILABLE',
    'CV2_AVAILABLE'
]