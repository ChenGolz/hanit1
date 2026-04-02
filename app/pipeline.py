from __future__ import annotations

import json
import os
from collections import defaultdict
from pathlib import Path

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

import cv2
import mediapipe as mp
import numpy as np
from deepface import DeepFace
from sklearn.cluster import DBSCAN

from .config import (
    ANON_MATCH_THRESHOLD,
    CLUSTER_EPS,
    CLUSTER_MIN_SAMPLES,
    FACE_MARGIN_RATIO,
    FRAME_SAMPLE_EVERY_SECONDS,
    MAX_IMAGE_DIMENSION,
    MIN_BRIGHTNESS,
    MIN_FACE_AREA,
    MIN_FACE_HEIGHT,
    MIN_FACE_WIDTH,
    MIN_REVIEW_CROP_SIZE,
    MIN_SHARPNESS,
    REFERENCE_SET_MATCH_THRESHOLD,
    REVIEW_MARGIN_RATIO,
    SMART_DEDUP_BBOX_IOU,
    SMART_DEDUP_FEATURE_SIMILARITY,
    SMART_DEDUP_MAX_GAP_SECONDS,
    USE_SCENE_DETECTION,
)
from .models import ClusterResult, FaceItem, ProjectResult
from .reference_sets import load_reference_prototypes

mp_face_detection = mp.solutions.face_detection


def compute_face_feature_public(face_bgr: np.ndarray):
    try:
        objs = DeepFace.represent(face_bgr, model_name="Facenet512", enforce_detection=False)
        obj = objs[0] if isinstance(objs, list) else objs
        embedding = np.array(obj["embedding"], dtype=np.float32)
        norm = float(np.linalg.norm(embedding))
        if norm <= 1e-8:
            return None, None
        embedding /= norm
        return embedding, None
    except Exception:
        return None, None


def _resize_if_needed(image: np.ndarray) -> np.ndarray:
    h, w = image.shape[:2]
    max_dim = max(h, w)
    if max_dim <= MAX_IMAGE_DIMENSION:
        return image
    scale = MAX_IMAGE_DIMENSION / float(max_dim)
    return cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LANCZOS4)


def _review_enhance(image_bgr: np.ndarray) -> np.ndarray:
    denoised = cv2.fastNlMeansDenoisingColored(image_bgr, None, 3, 3, 7, 21)
    lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=1.7, tileGridSize=(8, 8))
    l2 = clahe.apply(l)
    merged = cv2.merge((l2, a, b))
    contrast = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    blur = cv2.GaussianBlur(contrast, (0, 0), 1.0)
    return cv2.addWeighted(contrast, 1.20, blur, -0.20, 0)


def _clamp(v: int, lo: int, hi: int) -> int:
    return max(lo, min(v, hi))


def _expand_bbox(x: int, y: int, w: int, h: int, width: int, height: int, margin_ratio: float) -> list[int]:
    margin_x = int(w * margin_ratio)
    margin_y = int(h * margin_ratio)
    left = _clamp(x - margin_x, 0, max(width - 1, 0))
    top = _clamp(y - margin_y, 0, max(height - 1, 0))
    right = _clamp(x + w + margin_x, left + 1, max(width, left + 1))
    bottom = _clamp(y + h + margin_y, top + 1, max(height, top + 1))
    return [left, top, right, bottom]


def _extract_face_bbox(rel_bbox, width: int, height: int) -> list[int]:
    x = int(rel_bbox.xmin * width)
    y = int(rel_bbox.ymin * height)
    w = int(rel_bbox.width * width)
    h = int(rel_bbox.height * height)
    return _expand_bbox(x, y, w, h, width, height, FACE_MARGIN_RATIO)


def _extract_review_bbox(face_bbox: list[int], width: int, height: int) -> list[int]:
    left, top, right, bottom = face_bbox
    return _expand_bbox(left, top, right - left, bottom - top, width, height, REVIEW_MARGIN_RATIO)


def _detect_faces(image_bgr: np.ndarray, detector) -> list[list[int]]:
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    height, width = image_bgr.shape[:2]
    faces: list[list[int]] = []
    results = detector.process(image_rgb)
    if not results.detections:
        return faces
    for det in results.detections:
        faces.append(_extract_face_bbox(det.location_data.relative_bounding_box, width, height))
    return faces


def _brightness_score(face_bgr: np.ndarray) -> float:
    return float(cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY).mean())


