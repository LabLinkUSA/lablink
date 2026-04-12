import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.schemas.domain import ListingStatus, RequestStatus
from app.services.supabase_listings import SupabaseListingService


def make_service() -> SupabaseListingService:
    return SupabaseListingService(
        supabase_url="https://supabase.example",
        service_role_key="service-role",
        storage_bucket="listing-images",
        documents_bucket="listing-documents",
        frontend_origin="https://lablink.example",
    )


class CancelOpenRequestsTests(unittest.TestCase):
    def test_cancel_open_requests_patches_with_correct_filter(self) -> None:
        service = make_service()
        service._request = MagicMock(return_value=None)  # type: ignore[method-assign]

        service._cancel_open_requests_for_listing("listing_abc")

        service._request.assert_called_once()
        call_args = service._request.call_args
        assert call_args[0][0] == "PATCH"
        assert call_args[0][1] == "equipment_requests"
        params = call_args[1]["params"]
        assert params["listing_id"] == "eq.listing_abc"
        assert "submitted" in params["status"]
        assert "admin_review" in params["status"]
        assert "approved_matched" in params["status"]
        body = call_args[1]["json"]
        assert body["status"] == RequestStatus.REJECTED_CANCELLED.value

    def test_cancel_open_requests_does_not_cancel_completed_or_already_cancelled(self) -> None:
        service = make_service()
        service._request = MagicMock(return_value=None)  # type: ignore[method-assign]

        service._cancel_open_requests_for_listing("listing_abc")

        params = service._request.call_args[1]["params"]
        # The status filter is an `in.(...)` that only covers open statuses
        included = set(params["status"].replace("in.(", "").replace(")", "").split(","))
        assert included == {
            RequestStatus.SUBMITTED.value,
            RequestStatus.ADMIN_REVIEW.value,
            RequestStatus.APPROVED_MATCHED.value,
        }


