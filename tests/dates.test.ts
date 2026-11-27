import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  eachDay,
  fromKey,
  isDateKey,
  monthGrid,
  parseYearMonth,
  toKey,
  weekStartKey,
  weekdayIndex,
} from '../src/lib/dates';

describe('date keys', () => {
  it('uses the local date, not UTC', () => {
    // 23:30 local on Nov 27 is already Nov 28 in UTC for New York.
    expect(toKey(new Date(2026, 10, 27, 23, 30))).toBe('2026-11-27');
  });

  it('round-trips keys', () => {
    expect(toKey(fromKey('2024-02-29'))).toBe('2024-02-29');
  });

  it('validates keys', () => {
    expect(isDateKey('2026-11-27')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('2026-1-1')).toBe(false);
    expect(isDateKey(42)).toBe(false);
  });

  it('adds days across month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('handles DST changes (America/New_York)', () => {
    // Spring forward 2026-03-08, fall back 2026-11-01.
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(eachDay('2026-03-07', '2026-03-10')).toHaveLength(4);
  });
});

describe('weeks', () => {
  it('computes weekday index for both week starts', () => {
    // 2026-11-27 is a Friday.
    expect(weekdayIndex('2026-11-27', 1)).toBe(4);
    expect(weekdayIndex('2026-11-27', 0)).toBe(5);
  });

  it('finds the start of the week', () => {
    expect(weekStartKey('2026-11-27', 1)).toBe('2026-11-23'); // Monday
    expect(weekStartKey('2026-11-27', 0)).toBe('2026-11-22'); // Sunday
    expect(weekStartKey('2026-11-23', 1)).toBe('2026-11-23');
  });
});

describe('monthGrid', () => {
  it('pads to whole weeks with a Monday start', () => {
    // November 2026 starts on a Sunday.
    const grid = monthGrid(2026, 10, 1);
    expect(grid.length % 7).toBe(0);
    expect(grid.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid.filter(Boolean)).toHaveLength(30);
  });

  it('pads to whole weeks with a Sunday start', () => {
    const grid = monthGrid(2026, 10, 0);
    expect(grid[0]).toBe('2026-11-01');
    expect(grid.length).toBe(35);
  });

  it('handles February in a leap year', () => {
    expect(monthGrid(2024, 1, 1).filter(Boolean)).toHaveLength(29);
  });
});

describe('parseYearMonth', () => {
  it('parses valid values and rejects bad ones', () => {
    expect(parseYearMonth('2026-11')).toEqual({ year: 2026, month0: 10 });
    expect(parseYearMonth('2026-13')).toBeNull();
    expect(parseYearMonth('nope')).toBeNull();
    expect(parseYearMonth(undefined)).toBeNull();
  });
});
