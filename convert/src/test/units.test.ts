import debug from 'debug';
import chalk from 'chalk';

// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
//import * as mainlib from '../node/index.js';
//@ts-ignore
import ucum from '@lhncbc/ucum-lhc';
import { nutrientColHeaders } from '../csv.js';

const trace = debug('@modusjs/convert#test-tojson:trace');
const info = debug('@modusjs/convert#test-tojson:info');
const error = debug('@modusjs/convert#test-tojson:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  test('Testing whether the library can parse all our units');
  let units = Object.values(nutrientColHeaders)
    .map(v => v.ValueUnit)
    .filter(v => v !== undefined)
    .filter((v, i, s) => s.indexOf(v) === i);
  trace({units});

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
    throw new Error(`The following units were unrecognized: ${badUnits}`);
  }

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
  ]
}