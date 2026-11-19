import { Fragment, useState } from 'react';
import { daysAgoKey, formatDayLabel, getYesterdayString } from '../utils/dates.js';
import MatchItem from './MatchItem.jsx';

const FILTERS = [
  { key: 'today', label: 'Today', empty: 'today' },
  { key: 'yesterday', label: 'Yesterday', empty: 'yesterday' },
  { key: 'week', label: 'This Week', empty: 'in the last 7 days' },
  { key: 'month', label: 'This Month', empty: 'in the last 30 days' },
];

// Date keys are "YYYY-MM-DD" in Manila time, so they compare as strings.
function filterLogs(logs, filter, today) {
  if (filter === 'today') return logs.filter((m) => m.date === today);
  if (filter === 'yesterday') return logs.filter((m) => m.date === getYesterdayString());
  if (filter === 'week') return logs.filter((m) => m.date >= daysAgoKey(6));
  if (filter === 'month') return logs.filter((m) => m.date >= daysAgoKey(29));
  return [];
}

function groupByDate(logs) {
  const grouped = new Map();
  for (const log of logs) {
    if (!grouped.has(log.date)) grouped.set(log.date, []);
    grouped.get(log.date).push(log);
  }
  return [...grouped.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
}

export default function HistoryPage({ active, state, today, onClearHistory, onDeleteMatch }) {
  const [filter, setFilter] = useState('today');
  const filtered = filterLogs(state.allMatchLogs, filter, today);
  const current = FILTERS.find((f) => f.key === filter);

  return (
    <section id="page-history" className="page" role="tabpanel" aria-labelledby="tab-history" hidden={!active}>
      <div className="card">
        <div className="card-title">
          <h2>Match History</h2>
        </div>

        <div className="chips" role="group" aria-label="Show matches from">
          {FILTERS.map((f) => (
            <button key={f.key} className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="empty">No games played {current.empty}.</p>
        ) : (
          <div className="scroll-box">
            {groupByDate(filtered).map(([date, matches]) => (
              <Fragment key={date}>
                <div className="day-header">
                  <span>{formatDayLabel(date)}</span>
                  <span className="muted">
                    {matches.length} {matches.length === 1 ? 'game' : 'games'}
                  </span>
                </div>
                <ul className="match-list">
                  {matches.map((m) => (
                    <MatchItem key={m.id} match={m} onDelete={onDeleteMatch} />
                  ))}
                </ul>
              </Fragment>
            ))}
          </div>
        )}

        {state.allMatchLogs.length > 0 && (
          <div className="card-footer">
            <button className="btn-text danger" onClick={onClearHistory}>
              Clear all history
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
