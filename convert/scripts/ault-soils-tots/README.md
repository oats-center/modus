# Ault farm demo ToTs builder

Local-only. Do **not** commit `pdf-extract.json`, the full farm zip, or raw lab files.

Default data dir (override with `SOIL_TEST_DIR`):

`~/Mega-AultFarms/Aaron_Farm/2026-AF/Manure_Records/Soil Test`

Writes `ault-soils.tots.zip` and reads `pdf-extract.json` from that folder (`OUT` / `PDF_EXTRACT_JSON` override).

The public GPS sample in this repo is **Horn 235 only**: `app/public/horn235.tots.zip` (2014, 2017, 2020 chemistry + 2023 sampling GPS). Rebuild that slice from the private zip:

```bash
SRC="$HOME/Mega-AultFarms/Aaron_Farm/2026-AF/Manure_Records/Soil Test/ault-soils.tots.zip"
TMP=$(mktemp -d) && cd "$TMP"
unzip -q "$SRC" .tots-data-manifest.json \
  ag/lab-results/soil/2023/horn-farm-237-14-ac.xlsx \
  ag/lab-results/soil/2020/horn-235.xlsx \
  ag/lab-results/soil/2017/horn-235.xlsx \
  ag/lab-results/soil/2014/horn-235.xlsx
zip -q -X horn235.tots.zip .tots-data-manifest.json ag/lab-results/soil/20{14,17,20}/horn-235.xlsx ag/lab-results/soil/2023/horn-farm-237-14-ac.xlsx
cp horn235.tots.zip "$HOME/repos/oats-center/modus/app/public/horn235.tots.zip"
```

## Stage A — 2022–2025 measured GPS

Modus XML + `*Sampling_Soil*` shapefiles (including the 2022–2024 combined points zip). Fertilizer rec polygons are ignored.

```bash
yarn workspace @modusjs/convert build
yarn workspace @modusjs/convert exec yarn node ./scripts/ault-soils-tots/build.mjs
```

## Stage B — PDF chemistry (2012–2021)

```bash
cd convert/scripts/ault-soils-tots
python3 -m venv .venv
.venv/bin/pip install pdfplumber
.venv/bin/python extract_pdf.py
```

Then re-run `build.mjs`. It loads `pdf-extract.json` if present.

## Stage C — synthetic GPS

Older PDF slims that match a 2022–2025 sampling field get coordinates:

- same sample count → copy later GPS by SampleID
- fewer samples (zones) → cluster the later grid and assign using pH / OM / CEC
- no later grid for that field → chemistry only, no GPS
