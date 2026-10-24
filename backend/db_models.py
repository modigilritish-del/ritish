"""db_models.py - Extended Database Models - FIXED CONSTRAINTS"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint, Table, Text, JSON, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum
from financeAccounting.finance_models import (
    GLType, GLCategory, GLMaster, GLNameHistory, GLStatusHistory
)
class Country(Base):
    __tablename__ = "countries"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    country_name = Column(String(255), nullable=False, unique=True, index=True)
    country_code = Column(String(10), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    states = relationship("State", back_populates="country")
    companies = relationship("Company", back_populates="country")
    plants = relationship("Plant", back_populates="country")


class State(Base):
    __tablename__ = "states"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    state_name = Column(String(255), nullable=False, index=True)
    state_code = Column(String(10), nullable=False, index=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('state_name', 'country_id', name='unique_state_country'),)
    
    country = relationship("Country", back_populates="states")
    cities = relationship("City", back_populates="state")
    companies = relationship("Company", back_populates="state")
    plants = relationship("Plant", back_populates="state")


class City(Base):
    __tablename__ = "cities"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    city_name = Column(String(255), nullable=False, index=True)
    city_code = Column(String(10), nullable=False, index=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('city_name', 'state_id', name='unique_city_state'),)
    
    state = relationship("State", back_populates="cities")
    areas = relationship("Area", back_populates="city")
    postal_codes = relationship("PostalCode", back_populates="city")
    companies = relationship("Company", back_populates="city")
    plants = relationship("Plant", back_populates="city")


class Area(Base):
    __tablename__ = "areas"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    area_name = Column(String(255), nullable=False, index=True)
    area_code = Column(String(10), nullable=False, index=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    city = relationship("City", back_populates="areas")
    postal_codes = relationship("PostalCodeArea", back_populates="area")
    companies = relationship("Company", back_populates="area")
    plants = relationship("Plant", back_populates="area")


class PostalCode(Base):
    __tablename__ = "postal_codes"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    postal_code = Column(String(20), nullable=False, unique=True, index=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    city = relationship("City", back_populates="postal_codes")
    areas = relationship("PostalCodeArea", back_populates="postal_code")
    companies = relationship("Company", back_populates="postal_code")
    plants = relationship("Plant", back_populates="postal_code")


class PostalCodeArea(Base):
    __tablename__ = "postal_code_areas"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    postal_code_id = Column(Integer, ForeignKey("postal_codes.id"), nullable=False)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('postal_code_id', 'area_id', name='unique_postal_area'),)
    
    postal_code = relationship("PostalCode", back_populates="areas")
    area = relationship("Area", back_populates="postal_codes")


class CompanyType(Base):
    __tablename__ = "company_types"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type_name = Column(String(255), nullable=False, unique=True, index=True)
    type_code = Column(String(10), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    companies = relationship("Company", back_populates="company_type")


class IndustryType(Base):
    __tablename__ = "industry_types"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    industry_name = Column(String(255), nullable=False, unique=True, index=True)
    industry_code = Column(String(10), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    companies = relationship("Company", back_populates="industry_type")


class Currency(Base):
    __tablename__ = "currencies"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    currency_name = Column(String(100), nullable=False, unique=True, index=True)
    currency_code = Column(String(10), nullable=False, unique=True, index=True)
    currency_symbol = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    companies = relationship("Company", back_populates="currency")


class PlantType(Base):
    __tablename__ = "plant_types"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    type_name = Column(String(255), nullable=False, unique=True, index=True)
    type_code = Column(String(10), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    plants = relationship("Plant", back_populates="plant_type")


class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_name = Column(String(255), nullable=False, index=True)
    short_name = Column(String(100), nullable=True)
    company_code = Column(String(10), nullable=False, unique=True, index=True)
    company_email = Column(String(255), nullable=True, unique=True)
    company_phone = Column(String(20), nullable=True, unique=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False)
    postal_code_id = Column(Integer, ForeignKey("postal_codes.id"), nullable=False)
    company_type_id = Column(Integer, ForeignKey("company_types.id"), nullable=False)
    industry_type_id = Column(Integer, ForeignKey("industry_types.id"), nullable=False)
    currency_id = Column(Integer, ForeignKey("currencies.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    country = relationship("Country", back_populates="companies")
    state = relationship("State", back_populates="companies")
    city = relationship("City", back_populates="companies")
    area = relationship("Area", back_populates="companies")
    postal_code = relationship("PostalCode", back_populates="companies")
    company_type = relationship("CompanyType", back_populates="companies")
    industry_type = relationship("IndustryType", back_populates="companies")
    currency = relationship("Currency", back_populates="companies")
    registration_numbers = relationship("CompanyRegistrationNumber", back_populates="company")
    tax_numbers = relationship("CompanyTaxNumber", back_populates="company")
    plants = relationship("Plant", back_populates="company")


class PlantEmail(Base):
    __tablename__ = "plant_emails"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('plant_id', 'email', name='unique_plant_email'),
    )
    
    plant = relationship("Plant", back_populates="emails")


class PlantPhone(Base):
    __tablename__ = "plant_phones"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('plant_id', 'phone', name='unique_plant_phone'),
    )
    
    plant = relationship("Plant", back_populates="phones")


class PlantLocation(Base):
    __tablename__ = "plant_locations"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="CASCADE"), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False)
    postal_code_id = Column(Integer, ForeignKey("postal_codes.id"), nullable=False)
    address_line1 = Column(String(500), nullable=True)
    address_line2 = Column(String(500), nullable=True)
    landmark = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    plant = relationship("Plant", back_populates="locations")


class CompanyRelationshipType(enum.Enum):
    RELATED_COMPANY = "Related Company"
    INTEGRAL_PART = "Integral Part"
    THIRD_PARTY = "Third Party"


class CompanyRelationship(Base):
    __tablename__ = "company_relationships"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    target_company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    relationship_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('source_company_id', 'target_company_id', name='unique_company_relationship'),
    )


class Plant(Base):
    __tablename__ = "plants"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plant_name = Column(String(255), nullable=False, index=True)
    plant_code = Column(String(50), nullable=False, unique=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    plant_type_id = Column(Integer, ForeignKey("plant_types.id"), nullable=False)
    
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False)
    postal_code_id = Column(Integer, ForeignKey("postal_codes.id"), nullable=False)
    address_line1 = Column(String(500), nullable=True)
    address_line2 = Column(String(500), nullable=True)
    landmark = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('plant_name', 'plant_type_id', 'company_id', name='unique_plant_name_type_company'),
    )
    
    company = relationship("Company", back_populates="plants")
    plant_type = relationship("PlantType", back_populates="plants")
    country = relationship("Country", back_populates="plants")
    state = relationship("State", back_populates="plants")
    city = relationship("City", back_populates="plants")
    area = relationship("Area", back_populates="plants")
    postal_code = relationship("PostalCode", back_populates="plants")
    
    emails = relationship("PlantEmail", back_populates="plant", cascade="all, delete-orphan")
    phones = relationship("PlantPhone", back_populates="plant", cascade="all, delete-orphan")
    locations = relationship("PlantLocation", back_populates="plant", cascade="all, delete-orphan")


class CompanyRegistrationNumber(Base):
    __tablename__ = "company_registration_numbers"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    registration_number = Column(String(100), nullable=False, unique=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    company = relationship("Company", back_populates="registration_numbers")


class CompanyTaxNumber(Base):
    __tablename__ = "company_tax_numbers"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tax_number = Column(String(100), nullable=False, unique=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    company = relationship("Company", back_populates="tax_numbers")


class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role_name = Column(String(255), nullable=False, unique=True, index=True)
    role_code = Column(String(10), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    department_name = Column(String(255), nullable=False, unique=True, index=True)
    department_code = Column(String(10), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Designation(Base):
    __tablename__ = "designations"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    designation_name = Column(String(255), nullable=False, unique=True, index=True)
    designation_code = Column(String(10), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RoleAccess(Base):
    __tablename__ = "role_access"
    __table_args__ = (
        UniqueConstraint("company_id", "role_id", "department_id", "designation_id", name="unique_company_role_dept_desg"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True)
    designation_id = Column(Integer, ForeignKey("designations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company")
    role = relationship("Role")
    department = relationship("Department")
    designation = relationship("Designation")