# PetConnect Rebuilt

This is a rebuilt, improved version of the uploaded FastAPI face-clustering app.

## What changed

- sanitizes uploaded filenames before writing them to disk
- makes person slugs stable across restarts
- reuses the MediaPipe face detector across frames instead of recreating it per frame
- normalizes embeddings once at creation time
- disables unused age analysis to avoid extra DeepFace work
- caches reference-set prototypes
- stops rewriting `results.json` during GET requests
- validates bulk rename payload length
- allows downloaded YouTube videos in non-mp4 containers to be found correctly
- includes a minimal working template set so the app can run end-to-end

## Install

```bash
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

Then open:

```text
http://127.0.0.1:8000
```

## Notes

This rebuild is based on the accessible backend files and the improvement pass from this chat. The HTML templates were recreated so the project is directly runnable.
