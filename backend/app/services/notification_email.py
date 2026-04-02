from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from html import escape
from typing import Any


RETRY_DELAYS_MINUTES = [5, 15, 60, 360, 1440]


@dataclass(frozen=True)
class RenderedNotificationEmail:
    subject: str
    html: str
    text: str


def render_notification_email(
    *,
    message: str,
    cta_href: str,
    metadata: dict[str, Any],
    frontend_origin: str,
) -> RenderedNotificationEmail:
    template_key = str(metadata.get("email_template_key") or "generic_notification")
    audience = str(metadata.get("audience") or "member")
    subject, heading, intro, details, cta_label = _template_copy(
        template_key=template_key,
        audience=audience,
        metadata=metadata,
        message=message,
    )

    absolute_cta_href = _absolute_cta_href(frontend_origin=frontend_origin, cta_href=cta_href)
    admin_note = _clean_text(metadata.get("admin_note"))
    entity_title = _clean_text(metadata.get("entity_title"))

    detail_items = [detail for detail in details if detail]
    html_parts = [
        "<div style=\"font-family: Arial, sans-serif; color: #14213d; line-height: 1.6; max-width: 640px;\">",
        "<p style=\"margin: 0 0 12px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6c7a89;\">LabLink</p>",
        f"<h1 style=\"margin: 0 0 16px; font-size: 28px; line-height: 1.2;\">{escape(heading)}</h1>",
        f"<p style=\"margin: 0 0 16px; font-size: 16px;\">{escape(intro)}</p>",
    ]
    if entity_title:
        html_parts.append(
            f"<p style=\"margin: 0 0 16px;\"><strong>Related item:</strong> {escape(entity_title)}</p>"
        )
    if detail_items:
        html_parts.append("<ul style=\"margin: 0 0 20px; padding-left: 20px;\">")
        for detail in detail_items:
            html_parts.append(f"<li>{escape(detail)}</li>")
        html_parts.append("</ul>")
    html_parts.append(
        f"<p style=\"margin: 0 0 20px;\"><a href=\"{escape(absolute_cta_href)}\" "
        "style=\"display: inline-block; background: #0f766e; color: #ffffff; padding: 12px 18px; "
        "border-radius: 8px; text-decoration: none; font-weight: 600;\">"
        f"{escape(cta_label)}</a></p>"
    )
    html_parts.append(f"<p style=\"margin: 0 0 12px;\">{escape(message)}</p>")
    if admin_note and f"Admin note: {admin_note}" not in message:
        html_parts.append(
            f"<p style=\"margin: 0 0 12px;\"><strong>Admin note:</strong> {escape(admin_note)}</p>"
        )
    html_parts.append(
        f"<p style=\"margin: 0; color: #6c7a89; font-size: 14px;\">If the button does not work, open {escape(absolute_cta_href)}.</p>"
    )
    html_parts.append("</div>")

    text_lines = [
        f"LabLink",
        "",
        heading,
        "",
        intro,
    ]
    if entity_title:
        text_lines.extend(["", f"Related item: {entity_title}"])
    if detail_items:
        text_lines.append("")
        text_lines.extend([f"- {detail}" for detail in detail_items])
    text_lines.extend(["", f"{cta_label}: {absolute_cta_href}", "", message])
    if admin_note and f"Admin note: {admin_note}" not in message:
        text_lines.extend(["", f"Admin note: {admin_note}"])

    return RenderedNotificationEmail(
        subject=subject,
        html="".join(html_parts),
        text="\n".join(text_lines),
    )


def next_retry_at(*, attempt_count: int, now: datetime) -> datetime:
    delay_index = min(max(attempt_count - 1, 0), len(RETRY_DELAYS_MINUTES) - 1)
    return now + timedelta(minutes=RETRY_DELAYS_MINUTES[delay_index])


