import debug from 'debug';
import * as xlsx from 'xlsx';
import oerror from '@overleaf/o-error';
import { modusTests } from '@modusjs/industry';
import { simpleConvert } from '@modusjs/units';
import { convertUnits } from '@modusjs/units';
import type { NutrientResult, Units } from '@modusjs/units';
import type { InputFile, SupportedFileType } from './json.js';
import { supportedFileTypes, typeFromFilename } from './json.js';
import * as units from '@modusjs/units';
import { parseDate } from './labs/index.js';
import ModusResult, {
  assert as assertModusResult,
} from '@oada/types/modus/v1/modus-result.js';
import type { LabConfig, LabType } from './labs/index.js';
import { autodetectLabConfig, cobbleLabConfig, labConfigsMap, modusKeyToValue, modusKeyToHeader, setMappings } from './labs/index.js';
const error = debug('@modusjs/convert#csv:error');
const warn = debug('@modusjs/convert#csv:error');
const info = debug('@modusjs/convert#csv:info');
const trace = debug('@modusjs/convert#csv:trace');

const DEPTHUNITS = 'cm';
const BASEPAT = /^Base Saturation - /;
export * as labs from './labs/index.js';
export const supportedFormats = ['generic'];
export type SupportedFormats = 'generic';

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

// parse: wrapper function for particular parsing functions found down below.
//
// Possible input parameters for xlsx/csv parsing:
// Either give an already-parsed workbook, an entire CSV as a string, or an arraybuffer, or a base64 string
// Default CSV/XLSX format is generic
export function parse({
  wb,
  str,
  arrbuf,
  base64,
  format,
  lab,
  labConfigs,
  allowOverrides= true,
}: {
  wb?: xlsx.WorkBook;
  str?: string;
  arrbuf?: ArrayBuffer;
  base64?: string; // base64 string
  format?: 'generic'; // add others here as more become known
  lab?: LabConfig | keyof typeof labConfigsMap.keys;
  labConfigs?: LabConfig[]; //The set of lab configurations to choose from; defaults to @modusjs/industry, but this allows us to pass in a locally-modified set from the app
  allowOverrides?: boolean;
}): ModusResult[] {
  // Make sure we have an actual workbook to work with:
  wb = parseWorkbook({ wb, str, arrbuf, base64 })

  if (!format) format = 'generic';

  switch (format) {
    case 'generic':
      return convert({ ...parseWorksheets({wb, lab, labConfigs}), allowOverrides })
    default:
      throw new Error(`format type ${format} not currently supported`);
  }
}

