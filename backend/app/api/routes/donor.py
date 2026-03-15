from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.routes.dependencies import require_actor
from app.schemas.domain import (
    AuthenticatedUser,
    DonorDashboardResponse,
    Listing,
    ListingCreate,
    ListingImageUploadResponse,
    RequestBoardPost,
    Role,
)
from app.services.supabase_listings import get_supabase_listing_service

router = APIRouter(prefix="/donor", tags=["donor"])


@router.get("/dashboard", response_model=DonorDashboardResponse)
def get_donor_dashboard(actor: AuthenticatedUser = Depends(require_actor)) -> DonorDashboardResponse:
    if actor.user.role != Role.DONOR_LAB:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Donor access required.")
    return get_supabase_listing_service().get_donor_dashboard(actor)


@router.get("/request-board", response_model=list[RequestBoardPost])
def get_donor_request_board(actor: AuthenticatedUser = Depends(require_actor)) -> list[RequestBoardPost]:
    if actor.user.role != Role.DONOR_LAB:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Donor access required.")
    return []


@router.post("/listings", response_model=Listing, status_code=status.HTTP_201_CREATED)
def create_listing(payload: ListingCreate, actor: AuthenticatedUser = Depends(require_actor)) -> Listing:
    if actor.user.role != Role.DONOR_LAB:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Donor access required.")
    return get_supabase_listing_service().create_listing(actor, payload)


@router.post("/listing-images", response_model=ListingImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_listing_image(
    image: UploadFile = File(...),
    actor: AuthenticatedUser = Depends(require_actor),
) -> ListingImageUploadResponse:
    if actor.user.role != Role.DONOR_LAB:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Donor access required.")
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are supported.")

    content = await image.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image is empty.")

    photo_url = get_supabase_listing_service().upload_listing_image(
        actor,
        filename=image.filename or "listing-image.jpg",
        content=content,
        content_type=image.content_type,
    )
    return ListingImageUploadResponse(photo_url=photo_url)
