import os
import sys
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Ensure directories exist
for d in ["uploads", "exports", "models"]:
    os.makedirs(d, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🐴 Horse Annotator API starting up...")
    # Pre-load YOLO model
    from services.yolo_service import yolo_service
    await yolo_service.load_model()
    logger.info("✅ YOLO model ready")
    yield
    logger.info("🐴 Horse Annotator API shutting down...")


app = FastAPI(
    title="Horse Annotator API",
    description="YOLO-based horse detection and annotation tool",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Routers
from routers import images, detection, export, project

app.include_router(images.router, prefix="/api/images", tags=["Images"])
app.include_router(detection.router, prefix="/api/detect", tags=["Detection"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(project.router, prefix="/api/project", tags=["Project"])

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Horse Annotator API"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True, log_level="info")
