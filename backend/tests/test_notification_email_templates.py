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
            "listing_pending_admin_approval",
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
                        "status": "completed",
                        "admin_note": "Please respond this week.",
                    },
                )

                self.assertTrue(rendered.subject)
                self.assertIn("https://lablink.example/recipient", rendered.html)
                self.assertIn("https://lablink.example/recipient", rendered.text)
                self.assertIn("This is the in-app notification text.", rendered.text)

    def test_donor_listing_status_templates_use_donor_specific_copy(self) -> None:
        cases = [
            ("listing_pending_admin_approval", "pending_admin_approval", "Your PCR Thermocycler is pending admin approval."),
            ("listing_approved", "live", "Your PCR Thermocycler is now live."),
            ("listing_rejected", "rejected", "Your PCR Thermocycler has been rejected."),
            ("listing_removed", "removed_by_admin", "Your PCR Thermocycler has been removed by admin."),
            ("listing_marked_donated", "fulfilled", "Your PCR Thermocycler has been marked as donated."),
        ]

        for template_key, status, expected_text in cases:
            with self.subTest(template_key=template_key):
                rendered = render_notification_email(
                    message="This is the in-app notification text.",
                    cta_href="/donor",
                    frontend_origin="https://lablink.example",
                    metadata={
                        "email_template_key": template_key,
                        "audience": "donor_lab",
                        "entity_title": "PCR Thermocycler",
                        "status": status,
                    },
                )

                self.assertIn(expected_text, rendered.text)

    def test_institution_status_templates_use_requested_copy(self) -> None:
        cases = [
            ("institution_pending_verification", "Your institution is pending verification."),
            ("institution_verified", "Your institution has been verified."),
            ("institution_rejected", "Your institution has been rejected."),
            ("institution_suspended", "Your institution has been suspended."),
        ]

        for template_key, expected_text in cases:
            with self.subTest(template_key=template_key):
                rendered = render_notification_email(
                    message="This is the in-app notification text.",
                    cta_href="/recipient",
                    frontend_origin="https://lablink.example",
                    metadata={
                        "email_template_key": template_key,
                        "audience": "recipient_institution",
                        "institution_name": "North Lab",
                    },
                )

                self.assertIn(expected_text, rendered.text)

    def test_request_selected_and_match_cancelled_templates_match_current_in_app_copy(self) -> None:
        selected_rendered = render_notification_email(
            message="This is the in-app notification text.",
            cta_href="/recipient",
            frontend_origin="https://lablink.example",
            metadata={
                "email_template_key": "request_selected",
                "audience": "recipient_institution",
                "entity_title": "PCR Thermocycler",
                "status": "approved",
            },
        )
        self.assertIn("Your request for PCR Thermocycler is now approved.", selected_rendered.text)

        reopened_rendered = render_notification_email(
            message="This is the in-app notification text.",
            cta_href="/recipient",
            frontend_origin="https://lablink.example",
            metadata={
                "email_template_key": "match_cancelled",
                "audience": "recipient_institution",
                "entity_title": "PCR Thermocycler",
            },
        )
        self.assertIn("Your request for PCR Thermocycler is now pending.", reopened_rendered.text)

    def test_listing_removed_templates_match_audience_specific_in_app_copy(self) -> None:
        admin_rendered = render_notification_email(
            message="This is the in-app notification text.",
            cta_href="/admin",
            frontend_origin="https://lablink.example",
            metadata={
                "email_template_key": "listing_removed",
                "audience": "admin",
                "entity_title": "PCR Thermocycler",
                "actor_institution_name": "North Lab",
                "status": "removed_by_donor",
            },
        )
        self.assertIn("North Lab removed PCR Thermocycler from the marketplace.", admin_rendered.text)

        removed_by_admin_rendered = render_notification_email(
            message="This is the in-app notification text.",
            cta_href="/recipient",
            frontend_origin="https://lablink.example",
            metadata={
                "email_template_key": "listing_removed",
                "audience": "recipient_institution",
                "entity_title": "PCR Thermocycler",
                "status": "removed_by_admin",
            },
        )
        self.assertIn(
            "A listing you requested, PCR Thermocycler, was removed from the marketplace by LabLink admin.",
            removed_by_admin_rendered.text,
        )

        removed_by_donor_rendered = render_notification_email(
            message="This is the in-app notification text.",
            cta_href="/recipient",
            frontend_origin="https://lablink.example",
            metadata={
                "email_template_key": "listing_removed",
                "audience": "recipient_institution",
                "entity_title": "PCR Thermocycler",
                "status": "removed_by_donor",
            },
        )
        self.assertIn(
            "A listing you requested, PCR Thermocycler, was removed from the marketplace by the donor.",
            removed_by_donor_rendered.text,
        )

        fulfilled_rendered = render_notification_email(
            message="This is the in-app notification text.",
            cta_href="/recipient",
            frontend_origin="https://lablink.example",
            metadata={
                "email_template_key": "listing_removed",
                "audience": "recipient_institution",
                "entity_title": "PCR Thermocycler",
                "status": "fulfilled",
            },
        )
        self.assertIn(
            "PCR Thermocycler was marked as donated and is no longer available for your request.",
            fulfilled_rendered.text,
        )

    def test_request_templates_match_current_in_app_copy(self) -> None:
        admin_rendered = render_notification_email(
            message="This is the in-app notification text.",
            cta_href="/admin",
            frontend_origin="https://lablink.example",
            metadata={
                "email_template_key": "request_submitted",
                "audience": "admin",
                "entity_title": "PCR Thermocycler",
                "actor_institution_name": "Recipient Hospital",
            },
        )
        self.assertIn("Recipient Hospital submitted a request for PCR Thermocycler.", admin_rendered.text)

        donor_rendered = render_notification_email(
            message="This is the in-app notification text.",
            cta_href="/donor",
            frontend_origin="https://lablink.example",
            metadata={
                "email_template_key": "request_submitted",
                "audience": "donor_lab",
                "entity_title": "PCR Thermocycler",
                "actor_institution_name": "Recipient Hospital",
            },
        )
        self.assertIn("A recipient institution requested your listing PCR Thermocycler.", donor_rendered.text)

        not_selected_rendered = render_notification_email(
            message="This is the in-app notification text.",
            cta_href="/recipient",
            frontend_origin="https://lablink.example",
            metadata={
                "email_template_key": "request_not_selected",
                "audience": "recipient_institution",
                "entity_title": "PCR Thermocycler",
            },
        )
        self.assertIn("Your request for PCR Thermocycler was not selected.", not_selected_rendered.text)


if __name__ == "__main__":
    unittest.main()
