import { useState, DragEventHandler } from 'react';
import { file as convertFile, csv as convertCsv } from '@modusjs/convert/dist-browser/browser/index.js';
import debug from 'debug';
import './App.css';
localStorage.debug = '*';

type Output = 'json' | 'csv';

const info = debug('@modusjs/app#App:info');

export default function App() {

  const [ output, setOutput ] = useState<Output>('json');
  const [ inzone, setInzone ] = useState<boolean>(false);
  const [ isSupported, setIsSupported ] = useState<boolean>(false);

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
        await convertFile.save({ modus: modus_results, outputtype: output });
        info('File successfully saved');
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
            Drop your soil, nutrient, water or nematode sample 
            lab results here and get back a standard set of 
            Modus JSON files or a standard CSV.
          </span>
        </div>
        <div style={{ flexGrow: 1 }}></div>
        <div>
          { /* Icons here  */ }
        </div>
      </div>

      <hr/>

      <div className="output">
        Output Format: &nbsp;&nbsp;
        <select value={output} onChange={evt => setOutput(evt.target.value as Output)}>
          <option value="json">Modus JSON</option>
          <option value="csv">CSV</option>
        </select>
      </div>

      <div className="dropzone-container">
        <div className="dropzone"
          onDragOver={handleFile({ type: 'drag' })}
          onDrop={handleFile({type: 'drop' })}
          onDragEnter={handleFile({ type: 'drag', inout: true })} 
          onDragLeave={handleFile({ type: 'drag', inout: false })}
        >
          Drop file here to download a standard MODUS output format.
        </div>
      </div>

      <div className="footer">
        <hr/>
        Please note that no data leaves your browser.  Your original and converted data never leave your computer.
        <hr/>
        Thanks to the OATS Center, Farm Foundation, Mixing Bowl Hub, Ag Gateway, and all participants in the 
        2022 "Fixing the Soil Health Tech Stack" Hackathon.
      </div>

    </div>
  )
}

