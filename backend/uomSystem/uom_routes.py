"""
backend/uomSystem/uom_routers.py
UOM Routes - FastAPI Endpoints
Complete REST API for UOM system
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Any, Optional, List
from uuid import UUID
from .precision_helper import get_precision_suggestions
from database import get_db
from .uom_service import UOMService
from .uom_schemas import (
    # Category schemas
    UOMCategoryCreate,
    UOMCategoryUpdate,
    UOMCategoryResponse,
    UOMCategoryListResponse,
    # UOM schemas
    UOMCreate,
    UOMUpdate,
    UOMResponse,
    UOMListResponse,
    UOMWithCategory,
    # Conversion schemas
    UOMConvertRequest,
    UOMConvertResponse
)

router = APIRouter(prefix="/uom", tags=["📏 UOM System"])


# ==================== UOM Category Endpoints ====================

@router.post(
    "/categories",
    response_model=UOMCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create UOM Category",
    description="Create a new UOM category (e.g., WEIGHT, LENGTH, VOLUME)"
)
def create_category(
    data: UOMCategoryCreate,
    db: Session = Depends(get_db)
):
    """
    Create new UOM category
    
    **Example:**
    ```json
    {
        "code": "WEIGHT",
        "name": "Weight",
        "description": "Weight measurement units",
        "is_active": true
    }
    ```
    """
    return UOMService.create_category(db, data)


@router.get(
    "/categories",
    response_model=UOMCategoryListResponse,
    summary="Get All Categories",
    description="Get all UOM categories with optional filters"
)
def get_categories(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Skip records"),
    limit: int = Query(100, ge=1, le=500, description="Limit records"),
    db: Session = Depends(get_db)
):
    """Get all UOM categories"""
    categories, total = UOMService.get_categories(db, is_active, skip, limit)
    return UOMCategoryListResponse(total=total, items=categories)  # type: ignore[arg-type]


@router.get(
    "/categories/{category_id}",
    response_model=UOMCategoryResponse,
    summary="Get Category by ID",
    description="Get specific UOM category details"
)
def get_category(
    category_id: UUID,
    db: Session = Depends(get_db)
):
    """Get category by ID"""
    return UOMService.get_category(db, category_id)


@router.get(
    "/categories/code/{code}",
    response_model=UOMCategoryResponse,
    summary="Get Category by Code",
    description="Get UOM category by code (e.g., WEIGHT)"
)
def get_category_by_code(
    code: str,
    db: Session = Depends(get_db)
):
    """Get category by code"""
    category = UOMService.get_category_by_code(db, code)
    if not category:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.put(
    "/categories/{category_id}",
    response_model=UOMCategoryResponse,
    summary="Update Category",
    description="Update UOM category details"
)
def update_category(
    category_id: UUID,
    data: UOMCategoryUpdate,
    db: Session = Depends(get_db)
):
    """Update category"""
    return UOMService.update_category(db, category_id, data)


@router.delete(
    "/categories/{category_id}",
    summary="Deactivate Category",
    description="Soft delete (deactivate) UOM category"
)
def delete_category(
    category_id: UUID,
    db: Session = Depends(get_db)
):
    """Deactivate category"""
    return UOMService.delete_category(db, category_id)


# ==================== UOM Endpoints ====================

@router.post(
    "/units",
    response_model=UOMResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create UOM",
    description="Create a new unit of measure"
)
def create_uom(
    data: UOMCreate,
    db: Session = Depends(get_db)
):
    """
    Create new UOM
    
    **Base Unit Example:**
    ```json
    {
        "category_id": "uuid-here",
        "code": "KG",
        "name": "Kilogram",
        "symbol": "kg",
        "is_base": true,
        "conversion_factor": 1,
        "rounding_precision": 0.0001
    }
    ```
    
    **Derived Unit Example:**
    ```json
    {
        "category_id": "uuid-here",
        "code": "G",
        "name": "Gram",
        "symbol": "g",
        "is_base": false,
        "base_uom_id": "kg-uuid-here",
        "conversion_factor": 0.001,
        "rounding_precision": 0.01
    }
    ```
    """
    return UOMService.create_uom(db, data)


@router.get(
    "/units",
    response_model=UOMListResponse,
    summary="Get All UOMs",
    description="Get all units of measure with filters"
)
def get_uoms(
    category_id: Optional[UUID] = Query(None, description="Filter by category ID"),
    category_code: Optional[str] = Query(None, description="Filter by category code (e.g., WEIGHT)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_base: Optional[bool] = Query(None, description="Filter base units only"),
    skip: int = Query(0, ge=0, description="Skip records"),
    limit: int = Query(100, ge=1, le=500, description="Limit records"),
    db: Session = Depends(get_db)
):
    """
    Get all UOMs with filters
    
    **Examples:**
    - Get all weight UOMs: `?category_code=WEIGHT`
    - Get base units only: `?is_base=true`
    - Get active length UOMs: `?category_code=LENGTH&is_active=true`
    """
    uoms, total = UOMService.get_uoms(
        db, category_id, category_code, is_active, is_base, skip, limit
    )
    
    # Enrich response with category info
    items = []
    for uom in uoms:
        uom_dict = {
            "id": uom.id,
            "category_id": uom.category_id,
            "code": uom.code,
            "name": uom.name,
            "symbol": uom.symbol,
            "is_base": uom.is_base,
            "base_uom_id": uom.base_uom_id,
            "conversion_factor": uom.conversion_factor,
            "rounding_precision": uom.rounding_precision,
            "is_active": uom.is_active,
            "created_at": uom.created_at,
            "updated_at": uom.updated_at,
            "category_code": uom.category.code if uom.category else None,
            "category_name": uom.category.name if uom.category else None,
            "base_uom_code": uom.base_uom.code if uom.base_uom else None
        }
        items.append(UOMResponse(**uom_dict))
    
    return UOMListResponse(total=total, items=items)


@router.get(
    "/units/{uom_id}",
    response_model=UOMResponse,
    summary="Get UOM by ID",
    description="Get specific UOM details"
)
def get_uom(
    uom_id: UUID,
    db: Session = Depends(get_db)
):
    """Get UOM by ID"""
    uom = UOMService.get_uom(db, uom_id)
    
    _uom: Any = uom
    return UOMResponse(
        id=_uom.id,
        category_id=_uom.category_id,
        code=_uom.code,
        name=_uom.name,
        symbol=_uom.symbol,
        is_base=_uom.is_base,
        base_uom_id=_uom.base_uom_id,
        conversion_factor=_uom.conversion_factor,
        rounding_precision=_uom.rounding_precision,
        is_active=_uom.is_active,
        created_at=_uom.created_at,
        updated_at=_uom.updated_at,
        category_code=_uom.category.code if _uom.category else None,
        category_name=_uom.category.name if _uom.category else None,
        base_uom_code=_uom.base_uom.code if _uom.base_uom else None
    )


@router.get(
    "/units/code/{code}",
    response_model=UOMResponse,
    summary="Get UOM by Code",
    description="Get UOM by code with optional category filter"
)
def get_uom_by_code(
    code: str,
    category_code: Optional[str] = Query(None, description="Category code for disambiguation"),
    db: Session = Depends(get_db)
):
    """Get UOM by code"""
    uom = UOMService.get_uom_by_code(db, code, category_code)
    if not uom:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="UOM not found")
    
    _uom: Any = uom
    return UOMResponse(
        id=_uom.id,
        category_id=_uom.category_id,
        code=_uom.code,
        name=_uom.name,
        symbol=_uom.symbol,
        is_base=_uom.is_base,
        base_uom_id=_uom.base_uom_id,
        conversion_factor=_uom.conversion_factor,
        rounding_precision=_uom.rounding_precision,
        is_active=_uom.is_active,
        created_at=_uom.created_at,
        updated_at=_uom.updated_at,
        category_code=_uom.category.code if _uom.category else None,
        category_name=_uom.category.name if _uom.category else None,
        base_uom_code=_uom.base_uom.code if _uom.base_uom else None
    )


@router.put(
    "/units/{uom_id}",
    response_model=UOMResponse,
    summary="Update UOM",
    description="Update UOM details"
)
def update_uom(
    uom_id: UUID,
    data: UOMUpdate,
    db: Session = Depends(get_db)
):
    """Update UOM"""
    uom = UOMService.update_uom(db, uom_id, data)
    
    _uom: Any = uom
    return UOMResponse(
        id=_uom.id,
        category_id=_uom.category_id,
        code=_uom.code,
        name=_uom.name,
        symbol=_uom.symbol,
        is_base=_uom.is_base,
        base_uom_id=_uom.base_uom_id,
        conversion_factor=_uom.conversion_factor,
        rounding_precision=_uom.rounding_precision,
        is_active=_uom.is_active,
        created_at=_uom.created_at,
        updated_at=_uom.updated_at,
        category_code=_uom.category.code if _uom.category else None,
        category_name=_uom.category.name if _uom.category else None,
        base_uom_code=_uom.base_uom.code if _uom.base_uom else None
    )


@router.delete(
    "/units/{uom_id}",
    summary="Deactivate UOM",
    description="Soft delete (deactivate) UOM"
)
def delete_uom(
    uom_id: UUID,
    db: Session = Depends(get_db)
):
    """Deactivate UOM"""
    return UOMService.delete_uom(db, uom_id)


# ==================== Conversion Endpoints ====================

@router.post(
    "/convert",
    response_model=UOMConvertResponse,
    summary="Convert Quantity",
    description="Convert quantity between UOMs"
)
def convert_uom(
    request: UOMConvertRequest,
    db: Session = Depends(get_db)
):
    """
    Convert quantity between units
    
    **Example:**
    ```json
    {
        "from_uom": "TON",
        "to_uom": "KG",
        "quantity": 2.5,
        "category_code": "WEIGHT"
    }
    ```
    
    **Response:**
    ```json
    {
        "from_uom": "TON",
        "to_uom": "KG",
        "from_quantity": 2.5,
        "to_quantity": 2500,
        "base_quantity": 2500,
        "base_uom": "KG",
        "conversion_factor": 1000,
        "category": "WEIGHT",
        "calculation": "2.5 TON = 2500 KG = 2500 KG"
    }
    ```
    """
    return UOMService.convert(db, request)


@router.get(
    "/conversion-factor",
    summary="Get Conversion Factor",
    description="Get conversion factor between two UOMs"
)
def get_conversion_factor(
    from_uom: str = Query(..., description="Source UOM code"),
    to_uom: str = Query(..., description="Target UOM code"),
    category_code: Optional[str] = Query(None, description="Category code"),
    db: Session = Depends(get_db)
):
    """
    Get conversion factor
    
    **Example:**
    - `/conversion-factor?from_uom=TON&to_uom=KG`
    - Returns: `{"factor": 1000.0}`
    """
    factor = UOMService.get_conversion_factor(db, from_uom, to_uom, category_code)
    return {
        "from_uom": from_uom,
        "to_uom": to_uom,
        "factor": factor,
        "calculation": f"1 {from_uom} = {factor} {to_uom}"
    }


# ==================== Utility Endpoints ====================

@router.get(
    "/categories/{category_code}/units",
    response_model=UOMListResponse,
    summary="Get Category Units",
    description="Get all units in a category"
)
def get_category_units(
    category_code: str,
    is_active: Optional[bool] = Query(True, description="Filter active units"),
    db: Session = Depends(get_db)
):
    """Get all units in a category"""
    uoms, total = UOMService.get_uoms(
        db, 
        category_code=category_code,
        is_active=is_active,
        limit=500
    )
    
    items = []
    for uom in uoms:
        uom_dict = {
            "id": uom.id,
            "category_id": uom.category_id,
            "code": uom.code,
            "name": uom.name,
            "symbol": uom.symbol,
            "is_base": uom.is_base,
            "base_uom_id": uom.base_uom_id,
            "conversion_factor": uom.conversion_factor,
            "rounding_precision": uom.rounding_precision,
            "is_active": uom.is_active,
            "created_at": uom.created_at,
            "updated_at": uom.updated_at,
            "category_code": uom.category.code if uom.category else None,
            "category_name": uom.category.name if uom.category else None,
            "base_uom_code": uom.base_uom.code if uom.base_uom else None
        }
        items.append(UOMResponse(**uom_dict))
    
    return UOMListResponse(total=total, items=items)


@router.get(
    "/health",
    summary="Health Check",
    description="Check UOM system status"
)
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    from .uom_models import UOMCategory, UOM
    
    categories_count = db.query(UOMCategory).filter(UOMCategory.is_active == True).count()
    uoms_count = db.query(UOM).filter(UOM.is_active == True).count()
    
    return {
        "status": "healthy",
        "system": "UOM System",
        "version": "1.0.0",
        "database": "connected",
        "statistics": {
            "active_categories": categories_count,
            "active_uoms": uoms_count
        }
    }
@router.post(
    "/precision-suggestions",
    summary="Get Precision Suggestions",
    description="Get optimal precision suggestions based on conversion factor (SAP/Odoo style)"
)
def get_precision_suggestions_endpoint(
    conversion_factor: float = Query(..., description="Conversion factor"),
    category_code: str = Query(..., description="Category code (WEIGHT, LENGTH, etc.)"),
    db: Session = Depends(get_db)
):
    """
    Get smart precision suggestions
    
    **Example Request:**
    ```
    POST /api/uom/precision-suggestions?conversion_factor=0.001&category_code=WEIGHT
    ```
    
    **Example Response:**
    ```json
    {
      "optimal_precision": 0.001,
      "physical_meaning": "1 gram",
      "options": [
        {
          "value": 0.0001,
          "label": "0.0001",
          "meaning": "0.1 gram",
          "is_optimal": false
        },
        {
          "value": 0.001,
          "label": "0.001 (Recommended)",
          "meaning": "1 gram",
          "is_optimal": true
        },
        {
          "value": 0.01,
          "label": "0.01",
          "meaning": "10 grams",
          "is_optimal": false
        }
      ],
      "category": "WEIGHT"
    }
    ```
    """
    try:
        suggestions = get_precision_suggestions(conversion_factor, category_code)
        return suggestions
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error calculating precision: {str(e)}"
        )


@router.get(
    "/conversion-examples",
    summary="Get Conversion Examples",
    description="Get example conversions for a given unit configuration"
)
def get_conversion_examples(
    from_code: str = Query(..., description="Source unit code"),
    to_code: str = Query(..., description="Target unit code"),
    conversion_factor: float = Query(..., description="Conversion factor"),
    precision: float = Query(..., description="Rounding precision"),
    db: Session = Depends(get_db)
):
    """
    Get live conversion examples
    
    **Example:**
    ```
    GET /api/uom/conversion-examples?from_code=G&to_code=KG&conversion_factor=0.001&precision=0.0001
    ```
    
    **Response:**
    ```json
    {
      "forward": [
        {"input": 1, "output": "0.0010"},
        {"input": 10, "output": "0.0100"},
        {"input": 100, "output": "0.1000"},
        {"input": 1000, "output": "1.0000"}
      ],
      "reverse": [
        {"input": 1, "output": "1000.0000"},
        {"input": 10, "output": "10000.0000"}
      ]
    }
    ```
    """
    from decimal import Decimal, ROUND_HALF_UP
    
    factor = Decimal(str(conversion_factor))
    prec = Decimal(str(precision))
    
    # Forward conversions (from_code to to_code)
    forward = []
    for qty in [1, 10, 100, 1000, 10000]:
        result = Decimal(str(qty)) * factor
        rounded = result.quantize(prec, rounding=ROUND_HALF_UP)
        forward.append({
            "input": qty,
            "output": f"{rounded:.10f}".rstrip('0').rstrip('.')
        })
    
    # Reverse conversions (to_code to from_code)
    reverse = []
    for qty in [1, 10, 100]:
        if factor != 0:
            result = Decimal(str(qty)) / factor
            rounded = result.quantize(prec, rounding=ROUND_HALF_UP)
            reverse.append({
                "input": qty,
                "output": f"{rounded:.10f}".rstrip('0').rstrip('.')
            })
    
    return {
        "forward": forward,
        "reverse": reverse,
        "formula": f"1 {from_code} = {factor} {to_code}",
        "precision": float(prec)
    }


@router.get(
    "/validate-configuration",
    summary="Validate UOM Configuration",
    description="Validate if UOM configuration makes sense"
)
def validate_uom_configuration(
    conversion_factor: float = Query(...),
    precision: float = Query(...),
    is_base: bool = Query(False),
    db: Session = Depends(get_db)
):
    """
    Validate UOM configuration
    
    Returns validation errors and warnings
    """
    from .precision_helper import PrecisionHelper
    from decimal import Decimal
    
    errors = []
    warnings = []
    
    factor = Decimal(str(conversion_factor))
    prec = Decimal(str(precision))
    
    # Rule 1: Base unit must have factor = 1
    if is_base and factor != 1:
        errors.append("Base unit MUST have conversion factor = 1")
    
    # Rule 2: Derived unit cannot have factor = 1
    if not is_base and factor == 1:
        errors.append("Derived unit CANNOT have factor = 1. Check 'Is Base Unit' instead!")
    
    # Rule 3: Factor must be positive
    if factor <= 0:
        errors.append("Conversion factor must be greater than 0")
    
    # Rule 4: Precision must be positive
    if prec <= 0:
        errors.append("Precision must be greater than 0")
    
    # Rule 5: Validate precision vs factor
    is_valid, error = PrecisionHelper.validate_precision(prec, factor)
    if not is_valid:
        warnings.append(error)
    
    # Rule 6: Check if precision is too fine
    if not is_base and factor > 1000 and prec < Decimal('0.01'):
        warnings.append("Precision seems too fine for large conversion factor")
    
    # Rule 7: Check if precision is too coarse
    if not is_base and factor < 0.001 and prec > Decimal('0.001'):
        warnings.append("Precision seems too coarse for small conversion factor")
    
    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "configuration": {
            "conversion_factor": float(factor),
            "precision": float(prec),
            "is_base": is_base
        }
    }