"""Starter utilities for a future hosted animal-embedding pipeline.

This file is intentionally lightweight so the GitHub Pages bundle can ship a
clear next step without pretending the hosted backend already exists.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence

import numpy as np

DEFAULT_MATCH_THRESHOLD = 0.70
STRONG_MATCH_THRESHOLD = 0.85


@dataclass(slots=True)
class AnimalEmbeddingResult:
    vector: np.ndarray
    model_name: str = "mobilenetv3-small-or-resnet50"


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
    return float(np.clip(np.dot(a, b), -1.0, 1.0))


def is_strong_match(vector_a: Sequence[float], vector_b: Sequence[float], threshold: float = 0.70) -> bool:
    return cosine_similarity(vector_a, vector_b) >= threshold


def mean_embedding(vectors: Iterable[Sequence[float]]) -> np.ndarray:
    rows = [normalize_vector(vector) for vector in vectors]
    if not rows:
        raise ValueError("At least one vector is required")
    return normalize_vector(np.mean(np.stack(rows), axis=0))



def score_match(vector_a: Sequence[float], vector_b: Sequence[float]) -> dict[str, float | bool]:
    score = cosine_similarity(vector_a, vector_b)
    return {
        "score": score,
        "is_match": score >= DEFAULT_MATCH_THRESHOLD,
        "is_strong_match": score >= STRONG_MATCH_THRESHOLD,
    }


# Recommended hosted path:
# 1. Extract one normalized embedding per enrolled animal image.
# 2. Store vectors in PostgreSQL with pgvector.
# 3. Search with cosine similarity and keep only candidates above DEFAULT_MATCH_THRESHOLD.
