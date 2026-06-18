"""utils/confidence.py - Confidence score calculator"""
from typing import List, Dict, Any

class ConfidenceCalculator:
    """Calculate confidence scores for OCR results"""
    
    @staticmethod
    def calculate_final_confidence(
        ocr_confidences: List[float],
        match_percentage: float,
        image_quality: float
    ) -> float:
        """
        Calculate final confidence score
        
        Formula:
        Final = (OCR_Avg * 0.5) + (Match% * 0.3) + (Quality * 0.2)
        """
        ocr_avg = sum(ocr_confidences) / len(ocr_confidences) if ocr_confidences else 0
        
        final = (ocr_avg * 0.5) + (match_percentage * 0.3) + (image_quality * 0.2)
        
        return round(final, 2)
    
    @staticmethod
    def calculate_agreement(results: List[Dict[str, Any]]) -> float:
        """Calculate agreement between multiple OCR results"""
        if len(results) <= 1:
            return 100.0
        
        from difflib import SequenceMatcher
        
        texts = [r["text"] for r in results]
        agreements = []
        
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                similarity = SequenceMatcher(None, texts[i], texts[j]).ratio()
                agreements.append(similarity * 100)
        
        return sum(agreements) / len(agreements) if agreements else 0
    
    @staticmethod
    def quality_tier(confidence: float) -> str:
        """Get quality tier based on confidence"""
        if confidence >= 95:
            return "excellent"
        elif confidence >= 85:
            return "good"
        elif confidence >= 70:
            return "fair"
        elif confidence >= 50:
            return "poor"
        else:
            return "very_poor"