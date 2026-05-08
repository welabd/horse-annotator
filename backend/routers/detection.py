import os
import logging
import urllib.request
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)


class DetectRequest(BaseModel):
    image_id: str
    filename: str
    url: Optional[str] = None  # Cloudinary URL
    confidence: Optional[float] = 0.35


@router.post("/")
async def detect_horses(req: DetectRequest):
    from services.yolo_service import yolo_service

    image_path = UPLOADS_DIR / req.filename

    # If file doesn't exist locally, download from URL (Cloudinary)
    if not image_path.exists():
        if req.url and req.url.startswith("http"):
            logger.info(f"Downloading image from URL: {req.url}")
            try:
                urllib.request.urlretrieve(req.url, str(image_path))
                logger.info(f"Downloaded to {image_path}")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Could not download image: {e}")
        else:
            raise HTTPException(status_code=404, detail=f"Image not found: {req.filename}")

    detections = await yolo_service.detect_horses(str(image_path))

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
    from services.yolo_service import yolo_service
    return yolo_service.get_model_info()
