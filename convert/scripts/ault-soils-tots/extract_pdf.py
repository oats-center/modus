#!/usr/bin/env python3
"""Extract A&L Great Lakes landscape soil-test reports into pdf-extract.json.

Samples are columns; analytes are labeled on the left. Rec/fertility PDFs are skipped.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.stderr.write("pdfplumber is required. Create a venv in this folder and pip install pdfplumber.\n")
    raise

DEFAULT_ROOT = Path.home() / "Mega-AultFarms/Aaron_Farm/2026-AF/Manure_Records/Soil Test"
ROOT = Path(os.environ.get("SOIL_TEST_DIR", DEFAULT_ROOT))
OUT = Path(os.environ.get("PDF_EXTRACT_JSON", ROOT / "pdf-extract.json"))

SKIP_NAME = re.compile(
    r"(soil fertility|pk lime|fertilizer rec|recommendation|icon)",
    re.I,
)
YEAR_DIR = re.compile(r"(20\d{2})_SoilTests")
ACRES = re.compile(r"\b(\d+(?:\.\d+)?)\s*AC\b", re.I)

HEADER_ANALYTES = [
    (re.compile(r"organic|matter|^om$", re.I), "OM", "%"),
    (re.compile(r"phosphorus|bray", re.I), "P", "ppm"),
    (re.compile(r"potassium|^k$", re.I), "K", "ppm"),
    (re.compile(r"magnesium|^mg$", re.I), "Mg", "ppm"),
    (re.compile(r"calcium|^ca$", re.I), "Ca", "ppm"),
    (re.compile(r"buffer", re.I), "BpH", "none"),
    (re.compile(r"soil\s*ph|^ph$", re.I), "pH", "none"),
    (re.compile(r"exchange|cec", re.I), "CEC", "meq/100g"),
    (re.compile(r"%\s*k|^k\s*%", re.I), "BS-K", "%"),
    (re.compile(r"%\s*mg|^mg\s*%", re.I), "BS-Mg", "%"),
    (re.compile(r"%\s*ca|^ca\s*%", re.I), "BS-Ca", "%"),
    (re.compile(r"%\s*h|^h\s*%", re.I), "BS-H", "%"),
    (re.compile(r"sulfur|^s$", re.I), "S", "ppm"),
    (re.compile(r"zinc|^zn$", re.I), "Zn", "ppm"),
    (re.compile(r"manganese|^mn$", re.I), "Mn", "ppm"),
    (re.compile(r"iron|^fe$", re.I), "Fe", "ppm"),
    (re.compile(r"copper|^cu$", re.I), "Cu", "ppm"),
    (re.compile(r"boron|^b$", re.I), "B", "ppm"),
]


def is_result_pdf(path: Path) -> bool:
    name = path.name.lower()
    if not name.endswith(".pdf"):
        return False
    if SKIP_NAME.search(name):
        return False
    year_hit = YEAR_DIR.search(str(path))
    if year_hit and int(year_hit.group(1)) >= 2022:
        return False
    return True


def parse_date(text: str) -> str | None:
    m = re.search(r"(20\d{2})[-/](\d{1,2})[-/](\d{1,2})", text)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    m = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](20\d{2})", text)
    if m:
        return f"{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}"
    return None


def header_meta(text: str, path: Path) -> dict:
    year_hit = YEAR_DIR.search(str(path))
    year = year_hit.group(1) if year_hit else None
    field = None
    farm = None
    m = re.search(r"Field:\s*([A-Z0-9][A-Z0-9 \-./]*?)(?:\s+Date|\s+\d{1,2}/\d|\s*$)", text, re.I)
    if m:
        field = m.group(1).strip()
    m = re.search(r"Farm:\s*([A-Z0-9][A-Z0-9 \-./]*?)(?:\s+Date|\s+\d{1,2}/\d|\s*$)", text, re.I)
    if m:
        farm = m.group(1).strip()
    if not field:
        # "AULTCARL AULTHOME BACK LANE 3539.18AC" style concatenated header
        m = re.search(r"(HOME|CALLOWAY|PALMER|MONT|HORN|EBER|DRY ?COW|SCHALE|ENYART|GOTT|KEIM|LILLIAN|LOWE|MILLER|LANE|BOOTS|ZON|WINEGARDNER|CRISPEN|SMITH|ZARTMAN)[:\s]+([A-Z0-9][A-Z0-9 \-]{2,40})", text, re.I)
        if m:
            farm = farm or m.group(1).title()
            field = m.group(2).strip()
    # "Farm: CALLOWAY ACCESS 48" is often the field name; "Field: 51.9AC" is acres.
    if farm and re.search(r"\d+\s*ac", farm, re.I):
        farm = None
    if field and re.search(r"^\d", field):
        field = farm
    if farm and not re.search(r"\d+\s*ac", farm, re.I) and (not field or field == farm):
        field = farm
    parent = path.parent.name
    if parent and parent not in {"soil test", "A and L Soil Results"} and not parent.startswith("20"):
        if not field or len(parent) > len(field or ""):
            if not re.match(r"F\d{5}", parent):
                field = field or parent.replace("_", " ")
    stem = re.sub(r"F\d{5}-\d+", "", path.stem)
    stem = re.sub(r"Soil Test Results", "", stem, flags=re.I)
    stem = stem.replace("_", " ").replace("-", " ").strip()
    if stem and (not field or re.match(r"^\d", field or "")):
        field = stem
    date = parse_date(text)
    if not date and year:
        date = f"{year}-01-01"
    return {"year": year, "farm": farm, "field": field, "date": date, "grower": "Ault Farms"}


def split_cell(value) -> list[str]:
    if value is None:
        return []
    return [part.strip() for part in str(value).split("\n") if part.strip()]


def header_name(col_headers: list[str]) -> tuple[str, str] | None:
    blob = " ".join(col_headers).strip()
    blob = re.sub(r"\s+", " ", blob)
    for pat, name, units in HEADER_ANALYTES:
        if pat.search(blob):
            return name, units
    return None


def samples_from_table(table: list[list]) -> list[dict]:
    if not table or len(table) < 2:
        return []
    # A&L packs every sample into one data row, values separated by newlines.
    data_row = None
    header_rows = []
    for row in table:
        cells = [split_cell(c) for c in row]
        ids = cells[0] if cells else []
        if len(ids) >= 2 and all(re.fullmatch(r"\d{1,3}", x) for x in ids[:3]):
            data_row = cells
            break
        header_rows.append([re.sub(r"\s+", " ", " ".join(c)).strip() for c in cells])
    if not data_row:
        return []
    ids = data_row[0]
    n = len(ids)
    samples = {sid: {"sample_id": sid, "analytes": {}, "units": {}} for sid in ids}
    for col, values in enumerate(data_row[1:], start=1):
        headers = [row[col] if col < len(row) else "" for row in header_rows]
        mapped = header_name(headers)
        if not mapped:
            continue
        name, units = mapped
        if name in {"Sample", "Lab"}:
            continue
        if len(values) != n:
            continue
        for sid, raw in zip(ids, values):
            try:
                samples[sid]["analytes"][name] = float(raw.replace(",", ""))
                samples[sid]["units"][name] = units
            except ValueError:
                continue
    return [row for row in samples.values() if row["analytes"]]


def extract_pdf(path: Path) -> dict | None:
    try:
        with pdfplumber.open(path) as pdf:
            text = "\n".join((page.extract_text() or "") for page in pdf.pages[:2])
            if "SOIL TEST REPORT" not in text.upper() and "A & L" not in text.upper() and "A&L" not in text.upper():
                return None
            meta = header_meta(text, path)
            samples = []
            for page in pdf.pages:
                for table in page.extract_tables() or []:
                    samples.extend(samples_from_table(table))
            seen = {}
            for sample in samples:
                seen.setdefault(sample["sample_id"], sample)
            samples = list(seen.values())
            if not samples:
                return None
            meta["samples"] = samples
            meta["source"] = str(path)
            return meta
    except Exception as exc:
        print(f"skip {path}: {exc}", file=sys.stderr)
        return None


def main() -> None:
    pdfs = [p for p in ROOT.rglob("*") if p.is_file() and is_result_pdf(p)]
    print(f"Candidate result PDFs: {len(pdfs)}", file=sys.stderr)
    out = []
    for i, pdf in enumerate(pdfs, 1):
        rec = extract_pdf(pdf)
        if rec:
            out.append(rec)
            print(f"[{i}/{len(pdfs)}] {len(rec['samples'])} samples  {pdf.name}", file=sys.stderr)
        elif i % 25 == 0:
            print(f"[{i}/{len(pdfs)}] …", file=sys.stderr)
    OUT.write_text(json.dumps(out, indent=2))
    print(f"Wrote {OUT} ({len(out)} reports)", file=sys.stderr)


if __name__ == "__main__":
    main()
