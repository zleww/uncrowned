import { describe, it, expect } from 'vitest';
import {
  STREAK_LIMIT,
  createInitialState,
  registerTeam,
  recordResult,
  removeTeam,
  removeTeamEverywhere,
  removeMatch,
  clearHistory,
  startNewDay,
  buildSummary,
} from './queue.js';

// Noon UTC, so the date is the same in UTC and in Manila (UTC+8).
const NOW = new Date('2026-11-19T12:00:00Z');
const TODAY = '2026-11-19';

// Registers teams in order and returns the resulting state.
function withTeams(...names) {
  return names.reduce((s, name) => registerTeam(s, name).state, createInitialState());
}

// Freezes the whole state so a test fails if a function changes its input.
function deepFreeze(obj) {
  Object.values(obj).forEach((v) => v && typeof v === 'object' && deepFreeze(v));
  return Object.freeze(obj);
}

describe('registerTeam (rule 1)', () => {
  it('puts the first two teams on court and the rest in the queue, in order', () => {
    const s = withTeams('A', 'B', 'C', 'D');
    expect(s.activeMatch).toEqual(['A', 'B']);
    expect(s.queue).toEqual(['C', 'D']);
  });

  it('creates empty today and all-time records', () => {
    const s = withTeams('A');
    expect(s.todayStats.A).toEqual({ wins: 0, losses: 0, streak: 0 });
    expect(s.allTimeTeams.A).toEqual({ wins: 0, losses: 0 });
  });

  it('trims the name', () => {
    const { state, status } = registerTeam(createInitialState(), '  Thunder  ');
    expect(status).toBe('ok');
    expect(state.activeMatch).toEqual(['Thunder']);
  });

  it('rejects a blank name', () => {
    const start = createInitialState();
    const { state, status } = registerTeam(start, '   ');
    expect(status).toBe('empty');
    expect(state).toBe(start);
  });

  it('rejects a team already on court or in the queue', () => {
    const start = withTeams('A', 'B', 'C');
    expect(registerTeam(start, 'A').status).toBe('duplicate');
    expect(registerTeam(start, 'C').status).toBe('duplicate');
    expect(registerTeam(start, ' C ').status).toBe('duplicate');
  });

  it('keeps all-time stats when a removed team registers again', () => {
    let s = recordResult(withTeams('A', 'B'), 0, NOW);
    s = removeTeam(s, 'A');
    s = registerTeam(s, 'A').state;
    expect(s.allTimeTeams.A).toEqual({ wins: 1, losses: 0 });
    expect(s.todayStats.A).toEqual({ wins: 0, losses: 0, streak: 0 });
  });

  it('does not change the state it was given', () => {
    const start = deepFreeze(withTeams('A', 'B'));
    expect(() => registerTeam(start, 'C')).not.toThrow();
  });
});

describe('recordResult', () => {
  it('rule 2: winner gets a win and +1 streak, loser gets a loss and streak 0', () => {
    let s = withTeams('A', 'B', 'C');
    s = recordResult(s, 1, NOW); // B beats A
    expect(s.todayStats.B).toEqual({ wins: 1, losses: 0, streak: 1 });
    expect(s.todayStats.A).toEqual({ wins: 0, losses: 1, streak: 0 });
    expect(s.allTimeTeams.B).toEqual({ wins: 1, losses: 0 });
    expect(s.allTimeTeams.A).toEqual({ wins: 0, losses: 1 });
  });

  it("rule 2: a loss resets the loser's existing streak", () => {
    let s = withTeams('A', 'B', 'C');
    s = recordResult(s, 0, NOW); // A beats B, A streak 1
    s = recordResult(s, 1, NOW); // C (slot 1) beats A
    expect(s.todayStats.A.streak).toBe(0);
    expect(s.todayStats.C.streak).toBe(1);
  });

  it("rule 3: loser goes to the back and the next team takes the loser's slot", () => {
    const s = recordResult(withTeams('A', 'B', 'C', 'D'), 0, NOW);
    expect(s.activeMatch).toEqual(['A', 'C']);
    expect(s.queue).toEqual(['D', 'B']);
  });

  it('rule 3: works when the winner is in slot 1', () => {
    const s = recordResult(withTeams('A', 'B', 'C', 'D'), 1, NOW);
    expect(s.activeMatch).toEqual(['C', 'B']);
    expect(s.queue).toEqual(['D', 'A']);
  });

  it(`rule 4: at ${STREAK_LIMIT} wins in a row the loser queues first, then the winner, and the next two play`, () => {
    let s = withTeams('A', 'B', 'C', 'D', 'E');
    s = recordResult(s, 0, NOW); // A beats B
    s = recordResult(s, 0, NOW); // A beats C
    s = recordResult(s, 0, NOW); // A beats D -> cap
    expect(s.todayStats.A).toEqual({ wins: 3, losses: 0, streak: 0 });
    expect(s.activeMatch).toEqual(['E', 'B']);
    expect(s.queue).toEqual(['C', 'D', 'A']);
    expect(s.allMatchLogs[0].note).toBe(`${STREAK_LIMIT}-win streak reached (A rests)`);
  });

  it('rule 4: with only two teams, they swap slots and the streak resets', () => {
    let s = withTeams('A', 'B');
    for (let i = 0; i < STREAK_LIMIT; i++) s = recordResult(s, s.activeMatch.indexOf('A'), NOW);
    expect(s.activeMatch).toEqual(['B', 'A']);
    expect(s.queue).toEqual([]);
    expect(s.todayStats.A.streak).toBe(0);
  });

  it('rule 5: with an empty queue the loser stays on court in the same slot', () => {
    const s = recordResult(withTeams('A', 'B'), 0, NOW);
    expect(s.activeMatch).toEqual(['A', 'B']);
    expect(s.queue).toEqual([]);
    expect(s.todayStats.A.streak).toBe(1);
    expect(s.todayStats.B.streak).toBe(0);
  });

  it('adds a match log entry at the top', () => {
    let s = withTeams('A', 'B', 'C');
    s = recordResult(s, 0, NOW);
    s = recordResult(s, 0, new Date(NOW.getTime() + 60_000));
    expect(s.allMatchLogs).toHaveLength(2);
    expect(s.allMatchLogs[0]).toMatchObject({ winner: 'A', loser: 'C', date: TODAY, note: 'Winner stays' });
    expect(s.allMatchLogs[1]).toMatchObject({ id: NOW.getTime(), winner: 'A', loser: 'B' });
  });

  it('does nothing when fewer than two teams are on court', () => {
    const start = withTeams('A');
    expect(recordResult(start, 0, NOW)).toBe(start);
  });

  it('does not change the state it was given', () => {
    const start = deepFreeze(withTeams('A', 'B', 'C'));
    expect(() => recordResult(start, 0, NOW)).not.toThrow();
  });

  it.todo('files a game played at 6:00 AM Manila time under that Manila day (milestone 3)');
});

