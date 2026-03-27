import unittest
from unittest.mock import MagicMock

from app.schemas.domain import NotificationType
from app.services.supabase_listings import SupabaseListingService


class NotificationEmailOutboxTests(unittest.TestCase):
    def make_service(self) -> SupabaseListingService:
        return SupabaseListingService(
            supabase_url="https://supabase.example",
            service_role_key="service-role",
            storage_bucket="listing-images",
            documents_bucket="listing-documents",
            frontend_origin="https://lablink.example",
            resend_api_key="re_test",
            email_from="notifications@example.com",
            email_reply_to="support@example.com",
            email_batch_size=50,
            email_max_attempts=5,
        )

    def due_notification_row(self, *, attempt_count: int = 0) -> dict:
        return {
            "id": "notif_123",
            "user_id": "user_1",
            "message": "Your request is updated.",
            "cta_href": "/recipient",
            "metadata": {
                "email_template_key": "request_completed",
                "entity_title": "PCR Thermocycler",
                "status": "completed",
            },
            "email_status": "pending" if attempt_count == 0 else "failed",
            "email_attempt_count": attempt_count,
            "user": {
                "id": "user_1",
                "email": "recipient@example.com",
                "full_name": "Casey Recipient",
                "role": "recipient_institution",
                "institution_id": "inst_1",
            },
        }

    def test_create_notifications_only_writes_rows(self) -> None:
        service = self.make_service()
        service._request = MagicMock(return_value=None)  # type: ignore[method-assign]

        service._create_notifications_for_users(
            [
                {
                    "id": "user_1",
                    "email": "a@example.com",
                    "full_name": "A",
                    "role": "recipient_institution",
                    "institution_id": "inst_1",
                }
            ],
            notification_type=NotificationType.REQUEST_STATUS_CHANGED,
            message="Request updated.",
            cta_href="/recipient",
            entity_type="request",
            entity_id="req_1",
            metadata={
                "email_template_key": "request_completed",
                "entity_title": "PCR Thermocycler",
                "request_id": "req_1",
                "status": "completed",
            },
        )

        self.assertEqual(service._request.call_count, 1)
        first_call = service._request.call_args_list[0]
        self.assertEqual(first_call.args[0], "POST")
        self.assertEqual(first_call.args[1], "notifications")
        self.assertEqual(first_call.kwargs["json"]["metadata"]["email_template_key"], "request_completed")

    def test_process_notification_emails_marks_sent(self) -> None:
        service = self.make_service()
        service._request = MagicMock(  # type: ignore[method-assign]
            side_effect=[
                [self.due_notification_row()],
                [{"id": "notif_123"}],
                None,
            ]
        )
        service._send_resend_email = MagicMock(return_value="re_msg_1")  # type: ignore[method-assign]

        response = service.process_notification_emails()

        self.assertEqual(response.processed_count, 1)
        self.assertEqual(response.sent_count, 1)
        self.assertEqual(response.failed_count, 0)
        final_update = service._request.call_args_list[-1].kwargs["json"]
        self.assertEqual(final_update["email_status"], "sent")
        self.assertEqual(final_update["email_attempt_count"], 1)
        self.assertEqual(final_update["email_provider_message_id"], "re_msg_1")

    def test_process_notification_emails_marks_failed_and_schedules_retry(self) -> None:
        service = self.make_service()
        service._request = MagicMock(  # type: ignore[method-assign]
            side_effect=[
                [self.due_notification_row(attempt_count=1)],
                [{"id": "notif_123"}],
                None,
            ]
        )
        service._send_resend_email = MagicMock(side_effect=RuntimeError("resend timeout"))  # type: ignore[method-assign]

        response = service.process_notification_emails()

        self.assertEqual(response.processed_count, 1)
        self.assertEqual(response.sent_count, 0)
        self.assertEqual(response.failed_count, 1)
        final_update = service._request.call_args_list[-1].kwargs["json"]
        self.assertEqual(final_update["email_status"], "failed")
        self.assertEqual(final_update["email_attempt_count"], 2)
        self.assertEqual(final_update["email_provider_message_id"], None)
        self.assertEqual(final_update["email_error"], "resend timeout")

    def test_process_notification_emails_skips_when_claim_fails(self) -> None:
        service = self.make_service()
        service._request = MagicMock(  # type: ignore[method-assign]
            side_effect=[
                [self.due_notification_row()],
                [],
            ]
        )
        service._send_resend_email = MagicMock()  # type: ignore[method-assign]

        response = service.process_notification_emails()

        self.assertEqual(response.processed_count, 0)
        self.assertEqual(response.sent_count, 0)
        self.assertEqual(response.failed_count, 0)
        service._send_resend_email.assert_not_called()

    def test_process_notification_emails_caps_retry_attempts(self) -> None:
        service = self.make_service()
        service._request = MagicMock(  # type: ignore[method-assign]
            side_effect=[
                [self.due_notification_row(attempt_count=4)],
                [{"id": "notif_123"}],
                None,
            ]
        )
        service._send_resend_email = MagicMock(side_effect=RuntimeError("provider down"))  # type: ignore[method-assign]

        response = service.process_notification_emails()

        self.assertEqual(response.failed_count, 1)
        final_update = service._request.call_args_list[-1].kwargs["json"]
        self.assertEqual(final_update["email_attempt_count"], 5)
        due_query = service._request.call_args_list[0].kwargs["params"]
        self.assertEqual(due_query["email_attempt_count"], "lt.5")


if __name__ == "__main__":
    unittest.main()
