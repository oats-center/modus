//process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
import { useContext, DragEventHandler } from 'react';
import { Button, Card, FormControl, Grid, IconButton, InputLabel, MenuItem, Paper, Select, TextField, Typography } from '@mui/material';
import { Check as CheckIcon, Delete as DeleteIcon } from '@mui/icons-material';
import debug from 'debug';
import './LabConfig.css';
import { observer } from 'mobx-react-lite';
import { context } from './state';
// @ts-ignore
import { file as convertFile, csv } from '@modusjs/convert/dist-browser/bundle.mjs';
import { modusTests } from '@modusjs/industry';
import Messages from './Messages';

const trace = debug('@modusjs/app#App:trace');
const info = debug('@modusjs/app#App:info');
const error = debug('@modusjs/app#App:error');
const warn = debug('@modusjs/app#App:warn');

const Elements = [...new Set(Object.values(modusTests).map(v => v.Element))];

export default observer(function LabConfig() {
  const { state, actions } = useContext(context);


  /*
  return (
    <div className="LabConfig">
      <Typography variant="h5" onClick={()=>actions.showLabConfig()}>Lab Configurations</Typography>
      {state.labConfig.show ? <LabConfContent /> : undefined }
    </div>
  )
  */
   return (
    <div className="LabConfig">
      <Messages />
      {state.labConfig?.config ? null : <AutoConfigDrop /> }
      {state.labConfig?.config ? <LabConfContent /> : null }
    </div>
  )
});

const AutoConfigDrop = observer(function AutoConfigDrop() {
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
            return await convertFile.fromFileBrowserPre({ file: f}, Object.values(state.labConfig.list));
          } catch(e: any) {
            info('Failed to convert file: ', f.name, '.  Error was: ', e);
            return [];
          }
        }));
        //actions.message('Converting...');
        const labconfig_results = all_file_results.reduce((acc, arr) => [ ...acc, ...arr], []);
        //actions.message(`Successfully converted ${labconfig_results.length} result${labconfig_results.length === 1 ? '' : 's'} to Modus`);

        info('results: ', labconfig_results);
        state.labConfig.output = labconfig_results[0];
        state.labConfig.output.datasheet = state.labConfig.output.datasheets[0];
        state.labConfig.config = labconfig_results[0].labConfig;
        console.log(labconfig_results[0]);
        actions.message(`Lab configuration detected: '${state.labConfig?.output?.labConfig?.name}'`);
        break;
      }
    };

  return (
    <div>
      Autodetect a CSV/XLSX file or edit an existing configuration
      <div className="dropzone-container">
        <div
          className="dropzone"
          onDragOver={handleFile({ type: 'drag' })}
          onDrop={handleFile({ type: 'drop' })}
          onDragEnter={handleFile({ type: 'drag', inout: true })}
          onDragLeave={handleFile({ type: 'drag', inout: false })}
        >
          Drop a file here and configure it for MODUS format conversion.
        </div>
      </div>

      <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
        <InputLabel id="labconfig-select-label">Lab Name</InputLabel>
        <Select
          value={state.labConfig?.select.name || ''}
          onChange={actions.selectLabName}
          label="Lab Name"
          >
          {[...new Set(Object.keys(state.labConfig.list)
            .map(key => {
              const end = key.split(' - ')[key.split(' - ').length -1]
              return key.replace(new RegExp(' - '+ end + '$'), '')
            })
          )]
          .map(key =>
            <MenuItem key={`${key}-name-select-item`} value={key}>{key}</MenuItem>
          )}
        </ Select>
      </ FormControl>
      <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} disabled={!state.labConfig?.select?.name}>
        <InputLabel id="labtype-select-bel">Lab Sample Type</InputLabel>
        <Select
          labelId='labconfig-type-select-label'
          id='labconfig-type-select'
          value={state.labConfig?.select?.type || ''}
          onChange={actions.selectLabType}>
          {Object.keys(state.labConfig.list)
          .filter(key => key.startsWith(state.labConfig?.select?.name))
          .map(key => key.split(' - ')[key.split(' - ').length -1])
          .map(key =>
            <MenuItem key={`${key}-type-select-item`} value={key}>{key}</MenuItem>
          )}
        </ Select>
      </ FormControl>
    </ div>
  )
});


