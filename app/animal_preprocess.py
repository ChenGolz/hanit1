"""Hosted backend scaffold for animal-only preprocessing.

This module is intentionally optional in the GitHub Pages build. When the app
moves to a real FastAPI deployment, this pipeline can:
1. detect animals with YOLOv8,
2. crop tightly to the animal bounding box with padding,
3. blur human faces for privacy,
4. optionally remove the background before feature extraction.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Tuple

import numpy as np

try:  # Optional runtime dependencies for the hosted phase.
    import cv2  # type: ignore
    from ultralytics import YOLO  # type: ignore
except Exception:  # pragma: no cover - scaffold only
    cv2 = None
    YOLO = None

try:
    import mediapipe as mp  # type: ignore
except Exception:  # pragma: no cover - scaffold only
    mp = None

try:
    from rembg import remove  # type: ignore
except Exception:  # pragma: no cover - scaffold only
    remove = None

ANIMAL_CLASSES = {15, 16, 17, 18, 19}  # cat, dog, horse, sheep, cow in COCO
PERSON_CLASS = 0


@dataclass
class DetectionBox:
    cls_id: int
    confidence: float
    xyxy: Tuple[int, int, int, int]


@dataclass
class ProcessedAnimalImage:
    animal_crop: np.ndarray
    people_blurred: bool
    background_removed: bool
    detections: List[DetectionBox]


class AnimalOnlyPreprocessor:
    def __init__(self, model_name: str = "yolov8n.pt") -> None:
        self.model_name = model_name
        self._model = YOLO(model_name) if YOLO is not None else None
        self._face_detector = None
        if mp is not None:
            self._face_detector = mp.solutions.face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.4)

    @property
    def available(self) -> bool:
        return self._model is not None and cv2 is not None

    def detect_objects(self, image: np.ndarray) -> List[DetectionBox]:
        if not self.available:
            return []
        results = self._model(image, verbose=False)
        output: List[DetectionBox] = []
        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                output.append(DetectionBox(cls_id=cls_id, confidence=conf, xyxy=(x1, y1, x2, y2)))
        return output

    def best_animal_box(self, detections: Sequence[DetectionBox]) -> Optional[DetectionBox]:
        animals = [d for d in detections if d.cls_id in ANIMAL_CLASSES]
        if not animals:
            return None
        return max(animals, key=lambda d: ((d.xyxy[2] - d.xyxy[0]) * (d.xyxy[3] - d.xyxy[1]), d.confidence))

    def crop_with_padding(self, image: np.ndarray, box: DetectionBox, padding_ratio: float = 0.1) -> np.ndarray:
        h, w = image.shape[:2]
        x1, y1, x2, y2 = box.xyxy
        pad_x = int((x2 - x1) * padding_ratio)
        pad_y = int((y2 - y1) * padding_ratio)
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)
        return image[y1:y2, x1:x2].copy()

    def blur_human_faces(self, image: np.ndarray) -> Tuple[np.ndarray, bool]:
        if self._face_detector is None or cv2 is None:
            return image, False
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        result = self._face_detector.process(rgb)
        if not result.detections:
            return image, False
        out = image.copy()
        h, w = out.shape[:2]
        for detection in result.detections:
            bbox = detection.location_data.relative_bounding_box
            x = max(0, int(bbox.xmin * w))
            y = max(0, int(bbox.ymin * h))
            bw = min(w - x, int(bbox.width * w))
            bh = min(h - y, int(bbox.height * h))
            if bw <= 0 or bh <= 0:
                continue
            roi = out[y:y + bh, x:x + bw]
            out[y:y + bh, x:x + bw] = cv2.GaussianBlur(roi, (41, 41), 0)
        return out, True

    def remove_background_from_crop(self, crop: np.ndarray) -> Tuple[np.ndarray, bool]:
        if remove is None or cv2 is None:
            return crop, False
        png = cv2.imencode('.png', crop)[1].tobytes()
        rgba_bytes = remove(png)
        rgba = cv2.imdecode(np.frombuffer(rgba_bytes, np.uint8), cv2.IMREAD_UNCHANGED)
        if rgba is None or rgba.shape[-1] < 4:
            return crop, False
        alpha = rgba[:, :, 3:4].astype(np.float32) / 255.0
        rgb = rgba[:, :, :3].astype(np.float32)
        bg = np.full_like(rgb, 255.0)
        composed = (rgb * alpha) + (bg * (1.0 - alpha))
        return composed.astype(np.uint8), True

    def process(self, image: np.ndarray) -> Optional[ProcessedAnimalImage]:
        detections = self.detect_objects(image)
        animal_box = self.best_animal_box(detections)
        if animal_box is None:
            return None
        cropped = self.crop_with_padding(image, animal_box)
        blurred, people_blurred = self.blur_human_faces(cropped)
        subject_only, background_removed = self.remove_background_from_crop(blurred)
        return ProcessedAnimalImage(
            animal_crop=subject_only,
            people_blurred=people_blurred,
            background_removed=background_removed,
            detections=list(detections),
        )


def load_image(path: str | Path) -> np.ndarray:
    if cv2 is None:
        raise RuntimeError("opencv-python-headless is required for hosted preprocessing")
    image = cv2.imread(str(path))
    if image is None:
        raise FileNotFoundError(path)
    return image


def best_animal_crop_with_masks(image: np.ndarray, padding_ratio: float = 0.12) -> Optional[ProcessedAnimalImage]:
    """Convenience helper for hosted FastAPI routes.

    1. Detect the best animal with YOLOv8.
    2. Crop tightly with padding.
    3. Blur human faces for privacy.
    4. Optionally remove the background before vector extraction.
    """
    processor = AnimalOnlyPreprocessor()
    if not processor.available:
        return None
    return processor.process(image)
