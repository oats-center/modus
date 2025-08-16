import type { Units } from '@modusjs/units';
import debug from 'debug';
import * as industry from '@modusjs/industry';
import moment from 'moment';
import { getJsDateFromExcel } from 'excel-date-to-js';
import dayjs from 'dayjs';
import jp from 'jsonpath';

import { default as a_l_ftwayne_soil} from './soil/a_l_ftwayne.js';
import { default as a_l_west_soil } from './soil/a_l_west.js';
import { default as a_l_wisc_soil} from './soil/a_l_wisc.js';
import { default as soiltest_soil} from './soil/soiltestfarmconsultants.js';
import { default as tomkat_soil} from './soil/tomkat.js';
import { default as a_l_west_plant } from './plant/a_l_west.js';
import { default as kuo_soil} from './soil/kuo.js';
import { default as brookside_soil } from './soil/brookside.js';
import { default as cquester_soil } from './soil/cquester.js';
import { default as uga } from './soil/uga.js';
import { default as ward_soil } from './soil/ward.js';
import { default as vertex_soil } from './soil/vertex.js';

//const info = debug('@modusjs/convert#labs-automated:info');
//const trace = debug('@modusjs/convert#labs-automated:trace');
const warn = debug('@modusjs/convert#labConfigs:warn');
//const error = debug('@modusjs/convert#labs-automated:error');

export let localLabConfigs : LocalLabConfig[] = [
  a_l_ftwayne_soil,
  a_l_west_soil,
  a_l_wisc_soil,
  a_l_west_plant,
  brookside_soil,
  tomkat_soil,
  soiltest_soil,
  kuo_soil,
  cquester_soil,
  uga,
  ward_soil,
  vertex_soil,
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
  //mappings: Record<string, keyof typeof toModusJsonPath | undefined | Array<keyof typeof toModusJsonPath>>;
  mappings: Record<string, string | undefined | string[]>;
  examplesKey?: string;
  depthInfo?: Depth | ((row: any) => Depth | undefined);
  packageName?: string | ((row: any) => string);
  type: string; //LabType; //| ((row: any) => LabType);
}

