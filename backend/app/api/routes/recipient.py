from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.dependencies import require_actor
from app.schemas.domain import (
    AuthenticatedUser,
    EquipmentRequest,
    EquipmentRequestCreate,
    Message,
    MessageCreate,
    RecipientDashboardResponse,
    RequestBoardPost,
    RequestBoardPostCreate,
    Role,
    SavedListingCreate,
    SavedListingStateResponse,
    ThreadDetailResponse,
    AccountStatus,
    VerificationStatus,
)
from app.services.supabase_listings import get_supabase_listing_service

router = APIRouter(prefix="/recipient", tags=["recipient"])


def require_verified_recipient(actor: AuthenticatedUser) -> None:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    if actor.user.account_status != AccountStatus.VERIFIED or actor.institution.verification_status != VerificationStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your institution must be admin-verified before you can request equipment.",
        )


@router.get("/dashboard", response_model=RecipientDashboardResponse)
def get_recipient_dashboard(actor: AuthenticatedUser = Depends(require_actor)) -> RecipientDashboardResponse:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    return get_supabase_listing_service().get_recipient_dashboard(actor)


@router.post("/requests", response_model=EquipmentRequest, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: EquipmentRequestCreate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> EquipmentRequest:
    require_verified_recipient(actor)
    return get_supabase_listing_service().create_equipment_request(actor, payload.listing_id)


@router.get("/saved-listings/{listing_id}", response_model=SavedListingStateResponse)
def get_saved_listing_state(listing_id: str, actor: AuthenticatedUser = Depends(require_actor)) -> SavedListingStateResponse:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    return SavedListingStateResponse(saved=get_supabase_listing_service().get_saved_listing_state(actor, listing_id))


@router.post("/saved-listings", status_code=status.HTTP_204_NO_CONTENT)
def save_listing(
    payload: SavedListingCreate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> None:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    get_supabase_listing_service().save_listing_for_recipient(actor, payload.listing_id)


@router.delete("/saved-listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_saved_listing(listing_id: str, actor: AuthenticatedUser = Depends(require_actor)) -> None:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    get_supabase_listing_service().remove_saved_listing_for_recipient(actor, listing_id)


@router.get("/threads/{thread_id}", response_model=ThreadDetailResponse)
def get_thread(thread_id: str, actor: AuthenticatedUser = Depends(require_actor)) -> ThreadDetailResponse:
    if actor.user.role not in {Role.RECIPIENT_INSTITUTION, Role.ADMIN, Role.DONOR_LAB}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authorized role required.")
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Thread {thread_id} not found.")


@router.post("/threads/{thread_id}/messages", response_model=Message, status_code=status.HTTP_201_CREATED)
def create_message(
    thread_id: str,
    payload: MessageCreate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> Message:
    if actor.user.role not in {Role.RECIPIENT_INSTITUTION, Role.ADMIN, Role.DONOR_LAB}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authorized role required.")
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Database-backed messaging is not implemented yet.")


@router.post("/request-board", response_model=RequestBoardPost, status_code=status.HTTP_201_CREATED)
def create_request_board_post(
    payload: RequestBoardPostCreate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> RequestBoardPost:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Database-backed request board posting is not implemented yet.")
