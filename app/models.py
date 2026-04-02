from typing import List, Optional

from pydantic import BaseModel, Field


class FaceItem(BaseModel):
    timestamp_sec: float
    frame_path: str
    face_path: str
    bbox: List[int]
    source_link: str = ""


class ClusterResult(BaseModel):
    cluster_id: int
    display_name: str
    manual_name: str = ""
    count: int
    items: List[FaceItem] = Field(default_factory=list)

    thumbnail_face_path: str = ""
    thumbnail_frame_path: str = ""

    possible_match: bool = False
    possible_match_score: float = 0.0
    possible_match_project_id: str = ""
    possible_match_cluster_id: int = -1
    possible_match_label: str = ""

    possible_reference_match: bool = False
    possible_reference_label: str = ""
    possible_reference_score: float = 0.0


class ProjectResult(BaseModel):
    project_id: str
    source_type: str
    source_name: str
    source_url: Optional[str] = None
    source_date: Optional[str] = None
    clusters: List[ClusterResult] = Field(default_factory=list)
