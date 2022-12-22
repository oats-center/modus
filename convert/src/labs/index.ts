import type { Units } from '@modusjs/units';

export { default as a_l_west } from './a_l_west.js';

export type LabConfig = {
  units: Units;
  name: string;
  headers: string[];
  analytes: Analytes;
  mappings: ModusMappings | undefined;
}

export type Analyte = {
  name: string,
  units: string,
  modusTestId?: string,
}

type Analytes = Record<string, Analyte>;
type ModusMappings = Record<string, string | undefined>;

export class LabConf implements LabConfig {
  units: Units;
  name: string;
  headers: string[];
  analytes: Analytes;
  mappings: ModusMappings | undefined;

  constructor({
    units,
    name,
    analytes,
    mappings
  }: {
    units?: Units,
    name: string,
    analytes?: Analytes,
    mappings?: ModusMappings,
  }) {
    if (!(units || analytes)) throw new Error(`'units' or 'analytes' required in constructor`)
    this.name = name;
    this.mappings = mappings;

    this.units = units || Object.fromEntries(
      Object.entries(!analytes).map(([key, val]) => ([key, val.units]))
    );

    this.analytes = analytes || Object.fromEntries(
      Object.entries(!units).map(([key, val]) => (
        [key, {
          name: key,
          units: val,
        }]
      ))
    );

    this.headers = [...Object.keys(this.units), ...Object.keys(this.mappings || {})];
  }
}

let toModusJsonPath = {
  'SampleNumber': 'Events[*].EventSamples.Soil.SoilSamples[*].SampleNumber',
  //TODO: Should ReportID in these two places be the same value?
  'ReportID': 'Events[*].EventSamples.Soil.SoilSamples[*].ReportID',
  //  'ReportID': 'Events[0].LabMetaData.Reports[*].ReportID'
  'LabEventID': 'Events[*].LabMetaData.LabEventID',
  'LabReportID': 'Events[*].LabMetaData.Reports[*].LabReportID',
  'EventDate': 'Events[*].EventMetaData.EventDate',
  'Grower': 'Events[*].FMISMetaData.FMISProfile.Grower',
  'Name': 'Events[*].LabMetaData.ClientAccount.Name',
  'AccountNumber': 'Events[*].LabMetaData.ClientAccount.AccountNumber',
}

function mapToModusPaths(mm: Record<string, keyof typeof toModusJsonPath>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(mm).map(([key, val]) => ([
      key,
      toModusJsonPath[val]
    ]))
  )
}