import debug from 'debug';
import chalk from 'chalk';
import { deepdiff } from './util.js';

// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
//@ts-ignore
import json_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/soil/hand-modus_json.js';
//@ts-ignore
import { all as examples } from '@modusjs/examples/dist';


const trace = debug('@modusjs/convert#test-tojson:trace');
const info = debug('@modusjs/convert#test-tojson:info');
const error = debug('@modusjs/convert#test-tojson:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  test('toJson json sample 1');
  const results = await lib.json.toJson({
    str: JSON.stringify(json_sample1),
    filename: 'hand-modus.json',
  });
  //const gj = await lib.geojson.toGeoJson(results);

  test('All tojson tests passed');
}