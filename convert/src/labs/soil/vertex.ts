import type { LocalLabConfig } from '../index.js';

// Vertex Labs - Soil configuration
// Notes:
// - Units were taken from user input. Where necessary, minor normalization was applied:
//   * pH units -> 'none' (the conversion library treats pH as unitless)
//   * 'mEq/100g' -> 'meq/100 g' (matches aliases used in the units library)
// - If you want different Modus paths for mappings, we can adjust them.

const mappings: LocalLabConfig["mappings"] = {
  // IDs and metadata columns
  // CropSeason is currently not mapped to a Modus path; set to undefined to keep the header known but unused
  'CropSeason': undefined,
  // Sample identifiers
  'SampleID': 'SampleNumber',
  'SequenceID': 'SampleContainerID',
  // Event date
  'EventDate': ['ReportDate', 'DateReceived'],
  // Geolocation (auto-detected by parser via column names; included here so headers participate in autodetect)
  'Latitude': undefined,
  'Longitude': undefined,
};

const analytes: LocalLabConfig["analytes"] = {
  // CSV header: analyte definition
  'pH_W': {
    Element: 'pH',
    ValueUnit: 'none',
    ModusTestID: 'L_MODV2_SOIL_PH_001',
  },
'PB110ppm': {
    Element: 'P',
    ValueUnit: 'ppm',
    ModusTestID: 'L_MODV2_SOIL_P_012',
  },
'K_AA_ppm': {
    Element: 'K',
    ValueUnit: 'ppm',
    ModusTestID: 'L_MODV2_SOIL_K_002',
  },
'pHB_SI': {
    Element: 'B-pH',
    ValueUnit: 'none',
    ModusTestID: 'L_MODV2_SOIL_BPH_001',
  },
'CEC_m100g': {
    Element: 'CEC',
    ValueUnit: 'meq/100 g',
    ModusTestID: 'L_MODV2_SOIL_CEC_003',
  },
'OM_pct': {
    Element: 'OM',
    ValueUnit: '%',
    ModusTestID: 'L_MODV2_SOIL_OM_001',
  },
'Ca_AA_ppm': {
    Element: 'Ca',
    ValueUnit: 'ppm',
    ModusTestID: 'L_MODV2_SOIL_CA_002',
  },
'Mg_AA_ppm': {
    Element: 'Mg',
    ValueUnit: 'ppm',
    ModusTestID: 'L_MODV2_SOIL_MG_002',
  },
'S_AA_ppm': {
    Element: 'S',
    ValueUnit: 'ppm',
    ModusTestID: 'L_MODV2_SOIL_S_001',
  },
'Zn_HCl_ppm': {
    Element: 'Zn',
    ValueUnit: 'ppm',
    ModusTestID: 'L_MODV2_SOIL_ZN_009',
  },
'Mn_HCl_ppm': {
    Element: 'Mn',
    ValueUnit: 'ppm',
    ModusTestID: 'L_MODV2_SOIL_MN_010',
  },
'B_M3_ppm': {
    Element: 'B',
    ValueUnit: 'ppm',
    ModusTestID: 'L_MODV2_SOIL_B_017',
  },
'K_pct': {
    Element: 'BS-K',
    ValueUnit: '%',
    ModusTestID: 'L_MODV2_SOIL_KBS_001',
  },
'Ca_pct': {
    Element: 'BS-Ca',
    ValueUnit: '%',
    ModusTestID: 'L_MODV2_SOIL_CABS_001',
  },
'Mg_pct': {
    Element: 'BS-Mg',
    ValueUnit: '%',
    ModusTestID: 'L_MODV2_SOIL_MGBS_001',
  },
'H_pct': {
    Element: 'BS-H',
    ValueUnit: '%',
    ModusTestID: 'L_MODV2_SOIL_HBS_001',
  },
};

const config: LocalLabConfig = {
  name: 'Vertex Labs',
  type: 'Soil',
  mappings,
  analytes,
  // examplesKey: 'vertex_soil', // enable if/when examples are added
};

export default config;