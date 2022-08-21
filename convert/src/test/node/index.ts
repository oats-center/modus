import debug from 'debug';
import chalk from 'chalk';

import * as mainlib from '../../node/index.js';

import xmlTests from '../xml.test.js';
import csvTests from '../csv.test.js';

const info = debug('@modusjs/xml#test-node:info');
const { red } = chalk;

(async function() {
  try {

    info('testing xml');
    await xmlTests(mainlib);

    info('testing csv');
    await csvTests(mainlib);

  } catch(e: any) {
    info(red(`ERROR: tests through exception: `), JSON.stringify(e, null, '  '));
    throw e; // re-throw so node will show stack
  }
})();
