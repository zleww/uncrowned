// One row in a match list: time, result, note and a Delete button.
export default function MatchItem({ match, onDelete }) {
  return (
    <li className="match">
      <div>
        <span className="match-meta">{match.time}</span>
        <b>{match.winner}</b> def. <b>{match.loser}</b> <span className="match-note">· {match.note}</span>
      </div>
      <button
        className="btn-text danger"
        aria-label={`Delete match: ${match.winner} def. ${match.loser}`}
        onClick={() => onDelete(match.id)}
      >
        Delete
      </button>
    </li>
  );
}
