import debug from 'debug';
import chalk from 'chalk';
import { deepdiff } from './util.js';

// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';

import xlsx_sample1 from '@modusjs/examples/dist/tomkat-historic/tomkat_source_data_xlsx.js';
import xml_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_xml.js';
import json_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_json.js';
import { all as examples } from '@modusjs/examples/dist';

let labExamples = Object.fromEntries(
  Object.entries(examples).map(([lab, list]) => ([
    lab,
    list.map(obj => ({
      ...obj,
      data: await import(obj.importpath)
    }))
  ]))
)

const trace = debug('@modusjs/convert#test-tojson:trace');
const info = debug('@modusjs/convert#test-tojson:info');
const error = debug('@modusjs/convert#test-tojson:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  test('Parsing tomkat historic xlsx sheet with toJson()...');
  let results = await lib.json.toJson({
    base64: xlsx_sample1,
    format: 'tomkat',
    filename: 'tomkat_source_data.xlsx',
  });

  console.log( {examps, examples} );
  for (const [lab, list] of Object.entries(examples)) {
    for (const example of list) {
      console.log({example})
      let fname = example.split('.')[0];
      if (!fname) throw new Error(`example is undefined in lab ${lab}`);

      let exampleType: 'str' | 'arrbuf' | 'base64' | undefined;
      if (/_csv$/.test(fname) || /_json$/.test(fname)) exampleType = 'str';
      if (/_xlsx$/.test(fname)) exampleType = 'base64';
      if (!exampleType) throw new Error(`example type could not be determined in lab ${lab}`);
      await lib.json.toJson({
        [exampleType]: example,
        format: 'tomkat',
        filename: fname.replace(/_json$/, '.json').replace(/_csv$/, '.csv').replace(/_xlsx$/, '.xlsx'),
     })
    }
  }

  test('Have greater than zero results from parsing tomkat historic data');
  if (results.length < 0) {
    throw new Error(`No results from parse`);
  }
  const xlsx_num_results = results.length; // used below to check multi-file conversion

  test('First result has LabMetaData.Reports[0].FileDescription');
  if (
    !results[0]!.modus.Events?.[0]?.LabMetaData?.Reports?.[0]?.FileDescription
  ) {
    throw new Error('First result did not have a report with FileDescription');
  }

  test('toJson xml sample 1');
  results = await lib.json.toJson({
    str: xml_sample1,
    filename: 'hand-modus.xml',
  });
  if (results.length !== 1) {
    throw new Error(
      'XML tojson failed, results does not have exactly one modus JSON result.  It has ' +
        results.length +
        ' instead.'
    );
  }

  test('toJson json sample 1');
  results = await lib.json.toJson({
    str: JSON.stringify(json_sample1),
    filename: 'hand-modus.json',
  });
  const differences = deepdiff(results[0]?.modus, json_sample1);
  if (differences.length > 0) {
    info(
      'toJson for a json file failed.  result is different than original.  Differences are:',
      differences
    );
    throw new Error('json toJson failed: result is different than original');
  }

  test('toJson three input files: xlsx, xml and json');
  results = await lib.json.toJson([
    { base64: xlsx_sample1, filename: 'tomkat_source_data.xlsx' },
    { str: xml_sample1, filename: 'hand-modus.xml' },
    { str: JSON.stringify(json_sample1), filename: 'hand-modus.json' },
  ]);
  if (results.length !== xlsx_num_results + 2) {
    throw new Error(
      `Failed 3-file conversion to json: results did not have three items (${results.length}), but three files were passed to it for conversion`
    );
  }

  test('All tojson tests passed');
}