from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

VIDEO_EXTS = {".mp4", ".mkv", ".webm", ".mov", ".avi"}


def _run_capture(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def _run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True)


def _fetch_youtube_metadata(url: str) -> dict[str, Any]:
    cmd = ["yt-dlp", "--no-playlist", "--dump-single-json", "--no-warnings", url]
    try:
        result = _run_capture(cmd)
        return json.loads(result.stdout)
    except Exception:
        return {}


def _normalize_upload_date(raw: str | None) -> str | None:
    if not raw or len(raw) != 8 or not raw.isdigit():
        return None
    return f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"


def _latest_downloaded_file(output_dir: Path) -> Path:
    videos = sorted(
        [p for p in output_dir.iterdir() if p.is_file() and p.suffix.lower() in VIDEO_EXTS],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not videos:
        raise RuntimeError("No video file downloaded.")
    return videos[0]


def download_youtube_video(url: str, output_dir: Path) -> dict[str, str | None]:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_template = str(output_dir / "%(title).80s-%(id)s.%(ext)s")
    meta = _fetch_youtube_metadata(url)
    upload_date = _normalize_upload_date(meta.get("upload_date"))
    cmd = [
        "yt-dlp",
        "--no-playlist",
        "--retries",
        "10",
        "--fragment-retries",
        "10",
        "--user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "-f",
        "bv*[ext=mp4]/b[ext=mp4]/best",
        "-o",
        out_template,
        url,
    ]
    _run(cmd)
    video_path = _latest_downloaded_file(output_dir)
    return {
        "video_path": str(video_path),
        "upload_date": upload_date,
        "title": meta.get("title") or video_path.stem,
    }
