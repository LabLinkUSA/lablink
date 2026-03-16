from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.dependencies import require_actor
from app.schemas.domain import (
    AdminDashboardResponse,
    AuthenticatedUser,
    Institution,
    InstitutionVerificationUpdate,
    Listing,
    ListingApprovalUpdate,
    ListingDetailResponse,
    Role,
)
from app.services.supabase_listings import get_supabase_listing_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(actor: AuthenticatedUser = Depends(require_actor)) -> AdminDashboardResponse:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_supabase_listing_service().get_admin_dashboard()


@router.get("/listings/{listing_id}", response_model=ListingDetailResponse)
def get_admin_listing_detail(
    listing_id: str,
    actor: AuthenticatedUser = Depends(require_actor),
) -> ListingDetailResponse:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_supabase_listing_service().get_admin_listing_detail(listing_id)


@router.patch("/listings/{listing_id}", response_model=Listing)
def update_listing_status(
    listing_id: str,
    payload: ListingApprovalUpdate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> Listing:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_supabase_listing_service().update_listing_status(actor, listing_id, payload.status)


@router.patch("/institutions/{institution_id}", response_model=Institution)
def update_institution_status(
    institution_id: str,
    payload: InstitutionVerificationUpdate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> Institution:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_supabase_listing_service().update_institution_status(actor, institution_id, payload.verification_status)
