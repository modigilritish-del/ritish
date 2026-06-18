"""plant.py - FIXED: Area search now uses city_id instead of postal_code_id"""
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional
import db_models as models
import schemas
from database import get_db
import re

from locations.country_locations import (
    get_or_create_country,
    get_or_create_state,
    get_or_create_city,
    get_or_create_area,
    get_or_create_postal_code,
    find_best_match,
    capitalize_properly,
    search_locations_with_fuzzy
)

router = APIRouter()

def generate_plant_type_code(db: Session, type_name: str, exclude_id: Optional[int] = None) -> str:
    """Generate plant type code"""
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', type_name).upper()
    base_code = clean_name[:4] if len(clean_name) >= 4 else clean_name.ljust(4, 'X')
    
    query = db.query(models.PlantType.type_code).filter(
        models.PlantType.type_code.like(f"{base_code}-%")
    )
    if exclude_id:
        query = query.filter(models.PlantType.id != exclude_id)
    
    existing_codes = query.all()
    
    if not existing_codes:
        return f"{base_code}-0001"
    
    max_num = 0
    for (code,) in existing_codes:
        try:
            num = int(code.split('-')[-1])
            max_num = max(max_num, num)
        except (ValueError, IndexError):
            continue
    
    return f"{base_code}-{max_num + 1:04d}"

@router.get("/plant-types", response_model=List[schemas.PlantTypeResponse])
async def get_plant_types(db: Session = Depends(get_db)):
    return db.query(models.PlantType).order_by(models.PlantType.type_name).all()

@router.post("/plant-types", response_model=schemas.PlantTypeResponse)
async def create_plant_type(plant_type: schemas.PlantTypeCreate, db: Session = Depends(get_db)):
    type_name = capitalize_properly(plant_type.type_name.strip())
    
    match, is_exact = find_best_match(db, models.PlantType, 'type_name', type_name)
    if match:
        raise HTTPException(status_code=400, detail=f"Plant type already exists: '{match.type_name}'")
    
    type_code = generate_plant_type_code(db, type_name)
    
    db_plant_type = models.PlantType(
        type_name=type_name,
        type_code=type_code,
        description=plant_type.description
    )
    db.add(db_plant_type)
    db.commit()
    db.refresh(db_plant_type)
    return db_plant_type

@router.get("/companies-for-plant", response_model=List[dict])
async def get_companies_for_plant(db: Session = Depends(get_db)):
    companies = db.query(models.Company).options(
        joinedload(models.Company.company_type),
        joinedload(models.Company.industry_type),
        joinedload(models.Company.country),
        joinedload(models.Company.state),
        joinedload(models.Company.city)
    ).all()
    
    return [{
        "id": c.id,
        "company_name": c.company_name,
        "company_code": c.company_code,
        "short_name": c.short_name,
        "company_type": {"id": c.company_type.id, "type_name": c.company_type.type_name} if c.company_type else None,
        "industry_type": {"id": c.industry_type.id, "industry_name": c.industry_type.industry_name} if c.industry_type else None,
        "location": {
            "country": c.country.country_name if c.country else "N/A",
            "state": c.state.state_name if c.state else "N/A",
            "city": c.city.city_name if c.city else "N/A"
        }
    } for c in companies]

@router.get("/companies/{company_id}/details", response_model=dict)
async def get_company_details(company_id: int, db: Session = Depends(get_db)):
    company = db.query(models.Company).options(
        joinedload(models.Company.company_type),
        joinedload(models.Company.industry_type),
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
        "company_code": company.company_code,
        "company_type": {"id": company.company_type.id, "type_name": company.company_type.type_name} if company.company_type else None,
        "industry_type": {"id": company.industry_type.id, "industry_name": company.industry_type.industry_name} if company.industry_type else None,
        "location": {
            "country": company.country.country_name if company.country else "N/A",
            "country_id": company.country.id if company.country else None,
            "state": company.state.state_name if company.state else "N/A",
            "state_id": company.state.id if company.state else None,
            "city": company.city.city_name if company.city else "N/A",
            "city_id": company.city.id if company.city else None,
            "area": company.area.area_name if company.area else "N/A",
            "area_id": company.area.id if company.area else None,
            "postal_code": company.postal_code.postal_code if company.postal_code else "N/A",
            "postal_code_id": company.postal_code.id if company.postal_code else None
        }
    }

