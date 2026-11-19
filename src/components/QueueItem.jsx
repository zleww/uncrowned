import { useRef, useState } from 'react';

// How far (as a share of the row's width) a row must be dragged left to
// count as "remove". Less than that and it springs back.
const SWIPE_REMOVE_AT = 0.35;
// Movement below this many pixels is still treated as a tap.
const DEAD_ZONE = 8;

// One queue row. Swipe it left to remove the team (a red "Remove" strip
// shows underneath); the × button does the same for mouse, keyboard and
// screen-reader users. Either way the app shows an Undo toast.
export default function QueueItem({ team, position, onRemove }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);

  function onPointerDown(e) {
    if (e.button !== 0 || e.target.closest('button')) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, width: e.currentTarget.offsetWidth, active: false };
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const moveX = e.clientX - d.x;
    const moveY = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(moveX) < DEAD_ZONE && Math.abs(moveY) < DEAD_ZONE) return;
      // Mostly vertical: the user is scrolling the page, not swiping.
      if (Math.abs(moveY) > Math.abs(moveX)) {
        drag.current = null;
        return;
      }
      d.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    setDx(Math.min(0, moveX));
  }

  function onPointerUp(e) {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    setDragging(false);
    const moveX = Math.min(0, e.clientX - d.x);
    if (-moveX > d.width * SWIPE_REMOVE_AT) {
      setDx(-d.width); // slide the rest of the way out, then remove
      setTimeout(() => onRemove(team), 160);
    } else {
      setDx(0);
    }
  }

  function onPointerCancel() {
    drag.current = null;
    setDragging(false);
    setDx(0);
  }

  return (
    <li className="queue-item">
      {dx !== 0 && (
        <div className="queue-swipe-bg" aria-hidden="true">
          Remove
        </div>
      )}
      <div
        className={dragging ? 'queue-row dragging' : 'queue-row'}
        style={dx ? { transform: `translateX(${dx}px)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <span className="queue-pos">{position}</span>
        <span className="queue-name">{team}</span>
        {position === 1 && <span className="badge">Next up</span>}
        <button className="icon-btn" aria-label={`Remove ${team} from the queue`} onClick={() => onRemove(team)}>
          ×
        </button>
      </div>
    </li>
  );
}
