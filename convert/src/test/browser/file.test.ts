import debug from 'debug';
import { Buffer } from 'buffer/';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../../browser/index.js';
import chalk from 'chalk'; // have to import it this way on browser

import tomkat_json from '@modusjs/examples/dist/tomkat-historic/tomkat_source_data2015_RMN0-10cm_1_json.js';
import ward_csv from '@modusjs/examples/dist/tomkat-historic/TOKA2021-22A_RMN_Ward_csv.js';
import tomkat_source_xlsx from '@modusjs/examples/dist/tomkat-historic/tomkat_source_data_xlsx.js';
import hand_modus_xml from '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_xml.js';

const trace = debug('@modusjs/convert#test-browser/file:trace');
const info = debug('@modusjs/convert#test-browser/file:info');
const error = debug('@modusjs/convert#test-browser/file:error');

const test = (msg: string) => info(chalk.green(msg));

export default async function run(lib: typeof MainLib) {
  test('Checking file.fromFile for browser');
  const files = [
    { file: new File([JSON.stringify(tomkat_json)], 'tomkat.json') },
    { file: new File([ward_csv], 'ward.csv') },
    { file: new File([hand_modus_xml], 'hand-modus.xml') },
    {
      file: new File(
        [Buffer.from(tomkat_source_xlsx, 'base64')],
        'tomkat_source.xlsx'
      ),
    },
  ];

  const result = await lib.file.fromFile(files);
  if (result.length < 1) {
    throw new Error('fromFile failed to produce any results');
  }

  test('NOT testing file save: that is tested manually in the app');

  test('All file browser tests passed');
}
