from __future__ import annotations

from datetime import datetime, timezone
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
    Institution,
    Listing,
    ListingCreate,
    ListingUpdate,
    ListingDetailResponse,
    ListingStatus,
    VerificationStatus,
)
from app.services.supabase_profiles import ADMIN_INSTITUTION_ID


class SupabaseListingService:
    def __init__(self, supabase_url: str, service_role_key: str, storage_bucket: str):
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.storage_bucket = storage_bucket

    def list_public_listings(self) -> list[Listing]:
        rows = self._request(
            "GET",
            "listings",
            params={
                "select": self._listing_select(),
                "status": "in.(live,under_review,matched_reserved,fulfilled)",
                "order": "created_at.desc",
            },
        )
        return [self._to_listing(row) for row in rows]

    def get_public_listing_detail(self, listing_id: str) -> ListingDetailResponse:
        row = self._get_listing_detail_row(
            listing_id,
            extra_params={"status": "in.(live,under_review,matched_reserved,fulfilled)"},
        )
        if not row:
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
        listings = [
            listing
            for listing in (self._to_listing(row) for row in rows)
            if listing.status not in {ListingStatus.REMOVED_BY_ADMIN, ListingStatus.REMOVED_BY_DONOR}
        ]
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
            active_requests=[],
            impact_summary=impact_summary,
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
            requests_requiring_attention=[],
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

    def update_listing_status(self, actor: AuthenticatedUser, listing_id: str, status_value: ListingStatus) -> Listing:
        existing = self._get_listing_row(listing_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Listing {listing_id} not found.")

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
                "notes": f"Listing status updated to {status_value.value}.",
            },
            headers={"Prefer": "return=minimal"},
        )

        updated = self._get_listing_row(listing_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Listing status was updated but the listing could not be reloaded.",
            )
        return self._to_listing(updated)

    def update_institution_status(
        self,
        actor: AuthenticatedUser,
        institution_id: str,
        verification_status: VerificationStatus,
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
                "notes": (
                    f"Institution verification status updated to {verification_status.value}. "
                    f"Member account status set to {mapped_account_status.value}."
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

        return self._to_institution(updated)

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
        return rows[0] if rows else None

    def _listing_select(self) -> str:
        return (
            "id,donor_institution_id,created_by_user_id,title,category,item_condition,quantity,location,"
            "availability_window,description,dimensions_weight,handling_requirements,working_status,"
            "documentation_included,special_handling_flags,delivery_mode,status,request_count,created_at,"
            "listing_photos(photo_url,display_order)"
        )

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
            related_requests=[],
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
    )
