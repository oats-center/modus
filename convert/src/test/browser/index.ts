import type * as libs from '../../browser/index.js';
import debug from 'debug';
import chalk from 'chalk';

import readTests from '../xml.test.js';

const info = debug('@modusjs/xml#test-browser:info');
const { red } = chalk;

// Set your browser debugging level in localStorage.debug
localStorage.debug = '*';

type WindowWithLibs = {
  libsundertest: typeof libs,
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const libsundertest = (window as unknown as WindowWithLibs).libsundertest;
    const root = document.getElementById("root");
    if (!root) throw new Error('ERROR: did not find root HTML element!');
    root.innerHTML = "Tests from <pre>dist/test/index.mjs are running!  Check the console.";

    // Run all the tests you want here:
    await readTests(libsundertest);

  } catch(e: any) {
    info(red('FAILED: tests threw exception: '));
    console.log(e);
    throw e; // rethrow so browser will show stack and do source mapping
  }
});

