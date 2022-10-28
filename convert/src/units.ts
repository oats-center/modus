// Functions to auto-detect types and convert a batch of files into an array of Modus JSON's,
// with suggested output filenames.  Just give each input file a filename whose extension
// reflects its type, and
import debug from 'debug';
import type { NutrientResult, nutrientColHeaders, UnitsOverrides } from './csv.js';
// @ts-ignore
import ucum from '@lhncbc/ucum-lhc';

const error = debug('@modusjs/convert#tojson:error');
const warn = debug('@modusjs/convert#tojson:error');
const info = debug('@modusjs/convert#tojson:info');
const trace = debug('@modusjs/convert#tojson:trace');

const needMolecularWeight = 'The molecular weight of the substance represented by the units is required to perform the conversion';

//TODO(s):
// 1) Consider automatically computing base saturation in different units or
// deciding which ones to support as standard (i.e., just BS%, not meq/100g)
// 2) Allow users to merge in just a subset of unit changes into the standard units
// or recognized units
// 3) Need some way to convert back from UCUM units to those that we'd prefer to
//    have in our MODUS outputs. E.g., [lb_av]/[acr_us] seems a bit ugly, so we
//    could map it back to lb/ac if we'd like.
//    TODO: make this take a NR or NR[] and check first.
export function convertUnits(
  from: NutrientResult[],
  to?: UnitsOverrides  //make this thing called a Unit and export that type
): NutrientResult[] {
  to = to || standardUnits;

  from = validateUnits(from);
  let toNr = validateUnits(Object.entries(to).map(([Element, ValueUnit]) => ({Element, ValueUnit, Value: undefined})));
  to = Object.fromEntries(toNr.map((nr) => ([nr.Element, nr.ValueUnit])));

  return from.map((nr) => {
    let toUnit = to?.[nr.Element];
    if (!toUnit) return nr
    trace(`Attempting to convert units for Element ${nr.Element} from ${nr.ValueUnit} to ${toUnit}; Value: ${nr.Value}`);
    let result = ucum.UcumLhcUtils.getInstance().convertUnitTo(nr.ValueUnit, nr.Value, toUnit, false);
    if (result.status !== 'succeeded') {
      if (result.msg.some((str: string) => str.includes(needMolecularWeight))) {
        trace(`Molecular weight was needed for Element ${nr.Element}. Using value: ${molecularWeights[nr.Element].adjusted}`);
        result = ucum.UcumLhcUtils.getInstance().convertUnitTo(nr.ValueUnit, nr.Value, toUnit, false, molecularWeights[nr.Element].adjusted);
      } else {
        warn(`Unit conversion for element ${nr.Element} failed with error: ${result.msg}`);
        warn(`Failed unit conversion for element [${nr.Element}]: input units: [${nr.ValueUnit}]; output units: [${toUnit}]. Falling back to input value and units.`);
        //TODO: Throw and make users specify unit_overrides or just pass it along
        //throw new Error(`Unit conversion for element ${nr.Element} failed with error: ${result.msg}`);
        return nr;
      }
    }
    return {
      Element: nr.Element,
      ValueUnit: toUnit,
      Value: result.toVal,
    }
  });
}

type UnitSpec = {
  Element: string;
  ValueUnit: string;
}

export type UnitsSpec = {
  [element: keyof typeof nutrientColHeaders] : UnitSpec
}

//TODO: I think we need to differentiate the 3 ways that CEC-related ions can
// be represented: ppm (i.e., absolute), meq/100g (i.e., charge-normalized), and
// % (i.e., charge-normalized, represented as a percent of total CEC). We need to
// capture this both in the elements list and here in the standard UnitsSpec. For
// example, the 'BS-K' element could mean base saturation in meq/100g or %. The
// A & L Labs csvs have headers for K, K_PCT and K_SAT, having units of ppm, %,
// and meq/100g, respectively. We can't just map both K_PCT and K_SAT to the
// element BS-K with units of %.
export const standardUnits : UnitsOverrides = {
  'OM': '%',
  'ENR': 'lb/ac',
  'P (Bray P1 1:10)': '[ppm]',
  'P (Bray P2 1:10)': '[ppm]',
  'HCO3_P': '[ppm]',
  'pH': '',
  'K': '[ppm]',
  'Mg': '[ppm]',
  'Ca': '[ppm]',
  'Na': '[ppm]',
  'B-pH': '',
  'H': 'meq/100g',
  'CEC': 'meq/100g',
  'BS%-K': '%', //Get rid of these (%). Just stick with one set of units
  'BS%-Mg': '%',
  'BS%-Ca': '%',
  'BS%-H': '%',
  'BS%-Na': '%',
  'BS-K': 'meq/100g',
  'BS-Mg': 'meq/100g',
  'BS-Ca': 'meq/100g',
  'BS-H': 'meq/100g',
  'BS-Na': 'meq/100g',
  'NO3_N': '[ppm]',
  'S': '[ppm]',
  'ZN': '[ppm]',
  'MN': '[ppm]',
  'FE': '[ppm]',
  'CU': '[ppm]',
  'B': '[ppm]',
  'EX__LIME': '',
  'S__SALTS': 'mmho/cm',
  'CL': '[ppm]',
  'MO': '[ppm]',
  'AL': '[ppm]',
  'ESP': '%',
  'NH4': '[ppm]',
  'SO4_S': '[ppm]',
  'SAR': '[ppm]',
  'EC': 'dS/m',
  'SAT_PCT': '%',
  'CO3': '[ppm]',
  'HCO3': '[ppm]',
}

// TODO: export this as to and from UCUM. Just make the from UCUM take the first
// result and order them as such.
// Some unit 'conversions' are in name only; Their values are equivalent.
// Also prepare the units for use in UCUM
const aliases : Record<string, string> = {
  'Sum of Cation me/100g': 'cmol/kg',
  'cmol(+)/kg': 'cmol/kg',
  'ppm': '[ppm]',
  'mmhos/cm': 'mmho/cm',
  'mg/kg': '[ppm]',
  'lb/ac': '[lb_av]/[acr_us]',
  'meq/100g': 'meq/(100.g)',
}

function validateUnits(nrs: NutrientResult[]): NutrientResult[] {
  // Take the ValueUnit and adjust it to be compatible with UCUM
  return nrs?.filter((nr) => !(nr.ValueUnit === '' || nr.ValueUnit === undefined || nr.ValueUnit === 'none'))
  .map((nr) => {
    //1. Check for aliases
    if (aliases[nr.ValueUnit]) {
      info(`Using alias units [${aliases[nr.ValueUnit]}] instead of [${nr.ValueUnit}] for element [${nr.Element}] in order to satisfy the conversion library.`)
      return {
        Element: nr.Element,
        ValueUnit: aliases[nr.ValueUnit],
        Value: nr.Value
      } as NutrientResult
    }
    return nr
  }).map((nr) => {
    //2. Validate against UCUM
    let result = ucum.UcumLhcUtils.getInstance().validateUnitString(nr.ValueUnit, true);
    if (result.status !== 'valid') {
      //TODO: Decide whether to error now and enforce the standard units,
      // which could be fixed by users via override or don't throw and let them
      // through
      warn(`Units of element [${nr.Element}] were [${nr.ValueUnit}] and caused the following error: ${result.error}. Falling back to input units.`);
      //throw new Error(`Units of element [${nr.Element}] were [${nr.ValueUnit}] and caused the following error: ${result.error}`);
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