// Functions to auto-detect types and convert a batch of files into an array of Modus JSON's,
// with suggested output filenames.  Just give each input file a filename whose extension
// reflects its type, and
import debug from 'debug';
import { standardUnits } from '@modusjs/industry';
import type { NutrientResults } from '@oada/types/modus/v1/global.js';
import type { Merge, SetRequired } from 'type-fest';

import ucum from '@lhncbc/ucum-lhc';

const error = debug('@modusjs/units:error');
const warn = debug('@modusjs/units:warn');
const info = debug('@modusjs/units:info');
const trace = debug('@modusjs/units:trace');

const needMolecularWeight = 'The molecular weight of the substance represented by the units is required to perform the conversion';
const BASEPAT = /^Base Saturation - /;

type oadaNutrientResult = NutrientResults[0];
type NR = SetRequired<oadaNutrientResult, 'Element'>;
type UVU = {
  UCUM_ValueUnit?: string | undefined;
  CsvHeader?: string | undefined;
  ModusTestIDv2?: string | undefined;
}
export type NutrientResult = Merge<NR, UVU>;

export function convertUnits(
  from: NutrientResult | NutrientResult[],
  to?: NutrientResult | NutrientResult[],
  strict?: boolean,
): NutrientResult[] {
  from = Array.isArray(from) ? from : [from];
  to = to === undefined ? [] : (Array.isArray(to) ? to : [to]);

  to = appendStandardUnits(from, to);


  // Validate the input units
  from = validateUnits(from);
  // Validate the output units; keep 'to' as Units instead of NutrientResult[]
  to = validateUnits(to);

  let output = from.map((nr, i) => {
    let toNr = (to![i] as NutrientResult);
    if (!toNr.UCUM_ValueUnit || !nr.UCUM_ValueUnit) {
      info(`No conversion performed on element [${nr.Element}]. The element is either unitless or the input/output units were unrecognized.`)
      return nr
    }
    trace(`convertUnits - Element [${nr.Element}]; from units [${nr.UCUM_ValueUnit}] to units [${toNr.UCUM_ValueUnit}]; Value: ${nr.Value}`);
    let result = ucum.UcumLhcUtils.getInstance().convertUnitTo(nr.UCUM_ValueUnit, nr.Value || 0, toNr.UCUM_ValueUnit, false);
    if (result.status !== 'succeeded') {
      if (result.msg.some((str: string) => str.includes(needMolecularWeight))) {
        if (BASEPAT.test(nr.Element) && ['%', 'meq/(100.g)'].includes(nr.UCUM_ValueUnit)) {
          return convertBaseSat(from as NutrientResult[], nr, toNr);
        }
        let molElement = nr.Element.replace(/^Base Saturation - /, '');
        trace(`Molecular weight was needed for Element ${molElement}. Using value: ${molecularWeights[molElement].adjusted}`);
        result = ucum.UcumLhcUtils.getInstance().convertUnitTo(nr.UCUM_ValueUnit, nr.Value || 0, toNr.UCUM_ValueUnit, false, molecularWeights[nr.Element].adjusted);
        return {
          ...nr,
          ValueUnit: toNr.ValueUnit,
          Value: result.toVal || 0,
        }
      } else {
        warn(`Unit conversion for element [${nr.Element}] with input units [${nr.ValueUnit}] and output units [${toNr.UCUM_ValueUnit}] failed with error: ${result.msg}. Falling back to input value and units.`);
        return nr;
      }
    }
    return {
      ...nr,
      ValueUnit: toNr.ValueUnit,
      Value: result.toVal || 0,
    }
  })
  output = output.map(nr => {
    delete nr.CsvHeader;
    delete nr.UCUM_ValueUnit;
    return nr;
  })

  if (strict) {
    // @ts-ignore
    output = output.filter((nr) => Object.keys(standardUnits).includes(nr.ModusTestIDv2))
  }

  return output;
}

