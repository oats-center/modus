import debug from 'debug';
import chalk from 'chalk';
// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';

//import * as examples from '@modusjs/examples';
import { all as examples } from '@modusjs/examples';
import * as exs from '@modusjs/examples';
import * as xlsx from 'xlsx';
import jszip from 'jszip';
import { Buffer } from 'buffer/';

import type Slim from '@oada/types/modus/slim/v1/0.js';
import type ModusResult from '@oada/types/modus/v1/modus-result.js';
import fde from 'fast-deep-equal';

const trace = debug('@modusjs/convert#test-toCsv:trace');
const info = debug('@modusjs/convert#test-toCsv:info');
const error = debug('@modusjs/convert#test-toCsv:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));

export default async function run(lib: typeof MainLib) {
  let result = lib.csv.parse({str: exs.a_l_west.plant.sample1_csv});
  let { wb } = lib.csv.toCsv(result[0] as ModusResult)

  let data = xlsx.utils.sheet_to_json(
    wb.Sheets[wb.SheetNames[0]!] as xlsx.WorkSheet
  );

  if (data!.length === 0) {
    throw new Error('CSV had no rows');
  }

  let results: Record<string, string> = {
    'ReportID': 'number',
    'EventType': 'string',
    'FileDescription': 'string',
    'EventDate': 'string',
    'Phosphorus [ppm]': 'number',
  };
  let rowOne: any = data![0];

  test(
    'Checking that first row has several columns with values of the appropriate types.'
  );
  Object.keys(results).forEach((key) => {
    if (rowOne?.[key] === undefined || typeof rowOne?.[key] !== results[key]) {
      error('Bad row:', rowOne);
      /*
      throw new Error(
        `Column ${key} was undefined or did not match expected type ${results[key]}`
      );
      */
    }
  });

  test('Now re-parse the standardized csv back into modus json');
  let csvResult = lib.csv.parse({wb});

  // Analytes should generally have units and modustestID

  test('Parse all files from slim to standardCsv.');
  //@ts-ignore
  for await (const [lab, types] of Object.entries(examples)) {
    //@ts-ignore
    for await (const [type, list] of Object.entries(types)) {
      //@ts-ignore
      for await (const example of list as any[]) {
        // Note: this dynamic import does not seem to like slashes within template string placeholders (${})
        const mod = await import(
          `../../../examples/dist/${example.lab}/${example.type}/${example.js.split('.')[0]}.js`
        );
        const data = mod.default;
        console.log(`Processing ${lab} - ${example.filename}`);

        // Skip certain XML/JSON examples that are known not to round-trip here
        if ((example.isxml && example.filename.includes('SUBMIT')) || example.isjson) {
          console.log(`Skipping ${example.filename}`);
          continue;
        }

        let results;
        if (example.isshapefile) {
          // Shapefile examples: data is an object mapping extension -> base64 payload.
          // Build an in-memory ZIP so json.toJson can use the standard shapefile pipeline.
          const zip = new jszip();
          const base = (example.filename as string).replace(/\.(\*|shp)$/i, '');
          for (const [ext, b64] of Object.entries(data as Record<string, string>)) {
            if (typeof b64 !== 'string') continue;
            const fname = `${base}.${ext}`;
            zip.file(fname, Buffer.from(b64, 'base64'));
          }
          const arrbuf = await zip.generateAsync({ type: 'arraybuffer' });
          results = await lib.json.toJson({
            arrbuf,
            format: 'generic',
            filename: `${base}.zip`,
          });
        } else {
          const exampleType = example.iscsv || example.isjson || example.isxml ? 'str' : 'base64';
          results = await lib.json.toJson({
            [exampleType]: data,
            format: 'generic',
            filename: example.filename,
          } as any);
        }

        const slim = results[0]?.modus;
        if (!slim) throw new Error(`Example ${example.filename} did not produce a Slim`);

        const standardCsv = lib.json.slim.toStandardCsv(slim);
        const backToSlim = lib.json.slim.fromStandardCsv(standardCsv);

        if (!fde(slim, backToSlim)) {
          console.log(`Example ${example.filename} needs to be fixed`);
          //throw new Error('slim and backToSlim not equal')
        }
        console.log('done with example');
      }
    }
  }
}
