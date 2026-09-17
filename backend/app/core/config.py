from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = (
        "postgresql+psycopg://pavesight:pavesight@localhost:5432/pavesight"
    )

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24

    # Media storage (local disk for MVP; swap for S3-compatible client later)
    media_root: str = "media"
    media_url_prefix: str = "/media"

    # Live-detection inference (YOLOv8 model fine-tuned on the road-damage dataset)
    inference_model_path: str = "app/ml/road_damage_yolov8.pt"
    inference_confidence_threshold: float = 0.35

    # Priority scoring
    priority_half_life_days: float = 30.0
    priority_severity_weights: dict = {"low": 1.0, "medium": 3.0, "high": 6.0}
    cluster_eps_degrees: float = 0.00045  # ~50 meters at the equator
    cluster_min_points: int = 1

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    api_v1_prefix: str = "/api/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
