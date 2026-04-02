from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Callable

import cv2
import numpy as np

from .config import DATA_DIR, REFERENCE_SET_MATCH_THRESHOLD
from .reference_sets import REFERENCE_SETS_DIR, load_reference_prototypes

_SEARCH_INDEX_CACHE: dict[str, object] = {"stamp": None, "entries": []}


def _normalize_name(name: str) -> str:
    text = unicodedata.normalize("NFKC", name).strip().casefold()
    return re.sub(r"\s+", " ", text)


def _slugify(text: str) -> str:
    ascii_slug = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    ascii_slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_slug).strip("-").lower()
    if ascii_slug:
        return ascii_slug
    import hashlib

    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]
    return f"person-{digest}"


def _tree_stamp() -> tuple:
    rows: list[tuple[str, int]] = []
    if DATA_DIR.exists():
        for path in sorted(DATA_DIR.rglob("results.json")):
            try:
                rows.append((str(path.relative_to(DATA_DIR)), int(path.stat().st_mtime_ns)))
            except FileNotFoundError:
                continue
    if REFERENCE_SETS_DIR.exists():
        for path in sorted(REFERENCE_SETS_DIR.rglob("*")):
            if not path.is_file():
                continue
            try:
                rows.append((f"ref:{path.relative_to(REFERENCE_SETS_DIR)}", int(path.stat().st_mtime_ns)))
            except FileNotFoundError:
                continue
    return tuple(rows)


def _mean_feature(features: list[np.ndarray]) -> np.ndarray | None:
    if not features:
        return None
    proto = np.mean(np.array(features, dtype=np.float32), axis=0)
    norm = float(np.linalg.norm(proto))
    if norm <= 1e-8:
        return None
    return proto / norm


def _compute_feature_from_face_path(path: Path, compute_face_feature_public: Callable) -> np.ndarray | None:
    img = cv2.imread(str(path))
    if img is None:
        return None
    feat, _ = compute_face_feature_public(img)
    return feat


def _cluster_sample_features(project_dir: Path, cluster: dict, compute_face_feature_public: Callable, max_samples: int = 5) -> list[np.ndarray]:
    feats: list[np.ndarray] = []
    items = sorted(cluster.get("items", []), key=lambda it: float(it.get("timestamp_sec", 0.0)))
    if not items and cluster.get("thumbnail_face_path"):
        items = [{"face_path": cluster["thumbnail_face_path"]}]

    seen: set[str] = set()
    thumb = cluster.get("thumbnail_face_path") or ""
    candidate_paths = []
    if thumb:
        candidate_paths.append(thumb)
    candidate_paths.extend(item.get("face_path", "") for item in items)

    for rel in candidate_paths:
        if not rel or rel in seen:
            continue
        seen.add(rel)
        path = project_dir / rel
        if not path.exists():
            continue
        feat = _compute_feature_from_face_path(path, compute_face_feature_public)
        if feat is not None:
            feats.append(feat)
        if len(feats) >= max_samples:
            break
    return feats


