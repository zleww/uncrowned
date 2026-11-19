import { useState } from 'react';
import { STREAK_LIMIT } from '../engine/queue.js';

const muted = { color: 'var(--text-muted)' };

function TeamBox({ team, streak, children }) {
  return (
    <div className="team-box">
      <div className="team-name">{team}</div>
      <div className="streak-badge">
        Streak: {streak} / {STREAK_LIMIT}
      </div>
      {children}
    </div>
  );
}

export default function CourtPage({ active, state, onShare, onNewDay, onWin, onRemove, onRegister }) {
  const [teamName, setTeamName] = useState('');
  const { activeMatch, queue, todayStats } = state;
  const streakOf = (team) => todayStats[team]?.streak || 0;

  function submit() {
    if (onRegister(teamName)) setTeamName('');
  }

  let court;
  if (activeMatch.length === 0) {
    court = (
      <div style={{ flex: 1, textAlign: 'center', padding: 18, ...muted }}>
        Add teams below to start playing.
      </div>
    );
  } else if (activeMatch.length === 1) {
    const team = activeMatch[0];
    court = (
      <TeamBox team={team} streak={streakOf(team)}>
        <p style={{ ...muted, fontSize: '0.85rem', margin: '6px 0' }}>Waiting for next challenger...</p>
        <button className="btn btn-remove-court" onClick={() => onRemove(team)}>
          Remove
        </button>
      </TeamBox>
    );
  } else {
    court = activeMatch.map((team, idx) => (
      <TeamBox key={idx} team={team} streak={streakOf(team)}>
        <button className="btn btn-win" onClick={() => onWin(idx)}>
          Declare Winner
        </button>{' '}
        <button className="btn btn-remove-court" onClick={() => onRemove(team)}>
          Leave / Remove
        </button>
      </TeamBox>
    ));
  }

  return (
    <div id="page-main" className={`page${active ? ' active' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-share" onClick={onShare}>
          Share Summary (GC)
        </button>
        <button className="btn btn-warning" onClick={onNewDay}>
          Start New Day (Reset Queue)
        </button>
      </div>

      {/* Active Court */}
      <div className="card">
        <div className="card-title">
          <span>Currently on Court</span>
          <span className="badge">Cap: 3-Win Streak</span>
        </div>
        <div id="matchArea" className="court">
          {court}
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="card">
        <div className="card-title">
          <span>Waiting Queue</span>
          <span id="queueCount" style={{ fontSize: '0.85rem', fontWeight: 'normal', ...muted }}>
            {queue.length} Waiting
          </span>
        </div>
        <div id="queueList">
          {queue.length === 0 ? (
            <p style={{ ...muted, margin: 0 }}>No teams waiting in queue.</p>
          ) : (
            queue.map((team, idx) => (
              <div className="queue-item" key={idx}>
                <div>
                  <strong>{idx + 1}.</strong> {team}{' '}
                  {idx === 0 && <span className="next-tag">NEXT UP</span>}
                </div>
                <button className="btn btn-danger" onClick={() => onRemove(team)}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Registration */}
      <div className="card">
        <div className="card-title">Register Team</div>
        <div className="input-row">
          <input
            type="text"
            id="teamInput"
            placeholder="Team name (e.g. Thunder)"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <button className="btn btn-add" onClick={submit}>
            Add Team
          </button>
        </div>
      </div>
    </div>
  );
}
