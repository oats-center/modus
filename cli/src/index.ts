import { program } from 'commander';
import debug from 'debug';
import chalk from 'chalk';
import { load } from 'cheerio/lib/slim';
import fs from 'fs/promises';

import { parse } from './xsd2json.js';
import { findOne } from 'domutils';

const warn = debug('@modusjs/xsd2json#index:warn');
const info = debug('@modusjs/xsd2json#index:info');
const trace = debug('@modusjs/xsd2json#index:trace');
const { red, cyan } = chalk;

program
  .command('xsd2json')
  .version(process.env.npm_package_version!)
  .requiredOption('-d,--definitions <path>', 'path to definitions file to use for refs')
  .argument('<xsd file>', 'Path to modus_result.')
  .description('Convert a Modus XSD file to JSONSchema, with support for refs')
  .action(async (xsdfile, { definitions }) => {
    info('Converting file ', cyan(xsdfile), ' with ref definitions from ', cyan(definitions));
    const xmlopts = {
      xmlMode: true,
      decodeEntities: true, // Decode HTML entities.
      withStartIndices: false, // Add a `startIndex` property to nodes.
      withEndIndices: false, // Add an `endIndex` property to nodes.
    };
    const xsd = load(await fs.readFile(xsdfile), { xml: true });
    const defs = load(await fs.readFile(definitions), { xml: true });

    // Grab all the xs:element's and xs:simpletypes under "xs:schema":
    const defs_schema = defs('xs\\:schema').get(0);
    const xsd_schema = xsd('xs\\:schema').get(0);
    if (!defs_schema) {
      throw new Error('ERROR: definitions file had no xs:schema tag');
    }
    if (!xsd_schema) {
      throw new Error('ERROR: xsd file had no xs:schema tag');
    }
    const defsJson = parse(defs, defs_schema);
    const xsdJson = parse(xsd, xsd_schema);
    /*
    const defs('xs\\:schema > xs\\:element').each((index,e) => {
      if (!e.attribs.name) {
        warn('Found top-level xs:element without a name, skipping...');
        return;
      }
      const name = e.attribs.name;
      // Grab the element description if present
      const documentation = defs('xs\\:annotation > xs\\:documentation', e.children);
      let description = !documentation ? '' : documentation.text();
      

      //info('Element: ', name, ', description: ', description);
    });
    */
  });

program.parse();


