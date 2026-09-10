import type { ColorScheme } from './mapPrefs';
export type { ColorScheme };

export type HeatPoint = { lat: number; lon: number; value: number };

export type HeatFrame = {
  t: number;
  points: HeatPoint[];
};

export type HeatGrid = {
  width: number;
  height: number;
  south: number;
  west: number;
  north: number;
  east: number;
  values: Float32Array;
  mask: Uint8Array;
};

const GRID = 64;

export function monthIndex(iso: string): number {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

export function monthLabel(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function monthRange(minIso?: string, maxIso?: string): number[] {
  if (!minIso || !maxIso) return [];
  const start = monthIndex(minIso);
  const end = monthIndex(maxIso);
  if (end < start) return [start];
  const out: number[] = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
}

export function toTimestamp(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(t) ? 0 : t;
}

function percentile(values: number[], p: number): number {
  if (values.length < 1) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx]!;
}

export function valueDomain(values: number[]): { min: number; max: number } {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 1) return { min: 0, max: 1 };
  const min = percentile(finite, 2);
  const max = percentile(finite, 98);
  if (max <= min) return { min, max: min + 1 };
  return { min, max };
}

function medianNearestNeighbor(points: HeatPoint[]): number {
  if (points.length < 2) return 0.02;
  const dists: number[] = [];
  for (let i = 0; i < points.length; i += 1) {
    let best = Infinity;
    for (let j = 0; j < points.length; j += 1) {
      if (i === j) continue;
      const dlat = points[i]!.lat - points[j]!.lat;
      const dlon = points[i]!.lon - points[j]!.lon;
      const d = Math.hypot(dlat, dlon);
      if (d < best) best = d;
    }
    if (Number.isFinite(best)) dists.push(best);
  }
  dists.sort((a, b) => a - b);
  return dists[Math.floor(dists.length / 2)] || 0.02;
}

export function paddedBbox(points: HeatPoint[], pad = 0.12): { south: number; west: number; north: number; east: number } {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const p of points) {
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
    if (p.lon < west) west = p.lon;
    if (p.lon > east) east = p.lon;
  }
  if (!Number.isFinite(south)) return { south: 0, west: 0, north: 1, east: 1 };
  const dlat = Math.max(0.001, north - south);
  const dlon = Math.max(0.001, east - west);
  return {
    south: south - dlat * pad,
    west: west - dlon * pad,
    north: north + dlat * pad,
    east: east + dlon * pad,
  };
}

export function idwGrid(points: HeatPoint[], bbox: { south: number; west: number; north: number; east: number }, width = GRID, height = GRID): HeatGrid {
  const values = new Float32Array(width * height);
  const mask = new Uint8Array(width * height);
  if (points.length < 1) return { width, height, ...bbox, values, mask };
  const maxDist = Math.max(medianNearestNeighbor(points) * 2.5, 0.0005);
  const maxDist2 = maxDist * maxDist;
  const power = 2;
  const dlat = bbox.north - bbox.south;
  const dlon = bbox.east - bbox.west;
  for (let y = 0; y < height; y += 1) {
    const lat = bbox.north - ((y + 0.5) / height) * dlat;
    for (let x = 0; x < width; x += 1) {
      const lon = bbox.west + ((x + 0.5) / width) * dlon;
      let wsum = 0;
      let vsum = 0;
      let hit = false;
      for (const p of points) {
        const dy = lat - p.lat;
        const dx = lon - p.lon;
        const d2 = dy * dy + dx * dx;
        if (d2 > maxDist2) continue;
        if (d2 < 1e-16) {
          vsum = p.value;
          wsum = 1;
          hit = true;
          break;
        }
        const w = 1 / Math.pow(Math.sqrt(d2), power);
        wsum += w;
        vsum += w * p.value;
        hit = true;
      }
      const i = y * width + x;
      if (hit && wsum > 0) {
        values[i] = vsum / wsum;
        mask[i] = 1;
      }
    }
  }
  return { width, height, ...bbox, values, mask };
}

export function lerpGrid(a: HeatGrid, b: HeatGrid, t: number): HeatGrid {
  const width = a.width;
  const height = a.height;
  const values = new Float32Array(width * height);
  const mask = new Uint8Array(width * height);
  const u = Math.max(0, Math.min(1, t));
  for (let i = 0; i < values.length; i += 1) {
    const am = a.mask[i];
    const bm = b.mask[i];
    if (am && bm) {
      values[i] = a.values[i]! * (1 - u) + b.values[i]! * u;
      mask[i] = 1;
    } else if (am) {
      values[i] = a.values[i]!;
      mask[i] = 1;
    } else if (bm) {
      values[i] = b.values[i]!;
      mask[i] = 1;
    }
  }
  return { width, height, south: a.south, west: a.west, north: a.north, east: a.east, values, mask };
}

