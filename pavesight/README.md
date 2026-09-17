# PaveSight

AI-based pothole and road-damage intelligence system. This repo is the **web
application half**: a FastAPI + PostGIS backend and a React/Leaflet frontend.
A drone (Raspberry Pi + YOLOv8-nano + MAVLink) will eventually POST detection
events to this backend's ingestion endpoint — that edge pipeline is not part
of this repo. Until it exists, the app runs standalone against seeded data,
and accepts real detections later through the exact same API with zero
changes.

## Stack

- **Backend**: FastAPI, SQLAlchemy + GeoAlchemy2, PostgreSQL + PostGIS, Pydantic v2, JWT auth (python-jose + passlib/bcrypt).
- **Frontend**: React + Vite + TypeScript, Tailwind CSS, react-leaflet (OpenStreetMap tiles), leaflet.heat, leaflet.markercluster.
- **Live detection**: `POST /api/v1/inference/detect` decodes an uploaded frame with OpenCV and runs it through a YOLOv8n model (Ultralytics) fine-tuned on a small Roboflow road-damage dataset (`crack` / `pothole`, ~700 training images). See `../training/` (sibling directory, not part of this repo) for the download/train scripts and `backend/app/ml/` for where the resulting `road_damage_yolov8.pt` is expected — that file is gitignored as a build artifact, not source.
- **Transport**: REST only for this MVP. The ingestion endpoint is transport-agnostic, so MQTT can be layered on later without touching the schema or business logic.

## Repo layout

```
pavesight/
  backend/
    app/
      main.py                FastAPI app, CORS, static /media mount
      core/                   config.py, security.py (JWT + password hashing)
      models/                 SQLAlchemy models (Detection, StatusHistory, AdminUser)
      schemas/                Pydantic request/response models
      api/v1/                 routers: detections, heatmap, priority, auth, stats, inference
      services/               priority.py (pure scoring), clustering.py (PostGIS), geo.py,
                               inference.py (OpenCV decode + YOLOv8 predict, model_config lru-cached)
      ml/                     road_damage_yolov8.pt goes here (gitignored build artifact)
      db/                     session.py, base.py, Alembic migrations
    seed/seed_data.py         generates ~150 synthetic detections + one admin user
    tests/                    pytest: priority-scoring unit tests, ingestion integration test
    Dockerfile
  frontend/
    src/
      layouts/AppLayout.tsx    sidebar + topbar shell used by every page except /login
      components/
        layout/                Sidebar, Topbar
        map/                   MapFilterPanel, DefectTypePills, MapLegend
        reports/               DetectionDetailModal
        ui/                    Card, StatCard, PageHeader, Tabs, Switch
        Map, HeatmapLayer, MarkerLayer, PriorityClusterLayer, DetectionPopup, StatusBadge
      pages/                   Dashboard, LiveDetection, MapViewPage, RoadAnalysis,
                               RepairPriority, Reports, Settings, Login
      api/client.ts            typed API client, one function per endpoint
      lib/                     severity/tier helpers, format helpers, client-side
                               settings store, JWT-decoding auth hook
      types/                   TypeScript types matching backend Pydantic models
    Dockerfile
  docker-compose.yml
  Makefile
```

## Setup

1. Copy the env files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   Edit `backend/.env` and set a real `JWT_SECRET_KEY` (the example value is a placeholder, not safe for anything beyond local dev).

2. Bring everything up:
   ```bash
   docker compose up --build
   ```
   This starts Postgres+PostGIS, runs Alembic migrations automatically (`alembic upgrade head` runs before the API server starts), and starts the FastAPI backend and the Vite dev server. No other manual steps are required.

   - Backend: http://localhost:8000 (docs at http://localhost:8000/docs)
   - Frontend: http://localhost:5173

3. Seed demo data (in a second terminal, once `db` is healthy):
   ```bash
   make seed
   # or:
   docker compose run --rm backend python -m seed.seed_data
   ```
   This generates ~150 synthetic detections along real Bangalore road corridors (timestamps spread over the last 60 days, a realistic severity/status mix, and a handful of tight geographic clusters so priority ranking has something to rank), plus **one admin user**. The generated password is printed to the console — copy it immediately, it is not stored anywhere in plaintext.

   Reload the frontend after seeding; the map, heatmap, and Top Priority panel populate immediately.

## Environment variables

