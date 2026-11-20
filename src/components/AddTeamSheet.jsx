import { forwardRef, useImperativeHandle, useRef } from 'react';
import AddTeamForm from './AddTeamForm.jsx';

// Phone-only "Add a team" panel, opened by the + button through
// `ref.current.open()`. The <dialog> element itself is the only record of
// whether it is open, so React state can never disagree with what's on
// screen. It stays open so several teams can be added in a row, and sits
// near the top of the screen so the on-screen keyboard never covers it.
const AddTeamSheet = forwardRef(function AddTeamSheet({ onRegister, queueLength, onCourt }, ref) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    open() {
      const el = dialogRef.current;
      if (!el.open) el.showModal();
      inputRef.current?.focus();
    },
  }));

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className="modal sheet"
      aria-labelledby="sheet-title"
      // A tap on the dimmed backdrop (the dialog element itself) closes it.
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="modal-body">
        <h2 id="sheet-title" className="modal-title">
          Add a team
        </h2>
        <p className="modal-message">
          {onCourt < 2 ? `${2 - onCourt} more to start the game.` : `${queueLength} waiting in the queue.`}
        </p>
        <div className="sheet-form">
          <AddTeamForm ref={inputRef} onRegister={onRegister} showStatus />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={close}>
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default AddTeamSheet;
