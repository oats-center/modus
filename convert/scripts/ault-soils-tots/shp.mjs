import fs from 'node:fs/promises';
import path from 'node:path';
import jszip from 'jszip';
import shp from 'shpjs';
import { fieldKeyFromShapefileName, isSamplingShapefile, normalizeFieldKey, yearFromShapefileName } from './field.mjs';

function groupParts(files) {
  const groups = new Map();
  for (const file of files) {
    if (!/\.(shp|dbf|shx|prj|cpg)$/i.test(file)) continue;
    const base = file.replace(/\.(shp|dbf|shx|prj|cpg)$/i, '');
    const list = groups.get(base) || [];
    list.push(file);
    groups.set(base, list);
  }
  return groups;
}

async function parseGroup(files) {
  const zip = new jszip();
  let shpName = '';
  for (const file of files) {
    const buf = await fs.readFile(file);
    const name = path.basename(file);
    zip.file(name, buf);
    if (/\.shp$/i.test(name)) shpName = name;
  }
  if (!shpName) return null;
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer' });
  let fc = await shp(zipBuf);
  if (Array.isArray(fc)) {
    const features = fc.flatMap((g) => (g && g.features ? g.features : []));
    fc = { type: 'FeatureCollection', features };
  }
  const year = yearFromShapefileName(shpName);
  const fieldKey = fieldKeyFromShapefileName(shpName);
  const points = [];
  for (const feature of fc.features || []) {
    const geom = feature.geometry;
    if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) continue;
    const [lon, lat] = geom.coordinates;
    const props = feature.properties || {};
    const sampleId = String(props.SampleID || props.sampleid || props.SAMPLEID || props.SequenceID || '').trim();
    const values = {};
    for (const [key, value] of Object.entries(props)) {
      const n = Number(value);
      if (Number.isFinite(n) && !/id|season|date/i.test(key)) values[key] = n;
    }
    if (props.CropSeason) {
      // keep
    }
    points.push({
      lat,
      lon,
      sampleId,
      year: String(props.CropSeason || year),
      fieldKey,
      values,
      source: shpName,
    });
  }
  return { fieldKey, year: year || points[0]?.year, points, source: shpName };
}

export async function loadSamplingPoints(rootDir) {
  const all = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const files = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else files.push(full);
    }
    const shpFiles = files.filter((f) => isSamplingShapefile(f));
    const groups = groupParts(files);
    for (const shpFile of shpFiles) {
      const base = shpFile.replace(/\.shp$/i, '');
      const parts = groups.get(base) || [shpFile];
      try {
        const parsed = await parseGroup(parts);
        if (parsed?.points?.length) all.push(parsed);
      } catch (err) {
        console.warn('Failed to parse', shpFile, err.message);
      }
    }
  }
  await walk(rootDir);

  // Combined 2022-2024 zip at the Soil Test root
  const zipPath = path.join(rootDir, '2022-2024_AllSampledPointsShapefiles_BatchPoints_8-15-2025.zip');
  try {
    const buf = await fs.readFile(zipPath);
    const zip = await jszip.loadAsync(buf);
    const names = Object.keys(zip.files).filter((n) => isSamplingShapefile(n));
    const byBase = new Map();
    for (const name of Object.keys(zip.files)) {
      if (zip.files[name].dir) continue;
      const base = name.replace(/\.(shp|dbf|shx|prj|cpg)$/i, '');
      const list = byBase.get(base) || [];
      list.push(name);
      byBase.set(base, list);
    }
    for (const shpName of names) {
      const base = shpName.replace(/\.shp$/i, '');
      const parts = byBase.get(base) || [shpName];
      const sub = new jszip();
      for (const part of parts) {
        const entry = zip.files[part];
        if (!entry) continue;
        sub.file(path.basename(part), await entry.async('nodebuffer'));
      }
      try {
        const zipBuf = await sub.generateAsync({ type: 'nodebuffer' });
        let fc = await shp(zipBuf);
        if (Array.isArray(fc)) {
          const features = fc.flatMap((g) => (g && g.features ? g.features : []));
          fc = { type: 'FeatureCollection', features };
        }
        const fieldKey = fieldKeyFromShapefileName(shpName);
        const year = yearFromShapefileName(shpName);
        const points = [];
        for (const feature of fc.features || []) {
          const geom = feature.geometry;
          if (!geom || geom.type !== 'Point') continue;
          const [lon, lat] = geom.coordinates;
          const props = feature.properties || {};
          const sampleId = String(props.SampleID || props.SequenceID || '').trim();
          const values = {};
          for (const [key, value] of Object.entries(props)) {
            const n = Number(value);
            if (Number.isFinite(n) && !/id|season|date/i.test(key)) values[key] = n;
          }
          points.push({
            lat, lon, sampleId,
            year: String(props.CropSeason || year),
            fieldKey,
            values,
            source: path.basename(shpName),
          });
        }
        if (points.length) all.push({ fieldKey, year: year || points[0]?.year, points, source: shpName });
      } catch (err) {
        console.warn('Failed zip layer', shpName, err.message);
      }
    }
  } catch {
    // optional zip
  }

  const byFieldYear = new Map();
  for (const layer of all) {
    const key = `${layer.year}::${layer.fieldKey}`;
    if (!byFieldYear.has(key) || layer.points.length > byFieldYear.get(key).points.length) {
      byFieldYear.set(key, layer);
    }
  }
  return { layers: [...byFieldYear.values()], byFieldYear };
}

function tokens(key) {
  return String(key || '').split('-').filter((t) => t && !/^\d+$/.test(t) && t !== 'ac' && t.length > 1);
}

function keysCompatible(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a) || a.includes(b) || b.includes(a)) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const setB = new Set(tb);
  const overlap = ta.filter((t) => setB.has(t));
  return overlap.length >= 2;
}

export function lookupPoints(index, year, fieldKey) {
  const key = normalizeFieldKey(fieldKey);
  const exact = index.byFieldYear.get(`${year}::${key}`)
    || index.byFieldYear.get(`${year}::${fieldKey}`);
  if (exact) return exact.points;
  const candidates = index.layers.filter((layer) => keysCompatible(normalizeFieldKey(layer.fieldKey), key));
  if (!candidates.length) return [];
  const sameYear = candidates.filter((layer) => String(layer.year) === String(year));
  const pool = sameYear.length ? sameYear : candidates;
  pool.sort((a, b) => String(b.year).localeCompare(String(a.year)));
  return pool[0].points;
}
