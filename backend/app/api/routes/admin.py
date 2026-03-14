from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.dependencies import require_actor
from app.schemas.domain import AdminDashboardResponse, AuthenticatedUser, ListingDetailResponse, Role

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(actor: AuthenticatedUser = Depends(require_actor)) -> AdminDashboardResponse:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return AdminDashboardResponse(
        pending_institutions=[],
        listings_for_review=[],
        requests_requiring_attention=[],
        active_threads=[],
        recent_actions=[],
    )


@router.get("/listings/{listing_id}", response_model=ListingDetailResponse)
def get_admin_listing_detail(
    listing_id: str,
    actor: AuthenticatedUser = Depends(require_actor),
) -> ListingDetailResponse:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")
