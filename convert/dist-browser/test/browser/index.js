import debug from 'debug';
import chalk from 'chalk';
import xmlTests from '../xml.test.js';
import csvTests from '../csv.test.js';
const info = debug('@modusjs/convert-browser:info');
const { red } = chalk;
// Set your browser debugging level in localStorage.debug
localStorage.debug = '*';
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const libsundertest = window.libsundertest;
        const root = document.getElementById("root");
        if (!root)
            throw new Error('ERROR: did not find root HTML element!');
        root.innerHTML = "Tests from <pre>dist/test/index.mjs are running!  Check the console.";
        // Run all the tests you want here:
        info('testing xml');
        await xmlTests(libsundertest);
        info('testing xml');
        await csvTests(libsundertest);
    }
    catch (e) {
        info(red('FAILED: tests threw exception: '));
        console.log(e);
        throw e; // rethrow so browser will show stack and do source mapping
    }
});
//# sourceMappingURL=index.js.map