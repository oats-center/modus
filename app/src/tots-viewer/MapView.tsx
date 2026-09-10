import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GpsPoint, SoilIndex } from './indexFromSlim';
import { defaultAnalyte } from './indexFromSlim';
import { matchAnalyteRange } from './analyteRanges';
import {
  clearMapPrefs,
  defaultMapPrefs,
  loadMapPrefs,
  saveMapPrefs,
  type ColorScheme,
  type MapPrefs,
  type RangeType,
} from './mapPrefs';
import {
  colorFor,
  framesForField,
  gridToDataUrl,
  isPhAnalyte,
  monthLabel,
  monthRange,
  surroundingFrames,
  toTimestamp,
  valueDomain,
  type ColorDomain,
  type HeatGrid,
  type HeatPoint,
} from './heatmap';

type Props = {
  index: SoilIndex;
};

type OverlaySpec = {
  key: string;
  url: string;
  bounds: L.LatLngBoundsExpression;
};

function FitBounds({ points }: { points: GpsPoint[] }) {
  const map = useMap();
  const sig = points.map((p) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join('|');
  useEffect(() => {
    if (points.length < 1) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds.pad(0.18));
  }, [map, sig]);
  return null;
}

function HeatOverlays({ overlays }: { overlays: OverlaySpec[] }) {
  const map = useMap();
  const layers = useRef<Map<string, L.ImageOverlay>>(new Map());
  useEffect(() => {
    const keep = new Set(overlays.map((item) => item.key));
    for (const [key, layer] of layers.current) {
      if (!keep.has(key)) {
        layer.remove();
        layers.current.delete(key);
      }
    }
    for (const spec of overlays) {
      const existing = layers.current.get(spec.key);
      if (existing) {
        existing.setUrl(spec.url);
        existing.setBounds(spec.bounds as L.LatLngBounds);
      } else {
        const layer = L.imageOverlay(spec.url, spec.bounds, { opacity: 0.72, interactive: false });
        layer.addTo(map);
        layers.current.set(spec.key, layer);
      }
    }
  }, [map, overlays]);
  useEffect(() => () => {
    for (const layer of layers.current.values()) layer.remove();
    layers.current.clear();
  }, [map]);
  return null;
}

function Legend({
  domain,
  ph,
  analyte,
  scheme,
  rangeType,
  hasStandard,
  customMin,
  customMax,
  showDots,
  onScheme,
  onRangeType,
  onCustomMin,
  onCustomMax,
  onShowDots,
  onReset,
}: {
  domain: ColorDomain;
  ph: boolean;
  analyte: string;
  scheme: ColorScheme;
  rangeType: RangeType;
  hasStandard: boolean;
  customMin: string;
  customMax: string;
  showDots: boolean;
  onScheme: (value: ColorScheme) => void;
  onRangeType: (value: RangeType) => void;
  onCustomMin: (value: string) => void;
  onCustomMax: (value: string) => void;
  onShowDots: (value: boolean) => void;
  onReset: () => void;
}) {
  const stops = 8;
  const colors = Array.from({ length: stops }, (_, i) => {
    const v = domain.min + (i / (stops - 1)) * (domain.max - domain.min);
    const [r, g, b] = colorFor(v, domain, scheme, ph);
    return `rgb(${r},${g},${b})`;
  });
  return (
    <div className="tots-legend">
      <div className="tots-legend-title">{analyte}</div>
      <div className="tots-legend-bar" style={{ background: `linear-gradient(to right, ${colors.join(',')})` }} />
      <div className="tots-legend-scale">
        <span>{formatLegend(domain.min)}</span>
        {domain.low !== undefined && domain.high !== undefined ? (
          <span>{formatLegend(domain.low)}–{formatLegend(domain.high)}</span>
        ) : <span />}
        <span>{formatLegend(domain.max)}</span>
      </div>
      <label className="tots-legend-field">
        Colors
        <select value={scheme} onChange={(evt) => onScheme(evt.target.value as ColorScheme)}>
          <option value="current">Current (orange)</option>
          <option value="ygred">Yellow / green / red</option>
        </select>
      </label>
      <label className="tots-legend-field">
        Range
        <select value={rangeType} onChange={(evt) => onRangeType(evt.target.value as RangeType)}>
          <option value="standard" disabled={!hasStandard}>Standard{hasStandard ? '' : ' (unknown analyte)'}</option>
          <option value="minmax">Max / min (data)</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      {rangeType === 'custom' ? (
        <div className="tots-legend-custom">
          <label>
            Low
            <input type="number" step="any" value={customMin} onChange={(evt) => onCustomMin(evt.target.value)} />
          </label>
          <label>
            High
            <input type="number" step="any" value={customMax} onChange={(evt) => onCustomMax(evt.target.value)} />
          </label>
        </div>
      ) : null}
      <label className="tots-legend-check">
        <input type="checkbox" checked={showDots} onChange={(evt) => onShowDots(evt.target.checked)} />
        Show sample dots
      </label>
      <button type="button" className="tots-legend-reset" onClick={onReset}>Reset map preferences</button>
    </div>
  );
}

