import debug from 'debug';
import * as xlsx from 'xlsx';
import oerror from '@overleaf/o-error';
import { getJsDateFromExcel } from 'excel-date-to-js';
import dayjs from 'dayjs';
import type { NutrientResult, Units } from '@modusjs/units';
import type { InputFile, SupportedFileType } from './json.js';
import { jsonFilenameFromOriginalFilename, supportedFileTypes, typeFromFilename, zipParse } from './json.js';
import * as units from '@modusjs/units';
import jp from 'json-pointer';
import { parseDate } from './labs/index.js';
import Slim, { assert as assertSlim, Lab } from '@oada/types/modus/slim/v1/0.js';
import type { LabConfig, LabType } from './labs/index.js';
import md5 from 'md5';
import { autodetectLabConfig, cobbleLabConfig, labConfigsMap, modusKeyToValue, modusKeyToHeader, setMappings } from './labs/index.js';
import { flatten } from './slim.js';
import { Analyte } from './labs/labConfigs.js';
const error = debug('@modusjs/convert#csv:error');
const warn = debug('@modusjs/convert#csv:error');
const info = debug('@modusjs/convert#csv:info');
const trace = debug('@modusjs/convert#csv:trace');

const BASEPAT = /^Base Saturation - /;
export * as labs from './labs/index.js';
export const supportedFormats = ['generic'];
export type SupportedFormats = 'generic';

// Take a string, array buffer, base64, or workbook and return a xlsx Workbook item
export function parseWorkbook({
  wb,
  str,
  arrbuf,
  base64,
}: {
  wb?: xlsx.WorkBook;
  str?: string;
  arrbuf?: ArrayBuffer;
  base64?: string; // base64 string
}): xlsx.WorkBook {
  // Make sure we have an actual workbook to work with:
  if (!wb) {
    try {
      //if (str) wb = xlsx.read(str, { type: 'string'});
      if (str) wb = xlsx.read(str, { type: 'string', cellDates: true });
      if (arrbuf) wb = xlsx.read(arrbuf, { type: 'array', cellDates: true });
      if (base64) wb = xlsx.read(base64, { type: 'base64', cellDates: true });
    } catch (e: any) {
      throw oerror.tag(e, 'Failed to parse input data with xlsx/csv reader');
    }
  }
  if (!wb) {
    throw new Error('No readable input data found.');
  }
  return wb;
}

// parseCsv: Combine parseWorkbook and convert to run the whole flow start to finish
// Possible input parameters for xlsx/csv parsing:
// Either give an already-parsed workbook, an entire CSV as a string, or an arraybuffer, or a base64 string
// Default CSV/XLSX format is generic
export function parseCsv({
  wb,
  str,
  arrbuf,
  base64,
  format,
  lab,
  labConfigs,
  filename,
  allowOverrides= true,
}: {
  wb?: xlsx.WorkBook;
  str?: string;
  arrbuf?: ArrayBuffer;
  base64?: string; // base64 string
  format?: 'generic'; // add others here as more become known
  lab?: LabConfig | keyof typeof labConfigsMap.keys;
  labConfigs?: LabConfig[]; //The set of lab configurations to choose from; defaults to @modusjs/industry, but this allows us to pass in a locally-modified set from the app
  filename?: string;
  allowOverrides?: boolean;
}): Slim[] {
  return convert({
    ...prep({
      wb,
      str,
      arrbuf,
      base64,
      format,
      lab,
      labConfigs
    }),
    filename,
    allowOverrides
  });
}

// Prepare a lab config and (meta)datasheets from inputs
export function prep({
  wb,
  str,
  arrbuf,
  base64,
  format,
  lab,
  labConfigs,
  filename,
}: {
  wb?: xlsx.WorkBook;
  str?: string;
  arrbuf?: ArrayBuffer;
  base64?: string; // base64 string
  format?: 'generic'; // add others here as more become known
  lab?: LabConfig | keyof typeof labConfigsMap.keys;
  labConfigs?: LabConfig[];
  filename?: string;
}): WorkbookInfo {
  // Make sure we have an actual workbook to work with:
  wb = parseWorkbook({ wb, str, arrbuf, base64 })

  if (!format) format = 'generic';

  switch (format) {
    case 'generic':
      return parseWorksheets({wb, lab, labConfigs});
    default:
      throw new Error(`format type ${format} not currently supported`);
  }
}


