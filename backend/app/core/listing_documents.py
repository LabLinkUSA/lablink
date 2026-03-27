from __future__ import annotations

from datetime import date
from io import BytesIO
from typing import Any

from fastapi import HTTPException, status


LISTING_DOCUMENT_TEMPLATES: list[dict[str, Any]] = [
    {
        "form_type": "decontamination",
        "template_version": "2026-03-27",
        "blank_pdf_path": "/forms/decontamination-template-2026-03-27.pdf",
        "title": "Decontamination Form",
        "summary": "Open the fillable PDF, complete it in your PDF viewer, then upload the finished file back to LabLink.",
        "body_sections": [
            "Complete this PDF before transferring laboratory equipment through LabLink.",
            (
                "Donors must follow their institution's environmental health and safety procedures, equipment SOPs, "
                "and any applicable biosafety protocols. The CDC/NIH BMBL 6th Edition remains an advisory guide."
            ),
        ],
        "guide_links": [
            {
                "label": "CDC/NIH BMBL 6th Edition",
                "url": "https://www.cdc.gov/labs/bmbl/index.html",
            },
            {
                "label": "BMBL 6th Edition PDF",
                "url": "https://www.cdc.gov/labs/media/pdfs/2025/08/SF__19a_308133-A_BMBL6_00-BOOK-WEB-final-3.pdf",
            },
        ],
        "fields": [
            {
                "key": "ehs_protocol_reviewed",
                "label": "I reviewed the applicable EHS / biosafety procedures for this equipment.",
                "type": "checkbox",
                "required": True,
            },
            {
                "key": "decontamination_method",
                "label": "Describe the decontamination method used.",
                "type": "textarea",
                "required": True,
                "placeholder": "Summarize the cleaning or decontamination steps completed before transfer.",
            },
            {
                "key": "residual_hazards",
                "label": "Residual hazards or contamination concerns",
                "type": "textarea",
                "required": True,
                "placeholder": "Write None if there are no known residual hazards.",
            },
            {
                "key": "special_handling_disclosed",
                "label": "I disclosed any remaining special handling requirements in the LabLink listing.",
                "type": "checkbox",
                "required": True,
            },
            {
                "key": "signer_name",
                "label": "Electronic signature (full name)",
                "type": "text",
                "required": True,
            },
            {
                "key": "signed_on",
                "label": "Date signed",
                "type": "date",
                "required": True,
            },
        ],
    },
    {
        "form_type": "liability_release",
        "template_version": "2026-03-27",
        "blank_pdf_path": "/forms/liability-release-template-2026-03-27.pdf",
        "title": "Liability Release",
        "summary": "Open the fillable PDF, complete it in your PDF viewer, then upload the finished file back to LabLink.",
        "draft_notice": "Draft legal language pending counsel review",
        "body_sections": [
            "LabLink facilitates matching between verified donor and recipient institutions.",
            (
                "LabLink does not inspect, certify, transport, install, or guarantee donated equipment and is not "
                "responsible for condition, transport damage, installation, regulatory compliance, or downstream use."
            ),
            (
                "The donor remains responsible for accurate safety disclosures, lawful transfer, and compliance with "
                "institutional policies and applicable regulations."
            ),
        ],
        "guide_links": [],
        "fields": [
            {
                "key": "liability_acknowledged",
                "label": "I acknowledge that LabLink is a managed donation platform only.",
                "type": "checkbox",
                "required": True,
            },
            {
                "key": "transport_acknowledged",
                "label": "I acknowledge LabLink is not responsible for transport, installation, or equipment condition.",
                "type": "checkbox",
                "required": True,
            },
            {
                "key": "regulatory_acknowledged",
                "label": "I acknowledge my institution remains responsible for regulatory compliance and safety disclosure.",
                "type": "checkbox",
                "required": True,
            },
            {
                "key": "additional_notes",
                "label": "Additional notes",
                "type": "textarea",
                "required": False,
                "placeholder": "Optional notes for the LabLink admin review team.",
            },
            {
                "key": "signer_name",
                "label": "Electronic signature (full name)",
                "type": "text",
                "required": True,
            },
            {
                "key": "signed_on",
                "label": "Date signed",
                "type": "date",
                "required": True,
            },
        ],
    },
]


