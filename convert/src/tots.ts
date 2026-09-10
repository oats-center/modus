import debug from 'debug';
import md5 from 'md5';
import { isTots, parseTots } from '@treeoftables/lib';
import type { ParsedTotsCollection, ParsedTotsObject } from '@treeoftables/lib';
import type Slim from '@oada/types/modus/slim/v1/0.js';
import { parseColumnHeaderName } from './csv.js';
import type { InputFile, ModusJSONConversionResult } from './json.js';

const info = debug('@modusjs/convert#tots:info');
const warn = debug('@modusjs/convert#tots:warn');

const SAMPLE_META_KEYS = new Set([
  'sample_id',
  'lab_sample_id',
  'container_id',
  'source_sample_id',
  'grower_name',
  'grower_id',
  'farm_name',
  'farm_id',
  'field_name',
  'field_id',
  'depth_top',
  'depth_bottom',
  'depth_units',
  'latitude',
  'longitude',
]);

const TOY_ANALYTE_MAP: Record<string, { analyte: string; units?: string }> = {
  ph: { analyte: 'pH', units: 'none' },
  organic_matter_pct: { analyte: 'OM', units: '%' },
  cec_meq_100g: { analyte: 'CEC', units: 'meq/100 g' },
  phosphorus_ppm: { analyte: 'P', units: 'ppm' },
  potassium_ppm: { analyte: 'K', units: 'ppm' },
};

export type TotsProvenance = {
  totsPath: string;
  pathContext: Record<string, string | number>;
  leafPath: string;
};

export type TotsConversionResult = ModusJSONConversionResult & {
  tots?: TotsProvenance;
};

export function slugifyField(value: string | undefined): string {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

export function yearFromDate(date: string | undefined): string {
  const match = String(date || '').match(/^(\d{4})/);
  return match?.[1] || 'unknown-year';
}

function setIf(obj: any, path: string[], value: any) {
  if (value === undefined || value === null || value === '') return;
  let cursor = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i]!;
    cursor[key] = cursor[key] || {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]!] = value;
}

function resultId(sampleId: string, result: Record<string, unknown>): string {
  return `${sampleId}-${md5(JSON.stringify(result))}`;
}

function toyDepth(depthIn: string | undefined): { top?: number; bottom?: number; units?: string; name?: string } | undefined {
  if (!depthIn) return undefined;
  const match = String(depthIn).match(/(\d+)\s*[-to]+\s*(\d+)\s*(in|cm|mm)?/i);
  if (!match) return { name: String(depthIn) };
  return {
    top: Number(match[1]),
    bottom: Number(match[2]),
    units: (match[3] || 'in').toLowerCase(),
    name: String(depthIn),
  };
}

function toySoilToSlim(parsed: ParsedTotsObject): Slim {
  const data: any = parsed.data || {};
  const sampleMeta = data.sample || {};
  const slim: any = {
    _type: 'application/vnd.modus.slim.v1.0+json',
    type: 'soil',
    date: sampleMeta.sample_date || '',
    lab: { name: sampleMeta.lab_name },
    source: { field: { id: sampleMeta.field_id } },
    samples: {},
  };
  for (const row of data.results || []) {
    const sampleId = String(row.sample_id || Object.keys(slim.samples).length + 1);
    const results: Record<string, any> = {};
    for (const [key, mapped] of Object.entries(TOY_ANALYTE_MAP)) {
      if (row[key] === undefined || row[key] === '') continue;
      const result = { analyte: mapped.analyte, units: mapped.units, value: row[key] };
      results[resultId(sampleId, result)] = result;
    }
    slim.samples[sampleId] = {
      lab: { sampleid: sampleId },
      depth: toyDepth(row.depth_in),
      results,
    };
  }
  return slim as Slim;
}

