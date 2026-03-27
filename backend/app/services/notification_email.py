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
            "Your institution is verified",
            f"{institution_name} can now use LabLink as a verified {audience_label}.",
            [f"Institution: {institution_name}"],
            "Open your dashboard",
        )
    if template_key == "institution_rejected":
        return (
            "LabLink: your institution review was not approved",
            "Institution review update",
            f"LabLink reviewed {institution_name} and it is not approved yet.",
            [f"Institution: {institution_name}"],
            "Review your dashboard",
        )
    if template_key == "institution_suspended":
        return (
            "LabLink: your institution access is suspended",
            "Institution access update",
            f"LabLink suspended {institution_name} from verified activity.",
            [f"Institution: {institution_name}"],
            "Open your dashboard",
        )
    if template_key == "institution_pending_verification":
        return (
            "LabLink: your institution review status changed",
            "Institution review update",
            f"{institution_name} is currently pending verification.",
            [f"Institution: {institution_name}"],
            "Open your dashboard",
        )
    if template_key == "listing_submitted_for_review":
        return (
            "LabLink: new listing submitted for review",
            "A listing is ready for admin review",
            f"{actor_institution_name} submitted {entity_title} for LabLink review.",
            [f"Listing: {entity_title}"],
            "Open admin dashboard",
        )
    if template_key == "listing_approved":
        return (
            "LabLink: your listing is approved",
            "Your listing is live",
            f"{entity_title} is approved and now visible on LabLink.",
            [f"Listing: {entity_title}", f"Status: {status or 'live'}"],
            "Open donor dashboard",
        )
    if template_key == "listing_rejected":
        return (
            "LabLink: your listing needs changes",
            "Your listing was not approved",
            f"{entity_title} was reviewed and is not approved in its current form.",
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
        return (
            "LabLink: listing availability changed",
            "Listing removed from active circulation",
            f"{entity_title} is no longer available through LabLink.",
            [f"Listing: {entity_title}", f"Status: {status or 'removed'}"],
            "Open LabLink",
        )
    if template_key == "listing_marked_donated":
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
                f"{actor_institution_name} submitted a request tied to {entity_title}.",
                [f"Listing: {entity_title}"],
                "Open admin dashboard",
            )
        if audience == "donor_lab":
            return (
                "LabLink: a recipient requested your listing",
                "A recipient requested your listing",
                f"A recipient institution requested {entity_title}.",
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
                f"LabLink selected a recipient for {entity_title}.",
                [f"Listing: {entity_title}"],
                "Open donor dashboard",
            )
        return (
            "LabLink: your request was selected",
            "Your request was approved",
            f"Your institution was selected to receive {entity_title}.",
            [f"Listing: {entity_title}", f"Status: {status or 'approved'}"],
            "Open recipient dashboard",
        )
    if template_key == "request_not_selected":
        return (
            "LabLink: your request was not selected",
            "Recipient selection update",
            f"Another institution was selected for {entity_title}.",
            [f"Listing: {entity_title}"],
            "Open recipient dashboard",
        )
    if template_key == "match_cancelled":
        if audience == "donor_lab":
            return (
                "LabLink: recipient selection reopened",
                "Recipient selection was reopened",
                f"LabLink reopened recipient selection for {entity_title}.",
                [f"Listing: {entity_title}"],
                "Open donor dashboard",
            )
        return (
            "LabLink: your request is back under review",
            "Recipient selection was reopened",
            f"LabLink reopened recipient selection for {entity_title}.",
            [f"Listing: {entity_title}", "Status: pending request"],
            "Open recipient dashboard",
        )
    if template_key == "request_awaiting_donor_confirmation":
        if audience == "donor_lab":
            return (
                "LabLink: donor confirmation needed",
                "Please confirm the donation handoff",
                f"A matched request for {entity_title} now needs donor confirmation.",
                [f"Listing: {entity_title}", f"Status: {status or 'awaiting donor confirmation'}"],
                "Open donor dashboard",
            )
        return (
            "LabLink: your request is awaiting donor confirmation",
            "Your request is awaiting donor confirmation",
            f"The matched donation for {entity_title} is waiting on donor confirmation.",
            [f"Listing: {entity_title}", f"Status: {status or 'awaiting donor confirmation'}"],
            "Open recipient dashboard",
        )
    if template_key == "request_pickup_transfer_coordination":
        if audience == "donor_lab":
            return (
                "LabLink: coordinate pickup or transfer",
                "Pickup and transfer coordination is ready",
                f"The matched donation for {entity_title} is ready for logistics coordination.",
                [f"Listing: {entity_title}", f"Status: {status or 'pickup transfer coordination'}"],
                "Open donor dashboard",
            )
        return (
            "LabLink: coordinate pickup or transfer",
            "Pickup and transfer coordination is ready",
            f"The matched donation for {entity_title} is ready for logistics coordination.",
            [f"Listing: {entity_title}", f"Status: {status or 'pickup transfer coordination'}"],
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
                f"{entity_title} was marked complete in LabLink.",
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
