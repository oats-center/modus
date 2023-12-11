import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
import type ModusResult from '@oada/types/modus/v1/modus-result.js'

//@ts-ignore
import csv_sample1 from '@modusjs/examples/dist/a_l_west/plant/sample1_csv.js';

const trace = debug('@modusjs/convert#test-csv:trace');
const info = debug('@modusjs/convert#test-csv:info');
const error = debug('@modusjs/convert#test-csv:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  test('Parsing a_l_west csv sheet with parse()...');
  const results = lib.csv.parse({ str: csv_sample1, format: 'generic' });

  test('Have greater than zero results from parsing a_l_west data');
  if (results.length < 0) {
    throw new Error(`No results from parse`);
  }

  test('First result has LabMetaData.Reports[0].FileDescription');
  if (!results[0]!.Events?.[0]?.LabMetaData?.Reports?.[0]?.FileDescription) {
    throw new Error('First result did not have a report with FileDescription');
  }

  test('Various mapped values should be in the correct place');
  const res = results[0] as ModusResult;
  // @ts-expect-error FMISMetaData isn't in ModusResult??
  if (res.Events![0]?.FMISMetaData?.FMISProfile?.Grower !== 'The Grower LLC')
    throw new Error(`GROWER mapped improperly`);
  if (res.Events![0]?.LabMetaData?.ClientAccount?.AccountNumber !== '11111')
    throw new Error(`CLIENT mapped improperly`);
  if (res.Events![0]?.LabMetaData?.ClientAccount?.Name !== 'Bob Person')
    throw new Error(`PERSON mapped improperly`);
  if (res.Events?.[0]?.EventMetaData?.EventDate !== '2021-05-05')
    throw new Error(`DATESAMPL mapped improperly`);
  if (res.Events[0]?.LabMetaData.LabEventID !== '21-267-003')
    throw new Error(`REPORTNUM mapped improperly`);

  const nutrients = {
    "Nitrogen": {
      "ValueUnit": "meq/100g",
      "Value": 3.26
    },
    "Phosphorus": {
      "ValueUnit": "ppm",
      "Value": 0.21
    },
    "Potassium": {
      "ValueUnit": "ppm",
      "Value": 1.61
    },
    "Magnesium": {
      "ValueUnit": "ppm",
      "Value": 0.36
    },
    "Calcium": {
      "ValueUnit": "ppm",
      "Value": 1.37
    },
    "Sodium": {
      "ValueUnit": "ppm",
      "Value": 0.01
    },
    "Sulfur": {
      "ValueUnit": "ppm",
      "Value": 0.22
    },
    "Zinc": {
      "ValueUnit": "ppm",
      "Value": 22.04
    },
    "Manganese": {
      "ValueUnit": "ppm",
      "Value": 76.95
    },
    "Iron": {
      "ValueUnit": "ppm",
      "Value": 91.35
    },
    "Copper": {
      "ValueUnit": "ppm",
      "Value": 6.81
    },
    "Boron": {
      "ValueUnit": "ppm",
      "Value": 33.16
    },
    "Aluminum": {
      "ValueUnit": "ppm",
      "Value": 30.829999999999995
    },
    "phosphate": {
      "ValueUnit": "meq/100g",
      "Value": 0
    },
    "Sulfate-Sulfur": {
      "ValueUnit": "ppm",
      "Value": 0
    }
  }
  test('All parse tests passed');
}