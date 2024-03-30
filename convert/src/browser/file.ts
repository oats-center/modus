import debug from 'debug';
import { csv, json } from '../index.js';
import type { LabConfig } from '../labs/index.js';

// Keep the universal things
export * from '../file.js';

const error = debug('@modusjs/convert#browser/file:error');
const info = debug('@modusjs/convert#browser/file:info');
const trace = debug('@modusjs/convert#browser/file:trace');

export type BrowserInputFile = {
  file: File;
  format?: csv.SupportedFormats;
};
function isBrowserInputFile(obj: any): obj is BrowserInputFile {
  if (typeof obj !== 'object') {
    info('Input file must be an object');
    return false;
  }
  if (!obj.file) {
    info('Input file must have a File property');
    return false;
  }
  if (!(obj.file as File).name) {
    info('Input file must have a name');
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

// Trying to get the universal typings to work even thought the browser/node API is different (and node doesn't have File)
export async function fromFile(files: any | any[], labConfigs?: LabConfig[]) {
  if (!Array.isArray(files)) {
    files = [files];
  }
  const browser_files = files.filter(isBrowserInputFile) as BrowserInputFile[];
  return fromFileBrowser(browser_files, labConfigs);
}

export async function fromFileBrowser(
  files: BrowserInputFile | BrowserInputFile[],
  labConfigs?: LabConfig[]
): Promise<json.ModusJSONConversionResult[]> {
  if (!Array.isArray(files)) {
    files = [files];
  }
  const toconvert_promises: Promise<json.InputFile | null>[] = files.map(
    async (bf) => {
      try {
        const type = json.typeFromFilename(bf.file.name);
        if (!type) {
          error(
            'File',
            bf.file.name,
            'has unknown type, skipping.  Supported types are:',
            json.supportedFileTypes
          );
          return null;
        }
        const ret: json.InputFile = { filename: bf.file.name }; // filename, format if it exists
        if (bf.format) ret.format = bf.format;
        switch (type) {
          case 'xml':
          case 'csv':
          case 'json':
            ret.str = await readFileAsString(bf.file);
            break;
          case 'xlsx':
          case 'zip':
            ret.arrbuf = await readFileAsArrayBuffer(bf.file);
            break;
        }
        return ret;
      } catch (e: any) {
        error('File', bf.file.name, 'failed to read.  Skipping. Error was:', e);
        return null;
      }
    }
  );
  // Await all the promises that are reading files, and then filter any nulls (i.e. files skipped)
  const toconvert = await Promise.all(toconvert_promises);
  return json.toJson(toconvert.filter((f) => !!f) as json.InputFile[], labConfigs);
}

export async function fromFileBrowserPre(
  files: BrowserInputFile | BrowserInputFile[],
  labConfigs: LabConfig[],
): Promise<csv.LabConfigResult[]> {
  if (!Array.isArray(files)) {
    files = [files];
  }
  const toconvert_promises: Promise<json.InputFile | null>[] = files.map(
    async (bf) => {
      try {
        const type = json.typeFromFilename(bf.file.name);
        if (!type) {
          error(
            'File',
            bf.file.name,
            'has unknown type, skipping.  Supported types are:',
            json.supportedFileTypes
          );
          return null;
        }
        const ret: json.InputFile = { filename: bf.file.name }; // filename, format if it exists
        if (bf.format) ret.format = bf.format;
        switch (type) {
          case 'xml':
          case 'csv':
          case 'json':
            ret.str = await readFileAsString(bf.file);
            break;
          case 'xlsx':
          case 'zip':
            ret.arrbuf = await readFileAsArrayBuffer(bf.file);
            break;
        }
        return ret;
      } catch (e: any) {
        error('File', bf.file.name, 'failed to read.  Skipping. Error was:', e);
        return null;
      }
    }
  );
  // Await all the promises that are reading files, and then filter any nulls (i.e. files skipped)
  const toconvert = await Promise.all(toconvert_promises);
  return csv.toLabConfig(toconvert.filter((f) => !!f) as json.InputFile[], labConfigs);
}

async function readFileAsString(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (evt) {
      if (!evt.target?.result)
        return reject(
          `Failed to read file ${f.name}: no result found in onload`
        );
      return resolve(evt.target.result.toString());
    };
    reader.onerror = reader.onabort = (err) => {
      return reject(err);
    };
    return reader.readAsText(f);
  });
}

async function readFileAsArrayBuffer(f: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (evt) {
      if (!evt.target?.result)
        return reject(
          `Failed to read file ${f.name} as ArrayBuffer: no result found in onload`
        );
      return resolve(evt.target.result as ArrayBuffer);
    };
    reader.onerror = reader.onabort = (err) => {
      return reject(err);
    };
    return reader.readAsArrayBuffer(f);
  });
}