# Modus examples
------------------------------------

Under `examples/` there are folders representing single example soil sample results in various forms (pdf, xml, json, etc.).
All the xml and json examples become importable javascript modules.

## Usage in Typescript/Javascript
---------------------------------
```typescript
import xml_as_a_string from '@modusjs/examples/dist/enyart-east50-a_l_labs/hand-modus_xml.js'
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
--------------
`yarn build` will convert every xml and json file in `examples` into an importable typescript module in `build/`
using `dev/build.js`.  Then, it will compile that with typescript into javascript in `dist/` and add the appropriate
typescript declaration files.

`yarn test` will test that everything imports in browser and in node.
