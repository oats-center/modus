// NOTE: do not include this in the univesal index.js output.  It conflicts with
// some of the node/browser functions, so it is up to those to re-export the parts
// they need.

import debug from 'debug';
import * as xlsx from 'xlsx';
import { toCsv } from './slim.js';
import type { ModusJSONConversionResult, Slim } from './json.js';
import saveFile from 'save-file';
import jszip from 'jszip';
import { serializeTotsTree } from '@treeoftables/lib';
import { slimToTotsItems } from './tots.js';

const error = debug('@modusjs/convert#file:error');
const warn = debug('@modusjs/convert#file:error');
const info = debug('@modusjs/convert#file:info');
const trace = debug('@modusjs/convert#file:trace');

// Since I couldn't find a universal "file reader" library, I split the "fromFile"
// functionality into the platform-specific file.ts code under browser/ and node/

export type SaveOutputType = 'xlsx' | 'csv' | 'json' | 'zip' | 'tots';
export type SaveArgs = {
  modus: (ModusJSONConversionResult | Slim)[] | ModusJSONConversionResult | Slim;
  outputtype: SaveOutputType;
  outdir?: string; // defaults to the path on the filename if outdir is not passed.  Otherwise, filename path will be
  // considered relative to outdir.
  filename?: string; // only used for csv/xlsx/zip, defaults to modus_conversion
  compact?: boolean; // indent JSON or make it compact
};

