import debug from 'debug';
import chalk from 'chalk';
import pointer from 'json-pointer';
import { deepdiff } from './util.js';
import md5 from 'md5';
import type Slim from '@oada/types/modus/slim/v1/0.js';

// Only import the type here: use the lib passed to you from node or browser in run()
import type * as MainLib from '../index.js';
import json_sample1 from '@modusjs/examples/dist/enyart-east50-a_l_labs/soil/hand_modus_json.js';
//import { all as examples } from '@modusjs/examples/dist';
import fde from 'fast-deep-equal';


const trace = debug('@modusjs/convert#test-tojson:trace');
const info = debug('@modusjs/convert#test-tojson:info');
const error = debug('@modusjs/convert#test-tojson:error');

const { green } = chalk;
const test = (msg: string) => info(green(msg));
let slimA: Slim;

export default async function run(lib: typeof MainLib) {
  //@ts-expect-error
  let result = lib.json.slim.fromModusV1(json_sample1);
  const list = {
    '/id': 'ece3a2a8-4340-48b1-ae1f-d48d1f1e1692',
    '/date': '2021-09-24',
    '/type': 'Soil',
    '/lab/id/value': 'F21267-0039',
    '/lab/id/source': 'F21267-0039',
    '/lab/name': 'A & L Great Lakes Laboratories',
    '/lab/contact/name': 'A & L Great Lakes Laboratories',
    '/lab/contact/phone': '260.483.4759',
    '/lab/contact/address': '3505 Conestoga Dr.\nFort Wayne, IN 46808',
    '/lab/dateReceived': '2021-09-24T00:00:00.000',
    '/lab/dateProcessed': '2021-09-28T00:00:00.000',
    '/lab/report/date': '2021-09-28T00:00:00.000',
    '/lab/report/id': 'F21271-0035',
    /*
    '/lab/files/id': '',
    '/lab/files/base64': '',
    '/lab/files/uri': '',
    '/lab/files/name': '',
    '/lab/clientAccount/name': '',
    */
    '/lab/clientAccount/accountNumber': '30039',
    '/lab/clientAccount/company': 'THE ANDERSONS FARM CTR - GPS',
    '/lab/clientAccount/city': 'N MANCHESTER',
    '/lab/clientAccount/state': 'IN',
    '/source/report/id': 'ece3a2a8-4340-48b1-ae1f-d48d1f1e1692',
    '/source/grower/name': 'CARL AULT',
    '/source/farm/name': 'ENYART EAST 50',
    '/source/field/name': '50.1 AC',
  }
  let checks = Object.entries(list).map(([pt, val]) => ([
    pt,
    pointer.get(result, pt) === val
  ]));
  if (!Object.values(checks).every(v => v))
    throw new Error('Item missing after converting from V1 to Slim');
  const samples = !Object.entries(result.samples || {}).map(([skey, sample]) => ([
    skey,
    !Object.values(sample.results || {}).every((result) => {
        if (!result.modusTestID) return false;
        if (!result.value) return false;
        if (!result.analyte) return false;
        if (!result.units) return false;
        return true;
    })
  ]));
  if (samples) throw new Error('Slim conversion error on a sample');
  test('Convert MODUS v1 to slim');

  const flat = lib.json.slim.flatten(slimA as Slim);
  let sample = Object.values(flat?.samples || {})[0];
  if (!sample?.source) throw new Error('Content not flattened down into samples');
  if (!sample?.lab) throw new Error('Content not flattened down into samples');
  if (!sample?.geolocation) throw new Error('Content not flattened down into samples');
  if (!sample?.depth) throw new Error('Content not flattened down into samples');
  test('Flatten slim successful');

  const unflat = lib.json.slim.unflatten(flat);
  if (!unflat?.source) throw new Error('Content not unflattened down into samples');
  let samp = Object.values(unflat?.samples || {})[0];
  if (!unflat?.source) throw new Error('Content not unflattened down into samples');
  if (samp?.source?.farm) throw new Error('Content not unflattened down into samples');
  if (samp?.lab?.name) throw new Error('Content not unflattened down into samples');
  const differences = deepdiff(slimA, unflat);
  if (differences.length > 0) {
    info(
      'toJson for a json file failed.  result is different than original.  Differences are:',
      differences
    );
    throw new Error('Flatten -> unflatten did not return original slim');
  }
  test('Unflatten slim successful');
  test('slim tests completed');
}

