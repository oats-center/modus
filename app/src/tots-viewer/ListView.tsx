import { useMemo } from 'react';
import type { FieldYear } from './indexFromSlim';

type Props = {
  fieldYears: FieldYear[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

export default function ListView({ fieldYears, selectedKey, onSelect }: Props) {
  const selected = fieldYears.find((item) => item.key === selectedKey) || fieldYears[0];
  const years = useMemo(() => {
    const map = new Map<string, FieldYear[]>();
    for (const item of fieldYears) {
      const list = map.get(item.year) || [];
      list.push(item);
      map.set(item.year, list);
    }
    return [...map.entries()];
  }, [fieldYears]);

  if (fieldYears.length < 1) {
    return <div className="tots-empty">Drop a ToTs zip or lab file to view year/field results.</div>;
  }

  return (
    <div className="tots-list">
      <div className="tots-year-list">
        {years.map(([year, items]) => (
          <div key={year} className="tots-year-group">
            <div className="tots-year-label">{year}</div>
            {items.map((item) => {
              const active = selected?.key === item.key;
              return (
                <button
                  type="button"
                  key={item.key}
                  className={active ? 'tots-field-item active' : 'tots-field-item'}
                  onClick={() => onSelect(item.key)}
                >
                  <span className="tots-field-name">{item.fieldLabel}</span>
                  <span className="tots-field-meta">
                    {item.sampleCount} sample{item.sampleCount === 1 ? '' : 's'}
                    {item.hasGps ? '' : ' · no GPS'}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="tots-results">
        {selected ? <ResultsTable fieldYear={selected} /> : null}
      </div>
    </div>
  );
}

function formatValue(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
  }
  return String(value);
}

function ResultsTable({ fieldYear }: { fieldYear: FieldYear }) {
  const analytes = fieldYear.analytes;
  return (
    <div className="tots-results-inner">
      <div className="tots-results-title">
        {fieldYear.year} / {fieldYear.fieldLabel}
        {fieldYear.farmLabel ? ` · ${fieldYear.farmLabel}` : ''}
        {fieldYear.date ? ` · ${fieldYear.date}` : ''}
      </div>
      <div className="tots-table-wrap">
        <table className="tots-table">
          <thead>
            <tr>
              <th>Sample</th>
              <th>Depth</th>
              <th>Lat</th>
              <th>Lon</th>
              {analytes.map((name) => (
                <th key={name}>
                  {name}
                  {fieldYear.rows.find((row) => row.units[name]) ? ` [${fieldYear.rows.find((row) => row.units[name])!.units[name]}]` : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fieldYear.rows.map((row) => (
              <tr key={row.sampleId}>
                <td>{row.sampleId}</td>
                <td>{row.depth || ''}</td>
                <td>{row.lat !== undefined ? row.lat.toFixed(5) : ''}{row.gpsSynthetic ? '*' : ''}</td>
                <td>{row.lon !== undefined ? row.lon.toFixed(5) : ''}</td>
                {analytes.map((name) => (
                  <td key={name}>{formatValue(row.values[name])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fieldYear.rows.some((row) => row.gpsSynthetic) ? (
        <div className="tots-caption">* Synthetic coordinates placed from later sampling grids.</div>
      ) : null}
    </div>
  );
}
