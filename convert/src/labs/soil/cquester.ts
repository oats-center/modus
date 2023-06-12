import debug from 'debug';
import type { LocalLabConfig } from '../index.js';

const mappings : LocalLabConfig["mappings"] = {
  'Sample ID': 'SampleNumber',
}

// Make this as generic as possible so as to work on other labs

const config : LocalLabConfig = {
  name: 'Cquester Analytics',
  type: 'Soil',
  mappings,
  examplesKey: 'cquester'
};

export default config;