from pathlib import Path


OUTPUT_PATH = Path("/Users/daniellee/Code/lablink/frontend/public/forms/lablink-decontamination-form.pdf")


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def draw_text(font: str, size: float, x: int, y: int, text: str) -> str:
    return f"BT /{font} {size} Tf 1 0 0 1 {x} {y} Tm ({escape_pdf_text(text)}) Tj ET"


def build_content_stream() -> bytes:
    lines = [
        "0.9 w",
        draw_text("F2", 20, 48, 748, "LabLink Decontamination Form"),
        draw_text("F2", 12.5, 48, 712, "Complete this form before transferring laboratory equipment through LabLink."),
        draw_text("F1", 9.8, 48, 686, "Donors must confirm that the equipment has been assessed, cleaned, and prepared according to:"),
        draw_text("F1", 9.8, 68, 668, "1. institutional EHS procedures"),
        draw_text("F1", 9.8, 68, 652, "2. equipment-specific SOPs"),
        draw_text("F1", 9.8, 68, 636, "3. biosafety and hazard-control requirements"),
        draw_text("F1", 9.8, 48, 614, "Reference guide:"),
        "0 0 1 rg",
        draw_text("F1", 9.8, 132, 614, "NIH DOHS Decontamination"),
        "132 612 m 258 612 l S",
        "0 0 0 rg",
        draw_text("F2", 10.2, 48, 584, "Before you certify:"),
        draw_text("F1", 9.0, 68, 568, "- Remove or identify residual biological, chemical, and radiological materials."),
        draw_text("F1", 9.0, 68, 553, "- Clean accessible surfaces, compartments, and detachable parts."),
        draw_text("F1", 9.0, 68, 538, "- Label remaining hazards, damaged components, or handling restrictions."),
        draw_text("F1", 9.0, 68, 523, "- Confirm whether manuals, maintenance logs, or service records are included."),
        draw_text("F2", 9.0, 76, 486, "I confirm that I reviewed the applicable EHS, SOP, and biosafety requirements before releasing this equipment."),
        draw_text("F2", 10.2, 48, 434, "Describe the decontamination steps completed."),
        draw_text("F2", 10.2, 48, 276, "Residual hazards, contamination concerns, or handling restrictions"),
        draw_text("F2", 9.0, 76, 124, "I disclosed any remaining hazards, restrictions, or special handling requirements in the LabLink listing."),
        draw_text("F2", 10.2, 48, 86, "Electronic signature (full name)"),
        draw_text("F2", 10.2, 324, 86, "Date signed"),
        "48 478 18 18 re S",
        "48 326 516 92 re S",
        "48 174 516 92 re S",
        "48 116 18 18 re S",
        "48 44 232 22 re S",
        "324 44 240 22 re S",
    ]
    return ("\n".join(lines) + "\n").encode("latin1")


def build_pdf() -> bytes:
    content = build_content_stream()
    objects: list[str] = [
        "<< /Type /Catalog /Pages 2 0 R /AcroForm 16 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R /Annots [15 0 R 7 0 R 8 0 R 9 0 R 10 0 R 11 0 R 12 0 R 13 0 R 14 0 R] >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
        f"<< /Length {len(content)} >>\nstream\n{content.decode('latin1')}endstream",
        "<< /FT /Tx /T (lablink_form_type) /Rect [-100 -100 -80 -80] /DA (/Helv 10 Tf 0 g) /V (decontamination) /F 6 /Ff 1 /Subtype /Widget /Type /Annot /P 3 0 R >>",
        "<< /FT /Tx /T (lablink_template_version) /Rect [-100 -130 -80 -110] /DA (/Helv 10 Tf 0 g) /V (2026-03-27) /F 6 /Ff 1 /Subtype /Widget /Type /Annot /P 3 0 R >>",
        "<< /FT /Btn /T (ehs_protocol_reviewed) /Rect [48 478 66 496] /Subtype /Widget /Type /Annot /F 4 /V /Off /AS /Off /MK << /CA (4) >> /AP << /N << /Yes << /Type /XObject /Subtype /Form /BBox [0 0 18 18] /Resources << >> /Length 35 >> stream\n0 0 0 rg 0 0 18 18 re S 4 9 m 7 4 l 14 14 l S\nendstream >> /Off << /Type /XObject /Subtype /Form /BBox [0 0 18 18] /Resources << >> /Length 18 >> stream\n0 0 18 18 re S\nendstream >> >> >> /P 3 0 R >>",
        "<< /FT /Tx /T (decontamination_method) /Rect [48 326 564 418] /DA (/Helv 10 Tf 0 g) /V () /F 4 /Ff 4096 /Subtype /Widget /Type /Annot /MK << /BC [0.75 0.78 0.79] /BG [1 1 1] >> /P 3 0 R >>",
        "<< /FT /Tx /T (residual_hazards) /Rect [48 174 564 266] /DA (/Helv 10 Tf 0 g) /V () /F 4 /Ff 4096 /Subtype /Widget /Type /Annot /MK << /BC [0.75 0.78 0.79] /BG [1 1 1] >> /P 3 0 R >>",
        "<< /FT /Btn /T (special_handling_disclosed) /Rect [48 116 66 134] /Subtype /Widget /Type /Annot /F 4 /V /Off /AS /Off /MK << /CA (4) >> /AP << /N << /Yes << /Type /XObject /Subtype /Form /BBox [0 0 18 18] /Resources << >> /Length 35 >> stream\n0 0 0 rg 0 0 18 18 re S 4 9 m 7 4 l 14 14 l S\nendstream >> /Off << /Type /XObject /Subtype /Form /BBox [0 0 18 18] /Resources << >> /Length 18 >> stream\n0 0 18 18 re S\nendstream >> >> >> /P 3 0 R >>",
        "<< /FT /Tx /T (signer_name) /Rect [48 44 280 66] /DA (/Helv 10 Tf 0 g) /V () /F 4 /Subtype /Widget /Type /Annot /MK << /BC [0.75 0.78 0.79] /BG [1 1 1] >> /P 3 0 R >>",
        "<< /FT /Tx /T (signed_on) /Rect [324 44 564 66] /DA (/Helv 10 Tf 0 g) /V () /F 4 /Subtype /Widget /Type /Annot /MK << /BC [0.75 0.78 0.79] /BG [1 1 1] >> /P 3 0 R >>",
        "<< /Type /Annot /Subtype /Link /Rect [132 608 258 620] /Border [0 0 0] /A << /S /URI /URI (https://ors.od.nih.gov/sr/dohs/safety/laboratory/BioSafety/Pages/decontamination.aspx#table1) >> /P 3 0 R >>",
        "<< /Fields [7 0 R 8 0 R 9 0 R 10 0 R 11 0 R 12 0 R 13 0 R 14 0 R] /DA (/Helv 10 Tf 0 g) /DR << /Font << /Helv 4 0 R >> >> >>",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("latin1"))
        pdf.extend(obj.encode("latin1"))
        pdf.extend(b"\nendobj\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin1"))
    pdf.extend(b"0000000000 65535 f\n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n\n".encode("latin1"))
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("latin1"))
    return bytes(pdf)


def main() -> None:
    OUTPUT_PATH.write_bytes(build_pdf())
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
