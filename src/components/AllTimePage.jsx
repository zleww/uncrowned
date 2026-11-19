// Sorted by total wins, then win rate (same order as the original).
function sortTeams(allTimeTeams) {
  return Object.keys(allTimeTeams).sort((a, b) => {
    if (allTimeTeams[b].wins !== allTimeTeams[a].wins) {
      return allTimeTeams[b].wins - allTimeTeams[a].wins;
    }
    const totalA = allTimeTeams[a].wins + allTimeTeams[a].losses;
    const totalB = allTimeTeams[b].wins + allTimeTeams[b].losses;
    const pctA = totalA > 0 ? allTimeTeams[a].wins / totalA : 0;
    const pctB = totalB > 0 ? allTimeTeams[b].wins / totalB : 0;
    return pctB - pctA;
  });
}

export default function AllTimePage({ active, state, onRemove }) {
  const { allTimeTeams } = state;
  const teams = sortTeams(allTimeTeams);

  return (
    <div id="page-alltime" className={`page${active ? ' active' : ''}`}>
      <div className="card">
        <div className="card-title">All-Time Cumulative Leaderboard</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
          Career records across all sessions.
        </p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Win Rate</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="allTimeStandingsTable">
            {teams.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No career records recorded yet.
                </td>
              </tr>
            ) : (
              teams.map((name, idx) => {
                const t = allTimeTeams[name];
                const total = t.wins + t.losses;
                const pct = total > 0 ? Math.round((t.wins / total) * 100) : 0;
                return (
                  <tr key={name}>
                    <td>
                      <strong>#{idx + 1}</strong>
                    </td>
                    <td>
                      <strong>{name}</strong>
                    </td>
                    <td>{t.wins}</td>
                    <td>{t.losses}</td>
                    <td>{pct}%</td>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
