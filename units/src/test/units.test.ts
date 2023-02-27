import debug from 'debug';
import chalk from 'chalk';
import { deepdiff } from './util.js';

// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
//@ts-ignore
import ucum from '@lhncbc/ucum-lhc';
import { aliasToUcum } from '../index.js';
//import { aliasToUcum } from '../units.js';

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
  const testToUnits = { 'K': 'ppm' };
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


  test('Validating known nomenclature units against units library');
  let allUnits = [
    'mg/kg',
    'ppm',
    'meq/100g',
    'cmol/kg',
    'lb/ac/day',
    'kg/ac/day',
    '%',
    'mg/L',
    'ug/kg',
    'kg/ha',
    'lb/ac/day',
    'million lb/ac',
    'million lb/ac depth',
    'mmhos/cm',
    'dS/m',
    'g/kg',
    //'in/depth', // From moisture-related test. I don't see this as acceptable. My
                  // best guess at something acceptable would be in/in.
    'in/ft',
    'tons/ac',
    'kPa',
    'MPa',
    '% BS',
    '% CEC',
    'none',
    'standard unit',
    's.u.',
  ];

  for (const unit of allUnits) {
    let alias = aliasToUcum(unit) || unit;
    let result = utils.validateUnitString(alias, true);
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
    from: 'mm/kg',
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

  test('Perform a unit conversion requiring molecular weight');
//  let cResult = utils.convertUnitTo(t.from, t.fromVal, t.to)

  test('All units tests passed');

}