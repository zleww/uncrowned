// Export match history as CSV (for spreadsheets) or the whole app data as
// JSON (a backup). Building the text is pure and tested; only
// downloadFile() touches the browser.

import { TIME_ZONE } from './dates.js';

export const EXPORT_VERSION = 1;

// A spreadsheet treats a cell starting with = + - @ (or a tab / carriage
// return before one) as a formula. A team named `=HYPERLINK("http://evil",
// "Click")` would become a live link, and some formulas can run commands in
// old Excel. Prefixing a ' makes the cell plain text. (OWASP: CSV Injection)
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  // Quote every cell and double any quotes inside (RFC 4180), so commas,
  // quotes and line breaks in names can't shift the columns.
  return `"${text.replace(/"/g, '""')}"`;
}

const CSV_COLUMNS = ['date', 'time', 'winner', 'loser', 'note'];

// Oldest match first, which is how people read a spreadsheet.
export function matchesToCSV(logs) {
  const rows = [CSV_COLUMNS, ...[...logs].reverse().map((m) => CSV_COLUMNS.map((c) => m[c]))];
  // The BOM tells Excel the file is UTF-8, so names like "Niño" show correctly.
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

// Everything needed to rebuild the app's data, without the internal undo
// snapshots.
export function stateToJSON(state, now = new Date()) {
  const backup = {
    app: 'uncrowned',
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    timeZone: TIME_ZONE,
    allTimeTeams: state.allTimeTeams,
    todayStats: state.todayStats,
    activeMatch: state.activeMatch,
    queue: state.queue,
    matches: state.allMatchLogs.map(({ prev: _prev, ...m }) => m),
  };
  return JSON.stringify(backup, null, 2);
}

// Saves `text` as a file through a temporary link. The object URL is
// released right after, so nothing stays in memory.
export function downloadFile(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
