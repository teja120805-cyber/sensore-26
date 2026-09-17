from fastapi import APIRouter

from app.api.v1 import auth, detections, heatmap, inference, priority, stats

api_router = APIRouter()
api_router.include_router(detections.router)
api_router.include_router(heatmap.router)
api_router.include_router(priority.router)
api_router.include_router(auth.router)
api_router.include_router(stats.router)
api_router.include_router(inference.router)
