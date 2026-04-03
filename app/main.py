from __future__ import annotations

import hashlib
import re
import shutil
import threading
import unicodedata
from collections import defaultdict
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .config import ALLOWED_IMAGE_EXTENSIONS, ALLOWED_VIDEO_EXTENSIONS, DATA_DIR, MAX_BULK_YOUTUBE_LINKS
from .pipeline import compute_face_feature_public, extract_best_search_face, process_image, process_video
from .reference_sets import get_reference_set, list_reference_sets, remove_reference_set, save_reference_images
from .search_index import search_matches
from .storage import list_projects, load_json, new_project_dir, new_search_dir, save_json
from .stats_summary import router as stats_router
from .youtube import download_youtube_video

app = FastAPI(title="Kibbutz Face Archive")
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))
app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")
app.include_router(stats_router)

_SAFE_UPLOAD_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _suffix(filename: str) -> str:
    return Path(filename).suffix.lower()


def _safe_upload_name(filename: str | None, default_stem: str = "uploaded_file") -> str:
    raw = Path(filename or default_stem).name
    stem = Path(raw).stem or default_stem
    suffix = Path(raw).suffix.lower()
    safe_stem = _SAFE_UPLOAD_RE.sub("_", stem).strip("._") or default_stem
    return f"{safe_stem}{suffix}"


def _youtube_timestamp_link(url: str | None, timestamp_sec: float) -> str:
    if not url:
        return ""
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if "youtu.be" in host:
        video_id = parsed.path.strip("/")
        if not video_id:
            return ""
        return f"https://www.youtube.com/watch?v={video_id}&t={int(round(timestamp_sec))}s"
    if "youtube.com" in host:
        qs = parse_qs(parsed.query)
        video_id = (qs.get("v") or [""])[0]
        if not video_id:
            return ""
        return f"https://www.youtube.com/watch?v={video_id}&t={int(round(timestamp_sec))}s"
    return ""


def _attach_source_links(results: dict) -> dict:
    source_url = results.get("source_url")
    if not source_url:
        return results
    for cluster in results.get("clusters", []):
        for item in cluster.get("items", []):
            item["source_link"] = _youtube_timestamp_link(source_url, float(item.get("timestamp_sec", 0)))
    return results


def _normalize_name(name: str) -> str:
    text = unicodedata.normalize("NFKC", name).strip().casefold()
    text = re.sub(r"\s+", " ", text)
    return text


def _slugify(text: str) -> str:
    ascii_slug = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    ascii_slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_slug).strip("-").lower()
    if ascii_slug:
        return ascii_slug
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]
    return f"person-{digest}"


def person_slug(name: str) -> str:
    return _slugify(name)


def _merge_same_manual_names(results: dict) -> dict:
    clusters = results.get("clusters", [])
    merged_map = {}
    unnamed = []
    for cluster in clusters:
        manual_name = (cluster.get("manual_name") or "").strip()
        if not manual_name:
            unnamed.append(cluster)
            continue
        key = _normalize_name(manual_name)
        if key not in merged_map:
            merged_map[key] = {
                "cluster_id": 0,
                "display_name": cluster.get("display_name", "Person"),
                "manual_name": manual_name,
                "count": 0,
                "items": [],
                "thumbnail_face_path": cluster.get("thumbnail_face_path", ""),
                "thumbnail_frame_path": cluster.get("thumbnail_frame_path", ""),
                "possible_match": cluster.get("possible_match", False),
                "possible_match_score": cluster.get("possible_match_score", 0.0),
                "possible_match_project_id": cluster.get("possible_match_project_id", ""),
                "possible_match_cluster_id": cluster.get("possible_match_cluster_id", -1),
                "possible_match_label": cluster.get("possible_match_label", ""),
                "possible_reference_match": cluster.get("possible_reference_match", False),
                "possible_reference_label": cluster.get("possible_reference_label", ""),
                "possible_reference_score": cluster.get("possible_reference_score", 0.0),
            }
        merged_map[key]["items"].extend(cluster.get("items", []))
        merged_map[key]["count"] += int(cluster.get("count", len(cluster.get("items", []))))
        if not merged_map[key]["thumbnail_face_path"]:
            merged_map[key]["thumbnail_face_path"] = cluster.get("thumbnail_face_path", "")
        if not merged_map[key]["thumbnail_frame_path"]:
            merged_map[key]["thumbnail_frame_path"] = cluster.get("thumbnail_frame_path", "")

    new_clusters = list(merged_map.values()) + unnamed
    new_clusters.sort(key=lambda c: ((c.get("manual_name") or "") == "", -int(c.get("count", 0))))
    for idx, cluster in enumerate(new_clusters):
        cluster["cluster_id"] = idx
        cluster["count"] = len(cluster.get("items", []))
        cluster["items"] = sorted(cluster.get("items", []), key=lambda it: float(it.get("timestamp_sec", 0.0)))
        if cluster.get("items") and not cluster.get("thumbnail_face_path"):
            cluster["thumbnail_face_path"] = cluster["items"][0]["face_path"]
        if cluster.get("items") and not cluster.get("thumbnail_frame_path"):
            cluster["thumbnail_frame_path"] = cluster["items"][0]["frame_path"]
    results["clusters"] = new_clusters
    return results


