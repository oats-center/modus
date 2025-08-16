import jszip from 'jszip';
import shp from 'shpjs';
import type { FeatureCollection } from 'geojson';
import { toSlim as geojsonToSlim } from './geojson.js';
import type Slim from '@oada/types/modus/slim/v1/0.js';
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
export async function toSlimFromLoose(parts: LoosePart[], labConfigs?: any): Promise<{ base: string, slims: Slim[] } | null> {
  if (!parts || parts.length === 0) return null;
  const base = baseFromFilename(parts[0]!.filename);
  const hasMain = parts.some(p => /\.shp$/i.test(p.filename));
  if (!hasMain) return null;
  const zip = new jszip();
  for (const p of parts) {
    if (!p.arrbuf) continue;
    const nameOnly = p.filename.replace(/^(.*[\/\\])*/g, '');
    zip.file(nameOnly, p.arrbuf as any);
  }
  const zipBuf = await zip.generateAsync({ type: 'arraybuffer' });
  let fc: any = await shp(zipBuf);
  if (Array.isArray(fc)) {
    const features = fc.flatMap((g: any) => (g && g.features) ? g.features : []);
    fc = { type: 'FeatureCollection', features } as FeatureCollection;
  }
  const slims = geojsonToSlim(fc, labConfigs, base);
  return { base, slims };
}

// Given a zip file buffer containing one or more shapefile sets, return a map of basename->Slim[]
export async function toSlimFromZip(zipData: ArrayBuffer, labConfigs?: any): Promise<Map<string, Slim[]>> {
  const results = new Map<string, Slim[]>();
  const zip = await jszip.loadAsync(zipData);
  const shpEntries = Object.values(zip.files).filter(f => !f.dir && f.name.match(/\.shp$/i));
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
      const features = fc.flatMap((g: any) => (g && g.features) ? g.features : []);
      fc = { type: 'FeatureCollection', features } as FeatureCollection;
    }
    const slims = geojsonToSlim(fc, labConfigs, base);
    results.set(base, slims);
  }
  return results;
}