def _template_copy(
    *,
    template_key: str,
    audience: str,
    metadata: dict[str, Any],
    message: str,
) -> tuple[str, str, str, list[str], str]:
    entity_title = _clean_text(metadata.get("entity_title")) or "your LabLink item"
    institution_name = _clean_text(metadata.get("institution_name")) or "your institution"
    actor_institution_name = _clean_text(metadata.get("actor_institution_name")) or "another LabLink institution"
    status = _pretty_status(metadata.get("status"))
    audience_label = _audience_label(audience)

    if template_key == "institution_verified":
        return (
            "LabLink: your institution has been verified",
            "Your institution has been verified",
            "Your institution has been verified.",
            [f"Institution: {institution_name}"],
            "Open your dashboard",
        )
    if template_key == "institution_rejected":
        return (
            "LabLink: your institution has been rejected",
            "Your institution has been rejected",
            "Your institution has been rejected.",
            [f"Institution: {institution_name}"],
            "Review your dashboard",
        )
    if template_key == "institution_suspended":
        return (
            "LabLink: your institution has been suspended",
            "Your institution has been suspended",
            "Your institution has been suspended.",
            [f"Institution: {institution_name}"],
            "Open your dashboard",
        )
    if template_key == "institution_pending_verification":
        return (
            "LabLink: your institution is pending verification",
            "Your institution is pending verification",
            "Your institution is pending verification.",
            [f"Institution: {institution_name}"],
            "Open your dashboard",
        )
    if template_key == "listing_submitted_for_review":
        is_resubmission = bool(metadata.get("resubmitted"))
        return (
            "LabLink: new listing submitted for review",
            "A listing is ready for admin review",
            (
                f"{actor_institution_name} resubmitted a listing for review: {entity_title}."
                if is_resubmission
                else f"{actor_institution_name} submitted a new listing: {entity_title}."
            ),
            [f"Listing: {entity_title}"],
            "Open admin dashboard",
        )
    if template_key == "listing_pending_admin_approval":
        return (
            "LabLink: your listing is pending admin approval",
            "Your listing is pending admin approval",
            f"Your {entity_title} is pending admin approval.",
            [f"Listing: {entity_title}", f"Status: {status or 'pending_admin_approval'}"],
            "Open donor dashboard",
        )
    if template_key == "listing_approved":
        return (
            "LabLink: your listing is approved",
            "Your listing is live",
            f"Your {entity_title} is now live.",
            [f"Listing: {entity_title}", f"Status: {status or 'live'}"],
            "Open donor dashboard",
        )
    if template_key == "listing_rejected":
        return (
            "LabLink: your listing needs changes",
            "Your listing has been rejected",
            f"Your {entity_title} has been rejected.",
            [f"Listing: {entity_title}", f"Status: {status or 'rejected'}"],
            "Review your listing",
        )
    if template_key == "listing_under_review":
        return (
            "LabLink: listing availability changed",
            "Listing availability update",
            f"{entity_title} is temporarily unavailable while LabLink reviews it.",
            [f"Listing: {entity_title}", f"Status: {status or 'under review'}"],
            "Open LabLink",
        )
    if template_key == "listing_removed":
        if audience == "admin":
            return (
                "LabLink: listing removed from the marketplace",
                "Listing removed from the marketplace",
                f"{actor_institution_name} removed {entity_title} from the marketplace.",
                [f"Listing: {entity_title}", f"Status: {status or 'removed_by_donor'}"],
                "Open admin dashboard",
            )
        if audience == "donor_lab":
            return (
                "LabLink: your listing was removed by admin",
                "Your listing has been removed by admin",
                f"Your {entity_title} has been removed by admin.",
                [f"Listing: {entity_title}", f"Status: {status or 'removed_by_admin'}"],
                "Open donor dashboard",
            )
        if status == "removed by admin":
            intro = f"A listing you requested, {entity_title}, was removed from the marketplace by LabLink admin."
        elif status == "removed by donor":
            intro = f"A listing you requested, {entity_title}, was removed from the marketplace by the donor."
        elif status == "fulfilled":
            intro = f"{entity_title} was marked as donated and is no longer available for your request."
        else:
            intro = f"{entity_title} is no longer available through LabLink."
        return (
            "LabLink: listing availability changed",
            "Listing removed from active circulation",
            intro,
            [f"Listing: {entity_title}", f"Status: {status or 'removed'}"],
            "Open LabLink",
        )
    if template_key == "listing_marked_donated":
        if audience == "donor_lab":
            return (
                "LabLink: your listing was marked as donated",
                "Your listing has been marked as donated",
                f"Your {entity_title} has been marked as donated.",
                [f"Listing: {entity_title}", f"Status: {status or 'fulfilled'}"],
                "Open donor dashboard",
            )
        return (
            "LabLink: listing marked as donated",
            "Listing fulfillment update",
            f"{entity_title} was marked as donated in LabLink.",
            [f"Listing: {entity_title}", f"Updated by: {actor_institution_name}"],
            "Open LabLink",
        )
    if template_key == "request_submitted":
        if audience == "admin":
            return (
                "LabLink: new equipment request submitted",
                "A new request needs review",
                f"{actor_institution_name} submitted a request for {entity_title}.",
                [f"Listing: {entity_title}"],
                "Open admin dashboard",
            )
        if audience == "donor_lab":
            return (
                "LabLink: a recipient requested your listing",
                "A recipient requested your listing",
                f"A recipient institution requested your listing {entity_title}.",
                [f"Listing: {entity_title}", f"Recipient institution: {actor_institution_name}"],
                "Open donor dashboard",
            )
    if template_key == "request_cancelled":
        return (
            "LabLink: a request was cancelled",
            "Request update",
            f"{actor_institution_name} cancelled its request for {entity_title}.",
            [f"Listing: {entity_title}", f"Status: {status or 'cancelled'}"],
            "Open LabLink",
        )
    if template_key == "request_selected":
        if audience == "donor_lab":
            return (
                "LabLink: a recipient was selected for your listing",
                "Recipient selected",
                f"A recipient for your {entity_title} has been selected.",
                [f"Listing: {entity_title}"],
                "Open donor dashboard",
            )
        return (
            "LabLink: your request was selected",
            "Your request was approved",
            f"Your request for {entity_title} is now approved.",
            [f"Listing: {entity_title}", f"Status: {status or 'approved'}"],
            "Open recipient dashboard",
        )
    if template_key == "request_not_selected":
        return (
            "LabLink: your request was not selected",
            "Recipient selection update",
            f"Your request for {entity_title} was not selected.",
            [f"Listing: {entity_title}"],
            "Open recipient dashboard",
        )
    if template_key == "match_cancelled":
        if audience == "donor_lab":
            return (
                "LabLink: recipient selection reopened",
                "Recipient selection was reopened",
                f"LabLink admin reopened recipient selection for your listing {entity_title}.",
                [f"Listing: {entity_title}"],
                "Open donor dashboard",
            )
        return (
            "LabLink: your request is back under review",
            "Recipient selection was reopened",
            f"Your request for {entity_title} is now pending.",
            [f"Listing: {entity_title}", "Status: pending"],
            "Open recipient dashboard",
        )
    if template_key == "request_completed":
        if audience == "donor_lab":
            return (
                "LabLink: donation marked complete",
                "Donation completed",
                f"The donation workflow for {entity_title} was marked complete.",
                [f"Listing: {entity_title}", f"Status: {status or 'completed'}"],
                "Open donor dashboard",
            )
        if audience == "admin":
            return (
                "LabLink: donation marked complete",
                "Donation completed",
                f"{actor_institution_name} marked the {entity_title} as donated.",
                [f"Listing: {entity_title}", f"Updated by: {actor_institution_name}"],
                "Open admin dashboard",
            )
        return (
            "LabLink: your donation request is complete",
            "Donation completed",
            f"The donation workflow for {entity_title} was marked complete.",
            [f"Listing: {entity_title}", f"Status: {status or 'completed'}"],
            "Open recipient dashboard",
        )
    if template_key == "catalog_listing_published":
        return (
            "LabLink: new equipment is available",
            "New listing available in the catalog",
            f"{entity_title} is now available for recipient institutions on LabLink.",
            [f"Listing: {entity_title}"],
            "Browse the listing",
        )

    return (
        "LabLink notification",
        "You have a new LabLink notification",
        message,
        [f"Listing: {entity_title}" if entity_title else ""],
        "Open LabLink",
    )


def _absolute_cta_href(*, frontend_origin: str, cta_href: str) -> str:
    return f"{frontend_origin.rstrip('/')}{cta_href}"


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _pretty_status(value: Any) -> str:
    cleaned = _clean_text(value)
    if not cleaned:
        return ""
    return cleaned.replace("_", " ")


def _audience_label(audience: str) -> str:
    if audience == "donor_lab":
        return "donor"
    if audience == "recipient_institution":
        return "recipient"
    if audience == "admin":
        return "admin"
    return "member"
