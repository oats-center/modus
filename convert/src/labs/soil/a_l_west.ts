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
  'CROP': undefined,
  'TYPE': undefined,
}

const analytes : LabConfig["analytes"] = {
  'OM': {
    ValueUnit: '%',
    Element: 'OM',
    ModusTestID: 'S-SOM-LOI.15',
  },
  'ENR': {
    ValueUnit: 'lb/ac',
    Element: 'ENR',
    ModusTestID: 'S-ENR.19'
  },
  'P1': {
    ValueUnit: 'ppm',
    Element: 'P (Bray P1 1:10)',
    ModusTestID: 'S-P-B1-1:10.01.03',
  },
  'P2': {
    ValueUnit: 'ppm',
    Element: 'P (Bray P2 1:10)',
    ModusTestID: 'S-P-B2-1:10.01.03',
  },
  //TODO: I believe this is referencing Olsen P which uses HCO3
  'HCO3_P': {
    ValueUnit: 'ppm',
    Element: 'P (Olsen)',
    ModusTestID: 'S-P-BIC.04',
  },
  'PH': {
    ValueUnit: 'none',
    Element: 'pH',
    ModusTestID: 'S-PH-SP.02',
  },
  'K': {
    ValueUnit: 'ppm',
    Element: 'K',
    ModusTestID: 'S-K-NH4AC.05',
  },
  'MG': {
    ValueUnit: 'ppm',
    Element: 'Mg',
    ModusTestID: 'S-MG-NH4AC.05',
  },
  'CA': {
    ValueUnit: 'ppm',
    Element: 'Ca',
    ModusTestID: 'S-CA-NH4AC.05',
  },
  'NA': {
    ValueUnit: 'ppm',
    Element: 'Na',
    ModusTestID: 'S-NA-NH4AC.05',
  },
  'BUFFER_PH': {
    ValueUnit: 'none',
    Element: 'B-pH',
    ModusTestID: 'S-BPH-SIK1.02', // Unsure whether sikora 1 or 2; can also be
    //calculated, i.e., S-BPH.19
  },
  'CEC': {
    ValueUnit: 'meq/100 g',
    Element: 'CEC',
    ModusTestID: 'S-CEC.19', //OR S-CEC-NH4N.05 OR S-CEC-AA.23
  },
  'NO3_N': {
    ValueUnit: 'ppm',
    Element: 'NO3-N',
    ModusTestID: 'S-NO3-1:5.01.01',
  },
  'ZN': {
    ValueUnit: 'ppm',
    Element: 'Zn',
    ModusTestID: 'S-ZN-DTPA-SORB.05',
  },
  'MN': {
    ValueUnit: 'ppm',
    Element: 'Mn',
    ModusTestID: 'S-MN-DTPA-SORB.05',
  },
  'FE': {
    ValueUnit: 'ppm',
    Element: 'Fe',
    ModusTestID: 'S-FE-DTPA-SORB.05',
  },
  'CU': {
    ValueUnit: 'ppm',
    Element: 'Cu',
    ModusTestID: 'S-CU-DTPA-SORB.05',
  },
  'MO': {
    ValueUnit: 'ppm',
    Element: 'Mo',
//    ModusTestID: 'S-MO-DTPA-SORB.05',
  },
  'B': {
    ValueUnit: 'ppm',
    Element: 'B',
    ModusTestID: 'S-B-DTPA-SORB.05',
  },
  'CL': {
    ValueUnit: 'ppm',
    Element: 'Cl',
    ModusTestID: 'S-CL-SP.01', //unclear which saturated paste method
  },
  'SO4_S': {
    ValueUnit: 'ppm',
    Element: 'SO4-S',
    ModusTestID: 'S-S-NH4AC.05',
  },
  'SAT_PCT': {
    ValueUnit: '%',
    Element: 'Sat-Pct',
    ModusTestID: 'S-SP%.19',
  },
  'S__SALTS': {
    ValueUnit: 'mmho/cm',
    Element: 'SS',
    //Modus only lists calculated methods, ALWest says they use saturated paste
  },
  'ESP': {
    ValueUnit: '%',
    Element: 'ESP',
    ModusTestID: 'S-ESP.19',
  },
  'SAR': {
    ValueUnit: 'ppm',
    Element: 'SAR',
    //Calculated is not an option in modus
  },
  'NH4': {
    ValueUnit: 'ppm',
    Element: 'NH4-N',
    // Not sure which method 2.0 Normals of KCl would map to in Modus
  },
  'EC': {
    ValueUnit: 'dS/m',
    Element: 'EC',
  },
  'CO3': {
    ValueUnit: 'ppm',
    Element: 'CO3',
    ModusTestID: 'S-CO3-SP.12',
  },
  'HCO3': {
    ValueUnit: 'ppm',
    Element: 'HCO3',
    ModusTestID: 'S-HCO3-SP.12',
  },


  //TODO: Methods unlisted in data provided by ALWest
  'H': {
    ValueUnit: 'meq/100 g',
    Element: 'H',
    // If Calculated, use 'S-H.19'
  },
  'S': {
    ValueUnit: 'ppm',
    Element: 'S',
    // Maybe calculated from SO4-S?
  },
  'AL': {
    ValueUnit: 'ppm',
    Element: 'Al',
  },
  //TODO: Analyte doesn't appear to exist in modus
  'EX__LIME': {
    Element: 'Excess-Lime',
  },
  'K_PCT': {
    ValueUnit: '%',
    Element: 'BS-K',
    ModusTestID: 'S-BS-K.19',
  },
  'MG_PCT': {
    ValueUnit: '%',
    Element: 'BS-Mg',
    ModusTestID: 'S-BS-MG.19',
  },
  'CA_PCT': {
    ValueUnit: '%',
    Element: 'BS-Ca',
    ModusTestID: 'S-BS-CA.19',
  },
  'H_PCT': {
    ValueUnit: '%',
    Element: 'BS-H',
    ModusTestID: 'S-BS-H.19',
  },
  'NA_PCT': {
    ValueUnit: '%',
    Element: 'BS-Na',
    ModusTestID: 'S-BS-NA.19',
  },

  // Alternative units to existing analytes
  'CA_SAT': {
    ValueUnit: 'meq/100 g',
    Element: 'BS-Ca',
  },
  'MG_SAT': {
    ValueUnit: 'meq/100 g',
    Element: 'BS-Mg',
  },
  'NA_SAT': {
    ValueUnit: 'meq/100 g',
    Element: 'BS-Na',
  },
  'B_SAT': {
    ValueUnit: 'meq/100 g',
    Element: 'BS-B',
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
  type: 'Soil',
/*
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
  */
}

export default config;