// Split the sheet names into the metadata sheets and the data sheets
export function partitionSheets(wb: xlsx.WorkBook) : {
  datasheets: DataSheet[],
  metadatasheet: MetaDataSheet | undefined, //TODO: Should this be an array?
} {
  // Grab the point meta data out of any master sheet:
  // Any sheet whose name contains "point meta" regardless of spacing, case, or punctuation will be considered
  // point metadata.  i.e. 'Point Meta-Data'  would match as well as 'pointmetadata'
  const matchsheet = wb.SheetNames.find(isPointMetadataSheetname)
  let metadatasheet : MetaDataSheet | undefined;
  if (matchsheet) {
    const rows = xlsx.utils
      // Without { raw: false } in sheet_to_json, dates will be parsed as excel ints instead of the formatted strings
      .sheet_to_json(wb.Sheets[matchsheet]!, { raw: false })
      .map(keysToUpperNoSpacesDashesOrUnderscores);
    metadatasheet = { rows, sheetname: matchsheet }
    trace('metadatasheet:', metadatasheet.sheetname);
  }

  let sheetnames = wb.SheetNames.length > 1 && wb.SheetNames.some(name => name.toLowerCase().includes("raw")) ?
    wb.SheetNames.filter(name => name.toLocaleLowerCase().includes("raw")) : wb.SheetNames;
  const datasheets = sheetnames
    .filter(sh => !isPointMetadataSheetname(sh))
    .map(sheetname => {

      const sheet = wb.Sheets[sheetname]!;
      const allrows = xlsx.utils.sheet_to_json(sheet, {defval: ''}); // include empty column values! undefined doesn't seem to get empty cols to show up.
      const rows = allrows
        .map((r: any) => Object.fromEntries(
          Object.entries(r)
            .filter(([key, _]) => !key.startsWith('__EMPTY'))
            .map(([key, val]) => ([key.trim(), val]))
        ))
        .filter(isDataRow);
      // Get a list of all the header names for future reference as needed. Since
      // keys are omitted for rows where a column has no value, we must look
      // through all the rows and accumulate the unique set of column headers.
      const colnames = [...new Set(rows.map((obj: any) => Object.keys(obj))
        .reduce((prev, cur) => prev.concat(cur), [])
      )];
      return {
        sheetname,
        allrows,
        rows,
        colnames
      }
    });

  return { metadatasheet, datasheets };
}

function getPointMeta(metadatasheet: MetaDataSheet, labConfig?: LabConfig) : Record<string, any> {
  const pointmeta : Record<string, any> = {};
  for (const r of metadatasheet.rows) {
    const id = modusKeyToValue(r, 'SampleNumber', labConfig) || r['POINTID'] || r['FMISSAMPLEID'] || r['SAMPLEID'];
    if (!id) continue;
    pointmeta[id] = r;
  }
  return pointmeta;
}

type MetaDataSheet = {
  rows: any[];
  sheetname: string;
};


type DataSheet = {
  colnames: string[];
  allrows: any[];
  rows: any[];
  sheetname: string;
};

export function getOrAutodetectLab({
  datasheets,
  allowImprovise,
  labConfigs: userLabConfigs,
} : {
  datasheets: DataSheet[],
  allowImprovise?: boolean,
  labConfigs?: LabConfig[],
}) : LabConfig | undefined {
  const labConfig = datasheets.map(({sheetname, colnames}) => autodetectLabConfig({ headers:colnames, sheetname }))
    .find(sh => sh)
  if (labConfig) info(`Using LabConfig: ${labConfig.name}`);
  if (!allowImprovise) return labConfig;
  return labConfig || datasheets.map(({colnames}) => cobbleLabConfig(colnames))
    .find(sh => sh)
}

type DateGroupedRows = Record<string, any[]>;

function groupRows(rows: any[], datecol: string | undefined) {
  return rows.reduce((groups: DateGroupedRows, r: any) => {
    let date = datecol ? r[datecol] : 'Unknown Date'
    if (date === 'NA') date = 'Unknown Date'
    if (date !== 'Unknown Date') date = parseDate(date);
    date = date instanceof Date ? date.toISOString().split('T')[0] : date;
    trace('Determined row date from column', datecol, 'as', date);

    if (!date) {
      warn(
        'WARNING: row does not have the column we chose for the date (',
        datecol,
        '), the row is: ',
        r
      );
      return groups;
    }
    if (!groups[date]) groups[date] = [];
    groups[date]!.push(r);
    return groups;
  }, {} as DateGroupedRows);
}

