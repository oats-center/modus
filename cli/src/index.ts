#! /usr/bin/env node

import { program, Option } from 'commander';
import debug from 'debug';
import chalk from 'chalk';
import fs from 'fs/promises';
import yesno from 'yesno';

import { csv as moduscsv, html as modushtml, json as modusjson } from '@modusjs/convert';
import type ModusResult from '@oada/types/modus/v1/modus-result.js';


const warn = debug('@modusjs/cli:warn');
const info = debug('@modusjs/cli:info');
const trace = debug('@modusjs/cli:trace');
const { red, cyan } = chalk;

const VERSION='0.0.7';

async function verifyOverwriteIfExists(filename: string): Promise<boolean> {
  const stat = await fs.stat(filename).catch(() => null); // throws if it does not exist
  if (stat) {
    const ok = await yesno({ question: `Output file ${filename} exists.  Overwrite?`});
    if (!ok) {
      info('Skipping file ', filename);
      return false;
    }
  }
  return true; // either doesn't exist, or they said yes to overwrite
}

program
  .command('tojson')
  .addOption(new Option('-f,--format <format>', 'Format for CSV or XLSX input files.').choices(moduscsv.supportedFormats))
  .option('-c,--compact', 'Compact JSON output to a single line')
  .argument('<files...>')
  //.version(process.env.npm_package_version!)
  .version(VERSION)
  .description('Convert one or more Modus XML files, CSV files, or XLSX files to MODUS json.  CSV/XLSX files must have supported structures.')
 
  .action(async (filenames, opts) => {
    trace('Reading input files ', cyan(filenames.join(',')));
    const results = await modusjson.json.toJson(filenames.map(filename => {
      const base = { filename },
      if (opts.format)({ );
    for (const { results, filename, isxlsx, iscsv } of results_by_filename) {
      info('Found',cyan(results.length),'ModusResults in input file', filename);
      const output_filename_base = filename.replace(/\.(xml|csv|xlsx)$/,'.json');
      for (const [index, result] of results.entries()) {
        try {
          const output_filename = await jsonFilenameFromOriginalFilename({ mr: result, index, output_filename_base, results, filename, isxlsx, iscsv });
          if (!output_filename) {
            warn('Skipping output file', output_filename);
            continue;
          }
          if (filename === output_filename) {
            warn(red('ERROR:'), 'output filename', output_filename, 'would be the same as input filename.  Not saving output.');
            continue;
          }
          const dowrite = await verifyOverwriteIfExists(output_filename);
          if (!dowrite) {
            continue;
          }
  
          const towrite = opts.compact ? JSON.stringify(result) : JSON.stringify(result,null,'  ');
          await fs.writeFile(output_filename, towrite);
          info('Successfully converted', filename, 'into ', output_filename);
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
    }
  });

program
  .command('tocsv')
  .requiredOption('-o,--output <filename.csv>', 'Name and path of output CSV file)')
  .option('-s,--ssurgo', 'Flag to include SSURGO data for each row by location from soilsjs library')
  .argument('<json files...>')
  .version(VERSION)
  .description('Condense one or more Modus JSON files into a single flat CSV with standardized headers')
  .action(async (filenames, opts) => {
    const results_by_filename = await tojson(filenames, opts);
    let allresults: ModusResult[] = [];
    // flatten all results from all files into one array of ModusResults:
    for (const { results, filename } of results_by_filename) {
      info('File',cyan(filename),'contributed',cyan(results.length),'Modus result files to the output CSV');
      allresults = [ ...allresults, ...results ];
    }
    info('Parsed', cyan(allresults.length), ' Modus JSON files for inclusion in CSV output');
    const csvopts = {};
    if (opts.ssurgo) csvopts.ssurgo = opts.ssurgo;
    const { str } = await moduscsv.toCsv(allresults, csvopts);
    const dowrite = await verifyOverwriteIfExists(opts.output);
    if (!dowrite) {
      return;
    }
    await fs.writeFile(opts.output, str);
    info('Successfully wrote CSV output to', opts.output, 'from', cyan(allresults.length), 'Modus results');
  });

program
  .command('tohtml')
  .argument('<json files...>')
  .version(VERSION)
  .description('Create an HTML report of one or more Modus JSON files')
  .action(async (filenames, opts) => {
    const results_by_filename = await tojson(filenames, opts);
    for (const { results, filename, isxlsx, iscsv } of results_by_filename) {
      info('Found',cyan(results.length),'ModusResults in input file', filename);
      const output_filename_base = filename.replace(/\.(xml|csv|xlsx)$/,'.json');
      for (const [index, result] of results.entries()) {
        try {
          const json_filename = await jsonFilenameFromOriginalFilename({ mr: result, index, output_filename_base, results, filename, isxlsx, iscsv });
          if (!json_filename) {
            warn('Skipping json file', json_filename);
            continue;
          }
  
          const towrite = await modushtml.toHtml(result, json_filename);
          const html_filename = json_filename.replace(/\.json$/, '.html');
          if (html_filename === json_filename) {
            warn('Output filename', html_filename, 'would be same as input filename.  Skipping.');
            continue;
          }
          const dowrite = await verifyOverwriteIfExists(html_filename);
          if (!dowrite) {
            continue;
          }
          await fs.writeFile(html_filename, towrite);
          info('Successfully converted', filename, 'into ', html_filename);
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
    }

  });




program.parse();


