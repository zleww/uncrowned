import { STREAK_LIMIT } from '../engine/queue.js';
import AddTeamForm from './AddTeamForm.jsx';
import QueueItem from './QueueItem.jsx';

function StreakDots({ streak }) {
  return (
    <div className="streak" role="img" aria-label={`Win streak: ${streak} of ${STREAK_LIMIT}`}>
      {Array.from({ length: STREAK_LIMIT }, (_, i) => (
        <span key={i} className={i < streak ? 'dot on' : 'dot'} />
      ))}
    </div>
  );
}

// Font size as a % of the card width: 23% fits an 8-letter word, and longer
// words shrink in proportion so they stay on one line.
function fitSize(team) {
  const longestWord = Math.max(...team.split(' ').map((w) => [...w].length));
  return Math.min(23, 185 / longestWord).toFixed(1);
}

function TeamCard({ team, streak, onWin, onRemove }) {
  return (
    <article className="team-card" data-streak={Math.min(streak, STREAK_LIMIT - 1)} aria-label={team}>
      <button className="icon-btn team-remove" aria-label={`Remove ${team}`} onClick={onRemove}>
        ×
      </button>
      <h3 className="team-name" style={{ '--fit': `${fitSize(team)}cqi` }}>
        {team}
      </h3>
      <StreakDots streak={streak} />
      {onWin && (
        <button className="btn btn-primary btn-win" aria-label={`${team} won`} onClick={onWin}>
          Winner
        </button>
      )}
    </article>
  );
}

// What a screen reader hears when the court changes.
function courtAnnouncement(activeMatch, queue) {
  if (activeMatch.length < 2) return activeMatch.length ? `On court: ${activeMatch[0]}, waiting for a challenger.` : '';
  const next = queue.length ? ` Next up: ${queue[0]}.` : '';
  return `On court: ${activeMatch[0]} versus ${activeMatch[1]}.${next}`;
}

export default function CourtPage({
  active,
  wide,
  state,
  onNewDay,
  onWin,
  onRemove,
  onRegister,
  onOpenAdd,
  undoable,
  onUndo,
}) {
  const { activeMatch, queue, todayStats } = state;
  const streakOf = (team) => todayStats[team]?.streak || 0;

  // Cards are keyed by team name, so a team that just walked on court gets a
  // fresh card (and its entrance animation) while the winner's card stays.
  let court;
  if (activeMatch.length === 0) {
    court = (
      <div className="court-empty">
        <p className="empty">{wide ? 'Add 2 teams below to start the game.' : 'Add 2 teams to start the game.'}</p>
        {!wide && (
          <button className="btn btn-primary" onClick={onOpenAdd}>
            Add teams
          </button>
        )}
      </div>
    );
  } else {
    court = (
      <>
        {activeMatch.map((team, slot) => (
          <TeamCard
            key={team}
            team={team}
            streak={streakOf(team)}
            onWin={activeMatch.length === 2 ? () => onWin(slot) : undefined}
            onRemove={() => onRemove(team)}
          />
        ))}
        {activeMatch.length === 1 && <div className="team-card waiting">Waiting for a challenger…</div>}
      </>
    );
  }

  return (
    <section id="page-main" className="page" role="tabpanel" aria-labelledby="tab-main" hidden={!active}>
      <div className="card court-card">
        <div className="card-title">
          <h2>On Court</h2>
          <span className="badge">{STREAK_LIMIT}-win cap</span>
        </div>
        <div id="matchArea" className={activeMatch.length ? 'court' : 'court is-empty'}>
          {court}
          {activeMatch.length > 0 && (
            <div className="vs" aria-hidden="true">
              VS
            </div>
          )}
        </div>
        {undoable && (
          <div className="last-game">
            <span className="muted">
              Last game: <b>{undoable.winner}</b> def. <b>{undoable.loser}</b>
            </span>
            <button className="btn-text" onClick={() => onUndo(undoable.id)}>
              Undo
            </button>
          </div>
        )}
        <p className="visually-hidden" aria-live="polite">
          {active ? courtAnnouncement(activeMatch, queue) : ''}
        </p>
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Queue</h2>
          <span className="muted">{queue.length} waiting</span>
        </div>
        {queue.length === 0 ? (
          <p className="empty">No teams waiting.</p>
        ) : (
          <>
            <ol id="queueList" className="queue">
              {queue.map((team, idx) => (
                <QueueItem key={team} team={team} position={idx + 1} onRemove={onRemove} />
              ))}
            </ol>
            <p className="swipe-hint">Swipe a team left to remove it.</p>
          </>
        )}
      </div>

      {wide && (
        <div className="card">
          <div className="card-title">
            <h2>
              <label htmlFor="teamInput">Add a team</label>
            </h2>
          </div>
          <AddTeamForm onRegister={onRegister} />
        </div>
      )}

      <div className="card session-card">
        <p className="muted">Done for today?</p>
        <button className="btn btn-secondary" onClick={onNewDay}>
          Start new day
        </button>
      </div>
    </section>
  );
}
