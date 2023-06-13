/*
import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';

import tomkat from '@modusjs/examples/dist/tomkat-historic/soil/tomkat_source_data2015_RMN0-10cm_1_json.js';
import xlsx from 'xlsx';

import type ModusResult from '@oada/types/modus/v1/modus-result.js';

const trace = debug('@modusjs/convert#test-html:trace');
const info = debug('@modusjs/convert#test-html:info');
const error = debug('@modusjs/convert#test-html:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));


export default async function run(lib: typeof MainLib) {

  test('Checking tohtml with tomkat 2015 data json')
  const result = await lib.html.toHtml(tomkat as ModusResult);
  trace('result of tohtml = ', result);

  test('All HTML tests passed');
}
*/