slimA = {
  _type: 'application/vnd.modus.slim.v1.0+json',

  id: 'ece3a2a8-4340-48b1-ae1f-d48d1f1e1692',
  date: '2021-09-24',
  name: "Samples taken last sunday",

  type: 'soil',

  lab: {
    id: { source: 'local', value: '1' },
    name: 'A & L Great Lakes Laboratories',
    contact: {
      name: 'A & L Great Lakes Laboratories',
      phone: '260.483.4759',
      address: '3505 Conestoga Dr.\nFort Wayne, IN 46808',
    },
    dateReceived: '2021-09-24T00:00:00.000',
    dateProcessed: '2021-09-28T00:00:00.000',
    clientAccount: {
      accountNumber: '30039',
      company: 'THE ANDERSONS FARM CTR - GPS',
      city: 'N MANCHESTER',
      state: 'IN',
    },
    report: {
      id: 'F21271-0035',
      date: '2021-09-25',
    },

  },

  source: {
    report: {
      id: "02iojfkeldjsldfssdf",
    },
    grower: { id: 'dfj20foekdlf', name: 'CARL AULT' },
    farm: { id: 'kdjf02ijfoeklew', name: 'ENYART' },
    field: { id: 'idkjf20fijoed', name: 'EAST50' },
    // Can also have subfield
  },

  samples: {
    "0djfi2iekldsfj02i": {
      lab: { sampleid: '28_051' },
      source: { sampleid: 'ABC-1' },
      depth: {
        id: '02ijflkj2ef',
        name: 'Hmmm...', // here only for backwards compatibility
        top: 0,
        bottom: 8,
        units: 'in'
      },
      geolocation: {
        id: 'kd02jkfldf',
        lat: 12.342342,
        lon: -93.4889343,
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [ 12.342342, -93.4889343 ] } },
      },
      results: {
        // The "analyte" should be the part of the Modus 2.0 test ID that is between
        // the third and fourth underscores: L_MODV2_SOIL_B_016 -> analyte: 'B'
        'kfj290ji': { analyte: 'PH', value: 7, units: 'none', modusTestID: 'S-PH-1:1.02.07', },
        '2fj290ji': { analyte: 'OM', value: 2.4, units: '%', modusTestID: 'S-SOM-LOI.15', },
        '3fj290ji': { analyte: 'P', value: 34, units: 'ppm', modusTestID: 'S-P-B1-1:10.01.03', },
        '4fj290ji': { analyte: 'K', value: 161, units: 'ppm', modusTestID: 'S-K-NH4AC.05', },
        '5fj290ji': { analyte: 'CA', value: 1150, units: 'ppm', modusTestID: 'S-CA-NH4AC.05', },
        '6fj290ji': { analyte: 'Mg', value: 240, units: 'ppm', modusTestID: 'S-MG-NH4AC.05', },
        '7fj290ji': { analyte: 'CEC', value: 8.2, units: 'meq/100g', modusTestID: 'S-CEC.19', },
        '8fj290ji': { analyte: 'CABS', value: 70.4, units: '%', modusTestID: 'S-BS-CA.19', },
        '9fj290ji': { analyte: 'MGBS', value: 24.5, units: '%', modusTestID: 'S-BS-MG.19', },
        '0fj290ji': { analyte: 'KBS', value: 5.1, units: '%', modusTestID: 'S-BS-K.19', },
        '11j290ji': { analyte: 'SO4S', value: 7, units: 'ppm', modusTestID: 'S-S-NH4AC.05', },
        '12j290ji': { analyte: 'ZN', value: 3.3, units: 'ppm', modusTestID: 'S-ZN-HCL.05', },
        '13j290ji': { analyte: 'MN', value: 46, units: 'ppm', modusTestID: 'S-MN-HCL.05', },
        '14j290ji': { analyte: 'B', value: 0.7, units: 'ppm', modusTestID: 'S-B-M3.04', },
      },
    },
    "0djfi2iekldsfj02j": {
      lab: { sampleid: '28_052' },
      source: { sampleid: 'ABC-2' },
      depth: {
        id: '02ijflkj2ef',
        name: 'Hmmm...', // here only for backwards compatibility
        top: 0,
        bottom: 8,
        units: 'in'
      },
      geolocation: {
        id: 'kd02jkfldf',
        lat: 13.342342,
        lon: -94.4889343,
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [ 13.342342, -94.4889343 ] } },
      },
      results: {
        // The "analyte" should be the part of the Modus 2.0 test ID that is between
        // the third and fourth underscores: L_MODV2_SOIL_B_016 -> analyte: 'B'
        'kfj290ji': { analyte: 'PH', value: 7, units: 'none', modusTestID: 'S-PH-1:1.02.07', },
        '2fj290ji': { analyte: 'OM', value: 2.4, units: '%', modusTestID: 'S-SOM-LOI.15', },
        '3fj290ji': { analyte: 'P', value: 34, units: 'ppm', modusTestID: 'S-P-B1-1:10.01.03', },
        '4fj290ji': { analyte: 'K', value: 161, units: 'ppm', modusTestID: 'S-K-NH4AC.05', },
        '5fj290ji': { analyte: 'CA', value: 1150, units: 'ppm', modusTestID: 'S-CA-NH4AC.05', },
        '6fj290ji': { analyte: 'Mg', value: 240, units: 'ppm', modusTestID: 'S-MG-NH4AC.05', },
        '7fj290ji': { analyte: 'CEC', value: 8.2, units: 'meq/100g', modusTestID: 'S-CEC.19', },
        '8fj290ji': { analyte: 'CABS', value: 70.4, units: '%', modusTestID: 'S-BS-CA.19', },
        '9fj290ji': { analyte: 'MGBS', value: 24.5, units: '%', modusTestID: 'S-BS-MG.19', },
        '0fj290ji': { analyte: 'KBS', value: 5.1, units: '%', modusTestID: 'S-BS-K.19', },
        '11j290ji': { analyte: 'SO4S', value: 7, units: 'ppm', modusTestID: 'S-S-NH4AC.05', },
        '12j290ji': { analyte: 'ZN', value: 3.3, units: 'ppm', modusTestID: 'S-ZN-HCL.05', },
        '13j290ji': { analyte: 'MN', value: 46, units: 'ppm', modusTestID: 'S-MN-HCL.05', },
        '14j290ji': { analyte: 'B', value: 0.7, units: 'ppm', modusTestID: 'S-B-M3.04', },
      },
    },

  },
};

