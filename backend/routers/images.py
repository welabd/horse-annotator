import os
import uuid
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

ALLOWED_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif")
MAX_FILE_SIZE = 20 * 1024 * 1024
MAX_DIMENSION = 4096

USE_CLOUDINARY = os.environ.get("USE_CLOUDINARY", "false").lower() == "true"

if USE_CLOUDINARY:
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(
        cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
        api_key=os.environ.get("CLOUDINARY_API_KEY"),
        api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
        secure=True
    )


def upload_to_cloudinary(data: bytes, filename: str) -> str:
    result = cloudinary.uploader.upload(
        data,
        public_id=f"horse-annotator/{Path(filename).stem}",
        overwrite=True,
        resource_type="image"
    )
    return result["secure_url"]


def get_image_dimensions(data: bytes):
    try:
        with PILImage.open(io.BytesIO(data)) as img:
            return img.width, img.height
    except Exception:
        return 0, 0


def resize_if_needed(data: bytes) -> bytes:
    try:
        with PILImage.open(io.BytesIO(data)) as img:
            if img.width > MAX_DIMENSION or img.height > MAX_DIMENSION:
                img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), PILImage.LANCZOS)
                buf = io.BytesIO()
                fmt = img.format or "JPEG"
                img.save(buf, format=fmt)
                return buf.getvalue()
    except Exception:
        pass
    return data


@router.post("/upload")
async def upload_images(files: List[UploadFile] = File(...)):
    uploaded = []
    errors = []

    for file in files:
        try:
            ext = Path(file.filename).suffix.lower()
            if ext not in ALLOWED_EXTENSIONS:
                errors.append({"filename": file.filename, "error": "Unsupported file type"})
                continue

            data = await file.read()
            if len(data) > MAX_FILE_SIZE:
                errors.append({"filename": file.filename, "error": "File too large (max 20MB)"})
                continue

            data = resize_if_needed(data)
            width, height = get_image_dimensions(data)

            image_id = str(uuid.uuid4())
            safe_ext = ".jpg" if ext in (".heic", ".heif") else ext
            safe_filename = f"{image_id}{safe_ext}"

            if USE_CLOUDINARY:
                image_url = upload_to_cloudinary(data, safe_filename)
                local_path = UPLOADS_DIR / safe_filename
                with open(local_path, "wb") as f:
                    f.write(data)
            else:
                local_path = UPLOADS_DIR / safe_filename
                with open(local_path, "wb") as f:
                    f.write(data)
                image_url = f"/uploads/{safe_filename}"

            uploaded.append({
                "id": image_id,
                "filename": safe_filename,
                "original_filename": file.filename,
                "width": width,
                "height": height,
                "url": image_url,
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
    from services.project_service import project_service
    for ext in [".jpg", ".jpeg", ".png", ".webp"]:
        path = UPLOADS_DIR / f"{image_id}{ext}"
        if path.exists():
            path.unlink()
            break
    if USE_CLOUDINARY:
        try:
            cloudinary.uploader.destroy(f"horse-annotator/{image_id}")
        except Exception:
            pass
    project_service.delete_image(image_id)
    return {"success": True, "image_id": image_id}


@router.get("/list")
async def list_images():
    images = []
    for f in UPLOADS_DIR.iterdir():
        if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
            images.append({"filename": f.name, "url": f"/uploads/{f.name}"})
    return {"images": images}