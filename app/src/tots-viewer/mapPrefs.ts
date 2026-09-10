export type ColorScheme = 'current' | 'ygred';
export type RangeType = 'standard' | 'minmax' | 'custom';

export type CustomRange = { min: number; max: number };

export type MapPrefs = {
  colorScheme: ColorScheme;
  rangeType: RangeType;
  showDots: boolean;
  customRanges: Record<string, CustomRange>;
};

export const MAP_PREFS_KEY = 'modus.totsMap';

export const defaultMapPrefs: MapPrefs = {
  colorScheme: 'current',
  rangeType: 'standard',
  showDots: false,
  customRanges: {},
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isCustomRange(value: unknown): value is CustomRange {
  if (!value || typeof value !== 'object') return false;
  const row = value as { min?: unknown; max?: unknown };
  return isFiniteNumber(row.min) && isFiniteNumber(row.max);
}

export function isMapPrefs(value: unknown): value is MapPrefs {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<MapPrefs>;
  if (row.colorScheme !== 'current' && row.colorScheme !== 'ygred') return false;
  if (row.rangeType !== 'standard' && row.rangeType !== 'minmax' && row.rangeType !== 'custom') return false;
  if (row.showDots !== undefined && typeof row.showDots !== 'boolean') return false;
  if (row.customRanges === undefined) return true;
  if (!row.customRanges || typeof row.customRanges !== 'object' || Array.isArray(row.customRanges)) return false;
  for (const [key, range] of Object.entries(row.customRanges)) {
    if (typeof key !== 'string' || !isCustomRange(range)) return false;
  }
  return true;
}

function removeBadKey() {
  try {
    localStorage.removeItem(MAP_PREFS_KEY);
  } catch {
    // ignore quota / privacy-mode failures
  }
}

export function loadMapPrefs(): MapPrefs {
  try {
    const raw = localStorage.getItem(MAP_PREFS_KEY);
    if (!raw) return { ...defaultMapPrefs, customRanges: {} };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      removeBadKey();
      return { ...defaultMapPrefs, customRanges: {} };
    }
    if (!isMapPrefs(parsed)) {
      removeBadKey();
      return { ...defaultMapPrefs, customRanges: {} };
    }
    return {
      colorScheme: parsed.colorScheme,
      rangeType: parsed.rangeType,
      showDots: parsed.showDots === true,
      customRanges: { ...(parsed.customRanges || {}) },
    };
  } catch {
    return { ...defaultMapPrefs, customRanges: {} };
  }
}

export function saveMapPrefs(prefs: MapPrefs) {
  try {
    localStorage.setItem(MAP_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function clearMapPrefs() {
  removeBadKey();
}
