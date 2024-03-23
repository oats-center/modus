import debug from 'debug';
import chalk from 'chalk';
import fs from 'fs/promises';

import * as mainlib from '../../node/index.js';

import xmlTests from '../xml.test.js';
import toJsonTests from '../tojson.test.js';
import htmlTests from './html.test.js';
import fileTest from './file.test.js';
import toCsvTests from '../toCsv.test.js';
import csvTests from '../csv.test.js';
import labConfigs from '../labConfigs.test.js';
import { toGeoJson } from '../../geojson.js';
import toSlimTests  from '../toslim.test.js';

const info = debug('@modusjs/xml#test-node:info');
const { red } = chalk;

(async function () {
  try {
    info('Cleaning up any leftover ./test-work/* before running tests');
    try {
      const stat = await fs.stat('./test-work');
      await fs.rm('./test-work', { recursive: true });
    } catch (e: any) {
      if (e && e.errno !== -2) {
        throw new Error('fs.stat("./test-work") failed.  Error was:', e);
      }
    }
    await fs.mkdir('./test-work', { recursive: true });

    info('testing xml');
    await xmlTests(mainlib);

    info('testing csv');
    await csvTests(mainlib);

    info('testing toCsv');
    await toCsvTests(mainlib);

    info('testing toSlim');
    await toSlimTests(mainlib);

    /*
    info('testing toGeoJson');
    await toGeoJsonTests(mainlib);

    */
    info('testing tojson');
    await toJsonTests(mainlib);

    info('testing node HTML');
    await htmlTests(mainlib);

    info('testing node file');
    await fileTest(mainlib);

    info('testing labconfigs');
    await labConfigs(mainlib);

    info('All tests passed!');
  } catch (e: any) {
    info(
      red(`ERROR: tests threw exception: `),
      JSON.stringify(e, null, '  ')
    );
    throw e; // re-throw so node will show stack
  }
})();