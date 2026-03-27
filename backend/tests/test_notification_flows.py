import unittest
from datetime import date, datetime, timezone
from unittest.mock import MagicMock

from app.schemas.domain import (
    AccountStatus,
    AuthenticatedUser,
    EquipmentRequest,
    RequestStatus,
    Role,
    User,
    VerificationStatus,
    Institution,
    ListingStatus,
)
from app.services.supabase_listings import SupabaseListingService


def make_actor(*, role: Role, institution_id: str, institution_name: str) -> AuthenticatedUser:
    return AuthenticatedUser(
        user=User(
            id=f"user_{institution_id}",
            full_name="LabLink User",
            email=f"{institution_id}@example.com",
            role=role,
            account_status=AccountStatus.VERIFIED,
            institution_id=institution_id,
        ),
        institution=Institution(
            id=institution_id,
            name=institution_name,
            type=role,
            verification_status=VerificationStatus.VERIFIED,
            location="Boston, MA",
            description="Verified institution",
        ),
    )


def make_listing_row(
    *,
    listing_id: str,
    title: str,
    donor_institution_id: str,
    status: str,
) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": listing_id,
        "title": title,
        "category": "PCR",
        "item_condition": "good",
        "quantity": 1,
        "location": "Boston, MA",
        "availability_window": "Immediate",
        "description": "Ready to donate",
        "dimensions_weight": "10 lbs",
        "handling_requirements": "Standard",
        "working_status": "Working",
        "documentation_included": "Manual",
        "special_handling_flags": "None",
        "delivery_mode": "pickup_only",
        "status": status,
        "listing_photos": [],
        "donor_institution_id": donor_institution_id,
        "created_by_user_id": "user_donor",
        "created_at": now,
        "request_count": 0,
    }


def make_request_row(
    *,
    request_id: str,
    listing_row: dict,
    recipient_institution_id: str,
    status: str,
) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": request_id,
        "listing_id": listing_row["id"],
        "recipient_institution_id": recipient_institution_id,
        "submitted_by_user_id": f"user_{recipient_institution_id}",
        "intended_use": "Diagnostics",
        "program_or_department": "Molecular Lab",
        "audience": "Patients",
        "needed_by": date.today().isoformat(),
        "urgency_notes": "High",
        "delivery_constraints": "Dock pickup",
        "storage_readiness": "Ready",
        "funding_or_logistics_notes": "Confirmed",
        "status": status,
        "created_at": now,
        "listing": listing_row,
    }


def make_equipment_request(
    *,
    request_id: str,
    listing_id: str,
    recipient_institution_id: str,
    status: RequestStatus,
) -> EquipmentRequest:
    return EquipmentRequest(
        id=request_id,
        listing_id=listing_id,
        recipient_institution_id=recipient_institution_id,
        submitted_by_user_id=f"user_{recipient_institution_id}",
        intended_use="Diagnostics",
        program_or_department="Molecular Lab",
        audience="Patients",
        needed_by=date.today(),
        urgency_notes="High",
        delivery_constraints="Dock pickup",
        storage_readiness="Ready",
        funding_or_logistics_notes="Confirmed",
        status=status,
        submitted_at=datetime.now(timezone.utc),
    )


