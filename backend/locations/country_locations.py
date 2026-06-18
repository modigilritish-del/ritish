"""locations/country_locations.py - FINAL FIX: Multiple areas with same name allowed"""
from sqlalchemy.orm import Session
from difflib import SequenceMatcher
import db_models as models
import re


def normalize_name(name: str) -> str:
    """Normalize name - lowercase and trim for comparison"""
    return ' '.join(name.strip().lower().split())


def capitalize_properly(name: str) -> str:
    """Capitalize first letter and after spaces"""
    words = name.strip().split()
    return ' '.join(word.capitalize() for word in words)


def generate_code(name: str, length: int = 8) -> str:
    """Generate code from name"""
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', name).upper()
    code = clean_name[:length]
    if len(code) < length:
        import random
        import string
        code += ''.join(random.choices(string.ascii_uppercase + string.digits, k=length - len(code)))
    return code


def similarity_score(str1: str, str2: str) -> float:
    """Calculate similarity between two strings (0 to 1)"""
    return SequenceMatcher(None, normalize_name(str1), normalize_name(str2)).ratio()


def find_best_match(db: Session, model, name_field: str, input_name: str, parent_filter=None, threshold: float = 0.85, exact_only: bool = False):
    """
    Find best matching record using fuzzy matching
    Returns: (matched_record, is_exact_match)
    """
    normalized_input = normalize_name(input_name)
    
    # Get all records
    query = db.query(model)
    if parent_filter:
        query = query.filter(parent_filter)
    
    all_records = query.all()
    
    # First check exact match
    for record in all_records:
        record_name = getattr(record, name_field)
        if normalize_name(record_name) == normalized_input:
            return record, True
    
    # If exact_only mode, return None
    if exact_only:
        return None, False
    
    # Try fuzzy match
    best_match = None
    best_score = 0
    
    for record in all_records:
        record_name = getattr(record, name_field)
        score = similarity_score(input_name, record_name)
        if score > best_score and score >= threshold:
            best_score = score
            best_match = record
    
    return best_match, False


def get_or_create_country(db: Session, country_name: str):
    """Get existing or create new country with auto-matching"""
    match, is_exact = find_best_match(db, models.Country, 'country_name', country_name)
    
    if match:
        return match
    
    # Create new country
    proper_name = capitalize_properly(country_name)
    country_code = generate_code(proper_name, 3)
    
    while db.query(models.Country).filter(models.Country.country_code == country_code).first():
        country_code = generate_code(proper_name + str(db.query(models.Country).count()), 3)
    
    country = models.Country(country_name=proper_name, country_code=country_code)
    db.add(country)
    db.commit()
    db.refresh(country)
    return country


def get_or_create_postal_code(db: Session, postal_code: str, country_id: int, state_id: int, city_id: int, area_id: int):
    """Get existing postal code or create new one"""
    postal_code_clean = postal_code.strip().upper()
    
    # Check if this exact postal code exists
    postal = db.query(models.PostalCode).filter(
        models.PostalCode.postal_code == postal_code_clean
    ).first()
    
    if not postal:
        # Create new postal code
        postal = models.PostalCode(
            postal_code=postal_code_clean,
            country_id=country_id,
            state_id=state_id,
            city_id=city_id
        )
        db.add(postal)
        db.commit()
        db.refresh(postal)
    
    # Link postal code and area through junction table
    link_exists = db.query(models.PostalCodeArea).filter(
        models.PostalCodeArea.postal_code_id == postal.id,
        models.PostalCodeArea.area_id == area_id
    ).first()
    
    if not link_exists:
        postal_area_link = models.PostalCodeArea(
            postal_code_id=postal.id,
            area_id=area_id
        )
        db.add(postal_area_link)
        db.commit()
    
    return postal


def get_or_create_state(db: Session, state_name: str, country_id: int):
    """Get existing or create new state"""
    match, is_exact = find_best_match(
        db, models.State, 'state_name', state_name,
        parent_filter=(models.State.country_id == country_id)
    )
    
    if match:
        return match
    
    # Create new state
    proper_name = capitalize_properly(state_name)
    state_code = generate_code(proper_name, 4)
    
    while db.query(models.State).filter(
        models.State.state_code == state_code,
        models.State.country_id == country_id
    ).first():
        state_code = generate_code(proper_name + str(db.query(models.State).count()), 4)
    
    state = models.State(
        state_name=proper_name,
        state_code=state_code,
        country_id=country_id
    )
    db.add(state)
    db.commit()
    db.refresh(state)
    
    return state


