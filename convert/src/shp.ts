import jszip from 'jszip';
import shp from 'shpjs';
import type { FeatureCollection } from 'geojson';
import { toSlim as geojsonToSlim } from './geojson.js';
import type Slim from '@oada/types/modus/slim/v1/0.js';
import type { InputFile } from './json.js';
import type { LabConfig } from './labs/index.js';
import debug from 'debug';

const info = debug('@modusjs/convert#shp:info');
const trace = debug('@modusjs/convert#shp:trace');
const warn = debug('@modusjs/convert#shp:warn');

export type LoosePart = {
  filename: string; // may include path; basename is derived
  arrbuf?: ArrayBuffer; // required for inclusion in in-memory zip
};

function baseFromFilename(name: string): string {
  const nameOnly = name.replace(/^(.*[\/\\])*/g, '');
  return nameOnly.replace(/\.(shp|dbf|shx|prj|cpg)$/i, '');
}

// Convert a set of loose shapefile parts (same basename) to Slim[] by zipping in-memory and using shpjs
export async function toSlimFromLoose(parts: LoosePart[], labConfigs?: LabConfig[]): Promise<{ base: string; slims: Slim[] } | null> {
  if (!parts || parts.length === 0) return null;
  const base = baseFromFilename(parts[0]!.filename);
  const hasMain = parts.some((p) => /\.shp$/i.test(p.filename));
  if (!hasMain) {
    warn('toSlimFromLoose: no .shp file found among parts for base', base);
    return null;
  }

  const zip = new jszip();
  for (const p of parts) {
    if (!p.arrbuf) continue;
    const nameOnly = p.filename.replace(/^(.*[\/\\])*/g, '');
    zip.file(nameOnly, p.arrbuf as any);
  }
  const zipBuf = await zip.generateAsync({ type: 'arraybuffer' });
  let fc: any = await shp(zipBuf);
  if (Array.isArray(fc)) {
    const features = fc.flatMap((g: any) => (g && g.features ? g.features : []));
    fc = { type: 'FeatureCollection', features } as FeatureCollection;
  }
  // Debug: log the GeoJSON produced from this shapefile group
  try {
    const featureCount = Array.isArray((fc as FeatureCollection).features)
      ? (fc as FeatureCollection).features.length
      : 0;
    info('toSlimFromLoose: GeoJSON for base', base, 'has', featureCount, 'features:', fc);
  } catch (e) {
    warn('toSlimFromLoose: failed to log GeoJSON for base', base, e);
  }
  const slims = geojsonToSlim(fc, labConfigs, base);
  return { base, slims };
}

// Given a zip file buffer containing one or more shapefile sets, return a map of basename->Slim[]
// NOTE: This helper is currently unused by the main JSON pipeline, which prefers loose parts
// via flattenZips() + looseFilesToGroups(). It is kept for potential direct-zip use cases.
export async function toSlimFromZip(zipData: ArrayBuffer, labConfigs?: LabConfig[]): Promise<Map<string, Slim[]>> {
  const results = new Map<string, Slim[]>();
  const zip = await jszip.loadAsync(zipData);
  const shpEntries = Object.values(zip.files).filter((f) => !f.dir && f.name.match(/\.shp$/i));

  for (const shpFile of shpEntries) {
    const base = shpFile.name.replace(/^(.*[\/\\])*/g, '').replace(/\.shp$/i, '');
    const subzip = new jszip();

    // include primary and sidecars if present
    const addIfExists = async (path: string) => {
      const entry = zip.files[path];
      if (!entry) return;
      const ab = await entry.async('arraybuffer');
      const nameOnly = path.replace(/^(.*[\/\\])*/g, '');
      subzip.file(nameOnly, ab);
    };

    const shpPath = shpFile.name;
    const dbfPath = shpPath.replace(/\.shp$/i, '.dbf');
    const shxPath = shpPath.replace(/\.shp$/i, '.shx');
    const prjPath = shpPath.replace(/\.shp$/i, '.prj');
    const cpgPath = shpPath.replace(/\.shp$/i, '.cpg');
    await addIfExists(shpPath);
    await addIfExists(dbfPath);
    await addIfExists(shxPath);
    await addIfExists(prjPath);
    await addIfExists(cpgPath);

    const subZipBuf = await subzip.generateAsync({ type: 'arraybuffer' });
    let fc: any = await shp(subZipBuf);
    if (Array.isArray(fc)) {
      const features = fc.flatMap((g: any) => (g && g.features ? g.features : []));
      fc = { type: 'FeatureCollection', features } as FeatureCollection;
    }
    // Debug: log the GeoJSON produced from this shapefile set inside the zip
    try {
      const featureCount = Array.isArray((fc as FeatureCollection).features)
        ? (fc as FeatureCollection).features.length
        : 0;
      info('toSlimFromZip: GeoJSON for base', base, 'has', featureCount, 'features:', fc);
    } catch (e) {
      warn('toSlimFromZip: failed to log GeoJSON for base', base, e);
    }
    const slims = geojsonToSlim(fc, labConfigs, base);
    results.set(base, slims);
  }

  return results;
}

// Group loose InputFile entries representing shapefile sidecar files into logical shapefile inputs.
// Non-shapefile files are passed through unchanged.
export function looseFilesToGroups(files: InputFile[]): InputFile[] {
  const shpExtRe = /\.(shp|dbf|shx|prj|cpg)$/i;
  const groups = new Map<string, InputFile[]>();
  const others: InputFile[] = [];

  for (const f of files) {
    const name = f.filename || '';
    if (!shpExtRe.test(name)) {
      others.push(f);
      continue;
    }

    // Strip directories and extension to get the base name
    const base = baseFromFilename(name);
    const arr = groups.get(base);
    if (arr) arr.push(f);
    else groups.set(base, [f]);
  }

  const grouped: InputFile[] = [];

  for (const [base, parts] of groups.entries()) {
    const hasMain = parts.some((p) => /\.shp$/i.test(p.filename));
    if (!hasMain) {
      warn('looseFilesToGroups: skipping group without .shp main file for base', base);
      continue;
    }

    // Use the first part as a template for format/etc., but normalize filename to `<base>.shp`.
    const template = parts[0]!;
    const groupedFile: InputFile = {
      ...template,
      filename: `${base}.shp`,
      shpParts: parts,
    };
    grouped.push(groupedFile);
  }

  // Return non-shapefile files first to preserve approximate original ordering, then grouped shapefiles.
  return [...others, ...grouped];
}

// Convert a grouped shapefile InputFile into Slim[] using the standard shapefile->GeoJSON->CSV->Slim pipeline.
export async function shpToSlim(file: InputFile, labConfigs?: LabConfig[]): Promise<Slim[]> {
  // Prefer explicit grouped parts when present
  if (file.shpParts && file.shpParts.length > 0) {
    const parts: LoosePart[] = file.shpParts.map((p) => ({
      filename: p.filename,
      arrbuf: p.arrbuf as ArrayBuffer | undefined,
    }));
    const res = await toSlimFromLoose(parts, labConfigs);
    return res?.slims ?? [];
  }

  // Fallback: treat the file itself as a standalone .shp with no sidecars
  if (file.arrbuf) {
    const parts: LoosePart[] = [
      {
        filename: file.filename,
        arrbuf: file.arrbuf as ArrayBuffer,
      },
    ];
    const res = await toSlimFromLoose(parts, labConfigs);
    return res?.slims ?? [];
  }

  warn('shpToSlim: no shpParts or arrbuf found for file', file.filename);
  return [];
}

