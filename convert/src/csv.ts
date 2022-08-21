import debug from 'debug';
import * as xlsx from 'xlsx';
import oerror from '@overleaf/o-error';
import ModusResult, { assert as assertModusResult } from '@oada/types/modus/v1/modus-result.js';

const error = debug('@modusjs/convert#csv:error');
const warn = debug('@modusjs/convert#csv:error');
const info = debug('@modusjs/convert:info');
const trace = debug('@modusjs/convert:trace');

//--------------------------------------------------------------------------------------
// parse: wrapper function for particular parsing functions found down below.
//
// Ppssible input parameters for xlsx/csv parsing:
// Either give an already-parsed workbook, an entire CSV as a string, or an arraybuffer
function parse(
  { wb, str, arrbuf, format }:
  { 
    wb?: xlsx.WorkBook, 
    str?: string, 
    arrbuf?: ArrayBuffer,
    format: 'tomkat' | 'generic', // add others here as more become known
  }
): ModusResult {

  // Make sure we have an actual workbook to work with:
  if (!wb) {
    try {
      if (str) wb = xlsx.read(str, { type: 'string' });
      if (arrbuf) wb = xlsx.read(str, { type: 'array' });
    } catch(e: any) {
      throw oerror.tag(e, 'Failed to parse input data with xlsx/csv reader');
    }
  }
  if (!wb) {
    throw new Error('No readable input data found.');
  }

  switch (format) {
    case 'tomkat': return parseTomKat({ wb });
    default: 
      throw new Error(`format type ${format} not currently supported`);
  }
}


