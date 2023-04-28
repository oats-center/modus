import { action } from 'mobx';
import { state, State, Message } from './state';
import { modusTests } from '@modusjs/industry';
import debug from 'debug';

const warn = debug("@modusjs/app#actions:warn");
const info = debug("@modusjs/app#actions:info");
const Elements = [...new Set(Object.values(modusTests).map(o=>o.Element))];

export const selectLabConfig= action('selectLabConfig', (evt) => {
  state.labConfig.selected = evt.target.value;
})
export const showLabConfig = action('showLabConfig', () => {
  state.labConfig.show = !state.labConfig.show;
});

export const changeTab = action('changeTab', (_, newVal) => {
  state.tab = newVal;
});

export const cancelConfig = action('cancelConfig', () => {
  delete state.labConfig.config;
  state.messages = [];
})
export const saveConfig = action('saveConfig', () => {
  const conf = JSON.parse(JSON.stringify(state.labConfig.config));
  const key = `${conf.name}-${conf.type}`;
  state.labConfig.list[key] = conf;
  delete state.labConfig.config;
  message(`Configuration successfully saved as '${conf.name}'`)
})

export const selectLabName = action('selectLabName', (evt) => {
  state.labConfig.select.name = evt.target.value;
})
export const selectLabType = action('selectLabType', (evt) => {
  state.labConfig.select.type = evt.target.value;
  const configname = `${state.labConfig.select.name} - ${state.labConfig.select.type}`;
  state.labConfig.config = state.labConfig.list[configname];
  state.labConfig.config.name = state.labConfig.config.name || state.labConfig.select.name;
  state.labConfig.config.type = state.labConfig.config.type|| state.labConfig.select.type;
  state.labConfig.select = {};
})

export const cancelAnalyte = action('cancelAnalyte', () => {
  delete state.labConfig.analyteEditor;
})
export const saveAnalyte = action('saveAnalyte', () => {
  const {CsvHeader} = state.labConfig?.analyteEditor;
  state.labConfig.config.analytes[CsvHeader] = state.labConfig?.analyteEditor;
  state.labConfig.config.units[CsvHeader] = state.labConfig?.analyteEditor?.ValueUnit;
  delete state.labConfig.analyteEditor;
})
export const addNutrientResult= action('addNutrientResult', () => {
  state.labConfig.analyteEditor = {};
  /*
  const Element = Elements[parseInt(Math.random()*Elements.length-1)];
  const ModusTestID = `S-${Element.toUpperCase().replace('-', '').replace('_', '')}-test${Math.round(Math.random()*1000)}`;
  state.labConfig.config.analytes[Element] = {
    Element,
    ModusTestID,
    ValueUnit: 'ppm',
  };
  */
});

export const cancelMapping = action('cancelMapping', () => {
  delete state.labConfig.mappingEditor;
})
export const saveMapping = action('saveMapping', () => {
  const {CsvHeader, modus }= state.labConfig.mappingEditor;
  state.labConfig.config.mappings[CsvHeader] = modus;
  delete state.labConfig.mappingEditor;
})
export const addMapping = action('addMapping', () => {
  state.labConfig.mappingEditor = {};
  /*
  const header = `Header-${Math.round(Math.random()*100)}`;
  state.labConfig.config.mappings[header] = {
    modus: 'ppm',
    header,
  };
  */
});

export const handleLCMappingChange = action('handleLCMappingChange', ({evt, key}) => {
  state.labConfig.mappingEditor = state.labConfig.mappingEditor || {};
  state.labConfig.mappingEditor = { ...state.labConfig.mappingEditor, [key]: evt.target.value}
  console.log(state.labConfig.mappingEditor);
});

export const handleLCAnalyteChange = action('handleLCAnalyteChange', ({key, evt}) => {
  state.labConfig.analyteEditor = state.labConfig.analyteEditor || {};
  state.labConfig.analyteEditor = { ...state.labConfig.analyteEditor, [key]: evt.target.value}
  console.log(state.labConfig.analyteEditor);
});

export const handleLCNameChange = action('handleLCNameChange', (evt) => {
  state.labConfig.config.name = evt.target.value;
});

export const handleLCTypeChange = action('handleLCTypeChange', (evt) => {
  state.labConfig.config.type = evt.target.value;
});

export const message = action('message', (msg: Message | string) => {
  if (typeof msg === 'string') {
    msg = { type: 'good', msg };
  }
  state.messages = [...state.messages, msg];
  if (state.messages.length > 4) popMessage();

  // set a timer to pop the message back off of state
  setTimeout(popMessage, 8000);
});

export const popMessage = action('popMessage', () => {
  info('popping message..');
  state.messages = state.messages.slice(1);
});

export const output = action('output', (output: State['output']) => {
  state.output = output;
});

export const trellis = action('trellis', (cfg: { domain?: string, token?: string}) => {
  if (typeof cfg.domain !== 'undefined') state.trellis.domain = cfg.domain;
  if (typeof cfg.token !== 'undefined') state.trellis.token = cfg.token;
});

export const inzone = action('inzone', (inzone: State['inzone']) => {
  state.inzone = inzone;
});

export const headless = action('headless', (headless: State['headless']) => {
  state.headless = headless;
});
