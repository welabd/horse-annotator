import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

PROJECT_FILE = Path("uploads") / "project.json"


class ProjectService:
    def __init__(self):
        self.project_file = PROJECT_FILE
        self._ensure_project_file()

    def _ensure_project_file(self):
        if not self.project_file.exists():
            default = {
                "name": "Horse Annotation Project",
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "images": [],
                "stats": {
                    "total_images": 0,
                    "annotated_images": 0,
                    "total_annotations": 0
                }
            }
            self._write(default)

    def _read(self) -> Dict[str, Any]:
        try:
            with open(self.project_file, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading project: {e}")
            return {"images": []}

    def _write(self, data: Dict[str, Any]):
        try:
            with open(self.project_file, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error writing project: {e}")

    def get_project(self) -> Dict[str, Any]:
        return self._read()

    def save_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        project_data["updated_at"] = datetime.now().isoformat()
        # Recalculate stats
        images = project_data.get("images", [])
        total_anns = sum(len(img.get("annotations", [])) for img in images)
        annotated = sum(1 for img in images if len(img.get("annotations", [])) > 0)
        project_data["stats"] = {
            "total_images": len(images),
            "annotated_images": annotated,
            "total_annotations": total_anns
        }
        self._write(project_data)
        return project_data

    def add_image(self, image_data: Dict[str, Any]) -> Dict[str, Any]:
        project = self._read()
        images = project.get("images", [])

        # Check if already exists
        existing = next((img for img in images if img["id"] == image_data["id"]), None)
        if existing:
            # Update existing
            idx = images.index(existing)
            images[idx] = image_data
        else:
            images.append(image_data)

        project["images"] = images
        return self.save_project(project)

    def update_image_annotations(self, image_id: str, annotations: list) -> Optional[Dict]:
        project = self._read()
        images = project.get("images", [])

        for img in images:
            if img["id"] == image_id:
                img["annotations"] = annotations
                img["annotated"] = len(annotations) > 0
                img["updated_at"] = datetime.now().isoformat()
                self.save_project(project)
                return img

        return None

    def delete_image(self, image_id: str) -> bool:
        project = self._read()
        images = project.get("images", [])
        original_len = len(images)
        project["images"] = [img for img in images if img["id"] != image_id]

        if len(project["images"]) < original_len:
            self.save_project(project)
            return True
        return False

    def get_stats(self) -> Dict[str, Any]:
        project = self._read()
        return project.get("stats", {})


project_service = ProjectService()
