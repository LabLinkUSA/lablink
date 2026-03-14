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
from app.services.demo_data import get_demo_repository

router = APIRouter(prefix="/recipient", tags=["recipient"])


@router.get("/dashboard", response_model=RecipientDashboardResponse)
def get_recipient_dashboard(actor: AuthenticatedUser = Depends(require_actor)) -> RecipientDashboardResponse:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    return get_demo_repository().recipient_dashboard(actor)


@router.post("/requests", response_model=EquipmentRequest, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: EquipmentRequestCreate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> EquipmentRequest:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    return get_demo_repository().create_request(actor, payload)


@router.get("/threads/{thread_id}", response_model=ThreadDetailResponse)
def get_thread(thread_id: str, actor: AuthenticatedUser = Depends(require_actor)) -> ThreadDetailResponse:
    if actor.user.role not in {Role.RECIPIENT_INSTITUTION, Role.ADMIN, Role.DONOR_LAB}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authorized role required.")
    return get_demo_repository().get_thread_detail(thread_id)


@router.post("/threads/{thread_id}/messages", response_model=Message, status_code=status.HTTP_201_CREATED)
def create_message(
    thread_id: str,
    payload: MessageCreate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> Message:
    if actor.user.role not in {Role.RECIPIENT_INSTITUTION, Role.ADMIN, Role.DONOR_LAB}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authorized role required.")
    return get_demo_repository().create_message(actor, thread_id, payload)


@router.post("/request-board", response_model=RequestBoardPost, status_code=status.HTTP_201_CREATED)
def create_request_board_post(
    payload: RequestBoardPostCreate,
    actor: AuthenticatedUser = Depends(require_actor),
) -> RequestBoardPost:
    if actor.user.role != Role.RECIPIENT_INSTITUTION:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient access required.")
    return get_demo_repository().create_request_board_post(actor, payload)

