from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LabLink API"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"
    frontend_origin: str = "http://localhost:3000"
    demo_seed_path: Path = Path(__file__).resolve().parents[3] / "shared" / "seed" / "lablink.seed.json"
    supabase_url: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("LABLINK_SUPABASE_URL", "SUPABASE_URL"),
    )
    supabase_service_role_key: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("LABLINK_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    )
    supabase_listing_images_bucket: str = Field(
        default="listing-images",
        validation_alias=AliasChoices("LABLINK_SUPABASE_LISTING_IMAGES_BUCKET", "SUPABASE_LISTING_IMAGES_BUCKET"),
    )
    resend_api_key: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("LABLINK_RESEND_API_KEY", "RESEND_API_KEY"),
    )
    email_from: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("LABLINK_EMAIL_FROM", "EMAIL_FROM"),
    )
    email_reply_to: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("LABLINK_EMAIL_REPLY_TO", "EMAIL_REPLY_TO"),
    )
    supabase_jwt_audience: str = Field(
        default="authenticated",
        validation_alias=AliasChoices("LABLINK_SUPABASE_JWT_AUDIENCE", "SUPABASE_JWT_AUDIENCE"),
    )

    model_config = SettingsConfigDict(env_prefix="LABLINK_", env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
