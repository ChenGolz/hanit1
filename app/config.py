from pathlib import Path
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
REFERENCE_SETS_DIR = DATA_DIR / "reference_sets"

FRAME_SAMPLE_EVERY_SECONDS = float(os.getenv("FRAME_SAMPLE_EVERY_SECONDS", "2.5"))
USE_SCENE_DETECTION = os.getenv("USE_SCENE_DETECTION", "0") == "1"

CLUSTER_EPS = float(os.getenv("CLUSTER_EPS", "0.34"))
CLUSTER_MIN_SAMPLES = int(os.getenv("CLUSTER_MIN_SAMPLES", "2"))
MAX_IMAGE_DIMENSION = int(os.getenv("MAX_IMAGE_DIMENSION", "2000"))

FACE_MARGIN_RATIO = float(os.getenv("FACE_MARGIN_RATIO", "0.18"))
REVIEW_MARGIN_RATIO = float(os.getenv("REVIEW_MARGIN_RATIO", "0.95"))

MIN_FACE_WIDTH = int(os.getenv("MIN_FACE_WIDTH", "42"))
MIN_FACE_HEIGHT = int(os.getenv("MIN_FACE_HEIGHT", "42"))
MIN_FACE_AREA = int(os.getenv("MIN_FACE_AREA", "2200"))
MIN_BRIGHTNESS = float(os.getenv("MIN_BRIGHTNESS", "40.0"))
MIN_SHARPNESS = float(os.getenv("MIN_SHARPNESS", "55.0"))
MIN_REVIEW_CROP_SIZE = int(os.getenv("MIN_REVIEW_CROP_SIZE", "220"))

SMART_DEDUP_MAX_GAP_SECONDS = float(os.getenv("SMART_DEDUP_MAX_GAP_SECONDS", "30.0"))
SMART_DEDUP_FEATURE_SIMILARITY = float(os.getenv("SMART_DEDUP_FEATURE_SIMILARITY", "0.975"))
SMART_DEDUP_BBOX_IOU = float(os.getenv("SMART_DEDUP_BBOX_IOU", "0.28"))

ANON_MATCH_THRESHOLD = float(os.getenv("ANON_MATCH_THRESHOLD", "0.88"))
REFERENCE_SET_MATCH_THRESHOLD = float(os.getenv("REFERENCE_SET_MATCH_THRESHOLD", "0.84"))

MAX_BULK_YOUTUBE_LINKS = int(os.getenv("MAX_BULK_YOUTUBE_LINKS", "8"))

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

DATA_DIR.mkdir(parents=True, exist_ok=True)
REFERENCE_SETS_DIR.mkdir(parents=True, exist_ok=True)
