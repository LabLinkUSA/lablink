from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.routes.dependencies import require_actor
from app.schemas.domain import (
    AccountStatus,
    AuthenticatedUser,
    DonorDashboardResponse,
    VerificationStatus,
    InternalListingDetailResponse,
    Listing,
    ListingDocumentFormType,
    ListingDocumentSaveResponse,
    ListingDocumentTemplatesResponse,
    ListingDraftSave,
    ListingImageUploadResponse,
    RequestBoardPost,
    Role,
)
from app.services.supabase_listings import get_supabase_listing_service

router = APIRouter(prefix="/donor", tags=["donor"])


def require_verified_donor(actor: AuthenticatedUser) -> None:
    if actor.user.role != Role.DONOR_LAB:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Donor access required.")
    if actor.user.account_status != AccountStatus.VERIFIED or actor.institution.verification_status != VerificationStatus.VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your institution must be admin-verified before you can create equipment listings.",
        )


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


@router.post("/listings/drafts", response_model=Listing, status_code=status.HTTP_201_CREATED)
def create_draft_listing(actor: AuthenticatedUser = Depends(require_actor)) -> Listing:
    require_verified_donor(actor)
    return get_supabase_listing_service().create_draft_listing(actor)


@router.get("/listings/{listing_id}/form-templates", response_model=ListingDocumentTemplatesResponse)
def get_listing_form_templates(
    listing_id: str,
    actor: AuthenticatedUser = Depends(require_actor),
) -> ListingDocumentTemplatesResponse:
    require_verified_donor(actor)
    return get_supabase_listing_service().get_listing_document_templates(actor, listing_id)


@router.put("/listings/{listing_id}/documents/{form_type}", response_model=ListingDocumentSaveResponse)
async def save_listing_document(
    listing_id: str,
    form_type: ListingDocumentFormType,
    template_version: str = Form(...),
    file: UploadFile = File(...),
    original_filename: str | None = Form(default=None),
    actor: AuthenticatedUser = Depends(require_actor),
) -> ListingDocumentSaveResponse:
    require_verified_donor(actor)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded PDF is empty.")
    return get_supabase_listing_service().save_listing_document(
        actor,
        listing_id,
        form_type,
        template_version=template_version,
        filename=original_filename or file.filename or f"{form_type.value}.pdf",
        content=content,
        content_type=file.content_type,
    )


@router.post("/listings/{listing_id}/submit", response_model=Listing)
def submit_listing_for_review(listing_id: str, actor: AuthenticatedUser = Depends(require_actor)) -> Listing:
    require_verified_donor(actor)
    return get_supabase_listing_service().submit_draft_listing(actor, listing_id)


@router.get("/listings/{listing_id}", response_model=InternalListingDetailResponse)
def get_donor_listing_detail(
    listing_id: str,
    actor: AuthenticatedUser = Depends(require_actor),
) -> InternalListingDetailResponse:
    require_verified_donor(actor)
    return get_supabase_listing_service().get_donor_listing_detail(actor, listing_id)


@router.patch("/listings/{listing_id}", response_model=Listing)
def update_listing(
    listing_id: str,
    payload: ListingDraftSave,
    actor: AuthenticatedUser = Depends(require_actor),
) -> Listing:
    require_verified_donor(actor)
    return get_supabase_listing_service().save_donor_listing(actor, listing_id, payload)


@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_listing(listing_id: str, actor: AuthenticatedUser = Depends(require_actor)) -> None:
    require_verified_donor(actor)
    get_supabase_listing_service().remove_donor_listing(actor, listing_id)
    return None


@router.post("/listings/{listing_id}/mark-donated", response_model=Listing)
def mark_listing_donated(listing_id: str, actor: AuthenticatedUser = Depends(require_actor)) -> Listing:
    require_verified_donor(actor)
    return get_supabase_listing_service().mark_donor_listing_donated(actor, listing_id)


@router.post("/listing-images", response_model=ListingImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_listing_image(
    image: UploadFile = File(...),
    actor: AuthenticatedUser = Depends(require_actor),
) -> ListingImageUploadResponse:
    require_verified_donor(actor)
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