def _named_people_index() -> list[dict]:
    people = {}
    for project_id in list_projects():
        results_path = DATA_DIR / project_id / "results.json"
        if not results_path.exists():
            continue
        status_path = DATA_DIR / project_id / "status.json"
        if status_path.exists():
            try:
                status = load_json(status_path)
                if status.get("state") != "done":
                    continue
            except Exception:
                pass
        results = _attach_source_links(load_json(results_path))
        for cluster in results.get("clusters", []):
            name = (cluster.get("manual_name") or "").strip()
            if not name:
                continue
            key = _normalize_name(name)
            if key not in people:
                people[key] = {"name": name, "slug": _slugify(name), "count": 0, "project_ids": set(), "thumb": ""}
            people[key]["count"] += int(cluster.get("count", 0))
            people[key]["project_ids"].add(project_id)
            thumb = cluster.get("thumbnail_face_path") or (cluster.get("items") or [{}])[0].get("face_path", "")
            if thumb and not people[key]["thumb"]:
                people[key]["thumb"] = f"/data/{project_id}/{thumb}"
    cards = []
    for p in people.values():
        cards.append(
            {
                "name": p["name"],
                "slug": p["slug"],
                "count": p["count"],
                "project_count": len(p["project_ids"]),
                "thumb": p["thumb"],
            }
        )
    cards.sort(key=lambda x: (-x["count"], x["name"].casefold()))
    return cards


def _save_status(project_dir: Path, state: str, message: str = "", extra: dict | None = None) -> None:
    payload = {"state": state, "message": message}
    if extra:
        payload.update(extra)
    save_json(project_dir / "status.json", payload)


def _process_uploaded_file(project_dir: Path, upload_path: Path, suffix: str) -> None:
    try:
        _save_status(project_dir, "processing", "Processing upload...")
        result = process_image(upload_path, project_dir) if suffix in ALLOWED_IMAGE_EXTENSIONS else process_video(upload_path, project_dir)
        payload = result.model_dump()
        payload["source_url"] = None
        payload["source_date"] = None
        payload = _merge_same_manual_names(_attach_source_links(payload))
        save_json(project_dir / "results.json", payload)
        _save_status(project_dir, "done", "Finished.")
    except Exception as e:
        _save_status(project_dir, "error", str(e))


def _process_youtube(project_dir: Path, youtube_url: str) -> None:
    try:
        _save_status(project_dir, "processing", "Downloading YouTube video...")
        download_info = download_youtube_video(youtube_url.strip(), project_dir / "uploads")
        video_path = Path(download_info["video_path"])
        _save_status(project_dir, "processing", "Processing downloaded video...")
        result = process_video(video_path, project_dir)
        payload = result.model_dump()
        payload["source_url"] = youtube_url.strip()
        payload["source_date"] = download_info.get("upload_date")
        payload = _merge_same_manual_names(_attach_source_links(payload))
        save_json(project_dir / "results.json", payload)
        _save_status(project_dir, "done", "Finished.")
    except Exception as e:
        _save_status(project_dir, "error", str(e))


def _parse_bulk_links(raw: str) -> list[str]:
    links = []
    for line in raw.splitlines():
        line = line.strip()
        if line and (line.startswith("http://") or line.startswith("https://")):
            links.append(line)
    out = []
    seen = set()
    for link in links:
        if link not in seen:
            seen.add(link)
            out.append(link)
    return out


def _process_bulk_youtube(parent_project_dir: Path, links: list[str]) -> None:
    created = []
    total = len(links)
    try:
        for idx, link in enumerate(links, start=1):
            child = new_project_dir("youtube")
            created.append(child.name)
            _save_status(parent_project_dir, "processing", f"Processing link {idx}/{total}", {"children": created, "total_links": total})
            _process_youtube(child, link)
        _save_status(parent_project_dir, "done", "Bulk queue finished.", {"children": created, "total_links": total})
    except Exception as e:
        _save_status(parent_project_dir, "error", str(e), {"children": created, "total_links": total})


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "projects": list_projects(),
            "named_people": _named_people_index(),
            "max_bulk": MAX_BULK_YOUTUBE_LINKS,
            "reference_sets": list_reference_sets(),
        },
    )