// Made this a function so the node code can use it when checking for existing file overwrite
export function computeSaveFilename(args: SaveArgs): string {
  let { modus, filename, outdir, outputtype } = args;
  let resultsArr: ModusJSONConversionResult[] = [];
  if (!Array.isArray(modus)) {
    modus = [ modus ];
  }
  resultsArr = modus.map(m => m.modus
    ? (m as ModusJSONConversionResult)
    : ({ modus: m as Slim, output_filename: 'modus_results.json', original_filename: '', original_type: 'json'})
  );

  // If they pass an outdir, and the filename is not an absolute path, assume
  // the filename should be relative to the outdir.
  const haveoutdir = !!outdir;
  outdir = outdir?.trim().replace(/\/$/, '') || '.'; // handle trailing slashes
  if (outputtype !== 'json') {
    // json can have lots of files to save
    filename = filename || (outputtype === 'tots' ? 'modus_conversion.tots.zip' : `modus_conversion.${outputtype}`);
  } else {
    filename = filename || resultsArr[0]!.output_filename || 'modus_results.json';
  }
  if (!filename.match(/^\//) && haveoutdir) filename = `${outdir}/${filename}`;
  return filename;
}

export async function buildTotsZip(
  modus: SaveArgs['modus']
): Promise<{ filename: string; data: ArrayBuffer; workbookCount: number }> {
  const list = Array.isArray(modus) ? modus : [modus];
  const resultsArr: ModusJSONConversionResult[] = list.map((m) =>
    (m as ModusJSONConversionResult).modus
      ? (m as ModusJSONConversionResult)
      : ({
          modus: m as Slim,
          output_filename: 'modus_results.json',
          original_filename: '',
          original_type: 'json',
        })
  );
  const items = slimToTotsItems(resultsArr.map((result) => result.modus));
  if (items.length < 1) {
    throw new Error('ERROR: save failed, no ToTs workbooks were produced from the converted results.');
  }
  const zipBuf = await serializeTotsTree(items);
  const bytes = zipBuf instanceof Uint8Array ? zipBuf : new Uint8Array(zipBuf as ArrayBuffer);
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return { filename: 'modus_conversion.tots.zip', data, workbookCount: items.length };
}

async function downloadBytes(data: ArrayBuffer, filename: string, mime: string): Promise<void> {
  const doc = (globalThis as any).document;
  if (doc) {
    const blob = new Blob([new Uint8Array(data)], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    doc.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  await saveFile(data, filename);
}

export async function save(args: SaveArgs): Promise<void> {
  let { modus, outputtype, outdir, filename, compact } = args;
  let resultsArr: ModusJSONConversionResult[] = [];
  if (!Array.isArray(modus)) {
    modus = [ modus ];
  }
  resultsArr = modus.map(m => m.modus
    ? (m as ModusJSONConversionResult)
    : ({ modus: m as Slim, output_filename: 'modus_results.json', original_filename: '', original_type: 'json'})
  );

  if (modus.length < 1) {
    error('Save failed, there were no results to save.');
    throw new Error('ERROR: save failed, there were no results to save.');
  }
  filename = computeSaveFilename(args);

  switch (outputtype) {
    case 'csv':
    case 'xlsx':
      // smoosh them all together into one spreadsheet:
      const { wb } = toCsv(resultsArr.map((m) => m.modus));
      xlsx.writeFile(wb, filename, { bookType: outputtype });
      info('Saved ', outputtype, 'to', filename);
      break;

    case 'json':
      if (resultsArr.length === 1) {
        // single JSON file to save
        const str = compact
          ? JSON.stringify(resultsArr[0]!.modus)
          : JSON.stringify(resultsArr[0]!.modus, null, '  ');
        await saveFile(str, filename);
      } else {
        // more than one json, save it as a zip instead:
        trace(
          'Multiple JSON conversions results found, saving as zip instead of individual JSON files.  Map over them and call save one at a time to save each, or use the node-specific file save.'
        );
        return save({ modus: resultsArr, outputtype: 'zip', outdir, compact }); // use the default zip filename in this case, so don't pass one
      }
      break;

    case 'zip':
      const zip = new jszip();
      // TODO: name something other than modus_conversion when gathering json results
      //       downloaded from trellis
      const folder = zip.folder('modus_conversion');
      if (!folder) {
        throw new Error(
          'Failed to create zip folder when building zip file for download.'
        );
      }
      let i = 0;
      for (const mjr of resultsArr) {
        const str = compact
          ? JSON.stringify(mjr.modus)
          : JSON.stringify(mjr.modus, null, '  ');
        folder.file(mjr.output_filename || `modus_result${i++ === 0 ? '' : ` (${i-1})`}.json`, str);
      }
      const arrbuf = await zip.generateAsync({ type: 'arraybuffer' });
      trace('zip array buffer has', arrbuf.byteLength, 'bytes');
      await saveFile(arrbuf, filename);
      info('Saved zipfile successfully to', filename);
      break;

    case 'tots': {
      const built = await buildTotsZip(resultsArr);
      const outName = filename.endsWith('.zip') ? filename : built.filename;
      await downloadBytes(built.data, outName, 'application/zip');
      info('Saved ToTs tree zip to', outName, 'with', built.workbookCount, 'workbook(s)');
      break;
    }
  }
}

// Shared helper to prepare json.InputFile[] from arbitrary items using environment-provided I/O
import { supportedFormats } from './fromCsvToModusV1.js';
import { typeFromFilename, supportedFileTypes, type InputFile } from './json.js';

export type PrepareDeps<T> = {
  getName: (item: T) => string | undefined;
  getFormat?: (item: T) => string | undefined;
  readAsString: (item: T) => Promise<string>;
  readAsArrayBuffer: (item: T) => Promise<ArrayBuffer | Buffer>;
};

export async function prepareInputFiles<T>(items: T[], deps: PrepareDeps<T>): Promise<InputFile[]> {
  const out: (InputFile | null)[] = await Promise.all(items.map(async (it) => {
    try {
      const name = deps.getName(it);
      if (!name) {
        info('Input item missing name, skipping');
        return null;
      }
      const type = typeFromFilename(name);
      if (!type) {
        info('File', name, 'has unknown type, skipping. Supported types are:', supportedFileTypes);
        return null;
      }
      const format = deps.getFormat ? deps.getFormat(it) : undefined;
      if (format && !supportedFormats.find((sf) => sf === format)) {
        info('Input file format for file', name, 'must be one of the supported formats', supportedFormats);
        return null;
      }
      const ret: InputFile = { filename: name };
      if (format) ret.format = format as any;
      switch (type) {
        case 'xml':
        case 'csv':
        case 'json': {
          ret.str = await deps.readAsString(it);
          break;
        }
        case 'xlsx':
        case 'zip':
        case 'shp': {
          const buf = await deps.readAsArrayBuffer(it);
          // @ts-ignore allow Buffer or ArrayBuffer
          ret.arrbuf = buf;
          break;
        }
      }
      return ret;
    } catch (e: any) {
      info('Failed to prepare input file, skipping. Error was:', e);
      return null;
    }
  }));
  return out.filter((v): v is InputFile => !!v);
}
