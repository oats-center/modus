import debug from 'debug';
import type ModusResult from '@oada/types/modus/v1/modus-result.js';

const error = debug('@modusjs/convert#html:error');
const info = debug('@modusjs/convert#html:info');
const trace = debug('@modusjs/convert#html:trace');

// From the Fixing Soil Health Tech Stack 2022 hackathon event:
// hosted HTML conversion for soil samples.  This POST returns
// a self-contained HTML report about the soil samples in the ModusResult.
export async function toHtml(mr: ModusResult, filename?: string): Promise<string> {
  const form = new FormData();
  filename = filename || 'modus.json';
  filename = filename.replace('/', '_').replace('\\', '_'); // no path info allowed maybe
  form.append('files', new File([ ...JSON.stringify(mr) ], filename)); // the json as a Blob
  const response: any = await fetch('https://soilapi.farmonapp.com/modus_json_to_html', {
    method: 'post',
    body: form,
  });

  if (response?.status && response.status >= 400) {
    error('ERROR: API request for HTML conversion failed.  Error was:', response);
    throw new Error('Network request failed for conversion to HTML');
  }
  const answer = await response.text();
  trace('Received response from HTML conversion api');
  return answer || '';
}
