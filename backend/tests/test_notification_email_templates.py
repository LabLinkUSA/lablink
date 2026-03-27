import unittest

from app.services.notification_email import render_notification_email


class NotificationEmailTemplateTests(unittest.TestCase):
    def test_all_supported_templates_render_subject_and_cta(self) -> None:
        template_keys = [
            "institution_verified",
            "institution_rejected",
            "institution_suspended",
            "institution_pending_verification",
            "listing_submitted_for_review",
            "listing_approved",
            "listing_rejected",
            "listing_under_review",
            "listing_removed",
            "listing_marked_donated",
            "request_submitted",
            "request_cancelled",
            "request_selected",
            "request_not_selected",
            "match_cancelled",
            "request_awaiting_donor_confirmation",
            "request_pickup_transfer_coordination",
            "request_completed",
            "catalog_listing_published",
        ]

        for template_key in template_keys:
            with self.subTest(template_key=template_key):
                rendered = render_notification_email(
                    message="This is the in-app notification text.",
                    cta_href="/recipient",
                    frontend_origin="https://lablink.example",
                    metadata={
                        "email_template_key": template_key,
                        "audience": "recipient_institution",
                        "entity_title": "PCR Thermocycler",
                        "institution_name": "North Lab",
                        "actor_institution_name": "East Clinic",
                        "status": "awaiting_donor_confirmation",
                        "admin_note": "Please respond this week.",
                    },
                )

                self.assertTrue(rendered.subject)
                self.assertIn("https://lablink.example/recipient", rendered.html)
                self.assertIn("https://lablink.example/recipient", rendered.text)
                self.assertIn("This is the in-app notification text.", rendered.text)


if __name__ == "__main__":
    unittest.main()
