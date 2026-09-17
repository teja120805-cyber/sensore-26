from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["low", "medium", "high"]
Status = Literal["pending", "scheduled", "repaired"]


class DetectionIngest(BaseModel):
    timestamp: datetime
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    altitude_m: float | None = None
    severity: Severity
    confidence: float = Field(ge=0, le=1)
    area_m2: float | None = None
    defect_class: str
    image_base64: str | None = None


class DetectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reported_at: datetime
    lat: float
    lon: float
    altitude_m: float | None
    defect_class: str
    severity: Severity
    confidence: float
    area_m2: float | None
    image_url: str | None
    status: Status
    created_at: datetime


class DetectionListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[DetectionOut]


class StatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    old_status: Status | None
    new_status: Status | None
    changed_by: str | None
    changed_at: datetime


class DetectionUpdate(BaseModel):
    status: Status


class DetectionUpdateResponse(DetectionOut):
    status_history: list[StatusHistoryOut] = []
