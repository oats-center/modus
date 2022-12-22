import { LabConf } from './index.js';

const mappings = {
  'SAMPLEID': 'SampleNumber',
  'DATESAMPL': 'EventDate',
  'REPORTNUM': 'ReportID',
  'LABNUM': 'LabEventID',
  'CLIENT': 'AccountNumber',
  'GROWER': 'Grower',
  'PERSON': 'Name',
  'DATESUB': 'EventDate',
  // I don't think these map to anything in modus:
  'TIMESUB': undefined,
  'CROP': undefined,
  'TYPE': undefined,
}
const units = {
  'OM': '%',
  'ENR': 'lb/ac',
  'P1': 'ppm',
  'P2': 'ppm',
  'HCO3_P': 'ppm',
  'PH': '',
  'K': 'ppm',
  'MG': 'ppm',
  'CA': 'ppm',
  'NA': 'ppm',
  'BUFFER_PH': '',
  'H': 'meq/100g',
  'CEC': 'meq/100g',
  'K_PCT': '%',
  'MG_PCT': '%',
  'CA_PCT': '%',
  'H_PCT': '%',
  'NA_PCT': '%',
  'NO3_N': 'ppm',
  'S': 'ppm',
  'ZN': 'ppm',
  'MN': 'ppm',
  'FE': 'ppm',
  'CU': 'ppm',
  'B': 'ppm',
  'EX__LIME': '',
  'S__SALTS': 'mmho/cm',
  'CL': 'ppm',
  'MO': 'ppm',
  'AL': 'ppm',
  'CA_SAT': 'meq/100g',
  'MG_SAT': 'meq/100g',
  'NA_SAT': 'meq/100g',
  'B_SAT': 'meq/100g',
  'ESP': '%',
  'NH4': 'ppm',
  'SO4_S': 'ppm',
  'SAR': 'ppm',
  'EC': 'dS/m',
  'SAT_PCT': '%',
  'CO3': 'ppm',
  'HCO3': 'ppm',
}

const config = new LabConf({
  name: 'A & L Labs West',
  units,
  mappings
});

export default config;