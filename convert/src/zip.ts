import debug from 'debug';
import jszip from 'jszip';
import { toJson, typeFromFilename, InputFile } from './json.js';
import type { SupportedFormats } from './csv.js';

const error = debug('@modusjs/convert#tojson:error');
const warn = debug('@modusjs/convert#tojson:error');
const info = debug('@modusjs/convert#tojson:info');
const trace = debug('@modusjs/convert#tojson:trace');

export type ZipFile = {
  filename: string;
  arrbuf?: ArrayBuffer;
  base64?: string;
  format?: SupportedFormats;
};

export async function parse(file: ZipFile) {
  let opts = {};
  const data = file.arrbuf || file.base64;
  if (file.base64) {
    opts = { base64: true };
  }
  if (!data) {
    error(
      'ERROR: Zip input file had neither arrbuf nor base64.  At least one is required.'
    );
    throw new Error(
      'Zip must have either array buffer or base64-encoded string'
    );
  }

  const zip = await jszip.loadAsync(data, opts);
  let all_convert_inputs = [];
  for (const zf of Object.values(zip.files)) {
    if (zf.dir) continue;
    const type = typeFromFilename(zf.name);
    // Strip all path info from the filename:
    const filename = zf.name.replace(/^(.*[\/\\])*/g, '');
    trace('Found file', filename, 'of type', type, 'in zip');
    let convert_input: InputFile = { filename, format: file.format };
    switch (type) {
      case 'zip':
      case 'xlsx':
        convert_input.arrbuf = await zf.async('arraybuffer');
        break;
      case 'xml':
      case 'csv':
      case 'json':
        convert_input.str = await zf.async('string');
        break;
    }
    all_convert_inputs.push(convert_input);
  }
  return toJson(all_convert_inputs);
}
