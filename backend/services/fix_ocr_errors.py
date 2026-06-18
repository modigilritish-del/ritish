"""services/fix_ocr_errors.py - Conservative OCR Error Correction"""
import re
from typing import Dict, List

class OCRErrorFixer:
    """🔥 Fix ONLY obvious OCR errors - Conservative approach"""
    
    @staticmethod
    def is_likely_ocr_text(text: str) -> bool:
        """
        Check if text looks like it came from OCR (has common OCR mistakes)
        Returns False for clean code/filenames
        """
        if not text or len(text) < 20:
            return False
        
        # Check for common OCR error indicators
        ocr_indicators = 0
        
        # Check for obvious OCR mistakes
        if re.search(r'\b[A-Z0-9]+@[A-Z0-9]+\b', text):  # Broken emails
            ocr_indicators += 1
        if re.search(r'\b0[A-Z]+\b', text):  # Words starting with 0 (0RIGINAL)
            ocr_indicators += 1
        if re.search(r'\b[A-Z]+\|[A-Z]+\b', text):  # Pipe in words (SH|PPER)
            ocr_indicators += 1
        if re.search(r'[A-Z]{2,}0[A-Z]{2,}', text):  # 0 in middle of caps (PR0FORMA)
            ocr_indicators += 1
        if text.count('|') > 2:  # Multiple pipes
            ocr_indicators += 1
        
        # If we see multiple indicators, it's likely OCR text
        return ocr_indicators >= 2
    
    @staticmethod
    def fix_character_confusion_conservative(text: str) -> str:
        """
        Fix ONLY obvious character confusions
        - Only fix when surrounded by capital letters
        - Preserve numbers in actual numbers
        """
        fixed = text
        
        # Fix 0 → O ONLY when between capital letters
        # C0M → COM, but preserve 2025, 1689, etc.
        fixed = re.sub(r'(?<=[A-Z])0(?=[A-Z])', 'O', fixed)
        
        # Fix | → I ONLY when between letters
        # SH|PPER → SHIPPER, but preserve | in filenames
        fixed = re.sub(r'(?<=[A-Z])\|(?=[A-Z])', 'I', fixed)
        
        # Fix 1 → I ONLY in specific cases (less aggressive)
        # FRE1GHT → FREIGHT, but preserve file123.py
        fixed = re.sub(r'(?<=[A-Z]{2})1(?=[A-Z]{2})', 'I', fixed)
        
        return fixed
    
    @staticmethod
    def fix_bol_keywords_only(text: str) -> str:
        """
        Fix ONLY complete BOL-specific keywords when they appear as standalone words
        Uses word boundaries to avoid breaking filenames
        """
        fixes = {
            # Document type - only fix complete words
            r'\b@RIGINAL\b': 'ORIGINAL',
            r'\b0RIGINAL\b': 'ORIGINAL',
            
            # Headers - only fix complete words with errors
            r'\bSH\|PPER\b': 'SHIPPER',
            r'\bC0NSIGNEE\b': 'CONSIGNEE',
            r'\bN0TIFY\b': 'NOTIFY',
            
            # Common BOL phrases - only full phrases
            r'\bBILL\s+0F\s+LADING\b': 'BILL OF LADING',
            r'\bFRE\|GHT\b': 'FREIGHT',
            r'\bPREPA\|D\b': 'PREPAID',
            r'\bCARR\|ER\b': 'CARRIER',
            
            # Email fixes - only when obvious
            r'\bEMA\|L\b': 'EMAIL',
            
            # Company suffixes - only complete
            r'\bC0\.\s*LTD\b': 'CO., LTD.',
            r'\bL\|D\b': 'LTD',
        }
        
        fixed = text
        for pattern, replacement in fixes.items():
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)
        
        return fixed
    
    @staticmethod
    def fix_spacing_issues(text: str) -> str:
        """Fix spacing around punctuation - safe for all text"""
        fixed = text
        
        # Fix spacing around colons (but not in URLs or paths)
        if not re.search(r'[A-Za-z]:[/\\]', fixed):  # Not a file path
            fixed = re.sub(r'\s*:\s*', ': ', fixed)
        
        # Fix spacing around commas
        fixed = re.sub(r'\s*,\s*', ', ', fixed)
        
        # Fix broken email addresses (space before @)
        fixed = re.sub(r'([A-Z0-9]+)\s+@\s*([A-Z0-9]+)', r'\1@\2', fixed)
        
        # Remove excessive spaces (but not all indentation)
        fixed = re.sub(r'  +', ' ', fixed)
        
        return fixed
    
    @staticmethod
    def fix_common_errors(text: str) -> str:
        """
        🔥 MAIN ENTRY POINT - Conservative error correction
        
        Only fixes text if it looks like OCR output
        Preserves clean code, filenames, and structured data
        """
        if not text or len(text) < 10:
            return text
        
        # Check if this looks like OCR text (has common mistakes)
        if not OCRErrorFixer.is_likely_ocr_text(text):
            print("  ℹ️  Text appears clean - skipping OCR correction")
            return text
        
        print("\n🔧 Starting conservative OCR error correction...")
        
        # Step 1: Fix character confusions (conservative)
        fixed = OCRErrorFixer.fix_character_confusion_conservative(text)
        
        # Step 2: Fix BOL keywords only (word boundaries)
        fixed = OCRErrorFixer.fix_bol_keywords_only(fixed)
        
        # Step 3: Fix spacing issues (safe)
        fixed = OCRErrorFixer.fix_spacing_issues(fixed)
        
        # Calculate how much changed
        changes = sum(1 for a, b in zip(text, fixed) if a != b)
        
        if changes > 0:
            print(f"  ✅ Fixed {changes} characters")
        else:
            print(f"  ℹ️  No corrections needed")
        
        return fixed


