import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.requests import Request

from app.api.router import api_router
from app.core.config import get_settings
from app.core.rate_limit import install_rate_limit_handlers
from app.db.session import SessionLocal
from app.services.auth_service import bootstrap_admin_if_missing

logger = logging.getLogger(__name__)
settings = get_settings()

if settings.app_env == "production" and settings.jwt_secret_key == "change-me-in-production":
    raise RuntimeError(
        "JWT_SECRET_KEY must be set to a strong random value when APP_ENV=production"
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    db = SessionLocal()
    try:
        bootstrap_admin_if_missing(
            db=db,
            email=settings.bootstrap_admin_email,
            password=settings.bootstrap_admin_password,
            display_name=settings.bootstrap_admin_display_name,
        )
    except SQLAlchemyError:
        # Schema may not exist yet. User can run SQL file then restart backend.
        db.rollback()
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    version="0.1.0",
    lifespan=lifespan,
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


install_rate_limit_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)

