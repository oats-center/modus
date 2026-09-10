#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { file as convertFile } from '@modusjs/convert';
import { normalizeFieldKey, yearFromDate } from './field.mjs';
import { loadSamplingPoints, lookupPoints } from './shp.mjs';
import { attachMeasuredGps, synthesizeGps } from './synthetic.mjs';

const DEFAULT_ROOT = path.join(
  os.homedir(),
  'Mega-AultFarms/Aaron_Farm/2026-AF/Manure_Records/Soil Test',
);
const SOIL_ROOT = process.env.SOIL_TEST_DIR || DEFAULT_ROOT;
const OUT = process.env.OUT || path.join(SOIL_ROOT, 'ault-soils.tots.zip');
const PDF_JSON = process.env.PDF_EXTRACT_JSON || path.join(SOIL_ROOT, 'pdf-extract.json');

async function walkFiles(dir, acc = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('.') || entry.name.startsWith('Icon')) continue;
    if (entry.isDirectory()) await walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function fmisFromXml(xml) {
  const grab = (tag) => {
    const m = String(xml || '').match(new RegExp(`<${tag}[^>]*\\bID="([^"]*)"`, 'i'));
    return (m?.[1] || '').trim();
  };
  return { grower: grab('Grower'), farm: grab('Farm'), field: grab('Field') };
}

function fieldFromFilename(filename) {
  const base = path.basename(filename).replace(/\.[^.]+$/, '');
  const m = base.match(/-([A-Za-z0-9 ]+)-(.+?)\s*-F\d{5}/i);
  if (m) return { farm: m[1].trim(), field: m[2].trim() };
  const compact = base.replace(/modus$/i, '').replace(/csv$/i, '').replace(/[_-]+/g, ' ').trim();
  return { field: compact };
}

function ensureSource(slim, { grower, farm, field }) {
  slim.source = slim.source || {};
  if (grower) {
    slim.source.grower = slim.source.grower || {};
    slim.source.grower.name = slim.source.grower.name || grower;
  }
  if (farm) {
    slim.source.farm = slim.source.farm || {};
    slim.source.farm.name = slim.source.farm.name || farm;
  }
  if (field) {
    slim.source.field = slim.source.field || {};
    slim.source.field.name = slim.source.field.name || field;
  }
  for (const sample of Object.values(slim.samples || {})) {
    sample.source = sample.source || {};
    if (field) {
      sample.source.field = sample.source.field || {};
      sample.source.field.name = sample.source.field.name || field;
    }
    if (farm) {
      sample.source.farm = sample.source.farm || {};
      sample.source.farm.name = sample.source.farm.name || farm;
    }
  }
}

function slimFieldKey(slim) {
  const sample = Object.values(slim.samples || {})[0] || {};
  return normalizeFieldKey(
    sample?.source?.field?.name
    || sample?.source?.field?.id
    || slim.source?.field?.name
    || slim.source?.field?.id,
  );
}

function sampleEntries(slim) {
  return Object.entries(slim.samples || {});
}

async function convertXmlFiles(xmlFiles) {
  const slims = [];
  const batchSize = 8;
  for (let i = 0; i < xmlFiles.length; i += batchSize) {
    const batch = xmlFiles.slice(i, i + batchSize).map((filename) => ({ filename }));
    console.log(`Converting XML ${i + 1}-${Math.min(i + batchSize, xmlFiles.length)} / ${xmlFiles.length}`);
    const run = async (item) => {
      const xml = await fs.readFile(item.filename, 'utf8');
      const fmis = fmisFromXml(xml);
      const named = fieldFromFilename(item.filename);
      const results = await convertFile.fromFile(item);
      for (const result of results) {
        ensureSource(result.modus, {
          grower: fmis.grower,
          farm: fmis.farm || named.farm,
          field: fmis.field || named.field,
        });
        slims.push(result.modus);
      }
    };
    try {
      for (const item of batch) await run(item);
    } catch (err) {
      console.warn('XML batch failed, retrying one-by-one:', err.message);
      for (const item of batch) {
        try {
          await run(item);
        } catch (inner) {
          console.warn('  skip', item.filename, inner.message);
        }
      }
    }
  }
  return slims;
}

