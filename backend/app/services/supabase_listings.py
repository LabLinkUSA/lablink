from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.schemas.domain import (
    AccountStatus,
    AdminAction,
    AdminDashboardResponse,
    AuthenticatedUser,
    DonorDashboardResponse,
    EquipmentRequest,
    MarkNotificationsViewedResponse,
    Notification,
    NotificationEmailStatus,
    NotificationListResponse,
    NotificationType,
    RecipientDashboardResponse,
    Institution,
    Listing,
    ListingCreate,
    ListingDetailResponse,
    ListingApprovalUpdate,
    ListingStatus,
    ListingUpdate,
    RequestStatusUpdate,
    RequestStatus,
    VerificationStatus,
)
from app.services.supabase_profiles import ADMIN_INSTITUTION_ID

RESEND_API_URL = "https://api.resend.com/emails"


class SupabaseListingService:
    def __init__(
        self,
        supabase_url: str,
        service_role_key: str,
        storage_bucket: str,
        *,
        frontend_origin: str,
        resend_api_key: str | None = None,
        email_from: str | None = None,
        email_reply_to: str | None = None,
    ):
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.storage_bucket = storage_bucket
        self.frontend_origin = frontend_origin.rstrip("/")
        self.resend_api_key = resend_api_key
        self.email_from = email_from
        self.email_reply_to = email_reply_to

    def list_public_listings(self) -> list[Listing]:
        rows = self._request(
            "GET",
            "listings",
            params={
                "select": self._listing_select(include_donor_institution=True),
                "status": "in.(live,under_review,matched_reserved,fulfilled)",
                "order": "created_at.desc",
            },
        )
        rows = self._with_active_request_counts(rows)
        return [self._to_listing(row) for row in rows if self._is_verified_donor_listing_row(row)]

    def get_public_listing_detail(self, listing_id: str) -> ListingDetailResponse:
        row = self._get_listing_detail_row(
            listing_id,
            extra_params={"status": "in.(live,under_review,matched_reserved,fulfilled)"},
        )
        if not row or not self._is_verified_donor_listing_row(row):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")
        return self._to_listing_detail(row)

    def get_donor_dashboard(self, actor: AuthenticatedUser) -> DonorDashboardResponse:
        rows = self._request(
            "GET",
            "listings",
            params={
                "select": self._listing_select(),
                "donor_institution_id": f"eq.{actor.institution.id}",
                "order": "created_at.desc",
            },
        )
        rows = self._with_active_request_counts(rows)
        listings = [
            listing
            for listing in (self._to_listing(row) for row in rows)
            if listing.status not in {ListingStatus.REMOVED_BY_ADMIN, ListingStatus.REMOVED_BY_DONOR}
        ]
        active_requests = self._get_requests_for_listing_ids(
            [listing.id for listing in listings],
            only_verified_recipients=True,
            exclude_statuses={RequestStatus.REJECTED_CANCELLED, RequestStatus.COMPLETED},
        )
        impact_summary = {
            "total_items_donated": sum(listing.quantity for listing in listings if listing.status == ListingStatus.FULFILLED),
            "institutions_served": 0,
            "active_listings": sum(
                1 for listing in listings if listing.status in {ListingStatus.LIVE, ListingStatus.UNDER_REVIEW}
            ),
        }
        return DonorDashboardResponse(
            institution=actor.institution,
            listings=listings,
            active_requests=active_requests,
            impact_summary=impact_summary,
        )

    def get_recipient_dashboard(self, actor: AuthenticatedUser) -> RecipientDashboardResponse:
        request_rows = self._request(
            "GET",
            "equipment_requests",
            params={
                "select": self._equipment_request_select(include_listing=True),
                "recipient_institution_id": f"eq.{actor.institution.id}",
                "order": "created_at.desc",
            },
        )

        saved_listing_rows = self._request(
            "GET",
            "saved_listings",
            params={
                "select": f"listing:listings({self._listing_select()})",
                "user_id": f"eq.{actor.user.id}",
                "order": "created_at.desc",
            },
        )

        return RecipientDashboardResponse(
            institution=actor.institution,
            requests=[
                self._to_equipment_request(row)
                for row in request_rows
                if row.get("status") != RequestStatus.REJECTED_CANCELLED.value
            ],
            saved_listings=[self._to_listing(row["listing"]) for row in saved_listing_rows if row.get("listing")],
            threads=[],
            request_board_posts=[],
        )

    def list_notifications(
        self,
        actor: AuthenticatedUser,
        *,
        limit: int = 20,
        before: str | None = None,
    ) -> NotificationListResponse:
        normalized_limit = max(1, min(limit, 50))
        params = {
            "select": (
                "id,type,message,cta_href,entity_type,entity_id,metadata,created_at,viewed_at,"
                "email_status,email_attempted_at,email_error"
            ),
            "user_id": f"eq.{actor.user.id}",
            "order": "created_at.desc",
            "limit": str(normalized_limit),
        }
        if before:
            params["created_at"] = f"lt.{before}"

        rows = self._request("GET", "notifications", params=params)
        unread_rows = self._request(
            "GET",
            "notifications",
            params={
                "select": "id",
                "user_id": f"eq.{actor.user.id}",
                "viewed_at": "is.null",
            },
        )

        notifications = [self._to_notification(row) for row in rows]
        next_cursor = notifications[-1].created_at.isoformat() if notifications else None
        return NotificationListResponse(
            notifications=notifications,
            unread_count=len(unread_rows),
            next_cursor=next_cursor,
        )

    def mark_notifications_viewed(self, actor: AuthenticatedUser) -> MarkNotificationsViewedResponse:
        unread_rows = self._request(
            "GET",
            "notifications",
            params={
                "select": "id",
                "user_id": f"eq.{actor.user.id}",
                "viewed_at": "is.null",
            },
        )
        viewed_at = datetime.now(timezone.utc)
        if unread_rows:
            self._request(
                "PATCH",
                "notifications",
                params={
                    "user_id": f"eq.{actor.user.id}",
                    "viewed_at": "is.null",
                },
                json={"viewed_at": viewed_at.isoformat()},
                headers={"Prefer": "return=minimal"},
            )
        return MarkNotificationsViewedResponse(marked_count=len(unread_rows), viewed_at=viewed_at)

    def create_equipment_request(self, actor: AuthenticatedUser, listing_id: str) -> EquipmentRequest:
        listing = self._get_listing_row(listing_id)
        if not listing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")

        normalized_status = self._normalize_listing_status(listing["status"])
        if normalized_status not in {
            ListingStatus.LIVE.value,
            ListingStatus.UNDER_REVIEW.value,
            ListingStatus.MATCHED_RESERVED.value,
        }:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This listing is not open for requests.")

        existing_requests = self._request(
            "GET",
            "equipment_requests",
            params={
                "select": "id,status",
                "listing_id": f"eq.{listing_id}",
                "recipient_institution_id": f"eq.{actor.institution.id}",
                "order": "created_at.desc",
                "limit": "1",
            },
        )
        latest_request = existing_requests[0] if existing_requests else None
        if latest_request and latest_request.get("status") not in {
            RequestStatus.REJECTED_CANCELLED.value,
            RequestStatus.COMPLETED.value,
        }:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Your institution has already requested this listing.")

        request_id = f"request_{uuid4().hex[:12]}"
        self._request(
            "POST",
            "equipment_requests",
            json={
                "id": request_id,
                "listing_id": listing_id,
                "recipient_institution_id": actor.institution.id,
                "submitted_by_user_id": actor.user.id,
                "intended_use": f"Request for {listing['title']}",
                "institution_type": actor.institution.type.value,
                "program_or_department": actor.institution.name,
                "audience": "To be confirmed",
                "needed_by": date.today().isoformat(),
                "urgency_notes": "Submitted from public listing detail.",
                "delivery_constraints": f"Requested via LabLink ({listing['delivery_mode']}).",
                "storage_readiness": "Pending recipient logistics confirmation.",
                "funding_or_logistics_notes": "Admin review required before donor coordination.",
                "status": RequestStatus.SUBMITTED.value,
            },
            headers={"Prefer": "return=minimal"},
        )

        self._request(
            "PATCH",
            "listings",
            params={"id": f"eq.{listing_id}"},
            json={
                "request_count": int(listing.get("request_count", 0)) + 1,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            headers={"Prefer": "return=minimal"},
        )

        admin_message = f"{actor.institution.name} submitted a request for {listing['title']}."
        donor_message = f"A recipient institution requested your listing {listing['title']}."
        self._notify_role(
            "admin",
            notification_type=NotificationType.ADMIN_REQUEST_SUBMITTED,
            message=admin_message,
            cta_href="/admin",
            entity_type="request",
            entity_id=request_id,
            metadata={
                "listing_id": listing_id,
                "recipient_institution_id": actor.institution.id,
                "recipient_institution_name": actor.institution.name,
            },
        )
        self._notify_institution(
            listing["donor_institution_id"],
            notification_type=NotificationType.ADMIN_REQUEST_SUBMITTED,
            message=donor_message,
            cta_href="/donor",
            entity_type="request",
            entity_id=request_id,
            metadata={
                "listing_id": listing_id,
                "recipient_institution_id": actor.institution.id,
                "recipient_institution_name": actor.institution.name,
            },
        )

        row = self._get_equipment_request_row(request_id)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Request was created but could not be loaded.",
            )
        return self._to_equipment_request(row)

    def get_recipient_request_state(self, actor: AuthenticatedUser, listing_id: str) -> tuple[bool, RequestStatus | None]:
        rows = self._request(
            "GET",
            "equipment_requests",
            params={
                "select": "id,status",
                "listing_id": f"eq.{listing_id}",
                "recipient_institution_id": f"eq.{actor.institution.id}",
                "order": "created_at.desc",
                "limit": "1",
            },
        )
        if not rows:
            return False, None

        latest_status = RequestStatus(rows[0]["status"])
        if latest_status == RequestStatus.REJECTED_CANCELLED:
            return False, latest_status

        return True, latest_status

    def cancel_recipient_request(self, actor: AuthenticatedUser, listing_id: str) -> None:
        rows = self._request(
            "GET",
            "equipment_requests",
            params={
                "select": (
                    "id,status,recipient_institution_id,"
                    "listing:listings(id,title,donor_institution_id,status,request_count)"
                ),
                "listing_id": f"eq.{listing_id}",
                "recipient_institution_id": f"eq.{actor.institution.id}",
                "order": "created_at.desc",
                "limit": "1",
            },
        )
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No request was found for this listing.")

        request_row = rows[0]
        request_status = RequestStatus(request_row["status"])
        if request_status in {RequestStatus.APPROVED_MATCHED, RequestStatus.COMPLETED}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This request can no longer be cancelled from the listing page.",
            )

        timestamp = datetime.now(timezone.utc).isoformat()
        self._request(
            "PATCH",
            "equipment_requests",
            params={"id": f"eq.{request_row['id']}"},
            json={
                "status": RequestStatus.REJECTED_CANCELLED.value,
                "updated_at": timestamp,
            },
            headers={"Prefer": "return=minimal"},
        )

        listing = request_row.get("listing") or self._get_listing_row(listing_id)
        if listing:
            next_request_count = max(0, int(listing.get("request_count", 0)) - 1)
            listing_patch: dict[str, Any] = {
                "request_count": next_request_count,
                "updated_at": timestamp,
            }
            normalized_listing_status = self._normalize_listing_status(listing.get("status", ""))
            if normalized_listing_status == ListingStatus.UNDER_REVIEW.value and next_request_count == 0:
                listing_patch["status"] = ListingStatus.LIVE.value

            self._request(
                "PATCH",
                "listings",
                params={"id": f"eq.{listing_id}"},
                json=listing_patch,
                headers={"Prefer": "return=minimal"},
            )

            self._request(
                "POST",
                "admin_audit_logs",
                json={
                    "id": f"audit_{uuid4().hex[:12]}",
                    "actor_user_id": actor.user.id,
                    "action_type": "recipient_request_cancelled",
                    "subject_table": "equipment_requests",
                    "subject_id": request_row["id"],
                    "notes": f"Recipient cancelled request for listing {listing_id}.",
                },
                headers={"Prefer": "return=minimal"},
            )

            message = f"{actor.institution.name} cancelled its request for {listing['title']}."
            metadata = {
                "request_id": request_row["id"],
                "listing_id": listing_id,
                "status": RequestStatus.REJECTED_CANCELLED.value,
                "recipient_institution_id": actor.institution.id,
                "recipient_institution_name": actor.institution.name,
            }
            self._notify_role(
                "admin",
                notification_type=NotificationType.REQUEST_STATUS_CHANGED,
                message=message,
                cta_href="/admin",
                entity_type="request",
                entity_id=request_row["id"],
                metadata=metadata,
            )
            self._notify_institution(
                listing["donor_institution_id"],
                notification_type=NotificationType.REQUEST_STATUS_CHANGED,
                message=message,
                cta_href="/donor",
                entity_type="request",
                entity_id=request_row["id"],
                metadata=metadata,
            )

    def get_saved_listing_state(self, actor: AuthenticatedUser, listing_id: str) -> bool:
        rows = self._request(
            "GET",
            "saved_listings",
            params={
                "select": "listing_id",
                "user_id": f"eq.{actor.user.id}",
                "listing_id": f"eq.{listing_id}",
                "limit": "1",
            },
        )
        return bool(rows)

    def save_listing_for_recipient(self, actor: AuthenticatedUser, listing_id: str) -> None:
        listing = self._get_listing_detail_row(listing_id)
        if not listing or not self._is_verified_donor_listing_row(listing):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")

        if self.get_saved_listing_state(actor, listing_id):
            return

        self._request(
            "POST",
            "saved_listings",
            json={
                "user_id": actor.user.id,
                "listing_id": listing_id,
            },
            headers={"Prefer": "return=minimal"},
        )

    def remove_saved_listing_for_recipient(self, actor: AuthenticatedUser, listing_id: str) -> None:
        self._request(
            "DELETE",
            "saved_listings",
            params={
                "user_id": f"eq.{actor.user.id}",
                "listing_id": f"eq.{listing_id}",
            },
        )

    def get_donor_listing_detail(self, actor: AuthenticatedUser, listing_id: str) -> ListingDetailResponse:
        row = self._get_listing_detail_row(listing_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")
        self._ensure_donor_controls_listing(actor, row)
        return self._to_listing_detail(row)

    def create_listing(self, actor: AuthenticatedUser, payload: ListingCreate) -> Listing:
        listing_id = f"listing_{uuid4().hex[:12]}"
        self._request(
            "POST",
            "listings",
            json={
                "id": listing_id,
                "donor_institution_id": actor.institution.id,
                "created_by_user_id": actor.user.id,
                "title": payload.title,
                "category": payload.category,
                "item_condition": payload.condition,
                "quantity": payload.quantity,
                "location": payload.location,
                "availability_window": payload.availability_window,
                "description": payload.description,
                "dimensions_weight": payload.dimensions_weight,
                "handling_requirements": payload.handling_requirements,
                "working_status": payload.working_status,
                "documentation_included": payload.documentation_included,
                "special_handling_flags": payload.special_handling_flags,
                "delivery_mode": payload.delivery_mode,
                "status": ListingStatus.PENDING_ADMIN_APPROVAL.value,
            },
            headers={"Prefer": "return=minimal"},
        )

        for index, photo_url in enumerate(payload.photo_urls):
            self._request(
                "POST",
                "listing_photos",
                json={
                    "listing_id": listing_id,
                    "photo_url": photo_url,
                    "display_order": index,
                },
                headers={"Prefer": "return=minimal"},
            )

        self._notify_role(
            "admin",
            notification_type=NotificationType.ADMIN_LISTING_SUBMITTED,
            message=f"{actor.institution.name} submitted a new listing: {payload.title}.",
            cta_href="/admin",
            entity_type="listing",
            entity_id=listing_id,
            metadata={"listing_id": listing_id, "donor_institution_id": actor.institution.id},
        )

        row = self._get_listing_row(listing_id)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Listing was created but could not be loaded.",
            )
        return self._to_listing(row)

    def update_donor_listing(self, actor: AuthenticatedUser, listing_id: str, payload: ListingUpdate) -> Listing:
        existing = self._get_listing_row(listing_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")
        self._ensure_donor_controls_listing(actor, existing)
        self._ensure_listing_mutable(existing, action="edit")

        self._request(
            "PATCH",
            "listings",
            params={"id": f"eq.{listing_id}"},
            json={
                "title": payload.title,
                "category": payload.category,
                "item_condition": payload.condition,
                "quantity": payload.quantity,
                "location": payload.location,
                "availability_window": payload.availability_window,
                "description": payload.description,
                "dimensions_weight": payload.dimensions_weight,
                "handling_requirements": payload.handling_requirements,
                "working_status": payload.working_status,
                "documentation_included": payload.documentation_included,
                "special_handling_flags": payload.special_handling_flags,
                "delivery_mode": payload.delivery_mode,
                "status": existing["status"],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            headers={"Prefer": "return=minimal"},
        )

        self._request("DELETE", "listing_photos", params={"listing_id": f"eq.{listing_id}"})
        for index, photo_url in enumerate(payload.photo_urls):
            self._request(
                "POST",
                "listing_photos",
                json={
                    "listing_id": listing_id,
                    "photo_url": photo_url,
                    "display_order": index,
                },
                headers={"Prefer": "return=minimal"},
            )

        updated = self._get_listing_row(listing_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Listing was updated but could not be reloaded.",
            )
        return self._to_listing(updated)

    def remove_donor_listing(self, actor: AuthenticatedUser, listing_id: str) -> Listing:
        existing = self._get_listing_row(listing_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")
        self._ensure_donor_controls_listing(actor, existing)
        self._ensure_listing_mutable(existing, action="remove")

        self._request(
            "PATCH",
            "listings",
            params={"id": f"eq.{listing_id}"},
            json={
                "status": ListingStatus.REMOVED_BY_DONOR.value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            headers={"Prefer": "return=minimal"},
        )

        updated = self._get_listing_row(listing_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Listing was removed but could not be reloaded.",
            )
        return self._to_listing(updated)

    def mark_donor_listing_donated(self, actor: AuthenticatedUser, listing_id: str) -> Listing:
        existing = self._get_listing_row(listing_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")
        self._ensure_donor_controls_listing(actor, existing)
        self._ensure_listing_mutable(existing, action="mark as donated")

        self._request(
            "PATCH",
            "listings",
            params={"id": f"eq.{listing_id}"},
            json={
                "status": ListingStatus.FULFILLED.value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            headers={"Prefer": "return=minimal"},
        )

        updated = self._get_listing_row(listing_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Listing was marked as donated but could not be reloaded.",
            )
        return self._to_listing(updated)

    def upload_listing_image(self, actor: AuthenticatedUser, filename: str, content: bytes, content_type: str) -> str:
        extension = Path(filename).suffix.lower() or ".jpg"
        object_path = f"listings/{actor.institution.id}/{uuid4().hex}{extension}"
        response = self._upload_storage_object(object_path, content, content_type)

        if response.status_code >= 400 and self._is_bucket_not_found(response):
            self._ensure_storage_bucket()
            response = self._upload_storage_object(object_path, content, content_type)

        if response.status_code >= 400:
            detail = "Image upload failed."
            try:
                body = response.json()
                detail = body.get("message") or body.get("error") or detail
            except ValueError:
                pass
            if "bucket" in detail.lower() and "not found" in detail.lower():
                detail = (
                    f"Supabase Storage bucket '{self.storage_bucket}' was not found. "
                    "Create that bucket or set SUPABASE_LISTING_IMAGES_BUCKET to an existing public bucket."
                )
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

        return f"{self.supabase_url}/storage/v1/object/public/{self.storage_bucket}/{object_path}"

    def _upload_storage_object(self, object_path: str, content: bytes, content_type: str) -> httpx.Response:
        upload_headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": content_type,
            "x-upsert": "false",
        }

        with httpx.Client(timeout=30.0) as client:
            return client.post(
                f"{self.supabase_url}/storage/v1/object/{self.storage_bucket}/{object_path}",
                headers=upload_headers,
                content=content,
            )

    def _ensure_storage_bucket(self) -> None:
        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "id": self.storage_bucket,
            "name": self.storage_bucket,
            "public": True,
        }

        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                f"{self.supabase_url}/storage/v1/bucket",
                headers=headers,
                json=payload,
            )

        if response.status_code in {200, 201, 409}:
            return

        detail = "Could not create the Supabase Storage bucket."
        try:
            body = response.json()
            detail = body.get("message") or body.get("error") or detail
        except ValueError:
            pass
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

    def _is_bucket_not_found(self, response: httpx.Response) -> bool:
        try:
            body = response.json()
        except ValueError:
            return False

        detail = body.get("message") or body.get("error") or ""
        return "bucket" in detail.lower() and "not found" in detail.lower()

    def get_admin_dashboard(self) -> AdminDashboardResponse:
        pending_institution_rows = self._request(
            "GET",
            "institutions",
            params={
                "select": "id,name,role_type,verification_status,location,description",
                "id": f"neq.{ADMIN_INSTITUTION_ID}",
                "order": "created_at.asc",
            },
        )
        listing_rows = self._request(
            "GET",
            "listings",
            params={
                "select": self._listing_select(),
                "order": "created_at.desc",
            },
        )
        listing_rows = self._with_active_request_counts(listing_rows)
        audit_rows = self._request(
            "GET",
            "admin_audit_logs",
            params={
                "select": "id,action_type,actor_user_id,subject_id,notes,created_at",
                "order": "created_at.desc",
                "limit": "10",
            },
        )
        return AdminDashboardResponse(
            pending_institutions=[self._to_institution(row) for row in pending_institution_rows],
            listings_for_review=[self._to_listing(row) for row in listing_rows],
            requests_requiring_attention=self._get_requests_for_listing_ids(
                only_verified_recipients=True,
                exclude_statuses={RequestStatus.REJECTED_CANCELLED, RequestStatus.COMPLETED},
                latest_per_recipient=True,
                include_rejected_if_listing_has_match=True,
            ),
            active_threads=[],
            recent_actions=[
                AdminAction.model_validate(
                    {
                        "id": row["id"],
                        "action_type": row["action_type"],
                        "actor_user_id": row["actor_user_id"],
                        "subject_id": row["subject_id"],
                        "notes": row.get("notes") or "",
                        "created_at": row["created_at"],
                    }
                )
                for row in audit_rows
            ],
        )

    def get_admin_listing_detail(self, listing_id: str) -> ListingDetailResponse:
        row = self._get_listing_detail_row(listing_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")
        return self._to_listing_detail(row)

    def update_listing_status(
        self,
        actor: AuthenticatedUser,
        listing_id: str,
        status_value: ListingStatus,
        *,
        admin_note: str | None = None,
    ) -> Listing:
        existing = self._get_listing_row(listing_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")

        current_status = self._normalize_listing_status(existing["status"])
        if current_status == ListingStatus.MATCHED_RESERVED.value and status_value not in {
            ListingStatus.MATCHED_RESERVED,
            ListingStatus.REMOVED_BY_ADMIN,
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Match-reserved listings can only stay match reserved, be removed by admin, or be reopened through Cancel match.",
            )

        patch_payload: dict[str, Any] = {
            "status": status_value.value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if status_value == ListingStatus.LIVE:
            patch_payload["approved_at"] = datetime.now(timezone.utc).isoformat()

        self._request(
            "PATCH",
            "listings",
            params={"id": f"eq.{listing_id}"},
            json=patch_payload,
            headers={"Prefer": "return=minimal"},
        )
        self._request(
            "POST",
            "admin_audit_logs",
            json={
                "id": f"audit_{uuid4().hex[:12]}",
                "actor_user_id": actor.user.id,
                "action_type": "listing_status_updated",
                "subject_table": "listings",
                "subject_id": listing_id,
                "notes": self._with_admin_note(f"Listing status updated to {status_value.value}.", admin_note),
            },
            headers={"Prefer": "return=minimal"},
        )

        updated = self._get_listing_row(listing_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Listing status was updated but the listing could not be reloaded.",
            )

        self._notify_institution(
            updated["donor_institution_id"],
            notification_type=NotificationType.LISTING_STATUS_CHANGED,
            message=self._with_admin_note(
                f"Your listing {updated['title']} is now {self._friendly_status_label(status_value.value)}.",
                admin_note,
            ),
            cta_href="/donor",
            entity_type="listing",
            entity_id=listing_id,
            metadata={"listing_id": listing_id, "status": status_value.value},
        )
        if status_value == ListingStatus.LIVE:
            self._notify_role(
                "recipient_institution",
                notification_type=NotificationType.RECIPIENT_CATALOG_UPDATED,
                message=f"New listing available in the catalog: {updated['title']}.",
                cta_href=f"/listings/{listing_id}",
                entity_type="listing",
                entity_id=listing_id,
                metadata={"listing_id": listing_id, "status": status_value.value},
            )
        return self._to_listing(updated)

    def update_institution_status(
        self,
        actor: AuthenticatedUser,
        institution_id: str,
        verification_status: VerificationStatus,
        *,
        admin_note: str | None = None,
    ) -> Institution:
        existing = self._get_institution_row(institution_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Institution {institution_id} not found.")

        self._request(
            "PATCH",
            "institutions",
            params={"id": f"eq.{institution_id}"},
            json={
                "verification_status": verification_status.value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            headers={"Prefer": "return=minimal"},
        )

        mapped_account_status = self._account_status_for_verification_status(verification_status)
        self._request(
            "PATCH",
            "app_users",
            params={"institution_id": f"eq.{institution_id}"},
            json={
                "account_status": mapped_account_status.value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            headers={"Prefer": "return=minimal"},
        )

        self._request(
            "POST",
            "admin_audit_logs",
            json={
                "id": f"audit_{uuid4().hex[:12]}",
                "actor_user_id": actor.user.id,
                "action_type": "institution_status_updated",
                "subject_table": "institutions",
                "subject_id": institution_id,
                "notes": self._with_admin_note(
                    (
                        f"Institution verification status updated to {verification_status.value}. "
                        f"Member account status set to {mapped_account_status.value}."
                    ),
                    admin_note,
                ),
            },
            headers={"Prefer": "return=minimal"},
        )

        updated = self._get_institution_row(institution_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Institution status was updated but the institution could not be reloaded.",
            )

        self._notify_institution(
            institution_id,
            notification_type=NotificationType.INSTITUTION_STATUS_CHANGED,
            message=self._with_admin_note(
                f"Your institution verification status is now {self._friendly_status_label(verification_status.value)}.",
                admin_note,
            ),
            cta_href=self._dashboard_href_for_role(updated["role_type"]),
            entity_type="institution",
            entity_id=institution_id,
            metadata={"institution_id": institution_id, "verification_status": verification_status.value},
        )
        return self._to_institution(updated)

    def select_equipment_request(
        self,
        actor: AuthenticatedUser,
        request_id: str,
        *,
        admin_note: str | None = None,
    ) -> EquipmentRequest:
        existing = self._get_equipment_request_row(request_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Request {request_id} not found.")

        listing_id = existing["listing_id"]
        listing = existing.get("listing")
        other_request_rows = self._request(
            "GET",
            "equipment_requests",
            params={
                "select": self._equipment_request_select(include_listing=True),
                "listing_id": f"eq.{listing_id}",
                "order": "created_at.desc",
            },
        )
        timestamp = datetime.now(timezone.utc).isoformat()

        self._request(
            "PATCH",
            "equipment_requests",
            params={"id": f"eq.{request_id}"},
            json={
                "status": RequestStatus.APPROVED_MATCHED.value,
                "selected_by_admin_user_id": actor.user.id,
                "selected_at": timestamp,
                "updated_at": timestamp,
            },
            headers={"Prefer": "return=minimal"},
        )

        self._request(
            "PATCH",
            "equipment_requests",
            params={
                "listing_id": f"eq.{listing_id}",
                "id": f"neq.{request_id}",
            },
            json={
                "status": RequestStatus.REJECTED_CANCELLED.value,
                "updated_at": timestamp,
            },
            headers={"Prefer": "return=minimal"},
        )

        self._request(
            "PATCH",
            "listings",
            params={"id": f"eq.{listing_id}"},
            json={
                "status": ListingStatus.MATCHED_RESERVED.value,
                "updated_at": timestamp,
            },
            headers={"Prefer": "return=minimal"},
        )

        self._request(
            "POST",
            "admin_audit_logs",
            json={
                "id": f"audit_{uuid4().hex[:12]}",
                "actor_user_id": actor.user.id,
                "action_type": "request_selected_for_listing",
                "subject_table": "equipment_requests",
                "subject_id": request_id,
                "notes": self._with_admin_note(f"Request selected for listing {listing_id}.", admin_note),
            },
            headers={"Prefer": "return=minimal"},
        )

        updated = self._get_equipment_request_row(request_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Request was selected but could not be reloaded.",
            )

        listing_title = (
            listing["title"]
            if isinstance(listing, dict) and listing.get("title")
            else self._get_listing_row(listing_id)["title"]
        )
        latest_request_rows = self._latest_request_rows_by_recipient(other_request_rows)
        self._notify_institution(
            existing["recipient_institution_id"],
            notification_type=NotificationType.REQUEST_STATUS_CHANGED,
            message=self._with_admin_note(
                f"Your request for {listing_title} is now {self._friendly_request_status_label(RequestStatus.APPROVED_MATCHED.value)}.",
                admin_note,
            ),
            cta_href="/recipient",
            entity_type="request",
            entity_id=request_id,
            metadata={"request_id": request_id, "status": RequestStatus.APPROVED_MATCHED.value, "listing_id": listing_id},
        )

        for row in latest_request_rows:
            if row["recipient_institution_id"] == existing["recipient_institution_id"]:
                continue
            self._notify_institution(
                row["recipient_institution_id"],
                notification_type=NotificationType.REQUEST_STATUS_CHANGED,
                message=self._with_admin_note(
                    f"Your request for {listing_title} was not selected.",
                    admin_note,
                ),
                cta_href="/recipient",
                entity_type="request",
                entity_id=row["id"],
                metadata={"request_id": row["id"], "status": RequestStatus.REJECTED_CANCELLED.value, "listing_id": listing_id},
            )
        return self._to_equipment_request(updated)

    def update_request_status(
        self,
        actor: AuthenticatedUser,
        request_id: str,
        status_value: RequestStatus,
        *,
        admin_note: str | None = None,
    ) -> EquipmentRequest:
        if status_value == RequestStatus.APPROVED_MATCHED:
            return self.select_equipment_request(actor, request_id, admin_note=admin_note)

        existing = self._get_equipment_request_row(request_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Request {request_id} not found.")

        current_status = RequestStatus(existing["status"])
        if current_status == RequestStatus.APPROVED_MATCHED and status_value in {
            RequestStatus.SUBMITTED,
            RequestStatus.ADMIN_REVIEW,
            RequestStatus.AWAITING_DONOR_CONFIRMATION,
            RequestStatus.REJECTED_CANCELLED,
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Use Cancel match to reopen or reject a currently matched request.",
            )

        timestamp = datetime.now(timezone.utc).isoformat()
        patch_payload: dict[str, Any] = {
            "status": status_value.value,
            "updated_at": timestamp,
        }
        if status_value != RequestStatus.APPROVED_MATCHED:
            patch_payload["selected_by_admin_user_id"] = None
            patch_payload["selected_at"] = None

        self._request(
            "PATCH",
            "equipment_requests",
            params={"id": f"eq.{request_id}"},
            json=patch_payload,
            headers={"Prefer": "return=minimal"},
        )

        if status_value == RequestStatus.COMPLETED:
            self._request(
                "PATCH",
                "listings",
                params={"id": f"eq.{existing['listing_id']}"},
                json={
                    "status": ListingStatus.FULFILLED.value,
                    "fulfilled_at": timestamp,
                    "updated_at": timestamp,
                },
                headers={"Prefer": "return=minimal"},
            )

        self._request(
            "POST",
            "admin_audit_logs",
            json={
                "id": f"audit_{uuid4().hex[:12]}",
                "actor_user_id": actor.user.id,
                "action_type": "request_status_updated",
                "subject_table": "equipment_requests",
                "subject_id": request_id,
                "notes": self._with_admin_note(f"Request status updated to {status_value.value}.", admin_note),
            },
            headers={"Prefer": "return=minimal"},
        )

        updated = self._get_equipment_request_row(request_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Request status was updated but the request could not be reloaded.",
            )

        listing_title = updated.get("listing", {}).get("title") if updated.get("listing") else existing["listing_id"]
        self._notify_institution(
            updated["recipient_institution_id"],
            notification_type=NotificationType.REQUEST_STATUS_CHANGED,
            message=self._with_admin_note(
                f"Your request for {listing_title} is now {self._friendly_request_status_label(status_value.value)}.",
                admin_note,
            ),
            cta_href="/recipient",
            entity_type="request",
            entity_id=request_id,
            metadata={"request_id": request_id, "status": status_value.value, "listing_id": updated["listing_id"]},
        )
        return self._to_equipment_request(updated)

    def cancel_listing_match(self, actor: AuthenticatedUser, listing_id: str) -> Listing:
        listing = self._get_listing_row(listing_id)
        if not listing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")

        normalized_status = self._normalize_listing_status(listing["status"])
        if normalized_status != ListingStatus.MATCHED_RESERVED.value:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only match-reserved listings can have their match cancelled.")

        timestamp = datetime.now(timezone.utc).isoformat()

        self._request(
            "PATCH",
            "equipment_requests",
            params={
                "listing_id": f"eq.{listing_id}",
                "status": f"in.({RequestStatus.APPROVED_MATCHED.value},{RequestStatus.REJECTED_CANCELLED.value})",
            },
            json={
                "status": RequestStatus.SUBMITTED.value,
                "selected_by_admin_user_id": None,
                "selected_at": None,
                "updated_at": timestamp,
            },
            headers={"Prefer": "return=minimal"},
        )

        self._request(
            "PATCH",
            "listings",
            params={"id": f"eq.{listing_id}"},
            json={
                "status": ListingStatus.LIVE.value,
                "updated_at": timestamp,
            },
            headers={"Prefer": "return=minimal"},
        )

        self._request(
            "POST",
            "admin_audit_logs",
            json={
                "id": f"audit_{uuid4().hex[:12]}",
                "actor_user_id": actor.user.id,
                "action_type": "listing_match_cancelled",
                "subject_table": "listings",
                "subject_id": listing_id,
                "notes": "Match cancelled and related requests reopened.",
            },
            headers={"Prefer": "return=minimal"},
        )

        request_rows = self._request(
            "GET",
            "equipment_requests",
            params={
                "select": self._equipment_request_select(include_listing=True),
                "listing_id": f"eq.{listing_id}",
            },
        )
        listing_title = listing["title"]
        for row in request_rows:
            self._notify_institution(
                row["recipient_institution_id"],
                notification_type=NotificationType.REQUEST_STATUS_CHANGED,
                message=f"Your request for {listing_title} is now {self._friendly_request_status_label(RequestStatus.SUBMITTED.value)}.",
                cta_href="/recipient",
                entity_type="request",
                entity_id=row["id"],
                metadata={"request_id": row["id"], "status": RequestStatus.SUBMITTED.value, "listing_id": listing_id},
            )

        updated = self._get_listing_row(listing_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Listing match was cancelled but the listing could not be reloaded.",
            )
        return self._to_listing(updated)

    def _notify_role(
        self,
        role_value: str,
        *,
        notification_type: NotificationType,
        message: str,
        cta_href: str,
        entity_type: str,
        entity_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        users = self._request(
            "GET",
            "app_users",
            params={
                "select": "id,email,full_name,role,institution_id,account_status",
                "role": f"eq.{role_value}",
            },
        )
        self._create_notifications_for_users(
            users,
            notification_type=notification_type,
            message=message,
            cta_href=cta_href,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata,
        )

    def _notify_institution(
        self,
        institution_id: str,
        *,
        notification_type: NotificationType,
        message: str,
        cta_href: str,
        entity_type: str,
        entity_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        users = self._request(
            "GET",
            "app_users",
            params={
                "select": "id,email,full_name,role,institution_id,account_status",
                "institution_id": f"eq.{institution_id}",
            },
        )
        self._create_notifications_for_users(
            users,
            notification_type=notification_type,
            message=message,
            cta_href=cta_href,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata,
        )

    def _create_notifications_for_users(
        self,
        users: list[dict[str, Any]],
        *,
        notification_type: NotificationType,
        message: str,
        cta_href: str,
        entity_type: str,
        entity_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        for user in users:
            notification_id = f"notif_{uuid4().hex[:12]}"
            notification_row = {
                "id": notification_id,
                "user_id": user["id"],
                "type": notification_type.value,
                "message": message,
                "cta_href": cta_href,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "metadata": metadata or {},
            }
            self._request(
                "POST",
                "notifications",
                json=notification_row,
                headers={"Prefer": "return=minimal"},
            )
            self._send_notification_email(
                notification_id=notification_id,
                to_email=user["email"],
                subject=self._notification_email_subject(notification_type),
                message=message,
                cta_href=cta_href,
            )

    def _send_notification_email(
        self,
        *,
        notification_id: str,
        to_email: str,
        subject: str,
        message: str,
        cta_href: str,
    ) -> None:
        attempted_at = datetime.now(timezone.utc).isoformat()
        if not self.resend_api_key or not self.email_from:
            self._set_notification_email_status(
                notification_id,
                NotificationEmailStatus.FAILED,
                attempted_at=attempted_at,
                error="Email delivery is not configured.",
            )
            return

        payload: dict[str, Any] = {
            "from": self.email_from,
            "to": [to_email],
            "subject": subject,
            "html": (
                f"<p>{message}</p>"
                f"<p><a href=\"{self.frontend_origin}{cta_href}\">Open in LabLink</a></p>"
            ),
        }
        if self.email_reply_to:
            payload["reply_to"] = self.email_reply_to

        try:
            with httpx.Client(timeout=20.0) as client:
                response = client.post(
                    RESEND_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.resend_api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

            if response.status_code >= 400:
                detail = "Email delivery failed."
                try:
                    body = response.json()
                    detail = body.get("message") or body.get("error") or detail
                except ValueError:
                    pass
                self._set_notification_email_status(
                    notification_id,
                    NotificationEmailStatus.FAILED,
                    attempted_at=attempted_at,
                    error=detail,
                )
                return
        except Exception as error:
            self._set_notification_email_status(
                notification_id,
                NotificationEmailStatus.FAILED,
                attempted_at=attempted_at,
                error=str(error),
            )
            return

        self._set_notification_email_status(
            notification_id,
            NotificationEmailStatus.SENT,
            attempted_at=attempted_at,
        )

    def _set_notification_email_status(
        self,
        notification_id: str,
        email_status: NotificationEmailStatus,
        *,
        attempted_at: str,
        error: str | None = None,
    ) -> None:
        self._request(
            "PATCH",
            "notifications",
            params={"id": f"eq.{notification_id}"},
            json={
                "email_status": email_status.value,
                "email_attempted_at": attempted_at,
                "email_error": error,
            },
            headers={"Prefer": "return=minimal"},
        )

    def _notification_email_subject(self, notification_type: NotificationType) -> str:
        if notification_type == NotificationType.ADMIN_LISTING_SUBMITTED:
            return "LabLink admin notification: new listing submitted"
        if notification_type == NotificationType.ADMIN_REQUEST_SUBMITTED:
            return "LabLink notification: new equipment request"
        if notification_type == NotificationType.RECIPIENT_CATALOG_UPDATED:
            return "LabLink notification: new catalog listing"
        return "LabLink notification"

    def _friendly_status_label(self, status_value: str) -> str:
        return status_value.replace("_", " ")

    def _friendly_request_status_label(self, status_value: str) -> str:
        if status_value == RequestStatus.REJECTED_CANCELLED.value:
            return "not selected"
        if status_value == RequestStatus.APPROVED_MATCHED.value:
            return "approved"
        if status_value in {RequestStatus.SUBMITTED.value, RequestStatus.ADMIN_REVIEW.value}:
            return "pending request"
        return self._friendly_status_label(status_value)

    def _dashboard_href_for_role(self, role_value: str) -> str:
        if role_value == "donor_lab":
            return "/donor"
        if role_value == "recipient_institution":
            return "/recipient"
        if role_value == "admin":
            return "/admin"
        return "/auth"

    def _with_admin_note(self, message: str, admin_note: str | None) -> str:
        cleaned_note = (admin_note or "").strip()
        if not cleaned_note:
            return message
        return f"{message} Admin note: {cleaned_note}"

    def _get_listing_row(self, listing_id: str) -> dict[str, Any] | None:
        rows = self._request(
            "GET",
            "listings",
            params={
                "select": self._listing_select(),
                "id": f"eq.{listing_id}",
                "limit": "1",
            },
        )
        if not rows:
            return None
        return self._with_active_request_counts(rows)[0]

    def _get_equipment_request_row(self, request_id: str) -> dict[str, Any] | None:
        rows = self._request(
            "GET",
            "equipment_requests",
            params={
                "select": self._equipment_request_select(include_listing=True),
                "id": f"eq.{request_id}",
                "limit": "1",
            },
        )
        return rows[0] if rows else None

    def _ensure_donor_controls_listing(self, actor: AuthenticatedUser, row: dict[str, Any]) -> None:
        if row.get("donor_institution_id") != actor.institution.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your own listings.")

    def _ensure_listing_mutable(self, row: dict[str, Any], *, action: str) -> None:
        status_value = self._normalize_listing_status(row.get("status"))
        if status_value in {
            ListingStatus.FULFILLED.value,
            ListingStatus.REMOVED_BY_ADMIN.value,
            ListingStatus.REMOVED_BY_DONOR.value,
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Listings that are already {status_value.replace('_', ' ')} cannot be {action}ed.",
            )

    def _get_institution_row(self, institution_id: str) -> dict[str, Any] | None:
        rows = self._request(
            "GET",
            "institutions",
            params={
                "select": "id,name,role_type,verification_status,location,description",
                "id": f"eq.{institution_id}",
                "limit": "1",
            },
        )
        return rows[0] if rows else None

    def _get_listing_detail_row(
        self,
        listing_id: str,
        *,
        extra_params: dict[str, str] | None = None,
    ) -> dict[str, Any] | None:
        params = {
            "select": (
                "id,donor_institution_id,created_by_user_id,title,category,item_condition,quantity,location,"
                "availability_window,description,dimensions_weight,handling_requirements,working_status,"
                "documentation_included,special_handling_flags,delivery_mode,status,request_count,created_at,"
                "listing_photos(photo_url,display_order),"
                "donor_institution:institutions(id,name,role_type,verification_status,location,description)"
            ),
            "id": f"eq.{listing_id}",
            "limit": "1",
        }
        if extra_params:
            params.update(extra_params)
        rows = self._request("GET", "listings", params=params)
        if not rows:
            return None
        return self._with_active_request_counts(rows)[0]

    def _listing_select(self, *, include_donor_institution: bool = False) -> str:
        base = (
            "id,donor_institution_id,created_by_user_id,title,category,item_condition,quantity,location,"
            "availability_window,description,dimensions_weight,handling_requirements,working_status,"
            "documentation_included,special_handling_flags,delivery_mode,status,request_count,created_at,"
            "listing_photos(photo_url,display_order)"
        )
        if include_donor_institution:
            return f"{base},donor_institution:institutions(id,name,role_type,verification_status,location,description)"
        return base

    def _equipment_request_select(
        self,
        *,
        include_listing: bool = False,
        include_recipient_institution: bool = False,
    ) -> str:
        base = (
            "id,listing_id,recipient_institution_id,submitted_by_user_id,intended_use,program_or_department,"
            "audience,needed_by,urgency_notes,delivery_constraints,storage_readiness,funding_or_logistics_notes,"
            "status,created_at"
        )
        if include_listing:
            base = f"{base},listing:listings({self._listing_select()})"
        if include_recipient_institution:
            base = (
                f"{base},recipient_institution:institutions(id,name,role_type,verification_status,location,description)"
            )
        return base

    def _to_listing_detail(self, row: dict[str, Any]) -> ListingDetailResponse:
        donor_institution = row.get("donor_institution")
        if not donor_institution:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Listing detail is missing donor institution data.",
            )
        return ListingDetailResponse(
            listing=self._to_listing(row),
            donor_institution=self._to_institution(donor_institution),
            related_requests=self._get_requests_for_listing_ids(
                [row["id"]],
                exclude_statuses={RequestStatus.REJECTED_CANCELLED},
                latest_per_recipient=True,
                include_rejected_if_listing_has_match=True,
            ),
        )

    def _to_listing(self, row: dict[str, Any]) -> Listing:
        photos = sorted(row.get("listing_photos") or [], key=lambda entry: entry.get("display_order", 0))
        return Listing.model_validate(
            {
                "id": row["id"],
                "title": row["title"],
                "category": row["category"],
                "condition": row["item_condition"],
                "quantity": row["quantity"],
                "location": row["location"],
                "availability_window": row["availability_window"],
                "description": row["description"],
                "dimensions_weight": row["dimensions_weight"],
                "handling_requirements": row["handling_requirements"],
                "working_status": row["working_status"],
                "documentation_included": row["documentation_included"],
                "special_handling_flags": row["special_handling_flags"],
                "delivery_mode": row["delivery_mode"],
                "status": self._normalize_listing_status(row["status"]),
                "photo_urls": [photo["photo_url"] for photo in photos],
                "donor_institution_id": row["donor_institution_id"],
                "created_by_user_id": row["created_by_user_id"],
                "created_at": row["created_at"],
                "request_count": row.get("request_count", 0),
            }
        )

    def _with_active_request_counts(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not rows:
            return rows

        listing_ids = [row["id"] for row in rows if row.get("id")]
        active_requests = self._get_requests_for_listing_ids(
            listing_ids,
            exclude_statuses={RequestStatus.REJECTED_CANCELLED, RequestStatus.COMPLETED},
            latest_per_recipient=True,
        )

        request_counts: dict[str, int] = {}
        for request in active_requests:
            request_counts[request.listing_id] = request_counts.get(request.listing_id, 0) + 1

        normalized_rows: list[dict[str, Any]] = []
        for row in rows:
            normalized_row = dict(row)
            normalized_row["request_count"] = request_counts.get(row["id"], 0)
            normalized_rows.append(normalized_row)
        return normalized_rows

    def _to_equipment_request(self, row: dict[str, Any]) -> EquipmentRequest:
        return EquipmentRequest.model_validate(
            {
                "id": row["id"],
                "listing_id": row["listing_id"],
                "recipient_institution_id": row["recipient_institution_id"],
                "submitted_by_user_id": row["submitted_by_user_id"],
                "intended_use": row["intended_use"],
                "program_or_department": row["program_or_department"],
                "audience": row.get("audience") or "",
                "needed_by": row["needed_by"],
                "urgency_notes": row.get("urgency_notes") or "",
                "delivery_constraints": row["delivery_constraints"],
                "storage_readiness": row["storage_readiness"],
                "funding_or_logistics_notes": row.get("funding_or_logistics_notes") or "",
                "status": row["status"],
                "submitted_at": row["created_at"],
                "listing": self._to_listing(row["listing"]) if row.get("listing") else None,
            }
        )

    def _latest_request_rows_by_recipient(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        latest_rows: dict[str, dict[str, Any]] = {}
        for row in rows:
            institution_id = row["recipient_institution_id"]
            if institution_id not in latest_rows:
                latest_rows[institution_id] = row
        return list(latest_rows.values())

    def _to_notification(self, row: dict[str, Any]) -> Notification:
        return Notification.model_validate(
            {
                "id": row["id"],
                "type": row["type"],
                "message": row["message"],
                "cta_href": row["cta_href"],
                "entity_type": row["entity_type"],
                "entity_id": row["entity_id"],
                "metadata": row.get("metadata") or {},
                "created_at": row["created_at"],
                "viewed_at": row.get("viewed_at"),
                "email_status": row.get("email_status") or NotificationEmailStatus.PENDING.value,
                "email_attempted_at": row.get("email_attempted_at"),
                "email_error": row.get("email_error"),
            }
        )

    def _get_requests_for_listing_ids(
        self,
        listing_ids: list[str] | None = None,
        *,
        only_verified_recipients: bool = False,
        exclude_statuses: set[RequestStatus] | None = None,
        latest_per_recipient: bool = False,
        include_rejected_if_listing_has_match: bool = False,
    ) -> list[EquipmentRequest]:
        params = {
            "select": self._equipment_request_select(
                include_listing=True,
                include_recipient_institution=only_verified_recipients,
            ),
            "order": "created_at.desc",
        }
        if listing_ids is not None:
            if not listing_ids:
                return []
            params["listing_id"] = f"in.({','.join(listing_ids)})"

        rows = self._request("GET", "equipment_requests", params=params)
        if only_verified_recipients:
            rows = [row for row in rows if self._is_verified_recipient_request_row(row)]
        if latest_per_recipient:
            latest_rows: dict[tuple[str, str], dict[str, Any]] = {}
            for row in rows:
                key = (row["listing_id"], row["recipient_institution_id"])
                if key not in latest_rows:
                    latest_rows[key] = row
            rows = list(latest_rows.values())
        if exclude_statuses:
            excluded = {status.value for status in exclude_statuses}
            listing_ids_with_match = {
                row["listing_id"] for row in rows if row.get("status") == RequestStatus.APPROVED_MATCHED.value
            }
            filtered_rows: list[dict[str, Any]] = []
            for row in rows:
                row_status = row.get("status")
                if (
                    include_rejected_if_listing_has_match
                    and row_status == RequestStatus.REJECTED_CANCELLED.value
                    and row["listing_id"] in listing_ids_with_match
                ):
                    filtered_rows.append(row)
                    continue
                if row_status not in excluded:
                    filtered_rows.append(row)
            rows = filtered_rows
        rows.sort(key=lambda row: row.get("created_at", ""), reverse=True)
        rows.sort(key=lambda row: 0 if row.get("status") == RequestStatus.APPROVED_MATCHED.value else 1)
        return [self._to_equipment_request(row) for row in rows]

    def _is_verified_donor_listing_row(self, row: dict[str, Any]) -> bool:
        donor_institution = row.get("donor_institution")
        return bool(donor_institution and donor_institution.get("verification_status") == VerificationStatus.VERIFIED.value)

    def _is_verified_recipient_request_row(self, row: dict[str, Any]) -> bool:
        recipient_institution = row.get("recipient_institution")
        return bool(
            recipient_institution
            and recipient_institution.get("verification_status") == VerificationStatus.VERIFIED.value
        )

    def _normalize_listing_status(self, status_value: str) -> str:
        if status_value == "removed_expired":
            return ListingStatus.REMOVED_BY_ADMIN.value
        return status_value

    def _to_institution(self, row: dict[str, Any]) -> Institution:
        return Institution.model_validate(
            {
                "id": row["id"],
                "name": row["name"],
                "type": row["role_type"],
                "verification_status": row["verification_status"],
                "location": row["location"],
                "description": row["description"],
            }
        )

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> Any:
        request_headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            **(headers or {}),
        }
        with httpx.Client(timeout=20.0) as client:
            response = client.request(
                method,
                f"{self.supabase_url}/rest/v1/{path}",
                params=params,
                json=json,
                headers=request_headers,
            )

        if response.status_code >= 400:
            detail = "Supabase listing request failed."
            try:
                body = response.json()
                detail = body.get("message") or body.get("hint") or body.get("error") or detail
            except ValueError:
                pass
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)

        if response.content:
            return response.json()
        return None

    def _account_status_for_verification_status(self, verification_status: VerificationStatus) -> AccountStatus:
        if verification_status == VerificationStatus.VERIFIED:
            return AccountStatus.VERIFIED
        if verification_status == VerificationStatus.SUSPENDED:
            return AccountStatus.SUSPENDED
        if verification_status == VerificationStatus.REJECTED:
            return AccountStatus.RESTRICTED
        return AccountStatus.PENDING_VERIFICATION


def get_supabase_listing_service() -> SupabaseListingService:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase backend configuration is incomplete.",
        )
    return SupabaseListingService(
        supabase_url=settings.supabase_url,
        service_role_key=settings.supabase_service_role_key,
        storage_bucket=settings.supabase_listing_images_bucket,
        frontend_origin=settings.frontend_origin,
        resend_api_key=settings.resend_api_key,
        email_from=settings.email_from,
        email_reply_to=settings.email_reply_to,
    )
