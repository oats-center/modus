#! /usr/bin/env node

import { program, Option } from 'commander';
import debug from 'debug';
import chalk from 'chalk';
import fs from 'fs/promises';
import yesno from 'yesno';

import { xml as modusxml } from '@modusjs/convert';
import { csv as moduscsv } from '@modusjs/convert';
import ModusResult, { assert as assertModusResult } from '@oada/types/modus/v1/modus-result.js';

const warn = debug('@modusjs/cli:warn');
const info = debug('@modusjs/cli:info');
const trace = debug('@modusjs/cli:trace');
const { red, cyan } = chalk;

const VERSION='0.0.7';

program
  .command('tojson')
  .addOption(new Option('-f,--format <format>', 'Format for CSV or XLSX input files.').choices(moduscsv.supportedFormats))
  .option('-c,--compact', 'Compact JSON output to a single line')
  .argument('<files...>')
  //.version(process.env.npm_package_version!)
  .version(VERSION)
  .description('Convert one or more Modus XML files, CSV files, or XLSX files to MODUS json.  CSV/XLSX files must has supported structures.')
 
  .action(async (filenames, opts) => {
    trace('received args of ', filenames);
    for (const filename of filenames) {
      const isxml = filename.match(/\.xml$/);
      const iscsv = filename.match(/\.csv/);
      const isxlsx = filename.match(/\.xlsx/);
      if (iscsv || isxlsx) {
        if (!moduscsv.supportedFormats.find(f => f === opts.format)) {
          warn(red('ERROR:'), 'format', opts.format, 'is not supported for file', filename,'.  Supported formats are: ', moduscsv.supportedFormats);
          continue;
        }
      }
      info('Converting file ', cyan(filename), ' to JSON');
      try {
        let results: any[] = [];
        if (isxml) {
          const xmlstring = (await fs.readFile(filename)).toString();
          results.push(modusxml.parseModusResult(xmlstring))
        }
        if (iscsv) {
          const csvstring = (await fs.readFile(filename)).toString();
          results = [...results, ...moduscsv.parse({ str: csvstring, format: opts.format })];
        }
        if (isxlsx) {
          const xlsxbuf = (await fs.readFile(filename)).buffer;
          results = [...results, ...moduscsv.parse({ arrbuf: xlsxbuf, format: opts.format })];
        }

        info('Found',cyan(results.length),'ModusResults in input file', filename);
        const output_filename_base = filename.replace(/\.(xml|csv|xlsx)$/,'.json');
        for (const [index, result] of results.entries()) {
          let output_filename = output_filename_base;
          // xslx and csv store the sheetname + group number in FileDescription, we can name things by that
          const filedescription = result?.Events?.[0]?.LabMetaData?.Reports?.[0]?.FileDescription;
          if ((isxlsx || iscsv) && filedescription) {
            output_filename = output_filename.replace(/\.json$/, `${filedescription.replace(/[^a-zA-Z0-9_\\-]*/g,'')}.json`);
          } else {
            if (results.length > 1) { // more than one result, have to number the output files
              output_filename = output_filename.replace(/\.json$/, `_${index}.json`);
            }
          }
          if (filename === output_filename) {
            warn(red('ERROR:'), 'output filename', output_filename, 'would be the same as input filename.  Not saving output.');
            continue;
          }

          const stat = await fs.stat(output_filename).catch(() => null); // throws if it does not exist
          if (stat) {
            const ok = await yesno({ question: `Output file ${output_filename} exists.  Overwrite?`});
            if (!ok) {
              info('Skipping file ', filename);
              continue;
            }
          }

          const towrite = opts.compact ? JSON.stringify(result) : JSON.stringify(result,null,'  ');
          await fs.writeFile(output_filename, towrite);
          info('Successfully converted', filename, 'into ', output_filename);
        }
      } catch (e: any) {
        if (e.errors  && e.input && Array.isArray(e.errors)) { // AJV error
          warn(red('ERROR: failed to validate file'), filename);
          for (const ajv_error of e.errors) {
            warn('Path', ajv_error.instancePath, ajv_error.message); // '/path/to/item' 'must be an array'
          }
        } else {
          warn(red('ERROR: failed to read file', filename));
          console.log(e);
        }
      }
    }
  });

program
  .command('tocsv')
  .requiredOption('-o,--output <filename.csv>', 'Name and path of output CSV file)')
  .argument('<json files...>')
  .version(VERSION)
  .description('Condense one or more Modus JSON files into a single flat CSV with standardized headers')
  .action(async (filenames, opts) => {
    const modusresults: ModusResult[] = [];
    for (const f of filenames) {
      try {
        const json = JSON.parse((await fs.readFile(f)).toString());
        assertModusResult(json);
        modusresults.push(json);
      } catch(e: any) {
        warn(red('ERROR:'), 'Failed to parse file', f, 'as Modus JSON.  Error was:', e);
        continue;
      }
    }
    info('Parsed', cyan(modusresults.length), ' Modus JSON files for inclusion in CSV output');
    const { str } = moduscsv.toCsv(modusresults);
    await fs.writeFile(opts.output, str);
    info('Successfully wrote CSV output to', opts.output, 'from', cyan(modusresults.length), 'files');
  
  });

program.parse();


