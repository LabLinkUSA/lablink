from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import Any, List, Optional

from pydantic import BaseModel, Field, field_validator


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
    REJECTED = "rejected"
    LIVE = "live"
    MATCHED_RESERVED = "matched_reserved"
    FULFILLED = "fulfilled"
    REMOVED_BY_ADMIN = "removed_by_admin"
    REMOVED_BY_DONOR = "removed_by_donor"


class RequestStatus(StrEnum):
    SUBMITTED = "submitted"
    ADMIN_REVIEW = "admin_review"
    APPROVED_MATCHED = "approved_matched"
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


class NotificationType(StrEnum):
    ADMIN_LISTING_SUBMITTED = "admin_listing_submitted"
    ADMIN_REQUEST_SUBMITTED = "admin_request_submitted"
    INSTITUTION_STATUS_CHANGED = "institution_status_changed"
    LISTING_STATUS_CHANGED = "listing_status_changed"
    REQUEST_STATUS_CHANGED = "request_status_changed"
    RECIPIENT_CATALOG_UPDATED = "recipient_catalog_updated"


class NotificationEmailStatus(StrEnum):
    PENDING = "pending"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"


class ListingDocumentFormType(StrEnum):
    DECONTAMINATION = "decontamination"
    LIABILITY_RELEASE = "liability_release"


class ListingDocumentStatus(StrEnum):
    NOT_STARTED = "not_started"
    COMPLETED = "completed"
    OUTDATED = "outdated"


class ListingDocumentFieldType(StrEnum):
    TEXT = "text"
    TEXTAREA = "textarea"
    CHECKBOX = "checkbox"
    DATE = "date"


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
    listing: Optional[Listing] = None


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


class Notification(BaseModel):
    id: str
    type: NotificationType
    message: str
    cta_href: str
    entity_type: str
    entity_id: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    viewed_at: Optional[datetime] = None
    email_status: NotificationEmailStatus
    email_attempted_at: Optional[datetime] = None
    email_error: Optional[str] = None


class ListingDraftSave(BaseModel):
    title: str = ""
    category: str = ""
    condition: str = ""
    quantity: int = Field(default=1, ge=1)
    location: str = ""
    availability_window: str = ""
    description: str = ""
    dimensions_weight: str = ""
    handling_requirements: str = ""
    working_status: str = ""
    documentation_included: str = ""
    special_handling_flags: str = ""
    delivery_mode: str = "pickup_only"
    photo_urls: List[str] = Field(default_factory=list)

    @field_validator(
        "title",
        "category",
        "condition",
        "location",
        "availability_window",
        "description",
        "dimensions_weight",
        "handling_requirements",
        "working_status",
        "documentation_included",
        "special_handling_flags",
        "delivery_mode",
    )
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("photo_urls")
    @classmethod
    def validate_photo_urls(cls, value: List[str]) -> List[str]:
        return [photo_url.strip() for photo_url in value if photo_url.strip()]


class ListingPayloadBase(BaseModel):
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

    @field_validator(
        "title",
        "category",
        "condition",
        "location",
        "availability_window",
        "description",
        "dimensions_weight",
        "handling_requirements",
        "working_status",
        "documentation_included",
        "special_handling_flags",
        "delivery_mode",
    )
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field is required.")
        return cleaned

    @field_validator("photo_urls")
    @classmethod
    def validate_photo_urls(cls, value: List[str]) -> List[str]:
        cleaned_values = [photo_url.strip() for photo_url in value if photo_url.strip()]
        if not cleaned_values:
            raise ValueError("At least one listing image is required.")
        return cleaned_values


class ListingCreate(ListingPayloadBase):
    pass


class ListingUpdate(ListingPayloadBase):
    pass


class ListingApprovalUpdate(BaseModel):
    status: ListingStatus
    admin_note: Optional[str] = Field(default=None, max_length=1000)


class InstitutionVerificationUpdate(BaseModel):
    verification_status: VerificationStatus
    admin_note: Optional[str] = Field(default=None, max_length=1000)


class RequestStatusUpdate(BaseModel):
    status: RequestStatus
    admin_note: Optional[str] = Field(default=None, max_length=1000)


class ListingImageUploadResponse(BaseModel):
    photo_url: str


class ListingDocumentGuideLink(BaseModel):
    label: str
    url: str


class ListingDocumentTemplateField(BaseModel):
    key: str
    label: str
    type: ListingDocumentFieldType
    required: bool = False
    placeholder: Optional[str] = None


class ListingDocumentSummary(BaseModel):
    form_type: ListingDocumentFormType
    template_version: str
    title: str
    status: ListingDocumentStatus
    file_name: Optional[str] = None
    preview_url: Optional[str] = None
    download_url: Optional[str] = None
    completed_by_name: Optional[str] = None
    completed_at: Optional[datetime] = None
    form_data: dict[str, Any] = Field(default_factory=dict)


class ListingDocumentTemplate(BaseModel):
    form_type: ListingDocumentFormType
    template_version: str
    blank_pdf_url: str
    title: str
    summary: str
    body_sections: List[str] = Field(default_factory=list)
    guide_links: List[ListingDocumentGuideLink] = Field(default_factory=list)
    fields: List[ListingDocumentTemplateField] = Field(default_factory=list)
    draft_notice: Optional[str] = None
    document: ListingDocumentSummary


class ListingDocumentTemplatesResponse(BaseModel):
    listing_id: str
    templates: List[ListingDocumentTemplate]


class ListingDocumentSaveResponse(BaseModel):
    document: ListingDocumentSummary


class EquipmentRequestCreate(BaseModel):
    listing_id: str


class RecipientRequestStateResponse(BaseModel):
    requested: bool
    status: Optional[RequestStatus] = None


class SavedListingCreate(BaseModel):
    listing_id: str


class SavedListingStateResponse(BaseModel):
    saved: bool


class NotificationListResponse(BaseModel):
    notifications: List[Notification]
    unread_count: int
    next_cursor: Optional[str] = None


class MarkNotificationsViewedResponse(BaseModel):
    marked_count: int
    viewed_at: datetime


class NotificationEmailProcessingResponse(BaseModel):
    processed_count: int
    sent_count: int
    failed_count: int


class NotificationEmailWebhookRecord(BaseModel):
    id: str


class NotificationEmailWebhookRequest(BaseModel):
    type: str
    table: str
    schema_name: str = Field(alias="schema")
    record: Optional[NotificationEmailWebhookRecord] = None
    old_record: Optional[dict[str, Any]] = None


class NotificationEmailDeliveryResponse(BaseModel):
    notification_id: str
    processed: bool
    sent: bool
    email_status: Optional[NotificationEmailStatus] = None


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


class AccountLookupResponse(BaseModel):
    exists: bool
    auth_exists: bool = False
    app_exists: bool = False


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


class InternalListingDetailResponse(ListingDetailResponse):
    documents: List[ListingDocumentSummary] = Field(default_factory=list)


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
