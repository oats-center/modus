# units

---

Universal library for validating and converting Modus result data units.

This library works in the browser and in node.

### Install

```bash
yarn add @modusjs/units
# or
npm install @modusjs/units
```

### MODUS Unit conversion
For converting a batch of MODUS Nutrient Results
```javascript
import { convertUnits } from '@modusjs/units';
```

### Simple Convert
If you just have something you want to convert
```javascript
import { simpleConvert } from '@modusjs/units';
```

### Validate Units

```javascript
import { validateUnits } from '@modusjs/units';

```

### Base saturation conversion
```javascript
import { convertUnits } from '@modusjs/units';

```

## Types
-molecularWeights: Conversion between milliequivalents and ppm use `molecularWeights` automatically, but it is exported for your convenience.

## Development

---

This library is universal, so it runs tests both in-browser and in node. To simplify
browser testing, the `src/test/` folder holds an HTML file that opens a browser on your machine,
imports the compiled test bundle, and then runs the tests listed there. Option for getting
an automated result from this in the future might be TestCafe...

To run just the browser tests: `yarn test:browser`.

To run just the node tests: `yarn test:node`.

To build: `yarn build`.

To rollup `dist/index.mjs` bundle for browser: `yarn build:rollup`

To compile/bundle everything live as you code: `yarn dev`

To run all tests live as you code (you should run `yarn dev` at the same time): `yarn test`.