"""services/bol_extractor.py - Bill of Lading Structured Extraction"""
import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class ShipperInfo:
    company: str = ""
    address: str = ""
    care_of: str = ""
    contact: str = ""


@dataclass
class ConsigneeInfo:
    company: str = ""
    address: str = ""
    contact: str = ""


@dataclass
class NotifyParty:
    company: str = ""
    address: str = ""
    contact: str = ""
    note: str = ""


@dataclass
class VesselInfo:
    vessel_name: str = ""
    voyage_number: str = ""
    port_of_loading: str = ""
    port_of_discharge: str = ""
    place_of_receipt: str = ""
    place_of_delivery: str = ""


@dataclass
class CargoInfo:
    container_number: str = ""
    seal_number: str = ""
    marks_numbers: str = ""
    description: str = ""
    gross_weight: str = ""
    measurement: str = ""
    number_of_packages: str = ""


@dataclass
class BillOfLading:
    # Document Header
    document_type: str = ""
    bol_number: str = ""
    carrier: str = ""
    booking_number: str = ""
    reference_number: str = ""
    date_of_issue: str = ""
    
    # Parties
    shipper: Optional[ShipperInfo] = None
    consignee: Optional[ConsigneeInfo] = None
    notify_party: Optional[NotifyParty] = None
    
    # Vessel & Route
    vessel: Optional[VesselInfo] = None
    
    # Cargo
    cargo: Optional[List[CargoInfo]] = None
    
    # Additional Info
    freight_terms: str = ""
    number_of_originals: str = ""
    place_of_issue: str = ""
    
    # Raw text
    raw_text: str = ""
    extraction_confidence: float = 0.0
    
    def __post_init__(self):
        if self.shipper is None:
            self.shipper = ShipperInfo()
        if self.consignee is None:
            self.consignee = ConsigneeInfo()
        if self.notify_party is None:
            self.notify_party = NotifyParty()
        if self.vessel is None:
            self.vessel = VesselInfo()
        if self.cargo is None:
            self.cargo = []


