from app.core.config import get_settings

settings = get_settings()
print(f"CORS_ORIGINS: {settings.cors_origins}")
print(f"CORS_ORIGIN_LIST: {settings.cors_origin_list}")