@router.get("/check-plant-exists")
async def check_plant_exists(
    company_id: int,
    plant_name: str,
    plant_type_id: int,
    db: Session = Depends(get_db)
):
    """Check if plant exists with same name+type in company"""
    plant = db.query(models.Plant).filter(
        models.Plant.company_id == company_id,
        models.Plant.plant_name == plant_name,
        models.Plant.plant_type_id == plant_type_id
    ).first()
    
    if plant:
        return {"exists": True, "plant_id": plant.id}
    return {"exists": False, "plant_id": None}

@router.get("/plants/{plant_id}/contacts")
async def get_plant_contacts(plant_id: int, db: Session = Depends(get_db)):
    """Get all emails and phones for a plant"""
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    emails = db.query(models.PlantEmail).filter(models.PlantEmail.plant_id == plant_id).all()
    phones = db.query(models.PlantPhone).filter(models.PlantPhone.plant_id == plant_id).all()
    
    return {
        "plant_id": plant_id,
        "emails": [{"id": e.id, "email": e.email, "is_primary": e.is_primary} for e in emails],
        "phones": [{"id": p.id, "phone": p.phone, "is_primary": p.is_primary} for p in phones]
    }

@router.post("/check-contact-conflict")
async def check_contact_conflict(
    emails: List[str] = Form([]),
    phones: List[str] = Form([]),
    current_company_id: int = Form(...),
    db: Session = Depends(get_db)
):
    """Check if email/phone is used by other companies"""
    conflicts = []
    
    for email in emails:
        if email and email.strip():
            email_clean = email.strip().lower()
            plant_emails = db.query(models.PlantEmail).filter(models.PlantEmail.email == email_clean).all()
            for pe in plant_emails:
                plant = db.query(models.Plant).filter(models.Plant.id == pe.plant_id).first()
                if plant and plant.company_id != current_company_id:
                    company = db.query(models.Company).filter(models.Company.id == plant.company_id).first()
                    conflicts.append({
                        "type": "email",
                        "value": email_clean,
                        "company_id": company.id,
                        "company_name": company.company_name,
                        "plant_name": plant.plant_name
                    })
    
    for phone in phones:
        if phone and phone.strip():
            phone_clean = phone.strip()
            plant_phones = db.query(models.PlantPhone).filter(models.PlantPhone.phone == phone_clean).all()
            for pp in plant_phones:
                plant = db.query(models.Plant).filter(models.Plant.id == pp.plant_id).first()
                if plant and plant.company_id != current_company_id:
                    company = db.query(models.Company).filter(models.Company.id == plant.company_id).first()
                    conflicts.append({
                        "type": "phone",
                        "value": phone_clean,
                        "company_id": company.id,
                        "company_name": company.company_name,
                        "plant_name": plant.plant_name
                    })
    
    return {"has_conflict": len(conflicts) > 0, "conflicts": conflicts}

