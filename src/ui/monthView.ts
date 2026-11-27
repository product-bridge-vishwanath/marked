import {
  formatLong,
  monthGrid,
  monthName,
  todayKey,
  weekdayLabels,
  type DateKey,
} from '../lib/dates';
import { monthRange, overallStats, summarizeActivity } from '../lib/stats';
import { shareMonthImage } from '../lib/shareImage';
import type { Activity } from '../state/schema';
import { activeActivities, canMark, getActivity, marksOn, store, toggleMark } from '../state/store';
import { openActivityEditor } from './activityEditor';
import { openDayChecklist } from './dayChecklist';
import { h, onPress, pct, toast } from './dom';

const SUGGESTIONS = [
  { emoji: '🏃', name: 'Run' },
  { emoji: '📖', name: 'Read' },
];

/** The day just marked with a tap, so only that cell animates on the next render. */
let justToggled: DateKey | null = null;

export function emptyState(): HTMLElement {
  return h(
    'section',
    { class: 'empty-state card' },
    h('div', { class: 'empty-emoji' }, '🗓️'),
    h('h2', null, 'Mark your days'),
    h(
      'p',
      null,
      'Add the things you want to keep doing, give each one an emoji, then tap the days you did them. You can mark as many activities on a day as you like.',
    ),
    h(
      'div',
      { class: 'suggestions' },
      SUGGESTIONS.map((sg) =>
        h(
          'button',
          { type: 'button', class: 'chip', onclick: () => openActivityEditor(undefined, sg) },
          h('span', { class: 'chip-emoji' }, sg.emoji),
          sg.name,
        ),
      ),
    ),
    h('button', { type: 'button', class: 'btn btn-primary', onclick: () => openActivityEditor() }, '+ Create your own'),
    h('p', { class: 'hint' }, 'Your data stays in this browser. Nothing is uploaded.'),
  );
}

function marksForCell(key: DateKey): Activity[] {
  return marksOn(key)
    .map((id) => getActivity(id))
    .filter((a): a is Activity => !!a)
    .sort((a, b) => a.order - b.order);
}

function cellMarks(key: DateKey, selected: Activity | null): HTMLElement {
  const marks = marksForCell(key);
  if (selected) {
    const has = marks.some((a) => a.id === selected.id);
    const others = marks.filter((a) => a.id !== selected.id);
    return h(
      'span',
      { class: 'marks marks-focus' },
      has ? h('span', { class: 'mark-big' }, selected.emoji) : null,
      others.length
        ? h(
            'span',
            { class: 'mark-dots' },
            others.slice(0, 5).map((a) => {
              const dot = h('span', { class: 'dot', title: a.name });
              dot.style.background = a.color;
              return dot;
            }),
          )
        : null,
    );
  }
  const shown = marks.length > 4 ? marks.slice(0, 3) : marks;
  return h(
    'span',
    { class: `marks marks-all n${Math.min(marks.length, 4)}` },
    shown.map((a) => h('span', { class: 'mark-emoji', title: a.name }, a.emoji)),
    marks.length > 4 ? h('span', { class: 'mark-more' }, `+${marks.length - 3}`) : null,
  );
}

