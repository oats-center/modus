import debug from 'debug';
import chalk from 'chalk';
import fs from 'fs/promises';

import * as mainlib from '../../node/index.js';

import htmlTests from './html.test.js';

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

    info('testing node HTML');
    await htmlTests(mainlib);

    info('All tests passed!');
  } catch (e: any) {
    info(
      red(`ERROR: tests through exception: `),
      JSON.stringify(e, null, '  ')
    );
    throw e; // re-throw so node will show stack
  }
})();