import debug from 'debug';
import fs from 'fs';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
import * as mainLib from '../index.js';

import xlsx_sample1 from '@modusjs/examples/dist/tomkat-historic/tomkat_source_data_xlsx.js';
//import csv_sample2 from '@modusjs/examples/dist/a_l_west/sample2.js';

const trace = debug('@modusjs/convert#test-csv:trace');
const info = debug('@modusjs/convert#test-csv:info');
const error = debug('@modusjs/convert#test-csv:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  test('Parsing tomkat historic xlsx sheet with parse()...');
  const results = lib.csv.parse({ base64: xlsx_sample1, format: 'tomkat' });

  test('Have greater than zero results from parsing tomkat historic data');
  if (results.length < 0) {
    throw new Error(`No results from parse`);
  }

  test('First result has LabMetaData.Reports[0].FileDescription');
  if (!results[0]!.Events?.[0]?.LabMetaData?.Reports?.[0]?.FileDescription) {
    throw new Error('First result did not have a report with FileDescription');
  }

  test('Should recognize CSV by headers and apply units.');
  //TODO: should I be able to pull this from @modusjs examples?
  let file = fs.readFileSync('./examples/examples/a_l_west/sample2.csv', {encoding: 'utf8'})
  mainLib.csv.addRecognizedCsvs({
    name:'Test Units',
    units: {
      'CLIENT': '',
      'DATESUB': '',
      'TIMESUB': '',
      'GROWER': '',
      'PERSON': '',
      'SAMPLEID': '',
      'CROP': '',
      'DATESAMPL': '',
      'REPORTNUM': '',
      'LABNUM': '',
      'TYPE': '',
      'OM': 'TEST UNITS',
      'ENR': 'lb/ac',
      'P1': 'ppm',
      'P2': 'ppm',
      'HCO3_P': 'ppm',
      'PH': '',
      'K': 'ppm',
      'MG': 'ppm',
      'CA': 'ppm',
      'NA': 'ppm',
      'BUFFER_PH': '',
      'H': 'meq/100g',
      'CEC': 'meq/100g',
      'K_PCT': '%',
      'MG_PCT': '%',
      'CA_PCT': '%',
      'H_PCT': '%',
      'NA_PCT': '%',
      'NO3_N': 'ppm',
      'S': 'ppm',
      'ZN': 'ppm',
      'MN': 'ppm',
      'FE': 'ppm',
      'CU': 'ppm',
      'B': 'ppm',
      'EX__LIME': '',
      'S__SALTS': 'mmho/cm',
      'CL': 'ppm',
      'MO': 'ppm',
      'AL': 'ppm',
      'CA_SAT': 'meq/100g',
      'MG_SAT': 'meq/100g',
      'NA_SAT': 'meq/100g',
      'B_SAT': 'meq/100g',
      'ESP': '%',
      'NH4': 'ppm',
      'SO4_S': 'ppm',
      'SAR': 'ppm',
      'EC': 'dS/m',
      'SAT_PCT': '%',
      'CO3': 'ppm',
      'HCO3': 'ppm',
    }
  });
  let result = lib.csv.parse({str: file, format: 'tomkat'});
  let samples = result[0]!.Events?.[0]?.EventSamples?.Soil?.SoilSamples?.[0]?.Depths?.[0]?.NutrientResults;
  let om = (samples || []).filter(nr => nr.Element === 'OM');
  if (om?.[0]?.ValueUnit !== 'TEST UNITS') {
    throw new Error(`Units were not recognized from the csv headers. OM Element should have units == 'TEST UNITS'`);
  }


  test('All parse tests passed');
}

await run(mainLib)