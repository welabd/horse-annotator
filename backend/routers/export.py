import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter()


class ExportRequest(BaseModel):
    name: str = "Horse Dataset"
    images: List[Dict[str, Any]]


@router.post("/")
async def export_dataset(req: ExportRequest):
    """Export annotated dataset as YOLO-format ZIP."""
    from services.export_service import export_service

    if not req.images:
        raise HTTPException(status_code=400, detail="No images to export")

    # Count annotated images
    annotated = [img for img in req.images if img.get("annotations")]
    if not annotated:
        raise HTTPException(status_code=400, detail="No annotated images to export")

    zip_path = export_service.export_dataset({
        "name": req.name,
        "images": req.images
    })

    import os
    filename = os.path.basename(zip_path)
    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
