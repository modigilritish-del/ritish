"""page_creation_routes.py"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import os

router = APIRouter()

# Smart path detection - works in both development and deployment
def get_page_creation_folder():
    """
    Automatically detects PageCreationFolder path
    Works in development and production/deployment
    """
    # Get current file's directory (backend/autoCreation/)
    current_file = Path(__file__).resolve()
    backend_folder = current_file.parent.parent  # Go up to backend folder
    
    # Go up one more level to project root
    project_root = backend_folder.parent
    
    # Path to PageCreationFolder (frontend/app/PageCreationFolder)
    page_folder = project_root / "frontend" / "app" / "PageCreationFolder"
    
    # Create folder if it doesn't exist
    page_folder.mkdir(parents=True, exist_ok=True)
    
    return page_folder

# Get the folder path
PAGE_CREATION_FOLDER = get_page_creation_folder()

class PageCreateRequest(BaseModel):
    fileName: str
    content: str

@router.post("/save-page")
async def save_page(request: PageCreateRequest):
    """
    Save a new page directly to PageCreationFolder
    No database required - just file system operations
    """
    try:
        # Create full file path
        file_path = PAGE_CREATION_FOLDER / request.fileName
        
        # Check if file already exists
        if file_path.exists():
            raise HTTPException(
                status_code=400,
                detail=f"File '{request.fileName}' already exists in PageCreationFolder"
            )
        
        # Write the file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(request.content)
        
        return {
            "success": True,
            "message": f"✅ Page saved successfully to PageCreationFolder",
            "fileName": request.fileName,
            "path": str(file_path)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error saving file: {str(e)}"
        )


@router.get("/list-pages")
async def list_pages():
    """
    List all .js files in PageCreationFolder
    """
    try:
        if not PAGE_CREATION_FOLDER.exists():
            return {"pages": []}
        
        # Get all .js files
        pages = [
            {
                "fileName": f.name,
                "createdAt": os.path.getctime(f)
            }
            for f in PAGE_CREATION_FOLDER.glob("*.js")
        ]
        
        return {
            "success": True,
            "pages": pages,
            "count": len(pages)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error listing files: {str(e)}"
        )


@router.delete("/delete-page/{file_name}")
async def delete_page(file_name: str):
    """
    Delete a page from PageCreationFolder
    """
    try:
        file_path = PAGE_CREATION_FOLDER / file_name
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"File '{file_name}' not found"
            )
        
        # Delete the file
        file_path.unlink()
        
        return {
            "success": True,
            "message": f"✅ Page '{file_name}' deleted successfully"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting file: {str(e)}"
        )