export function stripAcreage(value) {
  return String(value || '')
    .replace(/\s*[-–—]\s*\d+(?:\.\d+)?\.?\s*a(?:c(?:res?)?)?\s*$/i, '')
    .replace(/\s*[-–—]\s*\d+\.\d+\.?\s*$/i, '')
    .replace(/\s+\d+(?:\.\d+)?\s*ac(?:res?)?\s*$/i, '')
    .trim();
}

export function normalizeFieldKey(value) {
  return canonicalFieldKey(value)
    .replace(/^month-/, 'mont-')
    .replace(/calloway/g, 'callaway')
    .replace(/fencedemaker/g, 'fencedmaker')
    .replace(/-+/g, '-');
}

export function canonicalFieldKey(value) {
  const slug = stripAcreage(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

export function yearFromDate(date) {
  const match = String(date || '').match(/^(\d{4})/);
  return match?.[1] || '';
}

export function fieldKeyFromShapefileName(name) {
  const base = String(name || '').replace(/^.*[\\/]/, '').replace(/\.(shp|dbf|shx|prj)$/i, '');
  const stripped = base
    .replace(/^Ault_Farms,_?Inc[_-]*/i, '')
    .replace(/^Ault_Farms_Inc[_-]*/i, '')
    .replace(/_Sampling.*$/i, '')
    .replace(/_SoilSampling.*$/i, '')
    .replace(/_Soil_Sampling.*$/i, '');
  const parts = stripped.split('_').filter(Boolean);
  if (parts.length < 2) return normalizeFieldKey(stripped.replace(/_/g, ' '));
  const rest = parts.slice(1).join(' ').replace(/\s+/g, ' ');
  return normalizeFieldKey(rest);
}

export function isSamplingShapefile(name) {
  const base = String(name || '').replace(/^.*[\\/]/, '');
  if (!/\.shp$/i.test(base)) return false;
  if (/11-52-0|0-0-60|Lime_Ag|Potash|MAP|BatchExport/i.test(base) && !/Sampling/i.test(base)) return false;
  return /Sampling_Soil|SoilSampling|Soil_Sampling/i.test(base);
}

export function yearFromShapefileName(name) {
  const text = String(name || '');
  const m = text.match(/(20(22|23|24|25))/);
  if (m) return m[1];
  const short = text.match(/Sampling(\d{2})/i) || text.match(/Soil_Sampling(\d{2})/i);
  if (short) return `20${short[1]}`;
  return '';
}

export function isResultPdf(name) {
  const base = String(name || '').replace(/^.*[\\/]/, '').toLowerCase();
  if (!base.endsWith('.pdf')) return false;
  if (base.includes('icon')) return false;
  if (base.includes('pk lime')) return false;
  if (base.includes('soil fertility')) return false;
  if (base.includes('fertilizer rec')) return false;
  if (base.includes('recommendation') && !base.includes('soil test')) return false;
  return true;
}
