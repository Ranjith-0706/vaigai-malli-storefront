from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_SECRET = "dev-only-insecure-secret-do-not-use-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://saree:saree_local_pw@localhost:5433/saree"
    jwt_secret: str = _DEV_SECRET
    environment: str = "development"
    cors_origins: str = "http://localhost:3000"
    payment_provider: str = "demo"
    cookie_secure: bool = False
    upload_dir: str = "uploads"
    reservation_minutes: int = 30
    admin_session_hours: int = 12
    max_upload_bytes: int = 4 * 1024 * 1024
    admin_email: str | None = None
    admin_password: str | None = None

    @model_validator(mode="after")
    def _check_prod(self) -> "Settings":
        if self.environment == "production" and (self.jwt_secret == _DEV_SECRET or len(self.jwt_secret) < 32):
            raise ValueError("JWT_SECRET must be set to a random 32+ char value in production")
        if self.payment_provider not in {"demo"}:
            raise ValueError("PAYMENT_PROVIDER must be 'demo' (no live provider is implemented)")
        return self

    @property
    def sqlalchemy_database_url(self) -> str:
        """Use psycopg 3 for standard provider PostgreSQL URLs."""
        if self.database_url.startswith("postgres://"):
            return "postgresql+psycopg://" + self.database_url[len("postgres://"):]
        if self.database_url.startswith("postgresql://"):
            return "postgresql+psycopg://" + self.database_url[len("postgresql://"):]
        return self.database_url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
