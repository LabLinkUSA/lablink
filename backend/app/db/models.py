from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Role(str, Enum):
    DONOR_LAB = "donor_lab"
    RECIPIENT_INSTITUTION = "recipient_institution"
    ADMIN = "admin"


class VerificationStatus(str, Enum):
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class AccountStatus(str, Enum):
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    RESTRICTED = "restricted"
    SUSPENDED = "suspended"


class ListingStatus(str, Enum):
    DRAFT = "draft"
    PENDING_ADMIN_APPROVAL = "pending_admin_approval"
    LIVE = "live"
    UNDER_REVIEW = "under_review"
    MATCHED_RESERVED = "matched_reserved"
    FULFILLED = "fulfilled"
    REMOVED_BY_ADMIN = "removed_by_admin"
    REMOVED_BY_DONOR = "removed_by_donor"


class RequestStatus(str, Enum):
    SUBMITTED = "submitted"
    ADMIN_REVIEW = "admin_review"
    AWAITING_DONOR_CONFIRMATION = "awaiting_donor_confirmation"
    APPROVED_MATCHED = "approved_matched"
    PICKUP_TRANSFER_COORDINATION = "pickup_transfer_coordination"
    COMPLETED = "completed"
    REJECTED_CANCELLED = "rejected_cancelled"


class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[Role] = mapped_column(SqlEnum(Role), nullable=False)
    verification_status: Mapped[VerificationStatus] = mapped_column(SqlEnum(VerificationStatus), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    users = relationship("User", back_populates="institution")
    listings = relationship("Listing", back_populates="donor_institution")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    role: Mapped[Role] = mapped_column(SqlEnum(Role), nullable=False)
    account_status: Mapped[AccountStatus] = mapped_column(SqlEnum(AccountStatus), nullable=False)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)

    institution = relationship("Institution", back_populates="users")


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    donor_institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    created_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    condition: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    availability_window: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    dimensions_weight: Mapped[str] = mapped_column(String(255), nullable=False)
    handling_requirements: Mapped[str] = mapped_column(Text, nullable=False)
    working_status: Mapped[str] = mapped_column(String(255), nullable=False)
    documentation_included: Mapped[str] = mapped_column(Text, nullable=False)
    special_handling_flags: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_mode: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[ListingStatus] = mapped_column(SqlEnum(ListingStatus), nullable=False)
    photo_urls_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    donor_institution = relationship("Institution", back_populates="listings")


class EquipmentRequest(Base):
    __tablename__ = "equipment_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    listing_id: Mapped[str] = mapped_column(ForeignKey("listings.id"), nullable=False)
    recipient_institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    submitted_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    intended_use: Mapped[str] = mapped_column(Text, nullable=False)
    program_or_department: Mapped[str] = mapped_column(String(255), nullable=False)
    audience: Mapped[str] = mapped_column(String(255), nullable=False)
    needed_by: Mapped[date] = mapped_column(Date, nullable=False)
    urgency_notes: Mapped[str] = mapped_column(Text, nullable=False)
    delivery_constraints: Mapped[str] = mapped_column(Text, nullable=False)
    storage_readiness: Mapped[str] = mapped_column(Text, nullable=False)
    funding_or_logistics_notes: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RequestStatus] = mapped_column(SqlEnum(RequestStatus), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