//-------------------------------------------------------------------------------------------
// Parse a workbook into a set of data and metadata (pointmeta) sheets.
function parseWorksheets({
  wb,
  lab,
  labConfigs,
}: {
  wb: xlsx.WorkBook,
  lab?: LabConfig | keyof typeof labConfigsMap.keys,
  labConfigs?: LabConfig[],
}): WorkbookInfo {
  const { metadatasheet, datasheets } = partitionSheets(wb);

  const labConfig: LabConfig | undefined = (lab && typeof lab === 'string') ?
    labConfigsMap.get(lab) : getOrAutodetectLab({ datasheets });
  if (!labConfig) warn(`LabConfig was either not supplied or not auto-detected. It may parse if using standardized CSV input...`);


  let pointMeta : Record<string, any> | undefined;
  if (metadatasheet) pointMeta = getPointMeta(metadatasheet, labConfig);

  trace('datasheets:', datasheets);
  return { datasheets, labConfig, pointMeta }
}

export type WorkbookInfo = {
  datasheets: DataSheet[],
  labConfig?: LabConfig,
  pointMeta?: Record<string, any>
}

// Convert a set datasheets with a lab config into a modus
function convert({
  datasheets,
  labConfig,
  pointMeta,
  filename,
  allowOverrides=true,
}: {
  datasheets: DataSheet[],
  labConfig?: LabConfig,
  pointMeta?: Record<string, any>,
  filename?: string,
  allowOverrides?: boolean
}): Slim[] {
  const ret: Slim[] = [];

  for (const {sheetname, allrows, rows, colnames } of datasheets) {
    // Grab the unit overrides and get rid of comment/units columns
    let unitOverrides = allowOverrides ? extractUnitOverrides(allrows) : undefined;
    trace('Have', rows.length, 'rows from sheetname: ', sheetname);


    // Parse structured header format for reverse conversion
    let headers = Object.fromEntries(
      colnames.map(n => ([n, {
        ...parseColumnHeaderName(n, labConfig),
        unitsOverride: unitOverrides?.[n],
      }]))
    );

    // Determine a "date" column for this dataset
    // FIXME: This date is important; consider enumerating some options
    let datecol = 'ReportDate' in rows[0] ?
      'ReportDate'
      : modusKeyToHeader('ReportDate', colnames, labConfig) ?? colnames.find((name) =>
        name.toUpperCase().match(/DATE/)
      );
    if (!datecol) {
      error('No date column in sheet', sheetname, ', columns are:', colnames);
    }

    // Loop through all the rows and group them by that date.  This group will
    // become a single Slim file.
    const grouped_rows = groupRows(rows, datecol);
    let groupcount = 0;
    for (const [date, g_rows] of Object.entries(grouped_rows)) {

      if (date === 'Unknown Date') {
        //FIXME: Quick fix: just skip it. Or should we rearchitect to losslessly transform and
        //       retain missing data in the output.
        continue;
      }
      groupcount++;
      const output: Slim | any = {
        date,
        lab: {},
        source: {},
        samples: {},
      };
      setPath(output, '/type', (labConfig?.type || modusKeyToValue(g_rows[0], 'LabType', labConfig) || 'Soil').toLowerCase());
      if (output.type === 'plant') output.type = 'plant-tissue';

      for (const [_, row] of g_rows.entries()) {
        //event = setMappings(event, 'event', row, labConfig); //TODO: Like this or { ...event, getMappings } ?
        setPath(output, `/lab/name`, modusKeyToValue(row, 'LabName', labConfig) || labConfig?.name);
        //FIXME: Which should be used here? Lab Event or Lab Report??
        setPath(output, `/lab/report/id`, modusKeyToValue(row, 'LabReportID', labConfig));
        setPath(output, `/id`, modusKeyToValue(row, 'LabReportID', labConfig) || modusKeyToValue(row, 'LabEventtID', labConfig));
        setPath(output, `/lab/dateProcessed`, modusKeyToValue(row, 'ProcessedDate', labConfig) || date);
        if (output.lab.dateProcessed && !output.lab.dateProcessed.includes('T'))
          output.lab.dateProcessed += 'T00:00:00+00:00';
        setPath(output, `/lab/dateReceived`, modusKeyToValue(row, 'DateReceived', labConfig) || date);
        if (output.lab.dateReceived && !output.lab.dateReceived.includes('T'))
          output.lab.dateReceived += 'T00:00:00+00:00';
        setPath(output, `/lab/contact/name`, modusKeyToValue(row, 'LabContactName', labConfig))
        setPath(output, `/lab/contact/address`, modusKeyToValue(row, 'LabContactAddress', labConfig))
        setPath(output, `/lab/contact/Phone`, modusKeyToValue(row, 'LabContactPhone', labConfig))
        setPath(output, `/lab/clientAccount/accountNumber`, modusKeyToValue(row, 'ClientAccountNumber', labConfig));
        setPath(output, `/lab/clientAccount/name`, modusKeyToValue(row, 'ClientName', labConfig));
        setPath(output, `/lab/clientAccount/company`, modusKeyToValue(row, 'ClientCompany', labConfig))
        //setPath(output, `/lab/clientAccount/contact/name`, modusKeyToValue(row, 'ClientContactName', labConfig))
        setPath(output, `/lab/clientAccount/city`, modusKeyToValue(row, 'ClientCity', labConfig));
        setPath(output, `/lab/clientAccount/state`, modusKeyToValue(row, 'ClientState', labConfig));
        setPath(output, `/lab/clientAccount/zip`, modusKeyToValue(row, 'ClientZip', labConfig));
        // TODO: Sheet name details within that file?
        setPath(output, `/lab/files`, [{
          name: filename,
          //id: ?
          //description: ?
          //base64: ?
        }]);

        const id = modusKeyToValue(row, 'SampleNumber', labConfig);
        const meta = pointMeta?.[id];

        setPath(output, `/source/grower/name`, modusValFromRowOrMeta(row, 'Grower', labConfig, meta));
        setPath(output, `/source/grower/id`, modusValFromRowOrMeta(row, 'GrowerID', labConfig, meta));
        setPath(output, `/source/farm/name`, modusValFromRowOrMeta(row, 'Farm', labConfig, meta));
        setPath(output, `/source/farm/id`, modusValFromRowOrMeta(row, 'FarmID', labConfig, meta));
        setPath(output, `/source/field/name`, modusValFromRowOrMeta(row, 'Field', labConfig, meta));
        setPath(output, `/source/field/id`, modusValFromRowOrMeta(row, 'FieldID', labConfig, meta));
        setPath(output, `/source/subfield/name`, modusValFromRowOrMeta(row, 'SubField', labConfig, meta));
        setPath(output, `/source/subfield/id`, modusValFromRowOrMeta(row, 'SubFieldID', labConfig, meta));

        let nutrientResults = parseNutrientResults({
          row,
          headers,
          labConfig,
        });

        // Units can come from several places
        nutrientResults = setNutrientResultUnits({
          nutrientResults,
          unitOverrides,
          labConfig,
          headers,
        })
        nutrientResults = units.convertUnits(nutrientResults);
        setPath(output, `/samples/${id}/results`,
          Object.fromEntries(nutrientResults.map(nr => {
            const out : any = {};
            //TODO: Spec out all of these things in slim
            //      Decide on modus test id handling v1 vs v2
            if (nr.Value) out.value = nr.Value;
            if (nr.ValueUnit) out.units= nr.ValueUnit;
            if (nr.UCUM_ValueUnit) out.ucumUnits= nr.UCUM_ValueUnit;
            if (nr.CsvHeader) out.csvHeader = nr.CsvHeader;
            if (nr.Element) out.analyte = nr.Element;
            if (nr.ModusTestID) out.modusTestID = nr.ModusTestID;
            if (nr.ModusTestIDv2) out.modusTestID = nr.ModusTestIDv2;
            if (nr.ValueDesc) out.valueDescription = nr.ValueDesc;
            if (nr.ValueType) out.valueType = nr.ValueType;
            return [ md5(JSON.stringify(out)), out ];
          }))
        );

        if (output.type === 'soil') {
          setPath(output, `/samples/${id}/depth`, parseDepth(row, headers, labConfig));
        }

        if (output.type === 'plant-tissue') {
          setPath(output, `/source/crop`, modusValFromRowOrMeta(row, 'Crop', labConfig, meta));
          setPath(output, `/source/growthStage`, modusValFromRowOrMeta(row, 'GrowthStage', labConfig, meta));
          setPath(output, `/source/subGrowthStage`, modusValFromRowOrMeta(row, 'SubGrowthStage', labConfig, meta));
          setPath(output, `/source/plantPath`, modusValFromRowOrMeta(row, 'PlantPart', labConfig, meta));
        }

        // FIXME: Implement this?
        // Write/override any additional labConfig Mappings into the modus output
        //sample = setMappings(sample, 'sample', row, labConfig);

        // Parse locations: either in the sample itself or in the meta.  Sample takes precedence over meta.
        let ll = parseLocation(meta) || parseLocation(row);
        if (ll) {
          setPath(output, `/samples/${id}/geolocation`, ll);
        }

      } // end rows for this group
      if (!output.id) {
        output.id = md5(JSON.stringify(output));
      }

      try {
        assertSlim(output);
      } catch (e: any) {
        error(
          'assertSlim failed for sheetname',
          sheetname,
          ', group date',
          date
        );
        throw oerror.tag(
          e,
          `Could not construct a valid Slim from sheet ${sheetname}, group date ${date}`
        );
      }

      ret.push(output);
    } // end looping over all groups
  } // end looping over all the sheets

  return ret;
}

