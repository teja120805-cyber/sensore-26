from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.inference import InferenceResponse
from app.services.inference import ModelNotAvailable, run_inference

router = APIRouter(prefix="/inference", tags=["inference"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024


@router.post("/detect", response_model=InferenceResponse)
async def detect(image: UploadFile = File(...)) -> InferenceResponse:
    data = await image.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 15MB)")

    try:
        return run_inference(data)
    except ModelNotAvailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
