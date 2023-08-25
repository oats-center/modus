import debug from 'debug';
import jszip from 'jszip';
import { parse as csvParse, supportedFormats, SupportedFormats } from './csv.js';
import { parseModusResult as xmlParseModusResult } from './xml.js';
import { convertUnits } from '@modusjs/units';
import { simpleConvert } from '@modusjs/units/dist/index.js';
import { modusTests } from '@modusjs/industry';
import type ModusResult from '@oada/types/modus/v1/modus-result.js';
// @ts-expect-error need to make types for wicket...
import wicket from 'wicket';
import type { NutrientResult } from '@modusjs/units';
import type { LabConfig } from './labs/index.js';
import type { GeoJSON } from 'geojson';
import { flatten, toSlim } from './slim.js';
import type Slim from '@oada/types/modus/slim/v1/0.js';

const error = debug('@modusjs/convert#togeojson:error');
const warn = debug('@modusjs/convert#togeojson:error');
const info = debug('@modusjs/convert#togeojson:info');
const trace = debug('@modusjs/convert#togeojson:trace');
const DEPTHUNITS = 'cm';
const wkt = new wicket.Wkt();

export type SupportedFileType = 'xml' | 'csv' | 'xlsx' | 'json' | 'zip';
export const supportedFileTypes = ['xml', 'csv', 'xlsx', 'json', 'zip'];

export type ModusJSONConversionResult = {
  original_filename: string;
  original_type: SupportedFileType;
  output_filename: string;
  modus: ModusResult;
};

export type InputFile = {
  filename: string; // can include the path on the front
  format?: 'generic'; // only for CSV/XLSX files, default generic (same as generic for now)
  str?: string;
  // zip or xlsx can either be ArrayBuffer or base64 string of original file.
  // Do not use for other types, they should all just be strings.
  arrbuf?: ArrayBuffer;
  base64?: string;
};

// This function will attempt to convert all the input files into an array of Modus JSON files
export function toGeoJson(
  input: ModusResult | Slim
): GeoJSON {
  let results: GeoJSON = {
    type: 'FeatureCollection',
    features: []
  };

  let slim = (input.Events ? toSlim(input as ModusResult) : input) as Slim;
  const flat = flatten(slim);

  for (const [key, sample] of Object.entries(flat.samples)) {

  }
  return results;
}