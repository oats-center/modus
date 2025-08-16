import fs from 'fs/promises';
import debug from 'debug';
import { csv, json } from '../index.js';
import prompts from 'prompts';
import { prepareInputFiles } from '../file.js';
import { LabConfig } from '../labs/index.js';

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
    if (!csv.supportedFormats.find((sf: any) => sf === obj.format)) {
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

export async function fromFile(files: any | any[], labConfigs?: LabConfig[]) {
  if (!Array.isArray(files)) {
    files = [files];
  }

  const node_files = files.filter(isNodeInputFile) as NodeInputFile[];
  return fromFileNode(node_files);
}

export async function fromFileNode(
  files: NodeInputFile | NodeInputFile[],
  labConfigs?: LabConfig[]
): Promise<json.ModusJSONConversionResult[]> {
  if (!Array.isArray(files)) {
    files = [files];
  }
  const toconvert = await prepareInputFiles(files, {
    getName: (f) => f.filename,
    getFormat: (f) => f.format,
    readAsString: async (f) => (await fs.readFile(f.filename)).toString(),
    readAsArrayBuffer: async (f) => await fs.readFile(f.filename),
  });
  return json.toJson(toconvert, labConfigs);
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