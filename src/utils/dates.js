// Date helpers, copied unchanged from the original app.
// KNOWN BUG (fixed in milestone 3): toISOString() is UTC, so games played
// before 8:00 AM Manila time are filed under "yesterday".

export function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

export function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}
