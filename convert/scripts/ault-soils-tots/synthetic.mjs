import { canonicalFieldKey } from './field.mjs';

const STABLE = [
  { keys: [/^ph$/i], weight: 1.2 },
  { keys: [/^om$/i, /organic/i], weight: 1.5 },
  { keys: [/^cec$/i], weight: 1.0 },
];

function toLocalMeters(points) {
  const lat0 = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lon0 = points.reduce((s, p) => s + p.lon, 0) / points.length;
  const mLat = 111320;
  const mLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return {
    lat0,
    lon0,
    mLat,
    mLon,
    xy: points.map((p) => ({
      ...p,
      x: (p.lon - lon0) * mLon,
      y: (p.lat - lat0) * mLat,
    })),
  };
}

function fromLocalMeters(local, x, y) {
  return {
    lat: local.lat0 + y / local.mLat,
    lon: local.lon0 + x / local.mLon,
  };
}

function kmeans(xy, k, iters = 40) {
  if (xy.length <= k) {
    return xy.map((_, i) => i);
  }
  const centers = xy.slice(0, k).map((p) => ({ x: p.x, y: p.y }));
  let labels = new Array(xy.length).fill(0);
  for (let iter = 0; iter < iters; iter += 1) {
    for (let i = 0; i < xy.length; i += 1) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c += 1) {
        const d = (xy[i].x - centers[c].x) ** 2 + (xy[i].y - centers[c].y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      labels[i] = best;
    }
    const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, n: 0 }));
    for (let i = 0; i < xy.length; i += 1) {
      const c = labels[i];
      sums[c].x += xy[i].x;
      sums[c].y += xy[i].y;
      sums[c].n += 1;
    }
    for (let c = 0; c < k; c += 1) {
      if (sums[c].n > 0) {
        centers[c].x = sums[c].x / sums[c].n;
        centers[c].y = sums[c].y / sums[c].n;
      }
    }
  }
  return labels;
}

function clusterMean(xy, labels, k, chemKey) {
  const acc = Array.from({ length: k }, () => ({ sum: 0, n: 0, x: 0, y: 0 }));
  for (let i = 0; i < xy.length; i += 1) {
    const c = labels[i];
    acc[c].x += xy[i].x;
    acc[c].y += xy[i].y;
    acc[c].n += 1;
    const v = xy[i].chem?.[chemKey];
    if (Number.isFinite(v)) {
      acc[c].sum += v;
    }
  }
  return acc.map((a) => ({
    x: a.n ? a.x / a.n : 0,
    y: a.n ? a.y / a.n : 0,
    n: a.n,
    mean: a.n ? a.sum / a.n : null,
  }));
}

function stableVector(values) {
  const vec = [];
  for (const spec of STABLE) {
    let found;
    for (const [name, value] of Object.entries(values || {})) {
      if (spec.keys.some((re) => re.test(String(name)))) {
        const n = Number(value);
        if (Number.isFinite(n)) {
          found = n;
          break;
        }
      }
    }
    vec.push(found);
  }
  return vec;
}

function stdDistance(a, b, weights) {
  let s = 0;
  let w = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] == null || b[i] == null) continue;
    const d = a[i] - b[i];
    s += weights[i] * d * d;
    w += weights[i];
  }
  return w ? s / w : 0;
}

function greedyAssign(cost) {
  const n = cost.length;
  const used = new Set();
  const order = [...Array(n).keys()].sort((a, b) => Math.min(...cost[a]) - Math.min(...cost[b]));
  const assign = Array(n).fill(-1);
  for (const i of order) {
    let best = -1;
    let bestV = Infinity;
    for (let j = 0; j < n; j += 1) {
      if (used.has(j)) continue;
      if (cost[i][j] < bestV) {
        bestV = cost[i][j];
        best = j;
      }
    }
    assign[i] = best;
    used.add(best);
  }
  return assign;
}

function sampleValues(sample) {
  const values = {};
  for (const result of Object.values(sample?.results || {})) {
    const name = result?.analyte;
    const n = Number(result?.value);
    if (name && Number.isFinite(n)) values[name] = n;
  }
  return values;
}

function sampleIdOf(sampleId, sample) {
  return String(sampleId || sample?.lab?.sampleid || sample?.source?.sampleid || '').trim();
}

