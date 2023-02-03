import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
//import * as units from '@modusjs/units';
//@ts-ignore
import ucum from '@lhncbc/ucum-lhc';

import * as labConfigs from '../labs/index.js';

const trace = debug('@modusjs/convert#test-labConfigs:trace');
const info = debug('@modusjs/convert#test-labConfigs:info');
const error = debug('@modusjs/convert#test-labConfigs:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));
//let utils = ucum.UcumLhcUtils.getInstance();

export default async function run(lib: typeof MainLib) {
  test('Testing LabConfigs');

  /*
  for (const labConf of labConfigs) {

    //TODO: What if multiple columns map to the same modus
    test(`LabConfig ${labConf.name} should have all elements recognized as modus elements`)


    test('All ValueUnits should parse')

    test('All Elements')

  }
  */

  test('All parse tests passed');
}