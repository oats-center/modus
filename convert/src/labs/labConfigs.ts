import type { Units } from '@modusjs/units';
import debug from 'debug';
import * as industry from '@modusjs/industry';
import jp from 'jsonpath';

import { default as a_l_west } from './soil/a_l_west.js';
import { default as a_l_west_plant } from './plant/a_l_west.js';
import { default as tomkat} from './soil/tomkat.js';

//const info = debug('@modusjs/convert#labs-automated:info');
//const trace = debug('@modusjs/convert#labs-automated:trace');
const warn = debug('@modusjs/convert#labConfigs:warn');
//const error = debug('@modusjs/convert#labs-automated:error');

export let labConfigs : Record<string, Record<string, LabConfig>> = {
  a_l_west: {
    'Soil': a_l_west,
    'Plant': a_l_west_plant,
  },
  tomkat: {
    'Soil': tomkat
  }
}

// Override labconfigs with industry data.
const lCs = industry.labConfigs as unknown as Record<string, Record<string, LabConfig>>;
labConfigs = Object.fromEntries(Object.entries(labConfigs)
  .map(([k, lab]: [string, Record<string, LabConfig>]) => (
    [k, Object.fromEntries(Object.entries(lab)
      .map(([key, obj]: [string, LabConfig]) => {
        if (Object.keys(lCs).includes(obj.name)) {
          obj.analytes = {
            ...obj.analytes,
            ...lCs[obj.name]?.[key]?.analytes,
          }
        }
        return [key, obj]
      })
    )]
  ))
)

/*
let allConfigs = Object.values(labConfigs).map(o => {
  let confs = Object.values(o).map(obj => [`${obj.name}-${obj.type}`, obj]);
  return confs;
  }).flat(1)
  */
export const labConfigsMap = new Map<string, LabConfig>(
  Object.values(labConfigs).map(o =>
    Object.values(o).map(obj => [`${obj.name}-${obj.type === undefined ? '' : obj.type}`, obj as LabConfig])
  ).flat(1) as Array<[string, LabConfig]>
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

export type LabType = 'Soil' | 'Plant'; // | 'Nematode' | 'Water' | 'Residue' others to be added later

export type LabConfig = {
  units: Units;
  name: string;
  headers: string[];
  analytes: Record<string, Analyte>;
  //Mappings can point to undefined so the config lists all known headers
  mappings: Record<string, keyof typeof toModusJsonPath | undefined | Array<keyof typeof toModusJsonPath>>;
  //mappings: Record<string, keyof typeof toModusJsonPath | keyof typeof toModusJsonPath[] | undefined>;
  //examplesKey?: keyof typeof examples;
  examplesKey?: string;
  depthInfo?: Depth | ((row: any) => Depth | undefined);
  packageName?: string | ((row: any) => string);
  type?: LabType | ((row: any) => LabType);
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
  'Crop': {
    //type: 'event',
    path: '$.EventMetaData.EventType.Plant.Crop',
    fullpath: '$.Events.*.EventMetaData.EventType.Plant.Crop',
  },
  'PlantPart': {
    type: 'event',
    path: '$.EventType.Plant.PlantPart',
    fullpath: '$.Events.*.EventMetaData.EventType.Plant.PlantPart',
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
  'ReceivedDate': {
    type: 'event',
    path: '$.LabMetaData.ReceivedDate',
    fullpath: '$.Events.*.LabMetaData.ReceivedDate',
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

type DetailedMapping = {
  key: string;
  mm: ModusMapping;
};

export function toDetailedMappings(mm: LabConfig['mappings']): Array<DetailedMapping> {
  const arr : Array<DetailedMapping> = [];
  Object.entries(mm || {}).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      v.forEach((vv) => arr.push({key: k, mm: toModusJsonPath[vv]}))
    } else {
      arr.push({ key: k, mm: toModusJsonPath[v!] });
    }
  })
  return arr;
  /*
  return Object.entries(mm).filter(([_, modusKey]) => modusKey !== undefined)
    .map(([header, modusKey]) => ([
      header,
      Array.isArray(modusKey) ? modusKey.map(k => toModusJsonPath[k]) : toModusJsonPath[modusKey!]
    ]))
    }
  return arr;
    */
}

function parseDate(date: any) {
  if (date instanceof Date) return date
  if ((''+date).length === 8 && parseInt(''+date)) {
    date = ''+date;
    return new Date(`${date.substring(0,4)}-${date.substring(4,6)}-${date.substring(6)}`);
  } else if (new Date(''+date).toString() !== 'Invalid Date') {
    return new Date(''+date)
  } else {
    return new Date(date);
  }
}

export function parseMappingValue(val: any, mapping: ModusMapping) {
  switch (mapping.parse) {
    case 'number':
      return +val;
    case 'date':
      return val ? parseDate(val).toISOString().split('T')[0] : val;
    case 'string':
      return ''+val;
    default:
      return val;
  }
}

export function setMappings(modusPiece: any, type: string, row: any, labConfig?: LabConfig) {
  if (labConfig?.mappings === undefined) return modusPiece;
  toDetailedMappings(labConfig.mappings)
  .filter(({ mm }) => mm !== undefined && mm.type === type)
  .forEach(({key, mm}) => {
    let val: any = parseMappingValue(row[key], mm)
    jp.value(modusPiece, mm.path, val);
  })
  return modusPiece
}