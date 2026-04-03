"""Hosted-only utilities for future vector-based animal matching.

This module is designed for the eventual FastAPI/PostgreSQL deployment.
The GitHub Pages build does not execute this code, but the functions here
provide a realistic path away from hashes toward feature vectors.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence

import numpy as np
from scipy.spatial.distance import cosine

DEFAULT_MATCH_THRESHOLD = 0.70
STRONG_MATCH_THRESHOLD = 0.90
VECTOR_DIMENSION = 1024
MODEL_NAME = "mobilenetv3-small-or-resnet50"


@dataclass(slots=True)
class AnimalEmbeddingResult:
    vector: np.ndarray
    model_name: str = MODEL_NAME
    crop_box: tuple[int, int, int, int] | None = None


def normalize_vector(values: Sequence[float]) -> np.ndarray:
    array = np.asarray(values, dtype=np.float32)
    norm = float(np.linalg.norm(array))
    if norm <= 0:
        return array
    return array / norm


def cosine_similarity(vector_a: Sequence[float], vector_b: Sequence[float]) -> float:
    a = normalize_vector(vector_a)
    b = normalize_vector(vector_b)
    if a.size == 0 or b.size == 0:
        return 0.0
    if a.shape != b.shape:
        raise ValueError("Embedding vectors must have the same dimension")
    # scipy cosine distance: 0.0 is identical, 1.0 is orthogonal.
    return float(np.clip(1.0 - cosine(a, b), 0.0, 1.0))


def cosine_distance(vector_a: Sequence[float], vector_b: Sequence[float]) -> float:
    a = normalize_vector(vector_a)
    b = normalize_vector(vector_b)
    if a.size == 0 or b.size == 0:
        return 1.0
    if a.shape != b.shape:
        raise ValueError("Embedding vectors must have the same dimension")
    return float(np.clip(cosine(a, b), 0.0, 2.0))


def is_strong_match(vector_a: Sequence[float], vector_b: Sequence[float], threshold: float = STRONG_MATCH_THRESHOLD) -> bool:
    return cosine_similarity(vector_a, vector_b) >= threshold


def mean_embedding(vectors: Iterable[Sequence[float]]) -> np.ndarray:
    rows = [normalize_vector(vector) for vector in vectors]
    if not rows:
        raise ValueError("At least one vector is required")
    return normalize_vector(np.mean(np.stack(rows), axis=0))


def score_match(vector_a: Sequence[float], vector_b: Sequence[float]) -> dict[str, float | bool]:
    score = cosine_similarity(vector_a, vector_b)
    distance = cosine_distance(vector_a, vector_b)
    return {
        "score": score,
        "distance": distance,
        "is_match": score >= DEFAULT_MATCH_THRESHOLD,
        "is_strong_match": score >= STRONG_MATCH_THRESHOLD,
    }


def rank_candidate_vectors(query_vector: Sequence[float], candidates: Iterable[tuple[str, Sequence[float]]], threshold: float = DEFAULT_MATCH_THRESHOLD) -> list[dict[str, float | str | bool]]:
    ranked: list[dict[str, float | str | bool]] = []
    for candidate_id, vector in candidates:
        result = score_match(query_vector, vector)
        if result["score"] >= threshold:
            ranked.append({"candidate_id": candidate_id, **result})
    ranked.sort(key=lambda row: float(row["score"]), reverse=True)
    return ranked


# Hosted extraction roadmap:
# 1. Use YOLOv8 or another detector to crop the animal before embedding extraction.
# 2. Resize each crop to a stable square input (for example 512x512).
# 3. Extract one normalized feature vector per image with MobileNetV3/ResNet.
# 4. Store vectors in PostgreSQL with pgvector + HNSW for fast nearest-neighbor search.


def composite_match_score(*, vector_score: float, color_score: float, breed_score: float = 0.0, has_breed: bool = False) -> dict[str, float]:
    vector_weight = 0.72 if has_breed else 0.80
    color_weight = 0.18 if has_breed else 0.20
    breed_weight = 0.10 if has_breed else 0.0
    score = (vector_score * vector_weight) + (color_score * color_weight) + (breed_score * breed_weight)
    return {
        'score': float(np.clip(score, 0.0, 1.0)),
        'vector_weight': vector_weight,
        'color_weight': color_weight,
        'breed_weight': breed_weight,
    }