def build_search_index(compute_face_feature_public: Callable) -> list[dict]:
    stamp = _tree_stamp()
    if _SEARCH_INDEX_CACHE["stamp"] == stamp:
        return list(_SEARCH_INDEX_CACHE["entries"])

    entries: list[dict] = []

    for ref in load_reference_prototypes(compute_face_feature_public):
        ref_dir = REFERENCE_SETS_DIR / ref["slug"]
        thumb = ""
        if ref_dir.exists():
            for path in sorted(ref_dir.iterdir()):
                if path.is_file():
                    thumb = f"/data/reference_sets/{ref['slug']}/{path.name}"
                    break
        entries.append(
            {
                "entity_type": "reference",
                "label": ref["label"],
                "slug": ref["slug"],
                "href": f"/reference-set/{ref['slug']}",
                "thumb": thumb,
                "feature": ref["feature"],
                "count": int(ref.get("count", 0)),
                "project_count": 0,
                "threshold": REFERENCE_SET_MATCH_THRESHOLD,
                "subtitle": f"Reference set · {int(ref.get('count', 0))} image(s)",
            }
        )

    named_groups: dict[str, dict] = {}
    anonymous_entries: list[dict] = []

    for project_dir in sorted(DATA_DIR.iterdir(), reverse=True):
        if not project_dir.is_dir() or project_dir.name in {"reference_sets", "search_queries"}:
            continue
        results_path = project_dir / "results.json"
        if not results_path.exists():
            continue
        try:
            results = json.loads(results_path.read_text(encoding="utf-8"))
        except Exception:
            continue

        for cluster in results.get("clusters", []):
            feats = _cluster_sample_features(project_dir, cluster, compute_face_feature_public)
            proto = _mean_feature(feats)
            if proto is None:
                continue

            manual_name = (cluster.get("manual_name") or "").strip()
            thumb_rel = cluster.get("thumbnail_face_path") or (cluster.get("items") or [{}])[0].get("face_path", "")
            thumb = f"/data/{project_dir.name}/{thumb_rel}" if thumb_rel else ""
            item_count = int(cluster.get("count", len(cluster.get("items", []))))

            if manual_name:
                key = _normalize_name(manual_name)
                group = named_groups.setdefault(
                    key,
                    {
                        "entity_type": "person",
                        "label": manual_name,
                        "slug": _slugify(manual_name),
                        "href": f"/person/{_slugify(manual_name)}",
                        "thumb": thumb,
                        "features": [],
                        "count": 0,
                        "project_ids": set(),
                    },
                )
                group["features"].append(proto)
                group["count"] += item_count
                group["project_ids"].add(project_dir.name)
                if thumb and not group["thumb"]:
                    group["thumb"] = thumb
            else:
                label = cluster.get("display_name") or "Anonymous cluster"
                anonymous_entries.append(
                    {
                        "entity_type": "anonymous",
                        "label": label,
                        "slug": f"{project_dir.name}-{int(cluster.get('cluster_id', 0))}",
                        "href": f"/project/{project_dir.name}",
                        "thumb": thumb,
                        "feature": proto,
                        "count": item_count,
                        "project_count": 1,
                        "threshold": 0.88,
                        "subtitle": f"Project {project_dir.name} · {item_count} face(s)",
                    }
                )

    for group in named_groups.values():
        proto = _mean_feature(group.pop("features"))
        if proto is None:
            continue
        entries.append(
            {
                "entity_type": "person",
                "label": group["label"],
                "slug": group["slug"],
                "href": group["href"],
                "thumb": group["thumb"],
                "feature": proto,
                "count": int(group["count"]),
                "project_count": len(group["project_ids"]),
                "threshold": 0.84,
                "subtitle": f"Named person · {group['count']} appearance(s) across {len(group['project_ids'])} project(s)",
            }
        )

    entries.extend(anonymous_entries)
    _SEARCH_INDEX_CACHE["stamp"] = stamp
    _SEARCH_INDEX_CACHE["entries"] = entries
    return list(entries)


def search_matches(query_feature: np.ndarray, compute_face_feature_public: Callable, *, limit: int = 18, min_score: float = 0.68) -> list[dict]:
    q = query_feature.astype(np.float32)
    q /= np.linalg.norm(q) + 1e-8

    rows = []
    type_order = {"person": 0, "reference": 1, "anonymous": 2}
    for entry in build_search_index(compute_face_feature_public):
        feat = entry["feature"].astype(np.float32)
        feat /= np.linalg.norm(feat) + 1e-8
        score = float(np.dot(q, feat))
        if score < min_score:
            continue
        match = {k: v for k, v in entry.items() if k != "feature"}
        match["score"] = score
        threshold = float(entry.get("threshold", 0.84))
        if score >= threshold + 0.05:
            match["confidence"] = "strong"
        elif score >= threshold:
            match["confidence"] = "good"
        else:
            match["confidence"] = "possible"
        rows.append(match)

    rows.sort(key=lambda row: (-float(row["score"]), type_order.get(row.get("entity_type", "anonymous"), 9), row.get("label", "").casefold()))
    return rows[:limit]
