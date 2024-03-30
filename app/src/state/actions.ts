//process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
import md5 from 'md5';
import { action, runInAction } from 'mobx';
import { connect } from '@oada/client';
import { OADAClient, Json } from '@oada/client';
import type { State, Message, TrellisFile } from './state';
import { state } from './state';
import { modusTests } from '@modusjs/industry';
import debug from 'debug';
import { file as modusFile, json as modusJson, tree, assertSlim } from '@modusjs/convert';

const error = debug("@modusjs/app#actions:error");
const warn = debug("@modusjs/app#actions:warn");
const info = debug("@modusjs/app#actions:info");
const Elements = [...new Set(Object.values(modusTests).map(o=>o.Element))];

export const selectLabConfig= action('selectLabConfig', (name: string) => {
  state.labConfig.selected.name = name;
})
export const showLabConfig = action('showLabConfig', () => {
  state.labConfig.show = !state.labConfig.show;
});

export const changeTab = action('changeTab', (_: any, newVal: string) => {
  state.tab = newVal;
});

export const cancelConfig = action('cancelConfig', () => {
  state.labConfig.config = null;
  state.messages = [];
})
export const saveConfig = action('saveConfig', () => {
  const conf = JSON.parse(JSON.stringify(state.labConfig.config));
  const key = `${conf.name}-${conf.type}`;
  state.labConfig.list[key] = conf;
  state.labConfig.config = null;
  message(`Configuration successfully saved as '${conf.name}'`)
})

export const selectLabName = action('selectLabName', (name: string) => {
  state.labConfig.selected.name = name;
  const configname = `${state.labConfig.selected.name} - ${state.labConfig.selected.type}`;
  state.labConfig.config = state.labConfig.list[configname];
})
export const selectLabType = action('selectLabType', (type: string) => {
  state.labConfig.selected.type = type;
  const configname = `${state.labConfig.selected.name} - ${state.labConfig.selected.type}`;
  state.labConfig.config = state.labConfig.list[configname];
})

export const cancelAnalyte = action('cancelAnalyte', () => {
  state.labConfig.analyteEditor;
})
/*
export const saveAnalyte = action('saveAnalyte', () => {
  const {CsvHeader} = state.labConfig?.analyteEditor || '';
  if (state.labConfig.config?.analytes ) {
    state.labConfig.config!.analytes[CsvHeader] = state.labConfig.analyteEditor;
  }
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
  *//*
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
  *//*
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
*/

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

export const trellisInfo = action('trellis', async ({domain, token}: { domain?: string, token?: string}) => {
  if (typeof domain !== 'undefined') state.trellis.domain = domain;
  if (typeof token !== 'undefined') state.trellis.token = token;
});

export const inzone = action('inzone', (inzone: State['inzone']) => {
  state.inzone = inzone;
});

export const headless = action('headless', (headless: State['headless']) => {
  state.headless = headless;
});

// Sam: this should explicitly call out the types of things that go in a table
export const setTable = action('setTable', (key: string, value: any) => {
  // @ts-ignore
  state.table[key] = value;
})

export const fetchTrellisData = action('fetchTrellisData', async () => {
  let files = {};
  let oada = await oadaConnection();
  if (!oada) throw new Error('ERROR: fetchTrellisData: oada was not connected');
  let { data: typesObj } = await oada.get({
    path: `/bookmarks/lab-results/`
  });
  if (typeof typesObj !== 'object' || !typesObj) throw new Error('ERROR: failed to retrieve an object form /bookmarks/lab-results');
  let types = Object.keys(typesObj).filter(key => !key.startsWith('_'))
  for await (const type of types) {
    await new Promise(resolve => setTimeout(resolve, 50));
    let { data: datesObj } = await oada.get({
      path: `/bookmarks/lab-results/${type}/event-date-index/`
    });
    if (typeof datesObj !== 'object' || !datesObj) throw new Error('ERROR: failed to retrieve an object form /bookmarks/lab-results/'+type+'/event-date-index/');
    let dates = Object.keys(datesObj).filter(key => !key.startsWith('_'))
    for await (const date of dates) {
      await new Promise(resolve => setTimeout(resolve, 50));
      let { data: dateObj } = await oada.get({
        path: `/bookmarks/lab-results/${type}/event-date-index/${date}/md5-index`
      })
      if (typeof dateObj !== 'object' || !dateObj) throw new Error('ERROR: failed to retrieve an object form /bookmarks/lab-results/'+type+'/event-date-index/'+date+'/md5-index');
      let keys = Object.keys(dateObj).filter(key => !key.startsWith('_'))
      for await (const key of keys) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const path =`/bookmarks/lab-results/${type}/event-date-index/${date}/md5-index/${key}`;
        try {
          let { data } = await oada.get({ path });
          assertSlim(data);
          runInAction(() => state.files[key] = data);
        } catch(e: any) {
          throw new Error('ERROR: file at path '+path+' either failed to be retrieved or was not a valid Modus slim type.  Error was: '+e.message);
        }
      }
    }
  }
})

let _oada: OADAClient | null = null;
export const oadaConnection = action('oadaConnection', async() => {
  if (_oada) return _oada;
  const { domain, token } = state.trellis;
  _oada = await connect({domain, token});
  runInAction(() => state.trellis.connected = true)
  message(`Connected to your Trellis at ${domain}`);
  return _oada;
})


export const toTrellis = action('toTrellis', async (results: modusJson.ModusJSONConversionResult[]) => {
  try {
    const oada = await oadaConnection();
    for await (const r of results) {
      const data = r.modus;
      let hash = md5(serializeJSON(data));
      let { type, date } = data;
      if (!date) date = 'UNKNOWN';
      let path =
        `/bookmarks/lab-results/${type}/event-date-index/${date}/md5-index/${hash}`;
      if (date && hash) {
        info(`Putting to path: ${path}`);
        await oada.put({path, data: (data as Json), tree});
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
    fetchTrellisData(); // async
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
  const oada = await oadaConnection();
  for await (const key of state.table.selected) {
    let { date, type } = state.files[key];
    const path = `/bookmarks/lab-results/${type}/event-date-index/${date}/md5-index/${key}`;
    message(`Removing modus result ${key} from Trellis.`);
    info(`Putting to path: ${path}`);
    await oada.delete({ path });
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
  let modusResults = state.table.selected.map((key: string) => state.files[key]);
  await modusFile.save({ modus: modusResults, outputtype: 'json', });
  runInAction(() => state.table.selected = [])
  info('File successfully saved');
  message('Conversion result saved.');

})

export const downloadAsCsv = action('downloadAsCsv', async() => {
  let modusResults = state.table.selected.map((key: string) => state.files[key]);
  await modusFile.save({ modus: modusResults, outputtype: 'csv'});
  runInAction(() => state.table.selected = [])
  info('File successfully saved');
  message('Conversion result saved.');
})