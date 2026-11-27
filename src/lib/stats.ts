import {
  addDays,
  daysBetween,
  fromKey,
  maxKey,
  minKey,
  monthEnd,
  monthStart,
  weekStartKey,
  weekdayIndex,
  type DateKey,
  type WeekStart,
} from './dates';
import type { Activity, Marks } from '../state/schema';

export interface Range {
  from: DateKey;
  to: DateKey;
}

/** All days on which the activity is marked. */
export function markSet(marks: Marks, activityId: string): Set<DateKey> {
  const set = new Set<DateKey>();
  for (const key in marks) if (marks[key].includes(activityId)) set.add(key);
  return set;
}

export function countInRange(set: Set<DateKey>, range: Range): number {
  let n = 0;
  for (const k of set) if (k >= range.from && k <= range.to) n++;
  return n;
}

/**
 * Consecutive marked days ending today. If today isn't marked yet, the streak
 * through yesterday still counts (the day isn't over).
 */
export function currentStreak(set: Set<DateKey>, today: DateKey): number {
  let k = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(k)) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

export interface StreakInfo {
  length: number;
  start: DateKey | null;
  end: DateKey | null;
}

/** Longest run of consecutive marked days, optionally limited to a range. */
export function bestStreak(set: Set<DateKey>, range?: Range): StreakInfo {
  const keys = [...set].filter((k) => !range || (k >= range.from && k <= range.to)).sort();
  let best: StreakInfo = { length: 0, start: null, end: null };
  let runStart: DateKey | null = null;
  let runLen = 0;
  let prev: DateKey | null = null;
  for (const k of keys) {
    if (prev && addDays(prev, 1) === k) runLen++;
    else {
      runStart = k;
      runLen = 1;
    }
    if (runLen > best.length) best = { length: runLen, start: runStart, end: k };
    prev = k;
  }
  return best;
}

/** When tracking effectively began: creation date, or an earlier back-filled mark. */
export function activityStart(activity: Activity, set: Set<DateKey>): DateKey {
  let start = activity.createdAt;
  for (const k of set) if (k < start) start = k;
  return start;
}

/** Days the activity could have been marked within the range (never counts the future). */
export function eligibleDays(start: DateKey, range: Range, today: DateKey): number {
  const s = maxKey(start, range.from);
  const e = minKey(range.to, today);
  return e < s ? 0 : daysBetween(s, e) + 1;
}

export function ratio(part: number, whole: number): number {
  return whole > 0 ? Math.min(1, part / whole) : 0;
}

export function countWeek(set: Set<DateKey>, weekStartDay: DateKey): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (set.has(addDays(weekStartDay, i))) n++;
  return n;
}

export interface WeekResult {
  start: DateKey;
  count: number;
  hit: boolean;
  inProgress: boolean;
}

export interface GoalStats {
  weeks: WeekResult[];
  /** Weeks that are over, plus the current week if its goal is already met. */
  counted: number;
  hits: number;
  rate: number;
}

/** Week-by-week goal results for the weeks touching the range (up to this week). */
export function weeklyGoalStats(
  set: Set<DateKey>,
  goal: number,
  weekStart: WeekStart,
  start: DateKey,
  range: Range,
  today: DateKey,
): GoalStats {
  const from = maxKey(range.from, start);
  const to = minKey(range.to, today);
  const weeks: WeekResult[] = [];
  if (to >= from) {
    const current = weekStartKey(today, weekStart);
    const last = weekStartKey(to, weekStart);
    for (let w = weekStartKey(from, weekStart); w <= last; w = addDays(w, 7)) {
      const count = countWeek(set, w);
      weeks.push({ start: w, count, hit: count >= goal, inProgress: w === current });
    }
  }
  const countedWeeks = weeks.filter((w) => !w.inProgress || w.hit);
  const hits = countedWeeks.filter((w) => w.hit).length;
  return { weeks, counted: countedWeeks.length, hits, rate: ratio(hits, countedWeeks.length) };
}

