import type { SessionResult } from '../state/state';
import { canonicalFieldKey, displayFieldName, yearFromDate } from './fieldKey';

export type SampleRow = {
  sampleId: string;
  depth?: string;
  lat?: number;
  lon?: number;
  gpsSynthetic?: boolean;
  values: Record<string, number | string>;
  units: Record<string, string>;
};

export type GpsPoint = {
  sampleId: string;
  lat: number;
  lon: number;
  date: string;
  fieldKey: string;
  fieldLabel: string;
  values: Record<string, number>;
  synthetic?: boolean;
};

export type FieldYear = {
  key: string;
  year: string;
  fieldKey: string;
  fieldLabel: string;
  farmLabel?: string;
  date?: string;
  sampleCount: number;
  hasGps: boolean;
  analytes: string[];
  rows: SampleRow[];
  points: GpsPoint[];
};

export type SoilIndex = {
  fieldYears: FieldYear[];
  fields: Array<{ key: string; label: string; hasGps: boolean }>;
  hasAnyGps: boolean;
  analytes: string[];
  minDate?: string;
  maxDate?: string;
};

type Accumulator = {
  year: string;
  fieldKey: string;
  fieldLabel: string;
  farmLabel?: string;
  date?: string;
  rows: SampleRow[];
  usedIds: Set<string>;
};

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function uniqueId(used: Set<string>, base: string): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  const next = `${base}-${n}`;
  used.add(next);
  return next;
}

function fieldFromSample(sample: any, slim: any): string {
  return firstNonEmpty(
    sample?.source?.field?.name,
    sample?.source?.field?.id,
    slim?.source?.field?.name,
    slim?.source?.field?.id,
  );
}

function farmFromSample(sample: any, slim: any): string {
  return firstNonEmpty(
    sample?.source?.farm?.name,
    sample?.source?.farm?.id,
    slim?.source?.farm?.name,
    slim?.source?.farm?.id,
  );
}

