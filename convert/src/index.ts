export * as xml from './xml.js';
export * as csv from './fromCsvToModusV1.js';
export * as json from './json.js';
// Promote type to top-level export
export { ModusResult, assertModusResult, InputFile } from './json.js';
export { tree }  from './tree.js'; // trellis tree
export { Slim, assertSlim } from './slim.js'
export * as slim from './slim.js'

// exported from the platform-specific code node/ and browser/
//export * as html from './html.js';