#! /usr/bin/env node

import { program, Option } from 'commander';
import debug from 'debug';
import chalk from 'chalk';
import fs from 'fs/promises';
import yesno from 'yesno';

import {
  csv as moduscsv,
  html as modushtml,
  file as modusfile,
} from '@modusjs/convert';
import type ModusResult from '@oada/types/modus/v1/modus-result.js';
import type { NodeInputFile } from '@modusjs/convert/dist/node/file.js';

const warn = debug('@modusjs/cli:warn');
const info = debug('@modusjs/cli:info');
const trace = debug('@modusjs/cli:trace');
const { red, cyan } = chalk;

const VERSION = '0.0.7';

async function verifyOverwriteIfExists(filename: string): Promise<boolean> {
  const stat = await fs.stat(filename).catch(() => null); // throws if it does not exist
  if (stat) {
    const ok = await yesno({
      question: `Output file ${filename} exists.  Overwrite?`,
    });
    if (!ok) {
      info('Skipping file ', filename);
      return false;
    }
  }
  return true; // either doesn't exist, or they said yes to overwrite
}

program
  .command('tojson')
  .addOption(
    new Option(
      '-f,--format <format>',
      'Format for CSV or XLSX input files.'
    ).choices(moduscsv.supportedFormats)
  )
  .option('-c,--compact', 'Compact JSON output to a single line')
  .argument('<files...>')
  //.version(process.env.npm_package_version!)
  .version(VERSION)
  .description(
    'Convert one or more Modus XML files, CSV files, or XLSX files to MODUS json.  CSV/XLSX files must have supported structures.'
  )

  .action(async (filenames: string[], opts) => {
    trace('Reading input files ', cyan(filenames.join(',')));
    const base: NodeInputFile = { filename: '' };
    if (opts.format) base.format = opts.format;
    // Convert all the stuff to JSON:
    const results = await modusfile.fromFile(
      filenames.map((filename) => ({ ...base, filename }))
    );
    // Save out the files, checking if we want to overwrite:
    for (const { original_filename, output_filename, modus } of results) {
      try {
        if (original_filename === output_filename) {
          warn(
            red('ERROR:'),
            'output filename',
            output_filename,
            'would be the same as input filename.  Not saving output.'
          );
          continue;
        }
        const dowrite = await verifyOverwriteIfExists(output_filename);
        if (!dowrite) continue;

        const towrite = opts.compact
          ? JSON.stringify(modus)
          : JSON.stringify(modus, null, '  ');
        await fs.writeFile(output_filename, towrite);
        info(
          'Successfully converted',
          original_filename,
          'into ',
          output_filename
        );
      } catch (e: any) {
        if (e.errors && e.input && Array.isArray(e.errors)) {
          // AJV error
          warn(red('ERROR: failed to validate file'), original_filename);
          for (const ajv_error of e.errors) {
            warn('Path', ajv_error.instancePath, ajv_error.message); // '/path/to/item' 'must be an array'
          }
        } else {
          warn(red('ERROR: failed to read file', original_filename));
          console.log(e);
        }
      }
    }
  });

program
  .command('tocsv')
  .requiredOption(
    '-o,--output <filename.csv>',
    'Name and path of output CSV file)'
  )
  .option(
    '-s,--ssurgo',
    'Flag to include SSURGO data for each row by location from soilsjs library'
  )
  .argument('<json files...>')
  .version(VERSION)
  .description(
    'Condense one or more Modus JSON files into a single flat CSV with standardized headers'
  )
  .action(async (filenames: string[], opts) => {
    const base: NodeInputFile = { filename: '' };
    if (opts.format) base.format = opts.format;
    const results = await modusfile.fromFile(
      filenames.map((filename) => ({ ...base, filename }))
    );
    // flatten all results from all files into one array of ModusResults:
    info(
      'Parsed',
      cyan(results.length),
      ' Modus JSON files for inclusion in CSV output'
    );
    const { str } = moduscsv.toCsv(results.map((r) => r.modus));
    const dowrite = await verifyOverwriteIfExists(opts.output);
    if (!dowrite) return;
    await fs.writeFile(opts.output, str);
    info(
      'Successfully wrote CSV output to',
      opts.output,
      'from',
      cyan(results.length),
      'Modus results'
    );
  });

program
  .command('tohtml')
  .argument('<json files...>')
  .version(VERSION)
  .description('Create an HTML report of one or more Modus JSON files')
  .action(async (filenames: string[], opts) => {
    const base: NodeInputFile = { filename: '' };
    if (opts.format) base.format = opts.format;
    const results = await modusfile.fromFile(
      filenames.map((filename) => ({ ...base, filename }))
    );
    // flatten all results from all files into one array of ModusResults:
    info(
      'Parsed',
      cyan(results.length),
      ' Modus JSON files for HTML conversion'
    );

    for (const { original_filename, output_filename, modus } of results) {
      try {
        const towrite = await modushtml.toHtml(modus, output_filename);
        const html_filename = output_filename.replace(/\.json$/, '.html');
        if (html_filename === output_filename) {
          warn(
            'Output filename',
            html_filename,
            'would be same as input filename.  Skipping.'
          );
          continue;
        }
        const dowrite = await verifyOverwriteIfExists(html_filename);
        if (!dowrite) continue;
        await fs.writeFile(html_filename, towrite);
        info(
          'Successfully converted',
          original_filename,
          'into',
          html_filename
        );
      } catch (e: any) {
        if (e.errors && e.input && Array.isArray(e.errors)) {
          // AJV error
          warn(red('ERROR: failed to validate file'), output_filename);
          for (const ajv_error of e.errors) {
            warn('Path', ajv_error.instancePath, ajv_error.message); // '/path/to/item' 'must be an array'
          }
        } else {
          warn(red('ERROR: failed to read file', output_filename));
          console.log(e);
        }
      }
    }
  });

program.parse();
