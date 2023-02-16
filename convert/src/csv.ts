import debug from 'debug';
import * as xlsx from 'xlsx';
import oerror from '@overleaf/o-error';
import { getJsDateFromExcel } from 'excel-date-to-js';
import dayjs from 'dayjs';
import type { NutrientResult, Units } from '@modusjs/units';
import * as units from '@modusjs/units';
import ModusResult, {
  assert as assertModusResult,
} from '@oada/types/modus/v1/modus-result.js';
import type { LabConfig } from './labs/index.js';
import { autoDetectLabConfig, cobbleLabConfig, labConfigsMap, modusKeyToValue, modusKeyToHeader } from './labs/index.js';
const error = debug('@modusjs/convert#csv:error');
const warn = debug('@modusjs/convert#csv:error');
const info = debug('@modusjs/convert#csv:info');
const trace = debug('@modusjs/convert#csv:trace');

export const supportedFormats = ['generic'];
export type SupportedFormats = 'generic';

export function getWorkbookFromData({
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
      if (str) wb = xlsx.read(str, { type: 'string' });
      if (arrbuf) wb = xlsx.read(arrbuf, { type: 'array' });
      if (base64) wb = xlsx.read(base64, { type: 'base64' });
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
}: {
  wb?: xlsx.WorkBook;
  str?: string;
  arrbuf?: ArrayBuffer;
  base64?: string; // base64 string
  format?: 'generic'; // add others here as more become known
  lab?: LabConfig | keyof typeof labConfigsMap.keys
}): ModusResult[] {
  // Make sure we have an actual workbook to work with:
  wb = getWorkbookFromData({ wb, str, arrbuf, base64 })

  if (!format) format = 'generic';

  switch (format) {
    case 'generic':
      return parseWorkbook({ wb, lab });
    default:
      throw new Error(`format type ${format} not currently supported`);
  }
}

