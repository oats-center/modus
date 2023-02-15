import type { Units, NutrientResult } from '@modusjs/units';
import { default as a_l_west } from './a_l_west.js';
import { default as tomkat} from './tomkat.js';
// @ts-ignore
//import * as examples from '@modusjs/examples';

export * from './automated.js';
export const labConfigs = {
  a_l_west,
  tomkat
}
export const labConfigsMap = new Map<string, LabConfig>(
  Object.values(labConfigs).map(obj => ([obj.name, obj as LabConfig]))
)

export type LabConfig = {
  units: Units;
  name: string;
  headers: string[];
  analytes: Record<string, NutrientResult>;
  //Mappings can point to undefined so the config lists all known headers
  mappings: Record<string, keyof typeof toModusJsonPath | undefined>;
  //examplesKey?: keyof typeof examples;
  examplesKey?: string;
}

const toModusJsonPath = {
  // A counter of samples: 1, 2, 3, ...
  'SampleNumber': 'Events[*].EventSamples.Soil.SoilSamples[*].SampleNumber',
  'SampleID': 'Events[*].EventSamples.Soil.SoilSamples[*].FMISSampleID',
  // A more unique ID for each sample
  'ReportID': 'Events[*].EventSamples.Soil.SoilSamples[*].ReportID',
  //TODO: Should ReportID in these two places be the same value?
  //  'ReportID': 'Events[0].LabMetaData.Reports[*].ReportID'
  'LabEventID': 'Events[*].LabMetaData.LabEventID',
  'LabID': 'Events[*].LabMetaData.LabID',
  'LabReportID': 'Events[*].LabMetaData.Reports[*].LabReportID',
  'EventDate': 'Events[*].EventMetaData.EventDate',
  'Grower': 'Events[*].FMISMetaData.FMISProfile.Grower',
  'Field': 'Events[*].FMISMetaData.FMISProfile.Field',
  'Name': 'Events[*].LabMetaData.ClientAccount.Name',
  'AccountNumber': 'Events[*].LabMetaData.ClientAccount.AccountNumber',
  'Address1': `Events[*].LabMetaData.ClientAccount['Address 1']`,
  'Address2': `Events[*].LabMetaData.ClientAccount['Address 2']`,
  'Zip': 'Events[*].LabMetaData.ClientAccount.Zip',
  'State': 'Events[*].LabMetaData.ClientAccount.State',
  'City': 'Events[*].LabMetaData.ClientAccount.City',
  'Company': 'Events[*].LabMetaData.ClientAccount.Company',
  'ProcessedDate': 'Events[*].LabMetaData.ProcessedDate',
  'StartingDepth': 'Events[*].EventSamples.Soil.DepthRefs[*].StartingDepth',
  'EndingDepth': 'Events[*].EventSamples.Soil.DepthRefs[*].EndingDepth',
}

const modusPaths = Object.fromEntries(
  Object.entries(toModusJsonPath).map(([k, v]) => ([v, k]))
);

export function mapToModusPaths(mm: LabConfig['mappings']): Record<string, keyof typeof modusPaths> | undefined {
  if (mm === undefined) return undefined;
  return Object.fromEntries(Object.entries(mm)
    .filter(([_, modusKey]) => modusKey !== undefined)
    .map(([header, modusKey]) => ([
      header,
      toModusJsonPath[modusKey!]
    ]))
  )
}