import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOADS_DIR = Path("uploads")


class DetectRequest(BaseModel):
    image_id: str
    filename: str
    confidence: Optional[float] = 0.35


@router.post("/")
async def detect_horses(req: DetectRequest):
    """Run YOLO horse detection on an uploaded image."""
    from services.yolo_service import yolo_service

    image_path = UPLOADS_DIR / req.filename
    if not image_path.exists():
        raise HTTPException(status_code=404, detail=f"Image not found: {req.filename}")

    detections = await yolo_service.detect_horses(str(image_path))

    # Assign unique IDs
    import uuid
    for i, det in enumerate(detections):
        det["id"] = str(uuid.uuid4())

    return {
        "image_id": req.image_id,
        "filename": req.filename,
        "detections": detections,
        "count": len(detections)
    }


@router.get("/model-info")
async def get_model_info():
    """Get YOLO model information."""
    from services.yolo_service import yolo_service
    return yolo_service.get_model_info()
