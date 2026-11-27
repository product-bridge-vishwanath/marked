import { isDateKey, todayKey, type DateKey, type WeekStart } from '../lib/dates';

export type Theme = 'system' | 'light' | 'dark';

export interface Activity {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** Target number of marked days per week (1–7). Undefined = no goal. */
  weeklyGoal?: number;
  archived: boolean;
  order: number;
  createdAt: DateKey;
}

/** Day -> ids of activities marked on that day. Days with no marks are absent. */
export type Marks = Record<DateKey, string[]>;

export interface Settings {
  weekStart: WeekStart;
  theme: Theme;
}

export interface AppData {
  version: 1;
  activities: Activity[];
  marks: Marks;
  settings: Settings;
}

export const CURRENT_VERSION = 1;

export const COLORS = [
  '#6d5efc', // indigo
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#22c55e', // green
  '#84cc16', // lime
  '#eab308', // yellow
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#a855f7', // purple
  '#78716c', // stone
] as const;

export function defaultWeekStart(): WeekStart {
  // Use the locale's first day of week where the browser exposes it; default to Monday.
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info) return info.firstDay === 7 ? 0 : 1;
  } catch {
    /* not supported */
  }
  return 1;
}

export function createEmptyData(): AppData {
  return {
    version: 1,
    activities: [],
    marks: {},
    settings: { weekStart: defaultWeekStart(), theme: 'system' },
  };
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function cleanActivity(raw: unknown, index: number): Activity | null {
  if (!isObj(raw) || typeof raw.id !== 'string' || !raw.id) return null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 40) : 'Activity';
  const emoji = typeof raw.emoji === 'string' && raw.emoji ? raw.emoji : '✅';
  const color = typeof raw.color === 'string' && /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : COLORS[0];
  const goal = Number(raw.weeklyGoal);
  return {
    id: raw.id,
    name,
    emoji,
    color,
    weeklyGoal: Number.isInteger(goal) && goal >= 1 && goal <= 7 ? goal : undefined,
    archived: raw.archived === true,
    order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : index,
    createdAt: isDateKey(raw.createdAt) ? raw.createdAt : todayKey(),
  };
}

/**
 * Turn whatever is in storage into valid AppData. Unknown fields are dropped,
 * bad values fall back to defaults, and marks for unknown activities are removed.
 * Future schema versions get their upgrade steps here.
 */
export function migrate(raw: unknown): AppData {
  const data = createEmptyData();
  if (!isObj(raw)) return data;

  // (version 1 is the only version so far; add `if (raw.version === 1) { ... }` upgrades here.)

  const activities = Array.isArray(raw.activities)
    ? raw.activities.map(cleanActivity).filter((a): a is Activity => a !== null)
    : [];
  const seen = new Set<string>();
  data.activities = activities
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => a.order - b.order)
    .map((a, i) => ({ ...a, order: i }));

  if (isObj(raw.marks)) {
    for (const [key, ids] of Object.entries(raw.marks)) {
      if (!isDateKey(key) || !Array.isArray(ids)) continue;
      const valid = [...new Set(ids.filter((id): id is string => typeof id === 'string' && seen.has(id)))];
      if (valid.length) data.marks[key] = valid;
    }
  }

  if (isObj(raw.settings)) {
    const s = raw.settings;
    if (s.weekStart === 0 || s.weekStart === 1) data.settings.weekStart = s.weekStart;
    if (s.theme === 'light' || s.theme === 'dark' || s.theme === 'system') data.settings.theme = s.theme;
  }
  return data;
}
