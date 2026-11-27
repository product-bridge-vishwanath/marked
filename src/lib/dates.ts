/**
 * Date helpers. Every day is identified by a local-date key "YYYY-MM-DD".
 * We never use toISOString() for keys: that is UTC and shifts days near midnight.
 */
export type DateKey = string;
export type WeekStart = 0 | 1; // 0 = Sunday, 1 = Monday

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toKey(fromKey(value)) === value;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}

export function makeKey(year: number, month0: number, day: number): DateKey {
  return toKey(new Date(year, month0, day));
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** Whole days from a to b (b - a). Rounded so DST's 23h/25h days still count as one. */
export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

export const minKey = (a: DateKey, b: DateKey) => (a < b ? a : b);
export const maxKey = (a: DateKey, b: DateKey) => (a > b ? a : b);

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

export function monthStart(year: number, month0: number): DateKey {
  return makeKey(year, month0, 1);
}

export function monthEnd(year: number, month0: number): DateKey {
  return makeKey(year, month0, daysInMonth(year, month0));
}

/** Day of week shifted so 0 is the configured first day of the week. */
export function weekdayIndex(key: DateKey, weekStart: WeekStart): number {
  return (fromKey(key).getDay() - weekStart + 7) % 7;
}

export function weekStartKey(key: DateKey, weekStart: WeekStart): DateKey {
  return addDays(key, -weekdayIndex(key, weekStart));
}

/** Cells for a month grid: leading/trailing nulls pad to whole weeks. */
export function monthGrid(year: number, month0: number, weekStart: WeekStart): (DateKey | null)[] {
  const first = monthStart(year, month0);
  const lead = weekdayIndex(first, weekStart);
  const total = daysInMonth(year, month0);
  const cells: (DateKey | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= total; d++) cells.push(makeKey(year, month0, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Inclusive list of days from `from` to `to`. */
export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export function weekdayLabels(weekStart: WeekStart, style: 'short' | 'narrow' = 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: style });
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + ((i + weekStart) % 7))));
}

export function monthName(month0: number, style: 'long' | 'short' = 'long'): string {
  return new Intl.DateTimeFormat(undefined, { month: style }).format(new Date(2023, month0, 1));
}

export function formatLong(key: DateKey): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fromKey(key));
}

export function parseYearMonth(value: string | undefined): { year: number; month0: number } | null {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const month0 = Number(m[2]) - 1;
  if (month0 < 0 || month0 > 11) return null;
  return { year: Number(m[1]), month0 };
}
