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
    ThreadDetailResponse,
)

router = APIRouter(prefix="/recipient", tags=["recipient"])


@router.get("/dashboard", response_model=RecipientDashboardResponse)
def get_recipient_dashboard(actor: AuthenticatedUser = Depends(require_actor)) -> RecipientDashboardResponse:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    return RecipientDashboardResponse(
        institution=actor.institution,
        requests=[],
        saved_listings=[],
        threads=[],
        request_board_posts=[],
    )


@router.post("/requests", response_model=EquipmentRequest, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: EquipmentRequestCreate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> EquipmentRequest:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Database-backed equipment requests are not implemented yet.")


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
