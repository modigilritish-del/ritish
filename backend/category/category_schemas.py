"""category/category_schemas.py - Category Management Schemas"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# ==================== CATEGORY SCHEMAS ====================

class CategoryBase(BaseModel):
    category_name: str = Field(..., min_length=1, max_length=255)
    category_code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    category_name: Optional[str] = None
    category_code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: int
    category_name: str
    category_code: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class CategoryDetailResponse(CategoryResponse):
    """Detailed category with item type info"""
    total_subcategories: int = 0
    created_by_user: Optional[dict] = None

    class Config:
        from_attributes = True


# ==================== SUB-CATEGORY SCHEMAS ====================

class SubCategoryBase(BaseModel):
    sub_category_name: str = Field(..., min_length=1, max_length=255)
    sub_category_code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None


class SubCategoryCreate(SubCategoryBase):
    category_id: int


class SubCategoryUpdate(BaseModel):
    sub_category_name: Optional[str] = None
    sub_category_code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class SubCategoryResponse(BaseModel):
    id: int
    category_id: int
    sub_category_name: str
    sub_category_code: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class SubCategoryDetailResponse(SubCategoryResponse):
    """Detailed sub-category with relationships"""
    category: dict
    created_by_user: Optional[dict] = None

    class Config:
        from_attributes = True


# ==================== CATEGORY LIST SCHEMAS ====================

class CategoryWithSubcategories(BaseModel):
    """Category with its subcategories"""
    id: int
    category_name: str
    category_code: str
    description: Optional[str]
    is_active: bool
    subcategories: List['SubCategorySimple'] = []


class SubCategorySimple(BaseModel):
    """Simple sub-category info"""
    id: int
    sub_category_name: str
    sub_category_code: str
    description: Optional[str]
    is_active: bool


# Enable forward references
CategoryWithSubcategories.model_rebuild()


# ==================== FILTER & SEARCH SCHEMAS ====================

class CategoryFilterRequest(BaseModel):
    """Filter parameters for category search"""
    search_query: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryListResponse(BaseModel):
    """Paginated category list"""
    total: int
    categories: List[CategoryDetailResponse]
    page: int = 1
    page_size: int = 50