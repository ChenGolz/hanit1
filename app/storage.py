from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .config import DATA_DIR


def save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def new_project_dir(prefix: str) -> Path:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    project_dir = DATA_DIR / f"{prefix}_{stamp}"
    for sub in ["uploads", "faces", "frames"]:
        (project_dir / sub).mkdir(parents=True, exist_ok=True)
    return project_dir


def list_projects() -> list[str]:
    projects = [p.name for p in DATA_DIR.iterdir() if p.is_dir() and p.name != "reference_sets"]
    projects.sort(reverse=True)
    return projects
