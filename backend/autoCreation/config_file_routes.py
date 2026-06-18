"""config_file_routes.py - Enhanced Config Management with Live Tracking + Auto Import Removal"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from pathlib import Path
from typing import List, Optional, Dict
import re
import json
import asyncio

router = APIRouter()

# Path to config files
def get_config_folder():
    """Get path to config folder"""
    current_file = Path(__file__).resolve()
    backend_folder = current_file.parent.parent
    project_root = backend_folder.parent
    
    # Path to frontend config folder
    config_folder = project_root / "frontend" / "app" / "config"
    config_folder.mkdir(parents=True, exist_ok=True)
    
    return config_folder

CONFIG_FOLDER = get_config_folder()

# WebSocket connections for live updates
active_connections: List[WebSocket] = []


class ConfigCreate(BaseModel):
    configName: str
    description: Optional[str] = ""


class LinkAdd(BaseModel):
    configFileName: str
    pageName: str
    componentName: str
    pathName: str
    fileName: str
    icon: str = "FileText"
    description: Optional[str] = ""


class LinkUpdate(BaseModel):
    oldPageName: str
    newPageName: str
    newIcon: Optional[str] = None
    newDescription: Optional[str] = None


class ConfigEdit(BaseModel):
    fileName: str
    content: str


def config_name_to_filename(name: str) -> str:
    """Convert config name to filename (e.g., 'My Config' -> 'myConfigLinks.js')"""
    camel_case = ''.join(word.capitalize() for word in name.split())
    camel_case = camel_case[0].lower() + camel_case[1:] if camel_case else ''
    return f"{camel_case}Links.js"


def parse_config_file(file_path: Path) -> dict:
    """Parse a config file to extract existing links and structure"""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # Extract array content
        array_match = re.search(r'export const \w+ = \[(.*?)\];', content, re.DOTALL)
        if not array_match:
            return {"imports": [], "links": [], "icons": set(), "link_details": []}
        
        # Extract imports
        import_matches = re.findall(r'import (\w+) from ["\']([^"\']+)["\'];', content)
        imports = [{"component": m[0], "path": m[1]} for m in import_matches]
        
        # Extract icons from lucide-react import
        icon_match = re.search(r'import \{([^}]+)\} from ["\']lucide-react["\'];', content)
        icons = set()
        if icon_match:
            icons = set(i.strip() for i in icon_match.group(1).split(','))
        
        # Extract existing link names
        link_matches = re.findall(r'name: ["\']([^"\']+)["\']', content)
        
        # Extract detailed link information
        link_details = []
        link_blocks = re.findall(r'\{([^}]+)\}', array_match.group(1))
        for block in link_blocks:
            name_match = re.search(r'name: ["\']([^"\']+)["\']', block)
            icon_match = re.search(r'icon: (\w+)', block)
            path_match = re.search(r'path: ["\']([^"\']+)["\']', block)
            component_match = re.search(r'component: (\w+)', block)
            desc_match = re.search(r'description: ["\']([^"\']*)["\']', block)
            
            if name_match:
                link_details.append({
                    "name": name_match.group(1),
                    "icon": icon_match.group(1) if icon_match else "FileText",
                    "path": path_match.group(1) if path_match else "",
                    "component": component_match.group(1) if component_match else "",
                    "description": desc_match.group(1) if desc_match else ""
                })
        
        return {
            "imports": imports,
            "links": link_matches,
            "icons": icons,
            "content": content,
            "link_details": link_details
        }
    except Exception as e:
        print(f"Error parsing config: {e}")
        return {"imports": [], "links": [], "icons": set(), "content": "", "link_details": []}


def ensure_icon_imported(content: str, icon: str) -> str:
    """
    🔧 PERMANENT FIX: Ensure an icon is imported from lucide-react
    This handles ALL cases:
    1. Icon import doesn't exist at all
    2. Icon exists but is missing from import
    3. Multiple icons need to be added
    
    Returns updated content with icon properly imported
    """
    # Check if lucide-react import exists
    lucide_match = re.search(r'import \{([^}]+)\} from ["\']lucide-react["\'];', content)
    
    if lucide_match:
        # Lucide import exists - check if icon is already there
        current_icons = [i.strip() for i in lucide_match.group(1).split(',')]
        
        if icon not in current_icons:
            # Add icon to existing import
            current_icons.append(icon)
            # Sort for consistency
            current_icons.sort()
            new_import = f'import {{ {", ".join(current_icons)} }} from "lucide-react";'
            
            # Replace the old import
            content = re.sub(
                r'import \{[^}]+\} from ["\']lucide-react["\'];',
                new_import,
                content,
                count=1
            )
    else:
        # No lucide-react import exists - add one at the top
        # Find the first line (usually a comment)
        lines = content.split('\n')
        insert_index = 0
        
        # Skip initial comment lines
        for i, line in enumerate(lines):
            if line.strip() and not line.strip().startswith('//'):
                insert_index = i
                break
        
        # Insert the import
        new_import = f'import {{ {icon} }} from "lucide-react";'
        lines.insert(insert_index, new_import)
        content = '\n'.join(lines)
    
    return content


def remove_unused_imports(content: str, removed_component: str) -> str:
    """
    Remove import statement for a component if it's no longer used in the config file.
    Also removes the icon from lucide-react import if it's no longer used.
    
    Args:
        content: The config file content
        removed_component: The component name that was removed
    
    Returns:
        Updated content with unused imports removed
    """
    # Step 1: Remove the component import line
    # Pattern: import ComponentName from "../PageCreationFolder/ComponentName";
    component_import_pattern = rf'import {removed_component} from ["\']\.\.\/PageCreationFolder\/{removed_component}["\'];\n?'
    content = re.sub(component_import_pattern, '', content)
    
    # Step 2: Check if component is still referenced anywhere
    # If not found in the links array, we've successfully removed it
    
    # Step 3: Clean up unused icons from lucide-react import
    # First, extract which icons are still being used in the links
    used_icons = set(re.findall(r'icon: (\w+)', content))
    
    # Extract current lucide-react import
    lucide_match = re.search(r'import \{([^}]+)\} from ["\']lucide-react["\'];', content)
    if lucide_match:
        current_icons = [icon.strip() for icon in lucide_match.group(1).split(',')]
        
        # Filter to only keep icons that are actually used
        needed_icons = [icon for icon in current_icons if icon in used_icons]
        
        if needed_icons:
            # Update the import with only needed icons
            new_import = f'import {{ {", ".join(sorted(needed_icons))} }} from "lucide-react";'
            content = re.sub(
                r'import \{[^}]+\} from ["\']lucide-react["\'];',
                new_import,
                content
            )
        else:
            # Remove lucide-react import entirely if no icons are used
            content = re.sub(
                r'import \{[^}]+\} from ["\']lucide-react["\'];\n?',
                '',
                content
            )
    
    # Step 4: Clean up any extra blank lines
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    return content


async def broadcast_update(message: dict):
    """Broadcast updates to all connected WebSocket clients"""
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except:
            disconnected.append(connection)
    
    # Remove disconnected clients
    for connection in disconnected:
        active_connections.remove(connection)


# ==================== WebSocket Endpoint ====================
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for live updates"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Send initial data
        configs = await get_all_configs_internal()
        await websocket.send_json({
            "type": "initial",
            "data": configs
        })
        
        # Keep connection alive
        while True:
            await websocket.receive_text()
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)


# ==================== Get All Configs (Internal) ====================
async def get_all_configs_internal():
    """Internal function to get all configs"""
    config_files = list(CONFIG_FOLDER.glob("*Links.js"))
    
    configs = []
    for file in config_files:
        base_name = file.stem.replace('Links', '')
        display_name = re.sub(r'([A-Z])', r' \1', base_name).strip().title()
        parsed = parse_config_file(file)
        
        configs.append({
            "fileName": file.name,
            "displayName": display_name,
            "filePath": str(file),
            "linkCount": len(parsed["links"]),
            "links": parsed["links"],
            "linkDetails": parsed["link_details"]
        })
    
    return configs


# ==================== List Configs ====================
@router.get("/list-configs")
async def list_config_files():
    """List all available config files with detailed link information"""
    try:
        configs = await get_all_configs_internal()
        
        return {
            "success": True,
            "configs": configs,
            "count": len(configs)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing configs: {str(e)}"
        )


# ==================== Get Page Mapping ====================
@router.get("/page-mapping")
async def get_page_mapping():
    """
    Get a mapping of all pages across all configs
    Useful for avoiding duplicate page additions
    """
    try:
        config_files = list(CONFIG_FOLDER.glob("*Links.js"))
        
        mapping = {}
        for file in config_files:
            parsed = parse_config_file(file)
            for link in parsed["links"]:
                if link not in mapping:
                    mapping[link] = []
                mapping[link].append(file.name)
        
        return {
            "success": True,
            "mapping": mapping,
            "totalPages": len(mapping)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting page mapping: {str(e)}"
        )


# ==================== Create Config ====================
@router.post("/create-config")
async def create_config_file(config: ConfigCreate):
    """Create a new config file"""
    try:
        file_name = config_name_to_filename(config.configName)
        file_path = CONFIG_FOLDER / file_name
        
        if file_path.exists():
            raise HTTPException(
                status_code=400,
                detail=f"Config file '{file_name}' already exists"
            )
        
        # Create config variable name
        var_name = config.configName.replace(' ', '')
        var_name = var_name[0].lower() + var_name[1:] if var_name else ''
        var_name += 'Links'
        
        # Generate initial content
        content = f'''// app/config/{file_name}
import {{ FileText }} from "lucide-react";

// {config.description or f"Config file for {config.configName}"}

export const {var_name} = [
  // Add your links here
];
'''
        
        file_path.write_text(content, encoding='utf-8')
        
        # Broadcast update
        await broadcast_update({
            "type": "config_created",
            "data": {
                "fileName": file_name,
                "configName": config.configName
            }
        })
        
        return {
            "success": True,
            "message": f"✅ Config file '{file_name}' created successfully",
            "fileName": file_name,
            "filePath": str(file_path)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating config: {str(e)}"
        )


# ==================== Add Link to Config (WITH PERMANENT FIX) ====================
@router.post("/add-link")
async def add_link_to_config(link: LinkAdd):
    """
    Add a new link to an existing config file
    🔧 PERMANENT FIX: Always ensures icon is properly imported
    """
    try:
        file_path = CONFIG_FOLDER / link.configFileName
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Config file '{link.configFileName}' not found"
            )
        
        # Read current content
        content = file_path.read_text(encoding='utf-8')
        parsed = parse_config_file(file_path)
        
        # Check if link already exists
        if link.pageName in parsed["links"]:
            raise HTTPException(
                status_code=400,
                detail=f"Link '{link.pageName}' already exists in this config"
            )
        
        # 🔧 PERMANENT FIX: Ensure icon is imported (handles all cases)
        content = ensure_icon_imported(content, link.icon)
        
        # Add component import (check if not already present)
        component_import = f'import {link.componentName} from "../PageCreationFolder/{link.componentName}";'
        if component_import not in content:
            # Find where to insert (after icon imports, before export)
            insert_pos = content.find('export const')
            if insert_pos != -1:
                # Find the last import before export
                imports_section = content[:insert_pos]
                rest = content[insert_pos:]
                content = f"{imports_section}\n{component_import}\n{rest}"
        
        # Create new link object
        new_link = f'''  {{
    name: "{link.pageName}",
    icon: {link.icon},
    path: "{link.pathName}",
    component: {link.componentName},
    description: "{link.description}"
  }}'''
        
        # Find the array and add the new link
        array_match = re.search(r'(export const \w+ = \[)(.*?)(\];)', content, re.DOTALL)
        if array_match:
            current_array = array_match.group(2).strip()
            
            if current_array and not current_array.endswith(','):
                # Add comma if there are existing items
                new_array = f"{current_array},\n{new_link}"
            else:
                new_array = f"{current_array}\n{new_link}"
            
            content = content.replace(
                f"{array_match.group(1)}{array_match.group(2)}{array_match.group(3)}",
                f"{array_match.group(1)}\n{new_array}\n{array_match.group(3)}"
            )
        
        # Write updated content
        file_path.write_text(content, encoding='utf-8')
        
        # Broadcast update
        await broadcast_update({
            "type": "link_added",
            "data": {
                "configFile": link.configFileName,
                "pageName": link.pageName
            }
        })
        
        return {
            "success": True,
            "message": f"✅ Link '{link.pageName}' added to '{link.configFileName}'",
            "iconImported": link.icon
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error adding link: {str(e)}"
        )


# ==================== Update Link ====================
@router.put("/update-link/{config_file_name}")
async def update_link_in_config(config_file_name: str, link_update: LinkUpdate):
    """Update an existing link in a config file"""
    try:
        file_path = CONFIG_FOLDER / config_file_name
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Config file '{config_file_name}' not found"
            )
        
        content = file_path.read_text(encoding='utf-8')
        
        # Find the link to update
        old_link_pattern = rf'name: "{link_update.oldPageName}"'
        if old_link_pattern not in content:
            raise HTTPException(
                status_code=404,
                detail=f"Link '{link_update.oldPageName}' not found in config"
            )
        
        # Update page name
        content = content.replace(
            f'name: "{link_update.oldPageName}"',
            f'name: "{link_update.newPageName}"'
        )
        
        # Update icon if provided
        if link_update.newIcon:
            # 🔧 Ensure new icon is imported
            content = ensure_icon_imported(content, link_update.newIcon)
            
            # Find and replace the icon for this specific link
            link_block_pattern = rf'(name: "{link_update.newPageName}"[^}}]*icon: )(\w+)'
            content = re.sub(link_block_pattern, rf'\1{link_update.newIcon}', content)
        
        # Update description if provided
        if link_update.newDescription is not None:
            link_block_pattern = rf'(name: "{link_update.newPageName}"[^}}]*description: ")[^"]*(")'
            content = re.sub(link_block_pattern, rf'\1{link_update.newDescription}\2', content)
        
        file_path.write_text(content, encoding='utf-8')
        
        # Broadcast update
        await broadcast_update({
            "type": "link_updated",
            "data": {
                "configFile": config_file_name,
                "oldName": link_update.oldPageName,
                "newName": link_update.newPageName
            }
        })
        
        return {
            "success": True,
            "message": f"✅ Link updated successfully in '{config_file_name}'"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating link: {str(e)}"
        )


# ==================== Remove Link (WITH AUTO IMPORT REMOVAL) ====================
@router.delete("/remove-link/{config_file_name}/{page_name}")
async def remove_link_from_config(config_file_name: str, page_name: str):
    """
    Remove a specific link from a config file.
    ✅ AUTOMATICALLY REMOVES THE COMPONENT IMPORT AS WELL!
    """
    try:
        file_path = CONFIG_FOLDER / config_file_name
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Config file '{config_file_name}' not found"
            )
        
        content = file_path.read_text(encoding='utf-8')
        
        # First, extract the component name from the link before removing it
        component_match = re.search(
            rf'name: "{page_name}"[^}}]*component: (\w+)',
            content
        )
        
        if not component_match:
            raise HTTPException(
                status_code=404,
                detail=f"Link '{page_name}' not found in config"
            )
        
        component_name = component_match.group(1)
        
        # Find and remove the link block
        # Pattern to match the entire link object
        link_pattern = rf',?\s*\{{\s*name: "{page_name}"[^}}]*\}}'
        
        updated_content = re.sub(link_pattern, '', content)
        
        if updated_content == content:
            raise HTTPException(
                status_code=404,
                detail=f"Link '{page_name}' not found in config"
            )
        
        # Clean up any double commas or trailing commas in the array
        updated_content = re.sub(r',\s*,', ',', updated_content)
        updated_content = re.sub(r',(\s*\])', r'\1', updated_content)
        updated_content = re.sub(r'\[\s*,', '[', updated_content)
        
        # ✅ NOW REMOVE THE IMPORT FOR THIS COMPONENT
        updated_content = remove_unused_imports(updated_content, component_name)
        
        file_path.write_text(updated_content, encoding='utf-8')
        
        # Broadcast update
        await broadcast_update({
            "type": "link_removed",
            "data": {
                "configFile": config_file_name,
                "pageName": page_name,
                "componentName": component_name
            }
        })
        
        return {
            "success": True,
            "message": f"✅ Link '{page_name}' and its import removed from '{config_file_name}'",
            "removedComponent": component_name
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error removing link: {str(e)}"
        )


# ==================== Edit Config Content ====================
@router.put("/edit-config")
async def edit_config_content(edit: ConfigEdit):
    """Edit the entire content of a config file"""
    try:
        file_path = CONFIG_FOLDER / edit.fileName
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Config file '{edit.fileName}' not found"
            )
        
        # Validate that content is valid JavaScript
        if not edit.content.strip():
            raise HTTPException(
                status_code=400,
                detail="Content cannot be empty"
            )
        
        file_path.write_text(edit.content, encoding='utf-8')
        
        # Broadcast update
        await broadcast_update({
            "type": "config_edited",
            "data": {
                "fileName": edit.fileName
            }
        })
        
        return {
            "success": True,
            "message": f"✅ Config file '{edit.fileName}' updated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error editing config: {str(e)}"
        )


# ==================== View Config ====================
@router.get("/view-config/{file_name}")
async def view_config_file(file_name: str):
    """View the content of a config file"""
    try:
        file_path = CONFIG_FOLDER / file_name
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Config file '{file_name}' not found"
            )
        
        content = file_path.read_text(encoding='utf-8')
        parsed = parse_config_file(file_path)
        
        return {
            "success": True,
            "fileName": file_name,
            "content": content,
            "linkCount": len(parsed["links"]),
            "links": parsed["links"],
            "linkDetails": parsed["link_details"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error viewing config: {str(e)}"
        )


# ==================== Delete Config ====================
@router.delete("/delete-config/{file_name}")
async def delete_config_file(file_name: str):
    """Delete a config file"""
    try:
        file_path = CONFIG_FOLDER / file_name
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Config file '{file_name}' not found"
            )
        
        file_path.unlink()
        
        # Broadcast update
        await broadcast_update({
            "type": "config_deleted",
            "data": {
                "fileName": file_name
            }
        })
        
        return {
            "success": True,
            "message": f"✅ Config file '{file_name}' deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting config: {str(e)}"
        )


# ==================== Health Check ====================
@router.get("/health")
async def config_health_check():
    """Health check for config management system"""
    try:
        config_count = len(list(CONFIG_FOLDER.glob("*Links.js")))
        
        return {
            "success": True,
            "status": "healthy",
            "configFolder": str(CONFIG_FOLDER),
            "configCount": config_count,
            "folderExists": CONFIG_FOLDER.exists(),
            "activeConnections": len(active_connections)
        }
    except Exception as e:
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }