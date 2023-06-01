import type { Units } from '@modusjs/units';
import debug from 'debug';
import * as industry from '@modusjs/industry';
import jp from 'jsonpath';

import { default as a_l_west_soil } from './soil/a_l_west.js';
import { default as agrimanagement_soil} from './soil/agrimanagement.js';
import { default as tomkat_soil} from './soil/tomkat.js';
import { default as a_l_west_plant } from './plant/a_l_west.js';

//const info = debug('@modusjs/convert#labs-automated:info');
//const trace = debug('@modusjs/convert#labs-automated:trace');
const warn = debug('@modusjs/convert#labConfigs:warn');
//const error = debug('@modusjs/convert#labs-automated:error');

export let localLabConfigs : LocalLabConfig[] = [
  a_l_west_soil,
  a_l_west_plant,
  tomkat_soil,
  agrimanagement_soil
]

const industryLabConfigs = industry.labConfigs as unknown as Record<string, Record<string, IndustryLabConfig>>;
export const labConfigs = Object.fromEntries(Object.entries(industryLabConfigs)
  // Merge the industry config data with local lab configs
  .map(([labName, lab]) => (
    [labName, Object.fromEntries(Object.entries(lab)
      .map(([labType, industryLabConf]) => {
        const localLabConf = localLabConfigs.find((llc) => llc.name === labName && llc.type === labType);
        return [labType, composeLabConfig(localLabConf, industryLabConf)]
      })
    )]
  ))
);
// Now add in local configs that do not exist in industry list
localLabConfigs
  .filter((llc) => !industryLabConfigs[llc.name]?.[llc.type])
  .forEach(llc => {
    labConfigs[llc.name] = labConfigs[llc.name] ?? {};
    labConfigs[llc.name]![llc.type] = composeLabConfig(llc)
  })

function composeLabConfig(a: LocalLabConfig | undefined, b?: IndustryLabConfig): LabConfig {
  if (!a && !b) throw new Error('At least one of local or industry lab config must be supplied');
  let combined = {
    ...b,
    ...a,
    // Make sure these keys exist and merge favoring local.
    mappings: {
      ...b?.mappings,
      ...a?.mappings,
    },
    analytes: {
      ...b?.analytes,
      ...a?.analytes
    }
  };
  // @ts-expect-error name will exist if the code reaches here
  return {
    ...combined,
    units: Object.fromEntries(
      Object.entries(combined.analytes).map(([k, val]) => ([k, val?.ValueUnit]))
    ),
    headers: [
      ...Object.keys(combined.analytes),
      ...Object.keys(combined.mappings || {}),
    ],
  }
}

