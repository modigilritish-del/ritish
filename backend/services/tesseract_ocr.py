"""services/tesseract_ocr.py - ULTIMATE LINE PRESERVATION"""
import pytesseract
from PIL import Image
import numpy as np
import time
import cv2 
from typing import Dict, Any
import os

TESSERACT_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

class TesseractOCR:
    """🔥 Enhanced Tesseract with PERFECT line preservation"""
    
    def __init__(self):
        self.configs = {
            'default': r'--oem 3 --psm 3',
            'single_block': r'--oem 3 --psm 6',
            'single_line': r'--oem 3 --psm 7',
            'sparse_text': r'--oem 3 --psm 11',
            'invoice': r'--oem 3 --psm 4',
        }
    
    def _extract_with_layout(self, pil_img, lang: str, config: str) -> str:
        """🔥 PRESERVE EXACT LAYOUT - Line by Line with Spatial Grouping"""
        try:
            # Get detailed bounding box data
            data = pytesseract.image_to_data(
                pil_img, 
                lang=lang, 
                config=config, 
                output_type=pytesseract.Output.DICT
            )
            
            if not data or not data['text']:
                return ""
            
            # Group words by their Y position (lines)
            LINE_THRESHOLD = 15  # pixels - words within this Y-distance are on same line
            
            lines_dict = {}  # {approx_y: [(x, word, conf), ...]}
            
            for i in range(len(data['text'])):
                word = data['text'][i].strip()
                conf = int(data['conf'][i])
                
                # Skip empty or very low confidence
                if not word or conf < 15:
                    continue
                
                x = data['left'][i]
                y = data['top'][i]
                h = data['height'][i]
                
                # Find which line this word belongs to
                y_center = y + h // 2
                found_line = False
                
                for line_y in lines_dict.keys():
                    if abs(y_center - line_y) <= LINE_THRESHOLD:
                        lines_dict[line_y].append((x, word, conf))
                        found_line = True
                        break
                
                # Create new line if not found
                if not found_line:
                    lines_dict[y_center] = [(x, word, conf)]
            
            # Sort lines by Y position (top to bottom)
            sorted_lines = sorted(lines_dict.items(), key=lambda item: item[0])
            
            # Build text line by line
            result_lines = []
            for y_pos, words in sorted_lines:
                # Sort words in line by X position (left to right)
                sorted_words = sorted(words, key=lambda w: w[0])
                
                # Extract text only
                line_text = ' '.join(word for x, word, conf in sorted_words)
                
                if line_text.strip():
                    result_lines.append(line_text)
            
            # Join with newlines
            return '\n'.join(result_lines)
        
        except Exception as e:
            print(f"⚠️ Layout extraction error: {str(e)}")
            return ""
    
    def extract_text(self, img: np.ndarray, lang: str = "eng", mode: str = "auto") -> Dict[str, Any]:
        """Main extraction with perfect line preservation"""
        start_time = time.time()
        
        try:
            # Convert to PIL
            if len(img.shape) == 2:
                pil_img = Image.fromarray(img)
            else:
                pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            
            # Select config
            config_key = 'single_block'
            config =  r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
            
            
            # 🔥 EXTRACT WITH LAYOUT PRESERVATION
            text = self._extract_with_layout(pil_img, lang, config)
            
            if not text or not text.strip():
                print("⚠️ Tesseract: No text extracted")
                return {
                    "text": "",
                    "confidence": 0.0,
                    "processing_time": float(time.time() - start_time),
                    "word_confidences": {},
                    "bounding_boxes": [],
                    "engine": "tesseract"
                }
            
            # Get confidence data
            data = pytesseract.image_to_data(
                pil_img, 
                lang=lang, 
                config=config, 
                output_type=pytesseract.Output.DICT
            )
            
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = float(sum(confidences) / len(confidences)) if confidences else 0.0
            
            # Build word confidences and bounding boxes
            word_confidences = {}
            bounding_boxes = []
            
            for i in range(len(data['text'])):
                word = data['text'][i].strip()
                conf = int(data['conf'][i])
                
                if word and conf > 0:
                    word_confidences[word] = float(conf)
                    
                    bounding_boxes.append({
                        "text": word,
                        "confidence": float(conf),
                        "x": int(data['left'][i]),
                        "y": int(data['top'][i]),
                        "width": int(data['width'][i]),
                        "height": int(data['height'][i])
                    })
            
            processing_time = float(time.time() - start_time)
            
            print(f"✅ Tesseract extracted {len(text.split())} words in {processing_time:.2f}s")
            
            return {
                "text": text.strip(),
                "confidence": avg_confidence,
                "processing_time": processing_time,
                "word_confidences": word_confidences,
                "bounding_boxes": bounding_boxes,
                "engine": "tesseract",
                "config_used": config_key
            }
        
        except Exception as e:
            print(f"❌ Tesseract error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return {
                "text": "",
                "confidence": 0.0,
                "processing_time": float(time.time() - start_time),
                "word_confidences": {},
                "bounding_boxes": [],
                "engine": "tesseract"
            }