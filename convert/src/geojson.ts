import debug from 'debug';
// @ts-expect-error need to make types for wicket...
import wicket from 'wicket';
import type { Feature, FeatureCollection, GeoJSON, Geometry } from 'geojson';
import { parseCsv } from './csv.js';
import type Slim from '@oada/types/modus/slim/v1/0.js';

const error = debug('@modusjs/convert#geojson:error');
const warn = debug('@modusjs/convert#geojson:warn');
const info = debug('@modusjs/convert#geojson:info');
const trace = debug('@modusjs/convert#geojson:trace');

const W = new wicket.Wkt();

export function geometryToWkt(geom: Geometry | null | undefined): string | undefined {
  if (!geom) return undefined;
  try {
    // wicket expects GeoJSON geometry object
    // @ts-ignore
    W.fromJson(geom);
    return W.write();
  } catch (e) {
    warn('Failed to convert geometry to WKT:', e);
    return undefined;
  }
}

// Convert a GeoJSON FeatureCollection to a CSV string.
// - Each feature becomes a row
// - Headers are the union of all properties across features, plus WKT column
export function geojsonToCsv(fc: FeatureCollection): string {
  const headersSet = new Set<string>();
  const features: Feature[] = fc.features || [];

  // Collect all property keys
  for (const f of features) {
    const props = (f && f.properties) || {} as Record<string, any>;
    for (const k of Object.keys(props)) headersSet.add(k);
  }
  // Always include WKT column for geometry
  headersSet.add('WKT');

  const headers = Array.from(headersSet);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const rows: string[] = [];
  rows.push(headers.map(escape).join(','));
  for (const f of features) {
    const props = (f && f.properties) || {} as Record<string, any>;
    const wkt = geometryToWkt(f.geometry);
    const row = headers.map((h) => h === 'WKT' ? wkt ?? '' : props[h]);
    rows.push(row.map(escape).join(','));
  }
  return rows.join('\n');
}

// Convert GeoJSON FeatureCollection to Slim[] via CSV pipeline
export function toSlim(fc: FeatureCollection, labConfigs?: any, filenameBase = 'shapefile'): Slim[] {
  const csvStr = geojsonToCsv(fc);
  // Reuse CSV parsing pipeline. Filename used only for downstream naming metadata.
  return parseCsv({ str: csvStr, format: 'generic', filename: `${filenameBase}.csv`, labConfigs });
}