export type IndustryLabConfig = {
  name: string;
  analytes: Record<string, Analyte>;
  //mappings?: Record<string, keyof typeof toModusJsonPath | undefined | Array<keyof typeof toModusJsonPath>>;
  mappings?: Record<string, string | undefined | string[]>;
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
  'ReportDate': {
    type: 'event',
    path: '$.EventMetaData.EventDate',
    fullpath: '$.Events.*.EventMetaData.EventDate',
    parse: 'date',
    description: 'Top-level date assigned to this MODUS event',
    slim: '/date',
  },
  'ReportID': {
    type: 'event',
    path: '$.EventMetaData.EventCode',
    fullpath: '$.Events.*.EventMetaData.EventCode',
    description: 'Top-level code assigned to this MODUS event',
    slim: '/id',

  },
  'ReportType': {
    type: 'event',
    path: '$.EventMetaData.EventType',
    fullpath: '$.Events.*.EventMetaData.EventCode',
    description: 'Top-level code assigned to this MODUS event',
    slim: '/id',
  },

  'Crop': {
    //type: 'event',
    path: '$.EventMetaData.EventType.Plant.Crop',
    fullpath: '$.Events.*.EventMetaData.EventType.Plant.Crop',
    description: 'Crop name of the plant tissue sample submitted',
    slim: `/crop`
  },
  'PlantPart': {
    type: 'event',
    path: '$.EventType.Plant.PlantPart',
    fullpath: '$.Events.*.EventMetaData.EventType.Plant.PlantPart',
    description: 'Plant part name of the plant tissue sample submitted',
    slim: `/plantPart`
  },
  'Grower': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Grower',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Grower',
    description: 'Grower name assigned by the FMIS that submitted the samples',
    slim: `/source/grower/id`
  },
  'GrowerName': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Grower',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Grower',
    description: 'Grower name assigned by the FMIS that submitted the samples',
    slim: `/source/grower/name`
  },
  'FarmName': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Farm',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Farm',
    description: 'Farm name assigned by the FMIS that submitted the samples',
    slim: `/source/farm/name`
  },
  'Farm': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Farm',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Farm',
    description: 'Farm name assigned by the FMIS that submitted the samples',
    slim: `/source/farm/id`
  },
  'Field': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Field',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Field',
    description: 'Field name assigned by the FMIS that submitted the samples',
    slim: `/source/field/id`
  },
  'FieldName': {
    type: 'event',
    path: '$.FMISMetaData.FMISProfile.Field',
    fullpath: '$.Events.*.FMISMetaData.FMISProfile.Field',
    description: 'Field name assigned by the FMIS that submitted the samples',
    slim: `/source/field/name`
  },
  'SubField': {
    type: 'event',
    path: `$.FMISMetaData.FMISProfile["Sub-Field"]`,
    fullpath: '$.Events.*.FMISMetaData.FMISProfile["Sub-Field"]',
    description: 'Subfield name assigned by the FMIS that submitted the samples',
    slim: `/source/subfield/id`
  },
  'SubFieldName': {
    type: 'event',
    path: `$.FMISMetaData.FMISProfile["Sub-Field"]`,
    fullpath: '$.Events.*.FMISMetaData.FMISProfile["Sub-Field"]',
    description: 'Subfield name assigned by the FMIS that submitted the samples',
    slim: `/source/subfield/name`
  },

  'LabEventID': {
    type: 'event',
    path: '$.LabMetaData.LabEventID',
    fullpath: '$.Events.*.LabMetaData.LabEventID',
    parse: 'string',
    description: 'The ID of the sample processing event as assigned by the lab',
    slim: `/lab/report/id`
  },
  'LabID': {
    type: 'event',
    path: '$.LabMetaData.LabID',
    fullpath: '$.Events.*.LabMetaData.LabID',
    parse: 'string',
    description: 'The ID of the lab that performed the analysis.',
    slim: '/lab/id',
  },
  'DateProcessed': {
    type: 'event',
    path: '$.LabMetaData.ProcessedDate',
    fullpath: '$.Events.*.LabMetaData.ProcessedDate',
    parse: 'date',
    description: 'Date samples processed by the lab',
    slim: '/lab/dateProcessed',
  },
  'DateReceived': {
    type: 'event',
    path: '$.LabMetaData.ReceivedDate',
    fullpath: '$.Events.*.LabMetaData.ReceivedDate',
    parse: 'date',
    description: 'Date samples received by the lab',
    slim: '/lab/dateReceived',
  },

  'LabContactName': {
    type: 'event',
    path: '$.LabMetaData.Contact.Name',
    fullpath: '$.Events.*.LabMetaData.Contact.Name',
    description: 'The name of the lab contact that submitted the samples.',
    slim: '/lab/contact/name',
  },
  'LabContactAddress': {
    type: 'event',
    path: `$.LabMetaData.Contact.Address`,
    fullpath: `$.Events.*.LabMetaData.Contact.Address`,
    description: 'The street address of the lab client that submitted the samples.',
    slim: '/lab/contact/address',
  },
  'LabContactPhone': {
    type: 'event',
    path: `$.LabMetaData.Contact.Phone`,
    fullpath: `$.Events.*.LabMetaData.Contact.Phone]`,
    description: 'The phone number of the lab contact.',
    slim: '/lab/contact/phone',
  },

  'ClientAddress': {
    type: 'event',
    path: `$.LabMetaData.ClientAccount['Address 1']`,
    fullpath: `$.Events.*.LabMetaData.ClientAccount['Address 1']`,
    description: 'The street address of the lab client that submitted the samples.',
    slim: '/lab/clientAccount/address',
  },
  'ClientAddress2': {
    type: 'event',
    path: `$.LabMetaData.ClientAccount['Address 2']`,
    fullpath: `$.Events.*.LabMetaData.ClientAccount['Address 2']`,
    description: 'The street address (line 2) of the lab client that submitted the samples.',
//    slim: '/lab/contact/address',
  },
  'ClientName': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.Name',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.Name',
    parse: 'string',
    description: 'The name of the lab client that submitted the samples.',
    slim: `/lab/clientAccount/name`
  },
  'ClientAccountNumber': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.AccountNumber',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.AccountNumber',
    parse: 'string',
    description: 'The account number of the lab client that submitted the samples.',
    slim: `/lab/clientAccount/accountNumber`
  },
  'ClientZip': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.Zip',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.Zip',
    description: 'The zip code of the lab client that submitted the samples.',
    slim: `/lab/clientAccount/zip`
  },
  'ClientState': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.State',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.State',
    description: 'The state of the lab client that submitted the samples.',
    slim: `/lab/clientAccount/state`
  },
  'ClientCity': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.City',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.City',
    description: 'The city of the lab client that submitted the samples.',
    slim: `/lab/clientAccount/city`
  },
  'ClientCompany': {
    type: 'event',
    path: '$.LabMetaData.ClientAccount.Company',
    fullpath: '$.Events.*.LabMetaData.ClientAccount.Company',
    description: 'The company name of the lab client that submitted the samples.',
    slim: `/lab/clientAccount/company`
  },
  'ClientPhone': {
    type: 'event',
    path: `$.LabMetaData.ClientAccount.Phone`,
    fullpath: `$.Events.*.LabMetaData.ClientAccount.Phone]`,
    description: 'The phone number of the lab contact.',
    slim: '/lab/clientAccount/phone',
  },

  // Per-event and per-report
  'LabReportID': {
    type: 'report',
    path: '$.LabMetaData.Reports.*.LabReportID',
    fullpath: '$.Events.*.LabMetaData.Reports.*.LabReportID',
    parse: 'string',
    description: 'ID of the Lab Report',
    slim: `/lab/report/id`
  },

  // Per-event and per-row
  'SampleNumber': {
    type: 'sample',
    path: '$.SampleMetaData.SampleNumber',
    fullpath: '$.Events.*.EventSamples.Soil.SoilSamples.*.SampleMetaData.SampleNumber',
    parse: 'string',
    description: 'Sample number as numbered by the lab',
    slim: '/lab/sampleid',
  },
  'SampleContainerID': {
    type: 'sample',
    path: '$.SampleMetaData.SampleContainerID',
    fullpath: '$.Events.*.EventSamples.Soil.SoilSamples.*.SampleMetaData.SampleContainerID',
    parse: 'string',
    description: 'Sample container ID as submitted by the client',
    slim: '/source/containerid',
  },
  'FMISSampleID': {
    type: 'sample',
    path: '$.SampleMetaData.FMISSampleID',
    fullpath: '$.Events.*.EventSamples.Soil.SoilSamples*.FMISSampleID',
    description: 'Sample ID assigned by the FMIS that submitted the samples',
    slim: '/source/sampleid',
  },
  'StartingDepth': {
    type: 'depth',
    path: '$.StartingDepth',
    fullpath: '$.Events.*.EventSamples.Soil.DepthRefs.*.StartingDepth',
    parse: 'number',
    description: 'Starting depth (top) of the soil sample',
    slim: '/depth/top'
  },
  'EndingDepth': {
    type: 'depth',
    path: '$.EndingDepth',
    fullpath: '$.Events.*.EventSamples.Soil.DepthRefs.*.EndingDepth',
    description: 'Ending depth (bottom) of the soil sample',
    slim: '/depth/bottom'
  },
  'ColumnDepth': {
    type: 'depth',
    path: '$.EndingDepth',
    fullpath: '$.Events.*.EventSamples.Soil.DepthRefs.*.EndingDepth',
    description: 'Column depth (top to bottom) of the soil sample',
//    slim: '/depth/column'
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

export function parseDate(date: any) {
  // Date object
  if (date instanceof Date) return date
  // 8-digit date
  if ((''+date).length === 8 && parseInt(''+date)) {
    date = ''+date;
    return new Date(`${date.substring(0,4)}-${date.substring(4,6)}-${date.substring(6)}`);
  } else if (+date < 100000 && +date > 100) {
    // this is an excel date (# days since 1/1/1900), parse it out
    return new Date(dayjs(getJsDateFromExcel(date)).format('YYYY-MM-DD'));
  } else if (new Date(''+date).toString() !== 'Invalid Date') {
    // Various parseable string formats
    return new Date(''+date)
  } else if (moment(''+date, 'DD-MM-YYYY').toString() !== 'Invalid Date') {
    // DD-MM-YYYY format which cannot be parsed automagically elsewhere
    return new Date(moment(''+date, 'DD-MM-YYYY').toString());
  } else if (new Date(date).toString() !== 'Invalid Date') {
    // Timestamp or other non-string, parsable thing.
    return new Date(date);
  } else {
    // Just return whatever came back in instead of an Invalid Date object
    return new Date(date);
    //return date;
  }
}

export function parseMappingValue(val: any, mapping: ModusMapping) {
  switch (mapping.parse) {
    case 'number':
      return +val;
    case 'date':
      if (val === 'NA') return false;
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
  .filter(({ key } ) => key in row)
  .forEach(({key, mm}) => {
    let val: any = parseMappingValue(row[key], mm)
    jp.value(modusPiece, mm.path, val);
  })
  return modusPiece
}