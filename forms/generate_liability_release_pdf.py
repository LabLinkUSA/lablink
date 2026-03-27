from pathlib import Path


OUTPUT_PATH = Path("/Users/daniellee/Code/lablink/frontend/public/forms/lablink-liability-release.pdf")


def escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def draw_text(font: str, size: float, x: int, y: int, text: str) -> str:
    return f"BT /{font} {size} Tf 1 0 0 1 {x} {y} Tm ({escape_pdf_text(text)}) Tj ET"


def build_content_stream() -> bytes:
    lines = [
        "0.1 w",
        draw_text("F2", 24, 48, 742, "LabLink Liability Release"),
        draw_text("F1", 11, 48, 700, "1. LabLink facilitates matching between verified donor and recipient institutions."),
        draw_text("F1", 11, 48, 676, "2. LabLink does not inspect, certify, transport, install, or guarantee donated equipment and is not"),
        draw_text("F1", 11, 48, 658, "responsible for condition, transport damage, installation, compliance, or downstream use."),
        draw_text("F1", 11, 48, 634, "3. The donor remains responsible for accurate safety disclosures, lawful transfer, and institutional compliance."),
        draw_text("F2", 11, 48, 578, "I acknowledge that LabLink is a managed donation platform only."),
        draw_text("F2", 11, 48, 518, "I acknowledge LabLink is not responsible for transport, installation, or equipment condition."),
        draw_text("F2", 11, 48, 458, "I acknowledge my institution remains responsible for regulatory compliance and safety disclosure."),
        draw_text("F2", 11, 48, 398, "Additional notes"),
        draw_text("F2", 11, 48, 214, "Electronic signature \\(full name\\)"),
        draw_text("F2", 11, 324, 214, "Date signed"),
        "48 552 m 66 552 l S",
        "48 492 m 66 492 l S",
        "48 432 m 66 432 l S",
        "48 248 m 564 248 l S",
        "48 178 m 280 178 l S",
        "324 178 m 564 178 l S",
    ]
    return ("\n".join(lines) + "\n").encode("latin1")


def build_pdf() -> bytes:
    content = build_content_stream()
    objects: list[str] = [
        "<< /Type /Catalog /Pages 2 0 R /AcroForm 15 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R /Annots [7 0 R 8 0 R 9 0 R 10 0 R 11 0 R 12 0 R 13 0 R 14 0 R] >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
        f"<< /Length {len(content)} >>\nstream\n{content.decode('latin1')}endstream",
        "<< /FT /Tx /T (lablink_form_type) /Rect [-100 -100 -80 -80] /DA (/Helv 10 Tf 0 g) /V (liability_release) /F 6 /Ff 1 /Subtype /Widget /Type /Annot /P 3 0 R >>",
        "<< /FT /Tx /T (lablink_template_version) /Rect [-100 -130 -80 -110] /DA (/Helv 10 Tf 0 g) /V (2026-03-27) /F 6 /Ff 1 /Subtype /Widget /Type /Annot /P 3 0 R >>",
        "<< /FT /Btn /T (liability_acknowledged) /Rect [48 552 66 570] /Subtype /Widget /Type /Annot /F 4 /V /Off /AS /Off /MK << /CA (4) >> /AP << /N << /Yes << /Type /XObject /Subtype /Form /BBox [0 0 18 18] /Resources << >> /Length 35 >> stream\n0 0 0 rg 0 0 18 18 re S 4 9 m 7 4 l 14 14 l S\nendstream >> /Off << /Type /XObject /Subtype /Form /BBox [0 0 18 18] /Resources << >> /Length 18 >> stream\n0 0 18 18 re S\nendstream >> >> >> /P 3 0 R >>",
        "<< /FT /Btn /T (transport_acknowledged) /Rect [48 492 66 510] /Subtype /Widget /Type /Annot /F 4 /V /Off /AS /Off /MK << /CA (4) >> /AP << /N << /Yes << /Type /XObject /Subtype /Form /BBox [0 0 18 18] /Resources << >> /Length 35 >> stream\n0 0 0 rg 0 0 18 18 re S 4 9 m 7 4 l 14 14 l S\nendstream >> /Off << /Type /XObject /Subtype /Form /BBox [0 0 18 18] /Resources << >> /Length 18 >> stream\n0 0 18 18 re S\nendstream >> >> >> /P 3 0 R >>",
        "<< /FT /Btn /T (regulatory_acknowledged) /Rect [48 432 66 450] /Subtype /Widget /Type /Annot /F 4 /V /Off /AS /Off /MK << /CA (4) >> /AP << /N << /Yes << /Type /XObject /Subtype /Form /BBox [0 0 18 18] /Resources << >> /Length 35 >> stream\n0 0 0 rg 0 0 18 18 re S 4 9 m 7 4 l 14 14 l S\nendstream >> /Off << /Type /XObject /Subtype /Form /BBox [0 0 18 18] /Resources << >> /Length 18 >> stream\n0 0 18 18 re S\nendstream >> >> >> /P 3 0 R >>",
        "<< /FT /Tx /T (additional_notes) /Rect [48 248 564 390] /DA (/Helv 10 Tf 0 g) /V () /F 4 /Ff 4096 /Subtype /Widget /Type /Annot /MK << /BC [0.75 0.78 0.79] /BG [1 1 1] >> /P 3 0 R >>",
        "<< /FT /Tx /T (signer_name) /Rect [48 178 280 196] /DA (/Helv 10 Tf 0 g) /V () /F 4 /Subtype /Widget /Type /Annot /MK << /BC [0.75 0.78 0.79] /BG [1 1 1] >> /P 3 0 R >>",
        "<< /FT /Tx /T (signed_on) /Rect [324 178 564 196] /DA (/Helv 10 Tf 0 g) /V () /F 4 /Subtype /Widget /Type /Annot /MK << /BC [0.75 0.78 0.79] /BG [1 1 1] >> /P 3 0 R >>",
        "<< /Fields [7 0 R 8 0 R 9 0 R 10 0 R 11 0 R 12 0 R 13 0 R 14 0 R] /DA (/Helv 10 Tf 0 g) /DR << /Font << /Helv 4 0 R >> >> >>",
    ]

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("latin1"))
        pdf.extend(obj.encode("latin1"))
        pdf.extend(b"\nendobj\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin1"))
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("latin1"))
    return bytes(pdf)


def main() -> None:
    OUTPUT_PATH.write_bytes(build_pdf())
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
