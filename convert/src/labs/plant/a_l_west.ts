import type { LocalLabConfig } from '../index.js';

const mappings : LocalLabConfig["mappings"] = {
  // ID numbers
  'SAMPLEID': 'SampleNumber',
  'LABNUM': 'SampleContainerID',
  'REPORTNUM': 'LabEventID',

  //Other metadata
  // DATESAMPL might map to something, but its all empty strings in our samples
  // so it won't convert to a valid date...
  'DATESAMPL': undefined,
  'DATESUB': ['EventDate', 'ReceivedDate'],
  'CLIENT': 'AccountNumber',
  'GROWER': 'Grower',
  'PERSON': 'AccountName',

  // I don't think these map to anything in modus:
  'TIMESUB': undefined,
  'CROP': 'Crop',
  'TYPE': undefined,
}

const analytes : LocalLabConfig["analytes"] = {
  'N': {
    ValueUnit: '%',
    Element: 'N',
  },
  'P': {
    ValueUnit: '%',
    Element: 'Phosphorus',
  },
  'K': {
    ValueUnit: '%',
    Element: 'K',
  },
  'MG': {
    ValueUnit: '%',
    Element: 'Mg',
  },
  'CA': {
    ValueUnit: '%',
    Element: 'Ca',
  },
  'NA': {
    ValueUnit: '%',
    Element: 'Na',
  },
  'NO3_N': {
    ValueUnit: 'ppm',
    Element: 'NO3-N',
  },
  'S': {
    ValueUnit: '%',
    Element: 'S',
  },
  'ZN': {
    ValueUnit: 'ppm',
    Element: 'Zn',
  },
  'MN': {
    ValueUnit: 'ppm',
    Element: 'Mn',
  },
  'FE': {
    ValueUnit: 'ppm',
    Element: 'Fe',
  },
  'CU': {
    ValueUnit: 'ppm',
    Element: 'Cu',
  },
  'B': {
    ValueUnit: 'ppm',
    Element: 'B',
  },
  'CL': {
    ValueUnit: '%',
    Element: 'Cl',
  },
  'MO': {
    ValueUnit: 'ppm',
    Element: 'Mo',
  },
  'AL': {
    ValueUnit: 'ppm',
    Element: 'Al',
  },
  'PO4_P': {
    ValueUnit: 'meq/100g',
    Element: 'PO4_P',
  },
  'K_EXT': {
    ValueUnit: 'meq/100g',
    Element: 'Potassium Extracted',
  },
  'SO4_S': {
    ValueUnit: 'ppm',
    Element: 'SO4-S',
  },
}

const config : LocalLabConfig = {
  name: 'A&L Western Agricultural Labs - Modesto, CA',
  type: 'Plant',
  mappings,
  //analytes,
  examplesKey: 'a_l_west',
};

export default config;