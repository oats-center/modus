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

