import debug from 'debug';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../../browser/index.js';
import chalk from 'chalk';

import tomkat from '@modusjs/examples/dist/tomkat-historic/soil/tomkat_source_data2015_RMN0-10cm_1_json.js';

import type ModusResult from '@oada/types/modus/v1/modus-result.js';

const trace = debug('@modusjs/convert#test-browser/html:trace');
const info = debug('@modusjs/convert#test-browser/html:info');
const error = debug('@modusjs/convert#test-browser/html:error');

const test = (msg: string) => info(chalk.green(msg));

export default async function run(lib: typeof MainLib) {
  test('toHtml tests disabled');
  /*
  test('Checking tohtml in browser with tomkat 2015 data json')
  const result = await lib.html.toHtml(tomkat as ModusResult);
  if (result.length < 1 || !result.match('<html')) {
    throw new Error('toHtml request failed: result is either empty or does not contain <html>');
  }
  */

  //test('All HTML browser tests passed');
}