class BOLSpecificFixer:
    """
    🚢 Use this ONLY for confirmed BOL documents
    More aggressive fixes that are safe for shipping documents
    """
    
    @staticmethod
    def fix_bol_document(text: str) -> str:
        """
        Aggressive fixes for confirmed BOL documents
        Use ONLY when you know it's a Bill of Lading
        """
        print("\n🚢 Applying BOL-specific corrections...")
        
        fixed = text
        
        # More aggressive character fixes for BOL
        fixed = re.sub(r'(?<=[A-Z])0(?=[A-Z])', 'O', fixed)
        fixed = re.sub(r'\b0(?=[A-Z]{3})', 'O', fixed)  # 0RIGINAL
        fixed = re.sub(r'(?<=[A-Z])\|(?=[A-Z])', 'I', fixed)
        
        # BOL-specific patterns
        bol_patterns = {
            r'@RIGINAL': 'ORIGINAL',
            r'BILL\s*OF\s*L\|DING': 'BILL OF LADING',
            r'BILL\s*0F\s*LADING': 'BILL OF LADING',
            r'BILLOF\s*LADING': 'BILL OF LADING',
            r'SH\|PPER': 'SHIPPER',
            r'SHIPER': 'SHIPPER',
            r'C0NSIGNEE': 'CONSIGNEE',
            r'CONSIGNE(?!\w)': 'CONSIGNEE',
            r'N0TIFY': 'NOTIFY',
            r'FRE\|GHT': 'FREIGHT',
            r'PREPA\|D': 'PREPAID',
            r'CARR\|ER': 'CARRIER',
            r'EMA\|L': 'EMAIL',
            r'C0\.\s*LTD': 'CO., LTD.',
            r'C0\s*LTD': 'CO., LTD.',
            r'L\|D': 'LTD',
            r'CH\|NA': 'CHINA',
            r'N\|GERIA': 'NIGERIA',
            r'INV0ICE': 'INVOICE',
            r'PR0P0RMA': 'PROFORMA',
            r'F0RM': 'FORM',
            r'N0\.': 'NO.',
        }
        
        for pattern, replacement in bol_patterns.items():
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)
        
        # Fix common words
        word_fixes = {
            r'\bC0M\b': 'COM',
            r'\b0N\b': 'ON',
            r'\bN0\b': 'NO',
            r'\b0F\b': 'OF',
            r'\bF0R\b': 'FOR',
            r'\bT0\b': 'TO',
        }
        
        for pattern, replacement in word_fixes.items():
            fixed = re.sub(pattern, replacement, fixed, flags=re.IGNORECASE)
        
        # Fix spacing
        fixed = re.sub(r'\s*:\s*', ': ', fixed)
        fixed = re.sub(r'\s*,\s*', ', ', fixed)
        fixed = re.sub(r'([A-Z0-9]+)\s*@\s*([A-Z0-9]+)', r'\1@\2', fixed)
        fixed = re.sub(r'  +', ' ', fixed)
        
        print(f"  ✅ BOL corrections applied")
        
        return fixed


# Standalone test
if __name__ == "__main__":
    # Test 1: Clean code (should NOT be modified)
    clean_code = """
    backend/services/
    ├── fix_ocr_errors.py
    ├── preprocessing.py
    └── bol_extractor.py
    """
    
    print("=" * 60)
    print("TEST 1: Clean Code (should be preserved)")
    print("=" * 60)
    fixer = OCRErrorFixer()
    result1 = fixer.fix_common_errors(clean_code)
    print(f"Changed: {clean_code != result1}")
    print()
    
    # Test 2: OCR text with errors (should be fixed)
    ocr_text = """
@RIGINAL
SODIUM CYANIDE F0R MINING USE
UN:1689 CLASS:6.1
AS PER PR0P0RMA INV0ICE NUMBER
STXP1250243
F0RM M N0. MF20250063099
FRE|GHT PREPA|D
+*234 903 113 7263
EMA|L: SH|PP|NG@ C0M
    """
    
    print("=" * 60)
    print("TEST 2: OCR Text (should be fixed)")
    print("=" * 60)
    print("BEFORE:")
    print(ocr_text)
    result2 = fixer.fix_common_errors(ocr_text)
    print("\nAFTER:")
    print(result2)
    print()
    
    # Test 3: BOL-specific aggressive fixing
    bol_text = """
@RIGINAL BILL 0F LADING
SH|PPER: HEBEI C0., LTD.
C0NSIGNEE: FIRST PATRI0T L|D
N0TIFY PARTY: SAME AS C0NSIGNEE
FRE|GHT: PREPA|D
CARR|ER N0T RESP0NSIBLE
    """
    
    print("=" * 60)
    print("TEST 3: BOL Document (aggressive fixing)")
    print("=" * 60)
    print("BEFORE:")
    print(bol_text)
    bol_fixer = BOLSpecificFixer()
    result3 = bol_fixer.fix_bol_document(bol_text)
    print("\nAFTER:")
    print(result3)