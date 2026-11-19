// Court rules, ported from the original app with no behavior change.
// Each function takes the current state and returns a new state; it never
// touches the DOM or localStorage. Milestone 2 turns this into the tested
// queue engine (src/engine/queue.js).
//
// State shape (same as the original localStorage data):
//   allTimeTeams: { [name]: { wins, losses } }
//   todayStats:   { [name]: { wins, losses, streak } }
//   activeMatch:  [name, name]   (0-2 teams on court)
//   queue:        [name, ...]
//   allMatchLogs: [{ id, winner, loser, date, time, note }]  (newest first)

import { getTodayString } from '../utils/dates.js';

export const STREAK_LIMIT = 3;

// Returns { state, status } where status is 'ok', 'empty' or 'duplicate'.
export function registerTeam(state, rawName) {
  const name = rawName.trim();
  if (!name) return { state, status: 'empty' };
  if (state.activeMatch.includes(name) || state.queue.includes(name)) {
    return { state, status: 'duplicate' };
  }

  const s = structuredClone(state);
  if (!s.allTimeTeams[name]) s.allTimeTeams[name] = { wins: 0, losses: 0 };
  if (!s.todayStats[name]) s.todayStats[name] = { wins: 0, losses: 0, streak: 0 };

  if (s.activeMatch.length < 2) {
    s.activeMatch.push(name);
  } else {
    s.queue.push(name);
  }
  return { state: s, status: 'ok' };
}

export function recordResult(state, winnerIndex) {
  const s = structuredClone(state);
  const loserIndex = winnerIndex === 0 ? 1 : 0;
  const winner = s.activeMatch[winnerIndex];
  const loser = s.activeMatch[loserIndex];

  if (!s.todayStats[winner]) s.todayStats[winner] = { wins: 0, losses: 0, streak: 0 };
  if (!s.todayStats[loser]) s.todayStats[loser] = { wins: 0, losses: 0, streak: 0 };
  if (!s.allTimeTeams[winner]) s.allTimeTeams[winner] = { wins: 0, losses: 0 };
  if (!s.allTimeTeams[loser]) s.allTimeTeams[loser] = { wins: 0, losses: 0 };

  s.todayStats[winner].wins += 1;
  s.todayStats[winner].streak += 1;
  s.todayStats[loser].losses += 1;
  s.todayStats[loser].streak = 0;

  s.allTimeTeams[winner].wins += 1;
  s.allTimeTeams[loser].losses += 1;

  const now = new Date();
  const dateStr = getTodayString();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let note = 'Winner stays';
  if (s.todayStats[winner].streak >= STREAK_LIMIT) {
    note = `3-win streak reached (${winner} rests)`;
    s.todayStats[winner].streak = 0;
    s.queue.push(loser);
    s.queue.push(winner);

    s.activeMatch = [];
    if (s.queue.length > 0) s.activeMatch.push(s.queue.shift());
    if (s.queue.length > 0) s.activeMatch.push(s.queue.shift());
  } else {
    s.queue.push(loser);
    if (s.queue.length > 0) {
      s.activeMatch[loserIndex] = s.queue.shift();
    }
  }

  s.allMatchLogs.unshift({
    id: Date.now(),
    winner,
    loser,
    date: dateStr,
    time: timeStr,
    note,
  });

  return s;
}

// Reverses W/L counts only (not streaks or queue) — same as the original.
// Replaced by snapshot-based undo in milestone 4.
export function removeMatch(state, matchId) {
  const idx = state.allMatchLogs.findIndex((m) => m.id === matchId);
  if (idx === -1) return state;

  const s = structuredClone(state);
  const match = s.allMatchLogs[idx];

  if (match.date === getTodayString()) {
    if (s.todayStats[match.winner] && s.todayStats[match.winner].wins > 0) {
      s.todayStats[match.winner].wins -= 1;
    }
    if (s.todayStats[match.loser] && s.todayStats[match.loser].losses > 0) {
      s.todayStats[match.loser].losses -= 1;
    }
  }

  if (s.allTimeTeams[match.winner] && s.allTimeTeams[match.winner].wins > 0) {
    s.allTimeTeams[match.winner].wins -= 1;
  }
  if (s.allTimeTeams[match.loser] && s.allTimeTeams[match.loser].losses > 0) {
    s.allTimeTeams[match.loser].losses -= 1;
  }

  s.allMatchLogs.splice(idx, 1);
  return s;
}

export function clearAllHistory(state) {
  return { ...structuredClone(state), allMatchLogs: [] };
}

// Removes a team from court/queue/today's stats. Shared by deleteTeam and
// deleteAllTimeTeam, which did the same steps in the original.
function removeFromSession(s, teamName) {
  delete s.todayStats[teamName];
  s.queue = s.queue.filter((t) => t !== teamName);

  if (s.activeMatch.includes(teamName)) {
    s.activeMatch = s.activeMatch.filter((t) => t !== teamName);
    if (s.queue.length > 0 && s.activeMatch.length < 2) {
      s.activeMatch.push(s.queue.shift());
    }
  }
}

export function deleteTeam(state, teamName) {
  const s = structuredClone(state);
  removeFromSession(s, teamName);
  return s;
}

export function deleteAllTimeTeam(state, teamName) {
  const s = structuredClone(state);
  delete s.allTimeTeams[teamName];
  removeFromSession(s, teamName);
  return s;
}

export function startNewDay(state) {
  return { ...structuredClone(state), activeMatch: [], queue: [], todayStats: {} };
}

// Plain-text summary for the group chat: { title, text }, or null when there
// is nothing to share.
export function buildTodaySummary(state) {
  const todayStr = getTodayString();
  const todayLogs = state.allMatchLogs.filter((log) => log.date === todayStr);
  const activeTeams = Object.keys(state.todayStats).sort(
    (a, b) => state.todayStats[b].wins - state.todayStats[a].wins,
  );

  if (activeTeams.length === 0 && todayLogs.length === 0) return null;

  let summary = `UNCROWNED — SUMMARY\nDate: ${todayStr}\n\n`;

  summary += `TODAY'S STANDINGS:\n`;
  activeTeams.forEach((name, i) => {
    const t = state.todayStats[name];
    summary += `${i + 1}. ${name} - ${t.wins}W - ${t.losses}L (Streak: ${t.streak})\n`;
  });

  summary += `\nTODAY'S MATCHES (${todayLogs.length}):\n`;
  todayLogs.slice(0, 15).forEach((m) => {
    summary += `- [${m.time}] ${m.winner} def. ${m.loser}\n`;
  });
  if (todayLogs.length > 15) {
    summary += `...and ${todayLogs.length - 15} more matches.\n`;
  }

  return { title: `UNCROWNED Summary (${todayStr})`, text: summary };
}