//----------------------------------------------
// Helpers
//----------------------------------------------

// Return a new object where all keys are the upper-case equivalents of keys from input object.
function keysToUpperNoSpacesDashesOrUnderscores(obj: any) {
  const ret: any = {};
  for (const [key, val] of Object.entries(obj)) {
    const newkey = key.toUpperCase().replace(/([ _]|-)*/g, '');
    ret[newkey] =
      typeof val === 'object'
        ? keysToUpperNoSpacesDashesOrUnderscores(val)
        : val;
  }
  return ret;
}

function isPointMetadataSheetname(name: string) {
  return name
    .replace(/([ _,]|-)*/g, '')
    .toUpperCase()
    .match('POINTMETA');
}

//Preference here is overrides > sheet > labConfig
function setNutrientResultUnits({
  nutrientResults,
  headers,
  unitOverrides,
  labConfig,
} : {
  nutrientResults: NutrientResult[],
  headers: Record<string, ColumnHeader>,
  unitOverrides?: Units,
  labConfig?: LabConfig,
}) : NutrientResult[] {
  return nutrientResults.map(nr => {
    const header = Object.values(headers).find(h => h.original === nr.CsvHeader);
    const override = header?.original ? unitOverrides?.[header?.original] : undefined;
    const headerUnit = header?.units;
    const labConfigUnit = header ? labConfig?.units?.[header.original] : undefined;

    trace(`Ordered unit prioritization of ${nr.Element}: Override:[${override}] `
      + `> Header:[${headerUnit}] > LabConfig:[${labConfigUnit}]`);
    return {
      ...nr,
      ValueUnit: override || headerUnit || labConfigUnit,
    }
  });
}