function formatLegend(n: number): string {
  if (Math.abs(n) >= 100) return String(Math.round(n));
  return String(Math.round(n * 100) / 100);
}

export default function MapView({ index }: Props) {
  const gpsFields = index.fields.filter((field) => field.hasGps);
  const [fieldKey, setFieldKey] = useState<string>('all');
  const [analyte, setAnalyte] = useState<string>('');
  const [month, setMonth] = useState<number | null>(null);
  const [prefs, setPrefs] = useState<MapPrefs>(() => loadMapPrefs());
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');

  const updatePrefs = (next: MapPrefs) => {
    setPrefs(next);
    saveMapPrefs(next);
  };

  const visibleYears = useMemo(() => {
    return index.fieldYears.filter((item) => item.hasGps && (fieldKey === 'all' || item.fieldKey === fieldKey));
  }, [index.fieldYears, fieldKey]);

  const points = useMemo(() => visibleYears.flatMap((item) => item.points), [visibleYears]);

  const analyteNames = useMemo(() => {
    const names = new Set<string>();
    for (const p of points) {
      for (const [name, value] of Object.entries(p.values)) {
        if (Number.isFinite(value)) names.add(name);
      }
    }
    return [...names];
  }, [points]);

  useEffect(() => {
    if (!analyte || !analyteNames.includes(analyte)) {
      setAnalyte(defaultAnalyte(analyteNames) || '');
    }
  }, [analyte, analyteNames]);

  const months = useMemo(() => {
    const dates = visibleYears.map((item) => item.date).filter(Boolean) as string[];
    dates.sort();
    return monthRange(dates[0], dates[dates.length - 1]);
  }, [visibleYears]);

  useEffect(() => {
    if (months.length < 1) {
      setMonth(null);
      return;
    }
    if (month === null || !months.includes(month)) setMonth(months[months.length - 1]!);
  }, [months, month]);

  const standard = analyte ? matchAnalyteRange(analyte) : undefined;

  useEffect(() => {
    const stored = analyte ? prefs.customRanges[analyte] : undefined;
    if (stored) {
      setCustomMin(String(stored.min));
      setCustomMax(String(stored.max));
      return;
    }
    if (standard) {
      setCustomMin(String(standard.min));
      setCustomMax(String(standard.max));
      return;
    }
    const vals: number[] = [];
    for (const p of points) {
      const v = analyte ? p.values[analyte] : undefined;
      if (typeof v === 'number' && Number.isFinite(v)) vals.push(v);
    }
    const data = valueDomain(vals);
    setCustomMin(String(data.min));
    setCustomMax(String(data.max));
  }, [analyte]);

  const domain = useMemo<ColorDomain>(() => {
    const vals: number[] = [];
    for (const p of points) {
      const v = analyte ? p.values[analyte] : undefined;
      if (typeof v === 'number' && Number.isFinite(v)) vals.push(v);
    }
    const data = valueDomain(vals);
    if (prefs.rangeType === 'custom') {
      const stored = analyte ? prefs.customRanges[analyte] : undefined;
      const min = stored?.min ?? Number(customMin);
      const max = stored?.max ?? Number(customMax);
      if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
        return { min, max };
      }
      return data;
    }
    if (prefs.rangeType === 'standard' && standard) {
      return { min: standard.min, max: standard.max, low: standard.low, high: standard.high };
    }
    return data;
  }, [points, analyte, prefs, standard, customMin, customMax]);

  const overlays = useMemo<OverlaySpec[]>(() => {
    if (!analyte || month === null) return [];
    const t = month;
    const byField = new Map<string, typeof visibleYears>();
    for (const item of visibleYears) {
      const list = byField.get(item.fieldKey) || [];
      list.push(item);
      byField.set(item.fieldKey, list);
    }
    const out: OverlaySpec[] = [];
    const ph = isPhAnalyte(analyte);
    const sliderMs = Date.UTC(Math.floor(t / 12), t % 12, 1);
    for (const [key, items] of byField) {
      const dated = items.map((item) => ({
        t: toTimestamp(item.date),
        points: item.points
          .map((p) => ({ lat: p.lat, lon: p.lon, value: p.values[analyte!] }))
          .filter((p): p is HeatPoint => typeof p.value === 'number' && Number.isFinite(p.value)),
      })).filter((frame) => frame.points.length > 0);
      if (dated.length < 1) continue;
      const cacheKey = `${key}|${analyte}|${dated.map((frame) => `${frame.t}:${frame.points.length}`).join(',')}`;
      const frames = framesForField(cacheKey, dated);
      const { grid } = surroundingFrames(frames, sliderMs);
      const url = gridToDataUrl(grid as HeatGrid, domain, prefs.colorScheme, ph);
      if (!url) continue;
      out.push({
        key,
        url,
        bounds: [[grid.south, grid.west], [grid.north, grid.east]],
      });
    }
    return out;
  }, [visibleYears, analyte, month, domain, prefs.colorScheme]);

  const currentLabel = month === null ? '' : monthLabel(month);

  if (!index.hasAnyGps) {
    return <div className="tots-empty">No sample GPS in the converted results, so the map is unavailable.</div>;
  }

  const center: [number, number] = points[0] ? [points[0].lat, points[0].lon] : [40.97, -86.18];

  return (
    <div className="tots-map">
      <div className="tots-map-controls">
        <label>
          Field
          <select value={fieldKey} onChange={(evt) => setFieldKey(evt.target.value)}>
            <option value="all">All</option>
            {gpsFields.map((field) => (
              <option key={field.key} value={field.key}>{field.label}</option>
            ))}
          </select>
        </label>
        <label>
          Analyte
          <select value={analyte} onChange={(evt) => setAnalyte(evt.target.value)}>
            {analyteNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="tots-map-canvas">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <FitBounds points={points} />
          <HeatOverlays overlays={overlays} />
          {prefs.showDots ? points.map((p) => {
            const value = analyte ? p.values[analyte] : undefined;
            const has = typeof value === 'number' && Number.isFinite(value);
            const [r, g, b] = has ? colorFor(value, domain, prefs.colorScheme, isPhAnalyte(analyte)) : [119, 29, 0];
            return (
              <CircleMarker
                key={`${p.fieldKey}-${p.date}-${p.sampleId}-${p.lat}-${p.lon}`}
                center={[p.lat, p.lon]}
                radius={5}
                pathOptions={{
                  color: '#fff',
                  weight: 1,
                  fillColor: `rgb(${r},${g},${b})`,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div>
                    <div><b>{p.fieldLabel}</b> · sample {p.sampleId}</div>
                    <div>{p.date}{p.synthetic ? ' · synthetic GPS' : ''}</div>
                    {has ? <div>{analyte}: {value}</div> : null}
                  </div>
                </Popup>
              </CircleMarker>
            );
          }) : null}
        </MapContainer>
        {analyte ? (
          <Legend
            domain={domain}
            ph={isPhAnalyte(analyte)}
            analyte={analyte}
            scheme={prefs.colorScheme}
            rangeType={prefs.rangeType}
            hasStandard={!!standard}
            customMin={customMin}
            customMax={customMax}
            showDots={prefs.showDots}
            onScheme={(colorScheme) => updatePrefs({ ...prefs, colorScheme })}
            onRangeType={(rangeType) => updatePrefs({ ...prefs, rangeType })}
            onShowDots={(showDots) => updatePrefs({ ...prefs, showDots })}
            onCustomMin={(value) => {
              setCustomMin(value);
              const min = Number(value);
              const max = Number(customMax);
              if (!analyte || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return;
              updatePrefs({
                ...prefs,
                rangeType: 'custom',
                customRanges: { ...prefs.customRanges, [analyte]: { min, max } },
              });
            }}
            onCustomMax={(value) => {
              setCustomMax(value);
              const min = Number(customMin);
              const max = Number(value);
              if (!analyte || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return;
              updatePrefs({
                ...prefs,
                rangeType: 'custom',
                customRanges: { ...prefs.customRanges, [analyte]: { min, max } },
              });
            }}
            onReset={() => {
              clearMapPrefs();
              const next = { ...defaultMapPrefs, customRanges: {} };
              setPrefs(next);
              if (standard) {
                setCustomMin(String(standard.min));
                setCustomMax(String(standard.max));
              }
            }}
          />
        ) : null}
      </div>
      <div className="tots-slider">
        <input
          type="range"
          min={months[0] ?? 0}
          max={months[months.length - 1] ?? 0}
          step={1}
          disabled={months.length < 2}
          value={month ?? months[0] ?? 0}
          onChange={(evt) => setMonth(Number(evt.target.value))}
        />
        <div className="tots-slider-label">{currentLabel || '—'}</div>
      </div>
      <div className="tots-caption">
        Monthly frames linearly interpolate between sample dates and are not a physical model.
        Pre-2022 locations in the demo tree may be statistically placed from later grids.
      </div>
    </div>
  );
}
