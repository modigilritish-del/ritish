"""
role/role_sync.py - Auto-sync pages from frontend WITH PERMISSIONS - FIXED
Automatically creates/updates pages in the backend WITH CRUD permissions.
HANDLES DUPLICATE page_name AND page_url
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from database import get_db
import db_models as models
from role import role_models
import re

router = APIRouter()


def generate_page_code(page_name: str, db: Session) -> str:
    """Generate unique page code"""
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', page_name).upper()
    base_code = clean_name[:8] if len(clean_name) >= 8 else clean_name.ljust(8, 'X')
    
    # Check uniqueness
    counter = 1
    page_code = f"{base_code}-{counter:03d}"
    
    while db.query(role_models.Page).filter(
        role_models.Page.page_code == page_code
    ).first():
        counter += 1
        page_code = f"{base_code}-{counter:03d}"
    
    return page_code


@router.post("/rbac/sync-pages")
async def sync_pages_from_frontend(
    pages_data: List[dict],
    db: Session = Depends(get_db)
):
    """
    Automatically syncs all pages from the frontend WITH PERMISSIONS.
    
    Example request:
    POST /api/rbac/sync-pages
    Body: [
        {
            "page_name": "Add Company",
            "page_url": "/admin-master/add-company",
            "icon_name": "Building2",
            "category": "Admin Master"
        },
        ...
    ]
    """
    
    created_count = 0
    updated_count = 0
    skipped_count = 0
    permissions_created = 0
    error_details = []
    
    # Default CRUD permissions for ALL pages
    DEFAULT_PERMISSIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT']
    
    for page_data in pages_data:
        page_name = page_data.get('page_name')
        page_url = page_data.get('page_url')
        icon_name = page_data.get('icon_name')
        category = page_data.get('category', 'General')
        
        if not page_name or not page_url:
            skipped_count += 1
            error_details.append(f"Skipped: Missing name or URL - {page_data}")
            continue
        
        try:
            # Check if page exists by BOTH page_name OR page_url
            # This handles cases where either might be duplicate
            existing_page = db.query(role_models.Page).filter(
                or_(
                    role_models.Page.page_url == page_url,
                    role_models.Page.page_name == page_name
                )
            ).first()
            
            if existing_page:
                # Update existing page - only update fields that won't cause conflicts
                existing_page.icon_name = icon_name
                existing_page.description = category
                
                # Only update page_name if it's different and won't conflict
                if existing_page.page_name != page_name:
                    # Check if new name already exists elsewhere
                    name_conflict = db.query(role_models.Page).filter(
                        role_models.Page.page_name == page_name,
                        role_models.Page.id != existing_page.id
                    ).first()
                    
                    if not name_conflict:
                        existing_page.page_name = page_name
                
                # Only update URL if different and won't conflict
                if existing_page.page_url != page_url:
                    url_conflict = db.query(role_models.Page).filter(
                        role_models.Page.page_url == page_url,
                        role_models.Page.id != existing_page.id
                    ).first()
                    
                    if not url_conflict:
                        existing_page.page_url = page_url
                
                updated_count += 1
                page_id = existing_page.id
            else:
                # Create new page
                page_code = generate_page_code(page_name, db)
                
                new_page = role_models.Page(
                    page_name=page_name,
                    page_code=page_code,
                    page_url=page_url,
                    icon_name=icon_name,
                    description=category,
                    is_active=True,
                    display_order=0
                )
                db.add(new_page)
                db.flush()  # Get the ID
                created_count += 1
                page_id = new_page.id
            
            # Add/Update permissions for this page
            for perm_type in DEFAULT_PERMISSIONS:
                existing_perm = db.query(role_models.PagePermission).filter(
                    role_models.PagePermission.page_id == page_id,
                    role_models.PagePermission.permission_type == perm_type
                ).first()
                
                if not existing_perm:
                    permission = role_models.PagePermission(
                        page_id=page_id,
                        permission_type=perm_type,
                        is_enabled=True
                    )
                    db.add(permission)
                    permissions_created += 1
            
            # Commit after each page to avoid rollback issues
            db.commit()
            
        except Exception as e:
            # Rollback this page and continue with others
            db.rollback()
            skipped_count += 1
            error_details.append(f"Error with '{page_name}': {str(e)}")
            continue
    
    return {
        "success": True,
        "message": f"Pages synced successfully",
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "permissions_created": permissions_created,
        "total": len(pages_data),
        "errors": error_details if error_details else None
    }


@router.get("/rbac/registry-summary")
async def get_registry_summary(db: Session = Depends(get_db)):
    """Get summary of all registered pages"""
    
    pages = db.query(role_models.Page).all()
    
    # Group by category (description field)
    categories = {}
    for page in pages:
        category = page.description or "Uncategorized"
        if category not in categories:
            categories[category] = []
        
        # Get permissions for this page
        permissions = db.query(role_models.PagePermission).filter(
            role_models.PagePermission.page_id == page.id
        ).all()
        
        categories[category].append({
            "id": page.id,
            "page_name": page.page_name,
            "page_url": page.page_url,
            "icon_name": page.icon_name,
            "is_active": page.is_active,
            "permissions": [
                {
                    "id": p.id,
                    "type": p.permission_type,
                    "enabled": p.is_enabled
                } for p in permissions
            ]
        })
    
    return {
        "total_pages": len(pages),
        "categories": categories,
        "category_count": len(categories)
    }


@router.post("/rbac/auto-sync-from-registry")
async def auto_sync_from_registry(db: Session = Depends(get_db)):
    """
    Automatically sync pages from pageRegistry.js.
    This endpoint should be called by the frontend on app load.
    """
    # This endpoint receives pages data from the frontend.
    # The frontend must send the pages_data array in the request body.
    
    return {
        "message": "Please send pages_data array in request body",
        "expected_format": [
            {
                "page_name": "Add Company",
                "page_url": "/admin-master/add-company",
                "icon_name": "Building2",
                "category": "Admin Master"
            }
        ]
    }


@router.delete("/rbac/clear-all-pages")
async def clear_all_pages(
    confirm: bool = False,
    db: Session = Depends(get_db)
):
    """
    ⚠️ DANGER: Delete all pages and permissions
    Use this only for testing/development
    """
    if not confirm:
        return {
            "message": "Set confirm=true to delete all pages",
            "warning": "This will delete ALL pages and permissions!"
        }
    
    try:
        # Delete all permissions first
        db.query(role_models.PagePermission).delete()
        
        # Delete all pages
        deleted_count = db.query(role_models.Page).delete()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} pages and all permissions",
            "warning": "Database cleared!"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing pages: {str(e)}")