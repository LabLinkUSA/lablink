from fastapi import APIRouter, Depends, Query

from app.api.routes.dependencies import require_actor
from app.schemas.domain import AuthenticatedUser, MarkNotificationsViewedResponse, NotificationListResponse
from app.services.supabase_listings import get_supabase_listing_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    limit: int = Query(default=20, ge=1, le=50),
    before: str | None = Query(default=None),
    actor: AuthenticatedUser = Depends(require_actor),
) -> NotificationListResponse:
    return get_supabase_listing_service().list_notifications(actor, limit=limit, before=before)


@router.post("/view-all", response_model=MarkNotificationsViewedResponse)
def mark_notifications_viewed(
    actor: AuthenticatedUser = Depends(require_actor),
) -> MarkNotificationsViewedResponse:
    return get_supabase_listing_service().mark_notifications_viewed(actor)
