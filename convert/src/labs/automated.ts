import debug from 'debug';
import type { LabConfig } from './index.js';
import { labConfigs } from './index.js';

const info = debug('@modusjs/convert#labs-automated:info');
const trace = debug('@modusjs/convert#labs-automated:trace');
const warn = debug('@modusjs/convert#labs-automated:warn');
const error = debug('@modusjs/convert#labs-automated:error');

// Attempt to generate a lab config based on finding matches with all existing
// lab configs. Results may vary. Some other considerations:
// - non-descript headers could lead to incorrect mappings
// - some headers include units (e.g., "Magnesium ppm Mg" so we can assume units,
//   but others are more ambiguous (e.g., "MG") and while we recognize the
//   element, we shouldn't assume units or ModusTestIds
//
export function cobbleLabConfig(headers: string[]) {
  //1. Find modus mappings (non-analytes)
  let lcMappings = Object.values(labConfigs)
    .map(lc => Object.fromEntries(Object.entries(lc.analytes).map(([k, v]) => (
      [keysToUpperNoSpacesDashesOrUnderscores(k), v]
    ))))
  let mappings: LabConfig['mappings'] = {};
  headers.forEach((h) => {
    //Find potential matches
    let lcMatch = lcMappings.find(lc => lc?.[h])
    if (lcMatch !== undefined) mappings![h] = lcMatch[h]!;
  })
  let remaining = headers.filter(h => !mappings[h]);

  //2. Look for date column
  if (!Object.values(mappings).find(v => v === 'EventDate')) {
    let datecol = getDateColumn(headers);
    mappings[datecol] = "EventDate";
    remaining = remaining.filter(h => h !== datecol)
  }

  //3. Look for depth data columns

  //remaining = remaining.filter(h => h !== )

  let lcAnalytes = Object.values(labConfigs)
    .map(lc => Object.fromEntries(Object.entries(lc.analytes).map(([k, v]) => (
      [keysToUpperNoSpacesDashesOrUnderscores(k), v]
    ))))
  let analytes: LabConfig['analytes'] = {};
  remaining.forEach((h) => {
    //Find potential matches
    const copy = keysToUpperNoSpacesDashesOrUnderscores(h);
    let lcMatch = lcAnalytes.find(lc => lc[copy])
    if (lcMatch) analytes[h] = { Element: lcMatch[h]!.Element };
  })
  remaining = remaining.filter(h => !analytes[h])

  const units = Object.fromEntries(
    Object.entries(analytes).map(([key, val]) => ([key, val?.ValueUnit]))
  );


  if (remaining.length > 0) trace(`Remaining unrecognized headers:`, remaining)

  return {
    units,
    analytes,
    headers,
    name: 'automated',
    mappings,
  };
}

export function getDateColumn(headers: string[]): string {
  // Ensure we have a "date" column for this dataset
  let datecol = headers
    .sort()
    .find((name) => name.toUpperCase().match(/DATE/));
  if (headers.find((c) => c.match(/DATESUB/))) {
    trace(`Found DATESUB column, using that for date.`);
    datecol = 'DATESUB'; // A&L West Semios
    return datecol;
  } else {
    error('No date column in sheet, columns are:', headers);
    throw new Error(
      `Could not find a column containing 'date' in the name to use as the date in sheet.  A date is required.`
    );
  }
}




// Autodetect via headers being a perfect subset of a known lab, else cobble one
// together.
export function autoDetectLabConfig(headers: string[]) : LabConfig | undefined {
  let match = Object.values(labConfigs).find(lab => labMatches({lab, headers}));
  if (match) {
    info(`Recognized sheet as lab: ${match!.name}`);
    return match;
  } else {
    warn(`Problem autodetecting lab. Attempting to identify header matches ` +
      ` individually.`);
    return cobbleLabConfig(headers);
  }
}

function labMatches({
  lab,
  headers,
} : {
  lab: LabConfig
  headers: string[],
}) : boolean {
  return lab.headers.every((header: string) => headers.indexOf(header) > -1)
}

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

export function modusKeyToHeader(item: string, labConfig: LabConfig) : string | undefined {
  let match = Object.entries(labConfig.mappings).find(([_, v]) => v === item);
  return match?.[0];
}

// SampleID is what the soil sampler called it. SampleNumber is what the Lab
// calls that sample.
export function modusKeyToValue(row: any, item: string, labConfig: LabConfig) {
  let match = modusKeyToHeader(item, labConfig);
  if (match) return row[match].toString().trim();
  return '';
}