export const labConfigsMap = new Map<string, LabConfig>(
  Object.values(labConfigs).map(lab =>
    Object.values(lab).map((labConf, i) => [
      `${labConf.name}-${labConf.type ?? i}`,
      labConf
    ])
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
  name: string;
  type: string;//LabType;//| ((row: any) => LabType);
  analytes: Record<string, Analyte>;
  mappings: Record<string, keyof typeof toModusJsonPath | undefined | Array<keyof typeof toModusJsonPath>>;
  headers: string[];
  units: Units;
  examplesKey?: string;
  depthInfo?: Depth | ((row: any) => Depth | undefined);
  packageName?: string | ((row: any) => string);
}

export type LocalLabConfig = {
  units?: Units;
  name: string;
  headers?: string[];
  analytes?: Record<string, Analyte>;
  mappings: Record<string, keyof typeof toModusJsonPath | undefined | Array<keyof typeof toModusJsonPath>>;
  examplesKey?: string;
  depthInfo?: Depth | ((row: any) => Depth | undefined);
  packageName?: string | ((row: any) => string);
  type: string; //LabType; //| ((row: any) => LabType);
}

export type IndustryLabConfig = {
  name: string;
  analytes: Record<string, Analyte>;
  mappings?: Record<string, keyof typeof toModusJsonPath | undefined | Array<keyof typeof toModusJsonPath>>;
//  packageName?: string | ((row: any) => string);
  type: string; //LabType; //| ((row: any) => LabType);
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
    description: 'Top-level date assigned to this MODUS event',
  },
  'EventCode': {
    type: 'event',
    path: '$.EventMetaData.EventCode',
    fullpath: '$.Events.*.EventMetaData.EventCode',
    description: 'Top-level code assigned to this MODUS event',
  },
  'Crop': {
    //type: 'event',
    path: '$.EventMetaData.EventType.Plant.Crop',
    fullpath: '$.Events.*.EventMetaData.EventType.Plant.Crop',
    description: 'Crop name of the plant tissue sample submitted',
  },
  'PlantPart': {
    type: 'event',
    path: '$.EventType.Plant.PlantPart',
    fullpath: '$.Events.*.EventMetaData.EventType.Plant.PlantPart',
    description: 'Plant part name of the plant tissue sample submitted',
  },
  'Grower': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Grower',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Grower',
    description: 'Grower name assigned by the FMIS that submitted the samples',
  },
  'Farm': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Farm',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Farm',
    description: 'Farm name assigned by the FMIS that submitted the samples',
  },
  'Field': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Field',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Field',
    description: 'Field name assigned by the FMIS that submitted the samples',
  },
  'SubField': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Sub-Field',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Sub-Field',
    description: 'Sub-Field name assigned by the FMIS that submitted the samples',
  },

  'LabEventID': {
    type: 'event',
    path: '$.LabMetaData.LabEventID',
    fullpath: '$.Events.*.LabMetaData.LabEventID',
    description: 'The ID of the sample processing event as assigned by the lab',
  },
  'LabID': {
    type: 'event',
    path: '$.LabMetaData.LabID',
    fullpath: '$.Events.*.LabMetaData.LabID',
    parse: 'string',
    description: 'The ID of the lab that performed the analysis.',
  },
  'ProcessedDate': {
    type: 'event',
    path: '$.LabMetaData.ProcessedDate',
    fullpath: '$.Events.*.LabMetaData.ProcessedDate',
    parse: 'date',
    description: 'Date samples processed by the lab',
  },
  'ReceivedDate': {
    type: 'event',
    path: '$.LabMetaData.ReceivedDate',
    fullpath: '$.Events.*.LabMetaData.ReceivedDate',
    parse: 'date',
    description: 'Date samples received by the lab',
  },
  'Name': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.Name',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.Name',
    description: 'The name of the lab client that submitted the samples.',
  },
  'AccountNumber': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.AccountNumber',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.AccountNumber',
    parse: 'string',
    description: 'The account number of the lab client that submitted the samples.',
  },
  'Address1': {
    type: 'event',
    path: `$.LabMetaData.ClientAccount['Address 1']`,
    fullpath: `$.Events.*.LabMetaData.ClientAccount['Address 1']`,
    description: 'The street address of the lab client that submitted the samples.',
  },
  'Address2': {
    type: 'event',
    path: `$.LabMetaData.ClientAccount['Address 2']`,
    fullpath: `$.Events.*.LabMetaData.ClientAccount['Address 2']`,
    description: 'The street address (line 2) of the lab client that submitted the samples.',
  },
  'Zip': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.Zip',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.Zip',
    description: 'The zip code of the lab client that submitted the samples.',
  },
  'State': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.State',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.State',
    description: 'The state of the lab client that submitted the samples.',
  },
  'City': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.City',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.City',
    description: 'The city of the lab client that submitted the samples.',
  },
  'Company': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.Company',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.Company',
    description: 'The company name of the lab client that submitted the samples.',
  },

  // Per-event and per-report
  'LabReportID': {
    type: 'report',
    path: '$.LabMetaData.Reports.*.LabReportID',
    fullpath: '$.Events.*.LabMetaData.Reports.*.LabReportID',
    description: 'ID of the Lab Report',
  },

  // Per-event and per-row
  'SampleNumber': {
    type: 'sample',
    path: '$.SampleMetaData.SampleNumber',
    fullpath: '$.Events.*.EventSamples.Soil.SoilSamples.*.SampleMetaData.SampleNumber',
    description: 'Sample number as numbered by the lab',
  },
  'SampleContainerID': {
    type: 'sample',
    path: '$.SampleMetaData.SampleContainerID',
    fullpath: '$.Events.*.EventSamples.Soil.SoilSamples.*.SampleMetaData.SampleContainerID',
    parse: 'string',
    description: 'Sample container ID as submitted by the client',
  },
  'FMISSampleID': {
    type: 'sample',
    path: '$.SampleMetaData.FMISSampleID',
    fullpath: '$.Events.*.EventSamples.Soil.SoilSamples*.FMISSampleID',
    description: 'Sample ID assigned by the FMIS that submitted the samples',
  },
  'StartingDepth': {
    type: 'depth',
    path: '$.StartingDepth',
    fullpath: '$.Events.*.EventSamples.Soil.DepthRefs.*.StartingDepth',
    parse: 'number',
    description: 'Starting depth (top) of the soil sample',
  },
  'EndingDepth': {
    type: 'depth',
    path: '$.EndingDepth',
    fullpath: '$.Events.*.EventSamples.Soil.DepthRefs.*.EndingDepth',
    description: 'Ending depth (bottom) of the soil sample',
  },
  'ColumnDepth': {
    type: 'depth',
    path: '$.EndingDepth',
    fullpath: '$.Events.*.EventSamples.Soil.DepthRefs.*.EndingDepth',
    description: 'Column depth (top to bottom) of the soil sample',
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