import os
import uuid
import shutil
import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import List
from PIL import Image as PILImage
import io

logger = logging.getLogger(__name__)

router = APIRouter()
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
MAX_DIMENSION = 4096


def get_image_dimensions(filepath: Path):
    try:
        with PILImage.open(filepath) as img:
            return img.width, img.height
    except Exception:
        return 0, 0


def convert_heic_to_jpeg(src: Path, dst: Path):
    """Convert HEIC/HEIF to JPEG using pillow-heif if available."""
    try:
        import pillow_heif
        pillow_heif.register_heif_opener()
        with PILImage.open(src) as img:
            img.save(dst, "JPEG", quality=95)
        return True
    except ImportError:
        logger.warning("pillow-heif not installed, HEIC conversion unavailable")
        return False


@router.post("/upload")
async def upload_images(files: List[UploadFile] = File(...)):
    """Upload one or more images."""
    uploaded = []
    errors = []

    for file in files:
        try:
            # Validate
            content_type = file.content_type or ""
            if content_type not in ALLOWED_TYPES and not file.filename.lower().endswith(
                (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif")
            ):
                errors.append({"filename": file.filename, "error": "Unsupported file type"})
                continue

            data = await file.read()
            if len(data) > MAX_FILE_SIZE:
                errors.append({"filename": file.filename, "error": "File too large (max 20MB)"})
                continue

            # Generate unique filename
            ext = Path(file.filename).suffix.lower()
            if ext in (".heic", ".heif"):
                ext = ".jpg"  # Will convert
            image_id = str(uuid.uuid4())
            safe_filename = f"{image_id}{ext}"
            dest_path = UPLOADS_DIR / safe_filename

            # Write file
            with open(dest_path, "wb") as f:
                f.write(data)

            # Handle HEIC conversion
            if file.filename.lower().endswith((".heic", ".heif")):
                jpg_path = UPLOADS_DIR / f"{image_id}.jpg"
                converted = convert_heic_to_jpeg(dest_path, jpg_path)
                if converted:
                    dest_path.unlink(missing_ok=True)
                    dest_path = jpg_path
                    safe_filename = f"{image_id}.jpg"

            # Get dimensions
            width, height = get_image_dimensions(dest_path)

            # Auto-resize if too large
            if width > MAX_DIMENSION or height > MAX_DIMENSION:
                try:
                    with PILImage.open(dest_path) as img:
                        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), PILImage.LANCZOS)
                        img.save(dest_path)
                        width, height = img.size
                except Exception as e:
                    logger.warning(f"Resize failed: {e}")

            uploaded.append({
                "id": image_id,
                "filename": safe_filename,
                "original_filename": file.filename,
                "width": width,
                "height": height,
                "url": f"/uploads/{safe_filename}",
                "annotations": [],
                "annotated": False,
                "auto_detected": False
            })

        except Exception as e:
            logger.error(f"Upload error for {file.filename}: {e}", exc_info=True)
            errors.append({"filename": file.filename, "error": str(e)})

    return JSONResponse({
        "uploaded": uploaded,
        "errors": errors,
        "count": len(uploaded)
    })


@router.delete("/{image_id}")
async def delete_image(image_id: str):
    """Delete an uploaded image."""
    from services.project_service import project_service

    # Find and delete file
    for ext in [".jpg", ".jpeg", ".png", ".webp"]:
        path = UPLOADS_DIR / f"{image_id}{ext}"
        if path.exists():
            path.unlink()
            break

    project_service.delete_image(image_id)
    return {"success": True, "image_id": image_id}


@router.get("/list")
async def list_images():
    """List all uploaded images."""
    images = []
    for f in UPLOADS_DIR.iterdir():
        if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp") and f.name != "project.json":
            images.append({
                "filename": f.name,
                "url": f"/uploads/{f.name}"
            })
    return {"images": images}