@router.post("/company-relationships")
async def create_company_relationship(
    source_company_id: int = Form(...),
    target_company_id: int = Form(...),
    relationship_type: str = Form(...),
    description: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Create relationship between companies"""
    existing = db.query(models.CompanyRelationship).filter(
        models.CompanyRelationship.source_company_id == source_company_id,
        models.CompanyRelationship.target_company_id == target_company_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Relationship already exists")
    
    relationship = models.CompanyRelationship(
        source_company_id=source_company_id,
        target_company_id=target_company_id,
        relationship_type=relationship_type,
        description=description,
        notes=notes
    )
    db.add(relationship)
    db.commit()
    db.refresh(relationship)
    
    return {"message": "Relationship created successfully", "relationship_id": relationship.id}

def generate_unique_plant_code(db: Session, plant_name: str, company_id: int) -> str:
    """Generate unique plant code"""
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company_code = company.company_code.split('-')[0]
    clean_name = re.sub(r'[^a-zA-Z]', '', plant_name).upper()
    plant_base = clean_name[:5] if len(clean_name) >= 5 else clean_name.ljust(5, 'X')
    
    base_pattern = f"{company_code}-{plant_base}"
    
    existing_codes = db.query(models.Plant.plant_code).filter(
        models.Plant.company_id == company_id
    ).all()
    
    existing_codes_set = {code[0] for code in existing_codes}
    
    max_num = 0
    for code in existing_codes_set:
        try:
            parts = code.split('-')
            if len(parts) >= 3:
                num = int(parts[-1])
                max_num = max(max_num, num)
        except (ValueError, IndexError):
            continue
    
    next_num = max_num + 1
    new_code = f"{base_pattern}-{next_num:04d}"
    
    retry_count = 0
    while new_code in existing_codes_set and retry_count < 100:
        next_num += 1
        new_code = f"{base_pattern}-{next_num:04d}"
        retry_count += 1
    
    if retry_count >= 100:
        import time
        timestamp_suffix = int(time.time() * 1000) % 10000
        new_code = f"{base_pattern}-{timestamp_suffix:04d}"
    
    return new_code

@router.post("/plants")
async def create_plant(
    plant_name: str = Form(...),
    company_id: int = Form(...),
    plant_type_id: int = Form(...),
    emails: str = Form(...),
    phones: str = Form(...),
    use_company_location: bool = Form(False),
    country_name: Optional[str] = Form(None),
    postal_code: Optional[str] = Form(None),
    state_name: Optional[str] = Form(None),
    city_name: Optional[str] = Form(None),
    area_name: Optional[str] = Form(None),
    address_line1: Optional[str] = Form(None),
    address_line2: Optional[str] = Form(None),
    landmark: Optional[str] = Form(None),
    allow_shared_contact: bool = Form(False),
    relationship_type: Optional[str] = Form(None),
    relationship_description: Optional[str] = Form(None),
    relationship_notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Create plant with multiple email/phone support"""
    import json
    
    plant_name = capitalize_properly(plant_name.strip())
    
    try:
        emails_list = json.loads(emails)
        phones_list = json.loads(phones)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid email/phone format")
    
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    plant_type = db.query(models.PlantType).filter(models.PlantType.id == plant_type_id).first()
    if not plant_type:
        raise HTTPException(status_code=404, detail="Plant type not found")
    
    existing_plant = db.query(models.Plant).filter(
        models.Plant.company_id == company_id,
        models.Plant.plant_name == plant_name,
        models.Plant.plant_type_id == plant_type_id
    ).first()
    
    if existing_plant:
        raise HTTPException(
            status_code=400,
            detail=f"Plant '{plant_name}' with type '{plant_type.type_name}' already exists for this company"
        )
    
    # Determine location
    if use_company_location:
        country_id = company.country_id
        state_id = company.state_id
        city_id = company.city_id
        area_id = company.area_id
        postal_code_id = company.postal_code_id
    else:
        if not country_name or not state_name or not city_name or not area_name or not postal_code:
            raise HTTPException(status_code=400, detail="All location fields required")
        
        country = get_or_create_country(db, country_name.strip())
        state = get_or_create_state(db, state_name.strip(), country.id)
        city = get_or_create_city(db, city_name.strip(), state.id, country.id)
        area = get_or_create_area(db, area_name.strip(), city.id, state.id, country.id)
        postal = get_or_create_postal_code(db, postal_code.strip(), country.id, state.id, city.id, area.id)
        
        country_id = country.id
        state_id = state.id
        city_id = city.id
        area_id = area.id
        postal_code_id = postal.id
    
    # Check contact conflicts
    conflict_companies = []
    for email_obj in emails_list:
        if email_obj.get('email'):
            email = email_obj['email'].strip().lower()
            email_plants = db.query(models.PlantEmail).filter(models.PlantEmail.email == email).all()
            for ep in email_plants:
                plant = db.query(models.Plant).filter(models.Plant.id == ep.plant_id).first()
                if plant and plant.company_id != company_id:
                    if plant.company_id not in conflict_companies:
                        conflict_companies.append(plant.company_id)
    
    for phone_obj in phones_list:
        if phone_obj.get('phone'):
            phone = phone_obj['phone'].strip()
            phone_plants = db.query(models.PlantPhone).filter(models.PlantPhone.phone == phone).all()
            for pp in phone_plants:
                plant = db.query(models.Plant).filter(models.Plant.id == pp.plant_id).first()
                if plant and plant.company_id != company_id:
                    if plant.company_id not in conflict_companies:
                        conflict_companies.append(plant.company_id)
    
    if conflict_companies and not allow_shared_contact:
        raise HTTPException(
            status_code=409,
            detail="Contact information already used by other company. Please specify relationship."
        )
    
    # Create relationships if allowed
    if conflict_companies and allow_shared_contact and relationship_type:
        for target_id in conflict_companies:
            existing_rel = db.query(models.CompanyRelationship).filter(
                models.CompanyRelationship.source_company_id == company_id,
                models.CompanyRelationship.target_company_id == target_id
            ).first()
            
            if not existing_rel:
                relationship = models.CompanyRelationship(
                    source_company_id=company_id,
                    target_company_id=target_id,
                    relationship_type=relationship_type,
                    description=relationship_description,
                    notes=relationship_notes
                )
                db.add(relationship)
    
    # Generate unique plant code with retry logic
    max_retries = 5
    plant_code = None
    
    for attempt in range(max_retries):
        try:
            plant_code = generate_unique_plant_code(db, plant_name, company_id)
            
            existing = db.query(models.Plant).filter(
                models.Plant.plant_code == plant_code
            ).first()
            
            if not existing:
                break
            else:
                import time
                time.sleep(0.1)
                if attempt == max_retries - 1:
                    import random
                    random_suffix = random.randint(1000, 9999)
                    plant_code = f"{plant_code.rsplit('-', 1)[0]}-{random_suffix:04d}"
        except Exception as e:
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail=f"Failed to generate unique plant code: {str(e)}")
    
    # Create plant
    db_plant = models.Plant(
        plant_name=plant_name,
        plant_code=plant_code,
        company_id=company_id,
        plant_type_id=plant_type_id,
        country_id=country_id,
        state_id=state_id,
        city_id=city_id,
        area_id=area_id,
        postal_code_id=postal_code_id,
        address_line1=address_line1.strip() if address_line1 else None,
        address_line2=address_line2.strip() if address_line2 else None,
        landmark=landmark.strip() if landmark else None
    )
    
    db.add(db_plant)
    
    try:
        db.flush()
    except Exception as e:
        db.rollback()
        if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
            import time
            timestamp_suffix = int(time.time() * 1000) % 10000
            company_code = company.company_code.split('-')[0]
            clean_name = re.sub(r'[^a-zA-Z]', '', plant_name).upper()
            plant_base = clean_name[:5] if len(clean_name) >= 5 else clean_name.ljust(5, 'X')
            plant_code = f"{company_code}-{plant_base}-{timestamp_suffix:04d}"
            
            db_plant.plant_code = plant_code
            db.add(db_plant)
            db.flush()
        else:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    # Add emails
    for email_obj in emails_list:
        if email_obj.get('email'):
            plant_email = models.PlantEmail(
                plant_id=db_plant.id,
                email=email_obj['email'].strip().lower(),
                is_primary=email_obj.get('is_primary', False)
            )
            db.add(plant_email)
    
    # Add phones
    for phone_obj in phones_list:
        if phone_obj.get('phone'):
            plant_phone = models.PlantPhone(
                plant_id=db_plant.id,
                phone=phone_obj['phone'].strip(),
                is_primary=phone_obj.get('is_primary', False)
            )
            db.add(plant_phone)
    
    # Add primary location
    plant_location = models.PlantLocation(
        plant_id=db_plant.id,
        country_id=country_id,
        state_id=state_id,
        city_id=city_id,
        area_id=area_id,
        postal_code_id=postal_code_id,
        address_line1=address_line1.strip() if address_line1 else None,
        address_line2=address_line2.strip() if address_line2 else None,
        landmark=landmark.strip() if landmark else None,
        is_primary=True
    )
    db.add(plant_location)
    
    db.commit()
    db.refresh(db_plant)
    
    return {
        "message": "Plant created successfully",
        "plant_id": db_plant.id,
        "plant_code": plant_code,
        "plant_name": db_plant.plant_name
    }

