from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.dependencies import require_actor
from app.schemas.domain import AdminDashboardResponse, AuthenticatedUser, ListingDetailResponse, Role
from app.services.demo_data import get_demo_repository

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(actor: AuthenticatedUser = Depends(require_actor)) -> AdminDashboardResponse:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_demo_repository().admin_dashboard()


@router.get("/listings/{listing_id}", response_model=ListingDetailResponse)
def get_admin_listing_detail(
    listing_id: str,
    actor: AuthenticatedUser = Depends(require_actor),
) -> ListingDetailResponse:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_demo_repository().get_listing_detail(listing_id, include_requests=True)

