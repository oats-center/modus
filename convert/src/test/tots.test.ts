import debug from 'debug';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isTots as libIsTots, parseTots as libParseTots, serializeTotsTree } from '@treeoftables/lib';
import type * as MainLib from '../index.js';
import type Slim from '@oada/types/modus/slim/v1/0.js';

const info = debug('@modusjs/convert#test-tots:info');
const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  test('Slim to ToTs zip round-trips through json.toJson()');
  const slim = {
    _type: 'application/vnd.modus.slim.v1.0+json',
    type: 'soil',
    date: '2025-03-20',
    id: 'EVT-1',
    lab: { name: 'Midwest Soil Lab', report: { id: 'MSL-1' } },
    source: { grower: { name: 'Ault Family Farms' }, farm: { name: 'Home Farm' }, field: { name: 'North 80' } },
    samples: {
      'N80-A': {
        lab: { sampleid: '21-001' },
        source: { field: { name: 'North 80' } },
        depth: { top: 0, bottom: 6, units: 'in' },
        geolocation: { lat: 41.1, lon: -93.1 },
        results: {
          r1: { analyte: 'P', value: 24, units: 'ppm', modusTestID: 'S-P-B1-1:10.01.03' },
          r2: { analyte: 'pH', value: 6.4, units: 'none', modusTestID: 'S-PH-1:1.02.07' },
        },
      },
    },
  } as unknown as Slim;

  const items = lib.tots.slimToTotsItems(slim);
  if (items.length !== 1) throw new Error(`Expected 1 tots item, got ${items.length}`);
  if (!items[0]!.totsPath.endsWith('2025/north-80.xlsx')) {
    throw new Error(`Unexpected totsPath ${items[0]!.totsPath}`);
  }

  const zip = await serializeTotsTree(items);
  const isTots = await lib.tots.inputFileIsTots({ filename: 'tree.zip', arrbuf: zip });
  if (!isTots) throw new Error('ToTs zip was not detected by inputFileIsTots');

  const results = await lib.json.toJson({ filename: 'tree.zip', arrbuf: zip });
  if (results.length !== 1) throw new Error(`Expected 1 Slim result, got ${results.length}`);
  const out = results[0]!.modus as any;
  if (out.type !== 'soil') throw new Error('Slim type was not soil');
  if (out.date !== '2025-03-20') throw new Error(`Unexpected date ${out.date}`);
  const sample = out.samples['N80-A'];
  if (!sample) throw new Error('Missing sample N80-A');
  const analytes = Object.values(sample.results || {}).map((r: any) => r.analyte).sort();
  if (!analytes.includes('P') || !analytes.includes('pH')) {
    throw new Error(`Missing analytes in round-trip: ${analytes.join(',')}`);
  }
  if (!results[0]!.tots?.pathContext) throw new Error('Missing tots pathContext on conversion result');

  test('Two fields export as two ToTs workbooks');
  const twoFields = {
    ...slim,
    samples: {
      A: { ...slim.samples!['N80-A'], source: { field: { name: 'North 80' } } },
      B: { ...slim.samples!['N80-A'], source: { field: { name: 'South 40' } } },
    },
  } as unknown as Slim;
  const twoItems = lib.tots.slimToTotsItems(twoFields);
  if (twoItems.length !== 2) throw new Error(`Expected 2 field workbooks, got ${twoItems.length}`);

  test('Many Slim docs for the same field and year merge into one workbook');
  const merged = lib.tots.slimToTotsItems([slim, { ...slim, id: 'EVT-2' } as unknown as Slim]);
  if (merged.length !== 1) throw new Error(`Expected merged workbook, got ${merged.length}`);
  if (merged[0]!.data.samples.length !== 2) throw new Error(`Expected 2 samples in merged workbook, got ${merged[0]!.data.samples.length}`);

  test('Empty Slim sample keys still get a non-empty sample_id');
  const emptyKey = {
    ...slim,
    samples: {
      '': {
        ...slim.samples!['N80-A'],
        lab: { sampleid: '' },
        source: { field: { name: 'North 80' }, sampleid: '' },
      },
    },
  } as unknown as Slim;
  const emptyItems = lib.tots.slimToTotsItems(emptyKey);
  const emptyIds = emptyItems[0]!.data.samples.map((row: any) => String(row.sample_id || '').trim());
  if (emptyIds.some((id: string) => !id)) {
    throw new Error(`Expected minted sample_id, got ${JSON.stringify(emptyIds)}`);
  }

  test('Curated demo ToTs zip parses in @treeoftables/lib and reloads through convert');
  const curatedPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../app/public/curateddemo.zip',
  );
  const curatedBuf = readFileSync(curatedPath);
  const curatedResults = await lib.json.toJson({ filename: 'curateddemo.zip', arrbuf: curatedBuf });
  if (curatedResults.length < 1) throw new Error('curateddemo.zip produced no Slim results');
  const totsItems = lib.tots.slimToTotsItems(curatedResults.map((result) => result.modus));
  const curatedZip = await serializeTotsTree(totsItems);
  const detected = await libIsTots({ buffer: curatedZip, filename: 'modus_conversion.tots.zip' });
  if (!detected) throw new Error('curateddemo ToTs zip was not detected by @treeoftables/lib isTots');
  const parsedTree = await libParseTots({ buffer: curatedZip, filename: 'modus_conversion.tots.zip' });
  const treeItems = 'items' in parsedTree ? parsedTree.items : [parsedTree];
  if (treeItems.length < 1) throw new Error('parseTots returned no items for curateddemo ToTs zip');
  for (const item of treeItems as any[]) {
    if (!item.data?.event) throw new Error(`Missing event on ${item.tots?.input?.totsPath}`);
    if (!Array.isArray(item.data.samples) || item.data.samples.length < 1) {
      throw new Error(`Missing samples on ${item.tots?.input?.totsPath}`);
    }
    for (const row of item.data.samples) {
      if (!String(row.sample_id || '').trim()) {
        throw new Error(`Blank sample_id after lib parse of ${item.tots?.input?.totsPath}`);
      }
    }
  }
  const reloaded = await lib.json.toJson({ filename: 'modus_conversion.tots.zip', arrbuf: curatedZip });
  if (reloaded.length < 1) throw new Error('Dropping the ToTs zip back through toJson produced no Slims');
  const reloadedSamples = Object.keys(reloaded[0]!.modus.samples || {}).length;
  if (reloadedSamples < 1) throw new Error('Reloaded Slim had no samples');
}