function extractUnitOverrides(rows: any[]) {
  const overrides: Units = {};
  const unitrows = rows.filter(isUnitRow);
  // There really should only be one units row
  for (const r of unitrows) {
    for (const [key, val] of Object.entries(r as object)) {
      if (!val) continue; // type-inferred 'nothing' should just not be here
      // keep all the key/value pairs EXCEPT the one that indicated this was a UNITS row
      if (typeof val === 'string' && val.trim() === 'UNITS') continue;
      overrides[key] = val;
    }
  }
  return overrides;
}

function modusValFromRowOrMeta(row: any, item: string, labConfig?: LabConfig, meta?: any) {
  return modusKeyToValue(row, item, labConfig) || modusKeyToValue(meta, item, labConfig);
}

// A row is a "data row" if it is not a COMMENT row or a UNIT row
function isDataRow(row: any): boolean {
  const first = !isCommentRow(row);
  const second = !isUnitRow(row);
  const third = !isEmptyRow(row);
  return first && second && third;
}
function isEmptyRow(row: any): boolean {
  if (typeof row !== 'object') return true;
  for (const val of Object.values(row)) {
    if (val) return false; // found anything in the object that is not empty
  }
  return true;
}
function isCommentRow(row: any): boolean {
  return !!Object.values(row).find(
    (val) => typeof val === 'string' && val.trim() === 'COMMENT'
  );
}
function isUnitRow(row: any): boolean {
  return !!Object.values(row).find(
    (val) => typeof val === 'string' && val.trim() === 'UNITS'
  );
}
type Depth = {
  id?: string;
  name: string;
  top: number;
  bottom: number;
  units: 'cm' | 'in';
};