export function convertBaseSat(
  nutrientResults: NutrientResult[],
  from: NutrientResult,
  to: NutrientResult
) : NutrientResult {
  let CEC = nutrientResults.find(v => v.Element === 'Cation Exchange Capacity' && v.UCUM_ValueUnit === 'meq/(100.g)');

  // No CEC, just leave the units alone
  if (CEC === undefined) {
    warn(`Base Saturation Elements require CEC in order to convert between % and meq/100g`)
    return from
  } else {
    return from.UCUM_ValueUnit === '%' ?
      {
        ...from,
        ValueUnit: 'meq/100 g',
        UCUM_ValueUnit: 'meq/(100.g)',
        Value: from.Value !== undefined && CEC!.Value !== undefined ?
          CEC!.Value*(from.Value/100) : undefined
      } : {
        ...from,
        ValueUnit: to.ValueUnit,
        UCUM_ValueUnit: to.UCUM_ValueUnit,
        Value: from.Value !== undefined && CEC!.Value !== undefined ?
          100*from.Value/CEC!.Value : undefined
      }
  };
}

export function appendStandardUnits(from: NutrientResult[], to: NutrientResult[]): NutrientResult[] {
  // For all froms without out tos, grab standard units
  to = from.map((nr) => {
    let match = to.find(toNr => toNr.CsvHeader === nr.CsvHeader);
    if (match) {
      info(`Conversion supplied for csv header ${nr.CsvHeader}, so modus standard units will not be used.`)
      return match;
    } else {
      // @ts-ignore
      return nr.ModusTestIDv2 ? standardUnits[nr.ModusTestIDv2] : nr
    }
  });
  return to;
}

// Some unit 'conversions' are in name only; Their values are equivalent.
// Also prepare the units for use in UCUM.
// For converting from UCUM back to the alias, order matters as the first alias
// will always be taken.
export const aliases : Record<string, string | undefined> = {
  'g/cc': 'g/cm3',
  'bu/ac': '[bu_us]/[acr_us]',
  'Sum of Cation me/100g': 'meq/(100.g)',
  'cmol(+)/kg': 'cmol/kg',
  'ppm': '[ppm]',
  'mmhos/cm': 'mmho/cm',
  //'mg/kg': '[ppm]',
  'lb': '[lb_av]',
  'lb/ac': '[lb_av]/[acr_us]',
  'kg/ac': 'kg/[acr_us]',
  'kg/ha': 'kg/har', //see "hectare" @ https://ucum.org/ucum
  'kg/ha/day': 'kh/har/d',
  'meq/100g': 'meq/(100.g)',
  'meq/100 g': 'meq/(100.g)',
  '% BS': '%',
  '% CEC': '%',
  'million lb/ac': '(1000000.[lb_av])/[acr_us]',
  'lb/ac/day': '[lb_av]/[acr_us]/d',
  'kg/ac/day': 'kg/[acr_us]/d',
  'in/ft': '[in_i]/[ft_i]',
  'tons/ac': '[ston_av]/[acr_us]',
  'standard unit': undefined,
  's.u.': undefined,

/* Others from MODUS that are unclear:
  none
  's.u.'
  'standard units'
  'in/depth'
  'million lb/ac depth': '(1000000.[lb_av])/[acr_us]',
*/
}

export function aliasToUcum(from : keyof typeof aliases): string | undefined {
  return aliases[from];
}

// This one should not be used often. The conversion back will generally use the
// units string supplied as input rather than use this function.
export function aliasFromUcum(ucumStr: typeof aliases[keyof typeof aliases]): string | undefined {
  if (ucumStr === undefined) return undefined;
  const reverseAliases = Object.fromEntries(
    Object.entries(aliases)
    .map(([key, val]) => ([val, key]))
  )
  return reverseAliases[ucumStr];
}


