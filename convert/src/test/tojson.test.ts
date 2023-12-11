import debug from 'debug';
import chalk from 'chalk';
import { deepdiff } from './util.js';
import { fromModusV1 } from '../slim.js';

// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
import xlsx_sample1 from '@modusjs/examples/dist/tomkat-historic/soil/tomkat_source_data_xlsx.js';
import xml_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/soil/hand_modus_xml.js';
import json_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/soil/hand_modus_json.js';
import { all as examples } from '@modusjs/examples/dist';
import type ModusResultSchema from '@oada/types/modus/v1/modus-result.js';


const trace = debug('@modusjs/convert#test-tojson:trace');
const info = debug('@modusjs/convert#test-tojson:info');
const error = debug('@modusjs/convert#test-tojson:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  test('Parsing tomkat historic xlsx sheet with toJson()...');
  let results = await lib.json.toJson({
    base64: xlsx_sample1,
    format: 'generic',
    filename: 'tomkat_source_data.xlsx',
  });

  test('Have greater than zero results from parsing tomkat historic data');
  if (results.length < 0) {
    throw new Error(`No results from parse`);
  }
  const xlsx_num_results = results.length; // used below to check multi-file conversion

  // Is this now necessary under slim as the canonical model?
  test('First result has LabMetaData.Reports[0].FileName');
  if (
    !results?.[0]?.modus?.lab?.files?.[0]?.name
    //!results[0]!.modus.Events?.[0]?.LabMetaData?.Reports?.[0]?.FileDescription
  ) {
    throw new Error('First result did not have a report with FileName');
  }

  test('Parsing all the examples with toJson()...');
//@ts-ignore
  for await (const [lab, types] of Object.entries(examples)) {
//@ts-ignore
    for await (const [type, list] of Object.entries(types)) {
//@ts-ignore
      for await (const example of list) {
// Note: this dynamic import does not seem to like slashes within template string placeholders (${})
        let data = (await import(`../../../examples/dist/${example.lab}/${example.type}/${example.js.split('.')[0]}.js`)).default;
        let exampleType = example.iscsv || example.isjson ? 'str' : 'base64';
        await lib.json.toJson({
          [exampleType]: data,
          format: 'generic',
          filename: example.filename,
       })
      }
    }
  }



  test('toJson xml sample 1');
  results = await lib.json.toJson({
    str: xml_sample1,
    filename: 'hand_modus.xml',
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
    filename: 'hand_modus.json',
  });
  const differences = deepdiff(results[0]?.modus, fromModusV1(json_sample1 as ModusResultSchema));
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
    { str: xml_sample1, filename: 'hand_modus.xml' },
    { str: JSON.stringify(json_sample1), filename: 'hand_modus.json' },
  ]);
  if (results.length !== xlsx_num_results + 2) {
    throw new Error(
      `Failed 3-file conversion to json: results did not have three items (${results.length}), but three files were passed to it for conversion`
    );
  }

  test('All tojson tests passed');
}