let slimB = {
  _type: 'application/vnd.modus.slim.v1.0+json',

  id: 'ece3a2a8-4340-48b1-ae1f-d48d1f1e1692',
  date: '2021-09-24',
  name: "Samples taken last sunday",

  type: 'soil',

  lab: {
    id: { source: 'local', value: '1' },
    name: 'A & L Great Lakes Laboratories',
    contact: {
      name: 'A & L Great Lakes Laboratories',
      phone: '260.483.4759',
      address: '3505 Conestoga Dr.\nFort Wayne, IN 46808',
    },
    dateReceived: '2021-09-24T00:00:00.000',
    dateProcessed: '2021-09-28T00:00:00.000',
    clientAccount: {
      accountNumber: '30039',
      company: 'THE ANDERSONS FARM CTR - GPS',
      city: 'N MANCHESTER',
      state: 'IN',
    },
    report: {
      id: 'F21271-0035',
      date: '2021-09-25',
    },

  },

  source: {
    report: {
      id: "02iojfkeldjsldfssdf",
    },
    grower: { id: 'dfj20foekdlf', name: 'CARL AULT' },
    farm: { id: 'kdjf02ijfoeklew', name: 'ENYART' },
    field: { id: 'idkjf20fijoed', name: 'EAST50' },
    // Can also have subfield
  },

  samples: {
    "0djfi2iekldsfj02i": { // this key is only required to be "sufficiently random within this document
      lab: { sampleid: '28_051' },
      source: { sampleid: 'ABC-1' },
      depth: {
        id: '02ijflkj2ef',
        name: 'Hmmm...', // here only for backwards compatibility
        top: 0,
        bottom: 8,
        units: 'in'
      },
      geolocation: {
        id: 'kd02jkfldf',
        lat: 12.342342,
        lon: -93.4889343,
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [ 12.342342, -93.4889343 ] } },
      },
      results: {
        // The "analyte" should be the part of the Modus 2.0 test ID that is between
        // the third and fourth underscores: L_MODV2_SOIL_B_016 -> analyte: 'B'
        'kfj290ji': { analyte: 'PH', value: 7, units: 'none', modusTestID: 'S-PH-1:1.02.07', },
        '2fj290ji': { analyte: 'OM', value: 2.4, units: '%', modusTestID: 'S-SOM-LOI.15', },
        '3fj290ji': { analyte: 'P', value: 34, units: 'ppm', modusTestID: 'S-P-B1-1:10.01.03', },
        '4fj290ji': { analyte: 'K', value: 161, units: 'ppm', modusTestID: 'S-K-NH4AC.05', },
        '5fj290ji': { analyte: 'CA', value: 1150, units: 'ppm', modusTestID: 'S-CA-NH4AC.05', },
        '6fj290ji': { analyte: 'Mg', value: 240, units: 'ppm', modusTestID: 'S-MG-NH4AC.05', },
        '7fj290ji': { analyte: 'CEC', value: 8.2, units: 'meq/100g', modusTestID: 'S-CEC.19', },
        '8fj290ji': { analyte: 'CABS', value: 70.4, units: '%', modusTestID: 'S-BS-CA.19', },
        '9fj290ji': { analyte: 'MGBS', value: 24.5, units: '%', modusTestID: 'S-BS-MG.19', },
        '0fj290ji': { analyte: 'KBS', value: 5.1, units: '%', modusTestID: 'S-BS-K.19', },
        '11j290ji': { analyte: 'SO4S', value: 7, units: 'ppm', modusTestID: 'S-S-NH4AC.05', },
        '12j290ji': { analyte: 'ZN', value: 3.3, units: 'ppm', modusTestID: 'S-ZN-HCL.05', },
        '13j290ji': { analyte: 'MN', value: 46, units: 'ppm', modusTestID: 'S-MN-HCL.05', },
        '14j290ji': { analyte: 'B', value: 0.7, units: 'ppm', modusTestID: 'S-B-M3.04', },
      },
    },
    "0djfi2iekldsfj02j": { // this key is only required to be "sufficiently random within this document
      lab: { sampleid: '28_052' },
      source: { sampleid: 'ABC-2' },
      depth: {
        id: '02ijflkj2ef',
        name: 'Hmmm...', // here only for backwards compatibility
        top: 0,
        bottom: 8,
        units: 'in'
      },
      geolocation: {
        id: 'kd02jkfldf',
        lat: 13.342342,
        lon: -94.4889343,
        geojson: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [ 13.342342, -94.4889343 ] } },
      },
      results: {
        // The "analyte" should be the part of the Modus 2.0 test ID that is between
        // the third and fourth underscores: L_MODV2_SOIL_B_016 -> analyte: 'B'
        'kfj290ji': { analyte: 'PH', value: 7, units: 'none', modusTestID: 'S-PH-1:1.02.07', },
        '2fj290ji': { analyte: 'OM', value: 2.4, units: '%', modusTestID: 'S-SOM-LOI.15', },
        '3fj290ji': { analyte: 'P', value: 34, units: 'ppm', modusTestID: 'S-P-B1-1:10.01.03', },
        '4fj290ji': { analyte: 'K', value: 161, units: 'ppm', modusTestID: 'S-K-NH4AC.05', },
        '5fj290ji': { analyte: 'CA', value: 1150, units: 'ppm', modusTestID: 'S-CA-NH4AC.05', },
        '6fj290ji': { analyte: 'Mg', value: 240, units: 'ppm', modusTestID: 'S-MG-NH4AC.05', },
        '7fj290ji': { analyte: 'CEC', value: 8.2, units: 'meq/100g', modusTestID: 'S-CEC.19', },
        '8fj290ji': { analyte: 'CABS', value: 70.4, units: '%', modusTestID: 'S-BS-CA.19', },
        '9fj290ji': { analyte: 'MGBS', value: 24.5, units: '%', modusTestID: 'S-BS-MG.19', },
        '0fj290ji': { analyte: 'KBS', value: 5.1, units: '%', modusTestID: 'S-BS-K.19', },
        '11j290ji': { analyte: 'SO4S', value: 7, units: 'ppm', modusTestID: 'S-S-NH4AC.05', },
        '12j290ji': { analyte: 'ZN', value: 3.3, units: 'ppm', modusTestID: 'S-ZN-HCL.05', },
        '13j290ji': { analyte: 'MN', value: 46, units: 'ppm', modusTestID: 'S-MN-HCL.05', },
        '14j290ji': { analyte: 'B', value: 0.7, units: 'ppm', modusTestID: 'S-B-M3.04', },
      },
    },

  },
};