@app.get("/search", response_class=HTMLResponse)
def search_page(request: Request):
    return templates.TemplateResponse("search.html", {"request": request, "matches": None, "query_face": "", "query_frame": "", "faces_detected": 0, "error": ""})


@app.post("/search-photo", response_class=HTMLResponse)
async def search_photo(request: Request, file: UploadFile = File(...)):
    suffix = _suffix(file.filename or "")
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, JPEG, or WEBP image.")

    search_dir = new_search_dir()
    safe_name = _safe_upload_name(file.filename or "query.jpg", default_stem="query")
    upload_path = search_dir / "uploads" / safe_name
    with upload_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        extracted = extract_best_search_face(upload_path, search_dir)
        matches = search_matches(extracted["feature"], compute_face_feature_public)
        return templates.TemplateResponse(
            "search.html",
            {
                "request": request,
                "matches": matches,
                "query_face": f"/data/{extracted['query_face_path']}",
                "query_frame": f"/data/{extracted['query_frame_path']}",
                "faces_detected": extracted["faces_detected"],
                "error": "",
            },
        )
    except Exception as e:
        return templates.TemplateResponse(
            "search.html",
            {
                "request": request,
                "matches": [],
                "query_face": "",
                "query_frame": "",
                "faces_detected": 0,
                "error": str(e),
            },
            status_code=400,
        )


@app.post("/upload-known")
async def upload_known_reference(reference_name: str = Form(...), files: list[UploadFile] = File(...)):
    valid = []
    for f in files:
        if _suffix(f.filename or "") in ALLOWED_IMAGE_EXTENSIONS:
            valid.append((f.filename or "image.jpg", await f.read()))
    if not reference_name.strip() or not valid:
        raise HTTPException(status_code=400, detail="Reference set name and valid images are required.")
    save_reference_images(reference_name.strip(), valid)
    return RedirectResponse("/", status_code=303)


@app.get("/reference-set/{slug}", response_class=HTMLResponse)
def reference_set_page(request: Request, slug: str):
    ref = get_reference_set(slug)
    if not ref:
        raise HTTPException(status_code=404, detail="Reference set not found.")
    return templates.TemplateResponse("reference_set.html", {"request": request, "ref": ref})


@app.post("/reference-set/{slug}/delete")
async def delete_reference_set(slug: str):
    remove_reference_set(slug)
    return RedirectResponse("/", status_code=303)


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    suffix = _suffix(file.filename or "")
    if suffix not in ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type.")
    project_dir = new_project_dir("upload")
    safe_name = _safe_upload_name(file.filename)
    upload_path = project_dir / "uploads" / safe_name
    with upload_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    _save_status(project_dir, "queued", "Queued...")
    threading.Thread(target=_process_uploaded_file, args=(project_dir, upload_path, suffix), daemon=True).start()
    return RedirectResponse(f"/processing/{project_dir.name}", status_code=303)


@app.post("/youtube")
async def youtube_submit(youtube_url: str = Form(...)):
    project_dir = new_project_dir("youtube")
    _save_status(project_dir, "queued", "Queued...")
    threading.Thread(target=_process_youtube, args=(project_dir, youtube_url.strip()), daemon=True).start()
    return RedirectResponse(f"/processing/{project_dir.name}", status_code=303)


@app.post("/youtube-bulk")
async def youtube_bulk_submit(youtube_urls: str = Form(...)):
    links = _parse_bulk_links(youtube_urls)
    if not links:
        raise HTTPException(status_code=400, detail="No valid links found.")
    if len(links) > MAX_BULK_YOUTUBE_LINKS:
        raise HTTPException(status_code=400, detail=f"Too many links. Max is {MAX_BULK_YOUTUBE_LINKS}.")
    batch_dir = new_project_dir("batch")
    _save_status(batch_dir, "queued", "Queued bulk links...", {"children": [], "total_links": len(links)})
    threading.Thread(target=_process_bulk_youtube, args=(batch_dir, links), daemon=True).start()
    return RedirectResponse(f"/processing/{batch_dir.name}", status_code=303)


