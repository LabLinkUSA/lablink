from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.dependencies import require_actor
from app.schemas.domain import AuthenticatedUser, DonorDashboardResponse, Listing, ListingCreate, RequestBoardPost, Role

router = APIRouter(prefix="/donor", tags=["donor"])


@router.get("/dashboard", response_model=DonorDashboardResponse)
def get_donor_dashboard(actor: AuthenticatedUser = Depends(require_actor)) -> DonorDashboardResponse:
    if actor.user.role != Role.DONOR_LAB:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Donor access required.")
    return DonorDashboardResponse(
        institution=actor.institution,
        listings=[],
        active_requests=[],
        impact_summary={
            "total_items_donated": 0,
            "institutions_served": 0,
            "active_listings": 0,
        },
    )


@router.get("/request-board", response_model=list[RequestBoardPost])
def get_donor_request_board(actor: AuthenticatedUser = Depends(require_actor)) -> list[RequestBoardPost]:
    if actor.user.role != Role.DONOR_LAB:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Donor access required.")
    return []


@router.post("/listings", response_model=Listing, status_code=status.HTTP_201_CREATED)
def create_listing(payload: ListingCreate, actor: AuthenticatedUser = Depends(require_actor)) -> Listing:
    if actor.user.role != Role.DONOR_LAB:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Donor access required.")
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Database-backed listing creation is not implemented yet.")
