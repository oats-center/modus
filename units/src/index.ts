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

type oadaNutrientResult = NutrientResults[0];
export type NutrientResult = SetRequired<oadaNutrientResult, 'Element'>;

export function convertUnits(
  from: NutrientResult | NutrientResult[],
  to?: Units,
  strict?: boolean,
): NutrientResult[] {
  from = Array.isArray(from) ? from : [from];
  to = appendStandardUnits(from, to);


  // Validate the input units
  from = validateUnits(from);
  // Validate the output units; keep 'to' as Units instead of NutrientResult[]
  validateUnits(Object.entries(to).map(([k, vu]) => ({
    Element: k,
    ValueUnit: vu
  })));

  let output = from.map((nr) => {
    let toUnit = to?.[nr.Element];
    if (!nr.ValueUnit || !toUnit) {
      info(`No conversion performed on element [${nr.Element}]. The element is either unitless or the input/output units were unrecognized.`)
      return nr
    }
    trace(`Attempting to convert units for Element ${nr.Element} from ${nr.ValueUnit} to ${toUnit}; Value: ${nr.Value}`);
    let result = ucum.UcumLhcUtils.getInstance().convertUnitTo(nr.ValueUnit, nr.Value || 0, toUnit, false);
    if (result.status !== 'succeeded') {
      if (result.msg.some((str: string) => str.includes(needMolecularWeight))) {
        trace(`Molecular weight was needed for Element ${nr.Element}. Using value: ${molecularWeights[nr.Element].adjusted}`);
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

export function appendStandardUnits(from: NutrientResult[], to?: Units): Units {
  // For all froms without out tos, grab standard units
  if (to === undefined) to = {};
  from.forEach(nr => {
    if (!to?.[nr.Element]) to![nr.Element] = (standardUnits as unknown as Units)[nr.Element];
  })
  return to;
}

/* These now come from airtable
 * export const standardUnits : Units = {
  'OM': '%',
  'ENR': '[lb_av]/[acr_us]',
  'P (Bray P1 1:10)': '[ppm]',
  'P (Bray P2 1:10)': '[ppm]',
  'HCO3_P': '[ppm]',
  'pH': '',
  'K': '[ppm]',
  'Mg': '[ppm]',
  'Ca': '[ppm]',
  'Na': '[ppm]',
  'B-pH': '',
  'H': 'meq/(100.g)',
  'CEC': 'meq/(100.g)',
  'BS%-K': '%', //Get rid of these (%). Just stick with one set of units
  'BS%-Mg': '%',
  'BS%-Ca': '%',
  'BS%-H': '%',
  'BS%-Na': '%',
  'BS-K': 'meq/(100.g)',
  'BS-Mg': 'meq/(100.g)',
  'BS-Ca': 'meq/(100.g)',
  'BS-H': 'meq/(100.g)',
  'BS-Na': 'meq/(100.g)',
  'NO3_N': '[ppm]',
  'S': '[ppm]',
  'Zn': '[ppm]',
  'Mn': '[ppm]',
  'Fe': '[ppm]',
  'Cu': '[ppm]',
  'B': '[ppm]',
  'Excess-Lime': '',
  'SS': 'mmho/cm',
  'Cl': '[ppm]',
  'Mo': '[ppm]',
  'Al': '[ppm]',
  'ESP': '%',
  'NH4': '[ppm]',
  'SO4-S': '[ppm]',
  'SAR': '[ppm]',
  'EC': 'dS/m',
  'Sat-Pct': '%',
  'CO3': '[ppm]',
  'HCO3': '[ppm]',
};
*/

// Some unit 'conversions' are in name only; Their values are equivalent.
// Also prepare the units for use in UCUM.
// For converting from UCUM back to the alias, order matters as the first alias
// will always be taken.
// TODO: create UCUM column in the airtable
export const aliases : Record<string, string | undefined> = {
  'g/cc': 'g/cm3',
  'bu/ac': '[bu_us]/[acr_us]',
  'Sum of Cation me/100g': 'cmol/kg',
  'cmol(+)/kg': 'cmol/kg',
  'ppm': '[ppm]',
  'mmhos/cm': 'mmho/cm',
  'mg/kg': '[ppm]',
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

/* Others from MODUS that are valid in UCUM (https://ucum.nlm.nih.gov/ucum-lhc/demo.html):
  %
  cmol
  cmol/kg
  dS/m
  g/cm3
  g/kg
  meq/L
  mg/kg
  mg/L
  ug/kg
  ug/L
Others from MODUS that are unclear:
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
const molecularWeights: Record<string, any> = {
  'Al': {
    'molecularWeight': 26.98,
    charge: 3,
    adjusted: 26.98/3,
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
    adjusted: 40.08/2,
  },
  'Cl': {
    'molecularWeight': 35.45,
    charge: -1,
    adjusted: 35.45
  },
  'Cu': {
    'molecularWeight': 63.556,
    charge: 2,
    adjusted: 63.546/2,
   },
   'Fe': {
     'molecularWeight': 55.85,
     charge: 2,
     adjusted: 55.85/2,
  },
  'HCO3': {
    'molecularWeight': 61.02,
    charge: -1,
    adjusted: 61.02,
  },
  'H': { //Using NH4 as I think that is the standard?
    'molecularWeight': 18.04,
    charge: 1,
    adjusted: 18.04/1,
  },
  'K': {
    'molecularWeight': 39.10,
    charge: 1,
    adjusted: 39.10,
  },
  'Mg': {
    'molecularWeight': 24.31,
    charge: 2,
    adjusted: 24.31/2,
  },
  'Mn': {
    'molecularWeight': 54.94,
    charge: 2,
    adjusted: 54.94/2,
  },
  'Mo': {
    'molecularWeight': 95.94,
    charge: -1,
    adjusted: 95.94,
  },
  'Na': {
    'molecularWeight': 22.99,
    charge: 1,
    adjusted: 22.99,
  },
  'NH-4': {
    'molecularWeight': 18.04,
    charge: 1,
    adjusted: 18.04/1,
  },
  'S': { //Using same as SO4 as I think that is the standard
    'molecularWeight': 96.06,
    charge: -2,
    adjusted: 96.06/2
  },
  'SO-4': {
    'molecularWeight': 96.06,
    charge: -2,
    adjusted: 96.06/2
  },
  'Zn': {
    'molecularWeight': 65.38,
    charge: 2,
    adjusted: 65.38/2,
  }
}

export type Units = Record<string, string | undefined>;