import { forwardRef, useState } from 'react';
import { MAX_NAME_LENGTH } from '../engine/queue.js';

const REGISTER_ERRORS = {
  duplicate: 'That team is already on court or in the queue.',
  too_long: `Team names can be up to ${MAX_NAME_LENGTH} characters.`,
};

// The "Add a team" field. Used inline on wide screens and inside the
// add-team sheet on phones. `onRegister(name)` returns { status, message }.
// With `showStatus`, the success message is shown under the field too (the
// sheet covers the toasts).
const AddTeamForm = forwardRef(function AddTeamForm({ onRegister, showStatus = false }, inputRef) {
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  function submit(e) {
    e.preventDefault();
    const result = onRegister(teamName);
    setError(REGISTER_ERRORS[result.status] ?? '');
    setStatus(result.status === 'ok' ? result.message : '');
    if (result.status === 'ok') setTeamName('');
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="input-row">
        <input
          ref={inputRef}
          id="teamInput"
          className="input"
          type="text"
          placeholder="Team name, e.g. Thunder"
          aria-label="Team name"
          autoComplete="off"
          enterKeyHint="done"
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
      {showStatus && (
        <p className="field-status" role="status">
          {status}
        </p>
      )}
    </form>
  );
});

export default AddTeamForm;
