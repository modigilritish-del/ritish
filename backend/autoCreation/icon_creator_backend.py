# icon_creator_backend.py
# FIXED VERSION - Proper JSX style syntax with double curly braces

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import re
import json
import requests
from datetime import datetime

router = APIRouter(prefix="/api/icons", tags=["Icon Creator"])

# ==================== CONFIGURATION ====================
API_BASE = "http://localhost:8000/api"  # Backend API base URL

# ==================== SMART PATH DETECTION ====================
def get_paths():
    """Auto-detect project paths"""
    current_file = Path(__file__).resolve()
    backend_folder = current_file.parent.parent
    project_root = backend_folder.parent
    frontend = project_root / "frontend" / "app"
    
    return {
        "icons": frontend / "icons",
        "config": frontend / "config",
        "utils": frontend / "utils",
        "components": frontend / "components"
    }

PATHS = get_paths()

# ==================== MODELS ====================
class CreateIconRequest(BaseModel):
    iconName: str
    displayName: str
    iconPath: str
    configFiles: List[str]

class UpdateIconRequest(BaseModel):
    displayName: Optional[str] = None
    configFiles: Optional[List[str]] = None

# ==================== HELPER FUNCTIONS ====================

def to_camel_case(text: str) -> str:
    """Convert to camelCase"""
    words = re.findall(r'[A-Z][a-z]*|[a-z]+', text)
    if not words:
        return text
    return words[0].lower() + ''.join(word.capitalize() for word in words[1:])

def to_pascal_case(text: str) -> str:
    """Convert to PascalCase"""
    words = re.findall(r'[A-Za-z0-9]+', text)
    return ''.join(word.capitalize() for word in words)

def to_kebab_case(text: str) -> str:
    """Convert to kebab-case"""
    words = re.findall(r'[A-Z][a-z]*|[a-z]+', text)
    return '-'.join(words).lower()

def extract_config_var_name(config_content: str) -> Optional[str]:
    """Extract variable name from config file"""
    match = re.search(r'export\s+const\s+(\w+)\s*=', config_content)
    if match:
        return match.group(1)
    # FIX: Explicit Optional[str] return type with None
    return None

def parse_config_file(config_path: Path) -> dict:
    """Parse config file to extract links"""
    try:
        content = config_path.read_text(encoding='utf-8')
        
        # Extract variable name
        var_name = extract_config_var_name(content)
        
        # Extract link details
        link_pattern = r'\{\s*name:\s*["\']([^"\']+)["\'][^}]*path:\s*["\']([^"\']+)["\'][^}]*description:\s*["\']([^"\']*)["\']'
        links = re.findall(link_pattern, content, re.DOTALL)
        
        return {
            "varName": var_name,
            "linkCount": len(links),
            "links": [{"name": l[0], "path": l[1], "description": l[2]} for l in links]
        }
    except Exception as e:
        return {"varName": None, "linkCount": 0, "links": []}

# ==================== AUTO-SYNC FUNCTION ====================

