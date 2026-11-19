// localStorage persistence. Same keys as the original app, so existing data
// carries over. Reading never crashes the app: unreadable or wrong-shaped
// data is copied to a "<key>_corrupt_backup" entry and replaced by a default.

import { toDateKey } from './dates.js';

const KEYS = {
  allTimeTeams: 'court_alltime_teams',
  todayStats: 'court_today_stats',
  activeMatch: 'court_active',
  queue: 'court_queue',
  allMatchLogs: 'court_all_logs',
};
const THEME_KEY = 'court_theme';

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function getItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage blocked (e.g. some private modes)
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage full or blocked: keep running with in-memory state
  }
}

function readJSON(key, isValid, fallback) {
  const raw = getItem(key);
  if (raw === null) return fallback;
  try {
    const value = JSON.parse(raw);
    if (isValid(value)) return value;
  } catch {
    // fall through
  }
  setItem(`${key}_corrupt_backup`, raw);
  return fallback;
}

// Match ids are the timestamp they were recorded at, so the correct Manila
// day can be recomputed. This repairs games the old UTC bug filed under
// "yesterday".
function fixLogDates(logs) {
  return logs
    .filter(isPlainObject)
    .map((log) => (Number.isFinite(log.id) && log.id > 1e12 ? { ...log, date: toDateKey(new Date(log.id)) } : log));
}

const onlyStrings = (arr) => arr.filter((t) => typeof t === 'string');

export function loadState() {
  return {
    allTimeTeams: readJSON(KEYS.allTimeTeams, isPlainObject, {}),
    todayStats: readJSON(KEYS.todayStats, isPlainObject, {}),
    activeMatch: onlyStrings(readJSON(KEYS.activeMatch, Array.isArray, [])).slice(0, 2),
    queue: onlyStrings(readJSON(KEYS.queue, Array.isArray, [])),
    allMatchLogs: fixLogDates(readJSON(KEYS.allMatchLogs, Array.isArray, [])),
  };
}

export function saveState(state) {
  for (const [field, key] of Object.entries(KEYS)) {
    setItem(key, JSON.stringify(state[field]));
  }
}

export function loadTheme() {
  const saved = getItem(THEME_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'dark';
}

export function saveTheme(theme) {
  setItem(THEME_KEY, theme);
}
