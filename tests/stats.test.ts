import { describe, expect, it } from 'vitest';
import {
  activityStart,
  bestStreak,
  countInRange,
  currentStreak,
  dayCounts,
  eligibleDays,
  markSet,
  monthlyCounts,
  overallStats,
  summarizeActivity,
  weekStreak,
  weekdayDistribution,
  weeklyGoalStats,
} from '../src/lib/stats';
import { migrate, type Activity, type Marks } from '../src/state/schema';

const act = (id: string, extra: Partial<Activity> = {}): Activity => ({
  id,
  name: id,
  emoji: '✅',
  color: '#6d5efc',
  archived: false,
  order: 0,
  createdAt: '2026-11-01',
  ...extra,
});

const set = (...keys: string[]) => new Set(keys);
const TODAY = '2026-11-27'; // Friday

describe('streaks', () => {
  it('counts the current streak including today', () => {
    expect(currentStreak(set('2026-11-25', '2026-11-26', '2026-11-27'), TODAY)).toBe(3);
  });

  it('keeps the streak alive when today is not marked yet', () => {
    expect(currentStreak(set('2026-11-25', '2026-11-26'), TODAY)).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    expect(currentStreak(set('2026-11-24', '2026-11-25'), TODAY)).toBe(0);
  });

  it('finds the best streak across a month boundary', () => {
    const s = set('2026-10-30', '2026-10-31', '2026-11-01', '2026-11-05', '2026-11-06');
    expect(bestStreak(s)).toEqual({ length: 3, start: '2026-10-30', end: '2026-11-01' });
  });

  it('limits the best streak to a range', () => {
    const s = set('2026-10-30', '2026-10-31', '2026-11-01', '2026-11-05', '2026-11-06');
    expect(bestStreak(s, { from: '2026-11-01', to: '2026-11-30' }).length).toBe(2);
  });

  it('handles empty sets', () => {
    expect(bestStreak(set()).length).toBe(0);
    expect(currentStreak(set(), TODAY)).toBe(0);
  });
});

describe('completion', () => {
  it('only counts eligible days up to today and from the start', () => {
    expect(eligibleDays('2026-11-01', { from: '2026-11-01', to: '2026-11-30' }, TODAY)).toBe(27);
    expect(eligibleDays('2026-11-20', { from: '2026-11-01', to: '2026-11-30' }, TODAY)).toBe(8);
    expect(eligibleDays('2026-11-01', { from: '2026-12-01', to: '2026-12-31' }, TODAY)).toBe(0);
  });

  it('treats back-filled marks as the start', () => {
    const a = act('run', { createdAt: '2026-11-20' });
    expect(activityStart(a, set('2026-11-10', '2026-11-21'))).toBe('2026-11-10');
  });

  it('summarizes an activity', () => {
    const marks: Marks = {
      '2026-11-25': ['run'],
      '2026-11-26': ['run', 'read'],
      '2026-11-27': ['run'],
    };
    const s = summarizeActivity(marks, act('run'), { from: '2026-11-01', to: '2026-11-30' }, TODAY, 1);
    expect(s.total).toBe(3);
    expect(s.eligible).toBe(27);
    expect(s.completion).toBeCloseTo(3 / 27);
    expect(s.current).toBe(3);
    expect(s.thisWeek).toBe(3);
  });
});