/**
 * laterPoints: [{lat, lon, sampleId, values}]
 * samples: [[id, sample], ...]
 */
export function synthesizeGps({ laterPoints, samples, sameCountCopy = true }) {
  if (!laterPoints?.length || !samples?.length) return { placed: 0, mode: 'skip' };
  const n = samples.length;
  const m = laterPoints.length;
  if (sameCountCopy && n === m) {
    const byId = new Map(laterPoints.map((p) => [String(p.sampleId), p]));
    let placed = 0;
    for (const [id, sample] of samples) {
      const hit = byId.get(sampleIdOf(id, sample)) || byId.get(String(placed + 1));
      if (!hit) continue;
      sample.geolocation = { lat: hit.lat, lon: hit.lon };
      placed += 1;
    }
    return { placed, mode: 'copy-by-id' };
  }

  const local = toLocalMeters(laterPoints.map((p) => ({
    ...p,
    chem: p.values || {},
  })));
  const k = Math.min(n, local.xy.length);
  const labels = kmeans(local.xy, k);
  const weights = STABLE.map((s) => s.weight);
  const clusterVecs = [];
  const clusterXY = [];
  for (let c = 0; c < k; c += 1) {
    const members = local.xy.filter((_, i) => labels[i] === c);
    const meanVals = {};
    for (const spec of STABLE) {
      const nums = [];
      for (const mem of members) {
        for (const [name, value] of Object.entries(mem.chem || {})) {
          if (spec.keys.some((re) => re.test(String(name))) && Number.isFinite(value)) nums.push(value);
        }
      }
      if (nums.length) meanVals[spec.keys[0].source || 'x'] = nums.reduce((a, b) => a + b, 0) / nums.length;
    }
    // rebuild with same STABLE order
    const vec = STABLE.map((spec) => {
      const nums = [];
      for (const mem of members) {
        for (const [name, value] of Object.entries(mem.chem || {})) {
          if (spec.keys.some((re) => re.test(String(name))) && Number.isFinite(Number(value))) nums.push(Number(value));
        }
      }
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    });
    clusterVecs.push(vec);
    const x = members.reduce((s, p) => s + p.x, 0) / (members.length || 1);
    const y = members.reduce((s, p) => s + p.y, 0) / (members.length || 1);
    clusterXY.push({ x, y });
  }

  const sampleVecs = samples.map(([, sample]) => stableVector(sampleValues(sample)));
  const variance = sampleVecs[0]?.map((_, i) => {
    const nums = sampleVecs.map((v) => v[i]).filter((v) => v != null);
    if (nums.length < 2) return 0;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
  }) || [];
  const flat = variance.every((v) => v < 1e-6);
  const cost = sampleVecs.map((vec) => clusterVecs.map((cvec) => (flat ? 0 : stdDistance(vec, cvec, weights))));
  // If more samples than clusters, pad by repeating farthest lattice — handled by k = min(n, m)
  const assign = greedyAssign(cost.map((row) => {
    if (row.length >= n) return row;
    while (row.length < n) row.push(1e9);
    return row;
  }));

  let placed = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const cluster = assign[i];
    if (cluster == null || cluster < 0 || !clusterXY[cluster]) continue;
    const ll = fromLocalMeters(local, clusterXY[cluster].x, clusterXY[cluster].y);
    const sample = samples[i][1];
    sample.geolocation = {
      id: 'synthetic-from-grid',
      lat: ll.lat,
      lon: ll.lon,
    };
    placed += 1;
  }
  return { placed, mode: flat ? 'id-order-lattice' : 'chemistry-assign', fieldKey: canonicalFieldKey(samples[0]?.[1]?.source?.field?.name) };
}

export function attachMeasuredGps(slim, points) {
  const byId = new Map(points.map((p) => [String(p.sampleId), p]));
  let attached = 0;
  for (const [id, sample] of Object.entries(slim.samples || {})) {
    const keys = [id, sample?.lab?.sampleid, sample?.source?.sampleid].map((v) => String(v || '').trim()).filter(Boolean);
    const hit = keys.map((k) => byId.get(k)).find(Boolean);
    if (!hit) continue;
    sample.geolocation = { lat: hit.lat, lon: hit.lon };
    attached += 1;
  }
  return attached;
}