const LabConfContent = observer(function LabConfContent() {
  const { state, actions } = useContext(context);
//  const isError = Object.keys(state.labConfig.list).includes(`${state.labConfig?.config?.name} - ${state.labConfig?.config?.type}`)

  return (
    <div className="LabConfigContent">
      <TextField
        value={state.labConfig?.config?.name || ''}
        onChange={actions.handleLCNameChange}
        label="Lab Name"
      />
      <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
        <InputLabel id="labtype-select-bel">Lab Sample Type</InputLabel>
        <Select
          labelId='labconfig-type-select-label'
          id='labconfig-type-select'
          value={state.labConfig?.config?.type || ''}
          onChange={actions.handleLCTypeChange}>
          <MenuItem value={''}></MenuItem>
          <MenuItem value={'Soil'}>Soil</MenuItem>
          <MenuItem value={'Plant'}>Plant</MenuItem>
          <MenuItem value={'Nematode'}>Nematode</MenuItem>
          <MenuItem value={'Water'}>Water</MenuItem>
        </ Select>
      </ FormControl>
      <Typography sx={{margin: '10px'}} variant="h6">Measured Results</Typography>
      <Grid container spacing={2}>
        {Object.values(state.labConfig.config.analytes || {})
          .sort(({CsvHeader: a},  {CsvHeader: b}) => (a > b ? 1 : (b > a ? -1 : 0)))
          .map((nr) =>
          <Card
          className="gridcard"
          key={`${nr.ModusTestID || nr.Element}-${nr.ValueUnit}`}
          raised
          sx={{padding: '5px', margin: '5px'}}
          >
            <div>Column Header: {nr.CsvHeader}</div>
            <div>Analyte Name: {nr.Element}</div>
            <div>Modus Test ID: {nr.ModusTestID || ''}</div>
            <div>Units: {nr.ValueUnit}</div>
          </ Card>
        )}
        {state.labConfig?.analyteEditor ? <AnalyteEditor /> : null}
         </Grid>
      {state.labConfig?.analyteEditor ? null : <Button onClick={actions.addNutrientResult}>
        + Add
      </Button>}

      <Typography sx={{margin: '10px'}} variant="h6">Additional Metadata Attributes</Typography>
      <Grid container spacing={2}>
        {Object.entries(state.labConfig.config.mappings || {})
          .filter(([header, value]) => value)
          .sort(([ha, va], [hb, vb]) => (ha > hb ? 1 : (hb > ha ? -1 : 0)))
          .map(([header, value]) =>
          <Card
          className="gridcard"
          key={`${header}-metadata-card`}
          sx={{padding: '5px', margin: '5px'}}
          raised
          >
            <div>Column Header: {header}</div>
            <div>Modus Attribute: {value}</div>
          </Card>
        )}
        {state.labConfig?.mappingEditor ? <MappingEditor /> : null}
      </Grid>
      {state.labConfig?.mappingEditor ? null : <Button onClick={actions.addMapping}>
        + Add
      </Button>}
      <IconButton onClick={actions.saveConfig}>
        <CheckIcon />
      </IconButton>
      <IconButton onClick={actions.cancelConfig}>
        <DeleteIcon />
      </IconButton>
    </div>
  )
});

