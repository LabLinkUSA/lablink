from fastapi import APIRouter, Depends

from app.api.routes.dependencies import require_internal_job_token
from app.schemas.domain import NotificationEmailProcessingResponse
from app.services.supabase_listings import get_supabase_listing_service

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/jobs/notification-emails/process", response_model=NotificationEmailProcessingResponse)
def process_notification_emails(
    _: None = Depends(require_internal_job_token),
) -> NotificationEmailProcessingResponse:
    return get_supabase_listing_service().process_notification_emails()
