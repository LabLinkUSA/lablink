from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LabLink API"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"
    frontend_origin: str = "http://localhost:3000"
    demo_seed_path: Path = Path(__file__).resolve().parents[3] / "shared" / "seed" / "lablink.seed.json"
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_jwt_audience: str = "authenticated"

    model_config = SettingsConfigDict(env_prefix="LABLINK_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
