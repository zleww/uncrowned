// Accessible replacements for alert/confirm/prompt, plus toast messages.
//
//   const { confirm, notify, showText } = useFeedback();
//   if (await confirm({ title, message, confirmLabel, danger: true })) { ... }
//   notify('Thunder beat Hawks');
//   showText({ title, message, text });  // read-only text the user can copy
//
// The dialog uses the native <dialog> element: showModal() traps focus,
// Esc closes it, and focus goes back to the button that opened it.
// Toasts live in an aria-live region so screen readers announce them.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const FeedbackContext = createContext(null);
const TOAST_MS = 4000;

export function useFeedback() {
  return useContext(FeedbackContext);
}

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);
  const dialogRef = useRef(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!dialog || !el) return;
    if (!el.open) el.showModal();
    el.querySelector('[data-autofocus]')?.focus();
  }, [dialog]);

  const close = (result) => {
    dialogRef.current?.close();
    setDialog(null);
    dialog?.resolve(result);
  };

  const confirm = useCallback((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);

  const showText = useCallback(
    (options) => new Promise((resolve) => setDialog({ confirmLabel: 'Done', ...options, infoOnly: true, resolve })),
    [],
  );

  const notify = useCallback((message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((list) => [...list.slice(-2), { id, message }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  const value = useMemo(() => ({ confirm, showText, notify }), [confirm, showText, notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <dialog
        ref={dialogRef}
        className="modal"
        aria-labelledby="modal-title"
        aria-describedby={dialog?.message ? 'modal-message' : undefined}
        onCancel={(e) => {
          e.preventDefault();
          close(false);
        }}
      >
        {dialog && (
          <div className="modal-body">
            <h2 id="modal-title" className="modal-title">
              {dialog.title}
            </h2>
            {dialog.message && (
              <p id="modal-message" className="modal-message">
                {dialog.message}
              </p>
            )}
            {dialog.text && (
              <textarea
                className="modal-text"
                readOnly
                rows={8}
                value={dialog.text}
                aria-label="Text to copy"
                onFocus={(e) => e.target.select()}
                data-autofocus
              />
            )}
            <div className="modal-actions">
              {!dialog.infoOnly && (
                <button type="button" className="btn btn-secondary" onClick={() => close(false)} data-autofocus={dialog.danger || undefined}>
                  {dialog.cancelLabel ?? 'Cancel'}
                </button>
              )}
              <button
                type="button"
                className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => close(true)}
                data-autofocus={(!dialog.danger && !dialog.text) || undefined}
              >
                {dialog.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        )}
      </dialog>

      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.message}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}