class RemoveDonorListingCancelsRequestsTests(unittest.TestCase):
    def _make_actor(self) -> object:
        from app.schemas.domain import (
            AccountStatus, AuthenticatedUser, Institution, Role,
            User, VerificationStatus,
        )
        institution = Institution(
            id="inst_donor",
            name="Donor Lab",
            type=Role.DONOR_LAB,
            verification_status=VerificationStatus.VERIFIED,
            location="New York",
            description="",
        )
        user = User(
            id="user_donor",
            full_name="Dana Donor",
            email="dana@example.com",
            role=Role.DONOR_LAB,
            account_status=AccountStatus.VERIFIED,
            institution_id="inst_donor",
        )
        return AuthenticatedUser(user=user, institution=institution)

    def test_remove_live_listing_cancels_open_requests(self) -> None:
        service = make_service()
        actor = self._make_actor()

        listing_row = {
            "id": "listing_abc",
            "title": "PCR Thermocycler",
            "status": "live",
            "donor_institution_id": "inst_donor",
            "created_by_user_id": "user_donor",
            "request_count": 2,
        }

        stub_request_row = {
            "id": "req_001",
            "listing_id": "listing_abc",
            "recipient_institution_id": "inst_recipient",
            "submitted_by_user_id": "user_recipient",
            "intended_use": "research",
            "program_or_department": "biology",
            "audience": "",
            "needed_by": "2026-12-31",
            "urgency_notes": "",
            "delivery_constraints": "none",
            "storage_readiness": "ready",
            "funding_or_logistics_notes": "",
            "status": RequestStatus.SUBMITTED.value,
            "created_at": "2026-01-01T00:00:00+00:00",
            "listing": None,
        }
        equipment_requests_call_count = 0

        def fake_request(method, table, **kwargs):
            nonlocal equipment_requests_call_count
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "GET" and table == "equipment_requests":
                equipment_requests_call_count += 1
                # The first GET is an internal active-request-count lookup inside
                # _get_listing_row. The second GET fetches affected_requests in
                # remove_donor_listing — return a stub open request so the guard
                # triggers _cancel_open_requests_for_listing.
                # Subsequent calls (notification loop) return empty.
                if equipment_requests_call_count == 2:
                    return [stub_request_row]
                return []
            if method == "GET" and table == "app_users":
                return []
            return None

        service._request = MagicMock(side_effect=fake_request)  # type: ignore[method-assign]

        service.remove_donor_listing(actor, "listing_abc")  # type: ignore[arg-type]

        # Verify a PATCH on equipment_requests with rejected_cancelled was issued
        cancel_calls = [
            c for c in service._request.call_args_list
            if c[0][0] == "PATCH" and c[0][1] == "equipment_requests"
        ]
        assert len(cancel_calls) == 1, "Expected exactly one bulk PATCH to cancel requests"
        body = cancel_calls[0][1]["json"]
        assert body["status"] == RequestStatus.REJECTED_CANCELLED.value

    def test_admin_removal_cancels_open_requests_and_skips_completed(self) -> None:
        service = make_service()
        actor = self._make_actor()

        listing_row = {
            "id": "listing_abc",
            "title": "PCR Thermocycler",
            "status": "live",
            "donor_institution_id": "inst_donor",
            "created_by_user_id": "user_donor",
            "created_at": "2026-01-01T00:00:00+00:00",
            "request_count": 1,
            "category": "lab_equipment",
            "item_condition": "good",
            "quantity": 1,
            "location": "New York",
            "availability_window": "2026-05-01",
            "description": "A reliable thermocycler.",
            "dimensions_weight": "30cm x 20cm, 5kg",
            "handling_requirements": "None",
            "working_status": "fully_functional",
            "documentation_included": "",
            "special_handling_flags": "",
            "delivery_mode": "pickup_only",
            "listing_photos": [],
        }

        equipment_requests_call_count = {"count": 0}

        def fake_request(method, table, **kwargs):
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "PATCH" and table == "listings":
                return {**listing_row, "status": "removed_by_admin"}
            if method == "GET" and table == "equipment_requests":
                equipment_requests_call_count["count"] += 1
                return []
            if method == "PATCH" and table == "equipment_requests":
                return None
            if method == "GET" and table == "app_users":
                return []
            if method == "POST" and table == "admin_audit_logs":
                return None
            return None

        service._request = MagicMock(side_effect=fake_request)  # type: ignore[method-assign]

        # Simulate admin calling update_listing_status with REMOVED_BY_ADMIN
        from app.schemas.domain import (
            AccountStatus, AuthenticatedUser, Institution, Role,
            User, VerificationStatus,
        )
        admin_institution = Institution(
            id="inst_admin",
            name="LabLink Admin",
            type=Role.ADMIN,
            verification_status=VerificationStatus.VERIFIED,
            location="",
            description="",
        )
        admin_user = User(
            id="user_admin",
            full_name="Admin User",
            email="admin@lablink.io",
            role=Role.ADMIN,
            account_status=AccountStatus.VERIFIED,
            institution_id="inst_admin",
        )
        admin_actor = AuthenticatedUser(user=admin_user, institution=admin_institution)

        service.update_listing_status(admin_actor, "listing_abc", ListingStatus.REMOVED_BY_ADMIN)  # type: ignore[arg-type]

        # Verify a bulk PATCH on equipment_requests with rejected_cancelled was issued
        cancel_calls = [
            c for c in service._request.call_args_list
            if c[0][0] == "PATCH" and c[0][1] == "equipment_requests"
        ]
        assert len(cancel_calls) == 1, "Expected exactly one bulk PATCH to cancel requests on admin removal"
        body = cancel_calls[0][1]["json"]
        assert body["status"] == RequestStatus.REJECTED_CANCELLED.value


from app.services.supabase_listings import _changed_material_fields
from app.schemas.domain import ListingDraftSave


