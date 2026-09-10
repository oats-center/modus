/**
 * Midwest field-crop soil-test interpretation used for the map legend.
 *
 * Anchors:
 * - A&L Great Lakes “Explanation of a Soil Analysis Report” (P1 20–30 ppm,
 *   P2 40–60 ppm, K 120–170 ppm for most field crops).
 * - Tri-State Fertilizer Recommendations (Culman et al. 2020) maintenance
 *   ranges for corn/soy on loam/clay: Mehlich-3 P 20–40 ppm, K 120–170 ppm
 *   (Bray P1 / AA-K used by A&L Fort Wayne are treated as equivalent here).
 * - A&L % base saturation guidance: Ca 40–80, Mg 10–40, K 1–5.
 * - Texture/OM notes from A&L report explainers (mineral soils).
 *
 * `min`/`max` bound the color scale. `low`/`high` are the optimal / medium band
 * (green on the yellow–green–red scheme).
 */
export type AnalyteRange = {
  id: string;
  min: number;
  low: number;
  high: number;
  max: number;
  units: string;
};

const RANGES: AnalyteRange[] = [
  { id: 'ph', min: 5.0, low: 6.0, high: 6.8, max: 8.0, units: 'none' },
  { id: 'bph', min: 6.0, low: 6.4, high: 7.0, max: 7.5, units: 'none' },
  { id: 'om', min: 0.5, low: 2.0, high: 4.0, max: 8.0, units: '%' },
  { id: 'p', min: 5, low: 20, high: 150, max: 250, units: 'ppm' },
  { id: 'p2', min: 10, low: 40, high: 60, max: 120, units: 'ppm' },
  { id: 'k', min: 50, low: 120, high: 170, max: 300, units: 'ppm' },
  { id: 'mg', min: 25, low: 100, high: 250, max: 500, units: 'ppm' },
  { id: 'ca', min: 200, low: 500, high: 2000, max: 4000, units: 'ppm' },
  { id: 'cec', min: 2, low: 8, high: 20, max: 40, units: 'meq/100g' },
  { id: 's', min: 3, low: 8, high: 20, max: 40, units: 'ppm' },
  { id: 'zn', min: 0.5, low: 1.5, high: 5, max: 15, units: 'ppm' },
  { id: 'mn', min: 5, low: 15, high: 40, max: 80, units: 'ppm' },
  { id: 'fe', min: 5, low: 15, high: 40, max: 80, units: 'ppm' },
  { id: 'cu', min: 0.2, low: 0.6, high: 2, max: 5, units: 'ppm' },
  { id: 'b', min: 0.2, low: 0.5, high: 1.2, max: 3, units: 'ppm' },
  { id: 'na', min: 0, low: 10, high: 40, max: 150, units: 'ppm' },
  { id: 'bsca', min: 20, low: 40, high: 80, max: 95, units: '%' },
  { id: 'bsmg', min: 5, low: 10, high: 30, max: 45, units: '%' },
  { id: 'bsk', min: 0.5, low: 2, high: 5, max: 10, units: '%' },
  { id: 'bsh', min: 0, low: 0, high: 20, max: 40, units: '%' },
  { id: 'bsna', min: 0, low: 0, high: 5, max: 15, units: '%' },
];

function compact(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

const ALIASES: Record<string, string> = {
  ph: 'ph',
  soilph: 'ph',
  bph: 'bph',
  bufferph: 'bph',
  sikora: 'bph',
  om: 'om',
  organicmatter: 'om',
  som: 'om',
  p: 'p',
  phosphorus: 'p',
  brayp1: 'p',
  bray1: 'p',
  bray1equiv: 'p',
  p1: 'p',
  pbrayp11to10: 'p',
  p2: 'p2',
  strongbray: 'p2',
  brayp2: 'p2',
  k: 'k',
  potassium: 'k',
  mg: 'mg',
  magnesium: 'mg',
  ca: 'ca',
  calcium: 'ca',
  cec: 'cec',
  cationexchangecapacity: 'cec',
  s: 's',
  sulfur: 's',
  so4s: 's',
  sulfate: 's',
  zn: 'zn',
  zinc: 'zn',
  mn: 'mn',
  manganese: 'mn',
  fe: 'fe',
  iron: 'fe',
  cu: 'cu',
  copper: 'cu',
  b: 'b',
  boron: 'b',
  na: 'na',
  sodium: 'na',
  bsca: 'bsca',
  cabs: 'bsca',
  basesaturationca: 'bsca',
  bsmg: 'bsmg',
  mgbs: 'bsmg',
  basesaturationmg: 'bsmg',
  bsk: 'bsk',
  kbs: 'bsk',
  basesaturationk: 'bsk',
  bsh: 'bsh',
  hbs: 'bsh',
  basesaturationh: 'bsh',
  bsna: 'bsna',
  nabs: 'bsna',
};

const BY_ID = new Map(RANGES.map((range) => [range.id, range]));

export function matchAnalyteRange(name: string): AnalyteRange | undefined {
  const key = compact(name);
  const id = ALIASES[key];
  if (id) return BY_ID.get(id);
  if (key.includes('organicmatter') || key === 'om') return BY_ID.get('om');
  if (key.includes('phosphorus') || key.includes('brayp1')) return BY_ID.get('p');
  if (key.includes('potassium') && !key.includes('sat') && !key.includes('bs') && !key.includes('%')) return BY_ID.get('k');
  if (key.includes('buffer')) return BY_ID.get('bph');
  if (key === 'ph' || key.endsWith('ph') && key.includes('soil')) return BY_ID.get('ph');
  if (key.includes('cationexchange') || key === 'cec') return BY_ID.get('cec');
  if (key.includes('calcium') && (key.includes('sat') || key.includes('bs') || key.includes('pct'))) return BY_ID.get('bsca');
  if (key.includes('magnesium') && (key.includes('sat') || key.includes('bs') || key.includes('pct'))) return BY_ID.get('bsmg');
  return undefined;
}
