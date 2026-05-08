import os
import asyncio
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

HORSE_CLASS_ID = 17
CONFIDENCE_THRESHOLD = float(os.environ.get("DETECTION_CONFIDENCE", "0.15"))
MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "yolov8n.pt")


class YOLOService:
    def __init__(self):
        self.model = None
        self.model_loaded = False

    async def load_model(self):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._load_model_sync)

    def _load_model_sync(self):
        try:
            import torch
            torch.set_num_threads(1)
            from ultralytics import YOLO
            logger.info(f"Loading YOLO model: {MODEL_PATH}")
            self.model = YOLO(MODEL_PATH)
            dummy = np.zeros((320, 320, 3), dtype=np.uint8)
            self.model(dummy, imgsz=320, verbose=False)
            self.model_loaded = True
            logger.info("✅ YOLO model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load YOLO model: {e}")
            self.model_loaded = False

    async def detect_horses(self, image_path: str) -> List[Dict[str, Any]]:
        if not self.model_loaded:
            logger.warning("Model not loaded, attempting reload...")
            await self.load_model()
        if not self.model_loaded:
            return []
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._detect_sync, image_path)

    def _detect_sync(self, image_path: str) -> List[Dict[str, Any]]:
        try:
            import cv2
            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"Could not read image: {image_path}")
                return []
            h, w = img.shape[:2]
            results = self.model(image_path, conf=CONFIDENCE_THRESHOLD, verbose=False, imgsz=320)
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue
                for i, box in enumerate(boxes):
                    cls_id = int(box.cls[0].item())
                    if cls_id != HORSE_CLASS_ID:
                        continue
                    conf = float(box.conf[0].item())
                    xywhn = box.xywhn[0].tolist()
                    cx, cy, bw, bh = xywhn
                    xyxy = box.xyxy[0].tolist()
                    x1, y1, x2, y2 = xyxy
                    detections.append({
                        "id": f"auto_{i}",
                        "class_id": 0,
                        "class_name": "standing",
                        "confidence": round(conf, 3),
                        "cx": round(cx, 6),
                        "cy": round(cy, 6),
                        "bw": round(bw, 6),
                        "bh": round(bh, 6),
                        "x1_px": round(x1),
                        "y1_px": round(y1),
                        "x2_px": round(x2),
                        "y2_px": round(y2),
                        "img_width": w,
                        "img_height": h,
                        "auto_detected": True
                    })
            logger.info(f"Detected {len(detections)} horses in {image_path}")
            return detections
        except Exception as e:
            logger.error(f"Detection error: {e}", exc_info=True)
            return []

    def get_model_info(self) -> Dict[str, Any]:
        return {
            "loaded": self.model_loaded,
            "model_path": MODEL_PATH,
            "horse_class_id": HORSE_CLASS_ID,
            "confidence_threshold": CONFIDENCE_THRESHOLD
        }


yolo_service = YOLOService()