def _sharpness_score(face_bgr: np.ndarray) -> float:
    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _quality_ok(face_bgr: np.ndarray) -> tuple[bool, float]:
    h, w = face_bgr.shape[:2]
    area = h * w
    brightness = _brightness_score(face_bgr)
    sharpness = _sharpness_score(face_bgr)
    if w < MIN_FACE_WIDTH or h < MIN_FACE_HEIGHT or area < MIN_FACE_AREA:
        return False, 0.0
    if brightness < MIN_BRIGHTNESS or sharpness < MIN_SHARPNESS:
        return False, 0.0
    quality = (area / 1000.0) + (sharpness * 0.08) + (brightness * 0.15)
    return True, float(quality)


def _upscale_review_crop_if_needed(crop: np.ndarray) -> np.ndarray:
    h, w = crop.shape[:2]
    min_dim = min(h, w)
    if min_dim >= MIN_REVIEW_CROP_SIZE:
        return crop
    scale = MIN_REVIEW_CROP_SIZE / float(max(min_dim, 1))
    return cv2.resize(crop, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LANCZOS4)


def _save_frame_with_box(frame_bgr: np.ndarray, bbox: list[int], frame_box_path: Path) -> None:
    left, top, right, bottom = bbox
    boxed = frame_bgr.copy()
    cv2.rectangle(boxed, (left, top), (right, bottom), (0, 255, 0), 3)
    cv2.imwrite(str(frame_box_path), boxed, [int(cv2.IMWRITE_JPEG_QUALITY), 92])


def extract_best_search_face(image_path: Path, search_dir: Path) -> dict:
    image_bgr = cv2.imread(str(image_path))
    if image_bgr is None:
        raise ValueError(f"Could not read image: {image_path}")

    frame_bgr = _review_enhance(_resize_if_needed(image_bgr))
    height, width = frame_bgr.shape[:2]
    candidates: list[dict] = []

    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.55) as detector:
        for idx, (left, top, right, bottom) in enumerate(_detect_faces(frame_bgr, detector)):
            tight_crop = frame_bgr[top:bottom, left:right]
            if tight_crop.size == 0:
                continue
            ok, quality = _quality_ok(tight_crop)
            if not ok:
                continue
            feat, _ = compute_face_feature_public(tight_crop)
            if feat is None:
                continue
            r_left, r_top, r_right, r_bottom = _extract_review_bbox([left, top, right, bottom], width, height)
            review_crop = frame_bgr[r_top:r_bottom, r_left:r_right]
            if review_crop.size == 0:
                continue
            review_crop = _upscale_review_crop_if_needed(review_crop)
            candidates.append(
                {
                    "idx": idx,
                    "bbox": [left, top, right, bottom],
                    "quality_score": quality,
                    "feature": feat,
                    "review_crop": review_crop,
                }
            )

    if not candidates:
        raise ValueError("No usable face was found in the uploaded image.")

    best = max(candidates, key=lambda row: float(row["quality_score"]))
    face_path = search_dir / "faces" / "query_face.jpg"
    frame_path = search_dir / "frames" / "query_face_box.jpg"
    cv2.imwrite(str(face_path), best["review_crop"], [int(cv2.IMWRITE_JPEG_QUALITY), 96])
    _save_frame_with_box(frame_bgr, best["bbox"], frame_path)

    return {
        "feature": best["feature"],
        "faces_detected": len(candidates),
        "query_face_path": str(face_path.relative_to(search_dir.parent.parent if search_dir.parent.name == 'search_queries' else search_dir.parent)),
        "query_frame_path": str(frame_path.relative_to(search_dir.parent.parent if search_dir.parent.name == 'search_queries' else search_dir.parent)),
    }


def _process_frame(
    frame_bgr: np.ndarray,
    timestamp_sec: float,
    project_dir: Path,
    all_items: list[dict],
    face_count_start: int,
    detector,
) -> int:
    frame_bgr = _resize_if_needed(frame_bgr)
    frame_bgr = _review_enhance(frame_bgr)
    boxes = _detect_faces(frame_bgr, detector)
    height, width = frame_bgr.shape[:2]
    face_count = face_count_start

    for left, top, right, bottom in boxes:
        tight_crop = frame_bgr[top:bottom, left:right]
        if tight_crop.size == 0:
            continue

        ok, quality = _quality_ok(tight_crop)
        if not ok:
            continue

        r_left, r_top, r_right, r_bottom = _extract_review_bbox([left, top, right, bottom], width, height)
        review_crop = frame_bgr[r_top:r_bottom, r_left:r_right]
        if review_crop.size == 0:
            continue
        review_crop = _upscale_review_crop_if_needed(review_crop)

        feat, _ = compute_face_feature_public(tight_crop)
        if feat is None:
            continue

        face_path = project_dir / "faces" / f"face_{face_count:06d}.jpg"
        frame_box_path = project_dir / "frames" / f"frame_box_{face_count:06d}.jpg"
        cv2.imwrite(str(face_path), review_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 96])
        _save_frame_with_box(frame_bgr, [left, top, right, bottom], frame_box_path)

        all_items.append(
            {
                "feature": feat,
                "timestamp_sec": timestamp_sec,
                "frame_path": str(frame_box_path.relative_to(project_dir)),
                "face_path": str(face_path.relative_to(project_dir)),
                "bbox": [left, top, right, bottom],
                "quality_score": quality,
            }
        )
        face_count += 1

    return face_count


