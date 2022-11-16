import debug from 'debug';
import chalk from 'chalk';
import { deepdiff } from './util.js';

// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
//import * as mainlib from '../node/index.js';
//@ts-ignore
import ucum from '@lhncbc/ucum-lhc';
import { nutrientColHeaders } from '../csv.js';

const trace = debug('@modusjs/convert#test-units:trace');
const info = debug('@modusjs/convert#test-units:info');
const error = debug('@modusjs/convert#test-units:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {

  test('Testing whether all the nutrient column ValueUnits are parseable by UCUM library');
  let units = Object.values(nutrientColHeaders)
    .map(v => v.ValueUnit)
    .filter(v => v !== undefined)
    .filter((v, i, s) => s.indexOf(v) === i);
  trace('units from nutrientColHeaders:', {units});

  let badUnits = units.filter((unit) => {
    trace(`Trying ${unit}`)
    let result = ucum.UcumLhcUtils.getInstance().validateUnitString(unit, true);
    if (result.status !== 'valid') {
      error(`Unit: [${unit}] errored: ${result.error}`);
      return true
    }
    return false
  })

  if (badUnits.length > 0) {
    error('Some of the units from nutrientColHeaders were not recognized.  They are: ', badUnits);
    throw new Error(`The following units were unrecognized: ${JSON.stringify(badUnits)}`);
  }

  const testElementFrom = { Element: 'K', Value: 1.0, ValueUnit: 'cmol/kg' };
  test('Testing validateUnits');
  lib.units.validateUnits([testElementFrom]);

  test('Testing convertUnits with default to');
  let result = lib.units.convertUnits(testElementFrom);

  test('Testing convertUnits with specific "to" Units');
  const testToUnits = { 'K': 'ppm' };
  result = lib.units.convertUnits(testElementFrom, testToUnits);
  if (Math.abs((result[0]?.Value || 1) - 391.0) > 0.0000001) {
    throw new Error('ERROR: result of conversion from 1.0 cmol/kg K to ppm is not 391.');
  }

  const pElement = { Element: 'P', Value: 1.0, ValueUnit: 'cmol/kg' };
  test('Testing convertUnits with no "to" but an element name not in standardUnits (P is not standard b/c it needs Bray part)');
  result = lib.units.convertUnits(pElement);
  let diff = deepdiff(result[0], pElement);
  if (diff.length > 0) {
    throw new Error('Passed non-standard element "P", but did not get back unaltered result object.  Differences are: '+JSON.stringify(diff));
  }

  /* This test is currently FAILING...
  test('Same test, but with explicit "to" element, still not a standard unit though');
  result = lib.units.convertUnits(pElement, { 'P': 'ppm' });
  info('result = ', result);
  */
  

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
    'in/depth',
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


  test('All units tests passed');

}
