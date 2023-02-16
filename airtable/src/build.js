import debug from 'debug';
import * as xlsx from 'xlsx';
import * as fs from 'fs/promises';

const error = debug('@modusjs/airtable:error');
const warn = debug('@modusjs/airtable:warn');
const info = debug('@modusjs/airtable:info');
const trace = debug('@modusjs/airtable:trace');

const LABCONFIG = './gen/labConfigs.js';
const UNITS = './gen/standardUnits.js';

/*export type StandardUnits = Record<string, string>;
export type Configs = Record<string, any>;*/

function main(
  //rows: any[]
)/*: {
  standardUnits: StandardUnits,
  configs: Record<string, any>,
}*/ {

  //1. Read in the csv (or should we just use json??)
  //2. Get the rows
  //3. Iterate over rows, and index the data by lab into analytes in one shot
  //4. Construct the analytes portion of the labconfig based on the data

  const configs/* : Record<string, any> */= {};
  /*
  rows = rows.map(row => ({
    ...row,
    Element: row.Modus_Soil_Item || row.lab_Soil_Item,
    ValueUnits: row.Modus_Unit_of_Measurement_Default ||
      row.lab_Unit_of_Measurement_Default,
    ExtractionMethod: row.Modus_Extraction_Method || row.lab_Extraction_Method,
    MeasurementMethod: row.Modus_Measurement_Method || row.lab_Measurement_Method,
    }));
  */

  for (const row of rows) {
    const {
      lab_csv_header,
      Element,
      ExtractionMethod,
      MeasurementMethod,
      ValueUnits,
      lab_name,
      Modus_Soil_Test,
      UCUM_ValueUnits,
    } = row;

    if (!lab_name) continue;

    configs[lab_name] = configs[lab_name] || {analytes: {}};

    const name = lab_csv_header || Element;
    if (name) configs[lab_name].analytes[name] = {
      Element,
      ValueUnit: ValueUnits,
      ExtractionMethod,
      MeasurementMethod,
      UCUM_ValueUnits,
      ModusTestID: Modus_Soil_Test,
      CsvHeader: lab_csv_header,
    }
    if (Object.keys(configs[lab_name].analytes).length < 1) delete configs[lab_name];
  }

  let standardUnits = Object.fromEntries(rows.map(obj => [obj.Element, obj.ValueUnits]))

  return { standardUnits, configs }
}

// Parse the exported csv
async function parseExport() {
  const file = await fs.readFile('./export.csv', 'utf8');
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
async function createOutputs(labConfigs, units) {
  const outputs /*: string[] */ = [];

  await fs.writeFile(LABCONFIG, `export default ${JSON.stringify(labConfigs, null, 2)}`);
  await fs.writeFile(UNITS, `export default ${JSON.stringify(units, null, 2)}`);
  outputs.push(`export * as labConfigs from './labConfigs.js'`);
  outputs.push(`export * as standardUnits from './standardUnits.js'`);
  fs.writeFile('./gen/index.ts', outputs.join(`\n`) )
}

const rows = await parseExport();
let { standardUnits, configs } = main(rows);
//configs = clean(configs);
await createOutputs(configs, standardUnits);