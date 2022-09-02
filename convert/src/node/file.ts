import fs from 'fs/promises';
import debug from 'debug';
import { csv, json } from '../index.js';

const error = debug('@modusjs/convert#node/file:error');
const info = debug('@modusjs/convert#node/file:info');
const trace = debug('@modusjs/convert#node/file:trace');


export type NodeInputFile = {
  filename: string,
  format?: csv.SupportedFormats,
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
    if (!csv.supportedFormats.find(obj.format)) {
      info('Input file formt for file', obj.filename, 'must be one of the supported formats', csv.supportedFormats);
      return false;
    }
  }
  return true;
}


// This function is universal, but in browser case it takes a web api File as input file, and in the
// node case it takes { filename, format? }.  To get around typescript limitation of same typings
// file for everything, we'll just make the API as "any"
export async function fromFile(files: any | any[]): Promise<json.ModusJSONConversionResult[]> {
  if (!Array.isArray(files)) {
    files = [ files ];
  }
  const node_files = (files.filter(isNodeInputFile) as NodeInputFile[]);
  const toconvert_promises: Promise<json.InputFile | null>[] = node_files.map(async (file) => {
    try {
      const type = json.typeFromFilename(file.filename);
      if (!type) {
        error('File', file.filename, 'has unknown type, skipping.  Supported types are:', json.supportedFileTypes);
        return null;
      }
      const ret: json.InputFile = { ...file }; // filename, format if it exists
      switch(type) {
        case 'xml':
        case 'csv':
        case 'json': 
          ret.str = (await fs.readFile(file.filename)).toString(); 
        break;
        case 'xlsx': 
          ret.arrbuf = await fs.readFile(file.filename); 
        break;
      }
      return ret;
    } catch(e: any) {
      error('File',file.filename,'failed to read.  Skipping. Error was:',e);
      return null;
    }
  });
  // Await all the promises that are reading files, and then filter any nulls (i.e. files skipped)
  const toconvert = await Promise.all(toconvert_promises);
  return json.toJson(toconvert.filter(f => !!f) as json.InputFile[]);
}
