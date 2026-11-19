import { getTodayString } from '../utils/dates.js';
import MatchItem from './MatchItem.jsx';

const muted = { color: 'var(--text-muted)' };

export default function TodayPage({ active, state, onRemove, onDeleteMatch }) {
  const { todayStats, allMatchLogs } = state;
  const todayStr = getTodayString();
  const todayLogs = allMatchLogs.filter((log) => log.date === todayStr);
  const teams = Object.keys(todayStats).sort((a, b) => todayStats[b].wins - todayStats[a].wins);

  return (
    <div id="page-today" className={`page${active ? ' active' : ''}`}>
      {/* Today's Leaderboard */}
      <div className="card">
        <div className="card-title">Today's Leaderboard</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>Streak</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="todayStandingsTable">
            {teams.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', ...muted }}>
                  No teams registered today yet.
                </td>
              </tr>
            ) : (
              teams.map((name, idx) => (
                <tr key={name}>
                  <td>
                    <strong>#{idx + 1}</strong>
                  </td>
                  <td>
                    <strong>{name}</strong>
                  </td>
                  <td>{todayStats[name].wins}</td>
                  <td>{todayStats[name].losses}</td>
                  <td>{todayStats[name].streak}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                      onClick={() => onRemove(name)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Today's Match Log */}
      <div className="card">
        <div className="card-title">
          <span>Today's Matches</span>
          <span id="todayMatchCount" className="badge">
            {todayLogs.length} Matches
          </span>
        </div>
        <ul id="todayHistoryList" className="history-log">
          {todayLogs.length === 0 ? (
            <li style={{ ...muted, padding: '4px 0' }}>No matches played today yet.</li>
          ) : (
            todayLogs.map((m) => (
              <MatchItem key={m.id} match={m} meta={`Time: ${m.time}`} onDelete={onDeleteMatch} />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
