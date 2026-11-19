import { Fragment, useState } from 'react';
import { getTodayString, getYesterdayString } from '../utils/dates.js';
import MatchItem from './MatchItem.jsx';

const FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

function filterLogs(logs, filter) {
  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  if (filter === 'today') return logs.filter((m) => m.date === todayStr);
  if (filter === 'yesterday') return logs.filter((m) => m.date === yesterdayStr);
  if (filter === 'week') return logs.filter((m) => new Date(m.date) >= sevenDaysAgo);
  if (filter === 'month') return logs.filter((m) => new Date(m.date) >= thirtyDaysAgo);
  return [];
}

function groupByDate(logs) {
  const grouped = {};
  logs.forEach((log) => {
    if (!grouped[log.date]) grouped[log.date] = [];
    grouped[log.date].push(log);
  });
  const dates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
  return dates.map((date) => [date, grouped[date]]);
}

export default function HistoryPage({ active, state, onClearHistory, onDeleteMatch }) {
  const [filter, setFilter] = useState('today');
  const filtered = filterLogs(state.allMatchLogs, filter);

  let content;
  if (filtered.length === 0) {
    content = (
      <ul className="history-log">
        <li style={{ color: 'var(--text-muted)', padding: '12px 0' }}>
          No games played for the selected period ({filter}).
        </li>
      </ul>
    );
  } else if (filter === 'week' || filter === 'month') {
    content = groupByDate(filtered).map(([date, matches]) => (
      <Fragment key={date}>
        <div className="date-header">
          <span>Date: {date}</span>
          <span>
            {matches.length} {matches.length === 1 ? 'Game' : 'Games'} Played
          </span>
        </div>
        <ul className="history-log" style={{ marginBottom: 12 }}>
          {matches.map((m) => (
            <MatchItem key={m.id} match={m} meta={`Time: ${m.time}`} parenNote onDelete={onDeleteMatch} />
          ))}
        </ul>
      </Fragment>
    ));
  } else {
    content = (
      <ul className="history-log">
        {filtered.map((m) => (
          <MatchItem
            key={m.id}
            match={m}
            meta={`Date: ${m.date} | Time: ${m.time}`}
            parenNote
            onDelete={onDeleteMatch}
          />
        ))}
      </ul>
    );
  }

  return (
    <div id="page-history" className={`page${active ? ' active' : ''}`}>
      <div className="card">
        <div className="card-title">
          <span>Past Games &amp; Historical Matches</span>
          <button
            className="btn btn-danger"
            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            onClick={onClearHistory}
          >
            Clear History
          </button>
        </div>

        {/* History Filters: Today, Yesterday, Week, Month */}
        <div className="history-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-chip${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div id="pastGamesContainer" style={{ maxHeight: 500, overflowY: 'auto' }}>
          {content}
        </div>
      </div>
    </div>
  );
}
