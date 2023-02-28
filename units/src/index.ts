// Functions to auto-detect types and convert a batch of files into an array of Modus JSON's,
// with suggested output filenames.  Just give each input file a filename whose extension
// reflects its type, and
import debug from 'debug';
import { standardUnits } from '@modusjs/airtable';
import type { NutrientResults } from '@oada/types/modus/v1/global.js';
import type { SetRequired } from 'type-fest';

import ucum from '@lhncbc/ucum-lhc';

const error = debug('@modusjs/units:error');
const warn = debug('@modusjs/units:warn');
const info = debug('@modusjs/units:info');
const trace = debug('@modusjs/units:trace');

const needMolecularWeight = 'The molecular weight of the substance represented by the units is required to perform the conversion';
const BASEPAT = /^Base Saturation - /;

type oadaNutrientResult = NutrientResults[0];
export type NutrientResult = SetRequired<oadaNutrientResult, 'Element'>;

export function convertUnits(
  from: NutrientResult | NutrientResult[],
  to?: Units,
  strict?: boolean,
): NutrientResult[] {
  from = Array.isArray(from) ? from : [from];
  from = convertBaseSat(from);

  to = appendStandardUnits(from, to);


  // Validate the input units
  from = validateUnits(from);
  // Validate the output units; keep 'to' as Units instead of NutrientResult[]
  to = Object.fromEntries(validateUnits(Object.entries(to).map(([k, vu]) => ({
    Element: k,
    ValueUnit: vu
  }))).map(v => [v.Element, v.ValueUnit]));

  let output = from.map((nr) => {
    let toUnit = to?.[nr.Element];
    if (!nr.ValueUnit || !toUnit) {
      info(`No conversion performed on element [${nr.Element}]. The element is either unitless or the input/output units were unrecognized.`)
      return nr
    }
    trace(`convertUnits - Element [${nr.Element}]; from units [${nr.ValueUnit}] to units [${toUnit}]; Value: ${nr.Value}`);
    let result = ucum.UcumLhcUtils.getInstance().convertUnitTo(nr.ValueUnit, nr.Value || 0, toUnit, false);
    if (result.status !== 'succeeded') {
      if (result.msg.some((str: string) => str.includes(needMolecularWeight))) {
        let molElement = nr.Element.replace(/^Base Saturation - /, '');
        trace(`Molecular weight was needed for Element ${molElement}. Using value: ${molecularWeights[molElement].adjusted}`);
        result = ucum.UcumLhcUtils.getInstance().convertUnitTo(nr.ValueUnit, nr.Value || 0, toUnit, false, molecularWeights[nr.Element].adjusted);
      } else {
        warn(`Unit conversion for element [${nr.Element}] with input units [${nr.ValueUnit}] and output units [${toUnit}] failed with error: ${result.msg}. Falling back to input value and units.`);
        return nr;
      }
    }
    return {
      Element: nr.Element,
      ValueUnit: toUnit,
      Value: result.toVal || 0,
    }
  });

  if (strict) {
    output = output.filter((nr) => Object.keys(standardUnits).includes(nr.Element))
  }

  return output;
}

export function convertBaseSat(
  nutrientResults: NutrientResult[],
) : NutrientResult[] {
  let CEC = nutrientResults.find(v => v.Element === 'Cation Exchange Capacity');

  // No CEC, just leave the units alone
  if (CEC === undefined) {
    if (nutrientResults.some(v => BASEPAT.test(v.Element) && v.ValueUnit === '%')) {
      warn(`Base Saturation Elements require CEC in order to convert from % to meq/100g`)
    }
    return nutrientResults
  } else {
    return nutrientResults.map(nr => {
      if (BASEPAT.test(nr.Element) && nr.ValueUnit === '%') {
        return {
          ...nr,
          ValueUnit: 'meq/100 g',
          Value: nr.Value !== undefined && CEC!.Value !== undefined ?
            CEC!.Value/100*nr.Value : undefined
        }
      } else return nr
    });
  }
}

export function appendStandardUnits(from: NutrientResult[], to?: Units): Units {
  // For all froms without out tos, grab standard units
  if (to === undefined) to = {};
  from.forEach(nr => {
    if (!to?.[nr.Element]) to![nr.Element] = (standardUnits as unknown as Units)[nr.Element];
  })
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
      return nr;
    }
    if (nr.ValueUnit === undefined || nr.ValueUnit === '') {
      warn(`Units of element [${nr.Element}] were [${nr.ValueUnit}]. Keeping and ignoring unit validation.`);
      return nr;
    }
    //1. Check for aliases
    if (aliasToUcum(nr.ValueUnit)) {
      info(`Using alias units "${aliasToUcum(nr.ValueUnit)}" instead of "${nr.ValueUnit}" for element [${nr.Element}] in order to satisfy the conversion library.`)
      return {
        Element: nr.Element,
        ValueUnit: aliasToUcum(nr.ValueUnit),
        Value: nr.Value
      } as NutrientResult
    } else {
    //2. Validate against UCUM
      let result = ucum.UcumLhcUtils.getInstance().validateUnitString(nr.ValueUnit, true);
      if (result.status !== 'valid') {
        if (strict) throw new Error(`Units of element [${nr.Element}] were [${nr.ValueUnit}] and caused the following error: ${result.error ?? result.msg}.`);
        warn(`Units of element [${nr.Element}] were [${nr.ValueUnit}] and caused the following error: ${result.error ?? result.msg}. No unit conversion will be performed.`);
      }
    }
    return nr;
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