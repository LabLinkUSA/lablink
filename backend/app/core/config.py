from functools import lru_cache
from typing import Optional

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LabLink API"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"
    frontend_origin: str = "http://localhost:3000"
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
    supabase_listing_documents_bucket: str = Field(
        default="listing-documents",
        validation_alias=AliasChoices("LABLINK_SUPABASE_LISTING_DOCUMENTS_BUCKET", "SUPABASE_LISTING_DOCUMENTS_BUCKET"),
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
    email_cron_token: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("LABLINK_EMAIL_CRON_TOKEN", "EMAIL_CRON_TOKEN"),
    )
    notification_webhook_secret: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("LABLINK_NOTIFICATION_WEBHOOK_SECRET", "NOTIFICATION_WEBHOOK_SECRET"),
    )
    email_batch_size: int = Field(
        default=50,
        validation_alias=AliasChoices("LABLINK_EMAIL_BATCH_SIZE", "EMAIL_BATCH_SIZE"),
    )
    email_max_attempts: int = Field(
        default=5,
        validation_alias=AliasChoices("LABLINK_EMAIL_MAX_ATTEMPTS", "EMAIL_MAX_ATTEMPTS"),
    )
    supabase_jwt_audience: str = Field(
        default="authenticated",
        validation_alias=AliasChoices("LABLINK_SUPABASE_JWT_AUDIENCE", "SUPABASE_JWT_AUDIENCE"),
    )

    model_config = SettingsConfigDict(
        env_prefix="LABLINK_",
        env_file=(".env", ".env.local"),
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
