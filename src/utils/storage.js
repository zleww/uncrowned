// localStorage persistence. Uses the same keys as the original single-file app,
// so existing data on a phone carries over after the migration.
// KNOWN ISSUE (fixed in milestone 3): JSON.parse is unguarded, so corrupt data
// stops the app from loading.

const KEYS = {
  allTimeTeams: 'court_alltime_teams',
  todayStats: 'court_today_stats',
  activeMatch: 'court_active',
  queue: 'court_queue',
  allMatchLogs: 'court_all_logs',
};

const THEME_KEY = 'court_theme';

export function loadState() {
  return {
    allTimeTeams: JSON.parse(localStorage.getItem(KEYS.allTimeTeams) || '{}'),
    todayStats: JSON.parse(localStorage.getItem(KEYS.todayStats) || '{}'),
    activeMatch: JSON.parse(localStorage.getItem(KEYS.activeMatch) || '[]'),
    queue: JSON.parse(localStorage.getItem(KEYS.queue) || '[]'),
    allMatchLogs: JSON.parse(localStorage.getItem(KEYS.allMatchLogs) || '[]'),
  };
}

export function saveState(state) {
  for (const [field, key] of Object.entries(KEYS)) {
    localStorage.setItem(key, JSON.stringify(state[field]));
  }
}

export function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}