export function prep({
  wb,
  str,
  arrbuf,
  base64,
  format,
  lab,
  labConfigs,
}: {
  wb?: xlsx.WorkBook;
  str?: string;
  arrbuf?: ArrayBuffer;
  base64?: string; // base64 string
  format?: 'generic'; // add others here as more become known
  lab?: LabConfig | keyof typeof labConfigsMap.keys;
  labConfigs?: LabConfig[];
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
// Parse the specific spreadsheet with data from TomKat ranch provided at the
// 2022 Fixing the Soil Health Tech Stack Hackathon.
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
//  if (!labConfig) throw new Error('Unable to detect or generate lab configuration.')


  let pointMeta : Record<string, any> | undefined;
  if (metadatasheet) pointMeta = getPointMeta(metadatasheet, labConfig);

  trace('datasheets:', datasheets);
  //return convert({ datasheets, labConfig, pointMeta, allowOverrides })
  return { datasheets, labConfig, pointMeta }
}

export type WorkbookInfo = {
  datasheets: DataSheet[],
  labConfig?: LabConfig,
  pointMeta?: Record<string, any>
}

function convert({
  datasheets,
  labConfig,
  pointMeta,
  allowOverrides=true,
}: {
  datasheets: DataSheet[],
  labConfig?: LabConfig,
  pointMeta?: Record<string, any>,
  allowOverrides?: boolean
}): ModusResult[] {
  const ret: ModusResult[] = [];

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
    let datecol = 'EventDate' in rows[0] ? 'EventDate' : modusKeyToHeader('ReportDate', colnames, labConfig) ?? colnames.find((name) => name.toUpperCase().match(/DATE/));
    if (!datecol) {
      error('No date column in sheet', sheetname, ', columns are:', colnames);
    }

    // Loop through all the rows and group them by that date.  This group will
    // become a single ModusResult file.
    const grouped_rows = groupRows(rows, datecol);
    // Now we can loop through all the groups and actually make the darn Modus
    // file:
    let groupcount = 0;
    for (const [date, g_rows] of Object.entries(grouped_rows)) {
      groupcount++;
      // Start to build the modus output, this is one "Event"
      //TODO: Soil labtype isn't the best default because its really the only "different" one.
      //      We could also use existence of depth info to determine if its soil.
      const type : LabType = labConfig?.type || modusKeyToValue(g_rows[0], 'ReportType', labConfig) || 'Soil';
      const sampleType = `${type}Samples`;
      const output: ModusResult | any = {
        Events: [
          {
            EventMetaData: {
              EventDate: date, // TODO: process this into the actual date format we are allowed to have in schema.
              EventType: { [type]: true },
            },
            EventSamples: {
              [type]: {
                [sampleType]: [],
              },
            },
          },
        ],
      };
      let event = output.Events![0]!;

      if (type === 'Soil') event.EventSamples![type].DepthRefs = [];
      if (type === 'Plant') event.EventMetaData.EventType!.Plant = {
        Crop: {
          Name: modusKeyToValue(g_rows[0], 'Crop', labConfig) || 'Unknown Crop',
          ClientID: modusKeyToValue(g_rows[0], 'ClientAccountNumber', labConfig) || 'Unknown Client',
          GrowthStage: {
            Name: modusKeyToValue(g_rows[0], 'GrowthStage', labConfig) || 'Unknown Growth Stage',
            ClientID: modusKeyToValue(g_rows[0], 'ClientAccountNumber', labConfig) || 'Unknown Client',
          },
          SubGrowthStage: {
            Name: modusKeyToValue(g_rows[0], 'SubGrowthStage', labConfig) || 'Unknown Sub-Growth Stage',
            ClientID: modusKeyToValue(g_rows[0], 'ClientAccountNumber', labConfig) || 'Unknown Client',
          },
        },
        PlantPart: modusKeyToValue(g_rows[0], 'PlantPart', labConfig) || 'Unknown Plant Part',
      };
      const depthrefs = type === 'Soil' ? event.EventSamples![type]!.DepthRefs! : undefined;
      const samples = event.EventSamples![type]![sampleType]!;

      for (const [_, row] of g_rows.entries()) {
        event = setMappings(event, 'event', row, labConfig); //TODO: Like this or { ...event, getMappings } ?
        event.LabMetaData = {
          LabName: modusKeyToValue(row, 'LabName', labConfig) || labConfig?.name || 'Unknown Lab',
          LabEventID: modusKeyToValue(row, 'LabEventID', labConfig) || 'Unknown Lab Event ID',
          ProcessedDate: modusKeyToValue(row, 'ProcessedDate', labConfig) || date,
          ReceivedDate: modusKeyToValue(row, 'ReceivedDate', labConfig) || date,
          Reports: [],
          ClientAccount: {
            AccountNumber: modusKeyToValue(row, 'ClientAccountNumber', labConfig) || 'Unknown Client Account',
            Company: modusKeyToValue(row, 'ClientCompany', labConfig) || 'Unknown Client Company',
            Name: modusKeyToValue(row, 'ClientName', labConfig) || 'Unknown Client Name',
            City: modusKeyToValue(row, 'ClientCity', labConfig) || 'Unknown Client City',
            State: modusKeyToValue(row, 'ClientState', labConfig) || 'Unknown Client State',
            Zip: modusKeyToValue(row, 'ClientZip', labConfig) || 'Unknown Client Zip',
          }
        };

        const id = modusKeyToValue(row, 'SampleNumber', labConfig);
        const meta = pointMeta?.[id];

        event.FMISMetaData = {
          FMISProfile: {
            Grower: modusKeyToValue(row, 'GrowerName', labConfig) || modusKeyToValue(meta, 'Grower', labConfig) || 'Unknown Grower',
            Farm: modusKeyToValue(row, 'FarmName', labConfig) || modusKeyToValue(meta, 'Farm', labConfig) || 'Unknown Farm',
            Field: modusKeyToValue(row, 'FieldName', labConfig) || modusKeyToValue(meta, 'Field', labConfig) || 'Unknown Field',
            'Sub-Field': modusKeyToValue(row, 'SubFieldName', labConfig) || modusKeyToValue(meta, 'SubField', labConfig) || 'Unknown Sub-Field',
          }
        }

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

        let DepthID: string | undefined;
        if (type === 'Soil') {
          const depth = parseDepth(row, headers, labConfig);
          // mutates depthrefs if missing, returns depthid
          DepthID = '' + ensureDepthInDepthRefs(depth, depthrefs);
        }

        // Get the ReportID integer from the LabReportID string after ensuring
        // a Reports entry exists for it.
        const labReportId = modusKeyToValue(row, 'LabReportID', labConfig);
        const fileDescription = `${sheetname}_${groupcount}`;
        const ReportID = ensureLabReportId(event.LabMetaData.Reports, labReportId, fileDescription);

        let sample: any = {
          SampleMetaData: {
            ReportID: ReportID || 1,
            //TODO: TestPackage
          }
        }
        if (type === 'Soil') {
          sample.Depths = [{
            DepthID,
            NutrientResults: nutrientResults
          }]
        } else {
          sample.NutrientResults = nutrientResults;
        }

        //TODO: Will this negatively overwrite anything
        sample = setMappings(sample, 'sample', row, labConfig);

        // Parse locations: either in the sample itself or in the meta.  Sample takes precedence over meta.
        let wkt = parseWKTFromPointMetaOrRow(meta) || parseWKTFromPointMetaOrRow(row);
        if (wkt) {
          sample.SampleMetaData.Geometry = wkt;
        }
        samples.push(sample);

        //Write/override any additional labConfig Mappings into the modus output


      } // end rows for this group
      try {
        assertModusResult(output);
      } catch (e: any) {
        error(
          'assertModusResult failed for sheetname',
          sheetname,
          ', group date',
          date
        );
        throw oerror.tag(
          e,
          `Could not construct a valid ModusResult from sheet ${sheetname}, group date ${date}`
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
  DepthID?: number; // only the DepthRef has this, don't have it just from the row
  Name: string;
  StartingDepth: number;
  EndingDepth: number;
  ColumnDepth: number;
  DepthUnit: 'cm' | 'in';
};

function depthsEqual(ref: Depth, depth: Depth) {
  if (ref['DepthUnit'] !== depth['DepthUnit']) return false;
  if (ref['StartingDepth'] !== depth['StartingDepth']) return false;
  if (ref['ColumnDepth'] !== depth['ColumnDepth']) return false;
  if (ref['Name'] !== depth['Name']) return false;
  if (ref['EndingDepth'] !== depth['EndingDepth']) return false;
  return true;
}

function ensureDepthInDepthRefs(depth: Depth, depthrefs: Depth[]): number {
  let match = depthrefs.find((ref) => depthsEqual(ref, depth));
  if (!match) {
    let DepthID = depthrefs.length + 1;
    depthrefs.push({
      ...depth,
      DepthID,
    });
    return DepthID;
  }
  return match.DepthID!;
}

// Make a WKT from point meta's Latitude_DD and Longitude_DD.  Do a "tolerant" parse so anything
// with latitude or longitude (can insensitive) or "lat" and "lon" or "long" would still get a WKT
function parseWKTFromPointMetaOrRow(meta_or_row: any): string | undefined {
  if (meta_or_row === undefined) return undefined;
  let copy = keysToUpperNoSpacesDashesOrUnderscores(meta_or_row);

  let longKey = Object.keys(copy).find((key) => key.includes('LONGITUDE'));
  let latKey = Object.keys(copy).find((key) => key.includes('LATITUDE'));

  if (copy['LONG']) longKey = 'LONG';
  if (copy['LNG']) longKey = 'LNG';
  if (copy['LON']) longKey = 'LON';
  if (copy['LAT']) latKey = 'LAT';

  if (!longKey) {
    //trace('No longitude for point: ', meta_or_row.POINTID || meta_or_row.FMISSAMPLEID || meta_or_row.SAMPLEID);
    return '';
  }
  if (!latKey) {
    //trace('No latitude for point: ', meta_or_row.POINTID || meta_or_row.FMISSAMPLEID || meta_or_row.SAMPLEID);
    return '';
  }

  let long = copy[longKey];
  let lat = copy[latKey];

  return `POINT(${long} ${lat})`;
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
  let startHeader = modusKeyToHeader('Top', colnames, labConfig);
  let startVal = startHeader ? row[startHeader] : undefined;
  let startOverride = startHeader ? headers[startHeader]?.unitsOverride : undefined;
  depth.StartingDepth =
    modusKeyToValue(row, 'Top', labConfig) ||
    depthInfo?.StartingDepth ||
    0;

  let endHeader = modusKeyToHeader('Bottom', colnames, labConfig);
  let endVal = endHeader ? row[endHeader]: undefined;
  let endOverride = endHeader ? headers[endHeader]?.unitsOverride : undefined;
  depth.EndingDepth =
    modusKeyToValue(row, 'Bottom', labConfig) ||
    depthInfo?.EndingDepth ||
    depth.StartingDepth;

  let depHeader = modusKeyToHeader('ColumnDepth', colnames, labConfig);
  let depVal = depHeader ? row[depHeader]: undefined;
  let depOverride = depHeader ? headers[depHeader]?.unitsOverride : undefined;
  depth.ColumnDepth =
    modusKeyToValue(row, 'ColumnDepth', labConfig) ||
    depthInfo?.ColumnDepth ||
    Math.abs(depth.EndingDepth - depth.StartingDepth) ||
    0; // 0 is allowed in our json schema, but technically not allowed per xsd

  // Pull the information from the column value
  let valDepthUnit;
  if (!depVal) {
    [' to ', ' - '].some((pattern) =>
      [startVal, endVal, depVal].some((val) => {
        if (typeof val === 'string' && val?.match(pattern)) {
          const pieces = val.split(pattern);
          depth.StartingDepth = parseInt(pieces[0]!) || 0;
          depth.EndingDepth = parseInt(pieces[1]!) || 0;
          depth.ColumnDepth = depth.EndingDepth - depth.StartingDepth;
          if (pieces[1]?.includes('cm')) valDepthUnit = 'cm';
          if (pieces[1]?.includes('mm')) valDepthUnit = 'mm';
          if (pieces[1]?.includes('in')) valDepthUnit = 'in';
        }
      })
    )
  }

  const depthUnit = startOverride || endOverride || depOverride;
  depth.DepthUnit = depthUnit || valDepthUnit || modusKeyToValue(row, 'Units', labConfig) ||
    depthInfo?.DepthUnit || 'cm';

  depth.Name =
    modusKeyToValue(row, 'DepthName', labConfig) ||
    depthInfo?.Name ||
    depth.EndingDepth === 0
      ? 'Unknown Depth'
      : `${depth.StartingDepth} to ${depth.EndingDepth} ${depth.DepthUnit}`;



  return depth;
}

export type ToCsvOpts = {
  ssurgo?: boolean;
};

export function toCsv(input: ModusResult | ModusResult[], opts?: ToCsvOpts) {
  if (opts?.ssurgo) {
    warn('SSURGO option coming soon for CSV output');
  }

  let data = [];

  if (Array.isArray(input)) {
    data = input.map((mr: ModusResult) => toCsvObject(mr)).flat(1);
  } else {
    data = toCsvObject(input);
  }
  let sheet = xlsx.utils.json_to_sheet(data);

  return {
    wb: {
      Sheets: { Sheet1: sheet },
      SheetNames: ['Sheet1'],
    } as xlsx.WorkBook,
    str: xlsx.utils.sheet_to_csv(sheet),
  };
}

//TODO: Generalize to modus types other than Soil
export function toCsvObject(input: ModusResult, separateMetadata?: boolean) {
  return input
    .Events!.map((event) => {
      let eventMeta = {
        EventDate: event.EventMetaData!.EventDate,
        EventCode: event.EventMetaData?.EventCode,
        EventType: Object.keys(event.EventMetaData?.EventType || {})[0] || 'Soil' // Hard-coded for now. This is all soil data at the moment
      };
      const type = eventMeta.EventType;
      if (type === 'Plant') {
        eventMeta = {
          ...eventMeta,
          // @ts-expect-error messed up schema I guess? Fix
          Crop: event.EventMetaData?.EventType?.Plant?.Crop?.Name,
          PlantClient: event.EventMetaData?.EventType?.Plant?.Crop?.ClientID,
          GrowthStage: event.EventMetaData?.EventType?.Plant?.Crop?.GrowthStage?.Name,
          GrowthStageClient: event.EventMetaData?.EventType?.Plant?.Crop?.GrowthStage?.ClientID,
          SubGrowthStage: event.EventMetaData?.EventType?.Plant?.Crop?.SubGrowthStage?.Name,
          SubGrowthStageClient: event.EventMetaData?.EventType?.Plant?.Crop?.SubGrowthStage?.ClientID,
          PlantPart: event.EventMetaData?.EventType?.Plant?.PlantPart,
        }
      }

      let labMeta = {
        LabName: event.LabMetaData?.LabName,
        LabID: event.LabMetaData?.LabID,
        LabReportID: event.LabMetaData?.LabReportID,
        LabEventID: event.LabMetaData?.LabEventID,
        ReceivedDate: event.LabMetaData?.ReceivedDate,
        ProcessedDate: event.LabMetaData?.ProcessedDate,
        ClientAccountNumber: event.LabMetaData?.ClientAccount?.AccountNumber,
        ClientName: event.LabMetaData?.ClientAccount?.Name,
        ClientCompany: event.LabMetaData?.ClientAccount?.Company,
        ClientCity: event.LabMetaData?.ClientAccount?.City,
        ClientState: event.LabMetaData?.ClientAccount?.State,
        ClientZip: event.LabMetaData?.ClientAccount?.Zip,
        LabContactName: event.LabMetaData?.Contact?.Name,
        LabContactPhone: event.LabMetaData?.Contact?.Phone,
        LabContactAddress: event.LabMetaData?.Contact?.Address,
      }

      let fmisMeta = {
        FMISEventID: event.FMISMetadata?.FMISEventID,
        FMISProfileGrower: event.FMISMetadata?.FMISProfile?.Grower,
        FMISProfileFarm: event.FMISMetadata?.FMISProfile?.Farm,
        FMISProfileField: event.FMISMetadata?.FMISProfile?.Field,
        'FMISProfileSubField': event.FMISMetadata?.FMISProfile?.['Sub-Field'],
      }

      let allReports = toReportsObj(event.LabMetaData!.Reports);

      let allDepthRefs = toDepthRefsObj(event.EventSamples?.Soil?.DepthRefs);
      let samplesType = `${type}Samples`;

      // @ts-expect-error make union type later
      return event.EventSamples![type]![samplesType]!.map((sample) => {
        let sampleMeta = toSampleMetaObj(sample.SampleMetaData, allReports);

        if (type === 'Soil') {
          return sample.Depths!.map((depth: any) => {
            let nutrients = toNutrientResultsObj(depth);

            return {
              ...eventMeta,
              ...labMeta,
              ...fmisMeta,
              ...sampleMeta,
              ...allReports[sampleMeta.ReportID],
              ...allDepthRefs[depth.DepthID!],
              ...nutrients,
            };
          });
        } else {
          let nutrients = toNutrientResultsObj(sample);
          return {
            ...eventMeta,
            ...labMeta,
            ...fmisMeta,
            ...sampleMeta,
            ...allReports[sampleMeta.ReportID],
            ...nutrients,
          };
        };;
      });
    })
    .flat(3); // TODO: Flatten 3 for soil and 2 for other types? Check when we get there.
}

function toSampleMetaObj(sampleMeta: any, allReports: any) {
  const base = {
    SampleNumber: sampleMeta.SampleNumber,
    ...allReports[sampleMeta.ReportID],
    FMISSampleID: sampleMeta.FMISSampleID,
    SampleContainerID: sampleMeta.SampleContainerID,
    ReportID: sampleMeta.ReportID,
  };
  let ll = sampleMeta?.Geometry
    ?.replace('POINT(', '')
    .replace(')', '')
    .trim()
    .split(' ');
  if (!ll) return base;
  return {
    ...base,
    Latitude: +ll[0],
    Longitude: +ll[1],
  };
}

function toDepthRefsObj(depthRefs: any): any {
  if (!depthRefs) return undefined;
  return Object.fromEntries(
    depthRefs.map((dr: Depth) => [
      dr.DepthID,
      {
        DepthID: '' + dr.DepthID,
        [`StartingDepth [${dr.DepthUnit}]`]: dr.StartingDepth,
        [`EndingDepth [${dr.DepthUnit}]`]: dr.EndingDepth,
        [`ColumnDepth [${dr.DepthUnit}]`]: dr.ColumnDepth,
      },
    ])
  );
}

function toReportsObj(reports: any): any {
  return Object.fromEntries(
    reports.map((r: any) => [
      r.ReportID,
      {
        FileDescription: r.FileDescription,
        ReportID: r.ReportID,
        LabReportID: r.LabReportID,
      },
    ])
  );
}

function toNutrientResultsObj(sampleDepth: any) {
  return Object.fromEntries(
    sampleDepth.NutrientResults.map((nr: NutrientResult) => [
      `${nr.Element}${nr.ModusTestID ? ` (${nr.ModusTestID})` : ''} [${nr.ValueUnit}]`,
      nr.Value,
    ])
  );
}

function ensureLabReportId(reports: any[], LabReportID: string, FileDescription: string) {
  let rep = reports.find((r: any) => r.LabReportID === LabReportID)
  // First and only report is missing LabReportID. Use it.
  if (!rep) {
    const ReportID = reports.length + 1;
    rep = {
      LabReportID: LabReportID || `Report ${ReportID}`,
      ReportID,
      FileDescription
    };
    reports.push(rep);
    return rep.ReportID;
  } else return rep.ReportID;
}

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

export function fixModus(modus: ModusResult): ModusResult {
  //Fix Non-Standard (not specified by modus) Depth Units
  modus = fixDepthUnits(modus);

  //Fix Non-Standard Nutrient Results (lookup modus id and append everything else)
  modus = setModusNRUnits(modus);
  return modus;
}

export function fixDepthUnits(modus: ModusResult): ModusResult {
  let evts = (modus.Events || []).map((evt) => {
    if (evt.EventSamples?.Soil) {
      evt.EventSamples.Soil.DepthRefs = evt.EventSamples.Soil.DepthRefs?.map((dr) => {
        const StartingDepth = simpleConvert(dr.StartingDepth!, dr.DepthUnit!, DEPTHUNITS);
        const EndingDepth = simpleConvert(dr.EndingDepth!, dr.DepthUnit!, DEPTHUNITS);
        const ColumnDepth = simpleConvert(dr.ColumnDepth!, dr.DepthUnit!, DEPTHUNITS);
        //@ts-ignore
        if (StartingDepth?.status === 'failed' || EndingDepth?.status === 'failed' || ColumnDepth?.status === 'failed') {
          warn(`Standardizing soil depth units failed. Falling back to input.`);
          return dr;
        }
        return {
          ...dr,
          //@ts-ignore
          StartingDepth: Math.round(StartingDepth.toVal),
          //@ts-ignore
          EndingDepth: Math.round(EndingDepth.toVal),
          //@ts-ignore
          ColumnDepth: Math.round(ColumnDepth.toVal),
          DepthUnit: DEPTHUNITS
        }
      })
    }
    return evt
  })
  return { ...modus, Events: evts};
}

export function setModusNRUnits(modus: ModusResult, units?: NutrientResult[]): ModusResult {
  let evts = (modus.Events || []).map((evt) => {
    let evtSamples = Object.fromEntries(
      Object.entries(evt.EventSamples || {}).map(([key, value]: [string, any]) => {
        let samplesKey = `${key}Samples`;
        if (key === 'Soil') {
          value[samplesKey] = value[samplesKey].map((sample:any) => ({
            ...sample,
            Depths: sample.Depths.map((dep:any) => ({
              ...dep,
              //Will convert to standard units or else
              NutrientResults: convertUnits(dep.NutrientResults.map((nr: NutrientResult) => ({
                ...nr,
                Element: modusTests[nr.ModusTestID as keyof typeof modusTests]?.Element || nr.Element,
                ModusTestIDv2: modusTests[nr.ModusTestID as keyof typeof modusTests]?.ModusTestIDv2 || nr.ModusTestIDv2,
              })), units)
            }))
          }))
        }
        return [key, value]
      })
    )
    return {
      ...evt, EventSamples: evtSamples
    }
  })
  return { ...modus, Events: evts};
}