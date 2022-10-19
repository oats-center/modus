import { useState, DragEventHandler } from 'react';
import {
  file as convertFile,
} from '@modusjs/convert/dist-browser/browser/index.js';
import debug from 'debug';
import './App.css';
import { connect } from '@oada/client';
//import { tree } from './trellisTree';
import type { ModusResult } from '@modusjs/convert/dist-browser/browser/index.js';
localStorage.debug = '*';

type Output = 'json' | 'csv' | 'trellis';

const info = debug('@modusjs/app#App:info');

export default function App() {
  const [ output, setOutput ] = useState<Output>('json');
  const [ domain, setTrellisDomain] = useState<string>('');
  const [ token, setTrellisToken] = useState<string>('');
  const [ inzone, setInzone ] = useState<boolean>(false);
  const [ isSupported, setIsSupported ] = useState<boolean>(false);

  async function toTrellis ({ domain, token, results } :
    { domain: string, token: string, results: ModusResult[] }): Promise<void> {
    console.log(domain, token, results);
    try {
      const oada = await connect({ domain, token });
      /*
      info('Successfully connected to trellis');
      await oada.put({
        path: `/bookmarks/lab-results/soil`,
        data: {},//results,
        tree,
        })
     */
      info('Successfully wrote results to trellis');
    } catch(err) {

    }
  }

  const handleFile = ({type, inout} : { type: 'drop' | 'drag', inout?: boolean }): DragEventHandler  => async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    switch(type) {

      case 'drag':
        if (inzone !== inout) {
          setInzone(inout || false);
          if (inout) evt.dataTransfer.dropEffect = "copy"; // makes a green plus on mac
        }
      break;

      case 'drop':
        info('file dropped, evt = ', evt);
        const files = [ ...evt.dataTransfer.files ]; // It is dumb that I have to do this
        const all_file_results = await Promise.all(files.map(async f => {
          try {
            return await convertFile.fromFileBrowser({ file: f });
          } catch(e: any) {
            info('Failed to convert file: ', f.name, '.  Error was: ', e);
            return [];
          }
        }));
        const modus_results = all_file_results.reduce((acc, arr) => [ ...acc, ...arr], []);
        info('results: ', modus_results);
        info('Saving',output,' type from results');
        if (output === 'trellis') {
          await toTrellis({
            domain,
            token,
            results: modus_results
          })
        } else {
          await convertFile.save({ modus: modus_results, outputtype: output });
          info('File successfully saved');
        }
      break;
      }
    };

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1 className="header-title">
            <img className="header-logo" src="fixingsoil-logo.png" />
            <div>Modus Lab Results Converter</div>
          </h1>
          <span className="tagline">
            Drop your soil, nutrient, water or nematode sample lab results here
            and get back a standard set of Modus JSON files or a standard CSV.
          </span>
        </div>
        <div style={{ flexGrow: 1 }}></div>
        <div>{/* Icons here  */}</div>
      </div>

      <hr />

      <div className="output">
        Output Format: &nbsp;&nbsp;
        <select
          value={output}
          onChange={(evt) => setOutput(evt.target.value as Output)}
        >
          <option value="json">Modus JSON</option>
          <option value="csv">CSV</option>
          <option value="trellis">Sync to Trellis</option>
        </select>
      </div>

      {output==='trellis' && <div className="oada-connect-container">
        <h4>
        Trellis Connection
        </h4>
        <div>
        Domain: &nbsp;&nbsp;
        <input
          type="text"
          value={domain}
          onChange={evt => setTrellisDomain(evt.target.value)}
        />
      </div>
      <div>
        Token: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <input
          type="text"
          value={token}
          onChange={evt => setTrellisToken(evt.target.value)}
        />
      </div>
      <div>
        &nbsp;
      </div>
      </div>}

      <div className="dropzone-container">
        <div
          className="dropzone"
          onDragOver={handleFile({ type: 'drag' })}
          onDrop={handleFile({ type: 'drop' })}
          onDragEnter={handleFile({ type: 'drag', inout: true })}
          onDragLeave={handleFile({ type: 'drag', inout: false })}
        >
          Drop file here to download a standard MODUS output format.
        </div>
      </div>


      <div className="footer">
        <hr />
        Please note that no data leaves your browser. Your original and
        converted data never leave your computer.
        <hr />
        Thanks to the &nbsp;
        <a href="https://oatscenter.org">OATS Center</a>,&nbsp;
        <a href="https://farmfoundation.org">Farm Foundation</a>, &nbsp;
        <a href="https://mixingbowlhub.com/">Mixing Bowl Hub</a>,&nbsp;
        <a href="https://aggateway.org">Ag Gateway</a>,&nbsp; and all
        participants in the{' '}
        <a href="https://farmfoundation.swoogo.com/soilhealthtech">
          2022 "Fixing the Soil Health Tech Stack" Hackathon
        </a>
        .
      </div>
    </div>
  );
}