"""
backend/uomSystem/precision_helper.py
Precision Helper - Auto-calculate optimal precision like SAP/Odoo
"""
from decimal import Decimal
from typing import Dict, Optional, Tuple


class PrecisionHelper:
    """
    Calculate optimal precision based on conversion factor
    SAP/Odoo-style dynamic precision calculation
    """
    
    # Category-based default precisions
    CATEGORY_DEFAULTS = {
        'WEIGHT': Decimal('0.001'),      # 1 gram precision
        'VOLUME': Decimal('0.001'),      # 1 ml precision
        'LENGTH': Decimal('0.001'),      # 1 mm precision
        'AREA': Decimal('0.01'),         # 0.01 sqm precision
        'QUANTITY': Decimal('1'),        # Whole numbers
        'TIME': Decimal('1'),            # Whole seconds
        'TEMPERATURE': Decimal('0.1'),   # 0.1 degree
        'PACKAGING': Decimal('1'),       # Whole items
        'ENERGY': Decimal('0.001'),      # 0.001 joule
        'PRESSURE': Decimal('0.01'),     # 0.01 pascal
        'SPEED': Decimal('0.01'),        # 0.01 m/s
    }
    
    @staticmethod
    def calculate_optimal_precision(
        conversion_factor: Decimal,
        category_code: Optional[str] = None
    ) -> Decimal:
        """
        Calculate optimal precision based on conversion factor
        
        Algorithm (SAP/Odoo style):
        1. Start with category default
        2. If factor < 0.001, use smaller precision (e.g., 0.000001)
        3. If factor > 1000, use larger precision (e.g., 0.1 or 1)
        4. For very large factors (>100000), use whole numbers
        """
        
        # Get category default
        base_precision = (
            PrecisionHelper.CATEGORY_DEFAULTS.get(category_code, Decimal('0.0001'))
            if category_code is not None
            else Decimal('0.0001')
        )
        
        factor = abs(conversion_factor)
        
        # Very small factors (like milligram to kilogram)
        if factor < Decimal('0.00001'):
            return Decimal('0.000001')  # Microgram level
        elif factor < Decimal('0.001'):
            return Decimal('0.0001')    # Sub-gram level
        
        # Medium factors (most common cases)
        elif factor < Decimal('1'):
            return base_precision       # Use category default
        
        # Large factors (like ton, kilometer)
        elif factor < Decimal('100'):
            return base_precision
        elif factor < Decimal('1000'):
            return Decimal('0.01')      # 10 gram / 1 cm precision
        elif factor < Decimal('10000'):
            return Decimal('0.1')       # 100 gram / 10 cm precision
        
        # Very large factors (like container quantities)
        else:
            return Decimal('1')         # Whole unit precision
    
    @staticmethod
    def get_precision_meaning(
        precision: Decimal,
        category_code: str
    ) -> str:
        """
        Get human-readable meaning of precision
        
        Returns string like "1 gram", "0.1 mm", "10 ml"
        """
        meanings = {
            'WEIGHT': {
                Decimal('0.000001'): '1 microgram',
                Decimal('0.0001'): '0.1 gram',
                Decimal('0.001'): '1 gram',
                Decimal('0.01'): '10 grams',
                Decimal('0.1'): '100 grams',
                Decimal('1'): '1 kilogram'
            },
            'LENGTH': {
                Decimal('0.0001'): '0.1 millimeter',
                Decimal('0.001'): '1 millimeter',
                Decimal('0.01'): '1 centimeter',
                Decimal('0.1'): '10 centimeters',
                Decimal('1'): '1 meter'
            },
            'VOLUME': {
                Decimal('0.0001'): '0.1 milliliter',
                Decimal('0.001'): '1 milliliter',
                Decimal('0.01'): '10 milliliters',
                Decimal('0.1'): '100 milliliters',
                Decimal('1'): '1 liter'
            },
            'AREA': {
                Decimal('0.01'): '0.01 square meter',
                Decimal('0.1'): '0.1 square meter',
                Decimal('1'): '1 square meter',
                Decimal('10'): '10 square meters'
            },
            'QUANTITY': {
                Decimal('1'): '1 piece'
            },
            'TIME': {
                Decimal('0.001'): '1 millisecond',
                Decimal('1'): '1 second',
                Decimal('60'): '1 minute'
            }
        }
        
        category_meanings = meanings.get(category_code, {})
        return category_meanings.get(precision, f"{precision} base units")
    
    @staticmethod
    def suggest_precision_options(
        conversion_factor: Decimal,
        category_code: str
    ) -> list[Dict]:
        """
        Suggest multiple precision options for user to choose
        Returns list of {"value": Decimal, "label": str, "meaning": str}
        """
        optimal = PrecisionHelper.calculate_optimal_precision(
            conversion_factor, 
            category_code
        )
        
        # Generate options around optimal
        if optimal >= Decimal('1'):
            options = [
                Decimal('0.1'),
                Decimal('1'),
                Decimal('10')
            ]
        elif optimal >= Decimal('0.01'):
            options = [
                Decimal('0.001'),
                Decimal('0.01'),
                Decimal('0.1')
            ]
        else:
            options = [
                Decimal('0.000001'),
                Decimal('0.0001'),
                Decimal('0.001')
            ]
        
        result = []
        for opt in options:
            meaning = PrecisionHelper.get_precision_meaning(opt, category_code)
            is_optimal = opt == optimal
            
            result.append({
                "value": float(opt),
                "label": f"{opt}" + (" (Recommended)" if is_optimal else ""),
                "meaning": meaning,
                "is_optimal": is_optimal
            })
        
        return result
    
    @staticmethod
    def validate_precision(
        precision: Decimal,
        conversion_factor: Decimal
    ) -> Tuple[bool, str]:
        """
        Validate if precision makes sense for given conversion factor
        
        Returns (is_valid, error_message)
        """
        if precision <= 0:
            return False, "Precision must be greater than 0"
        
        if precision > abs(conversion_factor):
            return False, f"Precision ({precision}) cannot be larger than conversion factor ({conversion_factor})"
        
        # Check if precision is too fine for factor
        if abs(conversion_factor) > 1000 and precision < Decimal('0.01'):
            return False, "Precision too fine for large conversion factor. Use at least 0.01"
        
        return True, ""


def get_precision_suggestions(
    conversion_factor: float,
    category_code: str
) -> dict:
    """
    API endpoint helper - get precision suggestions
    """
    factor = Decimal(str(conversion_factor))
    
    optimal = PrecisionHelper.calculate_optimal_precision(factor, category_code)
    options = PrecisionHelper.suggest_precision_options(factor, category_code)
    meaning = PrecisionHelper.get_precision_meaning(optimal, category_code)
    
    return {
        "optimal_precision": float(optimal),
        "physical_meaning": meaning,
        "options": options,
        "category": category_code
    }