class NotificationFlowTests(unittest.TestCase):
    def make_service(self) -> SupabaseListingService:
        return SupabaseListingService(
            supabase_url="https://supabase.example",
            service_role_key="service-role",
            storage_bucket="listing-images",
            documents_bucket="listing-documents",
            frontend_origin="https://lablink.example",
        )

    def test_create_equipment_request_notifies_admin_and_donor(self) -> None:
        service = self.make_service()
        actor = make_actor(
            role=Role.RECIPIENT_INSTITUTION,
            institution_id="recipient_inst",
            institution_name="Recipient Hospital",
        )
        listing_row = make_listing_row(
            listing_id="listing_1",
            title="PCR Thermocycler",
            donor_institution_id="donor_inst",
            status=ListingStatus.LIVE.value,
        )

        service._get_listing_row = MagicMock(return_value=listing_row)  # type: ignore[method-assign]
        service._request = MagicMock(side_effect=[[], None, None])  # type: ignore[method-assign]
        service._notify_role = MagicMock()  # type: ignore[method-assign]
        service._notify_institution = MagicMock()  # type: ignore[method-assign]
        service._get_equipment_request_row = MagicMock(  # type: ignore[method-assign]
            return_value=make_request_row(
                request_id="request_1",
                listing_row=listing_row,
                recipient_institution_id="recipient_inst",
                status=RequestStatus.SUBMITTED.value,
            )
        )

        service.create_equipment_request(actor, "listing_1")

        service._notify_role.assert_called_once()
        service._notify_institution.assert_called_once()
        donor_metadata = service._notify_institution.call_args.kwargs["metadata"]
        self.assertEqual(donor_metadata["email_template_key"], "request_submitted")
        self.assertEqual(donor_metadata["entity_title"], "PCR Thermocycler")

    def test_update_request_status_notifies_donor_when_confirmation_needed(self) -> None:
        service = self.make_service()
        admin_actor = make_actor(role=Role.ADMIN, institution_id="admin_inst", institution_name="LabLink Admin")
        listing_row = make_listing_row(
            listing_id="listing_1",
            title="PCR Thermocycler",
            donor_institution_id="donor_inst",
            status=ListingStatus.MATCHED_RESERVED.value,
        )
        existing_request = make_request_row(
            request_id="request_1",
            listing_row=listing_row,
            recipient_institution_id="recipient_inst",
            status=RequestStatus.ADMIN_REVIEW.value,
        )
        updated_request = make_request_row(
            request_id="request_1",
            listing_row=listing_row,
            recipient_institution_id="recipient_inst",
            status=RequestStatus.AWAITING_DONOR_CONFIRMATION.value,
        )

        service._get_equipment_request_row = MagicMock(side_effect=[existing_request, updated_request])  # type: ignore[method-assign]
        service._request = MagicMock(return_value=None)  # type: ignore[method-assign]
        service._notify_institution = MagicMock()  # type: ignore[method-assign]

        service.update_request_status(admin_actor, "request_1", RequestStatus.AWAITING_DONOR_CONFIRMATION)

        self.assertEqual(service._notify_institution.call_count, 2)
        donor_notification = service._notify_institution.call_args_list[1].kwargs
        self.assertEqual(service._notify_institution.call_args_list[1].args[0], "donor_inst")
        self.assertEqual(
            donor_notification["metadata"]["email_template_key"],
            "request_awaiting_donor_confirmation",
        )

    def test_cancel_listing_match_notifies_donor_and_recipients(self) -> None:
        service = self.make_service()
        admin_actor = make_actor(role=Role.ADMIN, institution_id="admin_inst", institution_name="LabLink Admin")
        listing_row = make_listing_row(
            listing_id="listing_1",
            title="PCR Thermocycler",
            donor_institution_id="donor_inst",
            status=ListingStatus.MATCHED_RESERVED.value,
        )
        reopened_row = {**listing_row, "status": ListingStatus.LIVE.value}
        requests = [
            make_equipment_request(
                request_id="request_1",
                listing_id="listing_1",
                recipient_institution_id="recipient_inst",
                status=RequestStatus.SUBMITTED,
            ),
            make_equipment_request(
                request_id="request_2",
                listing_id="listing_1",
                recipient_institution_id="recipient_inst_2",
                status=RequestStatus.SUBMITTED,
            ),
        ]

        service._get_listing_row = MagicMock(side_effect=[listing_row, reopened_row])  # type: ignore[method-assign]
        service._request = MagicMock(return_value=None)  # type: ignore[method-assign]
        service._get_requests_for_listing_ids = MagicMock(return_value=requests)  # type: ignore[method-assign]
        service._notify_institution = MagicMock()  # type: ignore[method-assign]

        service.cancel_listing_match(admin_actor, "listing_1")

        self.assertEqual(service._notify_institution.call_count, 3)
        first_notification = service._notify_institution.call_args_list[0].kwargs
        self.assertEqual(first_notification["metadata"]["email_template_key"], "match_cancelled")

    def test_mark_donor_listing_donated_notifies_admin_and_recipients(self) -> None:
        service = self.make_service()
        donor_actor = make_actor(role=Role.DONOR_LAB, institution_id="donor_inst", institution_name="Donor Lab")
        listing_row = make_listing_row(
            listing_id="listing_1",
            title="PCR Thermocycler",
            donor_institution_id="donor_inst",
            status=ListingStatus.MATCHED_RESERVED.value,
        )
        fulfilled_row = {**listing_row, "status": ListingStatus.FULFILLED.value}
        requests = [
            make_equipment_request(
                request_id="request_1",
                listing_id="listing_1",
                recipient_institution_id="recipient_inst",
                status=RequestStatus.APPROVED_MATCHED,
            ),
            make_equipment_request(
                request_id="request_2",
                listing_id="listing_1",
                recipient_institution_id="recipient_inst_2",
                status=RequestStatus.SUBMITTED,
            ),
        ]

        service._get_listing_row = MagicMock(side_effect=[listing_row, fulfilled_row])  # type: ignore[method-assign]
        service._ensure_donor_controls_listing = MagicMock()  # type: ignore[method-assign]
        service._ensure_listing_mutable = MagicMock()  # type: ignore[method-assign]
        service._get_requests_for_listing_ids = MagicMock(return_value=requests)  # type: ignore[method-assign]
        service._request = MagicMock(return_value=None)  # type: ignore[method-assign]
        service._notify_role = MagicMock()  # type: ignore[method-assign]
        service._notify_institution = MagicMock()  # type: ignore[method-assign]

        service.mark_donor_listing_donated(donor_actor, "listing_1")

        service._notify_role.assert_called_once()
        self.assertEqual(service._notify_institution.call_count, 2)
        matched_notification = service._notify_institution.call_args_list[0].kwargs
        unmatched_notification = service._notify_institution.call_args_list[1].kwargs
        self.assertEqual(matched_notification["metadata"]["email_template_key"], "request_completed")
        self.assertEqual(unmatched_notification["metadata"]["email_template_key"], "listing_removed")


if __name__ == "__main__":
    unittest.main()
