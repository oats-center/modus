//process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
import axios from 'axios';
import md5 from 'md5';
import { action, runInAction } from 'mobx';
import { connect } from '@oada/client';
import { OADAClient } from '@oada/client';
import { state, State, Message } from './state';
import { modusTests } from '@modusjs/industry';
import debug from 'debug';
import type { ModusResult } from '@modusjs/convert';
import tree from '../trellisTree';
import { file as convertFile } from '@modusjs/convert/dist-browser/bundle.mjs';

let CONN: OADAClient | undefined;

const error = debug("@modusjs/app#actions:error");
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

export const trellis = action('trellis', async (cfg: { domain?: string, token?: string}) => {
  if (typeof cfg.domain !== 'undefined') state.trellis.domain = cfg.domain;
  if (typeof cfg.token !== 'undefined') state.trellis.token = cfg.token;
});

export const inzone = action('inzone', (inzone: State['inzone']) => {
  state.inzone = inzone;
});

export const headless = action('headless', (headless: State['headless']) => {
  state.headless = headless;
});

export const setTable = action('setTable', (key: string, value: any) => {
  state.table[key] = value;
})

export const fetchTrellisData = action('fetchTrellisData', async () => {
  let files = {};
  let { data: typesObj } = await CONN.get({
    path: `/bookmarks/lab-results/`
  });
  let types = Object.keys(typesObj).filter(key => !key.startsWith('_'))
  for await (const type of types) {
    await new Promise(resolve => setTimeout(resolve, 50));
    let { data: datesObj } = await CONN.get({
      path: `/bookmarks/lab-results/${type}/event-date-index/`
    });
    let dates = Object.keys(datesObj).filter(key => !key.startsWith('_'))
    for await (const date of dates) {
      await new Promise(resolve => setTimeout(resolve, 50));
      let { data: dateObj } = await CONN.get({
        path: `/bookmarks/lab-results/${type}/event-date-index/${date}/md5-index`
      })
      let keys = Object.keys(dateObj).filter(key => !key.startsWith('_'))
      for await (const key of keys) {
        await new Promise(resolve => setTimeout(resolve, 50));
        let { data } = await CONN.get({
          path: `/bookmarks/lab-results/${type}/event-date-index/${date}/md5-index/${key}`
        })
        runInAction(() => {
          state.files[key] = data;
        })
      }
    }
  }
})

export const trellisConnect = action('trellisConnect', async () => {
  const { domain, token } = state.trellis;
  const conn = await connect({domain, token});
  setConnection(conn);
  runInAction(() => state.trellis.conn = true)
  message(`Connected to your Trellis at ${domain}`);
  fetchTrellisData();
})

function setConnection(conn: OADAClient) {
  CONN = conn;
}

export const toTrellis = action('putDoc', async (results: ModusResult[]) => {
  try {
    const oada = state.trellis.conn;
    for await (const {modus: data} of results) {
      let hash = md5(serializeJSON(data));
      let { type, date } = data;
      let path =
        `/bookmarks/lab-results/${type}/event-date-index/${date}/md5-index/${hash}`;
      if (date && hash) {
        info(`Putting to path: ${path}`);
        console.log(`Putting to path: ${path}`);
        /*
        await CONN.put({
          path,
          data,
          //FIXME: this needs to be a tree PUT
          //tree,
        })
        */
        await axios({
          method: 'put',
          url: `https://localhost${path}`,
          data,
          headers: {
            Authorization: `Bearer ${state.trellis.token}`,
            'Content-Type': 'application/json',
          },
        })
        runInAction(() => {
          state.files[hash] = data;
        })

        info('waiting');
        console.log('waiting')
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
    message(`Successfully saved ${results.length} result${results.length === 1 ? '' : 's'} to your Trellis.`);
    info('Successfully wrote results to trellis');
    runInAction(fetchTrellisData());
  } catch(err) {
    console.error(`toTrellis Errored: ${err}`);
    error(`toTrellis Errored: ${err}`);
  }
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

export const deleteSelected = action('deleteSelected', async() => {
  for await (const key of state.table.selected) {
    let { date, type } = state.files[key];
    const path = `/bookmarks/lab-results/${type}/event-date-index/${date}/md5-index/${key}`;
    message(`Removing modus result ${key} from Trellis.`);
    info(`Putting to path: ${path}`);
    await CONN.delete({ path });
    await new Promise(resolve => setTimeout(resolve, 250));
    runInAction(() => {
    state.files = Object.fromEntries(
      Object.entries(state.files).filter(([k, file]) => key !== k)
    )
    state.table.selected = state.table.selected.filter((k:any) => key !== k);
    })

  }
  //fetchTrellisData();
})

export const downloadAsSlim = action('downloadAsSlim', async() => {
  let modusResults = state.table.selected
    .map((key: string) => ({
      modus: state.files[key],
    }))
  await convertFile.save({ modus: modusResults, outputtype: 'json', });
  runInAction(() => state.table.selected = [])
  info('File successfully saved');
  message('Conversion result saved.');

})

export const downloadAsCsv = action('downloadAsCsv', async() => {
  let modusResults = state.table.selected
    .map((key: string) => ({ modus: state.files[key] }))
  await convertFile.save({ modus: modusResults, outputtype: 'csv'});
  runInAction(() => state.table.selected = [])
  info('File successfully saved');
  message('Conversion result saved.');
})