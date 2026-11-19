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
    <section id="page-alltime" className="page" role="tabpanel" aria-labelledby="tab-alltime" hidden={!active}>
      <div className="card">
        <div className="card-title">
          <h2>All-Time Leaderboard</h2>
        </div>
        <p className="card-note">Career records across every session.</p>
        {teams.length === 0 ? (
          <p className="empty">No career records yet.</p>
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
                    Win %
                  </th>
                  <th scope="col" className="action-cell">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {teams.map((name, idx) => {
                  const t = allTimeTeams[name];
                  const total = t.wins + t.losses;
                  const pct = total > 0 ? Math.round((t.wins / total) * 100) : 0;
                  return (
                    <tr key={name}>
                      <td className="rank">{idx + 1}</td>
                      <td className="team-cell">{name}</td>
                      <td className="num">{t.wins}</td>
                      <td className="num">{t.losses}</td>
                      <td className="num">{pct}%</td>
                      <td className="action-cell">
                        <button
                          className="icon-btn"
                          aria-label={`Delete ${name}'s all-time record`}
                          onClick={() => onRemove(name)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
