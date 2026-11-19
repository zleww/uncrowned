import { describe, it, expect } from 'vitest';
import { toDateKey, getTodayString, getYesterdayString, daysAgoKey, formatTime, formatDayLabel } from './dates.js';

describe('Manila dates', () => {
  it('uses the Manila day, not the UTC day', () => {
    // 7:30 AM in Manila is still the previous day in UTC.
    expect(toDateKey(new Date('2026-11-19T07:30:00+08:00'))).toBe('2026-11-19');
    expect(toDateKey(new Date('2026-11-18T23:30:00Z'))).toBe('2026-11-19');
  });

  it('rolls over at midnight Manila time', () => {
    expect(toDateKey(new Date('2026-11-19T23:59:59+08:00'))).toBe('2026-11-19');
    expect(toDateKey(new Date('2026-11-20T00:00:00+08:00'))).toBe('2026-11-20');
  });

  it('works out yesterday and earlier days, across month and year ends', () => {
    const now = new Date('2026-01-01T06:00:00+08:00');
    expect(getTodayString(now)).toBe('2026-01-01');
    expect(getYesterdayString(now)).toBe('2025-12-31');
    expect(daysAgoKey(6, now)).toBe('2025-12-26');
  });

  it('formats times in Manila time', () => {
    expect(formatTime(new Date('2026-11-19T11:05:00Z'))).toBe('07:05 PM');
  });

  it('labels days as Today, Yesterday or a short date', () => {
    const now = new Date('2026-11-19T20:00:00+08:00');
    expect(formatDayLabel('2026-11-19', now)).toBe('Today');
    expect(formatDayLabel('2026-11-18', now)).toBe('Yesterday');
    expect(formatDayLabel('2026-11-16', now)).toBe('Mon, Nov 16');
  });
});