describe('removeTeam (rule 6)', () => {
  it('removes a queued team', () => {
    const s = removeTeam(withTeams('A', 'B', 'C', 'D'), 'C');
    expect(s.queue).toEqual(['D']);
    expect(s.activeMatch).toEqual(['A', 'B']);
    expect(s.todayStats).not.toHaveProperty('C');
  });

  it('fills an opened court slot with the next queued team', () => {
    const s = removeTeam(withTeams('A', 'B', 'C', 'D'), 'A');
    expect(s.activeMatch).toEqual(['B', 'C']);
    expect(s.queue).toEqual(['D']);
  });

  it('removing a team mid-game with an empty queue leaves one team waiting', () => {
    let s = recordResult(withTeams('A', 'B'), 0, NOW);
    s = removeTeam(s, 'B');
    expect(s.activeMatch).toEqual(['A']);
    expect(s.todayStats.A.streak).toBe(1);
  });

  it('a newly registered team fills the empty slot', () => {
    let s = removeTeam(withTeams('A', 'B'), 'B');
    s = registerTeam(s, 'C').state;
    expect(s.activeMatch).toEqual(['A', 'C']);
  });

  it('keeps all-time stats and match history', () => {
    let s = recordResult(withTeams('A', 'B', 'C'), 0, NOW);
    s = removeTeam(s, 'B');
    expect(s.allTimeTeams.B).toEqual({ wins: 0, losses: 1 });
    expect(s.allMatchLogs).toHaveLength(1);
  });

  it('removeTeamEverywhere also deletes the all-time record', () => {
    let s = recordResult(withTeams('A', 'B', 'C'), 0, NOW);
    s = removeTeamEverywhere(s, 'A');
    expect(s.allTimeTeams).not.toHaveProperty('A');
    expect(s.activeMatch).toEqual(['C', 'B']);
  });
});

describe('startNewDay (rule 7)', () => {
  it("clears court, queue and today's stats but keeps history and all-time records", () => {
    let s = recordResult(withTeams('A', 'B', 'C'), 0, NOW);
    s = startNewDay(s);
    expect(s.activeMatch).toEqual([]);
    expect(s.queue).toEqual([]);
    expect(s.todayStats).toEqual({});
    expect(s.allMatchLogs).toHaveLength(1);
    expect(s.allTimeTeams.A).toEqual({ wins: 1, losses: 0 });
  });
});

