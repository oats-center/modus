import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
import type ModusResult from '@oada/types/modus/v1/modus-result.js'

import csv_sample1 from '@modusjs/examples/dist/a_l_west/sample1_csv.js';
//import xlsx_sample1 from '@modusjs/examples/dist/tomkat-historic/tomkat_source_data_xlsx.js';

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
  /*
  test('Parsing tomkat historic xlsx sheet with parse()...');
  const results = lib.csv.parse({ base64: xlsx_sample1, format: 'generic' });

  test('Have greater than zero results from parsing tomkat historic data');
  if (results.length < 0) {
    throw new Error(`No results from parse`);
  }
  */

  test('First result has LabMetaData.Reports[0].FileDescription');
  if (!results[0]!.Events?.[0]?.LabMetaData?.Reports?.[0]?.FileDescription) {
    throw new Error('First result did not have a report with FileDescription');
  }

  test('Various mapped values should be in the correct place');
  const res = results[0] as ModusResult;
  // @ts-expect-error FMISMetaData should exist on Events...
  if (res.Events![0]!.FMISMetaData.FMISProfile!.Grower !== 'The Grower LLC')
    throw new Error(`GROWER mapped improperly`);
  // @ts-expect-error FMISMetaData should exist on Events...
  if (res.Events![0]!.FMISMetaData!.ClientAccount!.Company !== 'The Grower LLC')
    throw new Error(`GROWER mapped improperly`);
  // @ts-expect-error FMISMetaData should exist on Events...
  if (res.Events![0]!.FMISMetaData!.ClientAccount!.AccountNumber !== '11111')
    throw new Error(`CLIENT mapped improperly`);
  // @ts-expect-error FMISMetaData should exist on Events...
  if (res.Events![0]!.FMISMetaData!.ClientAccount!.Name !== 'Bob Person')
    throw new Error(`PERSON mapped improperly`);
  if (res.Events![0]!.EventMetaData!.EventDate !== 'test')
    throw new Error(`DATESAMPL mapped improperly`);
  // @ts-expect-error FMISMetaData should exist on Events...
  if (res.Events![0]!.LabMetaData.LabEventID !== '21-267-003')
    throw new Error(`REPORTNUM mapped improperly`);

  /*
  test('Should recognize CSV by headers and apply units.');
  //TODO: should I be able to pull this from @modusjs examples?
  //mainLib.csv.addRecognizedCsvs({
  let labConf = new LabConf({
    name:'Test Units',
    units: {
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
    },
    mappings: {
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
    }
  });
  let result = lib.csv.parse({base64: csv_sample2, format: 'tomkat'});
  let samples = result[0]!.Events?.[0]?.EventSamples?.Soil?.SoilSamples?.[0]?.Depths?.[0]?.NutrientResults;
  let om = (samples || []).filter(nr => nr.Element === 'OM');
  if (om?.[0]?.ValueUnit !== 'TEST UNITS') {
    throw new Error(`Units were not recognized from the csv headers. OM Element should have units == 'TEST UNITS'`);
  }
  */

 /*
  test('Testing whether all the nutrient column ValueUnits are parseable by UCUM library');
  let allUnits = Object.values(lib.csv.nutrientColHeaders)
    .map(v => v.ValueUnit)
    .filter(v => v !== undefined)
    .filter((v, i, s) => s.indexOf(v) === i);
  trace('units from nutrientColHeaders:', {units});

  let badUnits = allUnits.filter((unit) => {
    trace(`Trying ${unit}`)
    let res = utils.validateUnitString(unit, true);
    if (res.status !== 'valid') {
      error(`Unit: [${unit}] errored: ${res.error}`);
      return true
    }
    return false
  })

  if (badUnits.length > 0) {
    error('Some of the units from nutrientColHeaders were not recognized.  They are: ', badUnits);
    throw new Error(`The following units were unrecognized: ${JSON.stringify(badUnits)}`);
  }

  */
  test('All parse tests passed');
}