function lerpColor(a: number[], b: number[], t: number): [number, number, number] {
  return [
    Math.round(a[0]! + (b[0]! - a[0]!) * t),
    Math.round(a[1]! + (b[1]! - a[1]!) * t),
    Math.round(a[2]! + (b[2]! - a[2]!) * t),
  ];
}

const SEQUENTIAL = [
  [255, 247, 188],
  [254, 196, 79],
  [254, 133, 41],
  [119, 29, 0],
];

const DIVERGING = [
  [178, 24, 43],
  [253, 219, 199],
  [247, 247, 247],
  [199, 218, 235],
  [33, 102, 172],
];

const YELLOW = [255, 220, 40];
const GREEN = [46, 160, 67];
const RED = [196, 32, 32];

export type ColorDomain = {
  min: number;
  max: number;
  low?: number;
  high?: number;
};

function ramp(stops: number[][], t: number): [number, number, number] {
  const x = Math.max(0, Math.min(0.9999, t));
  const scaled = x * (stops.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  return lerpColor(stops[i]!, stops[i + 1] || stops[i]!, f);
}

export function isPhAnalyte(name: string): boolean {
  return /^ph$/i.test(name.trim());
}

function ygredColor(value: number, domain: ColorDomain): [number, number, number] {
  const min = domain.min;
  const max = domain.max;
  const low = domain.low ?? min + (max - min) * 0.35;
  const high = domain.high ?? min + (max - min) * 0.65;
  if (value <= low) {
    const span = low - min || 1;
    return lerpColor(YELLOW, GREEN, Math.max(0, Math.min(1, (value - min) / span)));
  }
  if (value <= high) return [GREEN[0]!, GREEN[1]!, GREEN[2]!];
  const span = max - high || 1;
  return lerpColor(GREEN, RED, Math.max(0, Math.min(1, (value - high) / span)));
}

export function colorFor(
  value: number,
  domain: ColorDomain,
  scheme: ColorScheme,
  ph: boolean,
): [number, number, number] {
  if (scheme === 'ygred') return ygredColor(value, domain);
  const t = (value - domain.min) / (domain.max - domain.min || 1);
  if (ph) return ramp(DIVERGING, t);
  return ramp(SEQUENTIAL, t);
}

export function gridToDataUrl(
  grid: HeatGrid,
  domain: ColorDomain,
  scheme: ColorScheme,
  ph: boolean,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = grid.width;
  canvas.height = grid.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(grid.width, grid.height);
  for (let i = 0; i < grid.values.length; i += 1) {
    const o = i * 4;
    if (!grid.mask[i]) {
      img.data[o + 3] = 0;
      continue;
    }
    const [r, g, b] = colorFor(grid.values[i]!, domain, scheme, ph);
    img.data[o] = r;
    img.data[o + 1] = g;
    img.data[o + 2] = b;
    img.data[o + 3] = 185;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}

export function surroundingFrames(frames: Array<{ t: number; grid: HeatGrid }>, t: number): { grid: HeatGrid } {
  if (frames.length < 1) {
    return { grid: { width: 1, height: 1, south: 0, west: 0, north: 1, east: 1, values: new Float32Array(1), mask: new Uint8Array(1) } };
  }
  if (frames.length === 1 || t <= frames[0]!.t) return { grid: frames[0]!.grid };
  const last = frames[frames.length - 1]!;
  if (t >= last.t) return { grid: last.grid };
  for (let i = 0; i < frames.length - 1; i += 1) {
    const a = frames[i]!;
    const b = frames[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      return { grid: lerpGrid(a.grid, b.grid, (t - a.t) / span) };
    }
  }
  return { grid: last.grid };
}

const cache = new Map<string, { frames: Array<{ t: number; grid: HeatGrid }>; bbox: HeatGrid }>();

export function framesForField(
  cacheKey: string,
  datedPoints: Array<{ t: number; points: HeatPoint[] }>,
): Array<{ t: number; grid: HeatGrid }> {
  const hit = cache.get(cacheKey);
  if (hit) return hit.frames;
  const allPoints = datedPoints.flatMap((frame) => frame.points);
  const bbox = paddedBbox(allPoints);
  const frames = datedPoints
    .slice()
    .sort((a, b) => a.t - b.t)
    .map((frame) => ({ t: frame.t, grid: idwGrid(frame.points, bbox) }));
  if (frames.length > 0) cache.set(cacheKey, { frames, bbox: frames[0]!.grid });
  return frames;
}

export function clearHeatCache() {
  cache.clear();
}
