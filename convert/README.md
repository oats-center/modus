# convert
-----
Universal library for reading/writing/validating Modus files/resources.  Converts between:
- Modus v1 XML -> Modus v1 JSON


## Development
---------------

This library is universal, so it runs tests both in-browser and in node.  To simplify
browser testing, the `src/test/` folder holds an HTML file that opens a browser on your machine, 
imports the compiled test bundle, and then runs the tests listed there.  Option for getting
an automated result from this in the future might be TestCafe...

To run just the browser tests: `yarn test:browser`.

To run just the node tests: `yarn test:node`.

To build: `yarn build`.

To rollup `dist/index.mjs` bundle for browser: `yarn build:rollup`

To compile/bundle everything live as you code: `yarn dev`

To run all tests live as you code (you should run `yarn dev` at the same time): `yarn test`.


### CSV
---------------

Because lab result formats are highly irregular, the CSV conversion may require some hand modifications:

1. Make sure the result data headers are on row 1! If not, just drag that row up to the first row.
2. Add the word `COMMENT` to any column of a row that you want to ignore from parsing. Do this to pretty much any non lab-result rows for the time-being.
3. Add the word `UNITS` to any column of a row that contains unit information for the corresponding column header. This will override any unit information used by default for lab result elements.
4. The lab results require a column containing the word 'date' in some form.

With these modifications, most CSV files can be coerced into modus format.