class ChangedMaterialFieldsTests(unittest.TestCase):
    def _base_existing(self) -> dict:
        return {
            "title": "PCR Thermocycler",
            "category": "lab_equipment",
            "item_condition": "good",
            "quantity": 1,
            "description": "A reliable thermocycler.",
            "working_status": "fully_functional",
            "delivery_mode": "pickup_only",
            "handling_requirements": "None",
            "special_handling_flags": "",
            "availability_window": "2026-05-01",
            "dimensions_weight": "30cm x 20cm, 5kg",
        }

    def _base_payload(self) -> ListingDraftSave:
        return ListingDraftSave(
            title="PCR Thermocycler",
            category="lab_equipment",
            condition="good",
            quantity=1,
            location="New York",
            availability_window="2026-05-01",
            description="A reliable thermocycler.",
            dimensions_weight="30cm x 20cm, 5kg",
            handling_requirements="None",
            working_status="fully_functional",
            documentation_included="",
            special_handling_flags="",
            delivery_mode="pickup_only",
            photo_urls=[],
        )

    def test_no_changes_returns_empty_set(self) -> None:
        result = _changed_material_fields(self._base_existing(), self._base_payload())
        assert result == set()

    def test_title_change_detected(self) -> None:
        payload = self._base_payload()
        payload = ListingDraftSave(**{**payload.model_dump(), "title": "Updated Title"})
        result = _changed_material_fields(self._base_existing(), payload)
        assert "title" in result

    def test_quantity_change_detected(self) -> None:
        payload = self._base_payload()
        payload = ListingDraftSave(**{**payload.model_dump(), "quantity": 3})
        result = _changed_material_fields(self._base_existing(), payload)
        assert "quantity" in result

    def test_condition_change_detected(self) -> None:
        # payload uses "condition", DB row uses "item_condition"
        payload = self._base_payload()
        payload = ListingDraftSave(**{**payload.model_dump(), "condition": "fair"})
        result = _changed_material_fields(self._base_existing(), payload)
        assert "condition" in result

    def test_non_material_field_not_detected(self) -> None:
        # location and documentation_included are NOT material fields
        payload = self._base_payload()
        payload = ListingDraftSave(**{**payload.model_dump(), "location": "Boston", "documentation_included": "Yes"})
        result = _changed_material_fields(self._base_existing(), payload)
        assert result == set()

    def test_whitespace_difference_is_not_a_change(self) -> None:
        existing = {**self._base_existing(), "title": "  PCR Thermocycler  "}
        payload = self._base_payload()  # title = "PCR Thermocycler" (no spaces)
        result = _changed_material_fields(existing, payload)
        assert "title" not in result


