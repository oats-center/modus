import fs from 'fs/promises';
import debug from 'debug';
import chalk from 'chalk';
import { deepdiff } from '../util.js';
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
    {
      src: '../examples/examples/tomkat-historic/soil/tomkat_source_data2015_RMN0-10cm_1.json',
      dst: `${dir}/tomkat2015_1.json`,
    },
    {
      src: '../examples/examples/tomkat-historic/soil/TOKA2021-22A_RMN_Ward.csv',
      dst: `${dir}/ward.csv`,
    },
    {
      src: '../examples/examples/tomkat-historic/soil/tomkat_source_data.xlsx',
      dst: `${dir}/tomkat_source_data.xlsx`,
    },
    {
      src: '../examples/examples/enyart-east50-a_l_labs/soil/hand-modus.xml',
      dst: `${dir}/hand-modus.xml`,
    },
  ];
  await Promise.all(files.map((f) => fs.cp(f.src, f.dst)));

  test('Checking file.fromFile with four input files (json, xml, csv, xlsx)');
  const original_results = await lib.file.fromFile(
    files.map((f) => ({ filename: f.dst }))
  );
  if (original_results.length < 1) {
    throw new Error('fromFile failed: result is empty');
  }

  test(
    `save will save all modus results as a zip file in ${dir}/modus_conversion.zip`
  );
  await lib.file.save({
    modus: original_results,
    outputtype: 'zip',
    filename: 'modus_conversion.zip',
    outdir: dir,
  });
  const saveresult = await lib.file.fromFile({
    filename: `${dir}/modus_conversion.zip`,
  });
  for (const sr of saveresult) {
    const or = original_results.find((o) => {
      const only_filename = o.output_filename.replace(/^(.*[\/\\])*/g, ''); // get rid of path
      return only_filename === sr.output_filename;
    });
    const diff = deepdiff(sr.modus, or!.modus || null);
    if (diff.length > 0) {
      error(
        'save failed: results parsed from saved file',
        sr.output_filename,
        'do not match results from original',
        or!.output_filename || 'undefined',
        'sent to save function:',
        diff
      );
      throw new Error(
        'save failed: results parsed from saved file do not match results sent to save function.'
      );
    }
  }

  test('All node file tests passed');
}