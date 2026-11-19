// One row in a match list. `meta` is the grey line above the result
// ("Time: 9:05 PM" or "Date: ... | Time: ..."); `parenNote` picks between the
// two note formats the original used ("- note" vs "(note)").
export default function MatchItem({ match, meta, parenNote, onDelete }) {
  return (
    <li className="history-item">
      <div>
        <span className="history-meta">{meta}</span>
        <b>{match.winner}</b> defeated <b>{match.loser}</b>{' '}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          {parenNote ? `(${match.note})` : `- ${match.note}`}
        </span>
      </div>
      <button className="btn-delete-match" onClick={() => onDelete(match.id)}>
        Delete
      </button>
    </li>
  );
}
