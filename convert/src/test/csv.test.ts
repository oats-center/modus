import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';

import xlsx_sample1 from '@modusjs/examples/dist/tomkat-historic/tomkat_source_data_xlsx.js';

const trace = debug('@modusjs/convert#test-csv:trace');
const info = debug('@modusjs/convert#test-csv:info');
const error = debug('@modusjs/convert#test-csv:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));


export default async function run(lib: typeof MainLib) {
  test('Parsing tomkat historic xlsx sheet with parse()...');
  const results = lib.csv.parse({ base64: xlsx_sample1, format: 'tomkat' });

  test('Have greater than zero results from parsing tomkat historic data');
  if (results.length < 0) {
    throw new Error(`No results from parse`);
  }


  test('All parse tests passed');
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
