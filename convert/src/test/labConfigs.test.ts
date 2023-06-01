import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import * as MainLib from '../index.js';

//import tomkat from '@modusjs/examples/dist/tomkat-historic/tomkat_source_data2015_RMN0-10cm_1_json.js';
import { labConfigsMap } from '../labs/index.js';
import { validateUnits } from '@modusjs/units';
import type { NutrientResult } from '@modusjs/units';
import * as examples from '@modusjs/examples';

//const trace = debug('@modusjs/convert#test-labConfigs:trace');
const info = debug('@modusjs/convert#test-labConfigs:info');
const error = debug('@modusjs/convert#test-labConfigs:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

const SKIPS : any[] = []; /*{
  path: 'a_l_west', //its a tissue sample...
  filename: 'sample1.csv',
}]*/

export default async function run(lib: typeof MainLib) {
  test('Testing LabConfigs');

  for (const labConf of labConfigsMap.values()) {
    // This test should exist, but its also perfectly possible that a lab uses
    // some wierd units because they have some wierd extra non-modus test. We
    // should let them use that and just pass it along in modus, I think.
    test(`Validating units for LabConfig: ${labConf.name}...`)
    validateUnits(Object.values(labConf.analytes) as unknown as NutrientResult[])
    //validateUnits(Object.values(labConf.analytes) as unknown as NutrientResult[], true)


    // @ts-ignore
    let exes = labConf.examplesKey ? examples[labConf.examplesKey] : undefined;
    const examps = (exes?.[labConf.type]?.all ?? [])
      .filter((obj: any) => obj.iscsv || obj.isxslx)
    test(`All examples for LabConfig [${labConf.name}-${labConf.type}] should pass some tests:`)
    for (const exa of examps) {
      if (SKIPS.find(v => v.path ===  exa.path && v.filename === exa.filename)) {
        info(`Skipping example ${exa.filename} of lab ${exa.path}`);
        continue;
      }
      const ex = exa.js.replace(/\.js$/, '');
      const wb = lib.csv.getWorkbookFromData({str: exes[ex]});
      const { datasheets } = lib.csv.partitionSheets(wb);
      test(`Example ${exa.js} should be auto-recognized.`)
      let labConfig = lib.csv.getOrAutodetectLab({datasheets});
      if (!labConfig || labConfig.name !== labConf.name) {
        error(`Example ${ex} did not auto-recognize lab config as ${labConf.name}.`);
        error(`LabConfig headers: ${labConf.headers}`);
        error(`Example headers (first datasheet): ${datasheets[0]?.colnames}`);
        const missing = datasheets[0]?.colnames.filter(v => !(labConf?.headers.includes(v)));
        error(`Example headers (first datasheet) missing from labconfig: ${missing}`);
        throw new Error(`Example ${ex} did not auto-recognize lab config as ${labConf.name}.`);
      }

      test(`All examples for LabConfig [${labConf.name}] should parse.`)
      const res = lib.csv.parse({wb});
      console.log('done')
    }
  }
}
run(MainLib);