// Either convert ValueUnits to known aliases or utilize UCUM's validation tools.
// If undefined or empty string, just keep those units; They'll be kept later.
export function validateUnits(nrs: NutrientResult[], strict?: boolean): NutrientResult[] {
  return nrs?.map((nr) => {
    if (nr.ValueUnit === 'none') {
      nr.UCUM_ValueUnit = nr.ValueUnit;
      return nr;
    }
    if (nr.ValueUnit === undefined || nr.ValueUnit === '') {
      warn(`Units of element [${nr.Element}] were [${nr.ValueUnit}]. Keeping and ignoring unit validation.`);
      return {
        ...nr,
        UCUM_ValueUnit: undefined,
      }
    }
    //1. Check for aliases
    if (aliasToUcum(nr.ValueUnit)) {
      trace(`Using alias units "${aliasToUcum(nr.ValueUnit)}" instead of "${nr.ValueUnit}" for element [${nr.Element}] in order to satisfy the conversion library.`)
      return {
        ...nr,
        UCUM_ValueUnit: aliasToUcum(nr.ValueUnit),
      }
    } else {
    //2. Validate against UCUM
      let result = ucum.UcumLhcUtils.getInstance().validateUnitString(nr.ValueUnit, true);
      if (result.status !== 'valid') {
        if (strict) throw new Error(`Units of element [${nr.Element}] were [${nr.ValueUnit}] and caused the following error: ${result.error ?? result.msg}.`);
        warn(`Units of element [${nr.Element}] were [${nr.ValueUnit}] and caused the following error: ${result.error ?? result.msg}. No unit conversion will be performed.`);
      }
    }
    return {
      ...nr,
      UCUM_ValueUnit: nr.ValueUnit
    }
  })
}

// C. HOPKNS CaFe ClZn; MoB CuMn Mg.
// For conversion from cmol/kg to ppm, molecular weight must be specified. For
// soil cations, also account for the number of charges per cation (i.e., K+
// fersus Al+++).
//
// In hindsight, I think these conversions should only be necessary for certain
// cations (Ca, Mg, Na, K, H, Zn, Al, Fe, Mn, Cu)
//
// In further hindsight, these conversions should only be necessary going from
// from an element to its base-saturation representation, which are considered
// different elements in modus anyways (though some may argue its just a unit
// conversion). The real unit conversion that might be necessary when dealing
// with base saturation is from % to meq/100g which requires CEC rather than
// a straight conversion using UCUM. The more important task is to prune those
// labs that present both _SAT and _PCT representations of base saturation.
export const molecularWeights: Record<string, any> = {
  'Al': {
    'molecularWeight': 26.98,
    charge: 3,
    adjusted: 3/26.98,
  },
  'B': {
    molecularWeight: 10.811,
    charge: 1,
    adjusted: 10.811
  },
  'C': {
    molecularWeight: 12.01,
    charge: 1,
    adjusted: 12.01
  },
  'Ca': {
    'molecularWeight': 40.08,
    charge: 2,
    adjusted: 2/40.08, //this number doesn't appear to jive with ALWest sample2.csv
  },
  'Cl': {
    'molecularWeight': 35.45,
    charge: -1,
    adjusted: 35.45
  },
  'Cu': {
    'molecularWeight': 63.556,
    charge: 2,
    adjusted: 2/63.546,
   },
   'Fe': {
     'molecularWeight': 55.85,
     charge: 2,
     adjusted: 2/55.85,
  },
  'HCO3': {
    'molecularWeight': 61.02,
    charge: -1,
    adjusted: 61.02,
  },
  'H': { //Using NH4 as I think that is the standard?
    'molecularWeight': 18.04,
    charge: 1,
    adjusted: 18.04,
  },
  'K': {
    'molecularWeight': 39.10,
    charge: 1,
    adjusted: 39.10,
  },
  'Mg': {
    'molecularWeight': 24.31,
    charge: 2,
    adjusted: 2/24.31,
  },
  'Mn': {
    'molecularWeight': 54.94,
    charge: 2,
    adjusted: 2/54.94,
  },
  'Mo': {
    'molecularWeight': 95.94,
    charge: -1,
    adjusted: 2/95.94,
  },
  'Na': {
    'molecularWeight': 22.99,
    charge: 1,
    adjusted: 22.99,
  },
  'NH-4': {
    'molecularWeight': 18.04,
    charge: 1,
    adjusted: 18.04,
  },
  'S': { //Using same as SO4 as I think that is the standard
    'molecularWeight': 96.06,
    charge: -2,
    adjusted: 2/96.06,
  },
  'SO-4': {
    'molecularWeight': 96.06,
    charge: -2,
    adjusted: 2/96.06,
  },
  'Zn': {
    'molecularWeight': 65.38,
    charge: 2,
    adjusted: 2/65.38,
  }
}

export type Units = Record<string, string | undefined>;