// TODO: Handle other types of geolocation
function parseLocation(meta_or_row: any): { lat: number, lon: number } | undefined {
  if (meta_or_row === undefined) return undefined;
  let copy = keysToUpperNoSpacesDashesOrUnderscores(meta_or_row);

  let lonKey = Object.keys(copy).find((key) => key.includes('LONGITUDE'));
  let latKey = Object.keys(copy).find((key) => key.includes('LATITUDE'));

  if (copy['LONG']) lonKey = 'LONG';
  if (copy['LNG']) lonKey = 'LNG';
  if (copy['LON']) lonKey = 'LON';
  if (copy['LAT']) latKey = 'LAT';

  if (!lonKey) {
    //trace('No longitude for point: ', meta_or_row.POINTID || meta_or_row.FMISSAMPLEID || meta_or_row.SAMPLEID);
    return;
  }
  if (!latKey) {
    //trace('No latitude for point: ', meta_or_row.POINTID || meta_or_row.FMISSAMPLEID || meta_or_row.SAMPLEID);
    return;
  }

  let lon = +copy[lonKey];
  let lat = +copy[latKey];

  return { lon, lat };
}

// There are complex regular expressions to grab nested brackets and parens
// such as \[(?>[^][]+|(?<c>)\[|(?<-c>)])+] at https://stackoverflow.com/questions/71769611/regex-to-match-everything-inside-brackets-ignore-nested
// but I don't think we need that level of complexity.  We can just search string for first
// and last occurences of (), and [] chars from start and from end, then just use whatever is in the middle.
// for "stuff (other) [[ppm]]", between "[" and "]" returns "[ppm]" and "()" returns "other"
function extractBetween(str: string, startChar: string, endChar: string): string | undefined {
  const start = str.indexOf(startChar);
  const end = str.lastIndexOf(endChar);
  if (start < 0) return; // start char not found
  if (start > str.length-1) return ''; // start char at end of string
  if (end < 0) return str.slice(start+1); // end not found, return start through end of string
  return str.slice(start+1,end); // start+1 to avoid including the start/end chars in output
}
function extractBefore(str: string, startChars: string | string[]): string {
  let chars = Array.isArray(startChars) ? startChars : [startChars];

  const first = chars.find(key => str.indexOf(key) >= 0);
  if (!first) return str; // start char not found
  const start = str.indexOf(first);
  return str.slice(0,start);
}

// This is the implementation allowing for association of column headers to
// a NutrientResult. It'll also be key in getting back to the original input
// headers if that is necessary.
type ColumnHeader = {
  original: string;
  element: string;
  modusid?: string;
  units?: string;
  nutrientResult: NutrientResult;
  unitsOverride?: string;
  convertedTo?: string;
};

export function parseColumnHeaderName(original: string, labConfig?: LabConfig): ColumnHeader {
  original = original
    .trim()
    .replace(/\n/g, ' ')
    .replace(/ +/g, ' ');
  const element = extractBefore(original, ['(', '[']).trim() || original;
  const modusid = extractBetween(original, '(', ')')?.trim();
  const units = extractBetween(original, '[', ']')?.trim();
  const nutrientResult = labConfig?.analytes[element] || { Element: element };
  return {
    original,
    element,
    modusid,
    units,
    nutrientResult,
  };
}

