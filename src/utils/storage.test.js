import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadState, saveState, loadTheme } from './storage.js';

// Minimal in-memory localStorage for Node.
function fakeStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    clear: () => data.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});

describe('loadState', () => {
  it('starts empty when nothing is saved', () => {
    expect(loadState()).toEqual({ allTimeTeams: {}, todayStats: {}, activeMatch: [], queue: [], allMatchLogs: [] });
  });

  it('reads back what saveState wrote', () => {
    const state = {
      allTimeTeams: { A: { wins: 1, losses: 0 } },
      todayStats: { A: { wins: 1, losses: 0, streak: 1 } },
      activeMatch: ['A', 'B'],
      queue: ['C'],
      allMatchLogs: [],
    };
    saveState(state);
    expect(loadState()).toEqual(state);
  });

  it('does not crash on corrupt data, and keeps a backup of it', () => {
    localStorage.setItem('court_queue', '{not json');
    localStorage.setItem('court_alltime_teams', '[1,2,3]');
    const state = loadState();
    expect(state.queue).toEqual([]);
    expect(state.allTimeTeams).toEqual({});
    expect(localStorage.getItem('court_queue_corrupt_backup')).toBe('{not json');
    expect(localStorage.getItem('court_alltime_teams_corrupt_backup')).toBe('[1,2,3]');
  });

  it('keeps working when localStorage itself throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadState().queue).toEqual([]);
    expect(() => saveState(loadState())).not.toThrow();
    expect(loadTheme()).toBe('dark');
  });

  it('re-files old matches saved under the UTC day onto the Manila day', () => {
    const id = new Date('2026-11-19T06:30:00+08:00').getTime();
    localStorage.setItem(
      'court_all_logs',
      JSON.stringify([{ id, winner: 'A', loser: 'B', date: '2026-11-18', time: '06:30 AM', note: 'Winner stays' }]),
    );
    expect(loadState().allMatchLogs[0].date).toBe('2026-11-19');
  });

  it('ignores a saved theme that is not light or dark', () => {
    localStorage.setItem('court_theme', 'neon');
    expect(loadTheme()).toBe('dark');
  });
});