@app.get("/processing/{project_id}", response_class=HTMLResponse)
def processing_page(request: Request, project_id: str):
    status_path = DATA_DIR / project_id / "status.json"
    if not status_path.exists():
        raise HTTPException(status_code=404, detail="Project not found.")
    status = load_json(status_path)
    if status.get("state") == "done":
        children = status.get("children") or []
        if children and project_id.startswith("batch_"):
            return templates.TemplateResponse("processing.html", {"request": request, "project_id": project_id, "status": status, "done_batch": True})
        return RedirectResponse(f"/project/{project_id}", status_code=303)
    return templates.TemplateResponse("processing.html", {"request": request, "project_id": project_id, "status": status, "done_batch": False})


@app.get("/project/{project_id}", response_class=HTMLResponse)
def project_page(request: Request, project_id: str):
    results_path = DATA_DIR / project_id / "results.json"
    if not results_path.exists():
        status_path = DATA_DIR / project_id / "status.json"
        if status_path.exists():
            status = load_json(status_path)
            if status.get("state") in {"queued", "processing"}:
                return RedirectResponse(f"/processing/{project_id}", status_code=303)
        raise HTTPException(status_code=404, detail="Project not found.")
    results = _merge_same_manual_names(_attach_source_links(load_json(results_path)))
    return templates.TemplateResponse("project.html", {"request": request, "project": results, "project_id": project_id, "person_slug": person_slug})


@app.post("/project/{project_id}/rename")
async def rename_cluster(project_id: str, cluster_id: int = Form(...), manual_name: str = Form(...)):
    results_path = DATA_DIR / project_id / "results.json"
    if not results_path.exists():
        raise HTTPException(status_code=404, detail="Project not found.")
    results = load_json(results_path)
    found = False
    for cluster in results.get("clusters", []):
        if int(cluster["cluster_id"]) == cluster_id:
            cluster["manual_name"] = manual_name.strip()
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Cluster not found.")
    results = _merge_same_manual_names(_attach_source_links(results))
    save_json(results_path, results)
    return RedirectResponse(f"/project/{project_id}", status_code=303)


@app.post("/project/{project_id}/bulk-rename")
async def bulk_rename_clusters(project_id: str, cluster_id: list[int] = Form(...), manual_name: list[str] = Form(...)):
    if len(cluster_id) != len(manual_name):
        raise HTTPException(status_code=400, detail="Mismatched bulk rename payload.")
    results_path = DATA_DIR / project_id / "results.json"
    if not results_path.exists():
        raise HTTPException(status_code=404, detail="Project not found.")
    results = load_json(results_path)
    id_to_name = {int(cid): (name or "").strip() for cid, name in zip(cluster_id, manual_name)}
    for cluster in results.get("clusters", []):
        cid = int(cluster["cluster_id"])
        if cid in id_to_name:
            cluster["manual_name"] = id_to_name[cid]
    results = _merge_same_manual_names(_attach_source_links(results))
    save_json(results_path, results)
    return RedirectResponse(f"/project/{project_id}", status_code=303)


@app.get("/person/{slug}", response_class=HTMLResponse)
def person_page(request: Request, slug: str):
    matches = []
    display_name = None
    person_thumb = ""
    first_source_link = ""
    for project_id in list_projects():
        results_path = DATA_DIR / project_id / "results.json"
        if not results_path.exists():
            continue
        results = _attach_source_links(load_json(results_path))
        project_date = results.get("source_date")
        for cluster in results.get("clusters", []):
            manual_name = (cluster.get("manual_name") or "").strip()
            if not manual_name or _slugify(manual_name) != slug:
                continue
            if display_name is None:
                display_name = manual_name
            if not person_thumb:
                thumb = cluster.get("thumbnail_face_path") or (cluster.get("items") or [{}])[0].get("face_path", "")
                if thumb:
                    person_thumb = f"/data/{project_id}/{thumb}"
            for item in cluster.get("items", []):
                row = dict(item)
                row["project_id"] = project_id
                row["project_url"] = f"/project/{project_id}"
                row["source_date"] = project_date or ""
                matches.append(row)
                if not first_source_link and row.get("source_link"):
                    first_source_link = row["source_link"]
    if not matches:
        raise HTTPException(status_code=404, detail="Person not found.")
    matches.sort(key=lambda it: (it["source_date"] == "", it["source_date"], float(it.get("timestamp_sec", 0.0))))
    grouped = defaultdict(list)
    for item in matches:
        grouped[item["source_date"] or "Unknown date"].append(item)
    grouped_dates = [{"date": date_key, "items": grouped[date_key]} for date_key in sorted(grouped.keys(), key=lambda d: (d == "Unknown date", d))]
    return templates.TemplateResponse(
        "person.html",
        {
            "request": request,
            "person_name": display_name or slug,
            "items": matches,
            "grouped_dates": grouped_dates,
            "slug": slug,
            "person_thumb": person_thumb,
            "first_source_link": first_source_link,
        },
    )
