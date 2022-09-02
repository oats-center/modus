import fs from 'fs/promises';
import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../../node/index.js';

const trace = debug('@modusjs/convert#test-html:trace');
const info = debug('@modusjs/convert#test-html:info');
const error = debug('@modusjs/convert#test-html:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));


export default async function run(lib: typeof MainLib) {

  info('copying assets from examples');
  const dir = './test-work/file';
  await fs.mkdir(dir, { recursive: true });
  const files = [
    { src: '../examples/examples/tomkat-historic/tomkat_source_data2015_RMN0-10cm_1.json', dst: `${dir}/tomkat2015_1.json` },
    { src: '../examples/examples/tomkat-historic/TOKA2021-22A_RMN_Ward.csv', dst: `${dir}/ward.csv` },
    { src: '../examples/examples/tomkat-historic/tomkat_source_data.xlsx', dst: `${dir}/tomkat_source_data.xlsx` },
    { src: '../examples/examples/enyart-east50-a_l_labs/hand-modus.xml', dst: `${dir}/hand-modus.xml` },
  ];
  await Promise.all(files.map(f => fs.cp(f.src, f.dst)));

  test('Checking file.fromFile with four input files (json, xml, csv, xlsx)');
  const result = await lib.file.fromFile(files.map(f => ({ filename: f.dst })));
  if (result.length < 1) {
    throw new Error('fromFile failed: result is empty');
  }
  
  test('All node file tests passed');
}