**backend/.env**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLAlchemy connection string (psycopg3), e.g. `postgresql+psycopg://pavesight:pavesight@db:5432/pavesight` |
| `JWT_SECRET_KEY` | Signing key for admin JWTs — set a real secret |
| `JWT_ALGORITHM` | Defaults to `HS256` |
| `JWT_EXPIRE_MINUTES` | Token lifetime, default 1440 (24h) |
| `MEDIA_ROOT` | Local disk path for stored detection images |
| `MEDIA_URL_PREFIX` | URL prefix the API serves `/media` files under |
| `CORS_ORIGINS` | JSON list of allowed frontend origins |

**frontend/.env**

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API, e.g. `http://localhost:8000/api/v1` |

## API surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/detections` | none | Ingest a new detection event |
| GET | `/api/v1/detections` | none | Paginated list, filters: `bbox`, `date_from`, `date_to`, `severity`, `status` |
| GET | `/api/v1/detections/{id}` | none | Full detail including image URL |
| PATCH | `/api/v1/detections/{id}` | JWT | Update status; writes a `status_history` row |
| GET | `/api/v1/heatmap` | none | GeoJSON FeatureCollection weighted by severity |
| GET | `/api/v1/priority-clusters` | none | Ranked clusters with score, centroid, detection count, dominant severity |
| POST | `/api/v1/auth/login` | none | Email + password -> JWT |
| GET | `/api/v1/stats` | none | Summary counts (total, by severity, by status) |

Full interactive docs (Swagger UI) at `http://localhost:8000/docs` once the backend is running.

### Ingesting a detection manually with curl

This is the exact payload shape the drone's edge pipeline will eventually POST — no API changes are anticipated when it comes online.

```bash
curl -X POST http://localhost:8000/api/v1/detections \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-09-16T10:42:11Z",
    "lat": 12.971599,
    "lon": 77.594566,
    "altitude_m": 12.4,
    "severity": "medium",
    "confidence": 0.83,
    "area_m2": 0.14,
    "defect_class": "pothole"
  }'
```

To also attach a photo, add `"image_base64": "<jpeg-encoded, resized detection crop, base64>"` to the body — the API decodes it, writes it under `MEDIA_ROOT`, and stores the resulting URL on the row.

### Logging in and updating a detection's status

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pavesight.dev","password":"<the password printed by the seed script>"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -X PATCH http://localhost:8000/api/v1/detections/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"scheduled"}'
```

## Priority scoring

Implemented in `backend/app/services/priority.py` (pure, no DB dependency) and
wired to PostGIS clustering in `backend/app/services/clustering.py`:

```
PriorityScore(cluster) = sum_i [ weight(severity_i) * confidence_i * decay(age_i) ]

weight(low) = 1, weight(medium) = 3, weight(high) = 6
decay(age_days) = exp(-ln(2) * age_days / 30)   # 30-day half-life
```

Detections are grouped with `ST_ClusterDBSCAN(geom, eps, minpoints := 1)`
(`eps` ~50m, configurable in `core/config.py`), then each cluster's centroid
and PriorityScore are computed and clusters are returned ranked descending by
score.

## Tests

```bash
make test
# or:
docker compose run --rm backend pytest
```

- `tests/test_priority.py` — unit tests for the scoring service: a single recent high-severity detection outscores several old low-severity ones, decay falls off smoothly and monotonically with age (0.5 at one half-life, 0.25 at two), and confidence scales contribution linearly.
- `tests/test_ingestion.py` — integration test: POST a detection, then GET it back via both the detail and list endpoints; also covers 404 on an unknown id and 401 on an unauthenticated PATCH. Requires a live Postgres+PostGIS (the `db` service).

## Not in scope for this MVP

These were explicitly deferred rather than half-built:

- **MQTT** — the ingestion endpoint is transport-agnostic REST; an MQTT bridge can be added later without changing the schema or business logic.
- **`road_segments` table** — clusters are computed on the fly with `ST_ClusterDBSCAN` over `detections`; the heatmap and priority panel look the same either way, and it's cheaper to ship.
- **Multi-tenancy** — one shared dataset, one admin role. No per-organization scoping, RBAC, or tenant isolation.

## Notes on the drone/edge pipeline

This backend's `POST /api/v1/detections` endpoint is exactly what the
Raspberry Pi + YOLOv8-nano edge pipeline will call once it exists. Severity
thresholds (`<0.05 m² -> low`, `0.05-0.25 m² -> medium`, `>0.25 m² -> high`)
are decided upstream on the edge device and sent as-is; this API stores and
uses the given severity, it does not recompute it. No API changes are
anticipated when the drone pipeline is connected.
