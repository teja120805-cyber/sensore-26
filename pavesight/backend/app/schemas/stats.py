from pydantic import BaseModel


class StatsResponse(BaseModel):
    total: int
    by_severity: dict[str, int]
    by_status: dict[str, int]