export function renderMonthView(host: HTMLElement, year: number, month0: number) {
  const { settings, marks } = store.data;
  const today = todayKey();
  const activities = activeActivities();
  const selected = store.selection === 'all' ? null : getActivity(store.selection) ?? null;

  const prev = month0 === 0 ? `${year - 1}-12` : `${year}-${String(month0).padStart(2, '0')}`;
  const next = month0 === 11 ? `${year + 1}-01` : `${year}-${String(month0 + 2).padStart(2, '0')}`;
  const isCurrent = today.startsWith(`${year}-${String(month0 + 1).padStart(2, '0')}`);

  const header = h(
    'div',
    { class: 'view-head' },
    h(
      'div',
      { class: 'nav-group' },
      h('a', { class: 'icon-btn', href: `#/month/${prev}`, 'aria-label': 'Previous month' }, '‹'),
      h(
        'h1',
        { class: 'view-title' },
        h('a', { href: `#/year/${year}`, title: 'Open year view' }, `${monthName(month0)} ${year}`),
      ),
      h('a', { class: 'icon-btn', href: `#/month/${next}`, 'aria-label': 'Next month' }, '›'),
    ),
    h(
      'div',
      { class: 'nav-group' },
      isCurrent ? null : h('a', { class: 'btn btn-small', href: '#/month' }, 'Today'),
      activities.length
        ? h(
            'button',
            {
              type: 'button',
              class: 'btn btn-small',
              onclick: () => shareMonthImage(year, month0).catch(() => toast('Could not create the image')),
            },
            'Share',
          )
        : null,
    ),
  );

  if (!activities.length) {
    host.replaceChildren(header, emptyState());
    return;
  }

  // Stats line for the month.
  const range = monthRange(year, month0);
  let statLine: HTMLElement;
  if (selected) {
    const sum = summarizeActivity(marks, selected, range, today, settings.weekStart);
    statLine = h(
      'div',
      { class: 'stat-line' },
      stat(`${sum.total}`, sum.eligible ? `of ${sum.eligible} days` : 'days'),
      stat(pct(sum.completion), 'complete'),
      stat(`🔥 ${sum.current}`, 'day streak'),
      stat(`${sum.best.length}`, 'best this month'),
      selected.weeklyGoal ? stat(`${sum.thisWeek}/${selected.weeklyGoal}`, 'this week') : null,
    );
  } else {
    const o = overallStats(marks, activities, range, today);
    statLine = h(
      'div',
      { class: 'stat-line' },
      stat(`${o.daysWithAny}`, o.eligibleDays ? `of ${o.eligibleDays} days active` : 'days active'),
      stat(`${o.totalMarks}`, 'total marks'),
      stat(o.avgPerActiveDay ? o.avgPerActiveDay.toFixed(1) : '0', 'per active day'),
    );
  }

  const labels = weekdayLabels(settings.weekStart, 'short');
  const grid = h(
    'div',
    { class: `month-grid ${selected ? 'mode-focus' : 'mode-all'}`, 'aria-label': `${monthName(month0)} ${year}` },
    labels.map((l) => h('div', { class: 'weekday', 'aria-hidden': 'true' }, l)),
    monthGrid(year, month0, settings.weekStart).map((key) => {
      if (!key) return h('div', { class: 'day empty', 'aria-hidden': 'true' });
      return dayCell(key, today, selected);
    }),
  );

  const help = h(
    'p',
    { class: 'hint center' },
    selected
      ? `Tap a day to mark ${selected.emoji} ${selected.name}. Long-press or right-click a day to mark several activities.`
      : 'Tap a day to choose which activities you did. Pick an activity above to mark it with one tap.',
  );

  host.replaceChildren(header, statLine, grid, help);
  justToggled = null;

  function dayCell(key: DateKey, todayK: DateKey, sel: Activity | null) {
    const future = !canMark(key);
    const marked = marksForCell(key);
    const isSel = !!sel && marked.some((a) => a.id === sel.id);
    const label = `${formatLong(key)}${marked.length ? `: ${marked.map((a) => a.name).join(', ')}` : ''}`;
    const cell = h(
      'button',
      {
        type: 'button',
        class: `day ${key === todayK ? 'today' : ''} ${future ? 'future' : ''} ${isSel ? 'selected' : ''} ${isSel && key === justToggled ? 'pop' : ''} ${marked.length ? 'has-marks' : ''}`,
        disabled: future,
        'data-key': key,
        'aria-label': label,
        'aria-pressed': sel ? String(isSel) : undefined,
      },
      h('span', { class: 'day-num' }, String(Number(key.slice(8)))),
      cellMarks(key, sel),
    );
    if (sel) cell.style.setProperty('--c', sel.color);
    if (!future) {
      onPress(cell, {
        tap: () => {
          if (sel) {
            justToggled = key;
            const on = toggleMark(key, sel.id);
            if (on && navigator.vibrate) navigator.vibrate(8);
          } else openDayChecklist(key);
        },
        long: () => openDayChecklist(key),
      });
    }
    return cell;
  }
}

function stat(value: string, label: string) {
  return h('div', { class: 'stat' }, h('strong', null, value), h('span', null, label));
}

