import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';

import xml_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_xml.js';
import json_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_json.js';
import xml_sample2 from '@modusjs/examples/dist/enyart-east50-a_l_labs/lab-modus_xml.js';

const trace = debug('@modusjs/convert#test-xml:trace');
const info = debug('@modusjs/convert#test-xml:info');
const error = debug('@modusjs/convert#test-xml:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));


export default async function run(lib: typeof MainLib) {
  test('Parsing hand-modus_xml with parse()...');
  lib.xml.parse(xml_sample1);

  test('Parsing and validating hand-modus_xml with parseModusResult()');
  const mr = lib.xml.parseModusResult(xml_sample1);

  test('Comparing parsed ModusResult with hand-modus_json');
  const diff = deepdiff(mr, json_sample1);
  if (diff.length > 0) {
    console.log('parsed result (a): ', mr);
    console.log('sample 1 hand-created json (b): ', json_sample1);
    throw new Error(`Hand-created json (a) and parsed result for sample1 (b) are different and they should be the same. Differences are: ${JSON.stringify(diff, null, '  ')}`);
  }

  test('Parsing lab-modus_xml...');
  lib.xml.parse(xml_sample2);

  test('Parsing and validating lab-modus_xml with parseModusResult()');
  lib.xml.parseModusResult(xml_sample2);

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