def sync_pages_to_backend(icon_name: str, display_name: str, config_files: List[str]) -> dict:
    """
    ✅ AUTOMATIC PAGE SYNC - Syncs all pages from selected config files to backend
    This is called automatically when an icon is created
    """
    try:
        print(f"🔄 [SYNC] Starting auto-sync for icon: {display_name}")
        
        all_pages_to_sync = []
        category_name = display_name  # Use display name as category
        
        # Parse each selected config file
        for config_file in config_files:
            config_path = PATHS["config"] / config_file
            if not config_path.exists():
                print(f"⚠️ [SYNC] Config file not found: {config_file}")
                continue
            
            parsed = parse_config_file(config_path)
            
            # Create page entries for each link
            for link in parsed.get("links", []):
                page_entry = {
                    "page_name": link["name"],
                    "page_url": f"/{to_kebab_case(icon_name)}/{link['path']}",
                    "icon_name": "FileText",  # Default icon
                    "category": category_name,
                    "description": link.get("description", f"{link['name']} - {display_name}")
                }
                all_pages_to_sync.append(page_entry)
                print(f"  ➕ [SYNC] Adding: {page_entry['page_name']}")
        
        if not all_pages_to_sync:
            print("⚠️ [SYNC] No pages to sync")
            return {"synced": 0, "error": "No pages found in config files"}
        
        # Send to backend sync endpoint
        print(f"📡 [SYNC] Sending {len(all_pages_to_sync)} pages to backend...")
        
        try:
            response = requests.post(
                f"{API_BASE}/sync-pages-from-frontend",
                json={"pages": all_pages_to_sync},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ [SYNC] Success! Synced: {result.get('synced_count', 0)} pages")
                return result
            else:
                error_msg = f"Backend returned {response.status_code}"
                print(f"❌ [SYNC] Error: {error_msg}")
                return {"synced": 0, "error": error_msg}
                
        except requests.exceptions.ConnectionError:
            print("❌ [SYNC] Cannot connect to backend. Is it running?")
            return {"synced": 0, "error": "Backend not reachable"}
        except Exception as e:
            print(f"❌ [SYNC] Request error: {str(e)}")
            return {"synced": 0, "error": str(e)}
            
    except Exception as e:
        print(f"❌ [SYNC] Sync failed: {str(e)}")
        return {"synced": 0, "error": str(e)}

# ==================== FILE GENERATORS ====================

def generate_icon_component(icon_name: str, display_name: str, links_var_name: str) -> str:
    """Generate icon master component - FIXED JSX style syntax"""
    # Build the component using string concatenation to avoid f-string escaping issues
    component = f"""// app/icons/{icon_name}.js
"use client";
import {{ usePanelWidth }} from "../context/PanelWidthContext";
import {{ {links_var_name} }} from "../config/{links_var_name}";

export default function {icon_name}() {{
  const {{ addTab }} = usePanelWidth();

  const handleItemClick = (item) => {{
    addTab(item.path, item.name);
  }};

  return (
    <div style={{{{ padding: "20px", width: "100%", height: "100%", overflow: "auto" }}}}>
      {{/* Page Header */}}
      <div style={{{{ marginBottom: "30px" }}}}>
        <h1 style={{{{ fontSize: "24px", fontWeight: "600", color: "#333", marginBottom: "8px" }}}}>
          🎨 {display_name}
        </h1>
        <p style={{{{ fontSize: "14px", color: "#666" }}}}>
          Manage {display_name.lower()} settings and configurations
        </p>
      </div>

      {{/* Grid Layout */}}
      <div
        style={{{{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "16px",
        }}}}
      >
        {{{links_var_name}.map((item) => {{
          const Icon = item.icon;
          return (
            <div
              key={{item.name}}
              onClick={{() => handleItemClick(item)}}
              style={{{{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "16px",
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}}}
              onMouseEnter={{(e) => {{
                e.currentTarget.style.background = "#f8f9fa";
                e.currentTarget.style.borderColor = "#8b5cf6";
              }}}}
              onMouseLeave={{(e) => {{
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#e0e0e0";
              }}}}
            >
              <div
                style={{{{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}}}
              >
                <Icon size={{20}} color="white" />
              </div>
              <div style={{{{ flex: 1 }}}}>
                <div style={{{{ fontSize: "14px", fontWeight: "600", color: "#333" }}}}>
                  {{item.name}}
                </div>
              </div>
            </div>
          );
        }})}}
      </div>
    </div>
  );
}}
"""
    return component

def generate_icon_links_file(links_var_name: str, config_files: List[str]) -> str:
    """Generate combined links file from selected configs"""
    
    # Collect all imports and links
    all_icons = set()
    all_component_imports = []
    all_links = []
    
    for config_file in config_files:
        config_path = PATHS["config"] / config_file
        if not config_path.exists():
            continue
        
        content = config_path.read_text(encoding='utf-8')
        
        # Extract icons
        icon_match = re.search(r'import \{([^}]+)\} from ["\']lucide-react["\'];', content)
        if icon_match:
            icons = [i.strip() for i in icon_match.group(1).split(',')]
            all_icons.update(icons)
        
        # Extract component imports
        import_matches = re.findall(r'import (\w+) from ["\']([^"\']+)["\'];', content)
        for comp_name, comp_path in import_matches:
            if 'lucide-react' not in comp_path:
                all_component_imports.append(f'import {comp_name} from "{comp_path}";')
        
        # Extract links
        array_match = re.search(r'export const \w+ = \[(.*?)\];', content, re.DOTALL)
        if array_match:
            links_content = array_match.group(1).strip()
            if links_content:
                all_links.append(links_content)
    
    # Generate final file
    icon_imports = ', '.join(sorted(all_icons)) if all_icons else 'FileText'
    component_imports = '\n'.join(all_component_imports)
    combined_links = ',\n'.join(all_links)
    
    return f'''// app/config/{links_var_name}.js
import {{ {icon_imports} }} from "lucide-react";

// Import components
{component_imports}

export const {links_var_name} = [
{combined_links}
];
'''

# ==================== UPDATE SYSTEM FILES ====================

def update_icon_loader(icon_name: str, display_name: str, icon_path: str, links_var_name: str):
    """Update iconLoader.js to register new icon - FIXED: Check for duplicates"""
    icon_loader_path = PATHS["utils"] / "iconLoader.js"
    
    if not icon_loader_path.exists():
        raise Exception("iconLoader.js not found")
    
    content = icon_loader_path.read_text(encoding='utf-8')
    
    # ✅ Check if import already exists
    import_line = f"import {{ {links_var_name} }} from '../config/{links_var_name}';"
    if import_line in content:
        print(f"⚠️ Import for {links_var_name} already exists in iconLoader.js - Skipping import")
    else:
        # Add import at top
        # Find the last import
        last_import_match = list(re.finditer(r"import .+ from ['\"]\.\.\/config\/\w+['\"];", content))
        if last_import_match:
            insert_pos = last_import_match[-1].end()
            content = content[:insert_pos] + "\n" + import_line + content[insert_pos:]
            print(f"✅ Added import for {links_var_name}")
    
    # ✅ Check if icon entry already exists
    icon_entry_check = f"name: '{icon_name}'"
    if icon_entry_check in content:
        print(f"⚠️ Icon entry for '{icon_name}' already exists in iconLoader.js - Skipping entry")
        return
    
    # Add to iconPages array
    new_entry = f'''  {{
    name: '{icon_name}',
    path: 'icon-{icon_path}',
    displayName: '{display_name}',
    links: {links_var_name},
    component: null,
  }},'''
    
    # Find closing of iconPages array
    array_match = re.search(r'export const iconPages = \[(.*?)\];', content, re.DOTALL)
    if array_match:
        # Insert before the closing bracket
        insert_point = content.find('];', array_match.start())
        content = content[:insert_point] + new_entry + "\n" + content[insert_point:]
    
    icon_loader_path.write_text(content, encoding='utf-8')
    print(f"✅ Added icon entry for {icon_name} in iconLoader.js")


def update_page_links_config(icon_name: str, display_name: str, links_var_name: str):
    """Update PageLinksConfig.js to include new icon - FIXED: Check for duplicates"""
    config_path = PATHS["config"] / "PageLinksConfig.js"
    
    if not config_path.exists():
        raise Exception("PageLinksConfig.js not found")
    
    content = config_path.read_text(encoding='utf-8')
    
    # ✅ Check if getter function already exists
    getter_function_name = f"const get{icon_name}Links"
    if getter_function_name in content:
        print(f"⚠️ Getter function 'get{icon_name}Links' already exists in PageLinksConfig.js - Skipping")
        return
    
    # Generate getter function
    getter_function = f'''
const get{icon_name}Links = () => {{
  try {{
    const {{ {links_var_name} }} = require('./{links_var_name}');
    console.log('🎨 [CONFIG] {icon_name} Links loaded:', {links_var_name}.length);
    console.log('📋 [CONFIG] {icon_name} Pages:', {links_var_name}.map(l => l.name));
    return {links_var_name} || [];
  }} catch (error) {{
    console.warn('⚠️ {icon_name} links not available:', error.message);
    return [];
  }}
}};
'''
    
    # Insert getter before getAllPagesForSync
    insert_pos = content.find('export const getAllPagesForSync')
    if insert_pos > 0:
        content = content[:insert_pos] + getter_function + "\n" + content[insert_pos:]
    
    config_path.write_text(content, encoding='utf-8')
    print(f"✅ Updated PageLinksConfig.js with get{icon_name}Links")


# ==================== API ENDPOINTS ====================

@router.post("/create-icon")
async def create_icon(request: CreateIconRequest):
    """
    Create a new icon page with auto-sync to backend
    This will:
    1. Generate icon component file (with Master suffix)
    2. Generate links config file
    3. Update iconLoader.js
    4. Update PageLinksConfig.js
    5. Auto-sync all pages to backend RBAC system
    """
    try:
        # Validate
        if not request.iconName or not request.displayName:
            raise HTTPException(status_code=400, detail="Icon name and display name required")
        
        if not request.configFiles:
            raise HTTPException(status_code=400, detail="At least one config file required")
        
        # Format names - ADD MASTER SUFFIX
        icon_name_pascal = to_pascal_case(request.iconName)
        # ✅ Add "Master" suffix if not already present
        if not icon_name_pascal.endswith("Master"):
            icon_name_pascal = icon_name_pascal + "Master"
        
        icon_path = request.iconPath or to_kebab_case(request.iconName)
        links_var_name = to_camel_case(request.iconName) + "Links"
        
        # Create directories
        PATHS["icons"].mkdir(parents=True, exist_ok=True)
        PATHS["config"].mkdir(parents=True, exist_ok=True)
        
        # Check if exists
        icon_file_path = PATHS["icons"] / f"{icon_name_pascal}.js"
        if icon_file_path.exists():
            raise HTTPException(status_code=400, detail=f"Icon '{icon_name_pascal}' already exists")
        
        # Generate icon component
        icon_content = generate_icon_component(icon_name_pascal, request.displayName, links_var_name)
        icon_file_path.write_text(icon_content, encoding='utf-8')
        
        # Generate links config
        links_file_path = PATHS["config"] / f"{links_var_name}.js"
        links_content = generate_icon_links_file(links_var_name, request.configFiles)
        links_file_path.write_text(links_content, encoding='utf-8')
        
        # Update all system files
        update_icon_loader(icon_name_pascal, request.displayName, icon_path, links_var_name)
        update_page_links_config(icon_name_pascal, request.displayName, links_var_name)
        
        # ✅ AUTO-SYNC PAGES TO BACKEND
        sync_result = sync_pages_to_backend(icon_name_pascal, request.displayName, request.configFiles)
        
        # Count total links
        total_links = 0
        for config_file in request.configFiles:
            config_path = PATHS["config"] / config_file
            if config_path.exists():
                parsed = parse_config_file(config_path)
                total_links += parsed["linkCount"]
        
        return {
            "success": True,
            "message": f"✅ Icon '{request.displayName}' created and pages synced successfully",
            "details": {
                "iconName": icon_name_pascal,
                "iconFile": f"{icon_name_pascal}.js",
                "configFile": f"{links_var_name}.js",
                "path": f"icon-{icon_path}",
                "totalLinks": total_links,
                "syncedPages": sync_result.get("synced", 0),
                "syncError": sync_result.get("error"),
                "filesUpdated": [
                    f"icons/{icon_name_pascal}.js",
                    f"config/{links_var_name}.js",
                    "utils/iconLoader.js",
                    "config/PageLinksConfig.js"
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating icon: {str(e)}")


@router.get("/list-icons")
async def list_icons():
    """List all created icon pages with config file details"""
    try:
        if not PATHS["icons"].exists():
            return {"success": True, "icons": []}
        
        icons = []
        for file_path in PATHS["icons"].glob("*.js"):
            if file_path.name.startswith('_'):
                continue
            
            content = file_path.read_text(encoding='utf-8')
            
            # Extract display name
            display_match = re.search(r'<h1[^>]*>([^<]+)</h1>', content)
            display_name = display_match.group(1).strip() if display_match else file_path.stem
            display_name = display_name.replace('🎨', '').strip()
            
            # Extract path
            path_match = re.search(r"path:\s*'icon-([^']+)'", content)
            path = path_match.group(1) if path_match else file_path.stem.lower()
            
            # Extract links variable name and find corresponding config file
            links_var_match = re.search(r'import \{ (\w+) \} from "../config/(\w+)";', content)
            config_files = []
            total_links = 0
            
            if links_var_match:
                links_var = links_var_match.group(1)
                config_file_name = links_var_match.group(2) + ".js"
                config_path = PATHS["config"] / config_file_name
                
                if config_path.exists():
                    # Parse the config file to get actual source files
                    config_content = config_path.read_text(encoding='utf-8')
                    
                    # Find all imported config files (the actual source files)
                    # Pattern: ...abcLinks or ...analysisLinks etc
                    spread_imports = re.findall(r'\.\.\.\s*(\w+Links)', config_content)
                    
                    if spread_imports:
                        # This config aggregates other configs
                        for source_var in spread_imports:
                            # Convert varName to fileName (e.g., abcLinks -> abcLinks.js)
                            source_file = source_var[0].lower() + source_var[1:] + ".js"
                            config_files.append(source_file)
                    else:
                        # This is a direct config file
                        config_files.append(config_file_name)
                    
                    # Count total links
                    parsed = parse_config_file(config_path)
                    total_links = parsed["linkCount"]
            
            icons.append({
                "fileName": file_path.name,
                "displayName": display_name,
                "path": path,
                "configFiles": config_files,
                "totalLinks": total_links,
                "createdAt": datetime.fromtimestamp(file_path.stat().st_ctime).isoformat()
            })
        
        return {"success": True, "icons": icons, "count": len(icons)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing icons: {str(e)}")


@router.delete("/delete-icon/{file_name}")
async def delete_icon(file_name: str):
    """
    Delete an icon and clean up all related files
    This will:
    1. Delete icon component file
    2. Delete associated config file
    3. Remove from iconLoader.js
    4. Remove from PageLinksConfig.js
    """
    try:
        icon_file_path = PATHS["icons"] / file_name
        
        if not icon_file_path.exists():
            raise HTTPException(status_code=404, detail=f"Icon file '{file_name}' not found")
        
        # Read icon file to find config file
        content = icon_file_path.read_text(encoding='utf-8')
        links_var_match = re.search(r'import \{ (\w+) \} from "../config/(\w+)";', content)
        
        config_file_name = None
        config_base_name = None
        links_var = None
        if links_var_match:
            # FIX: Store all values before using them
            links_var = links_var_match.group(1)
            config_base_name = links_var_match.group(2)
            config_file_name = config_base_name + ".js"
        
        # Delete icon file
        icon_file_path.unlink()
        print(f"✅ Deleted icon file: {file_name}")
        
        # Delete config file if found
        if config_file_name:
            config_path = PATHS["config"] / config_file_name
            if config_path.exists():
                config_path.unlink()
                print(f"✅ Deleted config file: {config_file_name}")
        
        # Remove from iconLoader.js
        icon_loader_path = PATHS["utils"] / "iconLoader.js"
        if icon_loader_path.exists():
            loader_content = icon_loader_path.read_text(encoding='utf-8')
            
            # Remove import line
            # FIX: Use config_base_name instead of accessing links_var_match.group(2)
            if config_file_name and links_var and config_base_name:
                import_pattern = f"import {{ {links_var} }} from '../config/{config_base_name}';"
                loader_content = loader_content.replace(import_pattern, '')
                loader_content = loader_content.replace(import_pattern.replace("'", '"'), '')
            
            # Remove icon entry from array
            icon_name = file_name.replace('.js', '')
            # Find and remove the icon object
            pattern = r'\s*{\s*name:\s*["\']' + icon_name + r'["\'].*?},?\s*'
            loader_content = re.sub(pattern, '', loader_content, flags=re.DOTALL)
            
            icon_loader_path.write_text(loader_content, encoding='utf-8')
            print(f"✅ Removed from iconLoader.js")
        
        # Remove from PageLinksConfig.js
        page_links_path = PATHS["config"] / "PageLinksConfig.js"
        if page_links_path.exists():
            page_content = page_links_path.read_text(encoding='utf-8')
            
            # Remove getter function
            icon_name = file_name.replace('.js', '')
            getter_pattern = r'const get' + icon_name + r'Links.*?};'
            page_content = re.sub(getter_pattern, '', page_content, flags=re.DOTALL)
            
            page_links_path.write_text(page_content, encoding='utf-8')
            print(f"✅ Removed from PageLinksConfig.js")
        
        return {
            "success": True,
            "message": f"✅ Icon '{file_name}' and all related files deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting icon: {str(e)}")


@router.put("/edit-icon/{file_name}")
async def edit_icon(file_name: str, new_display_name: str):
    """
    Edit icon display name
    Updates the display name in the icon component file
    """
    try:
        icon_file_path = PATHS["icons"] / file_name
        
        if not icon_file_path.exists():
            raise HTTPException(status_code=404, detail=f"Icon file '{file_name}' not found")
        
        if not new_display_name or not new_display_name.strip():
            raise HTTPException(status_code=400, detail="Display name cannot be empty")
        
        # Read and update icon file
        content = icon_file_path.read_text(encoding='utf-8')
        
        # Update display name in h1 tag
        content = re.sub(
            r'(<h1[^>]*>)\s*🎨\s*([^<]+)(</h1>)',
            f'\\1🎨 {new_display_name.strip()}\\3',
            content
        )
        
        # Update in paragraph description
        content = re.sub(
            r'(Manage\s+)([^<]+?)(\s+settings and configurations)',
            f'\\1{new_display_name.strip().lower()}\\3',
            content
        )
        
        icon_file_path.write_text(content, encoding='utf-8')
        
        return {
            "success": True,
            "message": f"✅ Icon display name updated to '{new_display_name}'"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error editing icon: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check"""
    try:
        icon_count = len(list(PATHS["icons"].glob("*.js"))) if PATHS["icons"].exists() else 0
        
        return {
            "success": True,
            "status": "healthy",
            "paths": {
                "icons": str(PATHS["icons"]),
                "config": str(PATHS["config"])
            },
            "iconCount": icon_count
        }
    except Exception as e:
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }


@router.get("/list-config-files")
async def list_config_files():
    """List all available config files for selection"""
    try:
        if not PATHS["config"].exists():
            return {"success": True, "configs": []}
        
        configs = []
        
        # Get all *Links.js files (but exclude aggregator files)
        for config_file in PATHS["config"].glob("*Links.js"):
            if config_file.name.startswith('_'):
                continue
            
            # Parse the config file
            parsed = parse_config_file(config_file)
            
            # Check if this is an aggregator file (contains spread operators)
            content = config_file.read_text(encoding='utf-8')
            is_aggregator = bool(re.search(r'\.\.\.\w+Links', content))
            
            # Only include non-aggregator files (actual source configs)
            if not is_aggregator:
                configs.append({
                    "fileName": config_file.name,
                    "varName": parsed["varName"],
                    "linkCount": parsed["linkCount"],
                    "links": parsed["links"][:5] if len(parsed["links"]) > 5 else parsed["links"],  # Preview first 5
                    "hasMore": len(parsed["links"]) > 5
                })
        
        return {
            "success": True,
            "configs": configs,
            "count": len(configs)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing config files: {str(e)}")