export function partitionSheets(wb: xlsx.WorkBook, header?: string) : {
  pointmeta: Record<string, any>,
  datasheets: DataSheet[],
  metadatasheets: any[],
} {
  // Grab the point meta data out of any master sheet:
  // Any sheet whose name contains "point meta" regardless of spacing, case, or punctuation will be considered
  // point metadata.  i.e. 'Point Meta-Data'  would match as well as 'pointmetadata'
  const pointmeta: { [pointid: string]: any } = {}; // just build this as we go to keep code simpler
  // Split the sheet names into the metadata sheets and the data sheets
  const metadatasheets = wb.SheetNames.filter(isPointMetadataSheetname)
    .map(sheetname => {
      const rows = xlsx.utils
        .sheet_to_json(wb.Sheets[sheetname]!, { raw: false })
        .map(keysToUpperNoSpacesDashesOrUnderscores);
      return { rows, sheetname }
    })
  trace('metadatasheets:', metadatasheets.map(sh => sh.sheetname));
  if (metadatasheets) {
    for (const { rows } of metadatasheets) {
      // If you don't put { raw: false } for sheet_to_json, it will parse dates as ints instead of the formatted strings
      //TODO: Move into Lab Config, methinks
      for (const r of rows) {
        const id = header ? r[header] : r['POINTID'] || r['FMISSAMPLEID'] || r['SAMPLEID'];
        if (!id) continue;
        pointmeta[id] = r;
      }
    }
  }

  const datasheets = wb.SheetNames
  .filter(sh => !isPointMetadataSheetname(sh))
  .map(sheetname => {

    const sheet = wb.Sheets[sheetname]!;
    const allrows = xlsx.utils.sheet_to_json(sheet, {defval: ''}); // include empty column values! undefined doesn't seem to get empty cols to show up.
    const rows = allrows.filter(isDataRow);
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

  return { pointmeta, metadatasheets, datasheets };
}

type DataSheet = {
  colnames: string[];
  allrows: any[];
  rows: any[];
  sheetname: string;
};

export function findAndAutodetectLab(datasheets: DataSheet[], allowImprovise?: boolean) : LabConfig | undefined {
  const labConfig = datasheets.map(({sheetname, colnames}) => autoDetectLabConfig(colnames, sheetname))
    .find(sh => sh)
  if (labConfig) info(`Using LabConfig: ${labConfig.name}`);
  if (!allowImprovise) return labConfig;
  return labConfig || datasheets.map(({colnames}) => cobbleLabConfig(colnames))
    .find(sh => sh)
}
//-------------------------------------------------------------------------------------------
// Parse the specific spreadsheet with data from TomKat ranch provided at the
// 2022 Fixing the Soil Health Tech Stack Hackathon.
function parseWorkbook({
  wb,
  lab,
  allowOverrides=true,
}: {
  wb: xlsx.WorkBook,
  lab?: LabConfig | keyof typeof labConfigsMap.keys,
  allowOverrides?: boolean
}): ModusResult[] {
  const { pointmeta, datasheets } = partitionSheets(wb);

  const labConfig: LabConfig | undefined = (lab && typeof lab === 'string') ?
    labConfigsMap.get(lab) : findAndAutodetectLab(datasheets);
  if (!labConfig) info(`LabConfig was either not supplied or not auto-detected. Defaulting to standard config.`);
  if (!labConfig) throw new Error('Unable to detect or generate lab configuration.')


  trace('datasheets:', datasheets);
  const ret: ModusResult[] = [];

  for (const {sheetname, allrows, rows, colnames } of datasheets) {
    // Grab the unit overrides and get rid of comment/units columns
    let unitOverrides = allowOverrides ? extractUnitOverrides(allrows) : undefined;
    trace('Have', rows.length, 'rows from sheetname: ', sheetname);


    // Parse structured header format for reverse conversion
    let headers = Object.fromEntries(
      colnames.map(n => ([n, parseColumnHeaderName(n, labConfig)]))
    );

    // Determine a "date" column for this dataset
    // Let some "known" candidates for date column name take precedence over others:
    let datecol = modusKeyToHeader('EventDate', labConfig);
    if (!datecol) {
      error('No date column in sheet', sheetname, ', columns are:', colnames);
      throw new Error(
        `Could not find a column containing 'date' in the name to use as the date in sheet ${sheetname}.  A date is required.`
      );
    }

    // Loop through all the rows and group them by that date.  This group will become a single ModusResult file.
    type DateGroupedRows = { [date: string]: any[] };
    const grouped_rows = rows.reduce((groups: DateGroupedRows, r: any) => {
      let date = r[datecol!]?.toString();
      if (date.match(/[0-9]{8}/)) {
        // YYYYMMDD
        date = dayjs(date, 'YYYYMMDD').format('YYYY-MM-DD');
      } else if (+date < 100000 && +date > 100) {
        // this is an excel date (# days since 1/1/1900), parse it out
        date = dayjs(getJsDateFromExcel(date)).format('YYYY-MM-DD');
      }
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

    // Now we can loop through all the groups and actually make the darn Modus file:
    let groupcount = 1;
    for (const [date, g_rows] of Object.entries(grouped_rows)) {
      // Start to build the modus output, this is one "Event"
      const output: ModusResult | any = {
        Events: [
          {
            LabMetaData: {
              Reports: [
                {
                  ReportID: '1',
                  FileDescription: `${sheetname}_${groupcount++}`,
                },
              ],
            },
            EventMetaData: {
              //TODO: LabConfig can override this EventDate
              EventDate: date, // TODO: process this into the actual date format we are allowed to have in schema.
              EventType: { Soil: true },
            },
            EventSamples: {
              Soil: {
                DepthRefs: [],
                SoilSamples: [],
              },
            },
          },
        ],
      };
      const event = output.Events![0]!;
      const depthrefs = event.EventSamples!.Soil!.DepthRefs!;
      const samples = event.EventSamples!.Soil!.SoilSamples!;

      for (const [index, row] of g_rows.entries()) {
        const reportid = modusKeyToValue(row, 'ReportID', labConfig);
        if (reportid) {
          event.LabMetaData.Reports[0]!.ReportID = reportid; // last row will win this if they disagree
        }

        let nutrientResults = parseNutrientResults({
          row,
          headers,
        });

        // Units can come from several places
        nutrientResults = setNutrientResultUnits({
          nutrientResults,
          unitOverrides,
          labConfig,
          headers,
        })
        nutrientResults = units.convertUnits(nutrientResults);

        const id = modusKeyToValue(row, 'SampleNumber', labConfig);
        // where does the pointmeta go again (Latitude_DD, Longitude_DD, Field,
        // Acreage, etc.)?
        const meta = pointmeta[id] || null;

        // Grab the "depth" for this sample:
        //TODO: integrate into labconfig
        const depth = parseDepth(row, unitOverrides, sheetname);
        // mutates depthrefs if missing, returns depthid
        const DepthID = '' + ensureDepthInDepthRefs(depth, depthrefs);

        const sample: any = {
          SampleMetaData: {
            SampleNumber: modusKeyToValue(row, 'SampleNumber', labConfig) || '' + index,
            ReportID: modusKeyToValue(row, 'ReportID', labConfig) || '1',
            FMISSampleID: modusKeyToValue(row, 'FMISSampleID', labConfig) || ''+id,
          },
          Depths: [{
            DepthID,
            NutrientResults: nutrientResults
          }],
        };

        // Parse locations: either in the sample itself or in the meta.  Sample takes precedence over meta.
        let wkt = parseWKTFromPointMetaOrRow(row);
        if (!wkt && meta) {
          //trace('No location info found in row, checking for any in meta');
          wkt = parseWKTFromPointMetaOrRow(meta);
        }
        if (!wkt) {
          //trace('No location info found for row either in the row or in the meta');
        }
        if (wkt) {
          sample.SampleMetaData.Geometry = { wkt };
        }
        samples.push(sample);
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
} // end parseTomKat function

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
    let header = Object.values(headers)
      .find(h => h.nutrientResult?.Element === nr.Element);
    let override = unitOverrides?.[header!.original];
    let headerUnit = header?.units;
    let labConfigUnit = labConfig?.units[nr.Element];

    trace(`Ordered unit prioritization of ${nr.Element}: Override:[${override}] `
          + `> Header:[${headerUnit}] > LabConfig:[${labConfigUnit}] > default:`
          + `[${nr.ValueUnit}]`);
    return {
      ...nr,
      ValueUnit: override || headerUnit || labConfigUnit || nr.ValueUnit,
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
function parseWKTFromPointMetaOrRow(meta_or_row: any): string {
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
function extractBetween(str: string, startChar: string, endChar: string): string {
  const start = str.indexOf(startChar);
  const end = str.lastIndexOf(endChar);
  if (start < 0) return str; // start char not found
  if (start > str.length-1) return ''; // start char at end of string
  if (end < 0) return str.slice(start+1); // end not found, return start through end of string
  return str.slice(start+1,end); // start+1 to avoid including the start/end chars in output
}
function extractBefore(str: string, startChar: string): string {
  const start = str.indexOf(startChar);
  if (start < 0) return str; // start char not found
  return str.slice(0,start);
}

// This is the implementation allowing for association of column headers to
// a NutrientResult. It'll also be key in getting back to the original input
// headers if that is necessary.
type ColumnHeader = {
  original: string,
  element: string,
  modifier: string,
  units: string,
  nutrientResult: NutrientResult,
};

function parseColumnHeaderName(original: string, labConfig?: LabConfig): ColumnHeader {
  original = original
    .trim()
    .replace(/\n/g, ' ')
    .replace(/ +/g, ' ');
  const element = extractBefore(original, '(') || original;
  const modifier = extractBetween(original, '(', ')');
  const units = extractBetween(original, '[', ']');
  const nutrientResult = labConfig?.analytes[element] || { Element: element };
  //TODO: Could also be a mapping item
  return { original, element, modifier, units, nutrientResult };
}

// If we aren't careful and we allow extra things through, we could end up with
// nutrient results for e.g., "Date", "Location", and other non-NRs.
// TODO: 'strict' means exclude all elements unknown to modus
function parseNutrientResults({
  row,
  headers,
  //strict,
} : {
  row: Record<keyof typeof headers, any>,
  headers: Record<string, ColumnHeader>,
  //strict?: boolean
}): NutrientResult[] {
  return Object.keys(row)
    //TODO: What about undefined, '', etc? Has that already been done by something?
    .filter(key => !isNaN(row[key]))
    //TODO: enable some implementation of strict.
    //.filter(key => (!(strict && !allElements[headers[key]!.nutrientResult)))
    .map(key => ({
      ...headers[key]!.nutrientResult,
      Value: +row[key],
      ValueUnit: headers[key]!.nutrientResult?.ValueUnit //|| 'none',
    }))
}

//1. grab first key containing 'DEPTH'
//2.
function parseDepth2(row: any, units?: any, sheetname?: string): Depth {
  let obj: any = {
    DepthUnit: 'cm', //default to cm
  };

  // Get columns with the word depth
  const copy = keysToUpperNoSpacesDashesOrUnderscores(row);
  const unitsCopy = keysToUpperNoSpacesDashesOrUnderscores(units);
  let depthKey = Object.keys(copy).find((key) => key.match(/DEPTH/));
  if (depthKey) {
    let value = copy[depthKey].toString();
    if (unitsCopy[depthKey]) obj.DepthUnit = unitsCopy[depthKey];

    if (value.match(' to ')) {
      obj.StartingDepth = +value.split(' to ')[0];
      obj.EndingDepth = +value.split(' to ')[1];
      obj.Name = value;
    } else if (value.match(' - ')) {
      obj.StartingDepth = +value.split(' - ')[0];
      obj.EndingDepth = +value.split(' - ')[1];
      obj.Name = value;
    } else {
      obj.StartingDepth = +value;
      obj.Name = value;
    }
  }

  if (row['B Depth']) obj.StartingDepth = +row['B Depth'];
  if (row['B Depth']) obj.Name = '' + row['B Depth'];
  if (units['B Depth']) obj.DepthUnit = units['B Depth']; // Assume same for both top and bottom
  if (row['E Depth']) obj.EndingDepth = +row['E Depth'];

  //Insufficient data found
  if (typeof obj.StartingDepth === 'undefined') {
    warn(
      'No depth data was found in sheetname',
      sheetname,
      '. Falling back to default depth object.'
    );
    trace('Row without depth was: ', row);
    return {
      StartingDepth: 0,
      EndingDepth: 8,
      DepthUnit: 'in',
      Name: 'Unknown Depth',
      ColumnDepth: 8,
    };
  }

  //Handle single depth value
  obj.EndingDepth = obj.EndingDepth || obj.StartingDepth;

  //Now compute column depth
  obj.ColumnDepth = Math.abs(obj.EndingDepth - obj.StartingDepth);

  return obj;
}

// sheetname is just for debugging
function parseDepth(row: any, units?: any, sheetname?: string): Depth {
  let obj: any = {
    DepthUnit: 'cm', //default to cm
  };

  // Get columns with the word depth
  const copy = keysToUpperNoSpacesDashesOrUnderscores(row);
  const unitsCopy = keysToUpperNoSpacesDashesOrUnderscores(units);
  let depthKey = Object.keys(copy).find((key) => key.match(/DEPTH/));
  if (depthKey) {
    let value = copy[depthKey].toString();
    if (unitsCopy[depthKey]) obj.DepthUnit = unitsCopy[depthKey];

    if (value.match(' to ')) {
      obj.StartingDepth = +value.split(' to ')[0];
      obj.EndingDepth = +value.split(' to ')[1];
      obj.Name = value;
    } else if (value.match(' - ')) {
      obj.StartingDepth = +value.split(' - ')[0];
      obj.EndingDepth = +value.split(' - ')[1];
      obj.Name = value;
    } else {
      obj.StartingDepth = +value;
      obj.Name = value;
    }
  }

  if (row['B Depth']) obj.StartingDepth = +row['B Depth'];
  if (row['B Depth']) obj.Name = '' + row['B Depth'];
  if (units['B Depth']) obj.DepthUnit = units['B Depth']; // Assume same for both top and bottom
  if (row['E Depth']) obj.EndingDepth = +row['E Depth'];

  //Insufficient data found
  if (typeof obj.StartingDepth === 'undefined') {
    warn(
      'No depth data was found in sheetname',
      sheetname,
      '. Falling back to default depth object.'
    );
    trace('Row without depth was: ', row);
    return {
      StartingDepth: 0,
      EndingDepth: 8,
      DepthUnit: 'in',
      Name: 'Unknown Depth',
      ColumnDepth: 8,
    };
  }

  //Handle single depth value
  obj.EndingDepth = obj.EndingDepth || obj.StartingDepth;

  //Now compute column depth
  obj.ColumnDepth = Math.abs(obj.EndingDepth - obj.StartingDepth);

  return obj;
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

function toCsvObject(input: ModusResult) {
  return input
    .Events!.map((event) => {
      let eventMeta = {
        EventDate: event.EventMetaData!.EventDate,
        EventType: 'Soil', // Hard-coded for now. This is all soil data at the moment
      };

      let allReports = toReportsObj(event.LabMetaData!.Reports);

      let allDepthRefs = toDepthRefsObj(event.EventSamples!.Soil!.DepthRefs);

      return event.EventSamples!.Soil!.SoilSamples!.map((sample) => {
        let sampleMeta = toSampleMetaObj(sample.SampleMetaData, allReports);

        return sample.Depths!.map((depth) => {
          let nutrients = toNutrientResultsObj(depth);

          return {
            ...eventMeta,
            ...sampleMeta,
            ...allDepthRefs[depth.DepthID!],
            ...nutrients,
          };
        });
      });
    })
    .flat(3);
}

function toSampleMetaObj(sampleMeta: any, allReports: any) {
  const base = {
    SampleNumber: sampleMeta.SampleNumber,
    ...allReports[sampleMeta.ReportID],
    FMISSampleID: sampleMeta.FMISSampleID,
  };
  let ll = sampleMeta?.Geometry?.wkt
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
      },
    ])
  );
}

function toNutrientResultsObj(sampleDepth: any) {
  return Object.fromEntries(
    sampleDepth.NutrientResults.map((nr: NutrientResult) => [
      `${nr.Element} [${nr.ValueUnit}]`,
      nr.Value,
    ])
  );
}

/* Didn't see these in the official modus element list
  "LBC 1": [],
  "Total Microbial Biomass": [],
  "Total Bacteria Biomass": [],
  "Actinomycetes Biomass": [],
  "Gram (-) Biomass": [],VFINX VINEX
  "Rhizobia Biomass": [],
  "Gram (+) Biomass": [],
  "Total Fungi Biomass": [],
  "Arbuscular Mycorrhizal Biomass": [],
  "Saprophyte Biomass": [],
  "Protozoa Biomass": [],
  "Fungi:Bacteria": [],
  "Gram(+):Gram(-)": [],
  "Sat:Unsat": [],
  "Mono:Poly": []
 */

// This takes an mappings in the lab configs and sets modus values
// If multiple columns map to the same modus, take the last defined one.
/*
function handleModusMappers(modus: ModusResult, mm: ModusMappings) {
  //1. Split on [*] and iterate over the parent?


}
*/