//-------------------------------------------------------------------------------------------
// Parse the specific spreadsheet with data from TomKat ranch provided at the 
// 2022 Fixing the Soil Health Tech Stack Hackathon.
function parseTomKat({ wb }: { wb: xlsx.WorkBook }): ModusResult {

  // Grab the point meta data out of any master sheet:
  // Any sheet whose name contains "point meta" regardless of spacing, case, or punctuation will be considered
  // point metadata.  i.e. 'Point Meta-Data'  would match as well as 'pointmetadata'
  const pointmeta: { [pointid: string]: any } = {}; // just build this as we go to keep code simpler
  // Split the sheet names into the metadata sheets and the data sheets
  const metadatasheets = wb.SheetNames.filter(isPointMetadataSheetname);
  if (metadatasheets) {
    for (const sheetname of metadatasheets) {
      // If you don't put { raw: false } for sheet_to_json, it will parse dates as ints instead of the formatted strings
      const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetname]!, { raw: false }).map(keysToUpperNoSpacesDashesOrUnderscores);
      for (const r of rows ) {
        const id = r['POINTID'];
        if (id) continue;
        pointmeta[id] = r;
      }
    }
  }

  // Start walking through all the sheets to grab the main data:
  const datasheets = wb.SheetNames.filter(sn => !isPointMetadataSheetname(sn));
  for (const sheetname of datasheets) {
    const sheet = wb.Sheets[sheetname]!;
    const allrows = xlsx.utils.sheet_to_json(sheet);

    // Grab the unit overrides and get rid of comment/units columns
    const unit_overrides = extractUnitOverrides(allrows);
    const rows = allrows.filter(isDataRow); 

    // Get a list of all the header names for future reference as needed.  Since objects that have no
    // value in a column might not have that column, we have to look through all the rows and accumulate
    // the unique set of names.
    const colnames_map: { [name: string]: true } = {};
    for (const r of rows) {
      for (const key of Object.keys(r as any)) {
        colnames_map[key] = true;
      }
    }
    const colnames = Object.keys(colnames_map);


    // Determine a "date" column for this dataset
    let datecol = colnames.sort().find(name => name.toUpperCase().match('DATE'));
    if (!datecol) {
      throw new Error(`Could not find a column containing 'date' in the name to use as the date in sheet ${sheetname}.  A date is required.`);
    }

    // Loop through all the rows and group them by that date.  This group will become a single ModusResult file.
    type DateGroupedRows = { [date: string]: any[] };
    const grouped_rows = rows.reduce((groups: DateGroupedRows, r: any) => {
      const date = r[datecol!]?.toString();
      if (!date) {
        warn('WARNING: row does not have the column we chose for the date (', datecol, '), the row is: ', r);
        return groups;
      }
      if (!groups[date]) groups[date] = [];
      groups[date]!.push(r);
      return groups;
    }, ({} as DateGroupedRows));

    // Now we can loop through all the groups and actually make the darn Modus file:
    for (const [date, g_rows] of Object.entries(grouped_rows)) {

      // Start to build the modus output, this is one "Event"
      const output: ModusResult = {
        Events: [{
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
        }],
      };

      const event = output.Events![0]!;
      const depthrefs = event.EventSamples!.Soil!.DepthRefs!;

      for (const [index, row] of g_rows.entries()) {
        // Grab the "depth" for this sample:
        const depth = parseDepth(row); // SAM: need to write this to figure out a Depth object
        const DepthID = ensureDepthInDepthRefs(depth, depthrefs); // mutates depthrefs if missing, returns depthid
        const NutrientResults = parseNutrientResults(row);
        const id = parseSampleID(row);
        const meta = pointmeta[id] || {}; // where does the pointmeta go again (Latitude_DD, Longitude_DD, Field, Acreage, etc.)

        const sample: any = {
          SampleMetaData: {
            SampleNumber: index,
            ReportID: id,
          },
          Depths: [
            { DepthID, NutrientResults }
          ]
        };
        if (meta) {
          const wkt = parseWKTFromPointMeta(meta);
          if (wkt) {
            sample.SampleMetaData.Geometry = wkt;
          }
        }

      // Grab the unique depthref's from spreadsheet
      output.Events![0].EventSamples.Soil.DepthRefs = rows.map((obj:any) => ({
        StartingDepth: obj["B Depth"],
        EndingDepth: obj["E Depth"],
        ColumnDepth: obj["E Depth"] - obj["B Depth"],
        DepthUnit: "in" //????Not documented in the example
      }))
  .filter((v: any, i: number, s: any[]) => s.indexOf(v) === i)
  .sort((a, b) => a.StartingDepth > b.StartingDepth ? 1 : -1)
  .map((v, i) => ({
    ...v,
    DepthID: i,
    Name: `Depth-${i}`
  }))

  let minDate = rows.reduce((min, obj) => {
    if (!obj['Date Recd']) return min; // no date on this object
    const thisdate = new Date(+(obj['Date Recd']));
    return (thisdate < min ? thisdate : min);
  }, 0);

  rows.forEach((row: any, i) => {
  //@ts-ignore
    output.Events[0]!.EventSamples.Soil.SoilSamples.push({
      SampleMetaData: {
        SampleNumber: i.toString(),
        ReportID: row["Sample ID"],
        NutrientResults: [{
          Element: "pH",
          Value: row["1:1 Soil pH"],
          ValueUnit: "none"
        }, {
          Element: "OM",
          Value: row["Organic Matter LOI %"],
          ValueUnit: "%"
        }, {
          Element: "P",
          Value: row["Olsen P ppm P"],
          ValueUnit: "ppm"
        }, {
          Element: "K",
          Value: row["Potassium ppm K"],
          ValueUnit: "ppm"
        }, {
          Element: "Ca",
          Value: row["Calcium ppm Ca"],
          ValueUnit: "ppm"
        }, {
          Element: "Mg",
          Value: row["Magnesium ppm Mg"],
          ValueUnit: "ppm"
        }, {
          Element: "CEC",
          Value: row["CEC/Sum of Cations me/100g"],
          ValueUnit: "Sum of Cations me/100g",     //TODO
        }, {
          Element: "BS-Ca",
          Value: row["%Ca Sat"],
          ValueUnit: "%"
        }, {
          Element: "BS-Mg",
          Value: row["%Mg Sat"],
          ValueUnit: "%"
        }, {
          Element: "BS-K",
          Value: row["%K Sat"],
          ValueUnit: "%"
        }, {
          Element: "BS-Na",
          Value: row["%Na Sat"],
          ValueUnit: "%"
        }, {
          Element: "BS-H",
          Value: row["%H Sat"],
          ValueUnit: "%"
        }, {
          Element: "SO4-S",
          Value: row["Sulfate-S ppm S"],
          ValueUnit: "ppm"
        }, {
          Element: "Zn",
          Value: row["Zinc ppm Zn"],
          ValueUnit: "ppm"
        }, {
          Element: "Mn",
          Value: row["Manganese ppm Mn"],
          ValueUnit: "ppm"
        }, {
          Element: "B",
          Value: row["Boron ppm B"],
          ValueUnit: "none"
        }, {
          Element: "Fe",
          Value: row["Iron ppm Mg"],
          ValueUnit: "ppm"
        }, {
          Element: "Cu",
          Value: row["Copper ppm Mg"],
          ValueUnit: "ppm"
        }, {
          Element: "Lime Rec",
          Value: row["Excess Lime"],
          ValueUnit: "none" //TODO
        }, {
          Element: "BpH",
          Value: row["WRDF Buffer pH"],
          ValueUnit: "none"
        }, {
          Element: "SS",
          Value: row["1:1 S Salts mmho/cm"],
          ValueUnit: "mmho/cm"
        }, {
          Element: "NO3-N",
          Value: row["Nitrate-N ppm N"],
          ValueUnit: "ppm"
        }, {
          Element: "P",
          Value: row["Bray P-1 ppm P"],
          ValueUnit: "ppm"
        }, {
          Element: "Na",
          Value: row["Sodium ppm Na"],
          ValueUnit: "ppm"
        }, {
          Element: "Al",
          Value: row["Aluminium ppm Na"],
          ValueUnit: "ppm"
        }, {
          Element: "Cl",
          Value: row["Chloride ppm Na"],
          ValueUnit: "ppm"
        }, {
          Element: "TN",
          Value: row["Total N ppm"],
          ValueUnit: "ppm"
        }, {
          Element: "TP",
          Value: row["Total P ppm"],
          ValueUnit: "ppm"
        }, {
          Element: "Sand",
          Value: row["% Sand"],
          ValueUnit: "%"
        }, {
          Element: "Silt",
          Value: row["% Silt"],
          ValueUnit: "%"
        }, {
          Element: "Clay",
          Value: row["% Clay"],
          ValueUnit: "%"
        }, {
          Element: "Texture",
          Value: row["Texture"],
          ValueUnit: "none"
        }]
      }
    })

  })
}




// Return a new object where all keys are the upper-case equivalents of keys from input object.
function keysToUpperNoSpacesDashesOrUnderscores(obj: any) {
  const ret: any = {};
  for (const [key, val] of Object.entries(obj)) {
    const newkey = key.toUpperCase().replace(/[ -_]*/,'')
    ret[newkey] = typeof val === 'object' ? keysToUpperNoSpacesDashesOrUnderscores(val) : val;
  }
  return ret;
}

function isPointMetadataSheetname(name: string) {
  return name.replace(/[ -_,]*/,'').toUpperCase().match('POINTMETA');
}

type UnitsOverrides = { [colname: string]: string };
function extractUnitOverrides(rows: any[]) {
  const overrides: UnitsOverrides = {};
  const unitrows = rows.filter(isUnitRow);
  // There really should only be one units row
  for (const r of unitrows) {
    for (const [key, val] of r) {
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
  return !isCommentRow(row) && !isUnitRow(row);
}
function isCommentRow(row: any): boolean {
  return !!Object.values(row).find(val => typeof val === 'string' && val.trim() === 'COMMENT');
}
function isUnitRow(row: any): boolean {
  return !!Object.values(row).find(val => typeof val === 'string' && val.trim() === 'UNITS');
}

// Make a WKT from point meta's Latitude_DD and Longitude_DD.  Do a "tolerant" parse so anything
// with latitude or longitude (can insensitive) or "lat" and "lon" or "long" would still get a WKT
function parseWKTFromPointMeta(meta: any) {
}