function attachStageA(slims, gpsIndex) {
  const stats = { attached: 0, fallback: 0, none: 0 };
  for (const slim of slims) {
    const year = yearFromDate(slim.date);
    const fieldKey = slimFieldKey(slim);
    let points = lookupPoints(gpsIndex, year, fieldKey);
    let usedFallback = false;
    if (!points.length) {
      points = lookupPoints(gpsIndex, '', fieldKey);
      usedFallback = true;
    }
    const n = attachMeasuredGps(slim, points);
    if (n > 0) {
      stats.attached += 1;
      if (usedFallback) stats.fallback += 1;
    } else stats.none += 1;
  }
  return stats;
}

function cleanName(value) {
  return String(value || '')
    .replace(/\s*Date\s+(Reported|Received).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadPdfSlims(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    row = { ...row, field: cleanName(row.field), farm: cleanName(row.farm) };
    const samples = {};
    for (const sample of row.samples || []) {
      const id = String(sample.sample_id || Object.keys(samples).length + 1);
      const results = {};
      for (const [name, value] of Object.entries(sample.analytes || {})) {
        if (value === undefined || value === null || value === '') continue;
        results[`${id}-${name}`] = {
          analyte: name,
          value: typeof value === 'number' ? value : Number(value),
          units: sample.units?.[name],
        };
      }
      samples[id] = {
        lab: { sampleid: id },
        source: { field: { name: row.field }, farm: { name: row.farm } },
        results,
      };
    }
    return {
      _type: 'application/vnd.modus.slim.v1.0+json',
      type: 'soil',
      date: row.date || `${row.year || '2012'}-01-01`,
      lab: { name: 'A & L Great Lakes Laboratories' },
      source: {
        grower: { name: row.grower || 'Ault Farms' },
        farm: { name: row.farm },
        field: { name: row.field },
      },
      samples,
    };
  }).filter((slim) => Object.keys(slim.samples).length > 0);
}

function attachStageC(slims, gpsIndex) {
  const stats = { copy: 0, synth: 0, skip: 0 };
  for (const slim of slims) {
    const year = Number(yearFromDate(slim.date));
    if (year >= 2022) continue;
    const already = Object.values(slim.samples || {}).filter((s) => s.geolocation?.lat != null).length;
    if (already > 0) continue;
    const fieldKey = slimFieldKey(slim);
    const laterPoints = lookupPoints(gpsIndex, String(year || ''), fieldKey);
    if (!laterPoints.length) {
      stats.skip += 1;
      continue;
    }
    const result = synthesizeGps({
      laterPoints,
      samples: sampleEntries(slim),
    });
    if (result.mode === 'copy-by-id') stats.copy += 1;
    else if (result.placed > 0) stats.synth += 1;
    else stats.skip += 1;
  }
  return stats;
}

async function main() {
  console.log('Soil Test root:', SOIL_ROOT);
  const files = await walkFiles(SOIL_ROOT);
  const xmlFiles = files.filter((f) => {
    const n = f.toLowerCase();
    if (!n.endsWith('.xml')) return false;
    return /20(22|23|24|25)_soiltests/.test(n.replace(/\\/g, '/'));
  });
  console.log('XML files', xmlFiles.length);

  console.log('Loading sampling shapefiles…');
  const gpsIndex = await loadSamplingPoints(SOIL_ROOT);
  console.log('Sampling layers', gpsIndex.layers.length);

  const xmlSlims = await convertXmlFiles(xmlFiles);
  console.log('Slim documents from XML', xmlSlims.length);
  const stageA = attachStageA(xmlSlims, gpsIndex);
  console.log('Stage A GPS attach', stageA);

  let pdfSlims = [];
  try {
    const raw = JSON.parse(await fs.readFile(PDF_JSON, 'utf8'));
    pdfSlims = loadPdfSlims(raw);
    console.log('PDF slims', pdfSlims.length);
  } catch {
    console.log('No pdf-extract.json yet (run extract_pdf.py). Continuing with 2022–2025 only.');
  }

  const stageC = attachStageC(pdfSlims, gpsIndex);
  console.log('Stage C synthetic GPS', stageC);

  const all = [...xmlSlims, ...pdfSlims];
  if (!all.length) throw new Error('No Slim documents produced');
  const built = await convertFile.buildTotsZip(all);
  await fs.writeFile(OUT, Buffer.from(built.data));
  console.log(`Wrote ${OUT} (${built.workbookCount} workbooks, ${all.length} Slim docs)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
