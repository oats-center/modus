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

  test('First result has LabMetaData.Reports[0].FileDescription');
  if (!results[0]!.Events?.[0]?.LabMetaData?.Reports?.[0]?.FileDescription) {
    throw new Error('First result did not have a report with FileDescription');
  }

  test('All parse tests passed');
}
