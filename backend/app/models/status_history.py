from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    detection_id: Mapped[int] = mapped_column(ForeignKey("detections.id"), nullable=True)
    old_status: Mapped[str | None] = mapped_column(String, nullable=True)
    new_status: Mapped[str | None] = mapped_column(String, nullable=True)
    changed_by: Mapped[str | None] = mapped_column(String, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    detection: Mapped["Detection"] = relationship(back_populates="status_history")
