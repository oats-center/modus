import debug from 'debug';
import fs from 'fs/promises';
import tojsonTests from './tojson.js';
import tocsvTests from './tocsv.js';
import htmlTests from './tohtml.js';

const info = debug('@modusjs/cli#test/index:info');

try {

  // if test-work is already there from last time, wipe it
  if (await fs.stat('./test-work').catch(() => null)) {
    await fs.rmdir('./test-work', { recursive: true, force: true });
  }

  info('Creating test-work dir');
  await fs.mkdir('./test-work', { recursive: true });

  info('Testing tojson');
  await tojsonTests();

  info('Testing tocsv');
  await tocsvTests();

  info('Testing HTML');
  await htmlTests();

  info('All test passed!');

} finally {
//  info('Cleaning up test-work dir');
//  await fs.rm('./test-work', { recursive: true, force: true });
}
