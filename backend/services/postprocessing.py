"""services/postprocessing.py - WITH OCR ERROR CORRECTION"""
import re
from typing import Dict, Any
import string

# Import the error fixer
try:
    from services.fix_ocr_errors import OCRErrorFixer
    ERROR_FIXER_AVAILABLE = True
except ImportError:
    ERROR_FIXER_AVAILABLE = False
    print("⚠️ OCRErrorFixer not available")

class PostProcessor:
    """🔥 Post-processing with OCR error correction"""
    
    def __init__(self):
        self.error_fixer = OCRErrorFixer() if ERROR_FIXER_AVAILABLE else None
        # Only UI noise patterns (NOT actual content)
        self.noise_patterns = [
            r'Choose\s+File\s*No\s+file\s+chosen',
            r'Browse\s+Files?',
            r'Upload\s+Image',
            r'Drag\s+(?:and|&)\s+Drop',
        ]
        
        # Common words for spell check (optional)
        self.common_words = {
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
            'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
            'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
            'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their'
        }
    
    def clean_text(self, text: str) -> str:
        """🔥 MINIMAL CLEANING - Only remove UI noise"""
        if not text:
            return ""
        
        cleaned = text
        
        # Remove ONLY clear UI noise patterns
        for pattern in self.noise_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
        
        # Remove excessive blank lines (more than 2 consecutive)
        cleaned = re.sub(r'\n{4,}', '\n\n\n', cleaned)
        
        # NO other modifications - preserve everything else
        return cleaned.strip()
    
    def extract_structured_data(self, text: str) -> Dict[str, Any]:
        """Extract common patterns (emails, phones, dates)"""
        patterns = {}
        
        # Email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            patterns["emails"] = list(set(emails))
        
        # Phone (Indian + International)
        phone_patterns = [
            r'\b(?:\+91|91)?[-.\s]?[6-9]\d{9}\b',
            r'\b\d{10}\b',
            r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',
        ]
        phones = []
        for pattern in phone_patterns:
            phones.extend(re.findall(pattern, text))
        if phones:
            patterns["phones"] = list(set(phones))
        
        # Dates
        date_patterns = [
            r'\b\d{4}-\d{2}-\d{2}\b',
            r'\b\d{2}[-/]\d{2}[-/]\d{4}\b',
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b',
        ]
        dates = []
        for pattern in date_patterns:
            dates.extend(re.findall(pattern, text, re.IGNORECASE))
        if dates:
            patterns["dates"] = list(set(dates))
        
        # URLs
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        urls = re.findall(url_pattern, text)
        if urls:
            patterns["urls"] = list(set(urls))
        
        return patterns
    
    def detect_language(self, text: str) -> str:
        """Simple language detection"""
        english_chars = len(re.findall(r'[a-zA-Z]', text))
        hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
        digits = len(re.findall(r'\d', text))
        
        if hindi_chars > english_chars:
            return 'hi'
        elif english_chars > 0 or digits > 0:
            return 'en'
        else:
            return 'mixed'
    
    # 🔥 THIS METHOD MUST BE INSIDE THE CLASS (indented properly)
    def process_full(self, text: str, apply_spell_check: bool = True, is_bol_document: bool = False):
        """
        🔥 COMPLETE POST-PROCESSING WITH OCR ERROR CORRECTION
        - OCR error correction (character confusions, BOL-specific errors)
        - Minimal cleaning (only UI noise)
        - Pattern extraction
        - Layout preservation
        """
        print("\n🧹 Starting post-processing with OCR correction...")
        
        if not text:
            return {
                "original": "",
                "cleaned": "",
                "corrected": "",
                "patterns": {},
                "language": "unknown",
                "improvements": {}
            }
        
        # Detect language
        language = self.detect_language(text)
        print(f"  Detected language: {language}")
        
        # 🔥 STEP 1: FIX OCR ERRORS FIRST (most important)
        corrected = text
        corrections_made = 0
        
        if self.error_fixer and apply_spell_check:
            if is_bol_document:
                # Aggressive BOL fixes
                from services.fix_ocr_errors import BOLSpecificFixer
                corrected = BOLSpecificFixer().fix_bol_document(text)
            else:
                # Conservative fixes
                corrected = self.error_fixer.fix_common_errors(text)
                # Count how many changes were made
                corrections_made = sum(1 for a, b in zip(text, corrected) if a != b)
                if corrections_made > 0:
                    print(f"  🔧 OCR errors corrected: {corrections_made} characters")
        
        # Step 2: Clean text (minimal - only UI noise)
        cleaned = self.clean_text(corrected)
        chars_removed = len(corrected) - len(cleaned)
        if chars_removed > 0:
            print(f"  Removed UI noise: {chars_removed} chars")
        
        # Step 3: Extract patterns
        patterns = self.extract_structured_data(cleaned)
        
        if patterns:
            print(f"  Extracted patterns: {list(patterns.keys())}")
        
        print("✅ Post-processing complete")
        
        return {
            "original": text,
            "cleaned": cleaned,
            "corrected": cleaned,  # Return cleaned version with corrections
            "patterns": patterns,
            "language": language,
            "improvements": {
                "chars_removed": chars_removed,
                "corrections_made": corrections_made,
                "patterns_found": len(patterns),
                "formatting_preserved": True,
                "spell_check_applied": apply_spell_check and self.error_fixer is not None
            }
        }