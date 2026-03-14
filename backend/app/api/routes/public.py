from fastapi import APIRouter, HTTPException, status

from app.schemas.domain import Listing, ListingDetailResponse

router = APIRouter(tags=["public"])


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/public/listings", response_model=list[Listing])
def list_public_listings() -> list[Listing]:
    return []


@router.get("/public/listings/{listing_id}", response_model=ListingDetailResponse)
def get_public_listing_detail(listing_id: str) -> ListingDetailResponse:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")
