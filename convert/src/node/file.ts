import fs from 'fs/promises';
import debug from 'debug';
import { csv, json } from '../index.js';
import prompts from 'prompts';

import {
  save as universalSave,
  SaveArgs,
  computeSaveFilename,
} from '../file.js';

export { computeSaveFilename, SaveArgs };

const error = debug('@modusjs/convert#node/file:error');
const info = debug('@modusjs/convert#node/file:info');
const trace = debug('@modusjs/convert#node/file:trace');

export type NodeInputFile = {
  filename: string;
  format?: csv.SupportedFormats;
};
function isNodeInputFile(obj: any): obj is NodeInputFile {
  if (typeof obj !== 'object') {
    info('Input file must be an object');
    return false;
  }
  if (!obj.filename) {
    info('Input file must have a filename');
    return false;
  }
  if (obj.format) {
    if (typeof obj.format !== 'string') {
      info('Input file format for file', obj.filename, 'must be a string');
      return false;
    }
    if (!csv.supportedFormats.find((sf) => sf === obj.format)) {
      info(
        'Input file formt for file',
        obj.filename,
        'must be one of the supported formats',
        csv.supportedFormats
      );
      return false;
    }
  }
  return true;
}

export async function fromFile(files: any | any[]) {
  if (!Array.isArray(files)) {
    files = [files];
  }

  const node_files = files.filter(isNodeInputFile) as NodeInputFile[];
  return fromFileNode(node_files);
}

export async function fromFileNode(
  files: NodeInputFile | NodeInputFile[]
): Promise<json.ModusJSONConversionResult[]> {
  if (!Array.isArray(files)) {
    files = [files];
  }
  const toconvert_promises: Promise<json.InputFile | null>[] = files.map(
    async (file) => {
      try {
        const type = json.typeFromFilename(file.filename);
        if (!type) {
          error(
            'File',
            file.filename,
            'has unknown type, skipping.  Supported types are:',
            json.supportedFileTypes
          );
          return null;
        }
        const ret: json.InputFile = { ...file }; // filename, format if it exists
        switch (type) {
          case 'xml':
          case 'csv':
          case 'json':
            ret.str = (await fs.readFile(file.filename)).toString();
            break;
          case 'xlsx':
          case 'zip':
            ret.arrbuf = await fs.readFile(file.filename);
            break;
        }
        return ret;
      } catch (e: any) {
        error(
          'File',
          file.filename,
          'failed to read.  Skipping. Error was:',
          e
        );
        return null;
      }
    }
  );
  // Await all the promises that are reading files, and then filter any nulls (i.e. files skipped)
  const toconvert = await Promise.all(toconvert_promises);
  return json.toJson(toconvert.filter((f) => !!f) as json.InputFile[]);
}

// We'll make a node-specific version of save here that
// a) checks for file overwrite, and
// b) allows you to save lots of modus json's instead of forcing them into a zip
// c) falls back to universal function for all types
async function verifyOverwriteIfExists(
  filename: string
): Promise<'yes' | 'no' | 'all'> {
  const stat = await fs.stat(filename).catch(() => null); // throws if it does not exist
  if (stat) {
    const answer = await prompts({
      name: 'value',
      message: `Output file ${filename} exists.  Overwrite?`,
      type: 'select',
      choices: [
        { title: 'yes', value: 'yes' },
        { title: 'no', value: 'no' },
        { title: 'all', value: 'all' },
      ],
    });
    if (answer.value === 'yes') return 'yes';
    if (answer.value === 'all') return 'all';
    return 'no';
  }
  return 'yes'; // doesn't exist, so overwrite is fine
}

// Override the universal save function by first checking if file exists, then call universal
// save if user says to overwrite.
export async function save(args: SaveArgs): Promise<void> {
  let { modus, outputtype, filename } = args;
  if (!Array.isArray(modus)) {
    modus = [modus];
  }
  filename = computeSaveFilename(args);
  // check verifyOverwriteIfExists, then default to universal save
  let dowrite = 'yes';
  switch (outputtype) {
    case 'csv':
    case 'xlsx':
    case 'zip':
      dowrite = await verifyOverwriteIfExists(filename);
      if (dowrite === 'yes' || dowrite === 'all') {
        trace('save: calling universalSave now that overwrite check is done');
        return universalSave(args);
      } else {
        info('Not overwriting file', filename);
      }
      break;
    case 'json':
      for (const mjr of modus) {
        const output_filename = computeSaveFilename({ ...args, modus: mjr });
        if (dowrite !== 'all') {
          dowrite = await verifyOverwriteIfExists(output_filename);
        }
        if (dowrite === 'no') {
          info('Not overwriting file', output_filename, 'at user request');
          continue;
        }
        await save({ ...args, modus: mjr });
      }
      break;
  }
}
