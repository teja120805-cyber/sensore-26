"""Generate ~150 synthetic road-defect detections for demo purposes.

Run with:
    docker compose run backend python -m seed.seed_data
or, locally with the venv active and DATABASE_URL pointed at a running Postgres:
    python -m seed.seed_data

Scatters points along a handful of real Bangalore road polylines, spreads
timestamps over the last 60 days, and creates a handful of tight geographic
clusters so priority-cluster ranking has something meaningful to rank.
"""
import random
import secrets
import string
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.admin_user import AdminUser
from app.models.detection import Detection

random.seed(42)

# Approximate polylines (lat, lon) along real Bangalore roads/corridors.
ROADS = {
    "MG Road": [
        (12.9758, 77.6045),
        (12.9752, 77.6068),
        (12.9746, 77.6092),
        (12.9740, 77.6116),
        (12.9735, 77.6140),
    ],
    "Outer Ring Road (Marathahalli-Sarjapur)": [
        (12.9569, 77.7011),
        (12.9500, 77.6980),
        (12.9430, 77.6950),
        (12.9360, 77.6920),
        (12.9290, 77.6890),
        (12.9220, 77.6860),
    ],
    "Bannerghatta Road": [
        (12.9165, 77.5990),
        (12.9080, 77.5970),
        (12.8995, 77.5950),
        (12.8910, 77.5930),
        (12.8825, 77.5910),
    ],
    "Hosur Road": [
        (12.9350, 77.6150),
        (12.9270, 77.6200),
        (12.9190, 77.6250),
        (12.9110, 77.6300),
        (12.9030, 77.6350),
    ],
    "Old Airport Road": [
        (12.9716, 77.6413),
        (12.9740, 77.6460),
        (12.9764, 77.6507),
        (12.9788, 77.6554),
    ],
}

DEFECT_CLASSES = ["pothole", "crack", "rutting", "raveling"]

TOTAL_DETECTIONS = 150
NUM_CLUSTERS = 5
CLUSTER_SIZE_RANGE = (5, 10)
CLUSTER_RADIUS_M = 25.0

STATUS_WEIGHTS = {"pending": 0.60, "scheduled": 0.25, "repaired": 0.15}
SEVERITY_WEIGHTS = {"low": 0.50, "medium": 0.35, "high": 0.15}

# Area ranges consistent with the severity thresholds defined by the edge pipeline.
AREA_RANGES = {
    "low": (0.01, 0.049),
    "medium": (0.05, 0.25),
    "high": (0.26, 0.60),
}


def weighted_choice(weights: dict[str, float]) -> str:
    keys = list(weights.keys())
    probs = list(weights.values())
    return random.choices(keys, weights=probs, k=1)[0]


def random_point_on_road() -> tuple[float, float]:
    road = random.choice(list(ROADS.values()))
    i = random.randint(0, len(road) - 2)
    (lat1, lon1), (lat2, lon2) = road[i], road[i + 1]
    t = random.random()
    lat = lat1 + (lat2 - lat1) * t
    lon = lon1 + (lon2 - lon1) * t
    # small jitter perpendicular-ish to the road so points aren't perfectly linear
    lat += random.uniform(-0.0006, 0.0006)
    lon += random.uniform(-0.0006, 0.0006)
    return lat, lon


def offset_meters(lat: float, lon: float, dx_m: float, dy_m: float) -> tuple[float, float]:
    dlat = dy_m / 111_320.0
    dlon = dx_m / (111_320.0 * abs(__import__("math").cos(__import__("math").radians(lat))) or 1)
    return lat + dlat, lon + dlon


def random_timestamp_last_60_days() -> datetime:
    days_ago = random.uniform(0, 60)
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


def build_detection(lat: float, lon: float) -> Detection:
    severity = weighted_choice(SEVERITY_WEIGHTS)
    lo, hi = AREA_RANGES[severity]
    photo_seed = random.randint(1, 10_000)
    return Detection(
        reported_at=random_timestamp_last_60_days(),
        geom=text(f"ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326)::geography"),
        altitude_m=round(random.uniform(8.0, 25.0), 1),
        defect_class=random.choice(DEFECT_CLASSES),
        severity=severity,
        confidence=round(random.uniform(0.55, 0.98), 3),
        area_m2=round(random.uniform(lo, hi), 3),
        image_url=f"https://picsum.photos/seed/pavesight{photo_seed}/480/320",
        status=weighted_choice(STATUS_WEIGHTS),
    )


def generate_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        detections: list[Detection] = []

        num_clustered = 0
        for _ in range(NUM_CLUSTERS):
            center_lat, center_lon = random_point_on_road()
            cluster_size = random.randint(*CLUSTER_SIZE_RANGE)
            for _ in range(cluster_size):
                dx = random.uniform(-CLUSTER_RADIUS_M, CLUSTER_RADIUS_M)
                dy = random.uniform(-CLUSTER_RADIUS_M, CLUSTER_RADIUS_M)
                lat, lon = offset_meters(center_lat, center_lon, dx, dy)
                detections.append(build_detection(lat, lon))
                num_clustered += 1
                if num_clustered >= TOTAL_DETECTIONS:
                    break
            if num_clustered >= TOTAL_DETECTIONS:
                break

        remaining = TOTAL_DETECTIONS - len(detections)
        for _ in range(remaining):
            lat, lon = random_point_on_road()
            detections.append(build_detection(lat, lon))

        db.add_all(detections)
        db.commit()
        print(f"Seeded {len(detections)} detections across {len(ROADS)} roads "
              f"({NUM_CLUSTERS} tight clusters + scattered singletons).")

        existing_admin = db.query(AdminUser).first()
        if existing_admin is None:
            password = generate_password()
            admin = AdminUser(
                email="admin@pavesight.dev",
                password_hash=hash_password(password),
            )
            db.add(admin)
            db.commit()
            print("\nSeeded admin user:")
            print(f"  email:    {admin.email}")
            print(f"  password: {password}")
            print("(save this now -- it is not stored anywhere in plaintext)\n")
        else:
            print(f"\nAdmin user already exists ({existing_admin.email}); skipped.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