@router.get("/plants")
async def get_plants(company_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Plant).options(
        joinedload(models.Plant.company),
        joinedload(models.Plant.plant_type),
        joinedload(models.Plant.country),
        joinedload(models.Plant.state),
        joinedload(models.Plant.city),
        joinedload(models.Plant.area),
        joinedload(models.Plant.postal_code),
        joinedload(models.Plant.emails),
        joinedload(models.Plant.phones),
        joinedload(models.Plant.locations)
    )
    
    if company_id:
        query = query.filter(models.Plant.company_id == company_id)
    
    plants = query.all()
    
    result = []
    for p in plants:
        result.append({
            "id": p.id,
            "plant_name": p.plant_name,
            "plant_code": p.plant_code,
            "company": {"id": p.company.id, "company_name": p.company.company_name} if p.company else None,
            "plant_type": {"id": p.plant_type.id, "type_name": p.plant_type.type_name} if p.plant_type else None,
            "primary_location": {
                "country": p.country.country_name if p.country else "N/A",
                "state": p.state.state_name if p.state else "N/A",
                "city": p.city.city_name if p.city else "N/A",
                "area": p.area.area_name if p.area else "N/A",
                "postal_code": p.postal_code.postal_code if p.postal_code else "N/A"
            },
            "emails": [{"email": e.email, "is_primary": e.is_primary} for e in p.emails],
            "phones": [{"phone": ph.phone, "is_primary": ph.is_primary} for ph in p.phones],
            "total_locations": len(p.locations)
        })
    
    return result

@router.delete("/plants/{plant_id}")
async def delete_plant(plant_id: int, db: Session = Depends(get_db)):
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    plant_name = plant.plant_name
    db.delete(plant)
    db.commit()
    
    return {"message": f"Plant '{plant_name}' deleted successfully"}