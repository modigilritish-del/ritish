"""schemas.py - Complete Schema Definitions"""
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, List, Dict, Any

# ==================== LOCATION SCHEMAS ====================

# Country Schemas
class CountryBase(BaseModel):
    country_name: str
    country_code: str

class CountryCreate(CountryBase):
    pass

class CountryResponse(CountryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# State Schemas
class StateBase(BaseModel):
    state_name: str
    state_code: str
    country_id: int

class StateCreate(StateBase):
    pass

class StateResponse(StateBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# City Schemas
class CityBase(BaseModel):
    city_name: str
    city_code: str
    country_id: int
    state_id: int

class CityCreate(CityBase):
    pass

class CityResponse(CityBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Area Schemas
class AreaBase(BaseModel):
    area_name: str
    area_code: str
    country_id: int
    state_id: int
    city_id: int

class AreaCreate(AreaBase):
    pass

class AreaResponse(AreaBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# PostalCode Schemas
class PostalCodeBase(BaseModel):
    postal_code: str
    country_id: int
    state_id: int
    city_id: int

class PostalCodeCreate(PostalCodeBase):
    pass

class PostalCodeResponse(PostalCodeBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== COMPANY TYPE SCHEMAS ====================

# CompanyType Schemas
class CompanyTypeBase(BaseModel):
    type_name: str
    type_code: str

class CompanyTypeCreate(CompanyTypeBase):
    pass

class CompanyTypeResponse(CompanyTypeBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# IndustryType Schemas
class IndustryTypeBase(BaseModel):
    industry_name: str
    industry_code: str

class IndustryTypeCreate(IndustryTypeBase):
    pass

class IndustryTypeResponse(IndustryTypeBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Currency Schemas
class CurrencyBase(BaseModel):
    currency_name: str
    currency_code: str
    currency_symbol: Optional[str] = None

class CurrencyCreate(CurrencyBase):
    pass

class CurrencyResponse(CurrencyBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== PLANT TYPE SCHEMAS ====================

class PlantTypeBase(BaseModel):
    type_name: str
    type_code: str
    description: Optional[str] = None

class PlantTypeCreate(PlantTypeBase):
    pass

class PlantTypeResponse(PlantTypeBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== COMPANY SCHEMAS ====================

# Company Schemas
class CompanyBase(BaseModel):
    company_name: str
    short_name: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    country_id: int
    state_id: int
    city_id: int
    area_id: int
    postal_code_id: int
    company_type_id: int
    industry_type_id: int
    currency_id: int

class CompanyCreate(CompanyBase):
    registration_number: str
    tax_number: str

class CompanyResponse(CompanyBase):
    id: int
    company_code: str
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Company with Details for Plant Frontend
class CompanyDetailResponse(BaseModel):
    id: int
    company_name: str
    short_name: Optional[str]
    company_code: str
    company_type: CompanyTypeResponse
    industry_type: IndustryTypeResponse
    country: CountryResponse
    state: StateResponse
    city: CityResponse
    area: AreaResponse
    postal_code: PostalCodeResponse
    
    class Config:
        from_attributes = True

# ==================== PLANT SCHEMAS ====================

class PlantBase(BaseModel):
    plant_name: str
    plant_email: Optional[str] = None
    plant_phone: Optional[str] = None
    company_id: int
    plant_type_id: int
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    landmark: Optional[str] = None

class PlantCreate(PlantBase):
    postal_code: str
    country_name: str
    state_name: str
    city_name: str
    area_name: str

class PlantResponse(PlantBase):
    id: int
    plant_code: str
    country_id: int
    state_id: int
    city_id: int
    area_id: int
    postal_code_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Plant with Full Details
class PlantDetailResponse(BaseModel):
    id: int
    plant_name: str
    plant_code: str
    plant_email: Optional[str]
    plant_phone: Optional[str]
    address_line1: Optional[str]
    address_line2: Optional[str]
    landmark: Optional[str]
    company: CompanyDetailResponse
    plant_type: PlantTypeResponse
    country: CountryResponse
    state: StateResponse
    city: CityResponse
    area: AreaResponse
    postal_code: PostalCodeResponse
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# ==================== ROLE/DEPARTMENT/DESIGNATION SCHEMAS ====================

# Role Schemas
class RoleBase(BaseModel):
    role_name: str
    role_code: str

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Department Schemas
class DepartmentBase(BaseModel):
    department_name: str
    department_code: str

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Designation Schemas
class DesignationBase(BaseModel):
    designation_name: str
    designation_code: str

class DesignationCreate(DesignationBase):
    pass

class DesignationResponse(DesignationBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# RoleAccess Schemas
class RoleAccessBase(BaseModel):
    company_id: int
    role_id: int
    department_id: int
    designation_id: int

class RoleAccessCreate(RoleAccessBase):
    pass

class RoleAccessResponse(RoleAccessBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== OCR SCHEMAS ====================

class OCRProcessRequest(BaseModel):
    """Request model for OCR processing"""
    mode: str = Field(default="auto", description="Processing mode: auto, fast, accurate, screenshot")
    language: List[str] = Field(default=["en"], description="Language codes")
    preprocessing: bool = Field(default=True, description="Enable preprocessing")
    spell_check: bool = Field(default=True, description="Enable spell checking")
    
    class Config:
        json_schema_extra = {
            "example": {
                "mode": "auto",
                "language": ["en"],
                "preprocessing": True,
                "spell_check": True
            }
        }

class OCRResultBase(BaseModel):
    """Base OCR result"""
    engine_name: str
    extracted_text: str
    confidence_score: float
    processing_time: float

class OCRResultResponse(OCRResultBase):
    """OCR result response"""
    id: int
    document_id: int
    created_at: datetime
    word_confidences: Optional[Dict[str, float]] = None
    bounding_boxes: Optional[List[Dict]] = None
    
    class Config:
        from_attributes = True

class OCRDocumentResponse(BaseModel):
    """Document response"""
    id: int
    file_name: str
    file_path: str
    file_hash: str
    file_size: int
    mime_type: str
    status: str
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class OCRProcessResponse(BaseModel):
    """Complete OCR processing response"""
    document_id: int
    file_name: str
    status: str
    results: List[OCRResultResponse]
    best_result: OCRResultResponse
    total_processing_time: float
    cached: bool
    patterns: Optional[Dict[str, Any]] = None
    improvements: Optional[Dict[str, Any]] = None
    bol_data: Optional[Dict[str, Any]] = None  
    bol_formatted: Optional[str] = None  

class OCRComparisonResponse(BaseModel):
    """OCR engine comparison response"""
    document_id: int
    file_name: str
    results: List[OCRResultResponse]
    agreement_score: float
    recommended_engine: str
    processing_time: float

class OCRStatsResponse(BaseModel):
    """OCR statistics"""
    total_documents: int
    completed: int
    failed: int
    processing: int
    cache_entries: int
    available_engines: Dict[str, bool]