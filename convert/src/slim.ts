// Functions to auto-detect types and convert a batch of files into an array of Modus JSON's,
// with suggested output filenames.  Just give each input file a filename whose extension
// reflects its type, and
import debug from 'debug';
import jszip from 'jszip';
import md5 from 'md5';
import { parse as csvParse, supportedFormats, SupportedFormats } from './csv.js';
import { parseModusResult as xmlParseModusResult } from './xml.js';
import { convertUnits } from '@modusjs/units';
import { simpleConvert } from '@modusjs/units/dist/index.js';
import { modusTests } from '@modusjs/industry';
import type ModusResult from '@oada/types/modus/v1/modus-result.js';
import type Slim from '@oada/types/modus/slim/v1/0.js';
import jp from 'json-pointer';
// @ts-expect-error no types
import wicket from 'wicket';

const error = debug('@modusjs/convert#slim:error');
const warn = debug('@modusjs/convert#slim:error');
const info = debug('@modusjs/convert#slim:info');
const trace = debug('@modusjs/convert#slim:trace');

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
export function toSlim(
  input: ModusResult
): Slim {
  let result : any = {
    _type: 'application/vnd.modus.slim.v1.0+json',
  };
  for (const event of input.Events || []) {
    setPath(event, `/EventMetaData/EventCode`, result, `/id`);
    setPath(event, `/EventMetaData/EventDate`, result, `/date`);

    setPath(event, `/EventMetaData/EventType`, result, `/type`, (v) => Object.keys(v)[0]!.toLowerCase())
    if (result.type === 'plant') result.type === 'plant-tissue';

    //Lab
    setPath(event, `/LabMetaData/LabEventID`, result, `/lab/id/value`);
    setPath(event, `/LabMetaData/LabEventID`, result, `/lab/id/source`, () => 'local');
    setPath(event, `/LabMetaData/LabName`, result, `/lab/name`);

    setPath(event, `/LabMetaData/Contact/Name`, result, `/lab/contact/name`);
    setPath(event, `/LabMetaData/Contact/Phone`, result, `/lab/contact/phone`);
    setPath(event, `/LabMetaData/Contact/Address`, result, `/lab/contact/address`);
    setPath(event, `/LabMetaData/Contact/Email`, result, `/lab/contact/email`);
    setPath(event, `/LabMetaData/Contact/City`, result, `/lab/contact/city`);
    setPath(event, `/LabMetaData/Contact/State`, result, `/lab/contact/state`);
    //TODO: the spec uses 'address', not city + state

    setPath(event, `/LabMetaData/ReceivedDate`, result, `/lab/dateReceived`);
    setPath(event, `/LabMetaData/ProcessedDate`, result, `/lab/dateProcessed`);

    setPath(event, `/LabMetaData/ClientAccount/Name`, result, `/lab/clientAccount/name`);
    setPath(event, `/LabMetaData/ClientAccount/AccountNumber`, result, `/lab/clientAccount/accountNumber`);
    setPath(event, `/LabMetaData/ClientAccount/Company`, result, `/lab/clientAccount/company`);


    setPath(event, `/FMISMetaData/FMISEventID`, result, `/source/report/id`);
    setPath(event, `/FMISMetaData/FMISProfile/Farm`, result, `/source/farm/name`);
    setPath(event, `/FMISMetaData/FMISProfile/Field`, result, `/source/field/name`);
    setPath(event, `/FMISMetaData/FMISProfile/Grower`, result, `/source/grower/name`);
    setPath(event, `/FMISMetaData/FMISProfile/Sub-Field`, result, `/source/subfield/name`);

    // Lab report
    setPath(event, `/LabMetaData/ProcessedDate`, result, `/lab/report/date`);
    setPath(event, `/LabMetaData/Reports/0/LabReportID`, result, `/lab/report/id`);
    setPath(event, `/LabMetaData/Reports`, result, `/lab/files`, (reports) =>
      reports.map((r: any) => {
        const file: any = {};
        setPath(r, `/File/ReportID`, file, `/id`);
        setPath(r, `/File/FileData`, file, `/base64`);
        setPath(r, `/File/URL/Path`, file, `/uri`);
        setPath(r, `/File/URL/FileName`, file, `/name`);
        setPath(r, `/File/FileData/FileName`, file, `/name`);
        return file;
      })
    );
    if (result.lab.files.length === 0) delete result.lab.files

    for (const [type, eventSamples] of Object.entries(event.EventSamples!) as [string, any]) {
      // Handle depths
      //TODO: Or nematode??
      const depths = type === 'Soil' ? eventSamples.DepthRefs.map((dr: any) => ({
        name: dr.Name,
        top: dr.StartingDepth,
        bottom: dr.EndingDepth,
        units: dr.DepthUnit
      })) : undefined;
      if (depths.length === 1) result.depth = depths[0];

      const sampleName = `${type}Samples`;

      // Samples
      for (const eventSample of eventSamples[sampleName]) {
        const sample: any = {};
        setPath(eventSample, `/SampleMetaData/SampleNumber`, sample, `/lab/sampleid`);
        setPath(eventSample, `/SampleMetaData/SampleContainerID`, sample, `/source/sampleid`);

        // Nutrient results
        const nutrientResults = type === 'Soil' ?
          eventSample.Depths.map((d: any) => d.NutrientResults).flat(1)
          : eventSample.NutrientResults;
        sample.nutrientResult = Object.fromEntries(nutrientResults.map((d: any) => {
          const nr = {};
          setPath(d, `/ModusTestID`, nr, `/analyte`, (v) => v.split('_')[3])
          setPath(d, `/Element`, nr, `/analyte`);
          setPath(d, `/Value`, nr, `/value`);
          setPath(d, `/ValueUnit`, nr, `/units`);
          setPath(d, `/ModusTestID`, nr, `/modusTestID`);
          // d.ValueDesc???
          // d.ValueType???
          // TODO: Some other
          const nrid = md5(JSON.stringify(nr));
          return [nrid, nr];
        }))

        //Geolocation
        setPath(eventSample, `/SampleMetaData/Geometry`, sample, `/geolocation`, (wkt) => {
          if (wkt.toLowerCase().startsWith('point')) {
            const ll = wkt.split('(')[1].replace(/\)$/, '').split(' ')
            return {
              lat: ll[1],
              lon: ll[0],
            }
          }
          return {
            geojson: new wicket.Wkt().read(wkt).toJson(),
          }
        })

        const sampleid = md5(JSON.stringify(sample));
        result.samples = result.samples || {};
        result.samples[sampleid] = sample;
      }
    }
  }
  return result as unknown as Slim;
}

