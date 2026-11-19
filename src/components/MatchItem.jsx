// One row in a match list: time, result, note, and either Undo (the newest
// game, while it can still be undone exactly) or Delete (a correction).
export default function MatchItem({ match, undoable, onUndo, onDelete }) {
  const label = `${match.winner} def. ${match.loser}`;
  return (
    <li className="match">
      <div>
        <span className="match-meta">{match.time}</span>
        <b>{match.winner}</b> def. <b>{match.loser}</b> <span className="match-note">· {match.note}</span>
      </div>
      {undoable ? (
        <button className="btn-text" aria-label={`Undo match: ${label}`} onClick={() => onUndo(match.id)}>
          Undo
        </button>
      ) : (
        <button className="btn-text danger" aria-label={`Delete match: ${label}`} onClick={() => onDelete(match.id)}>
          Delete
        </button>
      )}
    </li>
  );
}