describe('removeMatch', () => {
  it("reverses the match's wins and losses and deletes the log entry", () => {
    let s = recordResult(withTeams('A', 'B', 'C'), 0, NOW);
    s = removeMatch(s, NOW.getTime(), TODAY);
    expect(s.todayStats.A.wins).toBe(0);
    expect(s.todayStats.B.losses).toBe(0);
    expect(s.allTimeTeams.A.wins).toBe(0);
    expect(s.allTimeTeams.B.losses).toBe(0);
    expect(s.allMatchLogs).toEqual([]);
  });

  it("leaves today's stats alone for a match from another day", () => {
    let s = recordResult(withTeams('A', 'B', 'C'), 0, NOW);
    s = removeMatch(s, NOW.getTime(), '2026-11-20');
    expect(s.todayStats.A.wins).toBe(1);
    expect(s.allTimeTeams.A.wins).toBe(0);
  });

  it('does not restore streaks or the queue (replaced by undo in milestone 4)', () => {
    let s = recordResult(withTeams('A', 'B', 'C'), 0, NOW);
    s = removeMatch(s, NOW.getTime(), TODAY);
    expect(s.todayStats.A.streak).toBe(1);
    expect(s.activeMatch).toEqual(['A', 'C']);
  });

  it('never goes below zero', () => {
    let s = recordResult(withTeams('A', 'B'), 0, NOW);
    s = startNewDay(s);
    s = removeMatch(s, NOW.getTime(), TODAY);
    expect(s.todayStats).toEqual({});
    expect(s.allTimeTeams.A.wins).toBe(0);
  });

  it('ignores an unknown id', () => {
    const start = recordResult(withTeams('A', 'B'), 0, NOW);
    expect(removeMatch(start, 123, TODAY)).toBe(start);
  });
});

describe('clearHistory', () => {
  it('empties match history only', () => {
    const s = clearHistory(recordResult(withTeams('A', 'B'), 0, NOW));
    expect(s.allMatchLogs).toEqual([]);
    expect(s.allTimeTeams.A.wins).toBe(1);
    expect(s.activeMatch).toEqual(['A', 'B']);
  });
});

describe('buildSummary', () => {
  it('returns null when nothing happened today', () => {
    expect(buildSummary(createInitialState(), NOW)).toBeNull();
  });

  it('lists standings by wins and today’s matches', () => {
    let s = withTeams('A', 'B', 'C');
    s = recordResult(s, 1, NOW); // B beats A
    const { title, text } = buildSummary(s, NOW);
    expect(title).toBe(`UNCROWNED Summary (${TODAY})`);
    expect(text).toContain(`Date: ${TODAY}`);
    expect(text).toContain('1. B - 1W - 0L (Streak: 1)');
    expect(text).toContain("TODAY'S MATCHES (1):");
    expect(text).toMatch(/- \[.+\] B def\. A\n/);
  });

  it('shows at most 15 matches', () => {
    let s = withTeams('A', 'B');
    for (let i = 0; i < 17; i++) s = recordResult(s, 0, new Date(NOW.getTime() + i));
    const { text } = buildSummary(s, NOW);
    expect(text.match(/ def\. /g)).toHaveLength(15);
    expect(text).toContain('...and 2 more matches.');
  });
});

describe('unusual team names', () => {
  it.each(['__proto__', 'constructor', 'toString'])('%s works like any other name', (name) => {
    let s = withTeams(name, 'B', 'C');
    s = recordResult(s, 0, NOW);
    expect(s.todayStats[name]).toEqual({ wins: 1, losses: 0, streak: 1 });
    expect(Object.keys(s.todayStats)).toContain(name);
    expect({}.wins).toBeUndefined(); // Object.prototype is untouched
  });
});

// Recorded from the original single-file app: the same 7 games played there
// gave exactly this court, queue and standings.
describe('full session (matches the original app)', () => {
  it('plays 7 games including a streak cap', () => {
    let s = withTeams('Alpha', 'Bravo');
    const step = (winnerSlot, court, queue) => {
      s = recordResult(s, winnerSlot, NOW);
      expect(s.activeMatch).toEqual(court);
      expect(s.queue).toEqual(queue);
    };

    step(0, ['Alpha', 'Bravo'], []);
    for (const name of ['Charlie', 'Delta', 'Echo']) s = registerTeam(s, name).state;
    step(0, ['Alpha', 'Charlie'], ['Delta', 'Echo', 'Bravo']);
    step(0, ['Delta', 'Echo'], ['Bravo', 'Charlie', 'Alpha']);
    step(0, ['Delta', 'Bravo'], ['Charlie', 'Alpha', 'Echo']);
    step(1, ['Charlie', 'Bravo'], ['Alpha', 'Echo', 'Delta']);
    step(0, ['Charlie', 'Alpha'], ['Echo', 'Delta', 'Bravo']);
    step(1, ['Echo', 'Alpha'], ['Delta', 'Bravo', 'Charlie']);

    expect(s.todayStats).toEqual({
      Alpha: { wins: 4, losses: 0, streak: 1 },
      Bravo: { wins: 1, losses: 3, streak: 0 },
      Charlie: { wins: 1, losses: 2, streak: 0 },
      Delta: { wins: 1, losses: 1, streak: 0 },
      Echo: { wins: 0, losses: 1, streak: 0 },
    });
    expect(s.allMatchLogs).toHaveLength(7);
  });
});
