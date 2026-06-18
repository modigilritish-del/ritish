"""
backend/uomSystem/uom_schemas.py
UOM Schemas - Request/Response Models
Pydantic schemas for API validation
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from uuid import UUID


# ==================== UOM Category Schemas ====================

class UOMCategoryBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50, description="Unique category code (e.g., WEIGHT, LENGTH)")
    name: str = Field(..., min_length=1, max_length=100, description="Category display name")
    description: Optional[str] = Field(None, max_length=500, description="Category description")


class UOMCategoryCreate(UOMCategoryBase):
    is_active: bool = True


class UOMCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class UOMCategoryResponse(UOMCategoryBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== UOM Schemas ====================

class UOMBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50, description="UOM code (e.g., KG, G, LB)")
    name: str = Field(..., min_length=1, max_length=100, description="UOM display name")
    symbol: Optional[str] = Field(None, max_length=20, description="UOM symbol (e.g., kg, g)")


class UOMCreate(UOMBase):
    category_id: UUID = Field(..., description="UOM Category UUID")
    is_base: bool = Field(False, description="Is this the base unit for the category?")
    base_uom_id: Optional[UUID] = Field(None, description="Base UOM reference (null for base units)")
    conversion_factor: Decimal = Field(Decimal("1"), ge=0, description="Conversion factor to base unit")
    rounding_precision: Decimal = Field(Decimal("0.0001"), ge=0, description="Rounding precision")
    is_active: bool = True

    @field_validator('conversion_factor')
    @classmethod
    def validate_conversion_factor(cls, v, info):
        if v <= 0:
            raise ValueError("Conversion factor must be greater than 0")
        return v

    @field_validator('base_uom_id')
    @classmethod
    def validate_base_uom(cls, v, info):
        is_base = info.data.get('is_base', False)
        if is_base and v is not None:
            raise ValueError("Base UOM cannot have base_uom_id reference")
        if not is_base and v is None:
            raise ValueError("Non-base UOM must have base_uom_id reference")
        return v


class UOMUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    symbol: Optional[str] = Field(None, max_length=20)
    conversion_factor: Optional[Decimal] = Field(None, ge=0)
    rounding_precision: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None


class UOMResponse(UOMBase):
    id: UUID
    category_id: UUID
    is_base: bool
    base_uom_id: Optional[UUID]
    conversion_factor: Decimal
    rounding_precision: Decimal
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Nested data
    category_code: Optional[str] = None
    category_name: Optional[str] = None
    base_uom_code: Optional[str] = None

    class Config:
        from_attributes = True


class UOMWithCategory(UOMResponse):
    category: UOMCategoryResponse

    class Config:
        from_attributes = True


# ==================== Conversion Schemas ====================

class UOMConvertRequest(BaseModel):
    from_uom: str = Field(..., description="Source UOM code")
    to_uom: str = Field(..., description="Target UOM code")
    quantity: Decimal = Field(..., gt=0, description="Quantity to convert")
    category_code: Optional[str] = Field(None, description="Optional category for validation")

    @field_validator('quantity')
    @classmethod
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class UOMConvertResponse(BaseModel):
    from_uom: str
    to_uom: str
    from_quantity: Decimal
    to_quantity: Decimal
    base_quantity: Decimal
    base_uom: str
    conversion_factor: Decimal
    category: str
    calculation: str

    class Config:
        from_attributes = True


# ==================== List Responses ====================

class UOMListResponse(BaseModel):
    total: int
    items: List[UOMResponse]


class UOMCategoryListResponse(BaseModel):
    total: int
    items: List[UOMCategoryResponse]


# ==================== Bulk Operations ====================

class UOMBulkCreateRequest(BaseModel):
    category_id: UUID
    uoms: List[UOMCreate]


class UOMBulkCreateResponse(BaseModel):
    success: int
    failed: int
    items: List[UOMResponse]
    errors: List[str]