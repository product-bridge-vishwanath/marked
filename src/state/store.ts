import { todayKey, type DateKey } from '../lib/dates';
import { COLORS, createEmptyData, migrate, newId, type Activity, type AppData, type Settings } from './schema';

const DATA_KEY = 'daymarks:v1';
const UI_KEY = 'daymarks:ui';

type Listener = () => void;

/** 'all' or an activity id. Decides both what the views show and what a tap on a day marks. */
export type Selection = 'all' | string;

let data: AppData = load();
let selection: Selection = loadSelection();
const listeners = new Set<Listener>();
let onSaveError: ((err: unknown) => void) | null = null;

function load(): AppData {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DATA_KEY);
  } catch {
    return createEmptyData();
  }
  if (!raw) return createEmptyData();
  try {
    return migrate(JSON.parse(raw));
  } catch {
    // Keep the unreadable copy so it isn't lost, then start fresh.
    try {
      localStorage.setItem(`${DATA_KEY}:corrupt`, raw);
    } catch {
      /* ignore */
    }
    return createEmptyData();
  }
}

function loadSelection(): Selection {
  try {
    const s = JSON.parse(localStorage.getItem(UI_KEY) || '{}').selection;
    if (typeof s === 'string' && (s === 'all' || data.activities.some((a) => a.id === s && !a.archived))) return s;
  } catch {
    /* ignore */
  }
  return 'all';
}

function save() {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  } catch (err) {
    onSaveError?.(err);
  }
}

function emit() {
  listeners.forEach((fn) => fn());
}

function commit() {
  // Drop the selection if its activity is gone or archived.
  if (selection !== 'all' && !data.activities.some((a) => a.id === selection && !a.archived)) {
    setSelection('all', false);
  }
  save();
  emit();
}

// Another tab changed the data: reload it so tabs don't overwrite each other.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DATA_KEY) {
      data = load();
      emit();
    }
  });
}

export const store = {
  get data(): Readonly<AppData> {
    return data;
  },
  get selection(): Selection {
    return selection;
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  onSaveError(fn: (err: unknown) => void) {
    onSaveError = fn;
  },
};

export function setSelection(next: Selection, notify = true) {
  selection = next;
  try {
    localStorage.setItem(UI_KEY, JSON.stringify({ selection }));
  } catch {
    /* ignore */
  }
  if (notify) emit();
}

/** Activities in display order. */
export function activeActivities(): Activity[] {
  return data.activities.filter((a) => !a.archived);
}

export function archivedActivities(): Activity[] {
  return data.activities.filter((a) => a.archived);
}

export function getActivity(id: string): Activity | undefined {
  return data.activities.find((a) => a.id === id);
}

export function marksOn(key: DateKey): string[] {
  return data.marks[key] ?? [];
}

export function isMarked(key: DateKey, activityId: string): boolean {
  return marksOn(key).includes(activityId);
}

export function canMark(key: DateKey): boolean {
  return key <= todayKey();
}

export function toggleMark(key: DateKey, activityId: string): boolean {
  if (!canMark(key)) return false;
  const current = marksOn(key);
  const next = current.includes(activityId) ? current.filter((id) => id !== activityId) : [...current, activityId];
  setDayMarks(key, next);
  return next.includes(activityId);
}

export function setDayMarks(key: DateKey, ids: string[]) {
  if (!canMark(key)) return;
  const unique = [...new Set(ids)].filter((id) => getActivity(id));
  const marks = { ...data.marks };
  if (unique.length) marks[key] = unique;
  else delete marks[key];
  data = { ...data, marks };
  commit();
}

export function nextColor(): string {
  const used = new Set(data.activities.map((a) => a.color));
  return COLORS.find((c) => !used.has(c)) ?? COLORS[data.activities.length % COLORS.length];
}

export function addActivity(input: Pick<Activity, 'name' | 'emoji' | 'color'> & { weeklyGoal?: number }): Activity {
  const activity: Activity = {
    id: newId(),
    name: input.name.trim().slice(0, 40),
    emoji: input.emoji,
    color: input.color,
    weeklyGoal: input.weeklyGoal,
    archived: false,
    order: data.activities.length,
    createdAt: todayKey(),
  };
  data = { ...data, activities: [...data.activities, activity] };
  commit();
  return activity;
}

export function updateActivity(id: string, patch: Partial<Omit<Activity, 'id' | 'createdAt'>>) {
  data = {
    ...data,
    activities: data.activities.map((a) =>
      a.id === id ? { ...a, ...patch, name: (patch.name ?? a.name).trim().slice(0, 40) } : a,
    ),
  };
  commit();
}

export function countMarks(activityId: string): number {
  let n = 0;
  for (const ids of Object.values(data.marks)) if (ids.includes(activityId)) n++;
  return n;
}

export function deleteActivity(id: string) {
  const marks: AppData['marks'] = {};
  for (const [key, ids] of Object.entries(data.marks)) {
    const rest = ids.filter((x) => x !== id);
    if (rest.length) marks[key] = rest;
  }
  data = {
    ...data,
    marks,
    activities: data.activities.filter((a) => a.id !== id).map((a, i) => ({ ...a, order: i })),
  };
  commit();
}

/** Move an activity up (-1) or down (+1) among the non-archived ones. */
export function moveActivity(id: string, dir: -1 | 1) {
  const list = [...data.activities];
  const visible = list.filter((a) => a.archived === getActivity(id)?.archived);
  const pos = visible.findIndex((a) => a.id === id);
  const swapWith = visible[pos + dir];
  if (pos < 0 || !swapWith) return;
  const i = list.findIndex((a) => a.id === id);
  const j = list.findIndex((a) => a.id === swapWith.id);
  [list[i], list[j]] = [list[j], list[i]];
  data = { ...data, activities: list.map((a, k) => ({ ...a, order: k })) };
  commit();
}

export function updateSettings(patch: Partial<Settings>) {
  data = { ...data, settings: { ...data.settings, ...patch } };
  commit();
}

export function clearAllData() {
  data = { ...createEmptyData(), settings: data.settings };
  setSelection('all', false);
  commit();
}
