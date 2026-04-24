from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "GNN-VP Backend"
    app_env: str = "development"
    app_debug: bool = True
    api_v1_prefix: str = "/api/v1"

    database_url: str = "mysql+pymysql://root@localhost:3306/gnnvp"

    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24

    bootstrap_admin_email: str = "admin@gnn-vp.com"
    bootstrap_admin_password: str = "admin123"
    bootstrap_admin_display_name: str = "Admin GNN"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Rate limiting. Set rate_limit_enabled=false to disable globally (useful
    # for tests). Values follow slowapi's string format: "<count>/<window>".
    rate_limit_enabled: bool = True
    rate_limit_auth_register: str = "20/hour"
    rate_limit_auth_login: str = "15/minute"
    rate_limit_auth_forgot_password: str = "10/hour"
    rate_limit_training_start: str = "30/minute"
    rate_limit_posts_create: str = "60/minute"

    # Password reset. Link points back to the frontend; if SMTP is
    # configured we mail the link, otherwise we log it and return it
    # in-band so developers can still exercise the flow end-to-end.
    password_reset_token_ttl_minutes: int = 60
    frontend_base_url: str = "http://localhost:5173"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "no-reply@gnn-vp.com"
    smtp_use_tls: bool = True
    # When no SMTP host is configured, include the reset URL in the
    # API response so the frontend can surface it for developers. Keep
    # OFF in production.
    expose_reset_url_in_response: bool = True

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
