"""services/easy_ocr.py - ULTIMATE LAYOUT PRESERVATION"""
import easyocr
import numpy as np
import time
from typing import Dict, Any, List

class EasyOCREngine:
    """🔥 EasyOCR with perfect spatial grouping"""
    
    def __init__(self):
        self.reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    
    def _group_into_lines(self, results, line_threshold=15):
        """
        🔥 SMART LINE GROUPING - Group by Y-coordinate proximity
        """
        if not results:
            return []
        
        # Sort by Y coordinate (top to bottom)
        sorted_results = sorted(results, key=lambda r: r[0][0][1])
        
        lines = []
        current_line = []
        prev_y = None
        
        for item in sorted_results:
            bbox, text, conf = item
            
            # Get Y center
            y_coords = [point[1] for point in bbox]
            y_center = sum(y_coords) / len(y_coords)
            
            # Check if new line (Y difference > threshold)
            if prev_y is not None and abs(y_center - prev_y) > line_threshold:
                if current_line:
                    # Sort current line by X (left to right)
                    current_line.sort(key=lambda x: x[0][0][0])
                    lines.append(current_line)
                current_line = []
            
            current_line.append(item)
            prev_y = y_center
        
        # Add last line
        if current_line:
            current_line.sort(key=lambda x: x[0][0][0])
            lines.append(current_line)
        
        return lines
    
    def extract_text(self, img: np.ndarray, languages: List[str] = ["en"]) -> Dict[str, Any]:
        """Extract text preserving original layout"""
        start_time = time.time()
        
        try:
            # Run EasyOCR
            results = self.reader.readtext(img, detail=1, paragraph=False)
            
            if not results:
                print("⚠️ EasyOCR: No text detected")
                return {
                    "text": "",
                    "confidence": 0.0,
                    "processing_time": float(time.time() - start_time),
                    "word_confidences": {},
                    "bounding_boxes": [],
                    "engine": "easyocr"
                }
            
            # Group into lines
            lines = self._group_into_lines(results, line_threshold=15)
            
            extracted_lines = []
            word_confidences = {}
            bounding_boxes = []
            confidences = []
            
            for line in lines:
                line_texts = []
                for bbox, text, conf in line:
                    # Filter low confidence or single chars
                    if conf < 0.15 or len(text.strip()) == 0:
                        continue
                    
                    line_texts.append(text)
                    confidences.append(conf)
                    word_confidences[text] = float(conf * 100)
                    
                    # Bounding box
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
            
            print(f"✅ EasyOCR extracted {len(full_text.split())} words in {processing_time:.2f}s")
            
            return {
                "text": full_text.strip(),
                "confidence": avg_confidence,
                "processing_time": processing_time,
                "word_confidences": word_confidences,
                "bounding_boxes": bounding_boxes,
                "engine": "easyocr"
            }
        
        except Exception as e:
            print(f"❌ EasyOCR error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return {
                "text": "",
                "confidence": 0.0,
                "processing_time": float(time.time() - start_time),
                "word_confidences": {},
                "bounding_boxes": [],
                "engine": "easyocr"
            }