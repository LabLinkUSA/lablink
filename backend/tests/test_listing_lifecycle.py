import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, call

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
        assert "completed" not in params["status"]
        assert "rejected_cancelled" not in params["status"]


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

        def fake_request(method, table, **kwargs):
            if method == "GET" and table == "listings":
                return [listing_row]
            if method == "GET" and table == "equipment_requests":
                return []  # simplify: empty affected_requests for notification loop
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
