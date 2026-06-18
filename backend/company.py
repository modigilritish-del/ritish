"""company.py - Updated: Returns complete company details including type codes"""
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import db_models as models
import schemas
from database import get_db
import random
import string

from locations.country_locations import (
    get_or_create_country,
    get_or_create_state,
    get_or_create_city,
    get_or_create_area,
    get_or_create_postal_code,
    search_locations_with_fuzzy
)

router = APIRouter()

# ===================================================================
# LOCATION SEARCH ENDPOINTS WITH FUZZY MATCHING
# ===================================================================
@router.get("/countries", response_model=List[schemas.CountryResponse])
async def search_countries(q: Optional[str] = None, db: Session = Depends(get_db)):
    """Search all countries with fuzzy matching"""
    if q:
        return search_locations_with_fuzzy(db, 'country', q)
    return db.query(models.Country).order_by(models.Country.country_name).limit(100).all()


@router.get("/postal-codes-by-country/{country_id}", response_model=List[schemas.PostalCodeResponse])
async def search_postal_codes_by_country(country_id: int, q: Optional[str] = None, db: Session = Depends(get_db)):
    """Search postal codes by country"""
    if q:
        return search_locations_with_fuzzy(db, 'postal_code', q, parent_id=country_id)
    return db.query(models.PostalCode).filter(
        models.PostalCode.country_id == country_id
    ).order_by(models.PostalCode.postal_code).limit(100).all()


@router.get("/states-by-postal/{postal_code_id}", response_model=List[schemas.StateResponse])
async def get_states_by_postal(postal_code_id: int, q: Optional[str] = None, db: Session = Depends(get_db)):
    """Get states linked to postal code"""
    postal = db.query(models.PostalCode).filter(models.PostalCode.id == postal_code_id).first()
    if not postal:
        raise HTTPException(status_code=404, detail="Postal code not found")
    
    query = db.query(models.State).filter(models.State.country_id == postal.country_id)
    
    if q:
        return search_locations_with_fuzzy(db, 'state', q, parent_id=postal.country_id)
    
    return query.order_by(models.State.state_name).limit(100).all()


@router.get("/cities-by-postal/{postal_code_id}", response_model=List[schemas.CityResponse])
async def get_cities_by_postal(postal_code_id: int, q: Optional[str] = None, db: Session = Depends(get_db)):
    """Get cities linked to postal code"""
    postal = db.query(models.PostalCode).filter(models.PostalCode.id == postal_code_id).first()
    if not postal:
        raise HTTPException(status_code=404, detail="Postal code not found")
    
    query = db.query(models.City).filter(models.City.country_id == postal.country_id)
    
    if postal.state_id:
        query = query.filter(models.City.state_id == postal.state_id)
    
    if q:
        parent_id = postal.state_id if postal.state_id else None
        results = search_locations_with_fuzzy(db, 'city', q, parent_id=parent_id)
        return [r for r in results if r.country_id == postal.country_id]
    
    return query.order_by(models.City.city_name).limit(100).all()


