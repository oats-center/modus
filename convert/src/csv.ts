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
): ModusResult[] {

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
function parseTomKat({ wb }: { wb: xlsx.WorkBook }): ModusResult[] {

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
        if (!id) continue;
        pointmeta[id] = r;
      }
    }
  }

  // Start walking through all the sheets to grab the main data:
  const datasheets = wb.SheetNames.filter(sn => !isPointMetadataSheetname(sn));
  const ret: ModusResult[] = [];

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
      error('No date column in sheet', sheetname);
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
      const output: ModusResult | any = {
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
      const samples = event.EventSamples!.Soil!.SoilSamples!;

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
        samples.push(sample);

      } // end rows for this group
      try {
        assertModusResult(output);
      } catch(e: any) {
        error('assertModusResult failed for sheetname', sheetname, ', group date', date);
        throw oerror.tag(e, `Could not construct a valid ModusResult from sheet ${sheetname}, group date ${date}`);
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
type Depth = {
  DepthID?: number, // only the DepthRef has this, don't have it just from the row
  Name: string,
  StartingDepth: number,
  EndingDepth: number,
  ColumnDepth: number,
  DepthUnit: "cm" | "in",
};
function parseDepth(row: any): Depth {
  throw new Error('parseDepth NOT IMPLEMENTED');
}
function ensureDepthInDepthRefs(depth: Depth, depthrefs: Depth[]): number {
  throw new Error('ensureDepthInDepthRefs NOT IMPLEMENTED');
}
type NutrientResult = {
  Element: string,
  Value: number,
  ValueUnit: string,
};
function parseNutrientResults(row: any): NutrientResult[] {
  throw new Error('parseNutrientResults NOT IMPLEMENTED');
}
function parseSampleID(row: any): string {
  const copy = keysToUpperNoSpacesDashesOrUnderscores(row);
  return copy['POINTID'] || '';
}

// Make a WKT from point meta's Latitude_DD and Longitude_DD.  Do a "tolerant" parse so anything
// with latitude or longitude (can insensitive) or "lat" and "lon" or "long" would still get a WKT
function parseWKTFromPointMeta(meta: any): string {
  throw new Error('parseWKTFromPointMeta NOT IMPLEMENTED');
}

let nutrientColHeaders: Record<string,any> = {
  "1:1 Soil pH": {
    Element: "pH"
  },
  "pH": {
    Element: "pH",
  },
  "Organic Matter LOI %": {
    Element: "OM",
    ValueUnit: "%"
  },
  "Organic Matter": {
     Element: "OM",
     ValueUnit: "%"
  },
  "Olsen P ppm P": {
    Element: "P",
    ValueUnit: "ppm"
  },
  "Bray P-1 ppm P": {
    Element: "P",
    ValueUnit: "ppm"
  },
  "Olsen P": {
    Element: "P",
    ValueUnit: "ug/g"
  },
  "Potassium ppm K": {
    Element: "K",
    ValueUnit: "ppm"
  },
  "Potassium": {
    Element: "K",
    ValueUnit: "cmol(+)/kg"
  },
  "Calcium ppm Ca": {
    Element: "Ca",
    ValueUnit: "ppm"
  },
  "Calcium": {
    Element: "Ca",
    ValueUnit: "cmol(+)/kg"
  },
  "Magnesium ppm Mg": {
    Element: "Mg",
    ValueUnit: "ppm"
  },
  "Magnesium": {
    Element: "Mg",
    ValueUnit: "cmol(+)/kg"
  },
  "CEC/Sum of Cations me/100g": {
    Element: "CEC",
    ValueUnit: "Sum of Cations me/100g"
  },
  "CEC (Estimated)": {
    Element: "CEC",
    ValueUnit: "cmol(+)/kg"
  },
  "%Ca Sat": {
    Element: "BS-Ca",
    ValueUnit: "%"
  },
  "%Mg Sat": {
    Element: "BS-Mg",
    ValueUnit: "%"
  },
  "%K Sat": {
    Element: "BS-K",
    ValueUnit: "%"
  },
  "%Na Sat": {
    Element: "BS-Na",
    ValueUnit: "%"
  },
  "%H Sat": {
    Element: "BS-H",
    ValueUnit: "%"
  },
  "Sulfate-S ppm S": {
    Element: "SO4-S",
    ValueUnit: "ppm"
  },
  "Zinc ppm Zn": {
    Element: "Zn",
    ValueUnit: "ppm",
  },
  "Manganese ppm Mn": {
    Element: "Mn",
    ValueUnit: "ppm"
  },
  "Boron ppm B": {
    Element: "B",
    ValueUnit: "ppm"
  },
  "Iron ppm Fe": {
    Element: "Fe",
    ValueUnit: "ppm"
  },
  "Iron": {
    Element: "Fe",
    ValueUnit: "ppm"
  },
  "Copper ppm Mg": {
    Element: "Cu",
    ValueUnit: "ppm"
  },
  "Excess Lime": {
    Element: "Lime Rec",
  },
  "WRDF Buffer pH": {
    Element: "BpH",
  },
  "1:1 S Salts mmho/cm": {
    ValueUnit: "mmho/cm"
  },
  "Nitrate-N ppm N": {
    Element: "NO3-N",
    ValueUnit: "ppm"
  },
  "Nitrate": {
    Element: "NO3-N",
    ValueUnit: "ppm"
  },
  "Sodium ppm Na": {
    Element: "Na",
    ValueUnit: "ppm"
  },
  "Sodium": {
    Element: "Na",
    ValueUnit: "cmol(+)/kg"
  },
  "Aluminium ppm Na": {
    Element: "Al",
    ValueUnit: "ppm"
  },
  "Aluminium": {
    Element: "Al",
    ValueUnit: "ppm"
  },
  "Chloride ppm Na": {
    Element: "Cl",
    ValueUnit: "ppm"
  },
  "Total N ppm": {
    Element: "TN",
    ValueUnit: "ppm"
  },
  "Total Nitrogen^": {
    Element: "TN",
    ValueUnit: "%"
  },
  "Total P ppm": {
    Element: "TP",
    ValueUnit: "ppm"
  },
  "% Sand": {
    Element: "Sand",
    ValueUnit: "%"
  },
  "Sand": {
    ValueUnit: "%"
  },
  "% Silt": {
    Element: "Silt",
    ValueUnit: "%"
  },
  "Silt": {
    Element: "Silt",
    ValueUnit: "%",
  },
  "% Clay": {
    Element: "Clay",
    ValueUnit: "%"
  },
  "Clay": {
    Element: "Clay",
    ValueUnit: "%"
  },
  "Texture": {
    Element: "Texture",
  },
  "Texture*": {
    Element: "Texture",
  },
  "Bulk Density": {
    Element: "Bulk Density",
    ValueUnit: "g/cm3"
  },
  "Total Org Carbon": {
    Element: "TOC",
    ValueUnit: "%"
  },
  "Water Extractable Total N": {
    Element: "TN (W)",
    ValueUnit: "ppm"
  },
  "Water Extractable Total C": {
    Element: "TC (W)",
    ValueUnit: "ppm"
  }
}
  /*
       Element: "Total Microbial Biomass": ,
  "Total Bacteria Biomass": [],
  "Actinomycetes Biomass": [],
  "Gram (-) Biomass": [],
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

interface ElementMatcher {
string: {}
  units?: string;
}

function getElements(row: any, units?: any): any[] {
  return Object.keys(row)
    .filter(key => key in nutrientColHeaders)
    .map(key => ({
      Element: nutrientColHeaders[key].Element,
      // prioritize user-specified units (from "UNITS" row indicator) over
      // matcher-based units, else "none".
      ValueUnit: units[key] || nutrientColHeaders[key].ValueUnit || "none",
      Value: row[key]
    }))
}

function parseDepths() {

}
