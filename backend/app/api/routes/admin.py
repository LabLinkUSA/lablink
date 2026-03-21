from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.dependencies import require_actor
from app.schemas.domain import (
    AdminDashboardResponse,
    AuthenticatedUser,
    EquipmentRequest,
    Institution,
    InstitutionVerificationUpdate,
    Listing,
    ListingApprovalUpdate,
    ListingDetailResponse,
    RequestStatusUpdate,
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
    return get_supabase_listing_service().update_listing_status(
        actor,
        listing_id,
        payload.status,
        admin_note=payload.admin_note,
    )


@router.patch("/institutions/{institution_id}", response_model=Institution)
def update_institution_status(
    institution_id: str,
    payload: InstitutionVerificationUpdate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> Institution:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_supabase_listing_service().update_institution_status(
        actor,
        institution_id,
        payload.verification_status,
        admin_note=payload.admin_note,
    )


@router.patch("/requests/{request_id}", response_model=EquipmentRequest)
def update_request_status(
    request_id: str,
    payload: RequestStatusUpdate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> EquipmentRequest:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_supabase_listing_service().update_request_status(
        actor,
        request_id,
        payload.status,
        admin_note=payload.admin_note,
    )


@router.post("/requests/{request_id}/select", response_model=EquipmentRequest)
def select_request_recipient(request_id: str, actor: AuthenticatedUser = Depends(require_actor)) -> EquipmentRequest:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_supabase_listing_service().select_equipment_request(actor, request_id)


@router.post("/listings/{listing_id}/cancel-match", response_model=Listing)
def cancel_listing_match(listing_id: str, actor: AuthenticatedUser = Depends(require_actor)) -> Listing:
    if actor.user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return get_supabase_listing_service().cancel_listing_match(actor, listing_id)
