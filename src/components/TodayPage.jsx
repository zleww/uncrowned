import MatchItem from './MatchItem.jsx';

// On wide screens this page is shown beside the court instead of as a tab,
// so it becomes a labelled region rather than a tab panel.
export default function TodayPage({ active, asSidePanel, state, today, undoableId, onUndo, onDeleteMatch }) {
  const { todayStats, allMatchLogs } = state;
  const todayLogs = allMatchLogs.filter((log) => log.date === today);
  const teams = Object.keys(todayStats).sort((a, b) => todayStats[b].wins - todayStats[a].wins);

  return (
    <section
      id="page-today"
      className="page"
      role={asSidePanel ? 'region' : 'tabpanel'}
      aria-labelledby={asSidePanel ? undefined : 'tab-today'}
      aria-label={asSidePanel ? 'Today' : undefined}
      hidden={!active}
    >
      <div className="card">
        <div className="card-title">
          <h2>Today's Leaderboard</h2>
        </div>
        {teams.length === 0 ? (
          <p className="empty">No teams registered today yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Team</th>
                  <th scope="col" className="num">
                    W
                  </th>
                  <th scope="col" className="num">
                    L
                  </th>
                  <th scope="col" className="num">
                    Streak
                  </th>
                </tr>
              </thead>
              <tbody>
                {teams.map((name, idx) => (
                  <tr key={name}>
                    <td className="rank">{idx + 1}</td>
                    <td className="team-cell">{name}</td>
                    <td className="num">{todayStats[name].wins}</td>
                    <td className="num">{todayStats[name].losses}</td>
                    <td className="num">{todayStats[name].streak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Today's Matches</h2>
          <span className="badge">
            {todayLogs.length} {todayLogs.length === 1 ? 'match' : 'matches'}
          </span>
        </div>
        {todayLogs.length === 0 ? (
          <p className="empty">No matches played today yet.</p>
        ) : (
          <ul className="match-list scroll-box">
            {todayLogs.map((m) => (
              <MatchItem
                key={m.id}
                match={m}
                undoable={m.id === undoableId}
                onUndo={onUndo}
                onDelete={onDeleteMatch}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
