from __future__ import annotations

import hashlib
import shutil
from pathlib import Path
from typing import Callable

import cv2
import numpy as np

from .config import ALLOWED_IMAGE_EXTENSIONS, REFERENCE_SETS_DIR

_REFERENCE_CACHE: dict[str, object] = {"stamp": None, "value": []}


def _safe_reference_slug(text: str) -> str:
    cleaned = "".join(ch if ch.isalnum() else "-" for ch in text.strip().lower())
    cleaned = "-".join(piece for piece in cleaned.split("-") if piece)
    if cleaned:
        return cleaned
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]
    return f"reference-{digest}"


def _safe_reference_dir(slug: str) -> Path:
    safe_slug = _safe_reference_slug(slug)
    return REFERENCE_SETS_DIR / safe_slug


def _reference_tree_stamp() -> tuple:
    rows: list[tuple[str, int]] = []
    if not REFERENCE_SETS_DIR.exists():
        return tuple(rows)
    for ref_dir in sorted(REFERENCE_SETS_DIR.iterdir()):
        if not ref_dir.is_dir():
            continue
        for path in sorted(p for p in ref_dir.iterdir() if p.is_file()):
            rows.append((str(path.relative_to(REFERENCE_SETS_DIR)), int(path.stat().st_mtime_ns)))
    return tuple(rows)


def save_reference_images(reference_name: str, file_pairs: list[tuple[str, bytes]]) -> str:
    slug = _safe_reference_slug(reference_name)
    ref_dir = REFERENCE_SETS_DIR / slug
    ref_dir.mkdir(parents=True, exist_ok=True)
    existing = len(list(ref_dir.glob("*")))
    for idx, (filename, content) in enumerate(file_pairs, start=1):
        suffix = Path(filename).suffix.lower() or ".jpg"
        if suffix not in ALLOWED_IMAGE_EXTENSIONS:
            suffix = ".jpg"
        out = ref_dir / f"ref_{existing + idx:03d}{suffix}"
        out.write_bytes(content)
    _REFERENCE_CACHE["stamp"] = None
    _REFERENCE_CACHE["value"] = []
    return slug


def list_reference_sets() -> list[dict]:
    refs = []
    if not REFERENCE_SETS_DIR.exists():
        return refs
    for ref_dir in sorted(REFERENCE_SETS_DIR.iterdir()):
        if not ref_dir.is_dir():
            continue
        images = sorted([p for p in ref_dir.iterdir() if p.is_file() and p.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS])
        refs.append(
            {
                "slug": ref_dir.name,
                "label": ref_dir.name.replace("-", " ").title(),
                "count": len(images),
                "thumb": f"/data/reference_sets/{ref_dir.name}/{images[0].name}" if images else "",
            }
        )
    return refs


def get_reference_set(slug: str) -> dict | None:
    path = _safe_reference_dir(slug)
    if not path.exists() or not path.is_dir():
        return None
    images = sorted([p for p in path.iterdir() if p.is_file() and p.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS])
    return {
        "slug": path.name,
        "label": path.name.replace("-", " ").title(),
        "count": len(images),
        "images": [f"/data/reference_sets/{path.name}/{img.name}" for img in images],
        "thumb": f"/data/reference_sets/{path.name}/{images[0].name}" if images else "",
    }


def remove_reference_set(slug: str) -> None:
    path = _safe_reference_dir(slug)
    if path.exists() and path.is_dir():
        shutil.rmtree(path)
    _REFERENCE_CACHE["stamp"] = None
    _REFERENCE_CACHE["value"] = []


def load_reference_prototypes(compute_face_feature_public: Callable) -> list[dict]:
    stamp = _reference_tree_stamp()
    if _REFERENCE_CACHE["stamp"] == stamp:
        return list(_REFERENCE_CACHE["value"])

    refs: list[dict] = []
    if not REFERENCE_SETS_DIR.exists():
        _REFERENCE_CACHE["stamp"] = stamp
        _REFERENCE_CACHE["value"] = refs
        return list(refs)

    for ref_dir in sorted(REFERENCE_SETS_DIR.iterdir()):
        if not ref_dir.is_dir():
            continue
        feats = []
        for path in sorted([p for p in ref_dir.iterdir() if p.is_file() and p.suffix.lower() in ALLOWED_IMAGE_EXTENSIONS]):
            img = cv2.imread(str(path))
            if img is None:
                continue
            feat, _ = compute_face_feature_public(img)
            if feat is None:
                continue
            feats.append(feat)
        if feats:
            proto = np.mean(np.array(feats, dtype=np.float32), axis=0)
            proto /= np.linalg.norm(proto) + 1e-8
            refs.append(
                {
                    "slug": ref_dir.name,
                    "label": ref_dir.name.replace("-", " ").title(),
                    "feature": proto,
                    "count": len(feats),
                }
            )

    _REFERENCE_CACHE["stamp"] = stamp
    _REFERENCE_CACHE["value"] = refs
    return list(refs)
