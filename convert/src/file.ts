// NOTE: do not include this in the univesal index.js output.  It conflicts with
// some of the node/browser functions, so it is up to those to re-export the parts
// they need.

import debug from 'debug';
import * as xlsx from 'xlsx';
import { toCsv } from './slim.js';
import type { ModusJSONConversionResult, Slim } from './json.js';
import saveFile from 'save-file';
import jszip from 'jszip';

const error = debug('@modusjs/convert#file:error');
const warn = debug('@modusjs/convert#file:error');
const info = debug('@modusjs/convert#file:info');
const trace = debug('@modusjs/convert#file:trace');

// Since I couldn't find a universal "file reader" library, I split the "fromFile"
// functionality into the platform-specific file.ts code under browser/ and node/

export type SaveOutputType = 'xlsx' | 'csv' | 'json' | 'zip';
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
    filename = filename || `modus_conversion.${outputtype}`;
  } else {
    filename = filename || resultsArr[0]!.output_filename || 'modus_results.json';
  }
  if (!filename.match(/^\//) && haveoutdir) filename = `${outdir}/${filename}`;
  return filename;
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
  }
}