function productionSoilToSlim(parsed: ParsedTotsObject): Slim {
  const data: any = parsed.data || {};
  const event = data.event || {};
  const units = (parsed.meta as any)?.samples?.units || {};
  const modusTestIds = (parsed.meta as any)?.samples?.modusTestIds || {};
  const slim: any = {
    _type: 'application/vnd.modus.slim.v1.0+json',
    type: 'soil',
    date: event.date || '',
    id: event.event_id,
    lab: {},
    source: {},
    samples: {},
  };
  setIf(slim, ['lab', 'name'], event.lab_name);
  setIf(slim, ['lab', 'id', 'value'], event.lab_id);
  setIf(slim, ['lab', 'report', 'id'], event.lab_report_id);
  setIf(slim, ['lab', 'dateReceived'], event.date_received);
  setIf(slim, ['lab', 'dateProcessed'], event.date_processed);
  setIf(slim, ['source', 'grower', 'name'], event.grower_name);
  setIf(slim, ['source', 'grower', 'id'], event.grower_id);
  setIf(slim, ['source', 'farm', 'name'], event.farm_name);
  setIf(slim, ['source', 'farm', 'id'], event.farm_id);
  setIf(slim, ['source', 'field', 'name'], event.field_name);
  setIf(slim, ['source', 'field', 'id'], event.field_id);
  setIf(slim, ['lab', 'clientAccount', 'name'], event.client_name);
  setIf(slim, ['lab', 'clientAccount', 'accountNumber'], event.client_account_number);
  setIf(slim, ['lab', 'clientAccount', 'company'], event.client_company);

  for (const row of data.samples || []) {
    const sampleId = String(row.sample_id || Object.keys(slim.samples).length + 1);
    const sample: any = { results: {} };
    setIf(sample, ['lab', 'sampleid'], row.lab_sample_id || sampleId);
    setIf(sample, ['lab', 'containerid'], row.container_id);
    setIf(sample, ['source', 'sampleid'], row.source_sample_id);
    setIf(sample, ['source', 'grower', 'name'], row.grower_name || event.grower_name);
    setIf(sample, ['source', 'farm', 'name'], row.farm_name || event.farm_name);
    setIf(sample, ['source', 'field', 'name'], row.field_name || event.field_name);
    if (row.depth_top !== undefined || row.depth_bottom !== undefined) {
      sample.depth = {
        top: row.depth_top,
        bottom: row.depth_bottom,
        units: row.depth_units,
      };
    }
    if (row.latitude !== undefined && row.longitude !== undefined) {
      sample.geolocation = { lat: row.latitude, lon: row.longitude };
    }
    for (const [key, value] of Object.entries(row)) {
      if (SAMPLE_META_KEYS.has(key)) continue;
      if (value === undefined || value === '') continue;
      const parsedHeader = parseColumnHeaderName(key);
      const result: any = {
        analyte: parsedHeader.element || key,
        value,
      };
      const unitsFromMeta = units[key];
      const modusFromMeta = modusTestIds[key];
      if (modusFromMeta || parsedHeader.modusid) result.modusTestID = modusFromMeta || parsedHeader.modusid;
      if (unitsFromMeta || parsedHeader.units) result.units = unitsFromMeta || parsedHeader.units;
      sample.results[resultId(sampleId, result)] = result;
    }
    slim.samples[sampleId] = sample;
  }
  if (!slim.id) slim.id = md5(JSON.stringify({ date: slim.date, samples: Object.keys(slim.samples) }));
  return slim as Slim;
}

export function totsParsedToSlim(parsed: ParsedTotsObject): Slim {
  const leafPath = String(parsed.tots?.leafPath || '');
  if (leafPath.includes('/soil_tests/')) return toySoilToSlim(parsed);
  return productionSoilToSlim(parsed);
}

export function provenanceFromParsed(parsed: ParsedTotsObject): TotsProvenance {
  const tots = parsed.tots as { input?: { totsPath?: string }; pathContext?: Record<string, string | number>; leafPath?: string } | undefined;
  return {
    totsPath: String(tots?.input?.totsPath || ''),
    pathContext: tots?.pathContext || {},
    leafPath: String(tots?.leafPath || ''),
  };
}

function fieldKey(sample: any, eventField?: string): string {
  return sample?.source?.field?.name
    || sample?.source?.field?.id
    || eventField
    || 'unknown';
}

export type TotsTreeItem = {
  totsPath: string;
  data: Record<string, any>;
  meta: Record<string, any>;
};

