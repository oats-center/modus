import debug from 'debug';
import type { LocalLabConfig } from '../index.js';

const mappings : LocalLabConfig["mappings"] = {
  'Sample Location': 'Field',
  'Sample ID1': 'FMISSampleID',
  'Sample ID2': undefined,
  'Lab Number': 'SampleNumber',
  'Client Number': 'ClientAccountNumber',
  'Client Name': 'ClientAccountName',
  'Sample Date': ['ReportDate', 'DateReceived'],
  'Consultant Name': 'Grower'
}

// Make this as generic as possible so as to work on other labs

const config : LocalLabConfig = {
  name: 'Brookside Laboratories, Inc. - New Bremen, OH',
  type: 'Soil',
  mappings,
  examplesKey: 'brookside'
};

export default config;