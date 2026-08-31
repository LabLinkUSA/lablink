import unittest
from datetime import date, datetime, timezone
from unittest.mock import MagicMock

from app.schemas.domain import (
    AccountStatus,
    AuthenticatedUser,
    BoardPostStatus,
    Institution,
    RequestBoardPostCreate,
    Role,
    User,
    VerificationStatus,
)
from app.services.supabase_listings import SupabaseListingService


def make_service() -> SupabaseListingService:
    svc = SupabaseListingService.__new__(SupabaseListingService)
    svc._supabase_url = "http://test"
    svc._supabase_key = "test-key"
    svc._request = MagicMock()
    return svc


def make_recipient() -> AuthenticatedUser:
    return AuthenticatedUser(
        user=User(
            id="user_r1",
            full_name="Recipient User",
            email="recipient@test.com",
            role=Role.RECIPIENT_INSTITUTION,
            account_status=AccountStatus.VERIFIED,
            institution_id="inst_r1",
        ),
        institution=Institution(
            id="inst_r1",
            name="Test Institution",
            type=Role.RECIPIENT_INSTITUTION,
            verification_status=VerificationStatus.VERIFIED,
            location="Boston, MA",
            description="A test institution",
        ),
    )


def make_donor() -> AuthenticatedUser:
    return AuthenticatedUser(
        user=User(
            id="user_d1",
            full_name="Donor User",
            email="donor@test.com",
            role=Role.DONOR_LAB,
            account_status=AccountStatus.VERIFIED,
            institution_id="inst_d1",
        ),
        institution=Institution(
            id="inst_d1",
            name="Donor Lab",
            type=Role.DONOR_LAB,
            verification_status=VerificationStatus.VERIFIED,
            location="New Haven, CT",
            description="A donor lab",
        ),
    )


class TestCreateBoardPost(unittest.TestCase):
    def test_creates_board_post_and_returns_it(self):
        svc = make_service()
        actor = make_recipient()
        payload = RequestBoardPostCreate(
            title="Need a centrifuge",
            category="Centrifuge",
            description="We need a benchtop centrifuge for teaching.",
            needed_by=date(2026, 12, 1),
            quantity_needed=1,
            location="Boston, MA",
            intended_use="Teaching laboratory exercises",
        )

        created_row = {
            "id": "bp_001",
            "title": "Need a centrifuge",
            "category": "Centrifuge",
            "institution_id": "inst_r1",
            "created_by_user_id": "user_r1",
            "description": "We need a benchtop centrifuge for teaching.",
            "quantity_needed": 1,
            "location": "Boston, MA",
            "intended_use": "Teaching laboratory exercises",
            "needed_by": "2026-12-01",
            "status": "open",
            "created_at": "2026-08-31T00:00:00+00:00",
        }
        svc._request.return_value = [created_row]

        result = svc.create_board_post(actor, payload)

        self.assertEqual(result.id, "bp_001")
        self.assertEqual(result.title, "Need a centrifuge")
        self.assertEqual(result.status, BoardPostStatus.OPEN)

        call_args = svc._request.call_args
        self.assertEqual(call_args[0][0], "POST")
        self.assertEqual(call_args[0][1], "request_board_posts")

    def test_rejects_non_recipient(self):
        svc = make_service()
        actor = make_donor()
        payload = RequestBoardPostCreate(
            title="Test",
            category="Centrifuge",
            description="Test",
            needed_by=date(2026, 12, 1),
            quantity_needed=1,
            location="Boston, MA",
            intended_use="Test",
        )
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            svc.create_board_post(actor, payload)
        self.assertEqual(ctx.exception.status_code, 403)


class TestGetBoardPosts(unittest.TestCase):
    def test_get_for_recipient_filters_by_institution(self):
        svc = make_service()
        actor = make_recipient()
        svc._request.return_value = [
            {
                "id": "bp_001",
                "title": "Need centrifuge",
                "category": "Centrifuge",
                "institution_id": "inst_r1",
                "created_by_user_id": "user_r1",
                "description": "Test",
                "quantity_needed": 1,
                "location": "Boston",
                "intended_use": "Teaching",
                "needed_by": "2026-12-01",
                "status": "open",
                "created_at": "2026-08-31T00:00:00+00:00",
            }
        ]

        result = svc.get_board_posts_for_recipient(actor)

        self.assertEqual(len(result), 1)
        call_args = svc._request.call_args
        self.assertIn("inst_r1", str(call_args))

    def test_get_for_donor_returns_open_posts(self):
        svc = make_service()
        actor = make_donor()
        svc._request.return_value = []

        result = svc.get_board_posts_for_donor(actor)

        self.assertEqual(len(result), 0)
        call_args = svc._request.call_args
        self.assertIn("open", str(call_args))


class TestCloseBoardPost(unittest.TestCase):
    def test_close_own_post(self):
        svc = make_service()
        actor = make_recipient()

        existing_row = {
            "id": "bp_001",
            "title": "Need centrifuge",
            "category": "Centrifuge",
            "institution_id": "inst_r1",
            "created_by_user_id": "user_r1",
            "description": "Test",
            "quantity_needed": 1,
            "location": "Boston",
            "intended_use": "Teaching",
            "needed_by": "2026-12-01",
            "status": "open",
            "created_at": "2026-08-31T00:00:00+00:00",
        }
        updated_row = {**existing_row, "status": "closed"}
        svc._request.side_effect = [
            [existing_row],   # GET to fetch existing
            None,             # PATCH to update status
            [updated_row],    # GET to reload
        ]

        result = svc.close_board_post(actor, "bp_001")
        self.assertEqual(result.status, BoardPostStatus.CLOSED)

    def test_close_other_institution_post_rejected(self):
        svc = make_service()
        actor = make_recipient()

        existing_row = {
            "id": "bp_002",
            "institution_id": "inst_other",
            "status": "open",
        }
        svc._request.return_value = [existing_row]

        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as ctx:
            svc.close_board_post(actor, "bp_002")
        self.assertEqual(ctx.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
