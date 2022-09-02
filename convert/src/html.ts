// This is handled within each individual platform (node/ browser/) intead of here.
// Couldn't figure out how to get the multipart/form-data to work right with the
// cross-fetch and isomorphic-form-data here
/* import debug from 'debug';
import fetch from 'cross-fetch'; // universal fetch
import type ModusResult from '@oada/types/modus/v1/modus-result.js';
//import 'isomorphic-form-data'; // this puts global.FormData into existence


const error = debug('@modusjs/convert#html:error');
const warn = debug('@modusjs/convert#html:error');
const info = debug('@modusjs/convert#html:info');
const trace = debug('@modusjs/convert#html:trace');

// From the Fixing Soil Health Tech Stack 2022 hackathon event:
// hosted HTML conversion for soil samples.  This POST returns
// a self-contained HTML report about the soil samples in the ModusResult.
export async function toHtml(mr: ModusResult): Promise<string> {
  const body = new FormData();  // from isomorphic-form-data
  body.append('file', new Blob([ JSON.stringify(mr) ]));
  
  const response: any = await fetch('https://soilapi.farmonapp.com/upload_soil_data', {
    method: 'POST',
    body: `
    //headers: {
    //  "Content-Type": `multipart/form-data; boundary=${boundary}`,
    //}
  });

  if (response?.status && response.status >= 400) {
    error('ERROR: API request for HTML conversion failed.  Error was:', response);
    throw new Error('Network request failed for conversion to HTML');
  }
  trace('Received response from api: ', response);
  return response['filename'] || '';
} */
