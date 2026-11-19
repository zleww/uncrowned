// Winner-stays queue engine.
//
// Pure functions only: each one takes the current state and returns a new
// state without changing the old one. No DOM, no localStorage, no network.
// Anything time-based takes `now` as an argument so tests can pass a fixed date.
//
// State shape (same as the localStorage data):
//   allTimeTeams: { [name]: { wins, losses } }
//   todayStats:   { [name]: { wins, losses, streak } }
//   activeMatch:  [name, name]   (0-2 teams on court)
//   queue:        [name, ...]    (first in line at index 0)
//   allMatchLogs: [{ id, winner, loser, date, time, note }]  (newest first)

import { toDateKey } from '../utils/dates.js';

export const STREAK_LIMIT = 3;

// Object.hasOwn instead of `obj[name]` so a team called "__proto__" or
// "constructor" is treated as a normal name instead of reading (and then
// writing to) Object.prototype.
const has = (obj, key) => Object.hasOwn(obj, key);

export function createInitialState() {
  return { allTimeTeams: {}, todayStats: {}, activeMatch: [], queue: [], allMatchLogs: [] };
}

// Adds empty stat records for a team that doesn't have them yet.
function ensureTeam(state, name) {
  return {
    ...state,
    allTimeTeams: has(state.allTimeTeams, name)
      ? state.allTimeTeams
      : { ...state.allTimeTeams, [name]: { wins: 0, losses: 0 } },
    todayStats: has(state.todayStats, name)
      ? state.todayStats
      : { ...state.todayStats, [name]: { wins: 0, losses: 0, streak: 0 } },
  };
}

// Rule 1: the first two teams go on court, the rest join the queue in order.
// Returns { state, status } where status is 'ok', 'empty' or 'duplicate'.
export function registerTeam(state, rawName) {
  const name = rawName.trim();
  if (!name) return { state, status: 'empty' };
  if (state.activeMatch.includes(name) || state.queue.includes(name)) {
    return { state, status: 'duplicate' };
  }

  const next = ensureTeam(state, name);
  if (next.activeMatch.length < 2) {
    return { state: { ...next, activeMatch: [...next.activeMatch, name] }, status: 'ok' };
  }
  return { state: { ...next, queue: [...next.queue, name] }, status: 'ok' };
}

// Rules 2-5. `winnerIndex` is the winner's court slot (0 or 1).
export function recordResult(state, winnerIndex, now = new Date()) {
  if (state.activeMatch.length < 2) return state;

  const loserIndex = winnerIndex === 0 ? 1 : 0;
  const winner = state.activeMatch[winnerIndex];
  const loser = state.activeMatch[loserIndex];
  const s = ensureTeam(ensureTeam(state, winner), loser);

  // Rule 2: winner's streak +1, loser's streak back to 0.
  const w = s.todayStats[winner];
  const l = s.todayStats[loser];
  const winnerStreak = w.streak + 1;
  const reachedCap = winnerStreak >= STREAK_LIMIT;

  const todayStats = {
    ...s.todayStats,
    [winner]: { ...w, wins: w.wins + 1, streak: reachedCap ? 0 : winnerStreak },
    [loser]: { ...l, losses: l.losses + 1, streak: 0 },
  };
  const allTimeTeams = {
    ...s.allTimeTeams,
    [winner]: { ...s.allTimeTeams[winner], wins: s.allTimeTeams[winner].wins + 1 },
    [loser]: { ...s.allTimeTeams[loser], losses: s.allTimeTeams[loser].losses + 1 },
  };

  let activeMatch;
  let queue;
  let note;
  if (reachedCap) {
    // Rule 4: loser joins the queue first, then the winner (who must rest);
    // the next two in line take the court.
    const line = [...s.queue, loser, winner];
    activeMatch = line.slice(0, 2);
    queue = line.slice(2);
    note = `${STREAK_LIMIT}-win streak reached (${winner} rests)`;
  } else {
    // Rule 3: loser goes to the back; the next team takes the loser's slot.
    // Rule 5: with an empty queue the "next team" is the loser itself, so the
    // loser stays on court and the same two teams play again.
    const line = [...s.queue, loser];
    activeMatch = [...s.activeMatch];
    activeMatch[loserIndex] = line[0];
    queue = line.slice(1);
    note = 'Winner stays';
  }

  const log = {
    id: now.getTime(),
    winner,
    loser,
    date: toDateKey(now),
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    note,
  };

  return { ...s, todayStats, allTimeTeams, activeMatch, queue, allMatchLogs: [log, ...s.allMatchLogs] };
}

