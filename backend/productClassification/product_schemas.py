"""productClassification/product_schemas.py - Product & Classification Schemas"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# ==================== PRODUCT SCHEMAS ====================

class ProductBase(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None


class ProductCreate(ProductBase):
    sub_category_id: int
    # ── Scope (all optional — leave None for Global product) ─────────────────
    # None, None       → Global (no restriction)
    # company_id only  → Company-wide
    # company_id + plant_id → Plant-specific
    # company_ids list → Multi-company (is_multi_company auto set True)
    company_id:  Optional[int]       = None
    company_ids: Optional[List[int]] = None
    plant_id:    Optional[int]       = None
    # ─────────────────────────────────────────────────────────────────────────


class ProductUpdate(BaseModel):
    product_name: Optional[str]  = None
    description:  Optional[str]  = None
    sku:          Optional[str]  = None
    barcode:      Optional[str]  = None
    is_active:    Optional[bool] = None
    company_id:   Optional[int]  = None
    plant_id:     Optional[int]  = None


class ProductResponse(BaseModel):
    id:              int
    sub_category_id: int
    product_name:    str
    product_code:    str
    description:     Optional[str]
    sku:             Optional[str]
    barcode:         Optional[str]
    company_id:      Optional[int]  = None
    plant_id:        Optional[int]  = None
    is_multi_company: bool          = False
    is_active:       bool
    created_at:      datetime
    updated_at:      Optional[datetime]

    class Config:
        from_attributes = True


class ProductDetailResponse(ProductResponse):
    """Detailed product with hierarchy and scope info"""
    subcategory_name: Optional[str] = None
    subcategory_code: Optional[str] = None
    category_name:    Optional[str] = None
    category_code:    Optional[str] = None
    item_type_name:   Optional[str] = None
    # Scope
    scope:        Optional[str]        = None   # "global" | "company" | "plant" | "multi_company"
    scope_label:  Optional[str]        = None   # human-readable
    company_name: Optional[str]        = None
    plant_name:   Optional[str]        = None
    companies:    Optional[List[dict]] = None   # when is_multi_company
    plants:       Optional[List[dict]] = None   # from ProductPlantMapping
    # Stats
    total_classifications: int          = 0
    created_by_user:       Optional[dict] = None

    class Config:
        from_attributes = True


# ==================== PRODUCT CLASSIFICATION SCHEMAS ====================

class ProductClassificationBase(BaseModel):
    classification_name: str = Field(..., min_length=1, max_length=255)
    description:         Optional[str] = None
    grade:               Optional[str] = None
    quality_standard:    Optional[str] = None
    certification:       Optional[str] = None


class ProductClassificationCreate(ProductClassificationBase):
    product_id: int


class ProductClassificationUpdate(BaseModel):
    classification_name: Optional[str]  = None
    description:         Optional[str]  = None
    grade:               Optional[str]  = None
    quality_standard:    Optional[str]  = None
    certification:       Optional[str]  = None
    is_active:           Optional[bool] = None


class ProductClassificationResponse(BaseModel):
    id:                  int
    product_id:          int
    classification_name: str
    classification_code: str
    description:         Optional[str]
    grade:               Optional[str]
    quality_standard:    Optional[str]
    certification:       Optional[str]
    is_active:           bool
    created_at:          datetime
    updated_at:          Optional[datetime]

    class Config:
        from_attributes = True


class ProductClassificationDetailResponse(ProductClassificationResponse):
    product_name:     Optional[str]  = None
    product_code:     Optional[str]  = None
    subcategory_name: Optional[str]  = None
    category_name:    Optional[str]  = None
    created_by_user:  Optional[dict] = None

    class Config:
        from_attributes = True


# ==================== MAPPING SCHEMAS (future use) ====================

class ProductCompanyMappingCreate(BaseModel):
    """POST /api/item-product/{product_id}/companies — map product to a company"""
    company_id: int


class ProductPlantMappingCreate(BaseModel):
    """POST /api/item-product/{product_id}/plants — map product to a plant"""
    plant_id:   int
    is_primary: bool = False


class ProductCompanyMappingResponse(BaseModel):
    id:         int
    product_id: int
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProductPlantMappingResponse(BaseModel):
    id:         int
    product_id: int
    plant_id:   int
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== LIST & FILTER SCHEMAS ====================

class ProductSimple(BaseModel):
    id:           int
    product_name: str
    product_code: str
    description:  Optional[str]
    is_active:    bool
    total_classifications: int = 0


class ClassificationSimple(BaseModel):
    id:                  int
    classification_name: str
    classification_code: str
    description:         Optional[str]
    grade:               Optional[str]
    is_active:           bool


class ProductFilterRequest(BaseModel):
    sub_category_id: Optional[int]  = None
    company_id:      Optional[int]  = None
    plant_id:        Optional[int]  = None
    item_type_id:    Optional[int]  = None
    search_query:    Optional[str]  = None
    is_active:       Optional[bool] = None


class ProductListResponse(BaseModel):
    total:     int
    products:  List[ProductDetailResponse]
    page:      int = 1
    page_size: int = 50