def _scene_frame_indices(video_path: Path, total_frames: int, step_frames: int) -> list[int]:
    if not USE_SCENE_DETECTION:
        return list(range(0, total_frames, step_frames))
    try:
        from scenedetect import ContentDetector, detect

        scenes = detect(str(video_path), ContentDetector())
        if not scenes:
            return list(range(0, total_frames, step_frames))
        starts = sorted(set(int(start.get_frames()) for start, _ in scenes))
        return starts or list(range(0, total_frames, step_frames))
    except Exception:
        return list(range(0, total_frames, step_frames))


def process_image(image_path: Path, project_dir: Path) -> ProjectResult:
    image_bgr = cv2.imread(str(image_path))
    if image_bgr is None:
        raise ValueError(f"Could not read image: {image_path}")

    all_items: list[dict] = []
    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.55) as detector:
        _process_frame(image_bgr, 0.0, project_dir, all_items, 0, detector)
    return _cluster_items(all_items, project_dir, "image", image_path.name)


def process_video(video_path: Path, project_dir: Path, sample_every_seconds: float = FRAME_SAMPLE_EVERY_SECONDS) -> ProjectResult:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step_frames = max(int(fps * sample_every_seconds), 1)
    target_frames = set(_scene_frame_indices(video_path, total_frames, step_frames))

    frame_idx = 0
    face_count = 0
    all_items: list[dict] = []

    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.55) as detector:
        while True:
            ret, frame_bgr = cap.read()
            if not ret:
                break
            if frame_idx not in target_frames:
                frame_idx += 1
                continue
            timestamp_sec = round(frame_idx / fps, 2)
            face_count = _process_frame(frame_bgr, timestamp_sec, project_dir, all_items, face_count, detector)
            frame_idx += 1

    cap.release()
    return _cluster_items(all_items, project_dir, "video", video_path.name)


