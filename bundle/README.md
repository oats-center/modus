# convert
-----
Universal library for reading/writing/validating Modus files/resources.  Converts between:
- Modus v1 XML -> Modus v1 JSON
- CSV/XLSX -> Modus v1 JSON

This library works in the browser and in node.

### Install
```bash
yarn add @modusjs/convert
# or
npm install @modusjs/convert
```

### XML -> JSON
```javascript
import { xml } from '@modusjs/convert'

// Just parse as tolerantly as possible, no validation against resulting json schema:
const json_unvalidated = xml.parse(xml_string_from_somewhere);

// parse and validate
const json = xml.parseAsModusResult(xml_string_from_somewhere);
```

### XLSX/CSV -> JSON
```javascript
import { csv } from '@modusjs/convert'

// Using the tomkat generic xlsx parsing 
// (works for sheets that have the structure outlined below)

// parse as base64:
let json = parse({ base64: base_64_string, format: 'tomkat' });
// parse as ArrayBuffer (useful when retrieving from Google Drive, for example):
json = parse({ arrbuf: the_array_buffer, format: 'tomkat' });
// parse as string (i.e. a CSV):
json = parse({ str: csv_string, format: 'tomkat' });
// parse from an already-parsed SheetJS workbook (https://www.npmjs.com/package/xlsx)
json = parse({ wb: parsed_workbook, format: 'tomkat' });
```

Because lab result formats are highly irregular, the CSV conversion may require some hand modifications currently to what is directly produced by a lab:

1. Make sure the result data headers are on row 1! If not, just drag or cut/paste that row up to the first row.
2. Add the word `COMMENT` to any column of a row that you want to ignore from parsing. Do this to pretty much any non lab-result rows.
3. Add the word `UNITS` to any column of a row that contains unit information for the corresponding column header. This will override any unit information used by default for lab result elements.
4. The lab results require a column containing the word 'date' in some form.

With these simple modifications, most CSV files can be coerced into modus format without too much effort.


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

