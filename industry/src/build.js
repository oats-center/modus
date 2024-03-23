import debug from 'debug';
import * as xlsx from 'xlsx';
import * as fs from 'fs/promises';

const error = debug('@modusjs/industry:error');
const warn = debug('@modusjs/industry:warn');
const info = debug('@modusjs/industry:info');
const trace = debug('@modusjs/industry:trace');

const LAB_EXPORT= `./Lab_Method-Sam's Export View.csv`;
const UNITS_EXPORT= `./Modus_Soil_Test_v2-Sam's Export View.csv`;
const LABCONFIG = './gen/labConfigs.js';
const UNITS = './gen/standardUnits.js';
const TESTS = './gen/modusTests.js';

/*export type StandardUnits = Record<string, string>;
export type Configs = Record<string, any>;*/

function main(rows, mtid_rows) {
  const configs = {};
  const labCounters = {};

  for (const row of rows) {
    /*
    const {
      lab_csv_header,
      Element,
      //'r-Analyte': Element,
      ExtractionMethod,
      MeasurementMethod,
      ValueUnit,
      lab_name,
      Modus_Soil_Test_v1,
      Modus_Soil_Test_v2,
      UCUM_ValueUnit,
    } = row;
    */

    let {
      lab_csv_header,
      'f-Analyte': Element,
      'f-Extraction_Method': ExtractionMethod,
      'f-Measurement_Method': MeasurementMethod,
      'f-Unit_of_Measurement_Default': ValueUnit,
      'f-Unit_of_Measurement_Default': AlternativeValueUnit,
      'f-UCUM_Unit_String_Default': UCUM_ValueUnit,
      'f-UCUM_Unit_String_Alt': AlternativeUCUM_ValueUnit,
      'lu-lab_name r-Lab': lab_name,
      'r-Modus_Soil_Test_v2': Modus_Soil_Test_v2,
      'r-Modus_Soil_Test_v1': Modus_Soil_Test_v1,
    } = row;


    let Lab_Type = row.lab_type ?? 'Soil';

    if (!lab_name || lab_name === '_For Testing') continue;
    Element = Element || lab_csv_header;
    if (!Element) continue;

    configs[lab_name] = configs[lab_name] || {};
    configs[lab_name][Lab_Type] = configs[lab_name][Lab_Type] || {
      name: lab_name,
      type: Lab_Type,
      analytes: {}
    };
    labCounters[lab_name] = labCounters[lab_name] || {};
    //FIXME: this code allows '"Nitrogen, Total"2' to occur;
    labCounters[lab_name][Element] = labCounters[lab_name][Element] ? labCounters[lab_name][Element]+1 : 1;

    // These Elements won't really be usable in a lab config until they have CSV
    // headers, so just index them with incrementing numbers for now in the
    // absence of other identifying information
    const elemName = labCounters[lab_name][Element] === 1 ? Element :
      `${Element}${labCounters[lab_name][Element]}`;
    const name = lab_csv_header || elemName;

    if (name) configs[lab_name][Lab_Type].analytes[name] = {
      Element,
      ValueUnit,
      ExtractionMethod,
      MeasurementMethod,
      UCUM_ValueUnit,
      ModusTestID: Modus_Soil_Test_v1,
      ModusTestIDv2: Modus_Soil_Test_v2,
      CsvHeader: lab_csv_header,
    }
    if (Object.keys(configs[lab_name][Lab_Type].analytes).length < 1) delete configs[lab_name][Lab_Type];
    if (Object.keys(configs[lab_name]).length < 1) delete configs[lab_name];
  }

  // Because we allow override units for lab configs, we cannot rely on that table
  // to contain the mapping of modustestid to proper units.
//  let standardUnits = Object.fromEntries(mtid_rows.map(r =>
//    [r[`﻿modus_test_id`], r.Unit_of_Measurement_Default]
//  ))
  let standardUnits = Object.fromEntries(mtid_rows
    .filter(r => r[`﻿modus_test_id`] !== "not in modus V2")
    .map(r =>
    [r[`﻿modus_test_id`], {
      Element: r.Soil_Item,
      ModusTestIDv2: r.modus_test_id,
      ModusTestID: r.modus_test_id_prev,
      ValueUnit: r.Unit_of_Measurement_Default,
      UCUM_ValueUnit: r.UCUM_ValueUnit,
    }]
  ))

  // Now create an index of modus tests
  let modusTests = {};
  mtid_rows.forEach(r => {
    if (!r.modus_test_id_prev) return;
    modusTests[r.modus_test_id_prev] = {
      Element: r.Soil_Item,
      ModusTestIDv1: r.modus_test_id_prev,
      ModusTestIDv2: r[`﻿modus_test_id`],
      Units: [r.Unit_of_Measurement_Default, r.Unit_of_Measurement_Alt]
    }
  });
  mtid_rows.forEach(r => {
    if (!r[`﻿modus_test_id`]) return;
    modusTests[r[`﻿modus_test_id`]] = {
      Element: r.Soil_Item,
      ModusTestIDv1: r.modus_test_id_prev,
      ModusTestIDv2: r[`﻿modus_test_id`],
      Units: [r.Unit_of_Measurement_Default, r.Unit_of_Measurement_Alt]
    }
  });
  return { standardUnits, configs, modusTests }
}

// Parse the exported csv-----------------------------[ yarn.build ]

async function parseExport(filename) {
  const file = await fs.readFile(filename, 'utf8');
  const wb = xlsx.read(file, { type: 'string'});

  // @ts-ignore
  return xlsx.utils.sheet_to_json(wb.Sheets['Sheet1'], {raw: false});
}

function clean(labConfigs) {
  //Several scenarios of missing data may occur and may need cleaned:
  //-Lab says they run a test, but we don't have an example to know the csv header
  //-lab says they run a test, but we don't know the modus method
  //-units are unknown
  //-lab runs a non-modus test


  //If a lab has no analytes, prune it.
  return Object.fromEntries(Object.entries(labConfigs).filter(([_, obj]) =>
    Object.keys(obj.analytes).length > 0
  ))
}

//async function createOutputs(labConfigs: any, units: StandardUnits) {
async function createOutputs(labConfigs, units, modusTests) {
  const outputs /*: string[] */ = [];

  await fs.mkdir('./gen', { recursive: true });
  await fs.writeFile(LABCONFIG, `export default ${JSON.stringify(labConfigs, null, 2)}`);
  await fs.writeFile(UNITS, `export default ${JSON.stringify(units, null, 2)}`);
  await fs.writeFile(TESTS, `export default ${JSON.stringify(modusTests, null, 2)}`);
  outputs.push(`export { default as labConfigs } from './labConfigs.js'`);
  outputs.push(`export { default as standardUnits } from './standardUnits.js'`);
  outputs.push(`export { default as modusTests } from './modusTests.js'`);
  fs.writeFile('./gen/index.ts', outputs.join(`\n`) )
}

const rows = await parseExport(LAB_EXPORT);
const mtid_rows = await parseExport(UNITS_EXPORT);
let { standardUnits, configs, modusTests } = main(rows,mtid_rows);
//configs = clean(configs);
await createOutputs(configs, standardUnits, modusTests);