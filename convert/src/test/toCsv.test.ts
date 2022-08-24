import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';

import tomkat from '@modusjs/examples/dist/tomkat-historic/tomkat_source_data2015_RMN0-10cm_1_json.js';
import * as xlsx from 'xlsx';

import type ModusResult from '@oada/types/modus/v1/modus-result.js';

const trace = debug('@modusjs/convert#test-toCsv:trace');
const info = debug('@modusjs/convert#test-toCsv:info');
const error = debug('@modusjs/convert#test-toCsv:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));


export default async function run(lib: typeof MainLib) {

  let { wb, str } = lib.csv.toCsv(tomkat as ModusResult)

  let data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]!] as xlsx.WorkSheet)

  if (data!.length === 0) {
    throw new Error("CSV had no rows")
  }

  let results: Record<string,string> = {
    "ReportID": 'string',
    "Latitude": 'number',
    "Longitude": 'number',
    "DepthID": 'string',
    "StartingDepth [cm]": 'number',
    "EndingDepth [cm]": 'number',
    "ColumnDepth [cm]": 'number',
    "EventType": 'string',
    "FileDescription": 'string',
    "EventDate": 'string',
    'P [ug/g]': 'number'
  }
  let rowOne: any = data![0];

  test('Checking that first row has several columns with values of the appropriate types.')
  Object.keys(results).forEach(key=> {
    if (rowOne![key] === undefined || typeof rowOne![key] !== results[key]) {
      error('Bad row:', rowOne)
      throw new Error(`Column ${key} was undefined or did not match expected type ${results[key]}`)
    }
  })
}
