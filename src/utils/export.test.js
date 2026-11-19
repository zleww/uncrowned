import { describe, it, expect } from 'vitest';
import { csvCell, matchesToCSV, stateToJSON, EXPORT_VERSION } from './export.js';
import { createInitialState, registerTeam, recordResult } from '../engine/queue.js';

const NOW = new Date('2026-11-19T12:00:00Z');

describe('csvCell', () => {
  it('quotes every cell and doubles quotes inside', () => {
    expect(csvCell('Thunder')).toBe('"Thunder"');
    expect(csvCell('The "Real" Ballers')).toBe('"The ""Real"" Ballers"');
    expect(csvCell('Smith, Jones')).toBe('"Smith, Jones"');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it.each([
    '=HYPERLINK("http://example.com","Click")',
    '+1+1',
    '-2+3',
    '@SUM(A1)',
    '\t=1+1',
    '\r=1+1',
  ])('turns the formula %j into plain text', (name) => {
    expect(csvCell(name).startsWith(`"'`)).toBe(true);
  });

  it('leaves normal names and empty values alone', () => {
    expect(csvCell("O'Neal")).toBe(`"O'Neal"`);
    expect(csvCell('Team = Best')).toBe('"Team = Best"');
    expect(csvCell(undefined)).toBe('""');
  });
});

function playedState() {
  let s = createInitialState();
  for (const name of ['Thunder', '=1+1', 'Niño']) s = registerTeam(s, name).state;
  s = recordResult(s, 1, NOW); // =1+1 beats Thunder
  s = recordResult(s, 0, new Date(NOW.getTime() + 60_000)); // Niño (now in slot 0) beats =1+1
  return s;
}

describe('matchesToCSV', () => {
  it('has a BOM, a header and one row per match, oldest first, with CRLF', () => {
    const csv = matchesToCSV(playedState().allMatchLogs);
    expect(csv.startsWith('﻿"date","time","winner","loser","note"\r\n')).toBe(true);
    const rows = csv.slice(1).trimEnd().split('\r\n');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain(`"'=1+1","Thunder"`);
    expect(rows[2]).toContain(`"Niño","'=1+1"`);
  });

  it('is just the header when there are no matches', () => {
    expect(matchesToCSV([])).toBe('﻿"date","time","winner","loser","note"\r\n');
  });
});

describe('stateToJSON', () => {
  it('is a versioned backup of everything, without undo snapshots', () => {
    const state = playedState();
    const backup = JSON.parse(stateToJSON(state, NOW));
    expect(backup).toMatchObject({
      app: 'uncrowned',
      version: EXPORT_VERSION,
      exportedAt: '2026-11-19T12:00:00.000Z',
      timeZone: 'Asia/Manila',
      allTimeTeams: state.allTimeTeams,
      todayStats: state.todayStats,
      activeMatch: state.activeMatch,
      queue: state.queue,
    });
    expect(backup.matches).toHaveLength(2);
    expect(backup.matches.some((m) => 'prev' in m)).toBe(false);
    expect(state.allMatchLogs[0].prev).toBeDefined(); // the app's state is untouched
  });
});
