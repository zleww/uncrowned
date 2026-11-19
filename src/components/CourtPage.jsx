import { useState } from 'react';
import { MAX_NAME_LENGTH, STREAK_LIMIT } from '../engine/queue.js';

const REGISTER_ERRORS = {
  duplicate: 'That team is already on court or in the queue.',
  too_long: `Team names can be up to ${MAX_NAME_LENGTH} characters.`,
};

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

export default function CourtPage({ active, state, onNewDay, onWin, onRemove, onRegister }) {
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const { activeMatch, queue, todayStats } = state;
  const streakOf = (team) => todayStats[team]?.streak || 0;

  function submit(e) {
    e.preventDefault();
    const status = onRegister(teamName);
    setError(REGISTER_ERRORS[status] ?? '');
    if (status === 'ok') setTeamName('');
  }

  let court;
  if (activeMatch.length === 0) {
    court = <p className="empty court-empty">Add 2 teams below to start the game.</p>;
  } else if (activeMatch.length === 1) {
    const team = activeMatch[0];
    court = (
      <>
        <TeamCard team={team} streak={streakOf(team)} onRemove={() => onRemove(team)} />
        <div className="vs" aria-hidden="true">
          VS
        </div>
        <div className="team-card waiting">Waiting for a challenger…</div>
      </>
    );
  } else {
    court = (
      <>
        <TeamCard
          team={activeMatch[0]}
          streak={streakOf(activeMatch[0])}
          onWin={() => onWin(0)}
          onRemove={() => onRemove(activeMatch[0])}
        />
        <div className="vs" aria-hidden="true">
          VS
        </div>
        <TeamCard
          team={activeMatch[1]}
          streak={streakOf(activeMatch[1])}
          onWin={() => onWin(1)}
          onRemove={() => onRemove(activeMatch[1])}
        />
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
        <div id="matchArea" className="court">
          {court}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h2>Queue</h2>
          <span className="muted">{queue.length} waiting</span>
        </div>
        {queue.length === 0 ? (
          <p className="empty">No teams waiting.</p>
        ) : (
          <ol id="queueList" className="queue">
            {queue.map((team, idx) => (
              <li className="queue-item" key={team}>
                <span className="queue-pos">{idx + 1}</span>
                <span className="queue-name">{team}</span>
                {idx === 0 && <span className="badge">Next up</span>}
                <button className="icon-btn" aria-label={`Remove ${team} from the queue`} onClick={() => onRemove(team)}>
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <form className="card" onSubmit={submit} noValidate>
        <div className="card-title">
          <h2>
            <label htmlFor="teamInput">Add a team</label>
          </h2>
        </div>
        <div className="input-row">
          <input
            id="teamInput"
            className="input"
            type="text"
            placeholder="Team name, e.g. Thunder"
            autoComplete="off"
            maxLength={MAX_NAME_LENGTH * 2}
            value={teamName}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'teamInputError' : undefined}
            onChange={(e) => {
              setTeamName(e.target.value);
              if (error) setError('');
            }}
          />
          <button className="btn btn-primary" type="submit">
            Add
          </button>
        </div>
        {error && (
          <p id="teamInputError" className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>

      <div className="card session-card">
        <p className="muted">Done for today?</p>
        <button className="btn btn-secondary" onClick={onNewDay}>
          Start new day
        </button>
      </div>
    </section>
  );
}
