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
