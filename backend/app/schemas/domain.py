from datetime import date, datetime
from enum import StrEnum
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class Role(StrEnum):
    DONOR_LAB = "donor_lab"
    RECIPIENT_INSTITUTION = "recipient_institution"
    ADMIN = "admin"


class VerificationStatus(StrEnum):
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class AccountStatus(StrEnum):
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    RESTRICTED = "restricted"
    SUSPENDED = "suspended"


class ListingStatus(StrEnum):
    DRAFT = "draft"
    PENDING_ADMIN_APPROVAL = "pending_admin_approval"
    LIVE = "live"
    UNDER_REVIEW = "under_review"
    MATCHED_RESERVED = "matched_reserved"
    FULFILLED = "fulfilled"
    REMOVED_EXPIRED = "removed_expired"


class RequestStatus(StrEnum):
    SUBMITTED = "submitted"
    ADMIN_REVIEW = "admin_review"
    AWAITING_DONOR_CONFIRMATION = "awaiting_donor_confirmation"
    APPROVED_MATCHED = "approved_matched"
    PICKUP_TRANSFER_COORDINATION = "pickup_transfer_coordination"
    COMPLETED = "completed"
    REJECTED_CANCELLED = "rejected_cancelled"


class ThreadStatus(StrEnum):
    ACTIVE = "active"
    LOCKED = "locked"
    CLOSED = "closed"


class BoardPostStatus(StrEnum):
    OPEN = "open"
    MATCH_IN_PROGRESS = "match_in_progress"
    CLOSED = "closed"


class Institution(BaseModel):
    id: str
    name: str
    type: Role
    verification_status: VerificationStatus
    location: str
    description: str


class User(BaseModel):
    id: str
    full_name: str
    email: str
    role: Role
    account_status: AccountStatus
    institution_id: str


class Listing(BaseModel):
    id: str
    title: str
    category: str
    condition: str
    quantity: int
    location: str
    availability_window: str
    description: str
    dimensions_weight: str
    handling_requirements: str
    working_status: str
    documentation_included: str
    special_handling_flags: str
    delivery_mode: str
    status: ListingStatus
    photo_urls: List[str] = Field(default_factory=list)
    donor_institution_id: str
    created_by_user_id: str
    created_at: datetime
    request_count: int = 0


class EquipmentRequest(BaseModel):
    id: str
    listing_id: str
    recipient_institution_id: str
    submitted_by_user_id: str
    intended_use: str
    program_or_department: str
    audience: str
    needed_by: date
    urgency_notes: str
    delivery_constraints: str
    storage_readiness: str
    funding_or_logistics_notes: str
    status: RequestStatus
    submitted_at: datetime


class MessageThread(BaseModel):
    id: str
    listing_id: str
    request_id: Optional[str] = None
    status: ThreadStatus
    opened_by_user_id: str


class Message(BaseModel):
    id: str
    thread_id: str
    sender_user_id: str
    sender_role: Role
    body: str
    created_at: datetime


class RequestBoardPost(BaseModel):
    id: str
    title: str
    category: str
    institution_id: str
    created_by_user_id: str
    description: str
    needed_by: date
    status: BoardPostStatus
    created_at: datetime


class AdminAction(BaseModel):
    id: str
    action_type: str
    actor_user_id: str
    subject_id: str
    notes: str
    created_at: datetime


class LabLinkSeed(BaseModel):
    institutions: List[Institution]
    users: List[User]
    listings: List[Listing]
    equipment_requests: List[EquipmentRequest]
    message_threads: List[MessageThread]
    messages: List[Message]
    request_board_posts: List[RequestBoardPost]
    admin_actions: List[AdminAction]


class ListingCreate(BaseModel):
    title: str
    category: str
    condition: str
    quantity: int = Field(ge=1)
    location: str
    availability_window: str
    description: str
    dimensions_weight: str
    handling_requirements: str
    working_status: str
    documentation_included: str
    special_handling_flags: str
    delivery_mode: str
    photo_urls: List[str] = Field(default_factory=list)


class EquipmentRequestCreate(BaseModel):
    listing_id: str
    intended_use: str
    program_or_department: str
    audience: str
    needed_by: date
    urgency_notes: str
    delivery_constraints: str
    storage_readiness: str
    funding_or_logistics_notes: str


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class RequestBoardPostCreate(BaseModel):
    title: str
    category: str
    description: str
    needed_by: date


class AuthenticatedUser(BaseModel):
    user: User
    institution: Institution


class AuthenticatedSupabaseUser(BaseModel):
    auth_user_id: str
    email: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class DonorDashboardResponse(BaseModel):
    institution: Institution
    listings: List[Listing]
    active_requests: List[EquipmentRequest]
    impact_summary: dict[str, int]


class RecipientDashboardResponse(BaseModel):
    institution: Institution
    requests: List[EquipmentRequest]
    saved_listings: List[Listing]
    threads: List[MessageThread]
    request_board_posts: List[RequestBoardPost]


class AdminDashboardResponse(BaseModel):
    pending_institutions: List[Institution]
    listings_for_review: List[Listing]
    requests_requiring_attention: List[EquipmentRequest]
    active_threads: List[MessageThread]
    recent_actions: List[AdminAction]


class ThreadDetailResponse(BaseModel):
    thread: MessageThread
    messages: List[Message]


class ListingDetailResponse(BaseModel):
    listing: Listing
    donor_institution: Institution
    related_requests: List[EquipmentRequest] = Field(default_factory=list)


class OnboardingCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    role: Role
    institution_name: str = Field(min_length=1, max_length=255)
    institution_location: str = Field(min_length=1, max_length=255)
    institution_description: str = Field(min_length=1, max_length=2000)


class OnboardingResponse(BaseModel):
    user: User
    institution: Institution
    created: bool
