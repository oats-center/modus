// Functions to auto-detect types and convert a batch of files into an array of Modus JSON's,
// with suggested output filenames.  Just give each input file a filename whose extension
// reflects its type, and
import fde from 'fast-deep-equal';
import debug from 'debug';
import md5 from 'md5';
import moment from 'moment';
import * as xlsx from 'xlsx';
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
    if (result.type === 'plant') result.type = 'plant-tissue';

    //Lab
    setPath(event, `/LabMetaData/LabID`, result, `/lab/id/value`);
    setPath(event, `/LabMetaData/LabID`, result, `/lab/id/source`, () => 'local');
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
        //FIXME: I believe ReportID is just an internal pointer to tie samples to Reports
        setPath(r, `/ReportID`, file, `/id`);
        setPath(r, `/LabReportID`, file, `/id`);
        setPath(r, `/FileDescription`, file, `/description`);
        setPath(r, `/File/URL/Path`, file, `/uri`);
        setPath(r, `/File/URL/FileName`, file, `/name`);
        setPath(r, `/File/FileData/FileName`, file, `/name`);
        setPath(r, `/File/FileData/FileData`, file, `/name`);
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
      if (depths && depths.length === 1) result.depth = depths[0];


      const sampleName = `${type}Samples`;

      // Samples
      for (const eventSample of eventSamples[sampleName]) {
        const sample: any = {};
        let sampleid = jp.has(eventSample, '/SampleMetaData/FMISSampleID') ?
          jp.get(eventSample, '/SampleMetaData/FMISSampleID')
          : jp.has(eventSample, '/SampleMetaData/SampleNumber') ?
            jp.get(eventSample, '/SampleMetaData/SampleNumber')
            : jp.has(eventSample, '/SampleMetaData/SampleContainerID') ?
            jp.get(eventSample, '/SampleMetaData/SampleContainerID')
            : undefined;

        setPath(eventSample, `/SampleMetaData/SampleNumber`, sample, `/lab/sampleid`);
        setPath(eventSample, `/SampleMetaData/SampleContainerID`, sample, `/source/sampleid`);

        // Nutrient results
        const nutrientResults = type === 'Soil' ?
          eventSample.Depths.map((d: any) => d.NutrientResults).flat(1)
          : eventSample.NutrientResults;
        sample.results = Object.fromEntries(nutrientResults.map((d: any) => {
          const nr = {};
          setPath(d, `/ModusTestID`, nr, `/analyte`, (v) => v.split('_')[3])
          setPath(d, `/Element`, nr, `/analyte`);
          setPath(d, `/ModusTestID`, nr, `/modusTestID`);
          setPath(d, `/ValueUnit`, nr, `/units`);
          setPath(d, `/Value`, nr, `/value`);
          // d.ValueDesc???
          // d.ValueType???
          // TODO: Some other
          return [`${sampleid}-${md5(JSON.stringify(nr))}`, nr];
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

        //Plant
        if (type === 'Plant') {
          setPath(event, `/EventMetaData/EventType/Plant/Crop/Name`, result, `/crop/name`);
          // Modus V1 only allows top-level, but this could go down into the samples, too
          setPath(event, `/EventMetaData/EventType/Plant/PlantPart`, result, `/plantPart`);
          setPath(event, `/EventMetaData/EventType/Plant/Crop/GrowthStage/Name`, result, `/crop/growthStage`);
          setPath(event, `/EventMetaData/EventType/Plant/Crop/SubGrowthStage/Name`, result, `/crop/subGrowthStage`);
        }

        // Shouldn't need this; xml shouldn't be missing every form of ID
        sampleid = sampleid || md5(JSON.stringify(sample));
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

export function toStandardCsv(input: Slim, separateMetadata?: boolean) {
  const flat = flatten(JSON.parse(JSON.stringify(input)));
  const type = input.type;

  return Object.entries(flat.samples || {}).map(([sampleid, sample]: [string, any]) => {
    // get all of the top-level things
    let dict = Object.fromEntries(Object.entries(jp.dict(sample) || {})
      .filter(([key,_]) => !key.includes('/results'))
      .map(([key, val]: [string, any]) => ([key.replace(/^\//, '').replace(/\//g, '.'), val]))
    );

    let nutrients = convertNutrientResults(sample.results);

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
    type: 'soil', // have to pick something here
    date: '',
    samples: {},
  };

  slim.samples = Object.fromEntries(input.map((row) => {
    // Parse analytes
    // FIXME can we recognize an analyte if we have no brackets or parenthesis?
    let results = Object.fromEntries(Object.entries(row || {})
      .filter(([key, _]: [string, any]) =>
        (key.includes('[') && key.includes(']')) || (key.includes('(') && key.includes(')'))
      )
    );

    // Parse other data which have headesr that are json pointers
    const dict = Object.fromEntries(Object.entries(row || {})
      .filter(([key, _]: [string, any]) => !(key in results))
      .map(([path, val]: [string, any]) =>
        (['/'+path.replace(/\./g, '/'), val])
      )
    );

    const sampleid = dict['/lab/sampleid'] || dict['/source/sampleid'];
    let sample = {};

    Object.entries(dict).forEach(([path, val]) => {
      jp.set(sample, path, val)
    })

    results = Object.fromEntries(Object.entries(results || {})
      .map(([key, val]: [string, any]) => {
        let { modusid, element, units } = parseColumnHeaderName(key);
        let result:any = {};
        if (element) result.analyte = element;
        if (modusid) result.modusTestID = modusid;
        if (units) result.units = units;
        if (val || val === 0) result.value = val;
        let resultid = `${sampleid}-${md5(JSON.stringify(result))}`
        return [resultid, result];
      })
    );

    return [sampleid, {
      ...sample,
      results,
    }];

  }));

  return unflatten(slim);
}

// TODO: Handle ModusTestIDv2???
function convertNutrientResults(sample: any) {
  return Object.fromEntries(
    Object.values(sample).map((nr: any) => ([
      `${nr.analyte}${nr.modusTestID ? ` (${nr.modusTestID})` : ''} [${nr.units ? nr.units : ''}]`,
      nr.value,
    ])
  ));
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
  delete dict['/lab/sampleid'];
  delete dict['/lab/containerid'];
  delete dict['/source/sampleid'];

  // Create object of {<path>: mostFrequent value}
  const modeDict = Object.fromEntries(Object.entries(dict).map(([path, val]: [string, any]) => ([
    path,
    mostFrequent(
      Object.values(slim.samples || {})
        .map((sample) => jp.has(sample, path) ? jp.get(sample, path) : undefined)
    )
  ])))

  // FIXME: Do we limit this process to certain parts of the samples?
  // Apply the most-common items to the top-level
  Object.entries(modeDict).forEach(([path, val]) => {
    jp.set(slim, path, val);
  })
  let sampleEntries = Object.fromEntries(
    Object.entries(slim.samples || {}).map(([key, sample]) => {
      for (const [path, val] of Object.entries(modeDict)) {
        if (fde(val, jp.has(sample, path) ? jp.get(sample, path) : undefined)) {
          // Remove the path from samples
          jp.remove(sample, path);
          // eliminate empty objects after removing stuff
        }
      }
      let cleared = clearEmpties(sample);
      return [key, cleared];
    })
  )
  slim.samples = sampleEntries;
  return slim;
}

export function unflatten2(slim: Slim): Slim {
  let sample = JSON.parse(JSON.stringify(Object.values(slim.samples || {})[0]));
  if (!sample) return slim;
  // Skip results
  delete sample.results;
  const dict = jp.dict(sample);
  let sampleEntries = Object.entries(slim.samples || {});

  for (const [path, val] of Object.entries(dict)) {
    // Every item must match to pull it up to the top
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


function mostFrequent(arr:any[]) {
  let countArr: any[] = [];
  let maxCount: number = 0;
  let val: any;
  for (const item of arr) {
    let idx = countArr.findIndex(({value, count}) => item === value);
    let newCount = 1;
    if (idx >= 0) {
      newCount = countArr[idx].count+1;
      countArr[idx].count = newCount;
    } else {
      countArr.push({value: item, count: newCount});
    }
    if (newCount > maxCount) {
      val = item;
    }
  }
  return val;
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