import { observable } from 'mobx';
import debug from 'debug';
//import { labConfigs } from '@modusjs/industry';
import { csv } from '@modusjs/convert';
import type { Slim } from '@modusjs/convert';

const warn = debug('@modusjs/app#state:warn');
const info = debug('@modusjs/apps#state:info');

// things that are too big to fit in the state without crashing browser
export type BigData = { rev: number };

export type Message = {
  type: 'good' | 'bad',
  msg: string,
};

export type Output = 'modusjson2' | 'json' | 'csv' | 'trellis';

// Note to Sam: I just used your comment below to make this type
export type LabConfig = {
  name: string,
  type: 'soil' | 'plant-tissue' | 'nematode' | 'water' | 'residue', // from modus slim json-schema
  analytes: {
    [name: string]: {
      header: string,
      Element: string,
      ModusTestID: string,
      ValueUnit: string,
    }
  },
  mappings: {
    [name: string]: {
      CsvHeader: string,
      modus: string,
    }
  }
};

export type TrellisFile = {
  filename: string,
  lab: string,
  date: string,
  sampleCount: number,
  field: string,
  farm: string,
};

export type State = {
  tab: string,
  messages: Message[],
  output: Output,
  trellis: { domain: string, token: string, connected: boolean },
  inzone: boolean,
  headless: boolean,
  // Note to Sam: I just used your comment below to make this type
  labConfig: {
    show: boolean,
    selected: { name: string, type: string },
    config: LabConfig | null,
    list: typeof list,
    analyteEditor: { ValueUnit: string, CsvHeader: string, },
  },
  files: {
    [hash: string]: Slim,
  },
  table: {
    order: 'asc' | 'desc',
    orderBy: string,
    selected: number[],
    page: number,
    dense: boolean,
    rowsPerPage: number,
    files: {
      [hash: string]: TrellisFile,
    },
  },
};

// Get LabConfigs from LocalStorage

const list = Object.fromEntries(
  Object.entries(csv.labs.labConfigs).map(([labName, labTypes]) =>
    Object.entries(labTypes || {}).map(([type, conf]) =>
      ([`${labName} - ${type === 'undefined' ? 'Soil' : type}`, conf])
    )
  ).flat(1)
);

// Figure out the config: load from localStorage, but have default
export const state = observable<State>({
  tab: "1",
  messages: [],
  output: 'modusjson2',
  trellis: { domain: 'https://localhost', token: 'god', connected: false },
  inzone: false,
  headless: false,
  labConfig: {
    show: false,
    selected: { name: '', type: '' },
    config: null,
    /*config: {
      name: 'Test Lab Configuration 1',
      type: 'Soil',
      analytes: {
        SO4_S: {
          header: 'SO4_S',
          Element: 'SO4-S',
          ModusTestID: 'S-SO4S-test123',
          ValueUnit: 'ppm',
        }
      },
      mappings: {
        'REPORT_ID': {
          CsvHeader: 'REPORT_ID',
          modus: 'Report ID'
        }
      }
    },*/
    list,
    analyteEditor: { ValueUnit: '', CsvHeader: '' },
  },
  files: {},
  table: {
    order: 'asc',
    orderBy: 'filename',
    selected: [],
    page: 0,
    dense: true,
    rowsPerPage: 25,
    files: {},
    //files: computed(() => {
    //  return {
    //    abc123: {
    //      filename: 'testfile.csv',
    //      lab: 'A & L Western Laboratories - Modesto, CA',
    //      date: '2024-08-20',
    //      sampleCount: 18,
    //      field: 'Back40',
    //      farm: 'Home',
    //    },
    //    return {}
    //}).get()
  },
});