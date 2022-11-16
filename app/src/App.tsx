//process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
import { useContext, DragEventHandler } from 'react';
import debug from 'debug';
import md5 from 'md5';
import './App.css';
import { connect } from '@oada/client';
import { tree } from './trellisTree';
import { observer } from 'mobx-react-lite';
import { context } from './state';
// @ts-ignore
import { file as convertFile, units, ModusResult } from '@modusjs/convert/dist-browser/bundle.mjs';
import Messages from './Messages';

//localStorage.debug = '*';

type Output = 'json' | 'csv' | 'trellis';

const trace = debug('@modusjs/app#App:trace');
const info = debug('@modusjs/app#App:info');
const error = debug('@modusjs/app#App:error');
const warn = debug('@modusjs/app#App:warn');

export default observer(function App() {
  const { state, actions } = useContext(context); 

  async function toTrellis ({ domain, token, results } :
    { domain: string, token: string, results: ModusResult[] }): Promise<void> {
    try {
      const oada = await connect({ domain, token });
      actions.message(`Connected to your Trellis at ${domain}`);
      info('Successfully connected to trellis');
      for await (const {modus: data} of results) {
        let hash = md5(serializeJSON(data));
        //let key = data.Events[0].LabMetaData.Reports[0].ReportID;
        let date = data.Events[0].EventMetaData.EventDate;
        let path =
          `/bookmarks/lab-results/soil/event-date-index/${date}/md5-index/${hash}`;
        if (date && hash) {
          info(`Putting to path: ${path}`);
          console.log(`Putting to path: ${path}`);
          await oada.put({
            path,
            data,
            tree,
          })
        }
      }
      actions.message(`Successfully saved ${results.length} result${results.length === 1 ? '' : 's'} to your Trellis.`);
      info('Successfully wrote results to trellis');
    } catch(err) {
      console.error(`toTrellis Errored: ${err}`);
      error(`toTrellis Errored: ${err}`);
    }
  }

  const handleFile = ({type, inout} : { type: 'drop' | 'drag', inout?: boolean }): DragEventHandler  => async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    switch(type) {

      case 'drag':
        if (state.inzone !== inout) {
          actions.inzone(inout || false);
          if (inout) evt.dataTransfer.dropEffect = "copy"; // makes a green plus on mac
        }
      break;

      case 'drop':
        info('file dropped, evt = ', evt);
        actions.message('Reading file...');
        const files = [ ...evt.dataTransfer.files ]; // It is dumb that I have to do this
        const all_file_results = await Promise.all(files.map(async f => {
          try {
            return await convertFile.fromFileBrowser({ file: f });
          } catch(e: any) {
            info('Failed to convert file: ', f.name, '.  Error was: ', e);
            return [];
          }
        }));
        actions.message('Converting...');
        const modus_results = all_file_results.reduce((acc, arr) => [ ...acc, ...arr], []);
        actions.message(`Successfully converted ${modus_results.length} result${modus_results.length === 1 ? '' : 's'} to Modus`);

        info('results: ', modus_results);
        info('Saving',state.output,' type from results');
        if (state.output === 'trellis') {
          await toTrellis({
            domain: state.trellis.domain,
            token: state.trellis.token,
            results: modus_results
          })
        } else {
          await convertFile.save({ modus: modus_results, outputtype: state.output });
          info('File successfully saved');
          actions.message('Conversion result saved.');
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
          value={state.output}
          onChange={(evt) => actions.output(evt.target.value as Output)}
        >
          <option value="json">Modus JSON</option>
          <option value="csv">CSV</option>
          <option value="trellis">Sync to Trellis</option>
        </select>
      </div>

      {state.output==='trellis' && <div className="oada-connect-container">
        <h4>
        Trellis Connection
        </h4>
        <div>
        Domain: &nbsp;&nbsp;
        <input
          type="text"
          value={state.trellis.domain}
          onChange={evt => actions.trellis({ domain: evt.target.value })}
        />
      </div>
      <div>
        Token: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <input
          type="text"
          value={state.trellis.token}
          onChange={evt => actions.trellis({ token: evt.target.value })}
        />
      </div>
      <div>
        &nbsp;
      </div>
      </div>}
      
      <Messages />

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
        Please note that no data leaves your browser unless you choose to send the
        output to your own Trellis. Your original and
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
});

function serializeJSON(obj: any): string {

  if (typeof obj === 'number') {
    const str = obj.toString();
    if (str.match(/\./)) {
      warn('You cannot serialize a floating point number with a hashing function and expect it to work consistently across all systems.  Use a string.');
    }
    // Otherwise, it's an int and it should serialize just fine.
    return str;
  }
  if (typeof obj === 'string') return '"'+obj+'"';
  if (typeof obj === 'boolean') return (obj ? 'true' : 'false');
  // Must be an array or object
  var isarray = Array.isArray(obj);
  var starttoken = isarray ? '[' : '{';
  var endtoken = isarray ? ']' : '}';

  if (!obj) return 'null';

  const keys = Object.keys(obj).sort(); // you can't have two identical keys, so you don't have to worry about that.

  return starttoken
    + keys.reduce(function(acc,k,index) {
      if (!isarray) acc += '"'+k+'":'; // if an object, put the key name here
      acc += serializeJSON(obj[k]);
      if (index < keys.length-1) acc += ',';
      return acc;
    },"")
    + endtoken;
}
