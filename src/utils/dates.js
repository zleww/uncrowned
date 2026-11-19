// Date helpers. All "today/yesterday" logic uses Manila time (UTC+8, no
// daylight saving), whatever time zone the phone is set to.

export const TIME_ZONE = 'Asia/Manila';
const DAY_MS = 86_400_000;

const dayParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});
const dayLabelFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

// "YYYY-MM-DD" for the Manila calendar day that `date` falls on.
export function toDateKey(date) {
  const parts = Object.fromEntries(dayParts.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getTodayString(now = new Date()) {
  return toDateKey(now);
}

export function daysAgoKey(days, now = new Date()) {
  return toDateKey(new Date(now.getTime() - days * DAY_MS));
}

export function getYesterdayString(now = new Date()) {
  return daysAgoKey(1, now);
}

// "07:42 PM" in Manila time.
export function formatTime(date) {
  return timeFormat.format(date);
}

// "Today", "Yesterday", or e.g. "Thu, Nov 19" for a "YYYY-MM-DD" key.
export function formatDayLabel(key, now = new Date()) {
  if (key === getTodayString(now)) return 'Today';
  if (key === getYesterdayString(now)) return 'Yesterday';
  const noonManila = new Date(`${key}T12:00:00+08:00`);
  return Number.isNaN(noonManila.getTime()) ? key : dayLabelFormat.format(noonManila);
}
