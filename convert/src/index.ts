export * as xml from './xml.js';
export * as csv from './fromCsvToModusV1.js';
export * as json from './json.js';
// Promote type to top-level export
export { Slim, InputFile } from './json.js';

// exported from the platform-specific code node/ and browser/
//export * as html from './html.js';