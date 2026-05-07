import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)
router = APIRouter()


class ProjectSaveRequest(BaseModel):
    name: Optional[str] = "Horse Annotation Project"
    images: List[Dict[str, Any]]


class AnnotationUpdateRequest(BaseModel):
    image_id: str
    annotations: List[Dict[str, Any]]


@router.get("/")
async def get_project():
    """Get current project state."""
    from services.project_service import project_service
    return project_service.get_project()


@router.post("/save")
async def save_project(req: ProjectSaveRequest):
    """Save entire project state."""
    from services.project_service import project_service
    result = project_service.save_project(req.dict())
    return {"success": True, "project": result}


@router.post("/annotations")
async def update_annotations(req: AnnotationUpdateRequest):
    """Update annotations for a specific image."""
    from services.project_service import project_service
    result = project_service.update_image_annotations(req.image_id, req.annotations)
    if not result:
        raise HTTPException(status_code=404, detail=f"Image {req.image_id} not found in project")
    return {"success": True, "image": result}


@router.post("/add-image")
async def add_image(image_data: Dict[str, Any]):
    """Add a new image to the project."""
    from services.project_service import project_service
    result = project_service.add_image(image_data)
    return {"success": True, "project": result}


@router.delete("/image/{image_id}")
async def remove_image(image_id: str):
    """Remove image from project."""
    from services.project_service import project_service
    success = project_service.delete_image(image_id)
    return {"success": success}


@router.get("/stats")
async def get_stats():
    """Get project statistics."""
    from services.project_service import project_service
    return project_service.get_stats()
