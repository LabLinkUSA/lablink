from fastapi import APIRouter

from app.schemas.domain import Listing, ListingDetailResponse
from app.services.supabase_listings import get_supabase_listing_service

router = APIRouter(tags=["public"])


@router.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/public/listings", response_model=list[Listing])
def list_public_listings() -> list[Listing]:
    return get_supabase_listing_service().list_public_listings()


@router.get("/public/listings/{listing_id}", response_model=ListingDetailResponse)
def get_public_listing_detail(listing_id: str) -> ListingDetailResponse:
    return get_supabase_listing_service().get_public_listing_detail(listing_id)
