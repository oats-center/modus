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
import * as labConfs from './labs/index.js';
const error = debug('@modusjs/convert#csv:error');
const warn = debug('@modusjs/convert#csv:error');
const info = debug('@modusjs/convert#csv:info');
const trace = debug('@modusjs/convert#csv:trace');

export const supportedFormats = ['generic'];
export type SupportedFormats = 'generic';

//export const recognizedCsvs = new Map<string,RecognizedCsv>();
export const labConfigs = new Map<string, LabConfig>(
  Object.values(labConfs).map(obj => ([obj.name, obj as LabConfig]))
)
//--------------------------------------------------------------------------------------
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
  lab?: LabConfig | keyof typeof labConfs
}): ModusResult[] {
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

  if (!format) format = 'generic';

  switch (format) {
    case 'generic':
      return parseTomKat({ wb, lab });
    default:
      throw new Error(`format type ${format} not currently supported`);
  }
}

//-------------------------------------------------------------------------------------------
// Parse the specific spreadsheet with data from TomKat ranch provided at the
// 2022 Fixing the Soil Health Tech Stack Hackathon.
function parseTomKat({
  wb,
  lab,
  allowOverrides=true,
}: {
  wb: xlsx.WorkBook,
  lab?: LabConfig | keyof typeof labConfs,
  allowOverrides?: boolean
}): ModusResult[] {
  // Grab the point meta data out of any master sheet:
  // Any sheet whose name contains "point meta" regardless of spacing, case, or punctuation will be considered
  // point metadata.  i.e. 'Point Meta-Data'  would match as well as 'pointmetadata'
  const pointmeta: { [pointid: string]: any } = {}; // just build this as we go to keep code simpler
  // Split the sheet names into the metadata sheets and the data sheets
  const metadatasheets = wb.SheetNames.filter(isPointMetadataSheetname);
  trace('metadatasheets:', metadatasheets);
  if (metadatasheets) {
    for (const sheetname of metadatasheets) {
      // If you don't put { raw: false } for sheet_to_json, it will parse dates as ints instead of the formatted strings
      const rows = xlsx.utils
        .sheet_to_json(wb.Sheets[sheetname]!, { raw: false })
        .map(keysToUpperNoSpacesDashesOrUnderscores);
      for (const r of rows) {
        const id = r['POINTID'] || r['FMISSAMPLEID'] || r['SAMPLEID'];
        if (!id) continue;
        pointmeta[id] = r;
      }
    }
  }

  // Start walking through all the sheets to grab the main data:
  const datasheets = wb.SheetNames.filter(
    (sn) => !isPointMetadataSheetname(sn)
  );
  trace('datasheets:', datasheets);
  const ret: ModusResult[] = [];

  for (const sheetname of datasheets) {
    const sheet = wb.Sheets[sheetname]!;
    const allrows = xlsx.utils.sheet_to_json(sheet, {defval: ''}); // include empty column values! undefined doesn't seem to get empty cols to show up.

    // Grab the unit overrides and get rid of comment/units columns
    let unitOverrides = allowOverrides ? extractUnitOverrides(allrows) : undefined;
    const rows = allrows.filter(isDataRow);
    trace('Have', rows.length, 'rows from sheetname: ', sheetname);

    // Get a list of all the header names for future reference as needed. Since
    // keys are omitted for rows where a column has no value, we must look
    // through all the rows and accumulate the unique set of column headers.
    const colnames = [...new Set(rows.map((obj: any) => Object.keys(obj))
      .reduce((prev, cur) => prev.concat(cur), [])
    )];

    let headers = Object.fromEntries(
      colnames.map(n => ([n, parseColumnHeaderName(n)]))
    );

    // Attempt to get the lab config. This isn't required.
    let labConfig: LabConfig | undefined = lab ?
      (typeof lab === 'string' ?
        labConfigs.get(lab)
        : lab
      )
      : autoDetectLabConfig(colnames);

    if (!labConfig) info(`LabConfig was either not supplied or not auto-detected.`);


    // Determine a "date" column for this dataset
    // Let some "known" candidates for date column name take precedence over others:
    let datecol = colnames
      .sort()
      .find((name) => name.toUpperCase().match(/DATE/));
    if (colnames.find((c) => c.match(/DATESUB/))) {
      trace(`Found DATESUB column, using that for date in sheet ${sheetname}.`);
      datecol = 'DATESUB'; // A&L West Semios
    }
    //trace('datecol = ', datecol, ', colnames uppercase = ', colnames.map(c => c.toUpperCase()));
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
        const reportid = parseReportID(row);
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

        const id = parseSampleID(row);
        const meta = pointmeta[id] || null; // where does the pointmeta go again (Latitude_DD, Longitude_DD, Field, Acreage, etc.)


        // Grab the "depth" for this sample:
        // // SAM: need to write this to figure out a Depth object
        const depth = parseDepth(row, unitOverrides, sheetname);
        const DepthID = '' + ensureDepthInDepthRefs(depth, depthrefs); // mutates depthrefs if missing, returns depthid

        const sample: any = {
          SampleMetaData: {
            SampleNumber: parseSampleNumber(row) || '' + index,
            ReportID: '1',
            FMISSampleID: '' + id,
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
  unitOverrides,
  labConfig,
  headers,
} : {
  nutrientResults: NutrientResult[],
  unitOverrides: Units | undefined,
  labConfig: LabConfig | undefined,
  headers: Record<string, ColumnHeader>,
}) : NutrientResult[] {
  return nutrientResults.map(nr => {
    let header = Object.values(headers).find(h => h.nutrientResult?.Element === nr.Element);
    let override = unitOverrides?.[header!.original];
    let headerUnit = header?.units;
    let labConfigUnit = labConfig?.units[nr.Element];

    trace(`Ordered unit prioritization of ${nr.Element}: Override:[${override}] > Header:[${headerUnit}] > Lab Config:[${labConfigUnit}] > default:[${nr.ValueUnit}]`)
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

function parseSampleID(row: any): string {
  const copy = keysToUpperNoSpacesDashesOrUnderscores(row);
  return copy['POINTID'] || copy['FMISSAMPLEID'] || copy['SAMPLEID'] || '';
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
type ColumnHeader = {
  original: string,
  element: string,
  modifier: string,
  units: string,
  nutrientResult: NutrientColHeader | undefined,
};

function parseColumnHeaderName(original: string): ColumnHeader {
  original = original
    .trim()
    .replace(/\n/g, ' ')
    .replace(/ +/g, ' ');
  const element = extractBefore(original, '(') || original;
  const modifier = extractBetween(original, '(', ')');
  const units = extractBetween(original, '[', ']');
  const nutrientResult = nutrientColHeaders[element];
  return { original, element, modifier, units, nutrientResult };
}

// units can be overriden
function parseNutrientResults({
  row,
  headers,
} : {
  row: Record<keyof typeof headers, any>,
  headers: Record<string, ColumnHeader>,
}): NutrientResult[] {
  return Object.keys(row)
    .filter(key => headers[key]?.nutrientResult)
    .filter(key => !isNaN(row[key]))
    .map(key => ({
      ...headers[key]?.nutrientResult,
      Element: headers[key]!.nutrientResult!.Element,
      Value: +row[key],
      ValueUnit: headers[key]!.nutrientResult?.ValueUnit || 'none',
    }));
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

function parseReportID(row: any) {
  if (row['REPORTNUM']) {
    // A&L West Semios
    return row['REPORTNUM'].toString().trim();
  }
  return '';
}

// SampleNumber is not the same as SampleID: SampleID is what the soil sampler called it,
// SampleNumber is what the Lab calls that sample
function parseSampleNumber(row: any) {
  if (row['LABNUM']) {
    // A&L West Semios
    return row['LABNUM'].toString().trim();
  }
  return '';
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

type ModusCsvRow = {
  ReportID: string;
};

type NutrientColHeader = {
  Element: string,
  ValueUnit?: string
}

type ModusCsv = ModusCsvRow[];
//TODO: all of these need to be split out and moved into the lab configs found in src/labs/*.js
export let nutrientColHeaders: Record<string, NutrientColHeader> = {
  '1:1 Soil pH': {
    Element: 'pH',
  },
  'pH': {
    Element: 'pH',
  },
  'OM': {
    Element: 'OM',
    ValueUnit: '%',
  },
  'Organic Matter LOI %': {
    Element: 'OM (LOI)',
    ValueUnit: '%',
  },
  'Organic Matter': {
    Element: 'OM',
    ValueUnit: '%',
  },
  'OM (LOI)': {
    Element: 'OM (LOI)',
    ValueUnit: '%',
  },
  'Olsen P ppm P': {
    Element: 'P (Olsen)',
    ValueUnit: '[ppm]',
  },
  'P (Olsen)': {
    Element: 'P (Olsen)',
    ValueUnit: '[ppm]',
  },
  'Bray P-1 ppm P': {
    Element: 'P (Bray P1 1:10)',
    ValueUnit: '[ppm]',
  },
  'Olsen P': {
    Element: 'P (Olsen)',
    ValueUnit: 'ug/g',
  },
  'P phosphorus': {
    Element: 'P',
    ValueUnit: '[ppm]',
  },
  'P': {
    Element: 'P',
    ValueUnit: '[ppm]',
  },
  'P (Bray P1 1:10)': {
    Element: 'P',
    ValueUnit: '[ppm]',
  },
  'Pb lead': {
    Element: 'Pb',
    ValueUnit: '[ppm]',
  },
  'Pb': {
    Element: 'Pb',
    ValueUnit: '[ppm]',
  },
  'Potassium ppm K': {
    Element: 'K',
    ValueUnit: '[ppm]',
  },
  'K': {
    Element: 'K',
    ValueUnit: '[ppm]',
  },
  'Potassium': {
    Element: 'K',
    ValueUnit: 'cmol/kg',
  },
  'K potassium': {
    Element: 'K',
    ValueUnit: '[ppm]',
  },
  'Ca': {
    Element: 'Ca',
    ValueUnit: '[ppm]',
  },
  'Calcium ppm Ca': {
    Element: 'Ca',
    ValueUnit: '[ppm]',
  },
  'Calcium': {
    Element: 'Ca',
    ValueUnit: 'cmol/kg',
  },
  'Ca calcium': {
    Element: 'Ca',
    ValueUnit: '[ppm]',
  },
  'Cd cadmium': {
    Element: 'Cd',
    ValueUnit: '[ppm]',
  },
  'Cd': {
    Element: 'Cd',
    ValueUnit: '[ppm]',
  },
  'Cr chromium': {
    Element: 'Cr',
    ValueUnit: '[ppm]',
  },
  'Cr': {
    Element: 'Cr',
    ValueUnit: '[ppm]',
  },
  'Magnesium ppm Mg': {
    Element: 'Mg',
    ValueUnit: '[ppm]',
  },
  'Mg': {
    Element: 'Mg',
    ValueUnit: '[ppm]',
  },
  'Magnesium': {
    Element: 'Mg',
    ValueUnit: 'cmol/kg', //elements such as this one that don't indicate base
  },                         //saturation are problematic. Should probably be ppm
  'Mg magnesium': {          //unless we know it to be cmol/kg
    Element: 'Mg',
    ValueUnit: '[ppm]',
  },
  'Mo': {
    Element: 'Mo',
    ValueUnit: '[ppm]',
  },
  'Mo molybdenum': {
    Element: 'Mo',
    ValueUnit: '[ppm]',
  },
  'CEC/Sum of Cations me/100g': {
    Element: 'CEC',
    ValueUnit: 'meq/(100.g)',
  },
  'CEC': {
    Element: 'CEC',
    ValueUnit: 'cmol/kg',
  },
  'CEC (Estimated)': {
    Element: 'CEC',
    ValueUnit: 'cmol/kg',
  },
  '%Ca Sat': {
    Element: 'BS%-Ca',
    ValueUnit: '%',
  },
  'BS%-Ca': {
    Element: 'BS%-Ca',
    ValueUnit: '%',
  },
  'BS-Ca': {
    Element: 'BS-Ca',
    ValueUnit: 'meq/(100.g)',
  },
  'CA_SAT': {
    Element: 'BS-Ca', // Base Saturation - Calcium
    ValueUnit: 'meq/(100.g)',
  },
  'CA_PCT': {
    Element: 'BS%-Ca',
    ValueUnit: '%',
  },
  'BS%-Mg': {
    Element: 'BS%-Mg',
    ValueUnit: '%',
  },
  'BS-Mg': {
    Element: 'BS-Mg',
    ValueUnit: 'meq/(100.g)',
  },
  'MG_PCT': {
    Element: 'BS%-Mg',
    ValueUnit: '%',
  },
  'MG_SAT': {
    Element: 'BS-Mg',
    ValueUnit: 'meq/(100.g)',
  },
  '%Mg Sat': {
    Element: 'BS%-Mg',
    ValueUnit: '%',
  },
  'BS%-K': {
    Element: 'BS%-K',
    ValueUnit: '%',
  },
  'BS-K': {
    Element: 'BS-K',
    ValueUnit: 'meq/(100.g)',
  },
  'K_PCT': {
    Element: 'BS%-K',
    ValueUnit: '%',
  },
  'K_SAT': {
    Element: 'BS-K',
    ValueUnit: 'meq/(100.g)',
  },
  '%K Sat': {
    Element: 'BS%-K',
    ValueUnit: '%',
  },
  'BS%-Na': {
    Element: 'BS%-Na',
    ValueUnit: '%',
  },
  'BS-Na': {
    Element: 'BS-Na',
    ValueUnit: 'meq/(100.g)',
  },
  'NA_PCT': {
    Element: 'BS%-Na',
    ValueUnit: '%',
  },
  'NA_SAT': {
    Element: 'BS-Na',
    ValueUnit: 'meq/(100.g)',
  },
  '%Na Sat': {
    Element: 'BS%-Na',
    ValueUnit: '%',
  },
  '%H Sat': {
    Element: 'BS%-H',
    ValueUnit: '%',
  },
  'BS%-H': {
    Element: 'BS%-H',
    ValueUnit: '%',
  },
  'BS-H': {
    Element: 'BS-H',
    ValueUnit: 'meq/(100.g)',
  },
  'H_PCT': {
    Element: 'BS%-H',
    ValueUnit: '%',
  },
  'H_SAT': {
    Element: 'BS-H',
    ValueUnit: 'meq/(100.g)',
  },
  'Sulfate-S ppm S': {
    Element: 'SO4-S',
    ValueUnit: '[ppm]',
  },
  'SO4-S': {
    Element: 'SO4-S',
    ValueUnit: '[ppm]',
  },
  'S sulfur': {
    Element: 'S',
    ValueUnit: '[ppm]',
  },
  'S': {
    Element: 'S',
    ValueUnit: '[ppm]',
  },
  'Zinc ppm Zn': {
    Element: 'Zn',
    ValueUnit: '[ppm]',
  },
  'Zn': {
    Element: 'Zn',
    ValueUnit: '[ppm]',
  },
  'Zn zinc': {
    Element: 'Zn',
    ValueUnit: '[ppm]',
  },
  'Manganese ppm Mn': {
    Element: 'Mn',
    ValueUnit: '[ppm]',
  },
  'Mn': {
    Element: 'Mn',
    ValueUnit: '[ppm]',
  },
  'Mn manganese': {
    Element: 'Mn',
    ValueUnit: '[ppm]',
  },
  'Boron ppm B': {
    Element: 'B',
    ValueUnit: '[ppm]',
  },
  'B': {
    Element: 'B',
    ValueUnit: '[ppm]',
  },
  'B boron': {
    Element: 'B',
    ValueUnit: '[ppm]',
  },
  'Iron ppm Fe': {
    Element: 'Fe',
    ValueUnit: '[ppm]',
  },
  'Iron': {
    Element: 'Fe',
    ValueUnit: '[ppm]',
  },
  'Fe Iron': {
    Element: 'Fe',
    ValueUnit: '[ppm]',
  },
  'Fe': {
    Element: 'Fe',
    ValueUnit: '[ppm]',
  },
  'Cu copper': {
    Element: 'Cu',
    ValueUnit: '[ppm]',
  },
  'Cu': {
    Element: 'Cu',
    ValueUnit: '[ppm]',
  },
  'Copper ppm': {
    Element: 'Cu',
    ValueUnit: '[ppm]',
  },
  'Excess Lime': {
    Element: 'Lime Rec',
  },
  'Lime Rec': {
    Element: 'Lime Rec',
  },
  'WRDF Buffer pH': {
    Element: 'B-pH (W)',
  },
  'BpH (W)': {
    Element: 'BpH (W)',
  },
  '1:1 S Salts mmho/cm': {
    ValueUnit: 'mmho/cm',
    Element: 'SS',
  },
  'SS': {
    ValueUnit: 'mmho/cm',
    Element: 'SS',
  },
  'Nitrate-N ppm N': {
    Element: 'NO3-N',
    ValueUnit: '[ppm]',
  },
  'Nitrate': {
    Element: 'NO3-N',
    ValueUnit: '[ppm]',
  },
  'NO3-N': {
    Element: 'NO3-N',
    ValueUnit: '[ppm]',
  },
  'Ni nickel': {
    Element: 'Ni',
    ValueUnit: '[ppm]',
  },
  'Ni': {
    Element: 'Ni',
    ValueUnit: '[ppm]',
  },
  'Sodium ppm Na': {
    Element: 'Na',
    ValueUnit: '[ppm]',
  },
  'Na sodium': {
    Element: 'Na',
    ValueUnit: '[ppm]',
  },
  'Na': {
    Element: 'Na',
    ValueUnit: '[ppm]',
  },
  'Sodium': {
    Element: 'Na',
    ValueUnit: 'cmol/kg',
  },
  'Aluminium ppm Al': {
    Element: 'Al',
    ValueUnit: '[ppm]',
  },
  'Al': {
    Element: 'Al',
    ValueUnit: '[ppm]',
  },
  'Al aluminium': {
    Element: 'Al',
    ValueUnit: '[ppm]',
  },
  'Aluminium': {
    Element: 'Al',
    ValueUnit: '[ppm]',
  },
  'As arsenic': {
    Element: 'As',
    ValueUnit: '[ppm]',
  },
  'As': {
    Element: 'As',
    ValueUnit: '[ppm]',
  },
  'Chloride ppm Cl': {
    Element: 'Cl',
    ValueUnit: '[ppm]',
  },
  'Cl': {
    Element: 'Cl',
    ValueUnit: '[ppm]',
  },
  'Total N ppm': {
    Element: 'TN',
    ValueUnit: '[ppm]',
  },
  'TN': {
    Element: 'TN',
    ValueUnit: '[ppm]',
  },
  'Total Nitrogen^': {
    Element: 'TN',
    ValueUnit: '%',
  },
  'Total P ppm': {
    Element: 'TP',
    ValueUnit: '[ppm]',
  },
  '% Sand': {
    Element: 'Sand',
    ValueUnit: '%',
  },
  'Sand': {
    Element: 'Sand',
    ValueUnit: '%',
  },
  '% Silt': {
    Element: 'Silt',
    ValueUnit: '%',
  },
  'Silt': {
    Element: 'Silt',
    ValueUnit: '%',
  },
  '% Clay': {
    Element: 'Clay',
    ValueUnit: '%',
  },
  'Clay': {
    Element: 'Clay',
    ValueUnit: '%',
  },
  'Texture': {
    Element: 'Texture',
  },
  'Texture*': {
    Element: 'Texture',
  },
  'Bulk Density': {
    Element: 'Bulk Density',
    ValueUnit: 'g/cm3',
  },
  'Organic Carbon %': { // Ward, from TomKat data
    Element: 'TOC',
    ValueUnit: '%',
  },
  'Total Org Carbon': {
    Element: 'TOC',
    ValueUnit: '%',
  },
  'TOC': {
    Element: 'TOC',
    ValueUnit: '%',
  },
  'TN (W)': {
    Element: 'TN (W)',
    ValueUnit: '[ppm]',
  },
  'Water Extractable Total N': {
    Element: 'TN (W)',
    ValueUnit: '[ppm]',
  },
  'TC (W)': {
    Element: 'TC (W)',
    ValueUnit: '[ppm]',
  },
  'Water Extractable Total C': {
    Element: 'TC (W)',
    ValueUnit: '[ppm]',
  },
  'Moisture (Grav)': {
    Element: 'Moisture (Grav)',
    ValueUnit: '%',
  },
  'TC': {
    Element: 'TC',
    ValueUnit: '[ppm]',
  },

  // A&L West CSV (Semios)
  // Open Questions:
  // - verify units
  // - is the "P" in "HCO3_P" an HCO3 Saturated Paste or PPM or %?
  // - is "K_PCT" (and other _PCT's) just K in mg/kg or in %?
  // - Add support for EX__LIME-style things that are the lab's assessment of the lime level (VH, H, L, VL).
  //   Modus supports those kind of assessments, but need to lookup how they were represented
  // - Molybdenum, Aluminum, SO4-S, SAR, CO3 in Modus requires extraction method, don't know it here.
  // - Assuming B_SAT is Base Saturation - Boron, but Modus does not have BS-B
  // - Need to verify units on EC: used dS/m from Modus, but there are 4 options
  // - I do not know what "SAT_PCT" means, need to add it here.
  // - What does "TYPE" mean?  It is the number 5 in at least one sheet

  // Some answers after learning about things:
  // 1) I think any time we see K_PCT and other _PCTs, it is Base Saturation as
  // a percent of total CEC). When we see _SAT, it is in units of meq/100g rather
  // than as a percent. These cannot be readily converted to mg/kg without
  // knowing the molecular weight (and charge valence of the molecule).
  // 2) Surely B_SAT should be added to the nomenclature.
  // 3) Could SAT_PCT be related to soil moisture? Seems odd amongst all of the
  // chemistry data, but maybe they find out while running the tests. See:
  // https://anlab.ucdavis.edu/analysis/Soils/200
  // 4) I think HCO3_P is the Olsen P test so I mapped it as such
  'ENR': {
    Element: 'ENR',
    ValueUnit: '[ppm]',
  },
  'P1': {
    Element: 'P (Bray P1 1:10)',
    ValueUnit: '[ppm]',
  },
  'P (Bray P2 1:10)': {
    Element: 'P (Bray P2 1:10)',
    ValueUnit: '[ppm]',
  },
  'P2': {
    Element: 'P (Bray P2 1:10)',
    ValueUnit: '[ppm]',
  },
  'HCO3_P': {
    Element: 'P (Olsen)',//'HCO3 (SP)', // is "P" saturated paste or PPM or %?
    ValueUnit: '[ppm]',
  },
  'HCO3': { //Bicarbonate is often tested in soils, but there is a small chance this is another way of saying HCO3_P/Olsen
    Element: 'HCO3',
    ValueUnit: '[ppm]',
  },
  'PH': {
    Element: 'pH',
  },
  'MG': {
    Element: 'Mg',
    ValueUnit: '[ppm]',
  },
  'CA': {
    Element: 'Ca',
    ValueUnit: '[ppm]',
  },
  'NA': {
    Element: 'Na',
    ValueUnit: '[ppm]',
  },
  'B-Ph': {
    Element: 'B-Ph',
  },
  'BUFFER_PH': {
    Element: 'B-pH',
  },
  'H': {
    Element: 'H',
    ValueUnit: '[ppm]',
  },
  'NO3_N': {
    Element: 'NO3-N',
    ValueUnit: '[ppm]',
  },
  'ZN': {
    Element: 'Zn',
    ValueUnit: '[ppm]',
  },
  'MN': {
    Element: 'Mn',
    ValueUnit: '[ppm]',
  },
  'FE': {
    Element: 'Fe',
    ValueUnit: '[ppm]',
  },
  'CU': {
    Element: 'Cu',
    ValueUnit: '[ppm]',
  },
  'S__SALTS': {
    Element: 'SS', // "Soluble Salts"
    ValueUnit: 'mmho/cm', // was previously ppm; changed per A&L Labs West pdf
  },
  'CL': {
    Element: 'Cl',
    ValueUnit: '[ppm]',
  },
  'MO': {
    Element: 'Mo', // Molybdenum.
    ValueUnit: '[ppm]',
  },
  'AL': {
    Element: 'Al', // Aluminum
    ValueUnit: '[ppm]',
  },
  'BS-B': {
    Element: 'BS-B', // Added this. Modus does not have this element
    ValueUnit: 'meq/(100.g)',
  },
  'BS%-B': {
    Element: 'BS%-B', // Added this. Modus does not have this element
    ValueUnit: '%',
  },
  'B_SAT': {
    Element: 'BS-B', // Base Saturation - Boron?  Modus does not have this element.
    ValueUnit: 'meq/(100.g)',
  },
  'B_PCT': {
    Element: 'BS%-B', // Base Saturation - Boron?  Modus does not have this element.
    ValueUnit: '%',
  },
  '%B Sat': {
    Element: 'BS%-B', // Added this. Modus does not have this element
    ValueUnit: '%',
  },
  'ESP': {
    Element: 'ESP', // Exchangeable Sodium Percentage
    ValueUnit: '%',
  },
  'NH4': {
    Element: 'NH4-N',
    ValueUnit: '[ppm]',
  },
  'SO4_S': {
    Element: 'SO4-S',
    ValueUnit: '[ppm]',
  },
  'SAR': {
    Element: 'SAR', // Sodium Adsorption Ratio
  },
  'EC': {
    Element: 'EC',
    ValueUnit: 'dS/m', // Just guessed that this is the one, need to verify. Sam: The pdf example didn't have EC
  },
  'SAT_PCT': {
    Element: 'SAT_PCT', // I have no idea what this is, passing it through verbatim
    ValueUnit: '%',
  },
  'CO3': {
    Element: 'CO3',
    ValueUnit: '[ppm]',
  },
};
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

function labMatches({
  lab,
  headers,
} : {
  lab: LabConfig
  headers: string[],
}) : boolean {
  return lab.headers.every((header: string) => headers.indexOf(header) > -1)
}

export function autoDetectLabConfig(headers: string[]) : LabConfig | undefined {
  let match = Object.values(labConfigs).find(lab => labMatches({lab, headers}));
  if (match) {
    info(`Recognized sheet as lab: ${match!.name}`);
  } else {
    warn(`Problem autodetecting lab. No matches found while autodetecting based on column headers (to automatically set units). See docs to manually specify unit overrides.`);
  }
  return match
}

// This takes an mappings in the lab configs and sets modus values
// If multiple columns map to the same modus, take the last defined one.
function handleModusMappers() {
  //1. Split on [*] and iterate over the parent?
}