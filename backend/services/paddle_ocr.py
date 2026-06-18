"""services/paddle_ocr.py - WITH GRACEFUL PADDLE IMPORT"""
import numpy as np
import time
import cv2
from typing import Dict, Any, List

# Try importing PaddleOCR with better error handling
try:
    from paddleocr import PaddleOCR
    PADDLE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ PaddleOCR import failed: {e}")
    print("   Install with: pip install paddlepaddle==2.6.2")
    PADDLE_AVAILABLE = False
    PaddleOCR = None

class PaddleOCREngine:
    """🔥 PaddleOCR with perfect line extraction"""
    
    def __init__(self):
        if not PADDLE_AVAILABLE:
            raise ImportError(
                "PaddleOCR requires paddlepaddle to be installed.\n"
                "Install with: pip install paddlepaddle==2.6.2"
            )
        
        try:
            assert PaddleOCR is not None
            self.ocr = PaddleOCR(use_angle_cls=True, lang='en')
        except Exception as e:
            raise ImportError(f"Failed to initialize PaddleOCR: {str(e)}")
    
    def _ensure_3channel(self, img: np.ndarray) -> np.ndarray:
        """Convert grayscale to RGB"""
        if len(img.shape) == 2:
            return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif img.shape[2] == 1:
            return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        return img
    
    def _group_by_lines(self, results, line_threshold=15):
        """🔥 SMART LINE GROUPING based on Y-coordinate"""
        if not results or not results[0]:
            return []
        
        # Extract all items with their coordinates
        items = []
        for line in results[0]:
            bbox, (text, conf) = line
            y_coords = [point[1] for point in bbox]
            x_coords = [point[0] for point in bbox]
            
            items.append({
                'text': text,
                'conf': conf,
                'y_center': sum(y_coords) / len(y_coords),
                'x_left': min(x_coords),
                'bbox': bbox
            })
        
        # Sort by Y coordinate (top to bottom)
        items.sort(key=lambda x: x['y_center'])
        
        # Group into lines
        lines = []
        current_line = []
        prev_y = None
        
        for item in items:
            y = item['y_center']
            
            # If Y difference is large, start new line
            if prev_y is not None and abs(y - prev_y) > line_threshold:
                if current_line:
                    # Sort line by X coordinate (left to right)
                    current_line.sort(key=lambda x: x['x_left'])
                    lines.append(current_line)
                current_line = []
            
            current_line.append(item)
            prev_y = y
        
        # Add last line
        if current_line:
            current_line.sort(key=lambda x: x['x_left'])
            lines.append(current_line)
        
        return lines
    
    def extract_text(self, img: np.ndarray, languages: List[str] = ["en"]) -> Dict[str, Any]:
        """Extract text with perfect line preservation"""
        start_time = time.time()
        
        if not PADDLE_AVAILABLE:
            return {
                "text": "",
                "confidence": 0.0,
                "processing_time": 0.0,
                "word_confidences": {},
                "bounding_boxes": [],
                "engine": "paddleocr",
                "error": "PaddlePaddle not installed"
            }
        
        try:
            # Ensure valid image
            if img is None or img.size == 0:
                raise ValueError("Invalid image")
            
            # Convert to 3-channel
            img = self._ensure_3channel(img)
            
            # Run OCR
            results = self.ocr.ocr(img, cls=True)
            
            if not results or not results[0]:
                print("⚠️ PaddleOCR: No text detected")
                return {
                    "text": "",
                    "confidence": 0.0,
                    "processing_time": float(time.time() - start_time),
                    "word_confidences": {},
                    "bounding_boxes": [],
                    "engine": "paddleocr"
                }
            
            # Group by lines
            lines = self._group_by_lines(results, line_threshold=15)
            
            extracted_lines = []
            word_confidences = {}
            bounding_boxes = []
            confidences = []
            
            for line in lines:
                line_texts = []
                for item in line:
                    text = item['text']
                    conf = item['conf']
                    
                    # Filter low confidence or empty
                    if conf < 0.15 or len(text.strip()) == 0:
                        continue
                    
                    line_texts.append(text)
                    confidences.append(conf)
                    word_confidences[text] = float(conf * 100)
                    
                    # Bounding box
                    bbox = item['bbox']
                    x_coords = [point[0] for point in bbox]
                    y_coords = [point[1] for point in bbox]
                    bounding_boxes.append({
                        "text": text,
                        "confidence": float(conf * 100),
                        "x": int(min(x_coords)),
                        "y": int(min(y_coords)),
                        "width": int(max(x_coords) - min(x_coords)),
                        "height": int(max(y_coords) - min(y_coords))
                    })
                
                # Join words in line with space
                if line_texts:
                    extracted_lines.append(' '.join(line_texts))
            
            # Join lines with newline
            full_text = '\n'.join(extracted_lines)
            
            avg_confidence = float((sum(confidences) / len(confidences) * 100)) if confidences else 0.0
            processing_time = float(time.time() - start_time)
            
            print(f"✅ PaddleOCR extracted {len(full_text.split())} words in {processing_time:.2f}s")
            
            return {
                "text": full_text.strip(),
                "confidence": avg_confidence,
                "processing_time": processing_time,
                "word_confidences": word_confidences,
                "bounding_boxes": bounding_boxes,
                "engine": "paddleocr"
            }
        
        except Exception as e:
            print(f"❌ PaddleOCR error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return {
                "text": "",
                "confidence": 0.0,
                "processing_time": float(time.time() - start_time),
                "word_confidences": {},
                "bounding_boxes": [],
                "engine": "paddleocr"
            }