class SaveDonorListingReReviewTests(unittest.TestCase):
    def _make_actor(self) -> object:
        from app.schemas.domain import (
            AccountStatus, AuthenticatedUser, Institution, Role,
            User, VerificationStatus,
        )
        institution = Institution(
            id="inst_donor",
            name="Donor Lab",
            type=Role.DONOR_LAB,
            verification_status=VerificationStatus.VERIFIED,
            location="New York",
            description="",
        )
        user = User(
            id="user_donor",
            full_name="Dana Donor",
            email="dana@example.com",
            role=Role.DONOR_LAB,
            account_status=AccountStatus.VERIFIED,
            institution_id="inst_donor",
        )
        return AuthenticatedUser(user=user, institution=institution)

    def _live_listing_row(self) -> dict:
        return {
            "id": "listing_abc",
            "title": "PCR Thermocycler",
            "status": "live",
            "donor_institution_id": "inst_donor",
            "created_by_user_id": "user_donor",
            "category": "lab_equipment",
            "item_condition": "good",
            "quantity": 1,
            "location": "New York",
            "availability_window": "2026-05-01",
            "description": "A reliable thermocycler.",
            "dimensions_weight": "30cm x 20cm, 5kg",
            "handling_requirements": "None",
            "working_status": "fully_functional",
            "documentation_included": "",
            "special_handling_flags": "",
            "delivery_mode": "pickup_only",
            "request_count": 1,
            "created_at": "2026-01-01T00:00:00Z",
            "listing_photos": [],
        }

    def _payload_with_material_change(self) -> ListingDraftSave:
        return ListingDraftSave(
            title="PCR Thermocycler Model II",  # changed
            category="lab_equipment",
            condition="good",
            quantity=1,
            location="New York",
            availability_window="2026-05-01",
            description="A reliable thermocycler.",
            dimensions_weight="30cm x 20cm, 5kg",
            handling_requirements="None",
            working_status="fully_functional",
            documentation_included="",
            special_handling_flags="",
            delivery_mode="pickup_only",
            photo_urls=[],
        )

    def _open_request_row(self) -> dict:
        return {
            "id": "req_1",
            "listing_id": "listing_abc",
            "recipient_institution_id": "inst_rec",
            "submitted_by_user_id": "user_rec",
            "status": "submitted",
            "intended_use": "teaching",
            "program_or_department": "Biology",
            "audience": "undergraduate",
            "needed_by": "2026-12-31",
            "urgency_notes": "",
            "delivery_constraints": "",
            "storage_readiness": "ready",
            "funding_or_logistics_notes": "",
            "created_at": "2026-01-02T00:00:00Z",
            "updated_at": "2026-01-02T00:00:00Z",
            "listing": None,
            "recipient_institution": None,
        }

    def test_material_change_on_live_listing_with_requests_triggers_re_review(self) -> None:
        service = make_service()
        actor = self._make_actor()
        listing_row = self._live_listing_row()
        open_request = self._open_request_row()
        def fake_request(method, table, **kwargs):
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "GET" and table == "equipment_requests":
                return [open_request]
            if method == "GET" and table == "app_users":
                return []
            return None

        service._request = MagicMock(side_effect=fake_request)  # type: ignore[method-assign]

        service.save_donor_listing(actor, "listing_abc", self._payload_with_material_change())  # type: ignore[arg-type]

        listing_patches = [
            c for c in service._request.call_args_list
            if c[0][0] == "PATCH" and c[0][1] == "listings"
            and c[1].get("json", {}).get("status") is not None
        ]
        assert listing_patches, "Expected a PATCH on listings with a status field"
        patched_status = listing_patches[0][1]["json"]["status"]
        assert patched_status == "pending_admin_approval", (
            f"Expected pending_admin_approval, got {patched_status}"
        )

    def test_material_change_on_live_listing_without_requests_does_not_trigger_re_review(self) -> None:
        service = make_service()
        actor = self._make_actor()
        listing_row = self._live_listing_row()

        def fake_request(method, table, **kwargs):
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "GET" and table == "equipment_requests":
                return []  # no open requests
            if method == "GET" and table == "app_users":
                return []
            return None

        service._request = MagicMock(side_effect=fake_request)  # type: ignore[method-assign]

        service.save_donor_listing(actor, "listing_abc", self._payload_with_material_change())  # type: ignore[arg-type]

        listing_patches = [
            c for c in service._request.call_args_list
            if c[0][0] == "PATCH" and c[0][1] == "listings"
            and c[1].get("json", {}).get("status") is not None
        ]
        assert listing_patches, "Expected a PATCH on listings — save_donor_listing must always persist the payload"
        patched_status = listing_patches[0][1]["json"]["status"]
        assert patched_status != "pending_admin_approval", "Expected re-review NOT to be triggered"

    def test_non_material_change_on_live_listing_with_requests_does_not_trigger_re_review(self) -> None:
        service = make_service()
        actor = self._make_actor()
        listing_row = self._live_listing_row()
        open_request = self._open_request_row()

        payload = ListingDraftSave(
            title="PCR Thermocycler",
            category="lab_equipment",
            condition="good",
            quantity=1,
            location="Boston",  # changed but NOT material
            availability_window="2026-05-01",
            description="A reliable thermocycler.",
            dimensions_weight="30cm x 20cm, 5kg",
            handling_requirements="None",
            working_status="fully_functional",
            documentation_included="",
            special_handling_flags="",
            delivery_mode="pickup_only",
            photo_urls=[],
        )

        def fake_request(method, table, **kwargs):
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "GET" and table == "equipment_requests":
                return [open_request]
            if method == "GET" and table == "app_users":
                return []
            return None

        service._request = MagicMock(side_effect=fake_request)  # type: ignore[method-assign]

        service.save_donor_listing(actor, "listing_abc", payload)  # type: ignore[arg-type]

        listing_patches = [
            c for c in service._request.call_args_list
            if c[0][0] == "PATCH" and c[0][1] == "listings"
            and c[1].get("json", {}).get("status") is not None
        ]
        assert listing_patches, "Expected a PATCH on listings — save_donor_listing must always persist the payload"
        patched_status = listing_patches[0][1]["json"]["status"]
        assert patched_status != "pending_admin_approval", "Expected re-review NOT to be triggered"

    def test_material_change_on_matched_reserved_listing_does_not_trigger_re_review(self) -> None:
        service = make_service()
        actor = self._make_actor()
        listing_row = {**self._live_listing_row(), "status": "matched_reserved"}
        open_request = self._open_request_row()

        def fake_request(method, table, **kwargs):
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "GET" and table == "equipment_requests":
                return [open_request]
            if method == "GET" and table == "app_users":
                return []
            return None

        service._request = MagicMock(side_effect=fake_request)  # type: ignore[method-assign]

        service.save_donor_listing(actor, "listing_abc", self._payload_with_material_change())  # type: ignore[arg-type]

        listing_patches = [
            c for c in service._request.call_args_list
            if c[0][0] == "PATCH" and c[0][1] == "listings"
            and c[1].get("json", {}).get("status") is not None
        ]
        assert listing_patches, "Expected a PATCH on listings"
        patched_status = listing_patches[0][1]["json"]["status"]
        assert patched_status != "pending_admin_approval", (
            f"matched_reserved listing must not be returned to review, got {patched_status}"
        )
