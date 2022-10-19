# Modus examples

---

Under `examples/` there are folders representing single example soil sample results in various forms (pdf, xml, csv, xlsx, json, etc.).
All the xml, csv, xlsx, and json examples become importable javascript ESM modules.

## Usage in Typescript/Javascript

---

```typescript
import xml_as_a_string from '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_xml.js'
import xlsx_as_base64 from '@modusjs/examples/dist/tomkat-historic/tomkat_source_data.xlsx'
import csv_as_string from '@modusjs/examples/dist/tomkat-historic/TOKA2021-22A_RMN_Ward.csv'
import json_as_typed_object from '@modusjs/examples/dist/fixing-soil-health-2022/fixing-soil-health-2022_sourcedataLab1_1.json'
import { xml, csv } from '@modusjs/convert'

console.log('json is directly usable:', json_as_typed_object);
console.log('XML can be converted to json and validated:', xml.parseAsModusResult(xml_as_a_string));
console.log('XLSX can be converted to json:', csv.parse({ base64: xlsx_as_base64, format: 'tomkat' }));
console.log('CSV can be converted to json:', csv.parse({ str: csv_as_string, format: 'tomkat' });
```

Each example folder exports a index which contains an array of all the underlying filenames for this example.
The global index exports all the individual indexes as well as an `all` object you can loop over to just
dynamic import all the underlying example files:

```javascript
import examples from '@modusjs/examples';
for (const dir of Object.keys(examples.all)) {
  for (const f of examples.all[dir]) {
    const thisone = await import(`@modusjs/examples/dist/${dir}/${f}`);
  }
}
```

## Development

---

`yarn build` will convert every xml and json file in `examples` into an importable typescript module in `build/`
using `dev/build.js`. Then, it will compile that with typescript into javascript in `dist/` and add the appropriate
typescript declaration files.

`yarn test` will test that everything imports in browser and in node.

## Acknowledgements and Licenses

---

All data in this repo is released under the Creative Commons CCO 1.0 Universal Public License.

Thanks to Point Blue Conservation Science (https://pointblue.org) and TomKat Ranch (https://tomkatranch.org) for providing historic
soil sampling data in the `tomkat-historic` directory.
