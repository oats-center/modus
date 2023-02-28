import type { Units, NutrientResult } from '@modusjs/units';
import debug from 'debug';
import * as airtable from '@modusjs/airtable';
import jp from 'jsonpath';

import { default as a_l_west } from './a_l_west.js';
import { default as tomkat} from './tomkat.js';

//const info = debug('@modusjs/convert#labs-automated:info');
//const trace = debug('@modusjs/convert#labs-automated:trace');
const warn = debug('@modusjs/convert#labConfigs:warn');
//const error = debug('@modusjs/convert#labs-automated:error');

export let labConfigs : Record<string, LabConfig> = {
  a_l_west,
  tomkat
}

// Override labconfigs with airtable data.
const lCs = airtable.labConfigs as unknown as Record<string, LabConfig>;
labConfigs = Object.fromEntries(Object.entries(labConfigs)
  .map(([key, obj]: [string, LabConfig]) => {
    if (Object.keys(lCs).includes(obj.name)) {
      obj.analytes = {
        ...obj.analytes,
        ...lCs[obj.name]!.analytes,
      }
    }
    return [key, obj]
  }))

export const labConfigsMap = new Map<string, LabConfig>(
  Object.values(labConfigs).map(obj => ([obj.name, obj as LabConfig]))
)

export type Analyte = {
  Element: string;
  ValueUnit?: string;
  Value?: number;
  ValueType?: any;
  ValueDesc?: any;
  UCUM_ValueUnits?: string;
  ExtractionMethod?: string;
  MeasurementMethod?: string;
  ModusTestID?: string;
  CsvHeader?: string;
}

export type LabConfig = {
  units: Units;
  name: string;
  headers: string[];
  analytes: Record<string, Analyte>;
  //Mappings can point to undefined so the config lists all known headers
  mappings: Record<string, keyof typeof toModusJsonPath | undefined>;
  //mappings: Record<string, keyof typeof toModusJsonPath | keyof typeof toModusJsonPath[] | undefined>;
  //examplesKey?: keyof typeof examples;
  examplesKey?: string;
  depthInfo?: Depth | ((row: any) => Depth);
}

type Depth = {
  Name?: string;
  DepthUnit?: string;
  StartingDepth?: number;
  EndingDepth?: number;
  ColumnDepth?: number;
}

type ModusMapping = {
  path: string;
  type?: string;
  fullpath?: string;
  //TODO: Is there a better way that's already established to do this?
  parse?: string | undefined;
}

export const toModusJsonPath = {
  //Per-event basis
  'EventDate': {
    type: 'event',
    path: '$.EventMetaData.EventDate',
    fullpath: '$.Events.*.EventMetaData.EventDate',
    parse: 'date',
  },
  'EventCode': {
    type: 'event',
    path: '$.EventMetaData.EventCode',
    fullpath: '$.Events.*.EventMetaData.EventCode',
  },
  'Grower': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Grower',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Grower',
  },
  'Field': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Field',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Field',
  },
  'LabEventID': {
    type: 'event',
    path: '$.LabMetaData.LabEventID',
    fullpath: '$.Events.*.LabMetaData.LabEventID',
  },
  'LabID': {
    type: 'event',
    path: '$.LabMetaData.LabID',
    fullpath: '$.Events.*.LabMetaData.LabID',
    parse: 'string',
  },
  'ProcessedDate': {
    type: 'event',
    path: '$.LabMetaData.ProcessedDate',
    fullpath: '$.Events.*.LabMetaData.ProcessedDate',
    parse: 'date',
  },
  'Name': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.Name',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.Name',
  },
  'AccountNumber': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.AccountNumber',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.AccountNumber',
    parse: 'string',
  },
  'Address1': {
    type: 'event',
    path: `$.LabMetaData.ClientAccount['Address 1']`,
    fullpath: `$.Events.*.LabMetaData.ClientAccount['Address 1']`,
  },
  'Address2': {
    type: 'event',
    path: `$.LabMetaData.ClientAccount['Address 2']`,
    fullpath: `$.Events.*.LabMetaData.ClientAccount['Address 2']`,
  },
  'Zip': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.Zip',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.Zip',
  },
  'State': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.State',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.State',
  },
  'City': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.City',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.City',
  },
  'Company': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.Company',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.Company',
  },

  // Per-event and per-report
  'LabReportID': {
    type: 'report',
    path: '$.LabMetaData.Reports.*.LabReportID',
    fullpath: '$.Events.*.LabMetaData.Reports.*.LabReportID',
  },

  // Per-event and per-row
  'SampleNumber': {
    type: 'sample',
    path: '$.SampleMetaData.SampleNumber',
    fullpath: '$.Events.*.EventSamples.Soil.SoilSamples.*.SampleMetaData.SampleNumber',
  },
  'SampleContainerID': {
    type: 'sample',
    path: '$.SampleMetaData.SampleContainerID',
    fullpath: '$.Events.*.EventSamples.Soil.SoilSamples.*.SampleMetaData.SampleContainerID',
    parse: 'string',
  },
  'FMISSampleID': {
    type: 'sample',
    path: '$.SampleMetaData.FMISSampleID',
    fullpath: '$.Events.*.EventSamples.Soil.SoilSamples*.FMISSampleID',
  },
  'StartingDepth': {
    type: 'depth',
    path: '$.StartingDepth',
    fullpath: '$.Events.*.EventSamples.Soil.DepthRefs.*.StartingDepth',
    parse: 'number'
  },
  'EndingDepth': {
    type: 'depth',
    path: '$.EndingDepth',
    fullpath: '$.Events.*.EventSamples.Soil.DepthRefs.*.EndingDepth',
    parse: 'number'
  },
}

export function toDetailedMappings(mm: LabConfig['mappings']): Record<string, ModusMapping> | undefined {
  if (mm === undefined) return undefined;
  return Object.fromEntries(Object.entries(mm)
    .filter(([_, modusKey]) => modusKey !== undefined)
    .map(([header, modusKey]) => ([
      header,
      toModusJsonPath[modusKey!]
    ]))
  )
}

export function parseMappingValue(val: any, mapping: ModusMapping) {
  switch (mapping.parse) {
    case 'number':
      return +val;
    case 'date':
      return new Date(val).toISOString();
    case 'string':
      return ''+val;
    default:
      return val;
  }
}

export function setMappings(modusPiece: any, labConfig: LabConfig, type: string, row: any) {
  if (labConfig.mappings === undefined) return;
  Object.entries(toDetailedMappings(labConfig.mappings) || {})
  .filter(([_, m]) => m.type === type)
  .forEach(([key, m]) => {
    let val: any = parseMappingValue(row[key], m)
    jp.value(modusPiece, m.path, val);
  })
  return modusPiece
}