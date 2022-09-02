import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';

import xlsx_sample1 from '@modusjs/examples/dist/tomkat-historic/tomkat_source_data_xlsx.js';
import xml_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_xml.js';
import json_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_json.js';

const trace = debug('@modusjs/convert#test-tojson:trace');
const info = debug('@modusjs/convert#test-tojson:info');
const error = debug('@modusjs/convert#test-tojson:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));


export default async function run(lib: typeof MainLib) {
  test('Parsing tomkat historic xlsx sheet with toJson()...');
  let results = lib.json.toJson({ base64: xlsx_sample1, format: 'tomkat', filename: 'tomkat_source_data.xlsx' });

  test('Have greater than zero results from parsing tomkat historic data');
  if (results.length < 0) {
    throw new Error(`No results from parse`);
  }
  const xlsx_num_results = results.length; // used below to check multi-file conversion

  test('First result has LabMetaData.Reports[0].FileDescription');
  if (!results[0]!.modus.Events?.[0]?.LabMetaData?.Reports?.[0]?.FileDescription) {
    throw new Error('First result did not have a report with FileDescription');
  }

  test('toJson xml sample 1');
  results = lib.json.toJson({ str: xml_sample1, filename: 'hand-modus.xml' });
  if (results.length !== 1) {
    throw new Error('XML tojson failed, results does not have exactly one modus JSON result.  It has '+results.length+' instead.');
  }

  test('toJson json sample 1');
  results = lib.json.toJson({ str: JSON.stringify(json_sample1), filename: 'hand-modus.json' });
  const differences = deepdiff(results[0]?.modus, json_sample1);
  if (differences.length > 0) {
    info('toJson for a json file failed.  result is different than original.  Differences are:', differences);
    throw new Error('json toJson failed: result is different than original');
  }

  test('toJson three input files: xlsx, xml and json');
  results = lib.json.toJson([ 
    { base64: xlsx_sample1, filename: 'tomkat_source_data.xlsx' },
    { str: xml_sample1, filename: 'hand-modus.xml' },
    { str: JSON.stringify(json_sample1), filename: 'hand-modus.json' },
  ]);
  if (results.length !== (xlsx_num_results + 2) ) {
    throw new Error(`Failed 3-file conversion to json: results did not have three items (${results.length}), but three files were passed to it for conversion`);
  }


  test('All tojson tests passed');
}


function deepdiff(a: any, b: any, path?: string, differences?: string[]): string[] {
  if (!differences) differences = [];
  path = path || '';

  // Same type:
  if (typeof a !== typeof b) {
    differences.push(`a is a ${typeof a} but b is a ${typeof b} at path ${path}`);
    return differences;
  }

  // they are the same at this point if they are not an object
  if (typeof a !== 'object') {
    return differences;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    differences.push(`isArray(a) is ${Array.isArray(a)}, but isArray(b) is ${Array.isArray(b)} at path ${path}`);
    return differences;
  }

  // They both have keys/values, so compare them
  for (const [key, value] of Object.entries(a)) {
    differences = deepdiff(value, b[key], `${path}/${key}`, differences);
  }

  return differences;
}
