import type { LocalLabConfig } from '../index.js';

const mappings : LocalLabConfig["mappings"] = {
  'Lab': '/lab/sampleid',
  'Point ID': '/source/sampleid',
  'Date': [ '/lab/report/date', '/date' ],

}

const analytes : LocalLabConfig["analytes"] = {
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