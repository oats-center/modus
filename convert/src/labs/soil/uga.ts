import type { LocalLabConfig } from '../index.js';

const mappings : LocalLabConfig["mappings"] = {
  /*
  'Lab': '/lab/sampleid',
  'Point ID': '/source/sampleid',
  'Date': [ '/lab/report/date', '/date' ],
  */
  'Lab': 'SampleNumber',
  'Point ID': 'FMISSampleID',
  'Date': [ 'ReportDate', 'DateReceived' ],

}

const analytes : LocalLabConfig["analytes"] = {
  /*
  "LBC": {
    ValueUnit: "ppm CaCO3/pH",
    Element: "LBC",
    ModusTestID: ""
  },
  "LBCeq": {
    ValueUnit: "ppm CaCO3/pH",
    Element: "LBCeq",
    ModusTestID: ""
  }
  */
    'Al\naluminum': {
    ValueUnit: "ppm",
    Element: "Al",
    ModusTestID: ""
  },
    'As\narsenic': {
    ValueUnit: "ppm",
    Element: "As",
    ModusTestID: ""
  },
    'B\nboron': {
    ValueUnit: "ppm",
    Element: "B",
    ModusTestID: ""
  },
    'Ca\ncalcium': {
    ValueUnit: "ppm",
    Element: "Ca",
    ModusTestID: ""
  },
    'Cd\ncadmium': {
    ValueUnit: "ppm",
    Element: "Cd",
    ModusTestID: ""
  },
    'Cr\nchromium': {
    ValueUnit: "ppm",
    Element: "Cr",
    ModusTestID: ""
  },
    'Cu\ncopper': {
    ValueUnit: "ppm",
    Element: "Cu",
    ModusTestID: ""
  },
    'Fe\niron': {
    ValueUnit: "ppm",
    Element: "Fe",
    ModusTestID: ""
  },
    'K\npotassium': {
    ValueUnit: "ppm",
    Element: "K",
    ModusTestID: ""
  },
    'Mg\nmagnesium': {
    ValueUnit: "ppm",
    Element: "Mg",
    ModusTestID: ""
  },
    'Mn\nmanganese': {
    ValueUnit: "ppm",
    Element: "Mn",
    ModusTestID: ""
  },
    'Mo\nmolybdenum': {
    ValueUnit: "ppm",
    Element: "Mo",
    ModusTestID: ""
  },
    'Na\nsodium': {
    ValueUnit: "ppm",
    Element: "Na",
    ModusTestID: ""
  },
    'Ni\nnickel': {
    ValueUnit: "ppm",
    Element: "Ni",
    ModusTestID: ""
  },
    'P\nphosphorus': {
    ValueUnit: "ppm",
    Element: "P",
    ModusTestID: ""
  },
    'Pb\nlead': {
    ValueUnit: "ppm",
    Element: "Pb",
    ModusTestID: ""
  },
    'S\nsulfur': {
    ValueUnit: "ppm",
    Element: "S",
    ModusTestID: ""
  },
    'Zn\nzinc': {
    ValueUnit: "ppm",
    Element: "Zn",
    ModusTestID: ""
  },
}

const config : LocalLabConfig = {
  name: 'University of Georgia Extension Ag & Environmental Services Labs - Athens, GA',
  mappings,
  analytes,
  //headers: [...Object.keys(analytes), ...Object.keys(mappings)],
  examplesKey: 'UGA',
  type: 'Soil',
}

export default config;