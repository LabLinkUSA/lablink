from __future__ import annotations

from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.domain import (
    AccountStatus,
    AdminDashboardResponse,
    AuthenticatedUser,
    DonorDashboardResponse,
    EquipmentRequest,
    EquipmentRequestCreate,
    Institution,
    LabLinkSeed,
    Listing,
    ListingCreate,
    ListingDetailResponse,
    ListingStatus,
    Message,
    MessageCreate,
    MessageThread,
    RecipientDashboardResponse,
    RequestBoardPost,
    RequestBoardPostCreate,
    RequestStatus,
    Role,
    ThreadDetailResponse,
    User,
)


class DemoRepository:
    def __init__(self, seed: LabLinkSeed):
        self.institutions = {institution.id: institution for institution in seed.institutions}
        self.users = {user.id: user for user in seed.users}
        self.listings = {listing.id: listing for listing in seed.listings}
        self.requests = {request.id: request for request in seed.equipment_requests}
        self.threads = {thread.id: thread for thread in seed.message_threads}
        self.messages = {message.id: message for message in seed.messages}
        self.request_board_posts = {post.id: post for post in seed.request_board_posts}
        self.admin_actions = {action.id: action for action in seed.admin_actions}

    def get_authenticated_user(self, user_id: str, role: Role) -> AuthenticatedUser:
        user = self.users.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown user.")
        if user.role != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role does not match user.")
        institution = self.institutions[user.institution_id]
        return AuthenticatedUser(user=user, institution=institution)

    def public_listings(self) -> list[Listing]:
        visible_statuses = {
            ListingStatus.LIVE,
            ListingStatus.UNDER_REVIEW,
            ListingStatus.MATCHED_RESERVED,
            ListingStatus.FULFILLED,
        }
        return sorted(
            [listing for listing in self.listings.values() if listing.status in visible_statuses],
            key=lambda listing: listing.created_at,
            reverse=True,
        )

    def get_listing_detail(self, listing_id: str, include_requests: bool = False) -> ListingDetailResponse:
        listing = self.listings.get(listing_id)
        if not listing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
        donor_institution = self.institutions[listing.donor_institution_id]
        related_requests = []
        if include_requests:
            related_requests = sorted(
                [request for request in self.requests.values() if request.listing_id == listing_id],
                key=lambda request: request.submitted_at,
                reverse=True,
            )
        return ListingDetailResponse(
            listing=listing,
            donor_institution=donor_institution,
            related_requests=related_requests,
        )

    def donor_dashboard(self, user: AuthenticatedUser) -> DonorDashboardResponse:
        owned_listings = sorted(
            [listing for listing in self.listings.values() if listing.donor_institution_id == user.institution.id],
            key=lambda listing: listing.created_at,
            reverse=True,
        )
        listing_ids = {listing.id for listing in owned_listings}
        active_requests = [
            request
            for request in self.requests.values()
            if request.listing_id in listing_ids and request.status != RequestStatus.REJECTED_CANCELLED
        ]
        impact_summary = {
            "total_items_donated": sum(listing.quantity for listing in owned_listings if listing.status == ListingStatus.FULFILLED),
            "institutions_served": len(
                {
                    request.recipient_institution_id
                    for request in self.requests.values()
                    if request.listing_id in listing_ids
                    and request.status in {RequestStatus.APPROVED_MATCHED, RequestStatus.PICKUP_TRANSFER_COORDINATION, RequestStatus.COMPLETED}
                }
            ),
            "active_listings": sum(1 for listing in owned_listings if listing.status in {ListingStatus.LIVE, ListingStatus.UNDER_REVIEW}),
        }
        return DonorDashboardResponse(
            institution=user.institution,
            listings=owned_listings,
            active_requests=sorted(active_requests, key=lambda request: request.submitted_at, reverse=True),
            impact_summary=impact_summary,
        )

    def donor_request_board(self, user: AuthenticatedUser) -> list[RequestBoardPost]:
        self._require_verified_actor(user)
        return sorted(
            self.request_board_posts.values(),
            key=lambda post: post.created_at,
            reverse=True,
        )

    def recipient_dashboard(self, user: AuthenticatedUser) -> RecipientDashboardResponse:
        institution_requests = sorted(
            [request for request in self.requests.values() if request.recipient_institution_id == user.institution.id],
            key=lambda request: request.submitted_at,
            reverse=True,
        )
        request_ids = {request.id for request in institution_requests}
        threads = [thread for thread in self.threads.values() if thread.request_id in request_ids]
        request_board_posts = [
            post for post in self.request_board_posts.values() if post.institution_id == user.institution.id
        ]
        saved_listings = self.public_listings()[:3]
        return RecipientDashboardResponse(
            institution=user.institution,
            requests=institution_requests,
            saved_listings=saved_listings,
            threads=threads,
            request_board_posts=request_board_posts,
        )

    def admin_dashboard(self) -> AdminDashboardResponse:
        pending_institutions = [
            institution
            for institution in self.institutions.values()
            if institution.type != Role.ADMIN and institution.verification_status != "verified"
        ]
        listings_for_review = [
            listing
            for listing in self.listings.values()
            if listing.status in {ListingStatus.PENDING_ADMIN_APPROVAL, ListingStatus.UNDER_REVIEW}
        ]
        requests_requiring_attention = [
            request
            for request in self.requests.values()
            if request.status in {RequestStatus.SUBMITTED, RequestStatus.ADMIN_REVIEW, RequestStatus.AWAITING_DONOR_CONFIRMATION}
        ]
        active_threads = [thread for thread in self.threads.values() if thread.status == "active"]
        recent_actions = sorted(self.admin_actions.values(), key=lambda action: action.created_at, reverse=True)[:8]
        return AdminDashboardResponse(
            pending_institutions=pending_institutions,
            listings_for_review=sorted(listings_for_review, key=lambda listing: listing.created_at, reverse=True),
            requests_requiring_attention=sorted(
                requests_requiring_attention,
                key=lambda request: request.submitted_at,
                reverse=True,
            ),
            active_threads=active_threads,
            recent_actions=recent_actions,
        )

    def get_thread_detail(self, thread_id: str) -> ThreadDetailResponse:
        thread = self.threads.get(thread_id)
        if not thread:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")
        messages = sorted(
            [message for message in self.messages.values() if message.thread_id == thread_id],
            key=lambda message: message.created_at,
        )
        return ThreadDetailResponse(thread=thread, messages=messages)

    def create_listing(self, user: AuthenticatedUser, payload: ListingCreate) -> Listing:
        self._require_verified_actor(user)
        listing = Listing(
            id=f"listing_{uuid4().hex[:12]}",
            created_at=datetime.now(UTC),
            donor_institution_id=user.institution.id,
            created_by_user_id=user.user.id,
            status=ListingStatus.PENDING_ADMIN_APPROVAL,
            request_count=0,
            **payload.model_dump(),
        )
        self.listings[listing.id] = listing
        return listing

    def create_request(self, user: AuthenticatedUser, payload: EquipmentRequestCreate) -> EquipmentRequest:
        self._require_verified_actor(user)
        listing = self.listings.get(payload.listing_id)
        if not listing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
        if listing.status not in {ListingStatus.LIVE, ListingStatus.UNDER_REVIEW}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only live or under-review listings can accept requests.",
            )
        request = EquipmentRequest(
            id=f"request_{uuid4().hex[:12]}",
            submitted_at=datetime.now(UTC),
            recipient_institution_id=user.institution.id,
            submitted_by_user_id=user.user.id,
            status=RequestStatus.SUBMITTED,
            **payload.model_dump(),
        )
        self.requests[request.id] = request
        self.listings[listing.id] = listing.model_copy(update={"request_count": listing.request_count + 1, "status": ListingStatus.UNDER_REVIEW})
        return request

    def create_message(self, user: AuthenticatedUser, thread_id: str, payload: MessageCreate) -> Message:
        self._require_verified_actor(user)
        thread = self.threads.get(thread_id)
        if not thread:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")
        if thread.status != "active":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Thread is not active.")
        message = Message(
            id=f"message_{uuid4().hex[:12]}",
            thread_id=thread_id,
            sender_user_id=user.user.id,
            sender_role=user.user.role,
            body=payload.body,
            created_at=datetime.now(UTC),
        )
        self.messages[message.id] = message
        return message

    def create_request_board_post(self, user: AuthenticatedUser, payload: RequestBoardPostCreate) -> RequestBoardPost:
        self._require_verified_actor(user)
        post = RequestBoardPost(
            id=f"board_post_{uuid4().hex[:12]}",
            institution_id=user.institution.id,
            created_by_user_id=user.user.id,
            status="open",
            created_at=datetime.now(UTC),
            **payload.model_dump(),
        )
        self.request_board_posts[post.id] = post
        return post

    def _require_verified_actor(self, user: AuthenticatedUser) -> None:
        if user.user.account_status != AccountStatus.VERIFIED or user.institution.verification_status != "verified":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This action requires an admin-verified institution account.",
            )


@lru_cache
def get_demo_repository() -> DemoRepository:
    settings = get_settings()
    seed_path = Path(settings.demo_seed_path)
    seed = LabLinkSeed.model_validate_json(seed_path.read_text())
    return DemoRepository(seed)
