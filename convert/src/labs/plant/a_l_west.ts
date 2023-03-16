import type { LabConfig } from '../index.js';

const mappings : LabConfig["mappings"] = {
  // ID numbers
  'SAMPLEID': 'SampleNumber',
  'LABNUM': 'SampleContainerID',
  'REPORTNUM': 'LabEventID',

  //Other metadata
  // DATESAMPL might map to something, but its all empty strings in our samples
  // so it won't convert to a valid date...
  'DATESAMPL': undefined,
  'DATESUB': 'EventDate',
  'CLIENT': 'AccountNumber',
  'GROWER': 'Grower',
  'PERSON': 'Name',

  // I don't think these map to anything in modus:
  'TIMESUB': undefined,
  'CROP': 'Crop',
  'TYPE': undefined,
}

const analytes : LabConfig["analytes"] = {
  'N': {
    ValueUnit: 'meq/100g',
    Element: 'N',
  },
  'P': {
    ValueUnit: 'ppm',
    Element: 'Phosphorus',
  },
  'K': {
    ValueUnit: 'ppm',
    Element: 'K',
  },
  'MG': {
    ValueUnit: 'ppm',
    Element: 'Mg',
  },
  'CA': {
    ValueUnit: 'ppm',
    Element: 'Ca',
  },
  'NA': {
    ValueUnit: 'ppm',
    Element: 'Na',
  },
  'NO3_N': {
    ValueUnit: 'ppm',
    Element: 'NO3-N',
  },
  'S': {
    ValueUnit: 'ppm',
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
    ValueUnit: 'ppm',
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

const units = Object.fromEntries(
  Object.entries(analytes).map(([k, val]) => ([k, val?.ValueUnit]))
);

const config : LabConfig = {
  name: 'A&L Western Agricultural Labs - Modesto, CA',
  units,
  mappings,
  analytes,
  headers: [...Object.keys(analytes), ...Object.keys(mappings)],
  examplesKey: 'a_l_west',
//  type: 'Plant',
  type: (row: any) => {
    switch(row.TYPE) {
      case 4:
        return 'Plant';
      case 5:
        return 'Soil';
      default:
        return 'Soil';
    }
  },
};

export default config;