// TODO: 'strict' means exclude all elements unknown to modus
// This function also filters all duplicate base saturation elements in the event that
// percent and meq/100g units are provided.
//TODO: Handling the standardized CSV output is challenging here (no labconfig). We are limited to
// deciphering nutrient results from columns that have units or a modus id. This can be decieving as
// some analytes may not have that info and other columns such as depth can have units.
function parseNutrientResults({
  row,
  headers,
  labConfig
  //strict,
} : {
  row: Record<string, any>,
  headers: Record<string, ColumnHeader>,
  labConfig?: LabConfig,
  //strict?: boolean
}): Array<NutrientResult> {

  let nutrientResults : Array<NutrientResult> = Object.keys(row).filter(key => {
    // Rows outside of the labconfig one way or another
    if (!labConfig?.analytes[key]) {
      // Things we know are not analytes: depth values (may have units);
      if (key.toLowerCase().includes('depth'))
        return false;
      // Standardized CSV output information
      if (headers?.[key]?.units || headers?.[key]?.modusid)
        return true;
      return false;
    } else {
//       if (!isNaN(+(row[key].replace('>', '').replace('<', ''))) && row[key] !== '')
      if (typeof row[key] === 'string' || typeof row[key] === 'number')
        return true;

      return false
      // Filter things that fail the else statement below, i.e., headers[key] does not exist

    }}).map((key: any) => {
      let Value = !isNaN(+row[key]) ? +row[key] : row[key];
      if (labConfig?.analytes?.[key]) {
        return {
          ...labConfig.analytes[key],
          Value,
        }
      } else {
        return {
          Element: headers[key]!.element,
          ValueUnit: headers?.[key]?.units,
          ModusTestID: headers?.[key]?.modusid,
          CsvHeader: headers?.[key]?.original,
          Value,
        }
      }
    }) as Array<NutrientResult>

  // Now eliminate duplicate Base Saturation entries
  return nutrientResults.filter((v: NutrientResult, i: number) => !nutrientResults.some(
      (item, j) => (
        v.Element === item.Element && i !== j && BASEPAT.test(v.Element) &&
          BASEPAT.test(item.Element) && v.ValueUnit !== '%'
    ))
  )
}

function parseDepth(row: any, headers: Record<string, ColumnHeader>, labConfig?: LabConfig): Depth {
  let depthInfo: any =
    typeof labConfig?.depthInfo !== 'function'
      ? // @ts-ignore
        labConfig?.depthInfo
      : labConfig?.depthInfo(row);

  // Depth info can come from:
  // 1) Within the spreadsheet, as columns for each property
  // 2) Within the spreadsheet with units parsed from headers and overrides
  // 3) Data that lives outside of the spreadsheet, e.g., based on some lab config
  // 4) Some combination of the row data with custom logic applied (depthInfo as
  //    a function)
  const colnames = Object.keys(row);
  const depth: any = {};
  let startHeader = modusKeyToHeader('StartingDepth', colnames, labConfig);
  let startVal = startHeader ? row[startHeader] : undefined;
  let startOverride = startHeader ? headers[startHeader]?.unitsOverride : undefined;
  depth.top =
    modusKeyToValue(row, 'StartingDepth', labConfig) ||
    depthInfo?.StartingDepth ||
    0;

  let endHeader = modusKeyToHeader('EndingDepth', colnames, labConfig);
  let endVal = endHeader ? row[endHeader]: undefined;
  let endOverride = endHeader ? headers[endHeader]?.unitsOverride : undefined;
  depth.bottom =
    modusKeyToValue(row, 'EndingDepth', labConfig) ||
    depthInfo?.EndingDepth ||
    depth.top;

  let depHeader = modusKeyToHeader('ColumnDepth', colnames, labConfig);
  let depVal = depHeader ? row[depHeader]: undefined;
  let depOverride = depHeader ? headers[depHeader]?.unitsOverride : undefined;

  // Pull the information from the column value
  let valDepthUnit;
  if (!depVal) {
    [' to ', ' - '].some((pattern) =>
      [startVal, endVal, depVal].some((val) => {
        if (typeof val === 'string' && val?.match(pattern)) {
          const pieces = val.split(pattern);
          depth.top = parseInt(pieces[0]!) || 0;
          depth.bottom = parseInt(pieces[1]!) || 0;
          if (pieces[1]?.includes('cm')) valDepthUnit = 'cm';
          if (pieces[1]?.includes('mm')) valDepthUnit = 'mm';
          if (pieces[1]?.includes('in')) valDepthUnit = 'in';
        }
      })
    )
  }

  const depthUnit = startOverride || endOverride || depOverride;
  depth.units = depthUnit || valDepthUnit || modusKeyToValue(row, 'DepthUnit', labConfig) ||
    depthInfo?.DepthUnit || 'cm';

  depth.name =
    modusKeyToValue(row, 'DepthName', labConfig) ||
    depthInfo?.Name ||
    depth.bottom === 0
      ? 'Unknown Depth'
      : `${depth.top} to ${depth.bottom} ${depth.units}`;



  return depth;
}

