import { observable, computed } from 'mobx';
import debug from 'debug';
//import { labConfigs } from '@modusjs/industry';
import { csv } from '@modusjs/convert';

const warn = debug('@modusjs/app#state:warn');
const info = debug('@modusjs/apps#state:info');

// things that are too big to fit in the state without crashing browser
export type BigData = { rev: number };

export type Message = {
  type: 'good' | 'bad',
  msg: string,
};

export type Output = 'modusjson2' | 'json' | 'csv' | 'trellis';

export type State = {
  messages: Message[],
  output: Output,
  trellis: { domain: string, token: string },
  inzone: boolean,
  headless: boolean,
  table: {
    selected: any[],
  }
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
  trellis: { domain: 'https://localhost', token: 'god' },
  inzone: false,
  headless: false,
  labConfig: {
    select: {},
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


