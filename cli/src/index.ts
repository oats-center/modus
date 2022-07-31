import { program } from 'commander';
import debug from 'debug';
import chalk from 'chalk';
import fs from 'fs/promises';
import yesno from 'yesno';

import { xml as modusxml } from '@modusjs/convert';

const warn = debug('@modusjs/xsd2json#index:warn');
const info = debug('@modusjs/xsd2json#index:info');
const trace = debug('@modusjs/xsd2json#index:trace');
const { red, cyan } = chalk;

program
  .command('tojson')
  .argument('<xmlfiles...>')
  .version(process.env.npm_package_version!)
  .description('Convert one or more Modus XML files to json')
 
  .action(async (xmlfilenames) => {
    trace('received args of ', xmlfilenames);
    for (const xmlfilename of xmlfilenames) {
      const output_filename = xmlfilename.replace(/\.xml$/,'.json');
      if (xmlfilename === output_filename) {
        warn(red('ERROR:'), 'output filename', output_filename, 'would be the same as input filename.  Not converting.');
        continue;
      }
      const stat = await fs.stat(output_filename).catch(() => null); // throws if it does not exist
      if (stat) {
        const ok = await yesno({ question: `Output file ${output_filename} exists.  Overwrite?`});
        if (!ok) {
          info('Skipping file ', xmlfilename);
          continue;
        }
      }
      
      info('Converting file ', cyan(xmlfilename), ' to JSON');
      try {
        const xmlstring = (await fs.readFile(xmlfilename)).toString();
        const mr = modusxml.parseModusResult(xmlstring)
        await fs.writeFile(output_filename, JSON.stringify(mr));
        info('Successfully converted', xmlfilename, 'into ', output_filename);
      } catch (e: any) {
        if (e.errors  && e.input && Array.isArray(e.errors)) { // AJV error
          warn(red('ERROR: failed to validate file'), xmlfilename);
          for (const ajv_error of e.errors) {
            warn('Path', ajv_error.instancePath, ajv_error.message); // '/path/to/item' 'must be an array'
          }
        } else {
          warn(red('ERROR: failed to read file', xmlfilename));
          console.log(e);
        }
      }
    }
  });

program.parse();