describe('weekly goals', () => {
  // Weeks starting Monday: Nov 2, 9, 16, 23 (current, in progress).
  const s = set(
    '2026-11-02', '2026-11-03', '2026-11-04', // week of Nov 2: 3
    '2026-11-10', // week of Nov 9: 1
    '2026-11-16', '2026-11-18', '2026-11-20', // week of Nov 16: 3
    '2026-11-24', // current week: 1
  );

  it('scores finished weeks and leaves the current week in progress', () => {
    const g = weeklyGoalStats(s, 3, 1, '2026-11-02', { from: '2026-11-01', to: '2026-11-30' }, TODAY);
    // The activity started Nov 2, so weeks before it are not scored.
    expect(g.weeks.map((w) => w.count)).toEqual([3, 1, 3, 1]);
    expect(g.weeks.at(-1)?.inProgress).toBe(true);
    // The current week (1 of 3 so far) is not counted as a miss.
    expect(g.counted).toBe(3);
    expect(g.hits).toBe(2);
  });

  it('counts the current week once its goal is met', () => {
    const s2 = new Set([...s, '2026-11-25', '2026-11-26']);
    const g = weeklyGoalStats(s2, 3, 1, '2026-11-02', { from: '2026-11-02', to: '2026-11-30' }, TODAY);
    expect(g.counted).toBe(4);
    expect(g.hits).toBe(3);
  });

  it('computes the week streak', () => {
    expect(weekStreak(s, 3, 1, '2026-11-02', TODAY)).toBe(1); // Nov 16 week only
    const s2 = new Set([...s, '2026-11-25', '2026-11-26']);
    expect(weekStreak(s2, 3, 1, '2026-11-02', TODAY)).toBe(2); // this week + Nov 16
  });

  it('respects a Sunday week start', () => {
    // With Sunday starts, Nov 22–28 is the current week.
    const g = weeklyGoalStats(set('2026-11-22', '2026-11-23'), 2, 0, '2026-11-22', { from: '2026-11-22', to: '2026-11-28' }, TODAY);
    expect(g.weeks).toHaveLength(1);
    expect(g.weeks[0]).toMatchObject({ start: '2026-11-22', count: 2, hit: true, inProgress: true });
  });
});

describe('distributions', () => {
  const marks: Marks = {
    '2026-11-23': ['run'], // Mon
    '2026-11-24': ['run', 'read'], // Tue
    '2026-11-27': ['read'], // Fri
    '2026-01-05': ['run'],
  };

  it('builds the mark set', () => {
    expect([...markSet(marks, 'run')].sort()).toEqual(['2026-01-05', '2026-11-23', '2026-11-24']);
    expect(countInRange(markSet(marks, 'run'), { from: '2026-11-01', to: '2026-11-30' })).toBe(2);
  });

  it('counts by weekday', () => {
    const d = weekdayDistribution(markSet(marks, 'run'), { from: '2026-01-01', to: '2026-12-31' }, 1);
    expect(d).toEqual([2, 1, 0, 0, 0, 0, 0]);
  });

  it('counts by month', () => {
    const m = monthlyCounts(markSet(marks, 'run'), 2026);
    expect(m[0]).toBe(1);
    expect(m[10]).toBe(2);
  });

  it('counts activities per day', () => {
    const c = dayCounts(marks, new Set(['run', 'read']));
    expect(c.get('2026-11-24')).toBe(2);
    expect(c.get('2026-11-27')).toBe(1);
  });

  it('computes overall stats', () => {
    const o = overallStats(marks, [act('run'), act('read')], { from: '2026-11-01', to: '2026-11-30' }, TODAY);
    expect(o.daysWithAny).toBe(3);
    expect(o.totalMarks).toBe(4);
    expect(o.avgPerActiveDay).toBeCloseTo(4 / 3);
  });
});

describe('migrate', () => {
  it('returns empty data for garbage', () => {
    expect(migrate(null).activities).toEqual([]);
    expect(migrate('x').marks).toEqual({});
  });

  it('drops marks for unknown activities and invalid dates', () => {
    const data = migrate({
      activities: [{ id: 'a', name: 'Run', emoji: '🏃', color: '#ff0000', createdAt: '2026-11-01' }],
      marks: { '2026-11-01': ['a', 'ghost', 'a'], 'bad-key': ['a'], '2026-11-02': ['ghost'] },
      settings: { weekStart: 0, theme: 'dark' },
    });
    expect(data.marks).toEqual({ '2026-11-01': ['a'] });
    expect(data.settings).toEqual({ weekStart: 0, theme: 'dark' });
    expect(data.activities[0]).toMatchObject({ id: 'a', archived: false, order: 0 });
  });

  it('rejects out-of-range weekly goals', () => {
    const data = migrate({ activities: [{ id: 'a', weeklyGoal: 9 }] });
    expect(data.activities[0].weeklyGoal).toBeUndefined();
  });
});
