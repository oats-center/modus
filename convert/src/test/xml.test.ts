import debug from 'debug';
import chalk from 'chalk';
import { deepdiff } from './util.js';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';

//@ts-ignore
import xml_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/soil/hand_modus_xml.js';
//@ts-ignore
import json_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/soil/hand_modus_json.js';
//@ts-ignore
import xml_sample2 from '@modusjs/examples/dist/enyart-east50-a_l_labs/soil/lab_modus_xml.js';

const trace = debug('@modusjs/convert#test-xml:trace');
const info = debug('@modusjs/convert#test-xml:info');
const error = debug('@modusjs/convert#test-xml:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  test('Parsing hand_modus_xml with parse()...');
  lib.xml.parse(xml_sample1);

  test('Parsing and validating hand_modus_xml with parseModusResult()');
  const mr = lib.xml.parseModusResult(xml_sample1);

  test('Comparing parsed ModusResult with hand_modus_json');
  const diff = deepdiff(mr, json_sample1);
  if (diff.length > 0) {
    info('parsed result (a): ', mr);
    info('sample 1 hand-created json (b): ', json_sample1);
    throw new Error(
      `Hand-created json (a) and parsed result for sample1 (b) are different and they should be the same. Differences are: ${JSON.stringify(
        diff,
        null,
        '  '
      )}`
    );
  }

  test('Parsing lab-modus_xml...');
  lib.xml.parse(xml_sample2);

  test('Parsing and validating lab-modus_xml with parseModusResult()');
  lib.xml.parseModusResult(xml_sample2);

  test('Parsing hand_modus_xml with parse()...');
  lib.xml.parse(xml_sample1);

  test('Parsing and validating hand_modus_xml with parseModusResult()');
  const ms = lib.xml.parseModusResult(xml_sample1);

  test('Comparing parsed ModusResult with hand_modus_json');
  const dif = deepdiff(ms, json_sample1);
  if (dif.length > 0) {
    info('parsed result (a): ', ms);
    info('sample 1 hand-created json (b): ', json_sample1);
    throw new Error(
      `Hand-created json (a) and parsed result for sample1 (b) are different and they should be the same. Differences are: ${JSON.stringify(
        dif,
        null,
        '  '
      )}`
    );
  }

  test('All parse tests passed');
}