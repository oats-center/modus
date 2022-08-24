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

export type ToModusJSONResult = {
  results: ModusResult[],
  filename: string,
  isxml: boolean,
  isjson: boolean,
  iscsv: boolean,
  isxlsx: boolean,
};

// This function will attempt to convert all the input files into an array of Modus JSON files
export async function tojson(filenames: string[], { format }: { format?: 'tomkat' | 'generic' }): Promise<ToModusJSONResult[]> {
  trace('received args of ', filenames);
  let results: ToModusJSONResult[] = [];
  for (const filename of filenames) {
    const isxml = !!filename.match(/\.xml$/);
    const iscsv = !!filename.match(/\.csv$/);
    const isxlsx = !!filename.match(/\.xlsx$/);
    const isjson = !!filename.match(/.json$/);
    if (iscsv || isxlsx) {
      if (!moduscsv.supportedFormats.find(f => f === format)) {
        warn(red('ERROR:'), 'format', format, 'is not supported for file', filename,'.  Supported formats are: ', moduscsv.supportedFormats);
        continue;
      }
    }
    const base = { filename, isxml, isjson, iscsv, isxlsx };
    try {
      if (isjson) {
        const js: any = JSON.parse((await fs.readFile(filename)).toString());
        assertModusResult(js); // catch below will inform if parsing or assertion failed.
        results.push({ results: [ js ], ...base }); // just one Modus in this case
      }
      if (isxml) {
        const xmlstring = (await fs.readFile(filename)).toString();
        const result = modusxml.parseModusResult(xmlstring);
        if (result) {
          results.push({ results: [ result ], ...base }); // just one 
        }
      }
      if (iscsv) {
        const csvstring = (await fs.readFile(filename)).toString();
        results.push({ results: moduscsv.parse({ str: csvstring, format: format }), ...base });
      }
      if (isxlsx) {
        const xlsxbuf = (await fs.readFile(filename)).buffer;
        results.push({ results: moduscsv.parse({ arrbuf: xlsxbuf, format: format }), ...base });
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
      continue; // if error, move on to the next file
    }
  } // end for loop on filenames
  return results;
}

