"""page_links_routes.py - Manage Page Links (stores in single JSON file, no database)"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import List, Optional
import json
from datetime import datetime

router = APIRouter()

# Path to store links JSON file
def get_links_storage_path():
    """Get path to links storage file"""
    current_file = Path(__file__).resolve()
    backend_folder = current_file.parent.parent
    project_root = backend_folder.parent
    
    # Store in backend/autoCreation folder
    links_file = backend_folder / "autoCreation" / "page_links_storage.json"
    
    # Create file if doesn't exist
    if not links_file.exists():
        links_file.parent.mkdir(parents=True, exist_ok=True)
        links_file.write_text(json.dumps([], indent=2))
    
    return links_file

LINKS_STORAGE_FILE = get_links_storage_path()


class PageLinkCreate(BaseModel):
    pageName: str
    componentName: str
    pathName: str
    fileName: str
    icon: Optional[str] = "FileText"
    description: Optional[str] = ""


class PageLinkResponse(BaseModel):
    id: str
    pageName: str
    componentName: str
    pathName: str
    fileName: str
    icon: str
    description: str
    createdAt: str


def read_links() -> List[dict]:
    """Read all links from JSON file"""
    try:
        with open(LINKS_STORAGE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []


def write_links(links: List[dict]):
    """Write links to JSON file"""
    with open(LINKS_STORAGE_FILE, 'w', encoding='utf-8') as f:
        json.dump(links, f, indent=2, ensure_ascii=False)


@router.post("/create-link", response_model=PageLinkResponse)
async def create_page_link(link: PageLinkCreate):
    """
    Create a new page link entry
    Stores in JSON file for later use in config generation
    """
    try:
        links = read_links()
        
        # Check if link already exists
        existing = next((l for l in links if l['componentName'] == link.componentName), None)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Link for '{link.componentName}' already exists"
            )
        
        # Create new link
        new_link = {
            "id": f"link_{len(links) + 1}_{datetime.now().timestamp()}",
            "pageName": link.pageName,
            "componentName": link.componentName,
            "pathName": link.pathName,
            "fileName": link.fileName,
            "icon": link.icon or "FileText",
            "description": link.description or "",
            "createdAt": datetime.now().isoformat()
        }
        
        links.append(new_link)
        write_links(links)
        
        return new_link
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating link: {str(e)}"
        )


@router.get("/list-links", response_model=List[PageLinkResponse])
async def list_page_links():
    """
    Get all page links
    """
    try:
        links = read_links()
        return links
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing links: {str(e)}"
        )


@router.get("/link/{link_id}", response_model=PageLinkResponse)
async def get_page_link(link_id: str):
    """
    Get a specific page link by ID
    """
    try:
        links = read_links()
        link = next((l for l in links if l['id'] == link_id), None)
        
        if not link:
            raise HTTPException(
                status_code=404,
                detail=f"Link with ID '{link_id}' not found"
            )
        
        return link
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting link: {str(e)}"
        )


@router.put("/link/{link_id}", response_model=PageLinkResponse)
async def update_page_link(link_id: str, link: PageLinkCreate):
    """
    Update an existing page link
    """
    try:
        links = read_links()
        link_index = next((i for i, l in enumerate(links) if l['id'] == link_id), None)
        
        if link_index is None:
            raise HTTPException(
                status_code=404,
                detail=f"Link with ID '{link_id}' not found"
            )
        
        # Update link
        links[link_index].update({
            "pageName": link.pageName,
            "componentName": link.componentName,
            "pathName": link.pathName,
            "fileName": link.fileName,
            "icon": link.icon or "FileText",
            "description": link.description or "",
        })
        
        write_links(links)
        return links[link_index]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating link: {str(e)}"
        )


@router.delete("/link/{link_id}")
async def delete_page_link(link_id: str):
    """
    Delete a page link
    """
    try:
        links = read_links()
        link_index = next((i for i, l in enumerate(links) if l['id'] == link_id), None)
        
        if link_index is None:
            raise HTTPException(
                status_code=404,
                detail=f"Link with ID '{link_id}' not found"
            )
        
        deleted_link = links.pop(link_index)
        write_links(links)
        
        return {
            "success": True,
            "message": f"Link '{deleted_link['pageName']}' deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting link: {str(e)}"
        )


@router.post("/generate-config")
async def generate_config_file(config_name: str, link_ids: List[str]):
    """
    Generate a config file from selected page links
    """
    try:
        links = read_links()
        selected_links = [l for l in links if l['id'] in link_ids]
        
        if not selected_links:
            raise HTTPException(
                status_code=400,
                detail="No valid links selected"
            )
        
        # Generate config file content
        config_var_name = config_name.replace(' ', '') + 'Links'
        
        # Get unique icons
        icons = list(set(l['icon'] for l in selected_links))
        icon_imports = ', '.join(icons)
        
        # Generate component imports
        component_imports = '\n'.join([
            f"import {l['componentName']} from \"../PageCreationFolder/{l['componentName']}\";"
            for l in selected_links
        ])
        
        # Generate links array
        links_array = ',\n'.join([
            f"""  {{
    name: "{l['pageName']}",
    icon: {l['icon']},
    path: "{l['pathName']}",
    component: {l['componentName']},
    description: "{l['description']}"
  }}"""
            for l in selected_links
        ])
        
        config_content = f"""// app/config/{config_var_name}.js
import {{ {icon_imports} }} from "lucide-react";

// Import components
{component_imports}

export const {config_var_name} = [
{links_array}
];
"""
        
        return {
            "success": True,
            "configName": config_name,
            "fileName": f"{config_var_name}.js",
            "content": config_content,
            "linkCount": len(selected_links)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating config: {str(e)}"
        )


@router.get("/stats")
async def get_stats():
    """
    Get statistics about stored links
    """
    try:
        links = read_links()
        
        # Count by icon
        icon_counts = {}
        for link in links:
            icon = link.get('icon', 'FileText')
            icon_counts[icon] = icon_counts.get(icon, 0) + 1
        
        return {
            "totalLinks": len(links),
            "iconBreakdown": icon_counts,
            "recentLinks": links[-5:] if len(links) > 5 else links
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting stats: {str(e)}"
        )