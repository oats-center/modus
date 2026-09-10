/** Stable field identity across years. Strips trailing acreage, not names like "Back Lane 35". */
export function canonicalFieldKey(value: string | undefined): string {
  const stripped = stripAcreage(value);
  const slug = stripped
    .toLowerCase()
    .replace(/calloway/g, 'callaway')
    .replace(/fencedemaker/g, 'fencedmaker')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^month-/, 'mont-')
    .replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

export function displayFieldName(value: string | undefined): string {
  const stripped = stripAcreage(value);
  return stripped || 'Unknown field';
}

export function yearFromDate(date: string | undefined): string {
  const match = String(date || '').match(/^(\d{4})/);
  return match?.[1] || 'unknown-year';
}

export function stripAcreage(value: string | undefined): string {
  return String(value || '')
    .replace(/\s*[-–—]\s*\d+(?:\.\d+)?\.?\s*a(?:c(?:res?)?)?\s*$/i, '')
    .replace(/\s*[-–—]\s*\d+\.\d+\.?\s*$/i, '')
    .replace(/\s+\d+(?:\.\d+)?\s*ac(?:res?)?\s*$/i, '')
    .trim();
}
