import type { LocalLabConfig } from '../index.js';

const mappings : LocalLabConfig["mappings"] = {
  'Kind Of Sample': undefined,
  'Lab No': 'SampleNumber',
  'Cust No': 'ClientAccountNumber',
  Name: 'ClientName',
  Company: 'ClientCompany',
  'Address 1': 'ClientAddress',
  'Address 2': undefined,
  City: 'ClientCity',
  State: 'ClientState',
  Zip: 'ClientZip',
  Grower: 'GrowerName',
  'Field ID': 'FieldName',
  'Sample ID': 'FMISSampleID',
  'Date Recd': 'DateReceived',
  'Date Rept': 'DateProcessed',
  'B Depth': 'StartingDepth',
  'E Depth': 'EndingDepth',
  'Past Crop': undefined,//'Crop',
}

const analytes : LocalLabConfig["analytes"] = {
}

const config : LocalLabConfig = {
  name: 'Ward Laboratories, Inc. - Kearney, NE',
  mappings,
  analytes,
  examplesKey: 'ward',
  type: 'Soil',
}

export default config;