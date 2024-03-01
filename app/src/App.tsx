//process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
import { useContext, DragEventHandler } from 'react';
import debug from 'debug';
import './App.css';
import { connect } from '@oada/client';
import { observer } from 'mobx-react-lite';
import { Button, IconButton, Tab, Tabs } from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { FolderZip } from '@mui/icons-material';
import { context } from './state';
import { toModus2QuickHack } from './toModus2'
// @ts-ignore
import { file as convertFile } from '@modusjs/convert/dist-browser/bundle.mjs';
import Messages from './Messages';
import Table from './Table';
import LabConfig from './LabConfig';
import bigdemo from '../bigdemo.zip';
import curateddemo from '../curateddemo.zip';

//localStorage.debug = '*';

type Output = 'modusjson2' | 'json' | 'csv' | 'trellis';

const trace = debug('@modusjs/app#App:trace');
const info = debug('@modusjs/app#App:info');
const error = debug('@modusjs/app#App:error');
const warn = debug('@modusjs/app#App:warn');

export default observer(function App() {
  const { state, actions } = useContext(context);


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
            return await convertFile.fromFileBrowser({ file: f}, Object.values(state.labConfig.list) );
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
        const outputtype = state.output === 'modusjson2' ? 'json' : state.output;
        /*if (state.output === 'modusjson2') {
          for (const mr of (modus_results as json.ModusJSONConversionResult[])) {
            mr.modus = toModus2QuickHack(mr.modus);
          }
        }
        */
        if (state.output === 'trellis') {
          actions.toTrellis(modus_results);
        } else {
          await convertFile.save({ modus: modus_results, outputtype });
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
        </div>
        <div style={{ flexGrow: 1 }}></div>
        <div>
          <a href={curateddemo} download="curateddemo.zip" target='_blank'>
              <IconButton
                color="primary"
                aria-label="download">
                <FolderZip />
              </IconButton>
            </a>
          </div>
      </div>

      <hr />

{/*
      <TabContext
        value={state.tab}>
        <TabList
        onChange={actions.changeTab}
        >
        <Tab value={"1"} label="Convert" />
        <Tab value={"2"} label="CSV Configuration"/>
      </TabList>
      <TabPanel value="2"><LabConfig/></TabPanel>
      <TabPanel value="1">
  */}
        <div className="output">
          <Messages />
          <div className="tagline">
            Drop your soil, nutrient, water or nematode sample lab results here
            and get back a standard set of Modus JSON files or a standard CSV.
            <br/><br/>
          </div>

          <div>
            Output Format: &nbsp;&nbsp;
            <select
              value={state.output}
              onChange={(evt) => actions.output(evt.target.value as Output)}
            >
              <option value="modusjson2">Modus JSON v2</option>
              <option value="json">Modus JSON v1</option>
              <option value="csv">Standardized CSV</option>
              <option value="trellis">Sync to Trellis</option>
            </select>
          </div>
          {/*<div>
            Lab Format: &nbsp;&nbsp;
            <select
              value={state.labConfig?.selected || 'auto'}
              onChange={actions.selectLabConfig}
            >
              <option value="auto">Autodetect</option>
              {Object.entries(state.labConfig.list).map(([key, lc]) =>
                <option value={key}>{key}</option>
              )}
            </select>
          </div>*/}

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
          type="password"
          value={state.trellis.token}
          onChange={evt => actions.trellis({ token: evt.target.value })}
        />
        {state.trellis.conn ?
          <Button
            variant="text"
            disabled
            >
          </Button>
          : <Button
            variant="text"
            onClick={actions.trellisConnect}
            >Connect
          </Button>
        }
      </div>
      <div>
        &nbsp;
      </div>
      </div>}


      <div className="dropzone-container">
        {state.output !== 'trellis' || state.trellis.conn ? <div
          className="dropzone"
          onDragOver={handleFile({ type: 'drag' })}
          onDrop={handleFile({ type: 'drop' })}
          onDragEnter={handleFile({ type: 'drag', inout: true })}
          onDragLeave={handleFile({ type: 'drag', inout: false })}
        >
          Drop file here to download a standard MODUS output format.
        </div>
        : <div
          className="dropzone"
        >
          Please connect to Trellis prior to dropping files.
        </div>
}
      </div>

      <div style={{padding: '10px' }}>
        <hr />
        Please note that no data leaves your browser unless you choose to send the
        output to your own Trellis. Your original and
        converted data never leave your computer.
      </div>
      {/*
      </TabPanel>
        </TabContext>*/}
      <Table />

      <hr />
      <div className="footer">
        <div style={{paddingBottom: '10px'}}>
          <b>Thanks to all our partners who made this work possible:</b>
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', padding: '10px', backgroundColor: 'white', borderRadius: '5px'}}>
          <div className="partnerlogo"><a href="https://oatscenter.org"><img style={{maxHeight: '50px' }} src="logo-oats.png" /></a></div>
          <div className="partnerlogo"><a href="https://farmfoundation.org"><img style={{maxHeight: '50px' }} src="logo-farmfoundation.png" /></a></div>
          <div className="partnerlogo"><a href="https://mixingbowlhub.com/"><img style={{maxHeight: '50px' }} src="logo-mixingbowlhub.png" /></a></div>
          <div className="partnerlogo"><a href="https://aggateway.org"><img style={{maxHeight: '50px' }} src="logo-aggateway.jpg" /></a></div>
          <div className="partnerlogo"><a href="https://semios.com"><img style={{maxHeight: '50px' }} src="logo-semios.png" /></a></div>
        </div>
        <div style={{paddingTop: '10px'}}>
          and all participants in the
            <a href="https://farmfoundation.swoogo.com/soilhealthtech">
               2022 "Fixing the Soil Health Tech Stack" Hackathon.
            </a>
        </div>
        <a href={bigdemo} download="bigdemo.zip" target='_blank'>
          <IconButton
            color="primary"
            aria-label="download">
            <FolderZip />
          </IconButton>
        </a>
      </div>
    </div>
  );
});

