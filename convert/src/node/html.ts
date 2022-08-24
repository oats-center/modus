import debug from 'debug';
import {Readable} from 'stream';
import fetch from 'node-fetch';
import type ModusResult from '@oada/types/modus/v1/modus-result.js';
import {FormData, File} from 'formdata-node';
import {FormDataEncoder} from 'form-data-encoder';

const error = debug('@modusjs/convert#html:error');
const info = debug('@modusjs/convert#html:info');
const trace = debug('@modusjs/convert#html:trace');

// From the Fixing Soil Health Tech Stack 2022 hackathon event:
// hosted HTML conversion for soil samples.  This POST returns
// a self-contained HTML report about the soil samples in the ModusResult.
export async function toHtml(mr: ModusResult, filename?: string): Promise<string> {
  const form = new FormData();
  form.set('file', new File([ ...JSON.stringify(mr) ], filename || 'modus.json'));
  const encoder = new FormDataEncoder(form);
 
  const response: any = await fetch('https://soilapi.farmonapp.com/upload_soil_data', {
    method: 'post',
    headers: encoder.headers,
    body: Readable.from(encoder.encode()),
  });

  if (response?.status && response.status >= 400) {
    error('ERROR: API request for HTML conversion failed.  Error was:', response);
    throw new Error('Network request failed for conversion to HTML');
  }
  const answer = await response.json();
  trace('Received response from api: ', answer);
  return answer['filename'] || '';
}