class BillOfLadingExtractor:
    """🔥 INTELLIGENT Bill of Lading Extraction with Structure Preservation"""
    
    def __init__(self):
        # Patterns for key sections
        self.section_patterns = {
            'shipper': r'(?:SHIPPER|SENDER|EXPORTER)[\s:]*\n',
            'consignee': r'(?:CONSIGNEE|RECEIVER|IMPORTER)[\s:]*\n',
            'notify': r'(?:NOTIFY PARTY|NOTIFY|ALSO NOTIFY)[\s:]*\n',
            'vessel': r'(?:VESSEL|SHIP NAME|VESSEL NAME)[\s:]*',
            'voyage': r'(?:VOYAGE|VOYAGE NO|VOYAGE NUMBER)[\s:]*',
            'bol_number': r'(?:B/L NO|BILL OF LADING NO|B\.L\. NUMBER|BILL NUMBER)[\s:]*',
            'booking': r'(?:BOOKING NO|BOOKING NUMBER|BOOKING REF)[\s:]*',
            'carrier': r'(?:CARRIER|SHIPPING LINE|OCEAN CARRIER)[\s:]*',
        }
        
        # Common carriers
        self.carriers = [
            'CMA CGM', 'MAERSK', 'MSC', 'COSCO', 'HAPAG-LLOYD',
            'EVERGREEN', 'ONE', 'YANG MING', 'ZIM', 'HMM'
        ]
    
    def extract_bol_number(self, text: str) -> str:
        """Extract B/L number"""
        patterns = [
            r'(?:B/L\s*(?:NO|NUMBER|#))[\s:]*([A-Z0-9]{8,})',
            r'(?:BILL\s*OF\s*LADING\s*(?:NO|NUMBER))[\s:]*([A-Z0-9]{8,})',
            r'\b([A-Z]{3}\d{7,})\b',  # Format: ABC1234567
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return ""
    
    def extract_voyage_number(self, text: str) -> str:
        """Extract voyage number"""
        patterns = [
            r'(?:VOYAGE|VOY)[\s:]*([A-Z0-9/]{5,})',
            r'\b(\d{4}[A-Z]\d{3}[A-Z]?/\d{3,}[A-Z]?)\b',  # Format: 0WWLLW1MA/632W
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return ""
    
    def extract_carrier(self, text: str) -> str:
        """Extract carrier name"""
        for carrier in self.carriers:
            if carrier in text.upper():
                return carrier
        
        # Try pattern matching
        match = re.search(r'(?:CARRIER|SHIPPING LINE)[\s:]*([A-Z\s&]+)', text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        return ""
    
    def extract_section(self, text: str, start_marker: str, end_markers: List[str]) -> str:
        """
        Extract text between start marker and first end marker found
        """
        text_upper = text.upper()
        start_marker_upper = start_marker.upper()
        
        # Find start position
        start_pos = text_upper.find(start_marker_upper)
        if start_pos == -1:
            return ""
        
        # Move past the marker
        start_pos += len(start_marker)
        
        # Find end position (first occurrence of any end marker)
        end_pos = len(text)
        for end_marker in end_markers:
            end_marker_upper = end_marker.upper()
            pos = text_upper.find(end_marker_upper, start_pos)
            if pos != -1 and pos < end_pos:
                end_pos = pos
        
        # Extract and clean
        section_text = text[start_pos:end_pos].strip()
        
        # Clean up section text
        lines = [line.strip() for line in section_text.split('\n') if line.strip()]
        return '\n'.join(lines)
    
    def parse_company_block(self, text: str) -> Dict[str, str]:
        """
        Parse a company information block
        Returns: {company, address, contact, care_of}
        """
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        if not lines:
            return {'company': '', 'address': '', 'contact': '', 'care_of': ''}
        
        result = {
            'company': '',
            'address': '',
            'contact': '',
            'care_of': ''
        }
        
        # First line is usually company name
        result['company'] = lines[0]
        
        # Look for "C/O" or "CARE OF"
        care_of_lines = []
        address_lines = []
        contact_lines = []
        
        for i, line in enumerate(lines[1:], 1):
            line_upper = line.upper()
            
            if 'C/O' in line_upper or 'CARE OF' in line_upper or 'A/C' in line_upper:
                care_of_lines.append(line)
            elif any(keyword in line_upper for keyword in ['TEL:', 'PHONE:', 'EMAIL:', 'FAX:', 'CONTACT:']):
                contact_lines.append(line)
            else:
                address_lines.append(line)
        
        result['address'] = ' '.join(address_lines)
        result['care_of'] = ' '.join(care_of_lines)
        result['contact'] = ' '.join(contact_lines)
        
        return result
    
    def extract_shipper(self, text: str) -> ShipperInfo:
        """Extract shipper information"""
        section = self.extract_section(
            text,
            'SHIPPER',
            ['CONSIGNEE', 'NOTIFY', 'VESSEL', 'PORT OF']
        )
        
        if not section:
            return ShipperInfo()
        
        parsed = self.parse_company_block(section)
        return ShipperInfo(
            company=parsed['company'],
            address=parsed['address'],
            care_of=parsed['care_of'],
            contact=parsed['contact']
        )
    
    def extract_consignee(self, text: str) -> ConsigneeInfo:
        """Extract consignee information"""
        section = self.extract_section(
            text,
            'CONSIGNEE',
            ['NOTIFY', 'VESSEL', 'PORT OF', 'ALSO NOTIFY']
        )
        
        if not section:
            return ConsigneeInfo()
        
        parsed = self.parse_company_block(section)
        return ConsigneeInfo(
            company=parsed['company'],
            address=parsed['address'],
            contact=parsed['contact']
        )
    
    def extract_notify_party(self, text: str) -> NotifyParty:
        """Extract notify party information"""
        section = self.extract_section(
            text,
            'NOTIFY',
            ['VESSEL', 'PORT OF', 'CONTAINER', 'CARGO', 'MARKS']
        )
        
        if not section:
            return NotifyParty()
        
        # Check for "not responsible" note
        note = ""
        if 'NOT' in section.upper() and 'RESPONSIBLE' in section.upper():
            note_match = re.search(r'(.*?(?:NOT|not).*?(?:RESPONSIBLE|responsible).*?)(?:\n|$)', section)
            if note_match:
                note = note_match.group(1).strip()
                section = section.replace(note, '').strip()
        
        parsed = self.parse_company_block(section)
        return NotifyParty(
            company=parsed['company'],
            address=parsed['address'],
            contact=parsed['contact'],
            note=note
        )
    
    def extract_vessel_info(self, text: str) -> VesselInfo:
        """Extract vessel and route information"""
        vessel = VesselInfo()
        
        # Voyage number
        vessel.voyage_number = self.extract_voyage_number(text)
        
        # Vessel name
        vessel_match = re.search(r'(?:VESSEL|SHIP NAME)[\s:]*([A-Z\s]+)', text, re.IGNORECASE)
        if vessel_match:
            vessel.vessel_name = vessel_match.group(1).strip()
        
        # Ports
        pol_match = re.search(r'(?:PORT OF LOADING|POL)[\s:]*([A-Z\s,]+)', text, re.IGNORECASE)
        if pol_match:
            vessel.port_of_loading = pol_match.group(1).strip()
        
        pod_match = re.search(r'(?:PORT OF DISCHARGE|POD)[\s:]*([A-Z\s,]+)', text, re.IGNORECASE)
        if pod_match:
            vessel.port_of_discharge = pod_match.group(1).strip()
        
        return vessel
    
    def calculate_confidence(self, bol: BillOfLading) -> float:
        """Calculate extraction confidence score"""
        score = 0.0
        total_fields = 0
        
        # Critical fields (25 points each)
        assert bol.shipper is not None
        assert bol.consignee is not None
        assert bol.notify_party is not None
        assert bol.vessel is not None
        critical_fields = [
            bol.bol_number,
            bol.shipper.company,
            bol.consignee.company,
        ]
        
        for field in critical_fields:
            total_fields += 25
            if field:
                score += 25
        
        # Important fields (10 points each)
        important_fields = [
            bol.carrier,
            bol.vessel.voyage_number,
            bol.shipper.address,
            bol.consignee.address,
            bol.notify_party.company,
        ]
        
        for field in important_fields:
            total_fields += 10
            if field:
                score += 10
        
        return (score / total_fields * 100) if total_fields > 0 else 0.0
    
    def extract(self, ocr_text: str) -> Dict[str, Any]:
        """
        🔥 MAIN EXTRACTION METHOD
        Returns structured Bill of Lading data
        """
        print("\n🚢 Starting Bill of Lading extraction...")
        
        bol = BillOfLading()
        bol.raw_text = ocr_text
        
        # Document Type
        if 'ORIGINAL' in ocr_text.upper():
            bol.document_type = 'ORIGINAL BILL OF LADING'
        elif 'COPY' in ocr_text.upper():
            bol.document_type = 'COPY BILL OF LADING'
        else:
            bol.document_type = 'BILL OF LADING'
        
        # Extract key fields
        bol.bol_number = self.extract_bol_number(ocr_text)
        bol.carrier = self.extract_carrier(ocr_text)
        
        # Extract parties
        bol.shipper = self.extract_shipper(ocr_text)
        bol.consignee = self.extract_consignee(ocr_text)
        bol.notify_party = self.extract_notify_party(ocr_text)
        
        # Extract vessel info
        bol.vessel = self.extract_vessel_info(ocr_text)
        
        # Calculate confidence
        bol.extraction_confidence = self.calculate_confidence(bol)
        
        # Convert to dict
        result = asdict(bol)
        
        print(f"✅ Extraction complete - Confidence: {bol.extraction_confidence:.1f}%")
        
        return result
    
    def format_output(self, bol_data: Dict[str, Any]) -> str:
        """
        🔥 FORMAT OUTPUT - Exactly as requested
        """
        output = []
        
        output.append("📄 COMPLETE BILL OF LADING EXTRACTION")
        output.append("")
        
        # DOCUMENT HEADER
        output.append("DOCUMENT HEADER")
        output.append(f"* Document Type: {bol_data['document_type']}")
        if bol_data['vessel']['voyage_number']:
            output.append(f"* Voyage Number: {bol_data['vessel']['voyage_number']}")
        if bol_data['bol_number']:
            output.append(f"* Bill of Lading Number: {bol_data['bol_number']}")
        if bol_data['carrier']:
            output.append(f"* Carrier: {bol_data['carrier']}")
        output.append("")
        
        # SHIPPER
        shipper = bol_data['shipper']
        if shipper['company']:
            output.append("SHIPPER INFORMATION")
            output.append(f"Company: {shipper['company']}")
            if shipper['address']:
                output.append(f"Address: {shipper['address']}")
            if shipper['care_of']:
                output.append(f"Care of: {shipper['care_of']}")
            if shipper['contact']:
                output.append(f"Contact: {shipper['contact']}")
            output.append("")
        
        # CONSIGNEE
        consignee = bol_data['consignee']
        if consignee['company']:
            output.append("CONSIGNEE INFORMATION")
            output.append(f"Company: {consignee['company']}")
            if consignee['address']:
                output.append(f"Address: {consignee['address']}")
            if consignee['contact']:
                output.append(f"Contact: {consignee['contact']}")
            output.append("")
        
        # NOTIFY PARTY
        notify = bol_data['notify_party']
        if notify['company'] or notify['note']:
            output.append("NOTIFY PARTY")
            if notify['note']:
                output.append(f"Note: {notify['note']}")
            if notify['company']:
                output.append(f"Company: {notify['company']}")
            if notify['address']:
                output.append(f"Address: {notify['address']}")
            if notify['contact']:
                output.append(f"Contact: {notify['contact']}")
            output.append("")
        
        # VESSEL & ROUTE
        vessel = bol_data['vessel']
        if any([vessel['vessel_name'], vessel['port_of_loading'], vessel['port_of_discharge']]):
            output.append("VESSEL & ROUTE")
            if vessel['vessel_name']:
                output.append(f"* Vessel: {vessel['vessel_name']}")
            if vessel['port_of_loading']:
                output.append(f"* Port of Loading: {vessel['port_of_loading']}")
            if vessel['port_of_discharge']:
                output.append(f"* Port of Discharge: {vessel['port_of_discharge']}")
            output.append("")
        
        output.append(f"Extraction Confidence: {bol_data['extraction_confidence']:.1f}%")
        
        return '\n'.join(output)


# usage
if __name__ == "__main__":
    extractor = BillOfLadingExtractor()