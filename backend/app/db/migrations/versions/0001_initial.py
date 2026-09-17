"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-09-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "detections",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("reported_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("geom", Geography(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("altitude_m", sa.REAL(), nullable=True),
        sa.Column("defect_class", sa.Text(), nullable=False),
        sa.Column("severity", sa.Text(), nullable=False),
        sa.Column("confidence", sa.REAL(), nullable=False),
        sa.Column("area_m2", sa.REAL(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("severity IN ('low','medium','high')", name="ck_detections_severity"),
        sa.CheckConstraint(
            "status IN ('pending','scheduled','repaired')", name="ck_detections_status"
        ),
    )
    op.create_index(
        "detections_geom_idx", "detections", ["geom"], postgresql_using="gist"
    )

    op.create_table(
        "status_history",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "detection_id", sa.BigInteger(), sa.ForeignKey("detections.id"), nullable=True
        ),
        sa.Column("old_status", sa.Text(), nullable=True),
        sa.Column("new_status", sa.Text(), nullable=True),
        sa.Column("changed_by", sa.Text(), nullable=True),
        sa.Column(
            "changed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )

    op.create_table(
        "admin_users",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.Text(), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )


def downgrade() -> None:
    op.drop_table("admin_users")
    op.drop_table("status_history")
    op.drop_index("detections_geom_idx", table_name="detections")
    op.drop_table("detections")
