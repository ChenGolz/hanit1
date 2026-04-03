from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/summary")
def get_summary() -> dict[str, object]:
    """Starter endpoint for the hosted phase. Replace the hard-coded numbers
    with database-backed counters once the project moves off GitHub Pages.
    """
    return {
        "reunited_last_24h": 0,
        "searches": 0,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