// Rule 6: takes a team off the court/queue and clears its stats for today.
// If a court slot opens, the next team in the queue fills it.
export function removeTeam(state, name) {
  const { [name]: _removed, ...todayStats } = state.todayStats;
  let queue = state.queue.filter((t) => t !== name);
  let activeMatch = state.activeMatch;

  if (activeMatch.includes(name)) {
    activeMatch = activeMatch.filter((t) => t !== name);
    if (queue.length > 0 && activeMatch.length < 2) {
      activeMatch = [...activeMatch, queue[0]];
      queue = queue.slice(1);
    }
  }
  return { ...state, todayStats, queue, activeMatch };
}

// Same as removeTeam, and also deletes the team's all-time record.
export function removeTeamEverywhere(state, name) {
  const { [name]: _removed, ...allTimeTeams } = state.allTimeTeams;
  return removeTeam({ ...state, allTimeTeams }, name);
}

// Deletes one match and takes its win/loss back off the stats (never below 0).
// Today's stats only change when the match was played on `today`.
// It does not restore streaks or the queue — snapshot-based undo replaces
// this in milestone 4.
export function removeMatch(state, matchId, today) {
  const match = state.allMatchLogs.find((m) => m.id === matchId);
  if (!match) return state;

  const decrement = (stats, name, field) =>
    has(stats, name) && stats[name][field] > 0
      ? { ...stats, [name]: { ...stats[name], [field]: stats[name][field] - 1 } }
      : stats;

  let todayStats = state.todayStats;
  if (match.date === today) {
    todayStats = decrement(todayStats, match.winner, 'wins');
    todayStats = decrement(todayStats, match.loser, 'losses');
  }
  let allTimeTeams = decrement(state.allTimeTeams, match.winner, 'wins');
  allTimeTeams = decrement(allTimeTeams, match.loser, 'losses');

  return {
    ...state,
    todayStats,
    allTimeTeams,
    allMatchLogs: state.allMatchLogs.filter((m) => m !== match),
  };
}

export function clearHistory(state) {
  return { ...state, allMatchLogs: [] };
}

// Rule 7: clears the court, the queue and today's stats.
// Match history and all-time records stay.
export function startNewDay(state) {
  return { ...state, activeMatch: [], queue: [], todayStats: {} };
}

// Plain-text summary for the group chat: { title, text }, or null when there
// is nothing to share.
export function buildSummary(state, now = new Date()) {
  const today = toDateKey(now);
  const todayLogs = state.allMatchLogs.filter((log) => log.date === today);
  const teams = Object.keys(state.todayStats).sort(
    (a, b) => state.todayStats[b].wins - state.todayStats[a].wins,
  );

  if (teams.length === 0 && todayLogs.length === 0) return null;

  let text = `UNCROWNED — SUMMARY\nDate: ${today}\n\n`;

  text += `TODAY'S STANDINGS:\n`;
  teams.forEach((name, i) => {
    const t = state.todayStats[name];
    text += `${i + 1}. ${name} - ${t.wins}W - ${t.losses}L (Streak: ${t.streak})\n`;
  });

  text += `\nTODAY'S MATCHES (${todayLogs.length}):\n`;
  todayLogs.slice(0, 15).forEach((m) => {
    text += `- [${m.time}] ${m.winner} def. ${m.loser}\n`;
  });
  if (todayLogs.length > 15) {
    text += `...and ${todayLogs.length - 15} more matches.\n`;
  }

  return { title: `UNCROWNED Summary (${today})`, text };
}
