// Functions to auto-detect types and convert a batch of files into an array of Modus JSON's,
// with suggested output filenames.  Just give each input file a filename whose extension
// reflects its type, and
import fde from 'fast-deep-equal';
import debug from 'debug';
import jszip from 'jszip';
import md5 from 'md5';
import moment from 'moment';
import * as xlsx from 'xlsx';
import { convertUnits } from '@modusjs/units';
import { simpleConvert } from '@modusjs/units/dist/index.js';
import { modusTests } from '@modusjs/industry';
import type { NutrientResult } from '@modusjs/units';
import type ModusResult from '@oada/types/modus/v1/modus-result.js';
import type Slim from '@oada/types/modus/slim/v1/0.js';
import jp from 'json-pointer';
// @ts-expect-error no types
import wicket from 'wicket';
import { parseColumnHeaderName } from './csv.js';

const error = debug('@modusjs/convert#slim:error');
const warn = debug('@modusjs/convert#slim:error');
const info = debug('@modusjs/convert#slim:info');
const trace = debug('@modusjs/convert#slim:trace');

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
export function fromModusV1(
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
    setPath(event, `/LabMetaData/Contact/State`, result, `/lab/contact/state`);
    //TODO: the spec uses 'address', not city + state

    setPath(event, `/LabMetaData/ReceivedDate`, result, `/lab/dateReceived`);
    if (result?.lab?.dateReceived) {
      result.lab.dateReceived = moment(result.lab.dateReceived).toISOString();
    }
    setPath(event, `/LabMetaData/ProcessedDate`, result, `/lab/dateProcessed`);
    if (result?.lab?.dateProcessed) {
      result.lab.dateProcessed = moment(result.lab.dateProcessed).toISOString();
    }

    setPath(event, `/LabMetaData/ClientAccount/Name`, result, `/lab/clientAccount/name`);
    setPath(event, `/LabMetaData/ClientAccount/AccountNumber`, result, `/lab/clientAccount/accountNumber`);
    setPath(event, `/LabMetaData/ClientAccount/Company`, result, `/lab/clientAccount/company`);
    setPath(event, `/LabMetaData/ClientAccount/City`, result, `/lab/clientAccount/city`);
    setPath(event, `/LabMetaData/ClientAccount/State`, result, `/lab/clientAccount/state`);


    setPath(event, `/FMISMetaData/FMISEventID`, result, `/source/report/id`);
    setPath(event, `/FMISMetaData/FMISProfile/Grower`, result, `/source/grower/name`);
    setPath(event, `/FMISMetaData/FMISProfile/Farm`, result, `/source/farm/name`);
    setPath(event, `/FMISMetaData/FMISProfile/Field`, result, `/source/field/name`);
    setPath(event, `/FMISMetaData/FMISProfile/Sub-Field`, result, `/source/subfield/name`);

    // Lab report
    setPath(event, `/LabMetaData/ProcessedDate`, result, `/lab/report/date`);
    if (result.lab?.report?.date) {
      result.lab.report.date = result.lab.report.date.split('T')[0];
    }

    setPath(event, `/LabMetaData/Reports/0/LabReportID`, result, `/lab/report/id`);
    setPath(event, `/LabMetaData/Reports`, result, `/lab/files`, (reports) =>
      reports.map((r: any) => {
        const file: any = {};
        setPath(r, `/File/ReportID`, file, `/id`);
        setPath(r, `/File/FileData`, file, `/base64`);
        setPath(r, `/File/URL/Path`, file, `/uri`);
        setPath(r, `/File/URL/FileName`, file, `/name`);
        setPath(r, `/File/FileData/FileName`, file, `/name`);
        setPath(r, `/File/FileDescription`, file, `/description`);
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
        setPath(eventSample, `/SampleMetaData/Geometry`, sample, `/geolocation`, ({wkt}) => {
          if (wkt.toLowerCase().startsWith('point')) {
            const ll = wkt.split('(')[1].replace(/\)$/, '').split(' ')
            return {
              lat: +ll[1],
              lon: +ll[0],
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
    if (!result.id) {
      result.id = md5(JSON.stringify(result));
    }
  }
  return result as unknown as Slim;
}

// Handles a few little things:
// - don't set things when it doesn't exist on the ModusResult
// - creates parents down to the given path
// - falls back to previous attempts to set the new path value
// - won't set values that are undefined or empty arrays; will set values === 0
export function setPath(obj: any, objPath: string, newObj: any, newPath: string, func?: (v:any) => any) {
  if (jp.has(obj, objPath)) {
    const curVal = (jp.has(newObj, newPath) ? jp.get(newObj, newPath) : undefined);
    const newVal = func ?
      func(jp.get(obj, objPath)) ?? curVal
      : jp.get(obj, objPath) ?? curVal;
    if (Array.isArray(newVal) && newVal.length > 0) {
      jp.set(newObj, newPath, newVal);
    } else if (newVal || newVal === 0) {
      jp.set(newObj, newPath, newVal);
    }
  }
}

// Should it return only samples part of input?
// Is there any prioritization of the merge or just smash it down?
export function flatten(input: Slim): Slim {
  const dict = Object.fromEntries(Object.entries(jp.dict(input))
    .filter(([key,_]) => !key.startsWith('/samples'))
  );
  const samples = Object.fromEntries(Object.entries(input.samples || {}).map(([id, sample]) => {
    for (const [path, val] of Object.entries(dict)) {
      // Do not override the sample-level overrides;
      if (jp.has(sample, path)) continue;
      // Put the value up higher in the slim doc
      jp.set(sample, path, val);
    }
    return [id, sample];
  }))

  /*
  if (!sample.documentId)
    sample.documentId = input.documentId;
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
  */

  return {
    samples,
    id: '',
    type: 'soil',
    date: '',
  };
}

// Decided to go another direction than this.
export type StandardCsvObject = {
  DocumentName?: string;
  DocumentDate: string;
  DocumentID: string;
  DocumentType: 'Soil' | 'Plant';

  //Lab Data
  LabID?: string;
  LabName?: string;
  LabReportID?: string;
  DateReceived?: string;
  DateProcessed?: string;
  LabContactName?: string;
  LabContactAddress?: string;
  LabContactPhone?: string;
  ClientAccountNumber?: string;
  ClientName?: string;
  ClientCompany?: string;
  ClientCity?: string;
  ClientState?: string;

  // Source
  SourceReportID?: string;
  GrowerName?: string;
  GrowerID?: string;
  FarmName?: string;
  FarmID?: string;
  FieldName?: string;
  FieldID?: string;
  SubFieldName?: string;
  SubFieldID?: string;

  //Sample
  SampleID?: string;
  SourceSampleID?: string;
  LabSampleID?: string;
  Latitude?: number;
  Longitude?: number;

  // Soil
  DepthTop?: string;
  DepthBottom?: string;
  DepthUnits?: string;

  // Plant
  Crop?: string;
  PlantPart?: string;
  GrowthStage?: string;
  SubGrowthStage?: string;

}[];

//export function toStandardCsv(input: Slim, separateMetadata?: boolean): StandardCsvObject {
export function toStandardCsv(input: Slim, separateMetadata?: boolean) {
  const flat = flatten(input);
  const type = input.type;

  return Object.entries(flat.samples || {}).map(([sampleid, sample]: [string, any]) => {
    /*
    let source = {
      SourceReportID: sample.source?.report?.id,
      GrowerName: sample.source?.grower?.name,
      GrowerID: sample.source?.grower?.id,
      FarmName: sample.source?.farm?.name,
      FarmID: sample.source?.farm?.id,
      FieldName: sample.source?.field?.name,
      FieldID: sample.source?.field?.id,
      SubFieldName: sample.source?.subfield?.name,
      SubFieldID: sample.source?.subfield?.id,
    }
    */

    let dict = Object.fromEntries(Object.entries(jp.dict(input))
      .filter(([key,_]) => !key.startsWith('/results'))
    ).map(([key, val]: [string, any]) => ([key.replace(/^\//, '').replace('/', '.'), val]));

    /*
    let lab = {
      LabName: sample.lab?.name,
      LabID: sample.lab?.id,
      LabReportID: sample.lab?.report?.id,
      LabSampleID: sample.lab?.sampleid,
      DateReceived: sample.lab?.dateReceived,
      DateProcessed: sample.lab?.dateProcessed,
      ClientAccountNumber: sample.lab?.clientAccount?.accountNumber,
      ClientName: sample.lab?.clientAccount?.name,
      ClientCompany: sample.lab?.clientAccount?.company,
      ClientCity: sample.lab?.clientAccount?.city,
      ClientState: sample.lab?.clientAccount?.state,
      ClientZip: sample.lab?.clientAccount?.zip,
      LabContactName: sample.lab?.contact?.name,
      LabContactPhone: sample.lab?.contact?.phone,
      LabContactAddress: sample.lab?.contact?.address,
    }
    */

    let nutrients = toNutrientResultsObj(sample.results);

    /*
    let plant : any = type === 'plant-tissue' ? {
      CropName: sample.crop?.name,
      CropID: sample.crop?.id,
      GrowthStage: sample.growthStage,
      SubGrowthStage: sample.subGrowthStage,
      PlantPart: sample.plantPart,
    } : {};
    */

    /*
    let soil : any = type === 'soil' ? {
      DepthTop: sample.depth.top,
      DepthBottom: sample.depth.bottom,
      DepthUnits: sample.depth.units,
    } : {};
    */

    return {
    //  ...source,
    //  ...lab,
      ...dict,
      ...nutrients,
    //  ...plant,
    //  ...soil,
    };
  });
}

export function fromStandardCsv(input: Record<string,any>[]): Slim {
  let slim: Slim = {
    id: '',
    type: 'soil',
    date: '',
    samples: {},
  };

  slim.samples = Object.fromEntries(input.map((row) => {
    // Parse analytes
    let results = Object.fromEntries(Object.entries(row || {})
      .filter(([key, _]: [string, any]) =>
        (key.includes('[') && key.includes(']')) || (key.includes('(') && key.includes(')'))
      )
    );

    // Parse other data which have headesr that are json pointers
    const dict = Object.fromEntries(Object.entries(row || {})
      .filter(([key, _]: [string, any]) => !results[key])
      .map(([path, val]: [string, any]) =>
        (['/'+path.replace('.', '/'), val])
      )
    );

    const samplid = dict['/samplid'];
    let sample = {};
    Object.entries(dict).forEach(([path, val]) => {
      jp.set(sample, path, val)
    })

    results = Object.fromEntries(Object.entries(results || {})
      .map(([key, val]: [string, any]) => {
        let { modusid, element, units } = parseColumnHeaderName(key);
        let result = {
          analyte: element,
          modusTestID: modusid,
          units,
          value: val
        }
        let resultid = `${samplid}-${md5(JSON.stringify(result))}`
        return [resultid, result];
      })
    );

    return [samplid, {
      ...sample,
      ...results,
    }];

  }));

  return unflatten(slim);
}

// TODO: Handle ModusTestIDv2???
function toNutrientResultsObj(sampleDepth: any) {
  return Object.fromEntries(
    sampleDepth.NutrientResults.map((nr: NutrientResult) => [
      `${nr.Element}${nr.ModusTestID ? ` (${nr.ModusTestID})` : ''} [${nr.ValueUnit}]`,
      nr.Value,
    ])
  );
}

export function toCsv(input: Slim | Slim[]) {
  let data = [];

  if (Array.isArray(input)) {
    //data = input.map((mr: Slim) => toCsvObject(mr)).flat(1);
    data = input.map((mr: Slim) => toStandardCsv(mr)).flat(1);
  } else {
    data = toStandardCsv(input);
  }
  let sheet = xlsx.utils.json_to_sheet(data);

  return {
    wb: {
      Sheets: { Sheet1: sheet },
      SheetNames: ['Sheet1'],
    } as xlsx.WorkBook,
    str: xlsx.utils.sheet_to_csv(sheet),
  };
}

// Combine multiple slims into a single slim file:
//1. Push everything down into the samples
//2. elevate properties that can be elevated
export function aggregateSlims(slims: Slim[]) {
// Handle lists
// Files list
  const slim: Slim = {
    id: '',
    date: '',
    type: slims[0]!.type,
    samples: {}
  }

  for (const slim of slims) {
    const flat = flatten(slim);
    slim.samples = {
      ...slim.samples,
      ...flat.samples,
    }
  }

  return slim;
}

// Generically, recursively merge objects including arrays
function aggregateObj(output: any, input: any): any {
  return Object.fromEntries(Object.entries(input).map(
    ([key, value]: [string, any]) => {
    if (typeof output === 'object') {
      // Things like files array should just get appended together and
      // utilize IDs to refer samples to each
      if (Array.isArray(output)) {
        return [key, output.push(value)];
      } else if (output === null) {
        return [key, value]
      } else {
        // actually is an Object
        return [key, aggregateObj(value, value)]
      }
      return [key, value]
    }
    return [key, value];
  }));
}

// Split out a single slim file into multiple files
// Just take unique slim IDs and run with it
export function disaggregate(slim: Slim): Slim[] {
  let slims: Slim[] = [];
  let sampleGroups = Object.values(slim.samples || {}).reduce(
    (groups: Record<string, any[]>, sample: any) => {
      (groups[sample.documentId] = groups[sample.documentId] || []).push(sample);
      return groups;
    }, {}
  )
  return Object.values(sampleGroups).map(samples => aggregateSlims(samples));
}

// TODO: Check/handle if the input slim doc content at top-level keys
// differs from sample content?
// Pull common things up to the top level
export function unflatten(slim: Slim): Slim {
  // iterate over stuff here and if its equal, pull it up top
  let sample = JSON.parse(JSON.stringify(Object.values(slim.samples || {})[0]));
  if (!sample) return slim;
  // Skip results
  delete sample.results;
  const dict = jp.dict(sample);
  let sampleEntries = Object.entries(slim.samples || {});
  for (const [path, val] of Object.entries(dict)) {
    if (sampleEntries.every(([k, item]) => fde(val, jp.has(item, path) ? jp.get(item, path) : undefined))) {
      // Put the value up higher in the slim doc
      jp.set(slim, path, val);
      // Remove the path from samples
      sampleEntries.forEach(([_, sv]) => jp.remove(sv, path));
      // eliminate empty objects after removing stuff
      sampleEntries = sampleEntries.map(se => clearEmpties(se))
    }
  }
  slim.samples = Object.fromEntries(sampleEntries);
  return slim;
}

function clearEmpties(o: any) {
  for (var k in o) {
    if (!o[k] || typeof o[k] !== "object") {
      continue // If null or not an object, skip to the next iteration
    }

    // The property is an object
    clearEmpties(o[k]); // <-- Make a recursive call on the nested object
    if (Object.keys(o[k]).length === 0) {
      delete o[k]; // The object had no properties, so delete that property
    }
  }
    return o;
}

/*
let notCommon = Symbol("Not Common");
export function getCommon(samples: Slim['samples'], pointer: string) {
  const sampleValues = Object.values(samples || {});
  if (!sampleValues[0]) return notCommon;
  const first = jp.get(sampleValues[0], pointer);
  return (sampleValues.every(item => fde(first, item))) ? first : notCommon;
}
let skipPaths = [
  '$.samples.*.results',
]
// Take a slim and recursively find
export function recursiveFindCommon(slim: Slim, walkObj: any, pointer: string) {
  return Object.fromEntries(Object.entries(input).map(([key, value]: [string, any]) => {
    const newPointer = `${pointer}/${key}`;
    const result = getCommon(samples, newPointer);

    if (result === notCommon) {

    } else {
    }
    return [key, value];
  }));
}

*/