@router.get("/areas-by-city/{city_id}", response_model=List[schemas.AreaResponse])
async def get_areas_by_city(city_id: int, q: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all areas in a city"""
    city = db.query(models.City).filter(models.City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    
    query = db.query(models.Area).filter(models.Area.city_id == city_id)
    
    if q:
        results = search_locations_with_fuzzy(db, 'area', q, parent_id=city_id)
        return results
    
    return query.order_by(models.Area.area_name).limit(100).all()


@router.get("/areas-by-postal/{postal_code_id}", response_model=List[schemas.AreaResponse])
async def get_areas_by_postal(postal_code_id: int, q: Optional[str] = None, db: Session = Depends(get_db)):
    """DEPRECATED: Use /areas-by-city/{city_id} instead"""
    postal = db.query(models.PostalCode).filter(models.PostalCode.id == postal_code_id).first()
    if not postal:
        raise HTTPException(status_code=404, detail="Postal code not found")
    
    query = db.query(models.Area).filter(models.Area.country_id == postal.country_id)
    
    if postal.city_id:
        query = query.filter(models.Area.city_id == postal.city_id)
    elif postal.state_id:
        query = query.filter(models.Area.state_id == postal.state_id)
    
    if q:
        parent_id = postal.city_id if postal.city_id else None
        results = search_locations_with_fuzzy(db, 'area', q, parent_id=parent_id)
        return [r for r in results if r.country_id == postal.country_id]
    
    return query.order_by(models.Area.area_name).limit(100).all()


# Company Type API Endpoints
@router.get("/company-types", response_model=List[schemas.CompanyTypeResponse])
async def get_company_types(db: Session = Depends(get_db)):
    return db.query(models.CompanyType).all()


@router.post("/company-types", response_model=schemas.CompanyTypeResponse)
async def create_company_type(company_type: schemas.CompanyTypeCreate, db: Session = Depends(get_db)):
    existing = db.query(models.CompanyType).filter(
        models.CompanyType.type_name == company_type.type_name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company type name already exists")
    
    db_company_type = models.CompanyType(**company_type.dict())
    db.add(db_company_type)
    db.commit()
    db.refresh(db_company_type)
    return db_company_type


@router.put("/company-types/{type_id}", response_model=schemas.CompanyTypeResponse)
async def update_company_type(type_id: int, company_type: schemas.CompanyTypeCreate, db: Session = Depends(get_db)):
    db_type = db.query(models.CompanyType).filter(models.CompanyType.id == type_id).first()
    if not db_type:
        raise HTTPException(status_code=404, detail="Company type not found")
    
    for key, value in company_type.dict().items():
        setattr(db_type, key, value)
    
    db.commit()
    db.refresh(db_type)
    return db_type


@router.delete("/company-types/{type_id}")
async def delete_company_type(type_id: int, db: Session = Depends(get_db)):
    db_type = db.query(models.CompanyType).filter(models.CompanyType.id == type_id).first()
    if not db_type:
        raise HTTPException(status_code=404, detail="Company type not found")
    
    db.delete(db_type)
    db.commit()
    return {"message": "Company type deleted successfully"}


# Industry Type API Endpoints
@router.get("/industry-types", response_model=List[schemas.IndustryTypeResponse])
async def get_industry_types(db: Session = Depends(get_db)):
    return db.query(models.IndustryType).all()


@router.post("/industry-types", response_model=schemas.IndustryTypeResponse)
async def create_industry_type(industry_type: schemas.IndustryTypeCreate, db: Session = Depends(get_db)):
    existing = db.query(models.IndustryType).filter(
        models.IndustryType.industry_name == industry_type.industry_name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Industry type name already exists")
    
    db_industry_type = models.IndustryType(**industry_type.dict())
    db.add(db_industry_type)
    db.commit()
    db.refresh(db_industry_type)
    return db_industry_type


@router.put("/industry-types/{type_id}", response_model=schemas.IndustryTypeResponse)
async def update_industry_type(type_id: int, industry_type: schemas.IndustryTypeCreate, db: Session = Depends(get_db)):
    db_type = db.query(models.IndustryType).filter(models.IndustryType.id == type_id).first()
    if not db_type:
        raise HTTPException(status_code=404, detail="Industry type not found")
    
    for key, value in industry_type.dict().items():
        setattr(db_type, key, value)
    
    db.commit()
    db.refresh(db_type)
    return db_type


@router.delete("/industry-types/{type_id}")
async def delete_industry_type(type_id: int, db: Session = Depends(get_db)):
    db_type = db.query(models.IndustryType).filter(models.IndustryType.id == type_id).first()
    if not db_type:
        raise HTTPException(status_code=404, detail="Industry type not found")
    
    db.delete(db_type)
    db.commit()
    return {"message": "Industry type deleted successfully"}


# Currency API Endpoints
@router.get("/currencies", response_model=List[schemas.CurrencyResponse])
async def get_currencies(db: Session = Depends(get_db)):
    return db.query(models.Currency).all()


@router.post("/currencies", response_model=schemas.CurrencyResponse)
async def create_currency(currency: schemas.CurrencyCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Currency).filter(
        models.Currency.currency_name == currency.currency_name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Currency name already exists")
    
    db_currency = models.Currency(**currency.dict())
    db.add(db_currency)
    db.commit()
    db.refresh(db_currency)
    return db_currency


@router.put("/currencies/{currency_id}", response_model=schemas.CurrencyResponse)
async def update_currency(currency_id: int, currency: schemas.CurrencyCreate, db: Session = Depends(get_db)):
    db_currency = db.query(models.Currency).filter(models.Currency.id == currency_id).first()
    if not db_currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    
    for key, value in currency.dict().items():
        setattr(db_currency, key, value)
    
    db.commit()
    db.refresh(db_currency)
    return db_currency


@router.delete("/currencies/{currency_id}")
async def delete_currency(currency_id: int, db: Session = Depends(get_db)):
    db_currency = db.query(models.Currency).filter(models.Currency.id == currency_id).first()
    if not db_currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    
    db.delete(db_currency)
    db.commit()
    return {"message": "Currency deleted successfully"}


def generate_unique_company_code(db: Session, company_name: str) -> str:
    """Generate unique company code with sequential number (e.g., ELEVE-0001)"""
    import re
    
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', company_name).upper()
    base_code = clean_name[:5] if len(clean_name) >= 5 else clean_name.ljust(5, 'X')
    
    existing_codes = db.query(models.Company.company_code).filter(
        models.Company.company_code.like(f"{base_code}-%")
    ).all()
    
    if not existing_codes:
        return f"{base_code}-0001"
    
    max_num = 0
    for (code,) in existing_codes:
        try:
            num = int(code.split('-')[-1])
            max_num = max(max_num, num)
        except (ValueError, IndexError):
            continue
    
    next_num = max_num + 1
    return f"{base_code}-{next_num:04d}"


@router.post("/companies", response_model=dict)
async def create_company(
    company_name: str = Form(...),
    short_name: Optional[str] = Form(None),
    company_email: Optional[str] = Form(None),
    company_phone: Optional[str] = Form(None),
    registration_number: str = Form(...),
    tax_number: str = Form(...),
    country_name: str = Form(...),
    state_name: str = Form(...),
    city_name: str = Form(...),
    area_name: str = Form(...),
    postal_code: str = Form(...),
    company_type_id: int = Form(...),
    industry_type_id: int = Form(...),
    currency_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Create company with auto-matching location intelligence"""
    
    short_name = short_name.strip() if short_name and short_name.strip() else None
    company_email = company_email.strip().lower() if company_email and company_email.strip() else None
    company_phone = company_phone.strip() if company_phone and company_phone.strip() else None
    registration_number = registration_number.strip()
    tax_number = tax_number.strip()
    
    # DUPLICATE CHECKS
    duplicate_fields = []
    
    if db.query(models.CompanyRegistrationNumber).filter(
        models.CompanyRegistrationNumber.registration_number == registration_number
    ).first():
        duplicate_fields.append("Registration Number")
    
    if db.query(models.CompanyTaxNumber).filter(
        models.CompanyTaxNumber.tax_number == tax_number
    ).first():
        duplicate_fields.append("Tax Number")
    
    if company_phone:
        if db.query(models.Company).filter(
            models.Company.company_phone == company_phone
        ).first():
            duplicate_fields.append("Phone Number")
    
    if company_email:
        if db.query(models.Company).filter(
            models.Company.company_email == company_email
        ).first():
            duplicate_fields.append("Email")
    
    if duplicate_fields:
        raise HTTPException(
            status_code=400, 
            detail=f"Company already exists with same {', '.join(duplicate_fields)}"
        )
    
    # Validate foreign keys
    if not db.query(models.CompanyType).filter(models.CompanyType.id == company_type_id).first():
        raise HTTPException(status_code=400, detail="Invalid company type ID")
    
    if not db.query(models.IndustryType).filter(models.IndustryType.id == industry_type_id).first():
        raise HTTPException(status_code=400, detail="Invalid industry type ID")
    
    if not db.query(models.Currency).filter(models.Currency.id == currency_id).first():
        raise HTTPException(status_code=400, detail="Invalid currency ID")
    
    # LOCATION INTELLIGENCE
    country = get_or_create_country(db, country_name.strip())
    state = get_or_create_state(db, state_name.strip(), country.id)
    city = get_or_create_city(db, city_name.strip(), state.id, country.id)
    area = get_or_create_area(db, area_name.strip(), city.id, state.id, country.id)
    postal = get_or_create_postal_code(db, postal_code.strip(), country.id, state.id, city.id, area.id)
    
    company_code = generate_unique_company_code(db, company_name)
    
    db_company = models.Company(
        company_name=company_name.strip(),
        short_name=short_name,
        company_code=company_code,
        company_email=company_email,
        company_phone=company_phone,
        country_id=country.id,
        state_id=state.id,
        city_id=city.id,
        area_id=area.id,
        postal_code_id=postal.id,
        company_type_id=company_type_id,
        industry_type_id=industry_type_id,
        currency_id=currency_id
    )
    
    db.add(db_company)
    db.flush()
    
    db_reg = models.CompanyRegistrationNumber(
        registration_number=registration_number,
        company_id=db_company.id
    )
    db.add(db_reg)
    
    db_tax = models.CompanyTaxNumber(
        tax_number=tax_number,
        company_id=db_company.id
    )
    db.add(db_tax)
    
    db.commit()
    db.refresh(db_company)
    
    return {
        "message": "Company created successfully",
        "company_code": company_code,
        "company_id": db_company.id,
        "company_name": db_company.company_name,
        "location_info": {
            "country": country.country_name,
            "state": state.state_name,
            "city": city.city_name,
            "area": area.area_name,
            "postal_code": postal.postal_code
        }
    }


@router.get("/companies", response_model=List[dict])
async def get_companies(db: Session = Depends(get_db)):
    """Get all companies with complete details"""
    companies = db.query(models.Company).options(
        joinedload(models.Company.company_type),
        joinedload(models.Company.industry_type),
        joinedload(models.Company.currency),
        joinedload(models.Company.country),
        joinedload(models.Company.state),
        joinedload(models.Company.city),
        joinedload(models.Company.area),
        joinedload(models.Company.postal_code)
    ).all()
    
    result = []
    for company in companies:
        result.append({
            "id": company.id,
            "company_name": company.company_name,
            "short_name": company.short_name,
            "company_code": company.company_code,
            "company_email": company.company_email,
            "company_phone": company.company_phone,
            "company_type": {
                "id": company.company_type.id,
                "type_name": company.company_type.type_name,
                "type_code": company.company_type.type_code
            } if company.company_type else None,
            "industry_type": {
                "id": company.industry_type.id,
                "industry_name": company.industry_type.industry_name,
                "industry_code": company.industry_type.industry_code
            } if company.industry_type else None,
            "currency": {
                "id": company.currency.id,
                "currency_name": company.currency.currency_name,
                "currency_code": company.currency.currency_code,
                "currency_symbol": company.currency.currency_symbol
            } if company.currency else None,
            "location": {
                "country": company.country.country_name if company.country else None,
                "state": company.state.state_name if company.state else None,
                "city": company.city.city_name if company.city else None,
                "area": company.area.area_name if company.area else None,
                "postal_code": company.postal_code.postal_code if company.postal_code else None
            },
            "created_at": company.created_at,
            "updated_at": company.updated_at
        })
    
    return result


@router.get("/companies/{company_id}/details", response_model=dict)
async def get_company_details(company_id: int, db: Session = Depends(get_db)):
    """Get complete company details with all related information"""
    company = db.query(models.Company).options(
        joinedload(models.Company.company_type),
        joinedload(models.Company.industry_type),
        joinedload(models.Company.currency),
        joinedload(models.Company.country),
        joinedload(models.Company.state),
        joinedload(models.Company.city),
        joinedload(models.Company.area),
        joinedload(models.Company.postal_code)
    ).filter(models.Company.id == company_id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return {
        "id": company.id,
        "company_name": company.company_name,
        "short_name": company.short_name,
        "company_code": company.company_code,
        "company_email": company.company_email,
        "company_phone": company.company_phone,
        "company_type": {
            "id": company.company_type.id,
            "type_name": company.company_type.type_name,
            "type_code": company.company_type.type_code
        } if company.company_type else None,
        "industry_type": {
            "id": company.industry_type.id,
            "industry_name": company.industry_type.industry_name,
            "industry_code": company.industry_type.industry_code
        } if company.industry_type else None,
        "currency": {
            "id": company.currency.id,
            "currency_name": company.currency.currency_name,
            "currency_code": company.currency.currency_code,
            "currency_symbol": company.currency.currency_symbol
        } if company.currency else None,
        "location": {
            "country": company.country.country_name if company.country else None,
            "country_id": company.country_id,
            "state": company.state.state_name if company.state else None,
            "state_id": company.state_id,
            "city": company.city.city_name if company.city else None,
            "city_id": company.city_id,
            "area": company.area.area_name if company.area else None,
            "area_id": company.area_id,
            "postal_code": company.postal_code.postal_code if company.postal_code else None,
            "postal_code_id": company.postal_code_id
        },
        "created_at": company.created_at,
        "updated_at": company.updated_at
    }


@router.delete("/companies/{company_id}")
async def delete_company(company_id: int, db: Session = Depends(get_db)):
    """
    Permanently delete company and ALL related data:
    - Registration & Tax Numbers
    - Plants (and their emails, phones, locations)
    - Role Access entries
    - User Company Access entries
    - User-Company and User-Plant associations
    - RBAC page access cache
    """
    from sqlalchemy import text

    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company_name = company.company_name
    deleted_summary = {
        "registration_numbers": 0,
        "tax_numbers": 0,
        "plants": 0,
        "role_access": 0,
        "user_access": 0,
        "rbac_page_access": 0,
        "company_relationships": 0,
    }

    try:
        # 1. Delete Registration Numbers
        reg_deleted = db.query(models.CompanyRegistrationNumber).filter(
            models.CompanyRegistrationNumber.company_id == company_id
        ).delete(synchronize_session=False)
        deleted_summary["registration_numbers"] = reg_deleted

        # 2. Delete Tax Numbers
        tax_deleted = db.query(models.CompanyTaxNumber).filter(
            models.CompanyTaxNumber.company_id == company_id
        ).delete(synchronize_session=False)
        deleted_summary["tax_numbers"] = tax_deleted

        # 3. Delete Plants and their sub-records
        plants = db.query(models.Plant).filter(models.Plant.company_id == company_id).all()
        plant_ids = [p.id for p in plants]

        if plant_ids:
            # Plant emails, phones, locations (if these tables exist)
            for plant_id in plant_ids:
                try:
                    db.execute(text(f"DELETE FROM plant_emails WHERE plant_id = {plant_id}"))
                except Exception:
                    pass
                try:
                    db.execute(text(f"DELETE FROM plant_phones WHERE plant_id = {plant_id}"))
                except Exception:
                    pass
                try:
                    db.execute(text(f"DELETE FROM plant_locations WHERE plant_id = {plant_id}"))
                except Exception:
                    pass

            # Remove user_plants associations
            try:
                db.execute(
                    text("DELETE FROM user_plants WHERE plant_id = ANY(:ids)"),
                    {"ids": plant_ids}
                )
            except Exception:
                pass

            # Delete the plants themselves
            plants_deleted = db.query(models.Plant).filter(
                models.Plant.company_id == company_id
            ).delete(synchronize_session=False)
            deleted_summary["plants"] = plants_deleted

        # 4. Delete RoleAccess entries for this company
        try:
            role_access_deleted = db.query(models.RoleAccess).filter(
                models.RoleAccess.company_id == company_id
            ).delete(synchronize_session=False)
            deleted_summary["role_access"] = role_access_deleted
        except Exception:
            pass

        # 5. Delete UserCompanyAccess entries
        try:
            from user.user_models import UserCompanyAccess
            user_access_deleted = db.query(UserCompanyAccess).filter(
                UserCompanyAccess.company_id == company_id
            ).delete(synchronize_session=False)
            deleted_summary["user_access"] = user_access_deleted
        except Exception:
            pass

        # 6. Delete RBAC CompanyRolePageAccess entries
        try:
            from role.role_models import CompanyRolePageAccess, UserPageAccessCache
            rbac_deleted = db.query(CompanyRolePageAccess).filter(
                CompanyRolePageAccess.company_id == company_id
            ).delete(synchronize_session=False)
            deleted_summary["rbac_page_access"] = rbac_deleted

            db.query(UserPageAccessCache).filter(
                UserPageAccessCache.company_id == company_id
            ).delete(synchronize_session=False)
        except Exception:
            pass

        # 7. Delete CompanyRelationships (source_company_id OR target_company_id)
        try:
            rel_deleted = db.query(models.CompanyRelationship).filter(
                (models.CompanyRelationship.source_company_id == company_id) |
                (models.CompanyRelationship.target_company_id == company_id)
            ).delete(synchronize_session=False)
            deleted_summary["company_relationships"] = rel_deleted
        except Exception:
            # Fallback: raw SQL
            try:
                db.execute(
                    text("DELETE FROM company_relationships WHERE source_company_id = :cid OR target_company_id = :cid"),
                    {"cid": company_id}
                )
            except Exception:
                pass

        # 8. Remove user_companies associations
        try:
            db.execute(
                text("DELETE FROM user_companies WHERE company_id = :cid"),
                {"cid": company_id}
            )
        except Exception:
            pass

        # 9. Finally delete the company itself
        db.delete(company)
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting company: {str(e)}")

    return {
        "message": f"Company '{company_name}' and all related data deleted permanently",
        "company_id": company_id,
        "deleted_summary": deleted_summary
    }