def get_or_create_city(db: Session, city_name: str, state_id: int, country_id: int):
    """Get existing or create new city"""
    match, is_exact = find_best_match(
        db, models.City, 'city_name', city_name,
        parent_filter=(models.City.state_id == state_id)
    )
    
    if match:
        return match
    
    # Create new city
    proper_name = capitalize_properly(city_name)
    city_code = generate_code(proper_name, 5)
    
    while db.query(models.City).filter(
        models.City.city_code == city_code,
        models.City.state_id == state_id
    ).first():
        city_code = generate_code(proper_name + str(db.query(models.City).count()), 5)
    
    city = models.City(
        city_name=proper_name,
        city_code=city_code,
        country_id=country_id,
        state_id=state_id
    )
    db.add(city)
    db.commit()
    db.refresh(city)
    
    return city


def get_or_create_area(db: Session, area_name: str, city_id: int, state_id: int, country_id: int):
    """
    Get existing or create new area
    
    IMPORTANT LOGIC:
    - Same area name can exist MULTIPLE times in same city
    - We only reuse if EXACT match found
    - Otherwise, always create NEW area
    - This allows: Jogeshwari (PIN: 400057), Jogeshwari East (PIN: 400102), etc.
    """
    proper_name = capitalize_properly(area_name)
    normalized_input = normalize_name(proper_name)
    
    # Check for EXACT match in the same city
    existing_area = db.query(models.Area).filter(
        models.Area.city_id == city_id,
        models.Area.area_name == proper_name  # Exact match only
    ).first()
    
    if existing_area:
        # Found exact match - reuse it
        return existing_area
    
    # No exact match - create new area
    # Generate unique code
    area_code = generate_code(proper_name, 6)
    
    counter = 1
    while db.query(models.Area).filter(models.Area.area_code == area_code).first():
        import random
        area_code = generate_code(proper_name + str(random.randint(1000, 9999)), 6)
        counter += 1
        if counter > 100:  # Safety break
            break
    
    area = models.Area(
        area_name=proper_name,
        area_code=area_code,
        country_id=country_id,
        state_id=state_id,
        city_id=city_id
    )
    db.add(area)
    db.commit()
    db.refresh(area)
    
    return area


def search_locations_with_fuzzy(db: Session, location_type: str, search_term: str, parent_id: int = None):
    """Search locations with fuzzy matching support"""
    if not search_term:
        return []
    
    normalized_search = normalize_name(search_term)
    
    if location_type == 'country':
        query = db.query(models.Country)
        all_items = query.all()
        
        results = []
        for item in all_items:
            if normalized_search in normalize_name(item.country_name):
                results.append((item, 1.0))
            else:
                score = similarity_score(search_term, item.country_name)
                if score >= 0.6:
                    results.append((item, score))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return [item for item, score in results[:20]]
    
    elif location_type == 'postal_code':
        query = db.query(models.PostalCode)
        if parent_id:
            query = query.filter(models.PostalCode.country_id == parent_id)
        
        return query.filter(
            models.PostalCode.postal_code.ilike(f'%{search_term}%')
        ).order_by(models.PostalCode.postal_code).limit(20).all()
    
    elif location_type == 'state':
        query = db.query(models.State)
        if parent_id:
            query = query.filter(models.State.country_id == parent_id)
        
        all_items = query.all()
        results = []
        for item in all_items:
            if normalized_search in normalize_name(item.state_name):
                results.append((item, 1.0))
            else:
                score = similarity_score(search_term, item.state_name)
                if score >= 0.6:
                    results.append((item, score))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return [item for item, score in results[:20]]
    
    elif location_type == 'city':
        query = db.query(models.City)
        if parent_id:
            query = query.filter(models.City.state_id == parent_id)
        
        all_items = query.all()
        results = []
        for item in all_items:
            if normalized_search in normalize_name(item.city_name):
                results.append((item, 1.0))
            else:
                score = similarity_score(search_term, item.city_name)
                if score >= 0.6:
                    results.append((item, score))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return [item for item, score in results[:20]]
    
    elif location_type == 'area':
        query = db.query(models.Area)
        if parent_id:
            query = query.filter(models.Area.city_id == parent_id)
        
        all_items = query.all()
        results = []
        
        for item in all_items:
            item_normalized = normalize_name(item.area_name)
            if normalized_search == item_normalized:
                results.append((item, 2.0))  # Exact match
            elif normalized_search in item_normalized:
                results.append((item, 1.5))  # Substring match
            else:
                score = similarity_score(search_term, item.area_name)
                if score >= 0.75:
                    results.append((item, score))
        
        results.sort(key=lambda x: x[1], reverse=True)
        return [item for item, score in results[:20]]
    
    return []