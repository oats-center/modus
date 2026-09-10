import { useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { context } from '../state';
import { indexSessionResults } from './indexFromSlim';
import { clearHeatCache } from './heatmap';
import ListView from './ListView';
import MapView from './MapView';
import './tots-viewer.css';

export default observer(function TotsViewer() {
  const { state, actions } = useContext(context);
  const index = indexSessionResults(state.sessionResults);
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (selectedKey && index.fieldYears.some((item) => item.key === selectedKey)) return;
    setSelectedKey(index.fieldYears[0]?.key || null);
  }, [index.fieldYears, selectedKey]);

  useEffect(() => {
    if (tab === 'map' && !index.hasAnyGps) setTab('list');
  }, [tab, index.hasAnyGps]);

  const count = Object.keys(state.sessionResults).length;

  useEffect(() => {
    clearHeatCache();
  }, [count]);

  return (
    <div className="tots-viewer">
      <div className="tots-toolbar">
        <div className="tots-tabs">
          <button type="button" className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>List</button>
          <button
            type="button"
            className={tab === 'map' ? 'active' : ''}
            disabled={!index.hasAnyGps}
            title={index.hasAnyGps ? 'Map of samples with GPS' : 'Map is unavailable until a converted sample has GPS'}
            onClick={() => index.hasAnyGps && setTab('map')}
          >
            Map
          </button>
        </div>
        <div className="tots-toolbar-meta">
          {count > 0 ? `${index.fieldYears.length} year/field group${index.fieldYears.length === 1 ? '' : 's'}` : 'No converted results yet'}
          <button type="button" className="tots-clear" disabled={count < 1} onClick={() => actions.clearResults()}>
            Clear
          </button>
        </div>
      </div>
      {tab === 'list' ? (
        <ListView fieldYears={index.fieldYears} selectedKey={selectedKey} onSelect={setSelectedKey} />
      ) : (
        <MapView index={index} />
      )}
    </div>
  );
});