const AnalyteEditor = observer(function AnalyteEditor() {
  const { state, actions } = useContext(context);
  const analyteEditor = state.labConfig?.analyteEditor;
  const datasheet = state.labConfig?.output?.datasheet;

  return (
    <Card
      className="gridcard"
      key={`${analyteEditor?.ModusTestID || analyteEditor?.Element}-${analyteEditor?.ValueUnit}`}
      raised
      sx={{padding: '5px', margin: '5px'}}
      >
      <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
        <InputLabel id="analyteeditor-select-label">Column Header</InputLabel>
      <Select
        label='Column Header'
        labelId='analyteeditor-header-select'
        id='analyteeditor-header-select'
        value={analyteEditor?.CsvHeader || ''}
        onChange={(evt) => actions.handleLCAnalyteChange({evt, key: 'CsvHeader'})}>
        {datasheet?.colnames || Object.keys(state.labConfig?.config?.mappings)
        .filter((colname) => !state.labConfig?.config?.analytes[colname] && !state.labConfig?.config?.mappings[colname])
        .map((colname) =>
          <MenuItem value={colname}>{colname}</MenuItem>
        )}
      </ Select>
      </FormControl>
      <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} disabled={!analyteEditor?.CsvHeader} >
        <InputLabel id="analyteeditor-select-label">Analyte Name</InputLabel>
      <Select
        label='Element Name'
        labelId='analyteeditor-element-select'
        id='analyteeditor-element-select'
        value={analyteEditor?.Element || ''}
        onChange={(evt) => actions.handleLCAnalyteChange({evt, key: 'Element'})}>
        {Elements.map((Element) =>
          <MenuItem value={Element}>{Element}</MenuItem>
        )}
      </ Select>
      </FormControl>
      <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} disabled={!analyteEditor?.Element}>
        <InputLabel id="analyteeditor-select-label">Modus Test ID</InputLabel>
      <Select
        labelId='analyteeditor-modusid-select'
        label='Modus Test ID'
        id='analyteeditor-modusid-select'
        value={analyteEditor?.ModusTestID || ''}
        onChange={(evt) => actions.handleLCAnalyteChange({evt, key: 'ModusTestID'})}>
        {Object.entries(modusTests)
          .filter(([_, v]) => v.Element === state.labConfig?.analyteEditor?.Element)
          .map(([ModusTestID, val]) =>
            <MenuItem value={ModusTestID}>{ModusTestID}</MenuItem>
          )
        }
      </ Select>
      </FormControl>
      <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }} disabled={!analyteEditor?.ModusTestID}>
        <InputLabel id="analyteeditor-select-label">Unit of Measure</InputLabel>
      <Select
        lab="Unit of Measure"
        labelId='analyteeditor-units-select'
        id='analyteeditor-units-select'
        value={analyteEditor?.ValueUnit || ''}
        onChange={(evt) => actions.handleLCAnalyteChange({evt, key: 'ValueUnit'})}>
        {(modusTests[analyteEditor?.ModusTestID]?.Units || [])
          .map(ValueUnit => <MenuItem value={ValueUnit}>{ValueUnit}</MenuItem>)
        }
      </ Select>
      </FormControl>
      <IconButton onClick={actions.saveAnalyte}>
        <CheckIcon />
      </IconButton>
      <IconButton onClick={actions.cancelAnalyte}>
        <DeleteIcon />
      </IconButton>
    </ Card>

  );
});

const MappingEditor = observer(function MappingEditor() {
  const { state, actions } = useContext(context);
  const mappingEditor = state.labConfig?.mappingEditor;

  return (
    <Card
      className="gridcard"
      key={`${mappingEditor?.CsvHeader || mappingEditor?.Element}-${mappingEditor}`}
      raised
      sx={{padding: '5px', margin: '5px'}}
      >
      <Select
        labelId='analyteeditor-header-select'
        id='analyteeditor-header-select'
        value={state.labConfig?.mappingEditor?.CsvHeader || ''}
        onChange={(evt) => actions.handleLCMappingChange({evt, key: 'CsvHeader'})}>
        <MenuItem value={''}></MenuItem>
        {state.labConfig?.output?.datasheet?.colnames.map((colname) =>
          <MenuItem value={colname}>{colname}</MenuItem>
        )}
      </ Select>
      <Select
        labelId='analyteeditor-element-select'
        id='analyteeditor-element-select'
        value={mappingEditor?.CsvHeader || ''}
        onChange={(evt) => actions.handleLCMappingChange({evt, key: 'modus'})}>
        <MenuItem value={''}></MenuItem>
        {Object.keys(csv.labs.toModusJsonPath).map((key) =>
          <MenuItem value={key}>{key}</MenuItem>
        )}
      </ Select>
      <IconButton onClick={actions.saveMapping}>
        <CheckIcon />
      </IconButton>
      <IconButton onClick={actions.cancelMapping}>
        <DeleteIcon />
      </IconButton>
    </ Card>

  );
});
