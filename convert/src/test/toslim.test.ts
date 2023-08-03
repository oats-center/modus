import debug from 'debug';
import chalk from 'chalk';
import { deepdiff } from './util.js';

// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
import json_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/soil/hand-modus_json.js';
//import { all as examples } from '@modusjs/examples/dist';


const trace = debug('@modusjs/convert#test-tojson:trace');
const info = debug('@modusjs/convert#test-tojson:info');
const error = debug('@modusjs/convert#test-tojson:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  // Grab a converted example
  //@ts-expect-error
  let result = lib.json.slim.toSlim(json_sample1);
  console.log(JSON.stringify(result, null, 2));

  const flat = lib.json.slim.flatten(result);

  test('slim tests completed');
}
