from fastapi import APIRouter

router = APIRouter()


@router.get("/health/live")
def health_live() -> dict:
    return {"status": "ok"}

