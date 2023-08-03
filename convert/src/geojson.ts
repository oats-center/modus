// Functions to auto-detect types and convert a batch of files into an array of Modus JSON's,
// with suggested output filenames.  Just give each input file a filename whose extension
// reflects its type, and
import debug from 'debug';
import jszip from 'jszip';
import { parse as csvParse, supportedFormats, SupportedFormats } from './csv.js';
import { parseModusResult as xmlParseModusResult } from './xml.js';
import { convertUnits } from '@modusjs/units';
import { simpleConvert } from '@modusjs/units/dist/index.js';
import { modusTests } from '@modusjs/industry';
import type ModusResult from '@oada/types/modus/v1/modus-result.js';
// @ts-ignore
import wicket from 'wicket';
import type { NutrientResult } from '@modusjs/units';
import type { LabConfig } from './labs/index.js';
import type { GeoJSON } from 'geojson';

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
export async function toGeoJson(
  input: ModusResult
): Promise<GeoJSON> {
  let results: GeoJSON = {
    type: 'FeatureCollection',
    features: []
  };
  for (const event of input.Events || []) {
    for (const [type, eventSamples] of Object.entries(event.EventSamples!) as [string, any]) {
      const sampleName = `${type}Samples`;
      for (const samples of eventSamples[sampleName]) {
        const nutrientResults = type === 'Soil' ?
          //TODO: Map Element names into something like Depth + Element Name
          samples.Depths.map((d: any) => d.NutrientResults).flat(1)
          : samples.NutrientResults;
        if (!samples.Geometry.wkt) continue;
        const feat = wkt.read(samples.Geometry.wkt).toJson();
        for (const nr of nutrientResults) {

        }
      }
    }
  }
  return results;
}