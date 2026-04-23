from fastapi import APIRouter

from app.api.routes import admin, auth, bookmarks, datasets, health, posts, profile, training

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(training.router, prefix="/training-runs", tags=["training-runs"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
api_router.include_router(bookmarks.router, prefix="/bookmarks", tags=["bookmarks"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
