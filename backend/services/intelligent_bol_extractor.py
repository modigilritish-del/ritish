"""services/intelligent_bol_extractor.py - Smart BOL Extraction"""
import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict

@dataclass
class BOLData:
    """Bill of Lading structured data"""
    document_type: str = ""
    bol_number: str = ""
    booking_number: str = ""
    carrier: str = ""
    vessel_name: str = ""
    voyage_number: str = ""
    
    shipper_name: str = ""
    shipper_address: str = ""
    
    consignee_name: str = ""
    consignee_address: str = ""
    
    notify_party: str = ""
    
    port_of_loading: str = ""
    port_of_discharge: str = ""
    
    container_numbers: Optional[List[str]] = None
    seal_numbers: Optional[List[str]] = None
    
    goods_description: str = ""
    
    date_of_issue: str = ""
    place_of_issue: str = ""
    
    raw_text: str = ""
    confidence: float = 0.0
    
    def __post_init__(self):
        if self.container_numbers is None:
            self.container_numbers = []
        if self.seal_numbers is None:
            self.seal_numbers = []


class IntelligentBOLExtractor:
    """🔥 Advanced BOL extraction with pattern recognition"""
    
    # Common OCR errors in BOL documents
    OCR_FIXES = {
        r'HEBEI.*?CHENGXIN.*?CO': 'HEBEI CHENGXIN CO., LTD.',
        r'CMA\s*CGM|EMACGM|CMAGGM': 'CMA CGM',
        r'QINGDAO|QINGDA0': 'QINGDAO',
        r'MAERSK|MAERSKENSEN': 'MAERSK',
        r'@RIGINAL': 'ORIGINAL',
        r'BILLOF.*?LADING': 'BILL OF LADING',
        r'CONSIGNEE|CONSIGNE': 'CONSIGNEE',
        r'SHIPPER|SHIPER': 'SHIPPER',
        r'NOTIFY.*?PARTY': 'NOTIFY PARTY',
    }
    
    # Known carriers
    CARRIERS = [
        'CMA CGM', 'MAERSK', 'MSC', 'COSCO', 'HAPAG-LLOYD',
        'EVERGREEN', 'ONE', 'YANG MING', 'ZIM', 'HMM'
    ]
    
    def clean_ocr_text(self, text: str) -> str:
        """Clean common OCR errors"""
        cleaned = text
        
        for pattern, replacement in self.OCR_FIXES.items():
            cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
        
        # Remove excessive whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        # Remove obvious garbage (too many special chars)
        lines = []
        for line in cleaned.split('\n'):
            special_count = sum(c in '!@#$%^&*()_+={}[]|\\:;"<>?/~`' for c in line)
            letter_count = sum(c.isalpha() for c in line)
            
            if letter_count > 0 and special_count < len(line) * 0.4:
                lines.append(line.strip())
        
        return '\n'.join(lines)
    
    def extract_between(self, text: str, start: str, end_markers: List[str]) -> str:
        """Extract text between markers"""
        text_upper = text.upper()
        start_upper = start.upper()
        
        start_pos = text_upper.find(start_upper)
        if start_pos == -1:
            return ""
        
        start_pos += len(start)
        
        end_pos = len(text)
        for marker in end_markers:
            pos = text_upper.find(marker.upper(), start_pos)
            if pos != -1 and pos < end_pos:
                end_pos = pos
        
        return text[start_pos:end_pos].strip()
    
    def extract_bol_number(self, text: str) -> str:
        """Extract B/L number"""
        patterns = [
            r'B/L\s*(?:NO|NUMBER|#)[\s:]*([A-Z0-9]{8,})',
            r'BILL\s*OF\s*LADING\s*(?:NO|NUMBER)[\s:]*([A-Z0-9]{8,})',
            r'\b([A-Z]{3}\d{7,})\b',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return ""
    
    def extract_carrier(self, text: str) -> str:
        """Extract carrier name"""
        for carrier in self.CARRIERS:
            if carrier in text.upper():
                return carrier
        return ""
    
    def extract_dates(self, text: str) -> List[str]:
        """Extract dates"""
        patterns = [
            r'\d{2}[-/]\d{2}[-/]\d{4}',
            r'\d{4}[-/]\d{2}[-/]\d{2}',
            r'\d{2}\s+[A-Z]{3}\s+\d{4}',
        ]
        
        dates = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            dates.extend(matches)
        
        return list(set(dates))
    
    def extract_container_numbers(self, text: str) -> List[str]:
        """Extract container numbers (standard format: 4 letters + 7 digits)"""
        pattern = r'\b([A-Z]{4}\d{7})\b'
        return list(set(re.findall(pattern, text)))
    
    def calculate_confidence(self, bol: BOLData) -> float:
        """Calculate extraction confidence"""
        score = 0
        total = 0
        
        # Critical fields (30 points each)
        critical = [
            (bol.bol_number, 30),
            (bol.shipper_name, 30),
            (bol.consignee_name, 30),
        ]
        
        for field, points in critical:
            total += points
            if field and len(field) > 3:
                score += points
        
        # Important fields (10 points each)
        important = [
            bol.carrier,
            bol.port_of_loading,
            bol.port_of_discharge,
            bol.date_of_issue,
        ]
        
        for field in important:
            total += 10
            if field and len(field) > 2:
                score += 10
        
        return (score / total * 100) if total > 0 else 0.0
    
    def extract(self, ocr_text: str) -> Dict[str, Any]:
        """🔥 Main extraction method"""
        print("\n🚢 Extracting Bill of Lading...")
        
        # Clean text first
        cleaned_text = self.clean_ocr_text(ocr_text)
        
        bol = BOLData()
        bol.raw_text = cleaned_text
        
        # Document type
        if 'ORIGINAL' in cleaned_text.upper():
            bol.document_type = 'ORIGINAL BILL OF LADING'
        else:
            bol.document_type = 'BILL OF LADING'
        
        # Extract fields
        bol.bol_number = self.extract_bol_number(cleaned_text)
        bol.carrier = self.extract_carrier(cleaned_text)
        bol.container_numbers = self.extract_container_numbers(cleaned_text)
        
        # Extract dates
        dates = self.extract_dates(cleaned_text)
        if dates:
            bol.date_of_issue = dates[0]
        
        # Extract shipper
        shipper_section = self.extract_between(
            cleaned_text,
            'SHIPPER',
            ['CONSIGNEE', 'NOTIFY', 'VESSEL']
        )
        if shipper_section:
            lines = [l.strip() for l in shipper_section.split('\n') if l.strip()]
            if lines:
                bol.shipper_name = lines[0]
                bol.shipper_address = ' '.join(lines[1:]) if len(lines) > 1 else ""
        
        # Extract consignee
        consignee_section = self.extract_between(
            cleaned_text,
            'CONSIGNEE',
            ['NOTIFY', 'VESSEL', 'PORT OF']
        )
        if consignee_section:
            lines = [l.strip() for l in consignee_section.split('\n') if l.strip()]
            if lines:
                bol.consignee_name = lines[0]
                bol.consignee_address = ' '.join(lines[1:]) if len(lines) > 1 else ""
        
        # Calculate confidence
        bol.confidence = self.calculate_confidence(bol)
        
        print(f"✅ BOL extracted with {bol.confidence:.1f}% confidence")
        
        return asdict(bol)
    
    def format_output(self, bol_data: Dict[str, Any]) -> str:
        """Format BOL data for display"""
        lines = []
        
        lines.append("="*80)
        lines.append("📄 BILL OF LADING - EXTRACTED INFORMATION")
        lines.append("="*80)
        
        if bol_data.get('document_type'):
            lines.append("\nDOCUMENT INFORMATION")
            lines.append("-"*80)
            lines.append(f"Type: {bol_data['document_type']}")
            if bol_data.get('bol_number'):
                lines.append(f"B/L Number: {bol_data['bol_number']}")
            if bol_data.get('carrier'):
                lines.append(f"Carrier: {bol_data['carrier']}")
            if bol_data.get('date_of_issue'):
                lines.append(f"Date of Issue: {bol_data['date_of_issue']}")
        
        if bol_data.get('shipper_name'):
            lines.append("\nSHIPPER")
            lines.append("-"*80)
            lines.append(f"Company: {bol_data['shipper_name']}")
            if bol_data.get('shipper_address'):
                lines.append(f"Address: {bol_data['shipper_address']}")
        
        if bol_data.get('consignee_name'):
            lines.append("\nCONSIGNEE")
            lines.append("-"*80)
            lines.append(f"Company: {bol_data['consignee_name']}")
            if bol_data.get('consignee_address'):
                lines.append(f"Address: {bol_data['consignee_address']}")
        
        if bol_data.get('port_of_loading') or bol_data.get('port_of_discharge'):
            lines.append("\nROUTE")
            lines.append("-"*80)
            if bol_data.get('port_of_loading'):
                lines.append(f"Port of Loading: {bol_data['port_of_loading']}")
            if bol_data.get('port_of_discharge'):
                lines.append(f"Port of Discharge: {bol_data['port_of_discharge']}")
        
        if bol_data.get('container_numbers'):
            lines.append("\nCONTAINERS")
            lines.append("-"*80)
            for container in bol_data['container_numbers']:
                lines.append(f"• {container}")
        
        lines.append("")
        lines.append("="*80)
        lines.append(f"Extraction Confidence: {bol_data.get('confidence', 0):.1f}%")
        lines.append("="*80)
        
        return '\n'.join(lines)