// Handles a few little things:
// - don't set things when it doesn't exist on the ModusResult
// - creates parents down to the given path
// - falls back to previous attempts to set the new path value
// - won't set values that are undefined or empty arrays; will set values === 0
function setPath(obj: any, objPath: string, newObj: any, newPath: string, func?: (v:any) => any) {
  if (jp.has(obj, objPath)) {
    const newVal = func ?
      func(jp.get(obj, objPath)) ?? jp.get(newObj, newPath)
      : jp.get(obj, objPath) ?? jp.get(newObj, newPath);
    if (Array.isArray(newVal) && newVal.length > 0) {
      jp.set(newObj, newPath, newVal);
    } else if (newVal || newVal === 0) {
      jp.set(newObj, newPath, newVal);
    }
  }
}

// TODO: What else to flatten?
// Should it return only samples part of input?
// Should it return an object or array?
export function flatten(input: Slim) {
  const samples = Object.fromEntries(
    Object.entries(input.samples || {}).map(([sampleid, sample]) => {
      const newSample: any = {
        ...sample,
        lab: {
          ...input.lab,
          ...sample.lab,
        },
        source: {
          ...input.source,
          ...sample.lab,
        }
      }
      if (input.depth)
        sample = {
          depth: input.depth,
          ...sample
        }
      if (input.geolocation)
        sample = {
          geolocation: input.geolocation,
          ...sample
        };
      return [sampleid, newSample];
    })
  );

  return {
    ...input,
    samples,
  }
}
/*
export function objectArray(input: Slim): Array<any> {
  let output = [];
  return output;
}
*/

