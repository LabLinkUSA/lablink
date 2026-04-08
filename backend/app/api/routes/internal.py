from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.dependencies import require_internal_job_token, require_notification_webhook_secret
from app.schemas.domain import (
    NotificationEmailDeliveryResponse,
    NotificationEmailProcessingResponse,
    NotificationEmailWebhookRequest,
)
from app.services.supabase_listings import get_supabase_listing_service

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/jobs/notification-emails/process", response_model=NotificationEmailProcessingResponse)
def process_notification_emails(
    _: None = Depends(require_internal_job_token),
) -> NotificationEmailProcessingResponse:
    return get_supabase_listing_service().process_notification_emails()


@router.post("/webhooks/notification-email", response_model=NotificationEmailDeliveryResponse)
def process_notification_email_webhook(
    payload: NotificationEmailWebhookRequest,
    _: None = Depends(require_notification_webhook_secret),
) -> NotificationEmailDeliveryResponse:
    if (
        payload.type != "INSERT"
        or payload.table != "notifications"
        or payload.schema_name != "public"
        or not payload.record
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification email webhook payload.",
        )
    return get_supabase_listing_service().process_notification_email(payload.record.id)
