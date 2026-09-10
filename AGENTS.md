# AGENTS.md

Guidance for humans and coding agents working on this monorepo.

## What this repo is

This is the OATS Center **Modus** monorepo (`modus-monorepo`). Its job is to convert soil (and related) laboratory results into the [AgGateway Modus](https://aggateway.org) lab-data standard, then emit that data as JSON, standardized CSV, a ToTs (Tree of Tables) zip, or (optionally) Trellis/OADA documents.

Labs each ship their own CSV/XLSX/XML/shapefile layouts. This repo:

1. Autodetects which lab produced a file (or improvises a mapping).
2. Maps columns to Modus metadata and analyte/test IDs.
3. Normalizes units.
4. Emits **Modus Slim** JSON as the current canonical result (`application/vnd.modus.slim.v1.0+json`).

Published npm packages live under the `@modusjs` org. Code is Apache-2.0. Example lab files in `examples/` are CC0.

The browser app (`app/`) is a local-only drop converter: files are parsed in the browser and never uploaded unless the user explicitly syncs to their own Trellis.

## What is in-scope vs not

**Core (work here first):**

| Path | npm name | Role |
|---|---|---|
| `convert/` | `@modusjs/convert` | Conversion library (XML/CSV/XLSX/JSON/ZIP/shapefile/ToTs ↔ Slim/v1/CSV/ToTs) |
| `units/` | `@modusjs/units` | Unit validation and conversion (UCUM) |
| `industry/` | `@modusjs/industry` | Generated Modus test catalog, standard units, and industry lab configs |
| `examples/` | `@modusjs/examples` | Importable real lab files used as fixtures |
| `app/` | `app` (private) | Vite/React drop-zone converter UI |
| `cli/` | `@modusjs/cli` | `modus` CLI wrapping convert |
| `bundle/` | `@modusjs/bundle` | Skypack/CDN rollup of convert + examples |

**Peripheral / do not treat as the product:**

- `visualize/` — hackathon-era soil HTML visualization API (farmon).
- `powerbi/` — Power BI `.pbix` files and a how-to doc.
- `shp-to-geojson.html` — standalone shapefile helper.
- `bigquery` is listed in root workspaces but gitignored; it is not part of the conversion product.

## Quick start

Yarn 4 with Plug'n'Play. Use the repo-pinned Yarn (`.yarn/releases/yarn-4.9.2.cjs`). NodeLinker is `pnp` (not `node_modules` except the app, which has its own).

```bash
yarn install

# Full product build, in dependency order:
yarn build
# industry → examples → units → convert → app

# Individual workspaces:
yarn workspace @modusjs/industry build
yarn workspace @modusjs/examples build
yarn workspace @modusjs/units build
yarn workspace @modusjs/convert build
yarn workspace app dev          # Vite, opens browser
yarn workspace @modusjs/convert test:node
```

Root `yarn build` is the source of truth for order. `examples` build also zips demo files into `app/public/`.

Debug logs use the `debug` package:

```bash
DEBUG='@modusjs*' yarn workspace @modusjs/convert test:node
```

Namespaces look like `@modusjs/convert#csv:info` (`error` / `warn` / `info` / `trace`).

## Architecture

```
lab CSV/XLSX/XML/JSON/ZIP/shp  OR  ToTs zip/xlsx tree
        │
        ▼
  file.fromFile()          node: convert/src/node/file.ts
  (or json.toJson())       browser: convert/src/browser/file.ts
        │
        ├─ isTots? → @treeoftables/lib parseTots → tots.ts → Slim[] (keeps pathContext)
        ├─ xml  → xml.parseModusResult → fromModusV1 → Slim
        ├─ json → assert Slim, or v1 Events → fromModusV1 → Slim
        ├─ csv/xlsx → csv.parseCsv (convert/src/csv.ts) → Slim[]
        └─ shp (+ sidecars) → GeoJSON → csv-like rows → Slim[]
        │
        ▼
  Modus Slim JSON     (+ optional standardized CSV, ToTs zip tree, Trellis put)
```

Platform split: shared code lives at `convert/src/*.ts`. Node-only and browser-only I/O live in `src/node/` and `src/browser/` and re-export the shared API. `package.json` points `main` at `dist/node/index.js` and `browser` at `dist-browser/browser/index.js`. Do not import `convert/src/file.ts` from the universal `index.ts`; node/browser re-export the pieces they need.

Build for convert/units is three steps: `tsc` (node) → `tsc -p tsconfig.browser.json` → rollup `dist-browser/bundle.mjs`.

### ToTs (Tree of Tables)

ToTs is a schema-backed folder or zip of `.xlsx` workbooks. Here it is Slim-shaped soil lab data with **one workbook per field×year**, so a later heatmap / time slider can sit on the tree. It is **not** another proprietary lab CSV dialect. Heatmap UI is out of scope; keep the zip tree and `pathContext`.

#### Two repos — what lives where

| Repo | Checkout | Owns |
|---|---|---|
| **modus** (this repo) | `~/repos/oats-center/modus` | Lab → Slim conversion, `convert/src/tots.ts` mapping, app drop UI |
| **treeoftables** | `~/repos/treeoftables/monorepo` | ToTs language, schema catalog, `isTots` / `parseTots` / `serializeTotsTree`, zip in Node **and** browser |

`@modusjs/convert` depends on unpublished `@treeoftables/lib` via Yarn portal:

```
"@treeoftables/lib": "portal:../../../treeoftables/monorepo/lib"
```

That path assumes the two repos are siblings under `~/repos/` (`oats-center/modus` next to `treeoftables/monorepo`). After moving either checkout, fix the portal and `yarn install`.

**Parser, catalog, and zip I/O belong in treeoftables.** Modus must not unzip a ToTs tree itself or flatten it as lab xlsx. **Slim mapping and app UX belong in modus.** Fixes that make a zip “a ToTs tree” (markers, schema match, typed rows, validation) go in the lib; fixes that map sample rows ↔ Slim go in `convert/src/tots.ts`.

The lib ships two builds from the same `lib/src/` (`shared.ts` + `zip.ts` are shared):

- Node: `lib/dist/` (may use `fs`)
- Browser: `lib/dist-browser/` (bundled catalog, no `fs`)

After changing treeoftables lib source, rebuild **that** package before modus will see it:

```bash
cd ~/repos/treeoftables/monorepo
yarn workspace @treeoftables/lib test:node   # builds dist + dist-browser, then parser tests

cd ~/repos/oats-center/modus
yarn workspace @modusjs/convert build        # or at least build:node && build:browser
```

App Vite aliases `@treeoftables/lib` → `@treeoftables/lib/browser` and excludes `@modusjs/convert` and the lib from `optimizeDeps` so Node `fs` is not bundled. If the app is blank or still has a stale convert, delete `app/node_modules/.vite` and restart `yarn workspace app dev`. Do **not** set Vite `resolve.conditions: ['browser']` globally — that broke MUI (`formatMuiErrorMessage` / `_interopRequireDefault2`).

`.xlsx` files are PK zips. `isTots` treats `.xlsx` as a **workbook**. Only names ending in `.zip` take the zip-tree path (plus the `.tots-data-manifest.json` / `ag/lab-results` markers inside).

#### Leaf and on-disk shape

Production soil leaf (catalog in treeoftables `schema/tots/`):

`ag/lab-results/soil/year-index-inplace/field-name-index-inplace.schema`

Concrete data paths:

`ag/lab-results/soil/{YYYY}/{field-slug}.xlsx`

In-place indexes mean any year / any field slug matches; do not pin a teaching year like 2026 in production export. The toy leaf `ag/soil_tests` still parses (`toySoilToSlim` in `tots.ts`); new export always uses the production leaf.

A saved tree zip contains:

- `.tots-data-manifest.json` — marker so `isTots` is true even if schema match is picky
- those `.xlsx` workbooks

Workbooks are **wide**: one DATA row per sample, analyte columns, `additionalProperties: true` on `samples`. Typed rows `UNITS` / `MODUSTESTID` / `COMMENT` store per-column strings on `meta.samples` (`units`, `modusTestIds`, `comments`). No enum of Modus test codes.

Field slugs are `[a-z0-9-]+`. Empty field names become `unknown`, not `_unknown` (the latter fails the slug regex and used to mint `unknown-2`, `unknown-3`, … one workbook per Slim).

#### Convert mapping (`convert/src/tots.ts`)

**In:** `json.toJson` calls `inputFileIsTots` **before** `flattenZips`. A ToTs zip is parsed with `parseTots`, then `totsParsedToSlim`. Keep `tots.pathContext` / `totsPath` on each `ModusJSONConversionResult`.

**Out:** `slimToTotsItems` merges every Slim of the same field×year into **one** workbook (curated demo is ~257 Slims → ~13 workbooks). `file.buildTotsZip` / `file.save({ outputtype: 'tots' })` call `serializeTotsTree`.

`sample_id` is required on the leaf. Lab Slims can key `samples` with `""`. The exporter must mint a non-empty unique id (sample key, `lab.sampleid`, `source.sampleid`, or `sample-N`). The lib parser fills leftover blank DATA-row ids with `row-{n}` so an already-saved zip still reloads. Zip parse isolates per-workbook errors: one bad `.xlsx` must not abort the tree.

Round-trip acceptance: drop `app/public/curateddemo.zip` with ToTs output, then drop the downloaded `modus_conversion.tots.zip`. Both `isTots` and `parseTots` must succeed **in `@treeoftables/lib` alone**, and `json.toJson` must return Slims. That lib-only parse is the test that the file is a ToTs tree, not that the React app wrapped it.

#### App notes (ToTs download)

After a long async convert, a programmatic `<a download>` is often no longer a user gesture. The drop path uses `buildTotsZip`, creates a blob URL, tries auto-click, and only keeps the orange Download button under the dropzone if auto-download is blocked (dismiss after a successful click). Status `<Messages />` is rendered **once** (above the dropzone). `fromFile` failures must show a red message, not silently become “converted 0 results”.

`save-file` waits on `window` `focus` (hangs headless / some webviews). Prefer blob URL + `<a download>` in the browser.

### Two CSV implementations (important)

| File | Public export | Output |
|---|---|---|
| `convert/src/csv.ts` | used by `json.toJson()` | **Slim[]** (canonical path) |
| `convert/src/fromCsvToModusV1.ts` | `csv` from `@modusjs/convert` | **Modus v1** `ModusResult[]` (`Events[]`) |

The CLI `csv.parse` / tests under `csv.test.ts` still exercise the v1 parser. The app, `file.fromFile`, and `json.toJson` use `csv.ts` and emit Slim. When changing CSV behavior, decide which path you are on. Prefer Slim (`csv.ts` + `slim.ts`) for new work.

`fromCsvToModusV1.ts` also still owns v1 helpers such as `toCsv` (v1-shaped), `fixModus`, and `fixDepthUnits`. Slim CSV round-trip lives in `slim.ts` (`toCsv` / `toStandardCsv` / `fromStandardCsv`).

## Data models

Types come from `@oada/types`, not from this repo:

- Slim: `@oada/types/modus/slim/v1/0.js` — `_type: application/vnd.modus.slim.v1.0+json`
- Modus Result v1: `@oada/types/modus/v1/modus-result.js`
- Modus Submit v1: `@oada/types/modus/v1/modus-submit.js`

Validate with `assertSlim` / `assertModusResult` (AJV). Parsers are tolerant; validators are strict.

**Slim** (canonical in-app document) is one lab event:

- `id`, `date`, `type` (`soil` | `plant-tissue` | `nematode` | `water` | `residue`)
- `lab` — lab identity, contact, client account, report, source filenames
- `source` — grower / farm / field / subfield
- `samples` — map of sample id → `{ lab, source, results, depth, geolocation }`
- `results` — map of result id → `{ analyte, modusTestID, units, value, ... }`
- plant extras: `crop`, `plantPart`

v1 `ModusTestID` values look like `S-P-B1-1:10.01.03`. Industry data also carries Modus v2 IDs (`L_MODV2_SOIL_P_012`). When both exist, Slim currently prefers v2 (`modusTestID = ModusTestIDv2`).

**Modus v1** is the nested XML-shaped JSON: `Events[]` → `EventMetaData` / `LabMetaData` / `FMISMetaData` / `EventSamples.Soil.SoilSamples[].Depths[].NutrientResults`. `slim.fromModusV1()` is the v1 → Slim mapper.

CSV/XLSX rows with the same event date become **one Slim document**. Missing/unparseable dates are skipped in the Slim path.

## Lab configs

Lab recognition is the heart of CSV/XLSX conversion.

Configs are merged in `convert/src/labs/labConfigs.ts`:

1. **Industry** (`@modusjs/industry`): generated from Airtable CSV exports in `industry/` (`Lab_Method-Sam's Export View.csv`, `Modus_Soil_Test_v2-Sam's Export View.csv`). Build with `node src/build.js` → `industry/gen/*.js`.
2. **Local** TypeScript files under `convert/src/labs/{soil,plant}/*.ts`, registered in `localLabConfigs`.

Local wins on conflict. A local-only lab (no industry row) is still included.

A `LabConfig` has:

- `name` — must match the industry lab name if you want them merged
- `type` — `'Soil'` or `'Plant'` (Slim lowercases this; `'plant'` becomes `'plant-tissue'`)
- `mappings` — CSV header → key in `toModusJsonPath` (or `undefined` to ignore, or an array to write the same column to several fields)
- `analytes` — CSV header → `{ Element, ValueUnit, ModusTestID, ... }`
- `headers` — union of mapping keys and analyte keys; **autodetect requires every input header to be in this list**
- optional `depthInfo`, `packageName`, `examplesKey`

Autodetect (`autodetectLabConfig`): a lab matches when every column header is in that lab’s `headers` (duplicate columns like `P2O5 Rec_1` strip the `_N` suffix). First match wins.

If nothing matches, `cobbleLabConfig` guesses mappings/analytes from other labs. A date column is required (header containing `date`, with a DATESUB special case).

### Adding a lab

1. Drop real files in `examples/examples/<lab_key>/{soil|plant}/` (csv/xlsx/xml/json/shp).
2. Add `convert/src/labs/soil/<lab>.ts` (or `plant/`) exporting a `LocalLabConfig`.
3. Import it and append to `localLabConfigs` in `convert/src/labs/labConfigs.ts`.
4. Set `examplesKey` to the examples folder name so tests can find fixtures.
5. `yarn workspace @modusjs/examples build` then `yarn workspace @modusjs/convert build`.
6. Confirm autodetection: every header in the sample must appear in `mappings` or `analytes` (map unused columns to `undefined`).

Copy an existing config (`a_l_west.ts`, `kuo.ts`, `vertex.ts`) rather than inventing a new shape.

`toModusJsonPath` in `labConfigs.ts` is the vocabulary of mapping targets (`ReportDate`, `SampleNumber`, `GrowerName`, `StartingDepth`, …). Each entry has a v1 JSONPath, a Slim pointer, and an optional parse (`date` | `number` | `string`). Add a new mapping key there if a lab column has no existing target.

### CSV quirks the parser already understands

- Header row must be row 1 of a data sheet.
- A cell whose value is exactly `COMMENT` makes the whole row ignored.
- A cell whose value is exactly `UNITS` makes that row a per-column unit override.
- Sheets whose names contain `point meta` (any spacing/case) are sample-location sidecars, keyed by sample id.
- If any sheet name contains `raw`, only those sheets are treated as data.
- Empty columns (`__EMPTY*`) are dropped; headers are trimmed.
- Unit priority for an analyte: UNITS-row override > units in the header (`P [ppm]`) > lab config `ValueUnit` > existing.
- Standardized Slim CSV headers look like `P (S-P-B1-1:10.01.03) [ppm]` and metadata like `lab.sampleid` (dot-path).
- Geolocation: `Latitude`/`Longitude` columns, or WKT in a geometry field.

## Package notes

### `convert/`

Public surface (`convert/src/index.ts`): `xml`, `csv` (v1 parser), `json`, `slim`, `tots`, `Slim`, `ModusResult`, `tree` (Trellis/OADA bookmark tree).

| File | Responsibility |
|---|---|
| `json.ts` | `toJson()` dispatcher, ToTs-first then zip flatten, filename typing |
| `csv.ts` | Slim CSV/XLSX parser |
| `fromCsvToModusV1.ts` | v1 CSV/XLSX parser + v1 `toCsv` |
| `xml.ts` | Cheerio XML → nested JSON; `parseModusResult` / `parseModusSubmit` / `parseModusSlim` |
| `slim.ts` | v1 ↔ Slim, flatten/unflatten, Slim `toCsv` |
| `tots.ts` | ToTs zip/xlsx ↔ Slim (`isTots`/`parseTots`/`slimToTotsItems`) |
| `shp.ts` / `geojson.ts` | Shapefile sidecar grouping → GeoJSON → Slim |
| `file.ts` | Shared save/zip/`buildTotsZip` + `prepareInputFiles` |
| `tree.ts` | OADA tree for `/bookmarks/lab-results/{type}/event-date-index/{date}/md5-index/{hash}` |
| `html.ts` | stub; real `toHtml` is node/browser (POSTs to `soilapi.farmonapp.com`) |
| `labs/` | configs + autodetection |

Supported input extensions: `xml`, `csv`, `xlsx`, `json`, `zip`, `shp` (+ `dbf`/`shx`/`prj`/`cpg` grouped by basename).

### `units/`

`convertUnits(from, to?)` converts a nutrient result (or array) toward industry standard units via `@lhncbc/ucum-lhc`. `simpleConvert(value, from, to)` is the one-shot helper. `aliases` maps lab unit strings (`ppm`, `lb/ac`, `meq/100 g`, `s.u.`, …) onto UCUM. Base-saturation `%` ↔ `meq/100g` needs CEC on the same sample. Unknown units are kept with a warning; do not fail the conversion.

### `industry/`

Do not hand-edit `industry/gen/` or `industry/dist/`. Re-export the Airtable CSVs, then `yarn workspace @modusjs/industry build`. Exports: `labConfigs`, `standardUnits`, `modusTests`.

### `examples/`

Source files: `examples/examples/<lab>/<soil|plant>/`. `dev/build.js` turns each file into a TS default export under `examples/build/`, then `tsc` emits `examples/dist/`. XML/CSV/JSON become strings; XLSX and shapefile parts become base64. Import as:

```ts
import xml from '@modusjs/examples/dist/enyart-east50-a_l_labs/soil/hand_modus_xml.js';
```

`examplesKey` on a lab config must match the lab folder name.

### `cli/`

Binary `modus`: `tojson`, `tocsv`, `tohtml`. Node-only. Prompts before overwriting.

### `app/`

Vite + React 18 + MUI + MobX (`mobx-react-lite`). Deployed with `gh-pages` at base `/modus/`.

- `src/App.tsx` — drop zone, output-format select, Trellis connect UI
- `src/state/` — observable state + actions (messages, Trellis, file table)
- `src/Table.tsx` — Trellis-backed results table
- `src/toModus2.ts` — leftover v1→v2 test-id remapper; not on the drop path
- `src/LabConfig.tsx.original` — retired CSV-config UI (commented out of App)

Output modes: `modusjson2` (Slim JSON, labeled “Modus JSON v2”), `json` (still Slim via `file.fromFile`; the label says v1), `csv`, `tots` (Tree of Tables zip), `trellis`.

Headless embed: `?headless=true&domain=...` accepts `postMessage` `{ request: 'toJSON', file }` and replies with conversion results.

Trellis: `@oada/client` PUT/GET using `convert`’s `tree`. Hashes documents with a custom stable JSON serializer (`actions.ts`). Default domain/token in state are localhost placeholders.

Privacy copy in the UI is a product constraint: conversion must stay client-side unless Trellis is chosen.

## TypeScript / style

- `"type": "module"` everywhere. Use **`.js` extensions on relative imports** even in `.ts` files (`node16` module resolution).
- Root `tsconfig.json`: `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `target: es2020`. `noUnusedLocals` / `noUnusedParameters` are off.
- App tsconfig is Vite/React (`jsx: react-jsx`, `useDefineForClassFields: true` for MobX).
- Prefer `import type` for types.
- Logging: `debug`, not `console.log` (except rare leftover debug). Create `error`/`warn`/`info`/`trace` loggers at file top.
- Errors: tag with `@overleaf/o-error` when wrapping parse failures.
- Do not introduce Jest/Vitest for convert/units; tests are hand-rolled async functions that **throw** on failure.
- Prettier is a root/app dependency but there is no enforced format script. Match surrounding file style (2-space indent, no strict semicolon rule, existing `any` and `@ts-expect-error` where schemas lag).
- Comments should explain non-obvious lab/schema constraints, not narrate the change.

## Tests

Convert and units tests run **the same files** in node and browser. Test modules export `async function run(lib)` and receive the compiled library so they do not import implementation paths directly.

- Node: `yarn workspace @modusjs/convert test:node` (nodemon on `dist/test/node/index.js`, uses `convert/test-work/`). Nodemon **does not exit**; do not use it for a one-shot.
- Isolated ToTs tests (does exit): after `build:node`,
  `yarn workspace @modusjs/convert exec yarn node --input-type=module -e 'import * as lib from "./dist/node/index.js"; import run from "./dist/test/tots.test.js"; await run(lib);'`
- ToTs parser tests (treeoftables repo, no modus): `yarn workspace @treeoftables/lib test:node`
- Browser: `yarn workspace @modusjs/convert test:browser` (live-server + `src/test/index.html` + rolled-up bundle)
- Run `yarn workspace @modusjs/convert dev` in another terminal if you want rebuilds while testing

Add a new convert test as `convert/src/test/<name>.test.ts` and register it in both `src/test/node/index.ts` and `src/test/browser/index.ts`. Use `@modusjs/examples` fixtures. `labConfigs.test.ts` walks every config, validates units, and checks that that lab’s example sheets autodetect.

There is no CI test job; GitHub Actions only run CodeQL and CODEOWNERS validation.

## Common pitfalls

- **Build order.** Convert depends on built `examples` and `industry`. After changing an example file or Airtable export, rebuild those packages first.
- **PnP.** Do not `npm install` at the root. Use `yarn workspace <name> <cmd>`.
- **Autodetect is strict.** A single unrecognized header means no lab match. Map it (`undefined` is fine) or autodetection falls through to cobbling.
- **Date column required** for CSV/XLSX grouping.
- **Do not commit `dist/`** (gitignored) except as produced by local builds; packages publish `dist` / `dist-browser`.
- **`app/src/Table.tsx` imports `./trellisTree`**, which is not in the tree. The Trellis table path is incomplete; `tree` also exists at `@modusjs/convert` (`convert/src/tree.ts`). Do not assume Table compiles until that import is fixed.
- **v1 vs Slim.** `csv.parse` ≠ `json.toJson`. UI “Modus JSON v1” vs “v2” labels do not line up cleanly with the code (both drop-zone JSON paths go through Slim).
- **Industry gen files are generated.** Edit the CSV exports or `industry/src/build.js`, not `gen/`.
- **Shapefiles** need `.shp` plus sidecars; the pipeline groups by basename and zips in memory for `shpjs`.
- **Units:** `ppm` is not UCUM; it must go through `aliases`. pH uses `none` / `s.u.`.
- **MobX actions** that `await` must use `runInAction` for state writes after the await (`app/src/state/actions.ts`).
- **ToTs portal.** `@treeoftables/lib` is not on npm. Changing parser behavior requires a lib rebuild in `~/repos/treeoftables/monorepo`, then convert `build:browser` (the app loads `dist-browser/`). Stale Vite prebundles look like “parse succeeded, nothing downloaded” or a blank page.
- **ToTs before flatten.** `isTots` runs before `flattenZips`. If detection is wrong, a ToTs zip is unpacked as lab xlsx and “reads nothing.” xlsx is itself a zip; do not treat `.xlsx` as a ToTs tree.
- **ToTs `sample_id`.** Empty Slim sample keys must not be written as blank DATA `sample_id` (leaf required). Parser fills leftovers with `row-{n}`; exporter should mint ids so new zips are clean.
- **Bare `node` vs `yarn node`.** PnP: use `yarn node` / `yarn workspace … exec yarn node`, not a system `node` that cannot resolve `@treeoftables/lib`.

## Suggested change recipes

**New analyte on an existing lab:** edit that lab’s `analytes` in `convert/src/labs/...`. If the test exists in industry data, prefer the industry `ModusTestID` / units.

**New mapping target:** add an entry to `toModusJsonPath`, then use that key from lab `mappings`. Update Slim writers in `csv.ts` if the Slim path is not already set from `modusKeyToValue`.

**New input format:** extend `supportedFileTypes` / `typeFromFilename` in `json.ts`, teach `prepareInputFiles` how to read it, add a case in `toJson`.

**App-only UI change:** stay in `app/src`. Conversion logic belongs in `convert/`, not the React tree.

**ToTs language / zip / schema change:** edit `~/repos/treeoftables/monorepo` (`lib/src`, `schema/tots`), rebuild the lib, then rebuild convert. **ToTs ↔ Slim mapping:** `convert/src/tots.ts` only.

**Do not** add a new workspace, switch package manager, or move types out of `@oada/types` without an explicit request.
