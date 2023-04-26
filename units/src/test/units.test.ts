import debug from 'debug';
import chalk from 'chalk';
import { deepdiff } from './util.js';

// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
//@ts-ignore
import ucum from '@lhncbc/ucum-lhc';
import * as industry from '@modusjs/industry';

const trace = debug('@modusjs/convert#test-units:trace');
const info = debug('@modusjs/convert#test-units:info');
const error = debug('@modusjs/convert#test-units:error');

let utils = ucum.UcumLhcUtils.getInstance();
const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  const testElementFrom = { Element: 'K', Value: 1.0, ValueUnit: 'cmol/kg' };
  test('Testing validateUnits');
  lib.validateUnits([testElementFrom]);

  test('Testing convertUnits with default to');
  let result = lib.convertUnits(testElementFrom);

  test('Testing convertUnits with specific "to" Units');
  const testToUnits = {
    Element: 'K',
    ValueUnit: 'ppm',
    UCUM_ValueUnit: 'ppm'
  };
  result = lib.convertUnits(testElementFrom, testToUnits);
  if (Math.abs((result[0]?.Value || 1) - 391.0) > 0.0000001) {
    throw new Error('ERROR: result of conversion from 1.0 cmol/kg K to ppm is not 391.');
  }

  const pElement = { Element: 'P', Value: 1.0, ValueUnit: 'cmol/kg' };
  test('Testing convertUnits with no "to" but an element name not in standardUnits (P is not standard b/c it needs Bray part)');
  result = lib.convertUnits(pElement);
  let diff = deepdiff(result[0], pElement);
  if (diff.length > 0) {
    throw new Error('Passed non-standard element "P", but did not get back unaltered result object.  Differences are: '+JSON.stringify(diff));
  }

  /* This test is currently FAILING...
  test('Same test, but with explicit "to" element, still not a standard unit though');
  result = lib.units.convertUnits(pElement, { 'P': 'ppm' });
  info('result = ', result);
  */


  test('Validating all aliased units');
  for (const unit of Object.values(lib.aliases)) {
    if (!unit) continue;
    let result = utils.validateUnitString(unit, true);
    if (!result) throw new Error(`Unit ${unit} was unrecognized by units lib`);
  }

/*
  test('Validating units from examples against the units library');
  //TODO: get all units from examples. Not sure if this is possible without calling
  // convert on them
  for (const unit of examplesUnits) {
    let alias = aliasToUcum(unit);
    let result = utils.validateUnitString(alias, true);
    if (!result) throw new Error(`Unit ${unit} was unrecognized by units lib`);
  }
*/

  test('Perform some specific unit conversions and check output values.');
  let unitsTests = [{
    from: 'mg/kg',
    to: 'ppm',
    fromVal: 1,
    toVal: 1,
  }]

  for (const t of unitsTests) {
    let result = utils.convertUnitTo(t.from, t.fromVal, t.to)
    if (result.status !== 'succeeded')
      throw new Error(`Unit conversion from ${t.from} to ${t.to} failed.`);
    if (result.toVal !== t.toVal)
      throw new Error(`Unit conversion from ${t.from} to ${t.to} did not produce the expected value.`);
  }

  /* This really isn't necessary unless we decide to offer conversions from ppm
   * to meq or vice versa. Also, its hard to say how they've computed CA_SAT
   * (meq/100g) vs CA (ppm).
  test('Perform a unit conversion of Calcium requiring molecular weight');
  let element = 'Base Saturation - Ca';
  let molElement = element.replace(/^Base Saturation - /, '');
  let cResult = utils.convertUnitTo('meq/(100.g)', 6.9, '[ppm]', undefined,
    lib.molecularWeights[molElement].adjusted);
  if (!(cResult.toVal < 2675) && !(cResult.toVal > 2673))
    throw new Error('Molecular weight conversion failed.')
  */

  test(`Should convert Base Saturation from % to meq/100g if CEC is present`);
  let nrs = [{
    Element: 'Base Saturation - Ca',
    Value: 25.9,
    ValueUnit: '%'
  }, {
    Element: 'CEC',
    Value: 19.1,
    ValueUnit: 'meq/100 g'
  }]
  let res = lib.convertBaseSat(nrs, nrs[0]!, {
    ...nrs[0]!,
    ValueUnit: 'meq/100 g',
    UCUM_ValueUnit: 'meq/(100.g)'
  });
  if (!(res.Value! > 4.9 && res.Value! < 5)) throw new Error('Conversion of Base Saturation from % to meq failed.');

  test('LabConfig units imported from industry data should all work');
  for (const lab of Object.values(industry.labConfigs)) {
      // @ts-ignore
    for (const { analytes } of Object.values(lab)) {
      // @ts-ignore
      let ans = Object.values(analytes).filter(v => v!.ValueUnit !== undefined)
      // @ts-ignore
      for (const { ValueUnit: unit } of ans) {
        let alias = lib.aliasToUcum(unit) || unit;
        let result = utils.validateUnitString(alias, true);
        if (!result) throw new Error(`Unit ${unit} was unrecognized by units lib`);
      }
    }
  }


  test('All units tests passed');

}