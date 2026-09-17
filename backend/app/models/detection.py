from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import CheckConstraint, DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Detection(Base):
    __tablename__ = "detections"
    __table_args__ = (
        CheckConstraint("severity IN ('low','medium','high')", name="ck_detections_severity"),
        CheckConstraint(
            "status IN ('pending','scheduled','repaired')", name="ck_detections_status"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    geom = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    altitude_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    defect_class: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    area_m2: Mapped[float | None] = mapped_column(Float, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    status_history: Mapped[list["StatusHistory"]] = relationship(
        back_populates="detection", cascade="all, delete-orphan"
    )