type TotsGroup = {
  year: string;
  slug: string;
  event: Record<string, any>;
  rows: Array<{ sampleId: string; sample: any; doc: any }>;
  usedIds: Set<string>;
};

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function uniqueSampleId(used: Set<string>, base: string): string {
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

function eventFromDoc(doc: any, sample: any): Record<string, any> {
  return {
    date: doc.date,
    event_id: doc.id,
    lab_name: doc.lab?.name,
    lab_id: doc.lab?.id?.value,
    lab_report_id: doc.lab?.report?.id,
    date_received: doc.lab?.dateReceived,
    date_processed: doc.lab?.dateProcessed,
    grower_name: doc.source?.grower?.name,
    farm_name: doc.source?.farm?.name,
    field_name: sample?.source?.field?.name || doc.source?.field?.name,
    field_id: sample?.source?.field?.id || doc.source?.field?.id,
    client_name: doc.lab?.clientAccount?.name,
    client_account_number: doc.lab?.clientAccount?.accountNumber,
    client_company: doc.lab?.clientAccount?.company,
  };
}

export function slimToTotsItems(slim: Slim | Slim[]): TotsTreeItem[] {
  const docs = (Array.isArray(slim) ? slim : [slim]) as any[];
  const groups = new Map<string, TotsGroup>();
  for (const doc of docs) {
    const year = yearFromDate(doc.date);
    const defaultField = doc.source?.field?.name || doc.source?.field?.id;
    for (const [sampleId, sample] of Object.entries(doc.samples || {}) as Array<[string, any]>) {
      const slug = slugifyField(fieldKey(sample, defaultField));
      const key = `${year}/${slug}`;
      if (!groups.has(key)) {
        groups.set(key, { year, slug, event: eventFromDoc(doc, sample), rows: [], usedIds: new Set() });
      }
      const group = groups.get(key)!;
      const baseId = firstNonEmpty(
        sampleId,
        sample?.lab?.sampleid,
        sample?.source?.sampleid,
        `sample-${group.rows.length + 1}`,
      );
      group.rows.push({ sampleId: uniqueSampleId(group.usedIds, baseId), sample, doc });
    }
  }
  return [...groups.values()].map((group) => {
    const units: Record<string, string> = {};
    const modusTestIds: Record<string, string> = {};
    const samples = group.rows.map(({ sampleId, sample, doc }) => {
      const row: Record<string, any> = {
        sample_id: sampleId,
        lab_sample_id: sample.lab?.sampleid,
        container_id: sample.lab?.containerid,
        source_sample_id: sample.source?.sampleid,
        grower_name: sample.source?.grower?.name || doc.source?.grower?.name,
        farm_name: sample.source?.farm?.name || doc.source?.farm?.name,
        field_name: sample.source?.field?.name || doc.source?.field?.name,
        depth_top: sample.depth?.top,
        depth_bottom: sample.depth?.bottom,
        depth_units: sample.depth?.units,
        latitude: sample.geolocation?.lat,
        longitude: sample.geolocation?.lon,
      };
      for (const result of Object.values(sample.results || {}) as any[]) {
        const header = result.analyte || 'result';
        row[header] = result.value;
        if (result.units) units[header] = result.units;
        if (result.modusTestID) modusTestIds[header] = result.modusTestID;
      }
      return row;
    });
    return {
      totsPath: `ag/lab-results/soil/${group.year}/${group.slug}.xlsx`,
      data: {
        event: group.event,
        samples,
      },
      meta: {
        samples: {
          ...(Object.keys(units).length ? { units } : {}),
          ...(Object.keys(modusTestIds).length ? { modusTestIds } : {}),
        },
      },
    };
  });
}

export function toTotsInput(file: InputFile): { buffer: ArrayBuffer | Uint8Array; filename: string } | null {
  const filename = file.filename || 'upload.xlsx';
  if (file.arrbuf) return { buffer: file.arrbuf as ArrayBuffer, filename };
  if (file.base64) {
    if (typeof Buffer !== 'undefined') {
      return { buffer: Buffer.from(file.base64, 'base64'), filename };
    }
    const raw = globalThis.atob(file.base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    return { buffer: bytes, filename };
  }
  return null;
}

export async function inputFileIsTots(file: InputFile): Promise<boolean> {
  if (file.format === 'tots') return true;
  const input = toTotsInput(file);
  if (!input) return false;
  return isTots(input);
}

function asItems(parsed: ParsedTotsObject | ParsedTotsCollection): ParsedTotsObject[] {
  return 'items' in parsed ? parsed.items : [parsed];
}

export async function totsFilesToJson(files: InputFile[]): Promise<TotsConversionResult[]> {
  const results: TotsConversionResult[] = [];
  for (const file of files) {
    const input = toTotsInput(file);
    if (!input) {
      warn('Skipping ToTs file without binary contents:', file.filename);
      continue;
    }
    info('Parsing ToTs input', file.filename);
    const parsed = await parseTots(input);
    for (const [index, item] of asItems(parsed).entries()) {
      const slim = totsParsedToSlim(item);
      const prov = provenanceFromParsed(item);
      const output_filename = (prov.totsPath || file.filename || 'modus_results.xlsx')
        .replace(/\.xlsx$/i, '.json')
        .replace(/[^a-zA-Z0-9._\\/-]+/g, '_');
      results.push({
        original_filename: file.filename,
        original_type: 'tots',
        output_filename: index === 0 ? output_filename : output_filename.replace(/\.json$/, `_${index}.json`),
        modus: slim,
        tots: prov,
      });
    }
  }
  return results;
}