def _bbox_iou(a: list[int], b: list[int]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    if inter_x2 <= inter_x1 or inter_y2 <= inter_y1:
        return 0.0
    inter = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
    area_a = max(1, (ax2 - ax1) * (ay2 - ay1))
    area_b = max(1, (bx2 - bx1) * (by2 - by1))
    return float(inter / max(area_a + area_b - inter, 1))


def _items_should_be_same_run(prev_item: dict, item: dict) -> bool:
    gap = float(item["timestamp_sec"]) - float(prev_item["timestamp_sec"])
    sim = float(np.dot(item["feature"], prev_item["feature"]))
    iou = _bbox_iou(item["bbox"], prev_item["bbox"])
    return gap <= SMART_DEDUP_MAX_GAP_SECONDS and sim >= SMART_DEDUP_FEATURE_SIMILARITY and iou >= SMART_DEDUP_BBOX_IOU


def _smart_dedupe_items(items: list[dict]) -> list[dict]:
    if not items:
        return items
    items = sorted(items, key=lambda it: float(it["timestamp_sec"]))
    runs = []
    current = [items[0]]
    for item in items[1:]:
        if _items_should_be_same_run(current[-1], item):
            current.append(item)
        else:
            runs.append(current)
            current = [item]
    runs.append(current)
    kept = [max(run, key=lambda it: it.get("quality_score", 0.0)) for run in runs]
    kept.sort(key=lambda it: float(it["timestamp_sec"]))
    return kept


def _load_previous_rows(data_dir: Path, current_project_id: str) -> list[dict]:
    rows = []
    for project_dir in data_dir.iterdir():
        if not project_dir.is_dir() or project_dir.name in {"reference_sets", "search_queries", current_project_id}:
            continue
        path = project_dir / "features.json"
        if not path.exists():
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(payload, list):
            continue
        for row in payload:
            feat = row.get("feature")
            if isinstance(feat, list) and feat:
                rows.append(
                    {
                        "project_id": row.get("project_id", project_dir.name),
                        "cluster_id": int(row.get("cluster_id", -1)),
                        "cluster_label": row.get("cluster_label", "Older anonymous cluster"),
                        "feature": np.array(feat, dtype=np.float32),
                    }
                )
    return rows


def _save_prototypes(project_dir: Path, rows: list[dict]) -> None:
    (project_dir / "features.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")


def _find_best_previous_match(cluster_feature: np.ndarray, previous_rows: list[dict]):
    if cluster_feature is None or not previous_rows:
        return None
    q = cluster_feature.astype(np.float32)
    q /= np.linalg.norm(q) + 1e-8
    best = None
    best_score = -1.0
    for row in previous_rows:
        feat = row["feature"].astype(np.float32)
        feat /= np.linalg.norm(feat) + 1e-8
        score = float(np.dot(q, feat))
        if score > best_score:
            best_score = score
            best = row
    if best is None or best_score < ANON_MATCH_THRESHOLD:
        return None
    return {
        "score": best_score,
        "project_id": best["project_id"],
        "cluster_id": best["cluster_id"],
        "cluster_label": best["cluster_label"],
    }


def _find_best_reference_match(cluster_feature: np.ndarray):
    reference_sets = load_reference_prototypes(compute_face_feature_public)
    if cluster_feature is None or not reference_sets:
        return None
    q = cluster_feature.astype(np.float32)
    q /= np.linalg.norm(q) + 1e-8
    best = None
    best_score = -1.0
    for ref in reference_sets:
        feat = ref["feature"].astype(np.float32)
        feat /= np.linalg.norm(feat) + 1e-8
        score = float(np.dot(q, feat))
        if score > best_score:
            best_score = score
            best = ref
    if best is None or best_score < REFERENCE_SET_MATCH_THRESHOLD:
        return None
    return {"label": best["label"], "score": best_score}


def _cluster_items(all_items: list[dict], project_dir: Path, source_type: str, source_name: str) -> ProjectResult:
    if not all_items:
        _save_prototypes(project_dir, [])
        return ProjectResult(project_id=project_dir.name, source_type=source_type, source_name=source_name, clusters=[])

    features = np.array([item["feature"] for item in all_items], dtype=np.float32)
    clustering = DBSCAN(eps=CLUSTER_EPS, min_samples=CLUSTER_MIN_SAMPLES, metric="euclidean")
    labels = clustering.fit_predict(features)

    grouped = defaultdict(list)
    unknown_index = 100000
    for item, label in zip(all_items, labels):
        if label == -1:
            grouped[unknown_index].append(item)
            unknown_index += 1
        else:
            grouped[int(label)].append(item)

    previous_rows = _load_previous_rows(project_dir.parent, project_dir.name)
    cluster_results = []
    prototype_rows = []

    for public_idx, (_, raw_items) in enumerate(sorted(grouped.items(), key=lambda kv: len(kv[1]), reverse=True), start=1):
        cluster_feature = np.mean(np.array([item["feature"] for item in raw_items], dtype=np.float32), axis=0)
        cluster_feature = cluster_feature / (np.linalg.norm(cluster_feature) + 1e-8)
        prev_match = _find_best_previous_match(cluster_feature, previous_rows)
        ref_match = _find_best_reference_match(cluster_feature)
        items = _smart_dedupe_items(raw_items)
        best_item = max(items, key=lambda it: it.get("quality_score", 0.0))
        face_items = [
            FaceItem(
                timestamp_sec=float(item["timestamp_sec"]),
                frame_path=item["frame_path"],
                face_path=item["face_path"],
                bbox=item["bbox"],
                source_link="",
            )
            for item in items
        ]
        cluster_results.append(
            ClusterResult(
                cluster_id=public_idx - 1,
                display_name=f"Person {public_idx}",
                manual_name="",
                count=len(items),
                items=face_items,
                thumbnail_face_path=best_item["face_path"],
                thumbnail_frame_path=best_item["frame_path"],
                possible_match=bool(prev_match),
                possible_match_score=float(prev_match["score"]) if prev_match else 0.0,
                possible_match_project_id=prev_match["project_id"] if prev_match else "",
                possible_match_cluster_id=int(prev_match["cluster_id"]) if prev_match else -1,
                possible_match_label=prev_match["cluster_label"] if prev_match else "",
                possible_reference_match=bool(ref_match),
                possible_reference_label=ref_match["label"] if ref_match else "",
                possible_reference_score=float(ref_match["score"]) if ref_match else 0.0,
            )
        )
        prototype_rows.append(
            {
                "project_id": project_dir.name,
                "cluster_id": public_idx - 1,
                "cluster_label": f"Anonymous cluster {public_idx}",
                "feature": cluster_feature.tolist(),
            }
        )

    _save_prototypes(project_dir, prototype_rows)
    return ProjectResult(project_id=project_dir.name, source_type=source_type, source_name=source_name, clusters=cluster_results)
