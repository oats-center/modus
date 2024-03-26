import debug from 'debug';

//@ts-ignore
import { file } from '@modusjs/convert';

import { headless } from './actions';

const info = debug('@modusjs/app#initialize:info');


export async function initialize() {
  // Put anything here that needs to run when the app starts up

  // If you pass ?headless=true&domain=your.domain in the URL, then this code will enable you
  // to send it stuff to convert via cross-document messaging from your domain
  if (!isHeadless()) {
    headless(false);
  } else { // Headless mode
    headless(true);

    const params = new URLSearchParams(window.location.search);
    const domain = params.get('domain');
    window.addEventListener("message", async ({data, origin, source}) => {
      info('Received message: ', data, ' from origin: ', origin);

      if (!source) {
        info('ERROR: source is null, it should be a reference to the calling window.');
        return;
      }

      if (!data.request) {
        info('Received invalid message data: no request field.');
        source.postMessage({...data, result: null, message: 'Invalid message data: no request field' });
        return;
      }

      switch(data.request) {

        case "toJSON":
          const conversions = await file.fromFileBrowser({ file: data.file });
          info('Conversion successful, posting result back to caller:', conversions);
          source.postMessage({ ...data, result: conversions });
        break;

      }

    });
  }
}

function isHeadless(): boolean {
  const params = new URLSearchParams(window.location.search);
  return !!params.get('headless');
}