export function handleExtraHeaders(row:any, labConfig: LabConfig) {

  // Does the header have the same value across all rows? Apply it to the top-level

  // Is the thing an analyte with units? Should it have already been detected even if it was
  // not in the labConfig?
  const extras = Object.keys(row).filter((key) =>
    !(key in labConfig.analytes || key in labConfig.mappings)
  );
}

// Return a Lab Config for an input
export async function toLabConfig(
  files: InputFile[] | InputFile,
  labConfigs?: LabConfig[]
): Promise<LabConfigResult[]> {
  if (!Array.isArray(files)) {
    files = [files];
  }
  let results: LabConfigResult[] = [];
  for (const file of files) {
    const format = file.format || 'generic';
    let original_type = typeFromFilename(file.filename);
    if (!original_type) {
      warn('WARNING: unable to determine file type from filename',file.filename,'.  Supported types are:',supportedFileTypes,'.  Skipping file.');
      continue;
    }

    if (original_type === 'csv' || original_type === 'xlsx') {
      //TODO: Implement this against LabConfigs?
      if (!supportedFormats.find((f) => f === format)) {
        warn('ERROR: format', format, 'is not supported for file',file.filename,'.  Supported formats are: ',supportedFormats,'.  Skipping file.');
        continue;
      }
    }
    switch (original_type) {
      case 'zip':
        info(`Lab configurations can only be generated from .csv/.xlsx files. Skipping ${file.filename}`)
        continue;
        /* //TODO: Should be minor reworking to allow zip, but set aside for now
        if (!file.arrbuf && !file.base64) {
          warn('Type of',file.filename,'was',original_type,'but that must be an ArrayBuffer or Base64 encoded string.  Skipping.');
          continue;
        }
        break;
        */
      case 'xml':
        info(`Lab configurations can only be generated from .csv/.xlsx files. Skipping ${file.filename}`)
        continue;
      case 'json':
        info(`Lab configurations can only be generated from .csv/.xlsx files. Skipping ${file.filename}`)
        continue;
      case 'csv':
        break;
      case 'xlsx':
        break;
    }
    const base = { original_filename: file.filename, original_type };
    const type = original_type; // just to make things shorter later in json filename determination
    const filename = file.filename;
    let output_filename = '';
    let wbinfo: WorkbookInfo | any | null = null;
    try {
      switch (original_type) {
        /*
        case 'zip':
          const zip_modus = await zipParse(file);
          results = [...results, ...zip_modus];
          break;
          */
        case 'csv':
        case 'xlsx':
          let parseargs: any;
          if (original_type === 'csv') parseargs = { str: file.str, format };
          else {
            if (file.arrbuf)
              parseargs = {
                arrbuf: file.arrbuf,
                format,
              };
            // checked for at least one of these above
            else parseargs = { base64: file.base64, format };
          }
          const wbinfo = prep({...parseargs, labConfigs});
//          for (const [index, wbinfo] of all_wbinfo.entries()) {
          const filename_args: FilenameArgs = { wbinfo, type, filename };
           // if (all_wbinfo.length > 1) {
              // multiple things, then use the index
           //   filename_args.index = index;
            //}
          results.push({ ...wbinfo, ...base });
          //}
          break;
      }
    } catch (e: any) {
      if (e.errors && e.input && Array.isArray(e.errors)) {
        // AJV error
        warn('ERROR: failed to validate file', file.filename);
        for (const ajv_error of e.errors) {
          warn('Path', ajv_error.instancePath, ajv_error.message); // '/path/to/item' 'must be an array'
        }
      } else {
        warn('ERROR: failed to read file', file.filename);
        console.log(e);
      }
      continue; // if error, move on to the next file
    }
  } // end for loop on filenames
  return results;
}

export type LabConfigResult = {
  original_filename: string;
  original_type: SupportedFileType;
  labConfig?: LabConfig;
};

export type FilenameArgs = {
  wbinfo: WorkbookInfo;
  index?: number;
  filename: string;
  type: SupportedFileType;
};

export function setPath(
  output: any,
  outPath: string,
  data: any,
  condition?: boolean
) {
  const outNewVal = jp.has(output, outPath) ? jp.get(output, outPath) : undefined;
  const newVal = outNewVal ?? data;
  if ((Array.isArray(newVal) && newVal.length > 0) || (newVal || newVal === 0)) {
    jp.set(output, outPath, newVal);
  }
  return
}