def get_listing_document_templates() -> list[dict[str, Any]]:
    return [dict(template) for template in LISTING_DOCUMENT_TEMPLATES]


def get_listing_document_template(form_type: str) -> dict[str, Any]:
    for template in LISTING_DOCUMENT_TEMPLATES:
        if template["form_type"] == form_type:
            return dict(template)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown listing document form: {form_type}.")


def default_listing_document_form_data(
    template: dict[str, Any],
    *,
    signer_name: str,
) -> dict[str, Any]:
    values: dict[str, Any] = {}
    for field in template["fields"]:
        if field["key"] == "signer_name":
            values[field["key"]] = signer_name
        elif field["key"] == "signed_on":
            values[field["key"]] = date.today().isoformat()
        elif field["type"] == "checkbox":
            values[field["key"]] = False
        else:
            values[field["key"]] = ""
    return values


def build_blank_pdf_url(template: dict[str, Any], *, frontend_origin: str) -> str:
    return f"{frontend_origin.rstrip('/')}{template['blank_pdf_path']}"


def parse_uploaded_listing_document(
    template: dict[str, Any],
    *,
    template_version: str,
    content: bytes,
) -> dict[str, Any]:
    if template_version != template["template_version"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{template['title']} uses an outdated template version.",
        )
    if not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file must be a PDF.",
        )

    try:
        from pypdf import PdfReader
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF form parsing dependency is unavailable. Install backend dependencies to enable compliance PDFs.",
        ) from exc

    try:
        reader = PdfReader(BytesIO(content))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded PDF could not be read.",
        ) from exc

    raw_fields = reader.get_fields() or {}
    if not raw_fields:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded PDF is not a fillable PDF form.",
        )

    extracted = {name: _normalize_pdf_field_value(field) for name, field in raw_fields.items()}
    expected_keys = {field["key"] for field in template["fields"]}
    actual_keys = {key for key in extracted if not key.startswith("lablink_")}
    missing_keys = sorted(expected_keys - actual_keys)
    if missing_keys:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Uploaded PDF is missing required form fields: {', '.join(missing_keys)}.",
        )

    uploaded_form_type = str(extracted.get("lablink_form_type", "")).strip()
    if uploaded_form_type != template["form_type"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded PDF does not match the expected compliance form type.",
        )

    uploaded_template_version = str(extracted.get("lablink_template_version", "")).strip()
    if uploaded_template_version != template["template_version"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{template['title']} uses an outdated template version.",
        )

    sanitized: dict[str, Any] = {}
    for field in template["fields"]:
        raw_value = extracted.get(field["key"])
        if field["type"] == "checkbox":
            value = bool(raw_value)
            if field.get("required") and not value:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{field['label']} must be completed in the uploaded PDF.",
                )
            sanitized[field["key"]] = value
            continue

        value = str(raw_value or "").strip()
        if field.get("required") and not value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field['label']} is required in the uploaded PDF.",
            )
        if field["type"] == "date" and value:
            try:
                date.fromisoformat(value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{field['label']} must use the YYYY-MM-DD format.",
                ) from exc
        sanitized[field["key"]] = value

    return sanitized


def _normalize_pdf_field_value(field: Any) -> Any:
    try:
        value = field.get("/V")  # pypdf generic field object
    except AttributeError:
        value = getattr(field, "value", field)

    if value is None:
        return ""

    normalized = str(value).strip()
    if normalized in {"/Yes", "Yes", "true", "True"}:
        return True
    if normalized in {"/Off", "Off", "false", "False"}:
        return False
    return normalized