/** Consecutive weeks meeting the goal, ending with this week (if already met) or last week. */
export function weekStreak(
  set: Set<DateKey>,
  goal: number,
  weekStart: WeekStart,
  start: DateKey,
  today: DateKey,
): number {
  const first = weekStartKey(start, weekStart);
  let w = weekStartKey(today, weekStart);
  let n = countWeek(set, w) >= goal ? 1 : 0;
  for (w = addDays(w, -7); w >= first; w = addDays(w, -7)) {
    if (countWeek(set, w) >= goal) n++;
    else break;
  }
  return n;
}

/** Marks per weekday, index 0 = configured first day of the week. */
export function weekdayDistribution(set: Set<DateKey>, range: Range, weekStart: WeekStart): number[] {
  const out = Array(7).fill(0);
  for (const k of set) if (k >= range.from && k <= range.to) out[weekdayIndex(k, weekStart)]++;
  return out;
}

export function monthlyCounts(set: Set<DateKey>, year: number): number[] {
  const out = Array(12).fill(0);
  for (const k of set) {
    const d = fromKey(k);
    if (d.getFullYear() === year) out[d.getMonth()]++;
  }
  return out;
}

/** Number of the given activities marked on each day (for heatmaps). */
export function dayCounts(marks: Marks, ids: Set<string>): Map<DateKey, number> {
  const out = new Map<DateKey, number>();
  for (const key in marks) {
    const n = marks[key].filter((id) => ids.has(id)).length;
    if (n) out.set(key, n);
  }
  return out;
}

export interface ActivitySummary {
  activity: Activity;
  total: number;
  eligible: number;
  completion: number;
  current: number;
  best: StreakInfo;
  goal: GoalStats | null;
  weekStreak: number;
  thisWeek: number;
}

export function summarizeActivity(
  marks: Marks,
  activity: Activity,
  range: Range,
  today: DateKey,
  weekStart: WeekStart,
): ActivitySummary {
  const set = markSet(marks, activity.id);
  const start = activityStart(activity, set);
  const total = countInRange(set, range);
  const eligible = eligibleDays(start, range, today);
  const goal = activity.weeklyGoal
    ? weeklyGoalStats(set, activity.weeklyGoal, weekStart, start, range, today)
    : null;
  return {
    activity,
    total,
    eligible,
    completion: ratio(total, eligible),
    current: currentStreak(set, today),
    best: bestStreak(set, range),
    goal,
    weekStreak: activity.weeklyGoal ? weekStreak(set, activity.weeklyGoal, weekStart, start, today) : 0,
    thisWeek: countWeek(set, weekStartKey(today, weekStart)),
  };
}

export interface OverallStats {
  daysWithAny: number;
  totalMarks: number;
  avgPerActiveDay: number;
  eligibleDays: number;
}

export function overallStats(marks: Marks, activities: Activity[], range: Range, today: DateKey): OverallStats {
  const ids = new Set(activities.map((a) => a.id));
  let daysWithAny = 0;
  let totalMarks = 0;
  for (const key in marks) {
    if (key < range.from || key > range.to) continue;
    const n = marks[key].filter((id) => ids.has(id)).length;
    if (n) {
      daysWithAny++;
      totalMarks += n;
    }
  }
  let start = range.to;
  for (const a of activities) start = minKey(start, activityStart(a, markSet(marks, a.id)));
  return {
    daysWithAny,
    totalMarks,
    avgPerActiveDay: daysWithAny ? totalMarks / daysWithAny : 0,
    eligibleDays: activities.length ? eligibleDays(start, range, today) : 0,
  };
}

/** The earliest day anything was tracked (for the "All time" range). */
export function earliestStart(marks: Marks, activities: Activity[], today: DateKey): DateKey {
  let start = today;
  for (const a of activities) start = minKey(start, activityStart(a, markSet(marks, a.id)));
  return start;
}

export function monthRange(year: number, month0: number): Range {
  return { from: monthStart(year, month0), to: monthEnd(year, month0) };
}

export function yearRange(year: number): Range {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}
