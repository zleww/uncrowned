// Date helpers.
// KNOWN BUG (fixed in milestone 3): toISOString() is UTC, so games played
// before 8:00 AM Manila time are filed under "yesterday".

export function toDateKey(date) {
  return date.toISOString().split('T')[0];
}

export function getTodayString() {
  return toDateKey(new Date());
}

export function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}