function parseCoord(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function sampleGps(sample: any): { lat: number; lon: number; synthetic: boolean } | undefined {
  const geo = sample?.geolocation || {};
  let lat = parseCoord(geo.lat);
  let lon = parseCoord(geo.lon);
  const coords = geo.geojson?.geometry?.coordinates;
  if ((lat === undefined || lon === undefined) && Array.isArray(coords) && coords.length >= 2) {
    lon = parseCoord(coords[0]);
    lat = parseCoord(coords[1]);
  }
  if (lat === undefined || lon === undefined) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  const id = String(geo.id || '');
  const comment = String(sample?.comment || sample?.lab?.comment || '');
  const synthetic = id === 'synthetic-from-grid' || /synthetic/i.test(comment);
  return { lat, lon, synthetic };
}

function depthLabel(sample: any): string | undefined {
  const depth = sample?.depth;
  if (!depth) return undefined;
  if (depth.name) return String(depth.name);
  const top = depth.top;
  const bottom = depth.bottom;
  if (top === undefined && bottom === undefined) return undefined;
  const units = depth.units || '';
  return `${top ?? ''}–${bottom ?? ''} ${units}`.trim();
}

function isGpsSynthetic(sample: any, gps: { synthetic: boolean }): boolean {
  return gps.synthetic;
}

const ANALYTE_RANK = ['pH', 'OM', 'P', 'K', 'CEC', 'Ca', 'Mg', 'S', 'Zn', 'Mn', 'B', 'Cu', 'Fe'];

function analyteRank(name: string): number {
  const lower = name.toLowerCase();
  const idx = ANALYTE_RANK.findIndex((item) => lower === item.toLowerCase() || lower.startsWith(item.toLowerCase()));
  return idx < 0 ? 100 + name.toLowerCase().charCodeAt(0) : idx;
}

function sortAnalytes(names: Iterable<string>): string[] {
  return [...names].sort((a, b) => analyteRank(a) - analyteRank(b) || a.localeCompare(b));
}

function numericValues(values: Record<string, number | string>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(values)) {
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
}

export function indexSessionResults(sessionResults: Record<string, SessionResult>): SoilIndex {
  const groups = new Map<string, Accumulator>();
  for (const result of Object.values(sessionResults)) {
    const slim: any = result.slim;
    if (!slim) continue;
    const year = yearFromDate(slim.date);
    for (const [sampleId, sample] of Object.entries(slim.samples || {}) as Array<[string, any]>) {
      const fieldLabelRaw = fieldFromSample(sample, slim);
      const fieldKey = canonicalFieldKey(fieldLabelRaw);
      const key = `${year}::${fieldKey}`;
      if (!groups.has(key)) {
        groups.set(key, {
          year,
          fieldKey,
          fieldLabel: displayFieldName(fieldLabelRaw),
          farmLabel: farmFromSample(sample, slim) || undefined,
          date: slim.date,
          rows: [],
          usedIds: new Set(),
        });
      }
      const group = groups.get(key)!;
      if (slim.date && (!group.date || String(slim.date) > String(group.date))) group.date = slim.date;
      const id = uniqueId(group.usedIds, firstNonEmpty(sampleId, sample?.lab?.sampleid, sample?.source?.sampleid, `sample-${group.rows.length + 1}`));
      const values: Record<string, number | string> = {};
      const units: Record<string, string> = {};
      for (const resultRow of Object.values(sample?.results || {}) as any[]) {
        const name = String(resultRow?.analyte || 'result').trim() || 'result';
        if (resultRow?.value === undefined || resultRow?.value === null || resultRow?.value === '') continue;
        values[name] = resultRow.value;
        if (resultRow.units) units[name] = String(resultRow.units);
      }
      const gps = sampleGps(sample);
      const row: SampleRow = {
        sampleId: id,
        depth: depthLabel(sample),
        values,
        units,
      };
      if (gps) {
        row.lat = gps.lat;
        row.lon = gps.lon;
        row.gpsSynthetic = isGpsSynthetic(sample, gps);
      }
      group.rows.push(row);
    }
  }

  const fieldYears: FieldYear[] = [...groups.values()].map((group) => {
    const analytes = sortAnalytes(new Set(group.rows.flatMap((row) => Object.keys(row.values))));
    const points: GpsPoint[] = [];
    for (const row of group.rows) {
      if (row.lat === undefined || row.lon === undefined) continue;
      points.push({
        sampleId: row.sampleId,
        lat: row.lat,
        lon: row.lon,
        date: group.date || `${group.year}-01-01`,
        fieldKey: group.fieldKey,
        fieldLabel: group.fieldLabel,
        values: numericValues(row.values),
        synthetic: row.gpsSynthetic,
      });
    }
    return {
      key: `${group.year}::${group.fieldKey}`,
      year: group.year,
      fieldKey: group.fieldKey,
      fieldLabel: group.fieldLabel,
      farmLabel: group.farmLabel,
      date: group.date,
      sampleCount: group.rows.length,
      hasGps: points.length > 0,
      analytes,
      rows: group.rows,
      points,
    };
  }).sort((a, b) => b.year.localeCompare(a.year) || a.fieldLabel.localeCompare(b.fieldLabel));

  const fieldMap = new Map<string, { key: string; label: string; hasGps: boolean }>();
  for (const item of fieldYears) {
    const prev = fieldMap.get(item.fieldKey);
    if (!prev) fieldMap.set(item.fieldKey, { key: item.fieldKey, label: item.fieldLabel, hasGps: item.hasGps });
    else if (item.hasGps) prev.hasGps = true;
  }

  const dates = fieldYears.map((item) => item.date).filter(Boolean) as string[];
  dates.sort();

  return {
    fieldYears,
    fields: [...fieldMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
    hasAnyGps: fieldYears.some((item) => item.hasGps),
    analytes: sortAnalytes(new Set(fieldYears.flatMap((item) => item.analytes))),
    minDate: dates[0],
    maxDate: dates[dates.length - 1],
  };
}

export function defaultAnalyte(names: string[]): string | undefined {
  if (names.length < 1) return undefined;
  const pick = names.find((name) => /^(p|phosphorus)$/i.test(name.trim()) || /bray\s*p\s*1/i.test(name))
    || names.find((name) => /^ph$/i.test(name.trim()))
    || names.find((name) => /^om$/i.test(name.trim()) || /organic/i.test(name))
    || names[0];
  return pick;
}
