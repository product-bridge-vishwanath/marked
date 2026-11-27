import { monthGrid, monthName, todayKey, weekdayLabels } from '../lib/dates';
import { bestStreak, countInRange, dayCounts, markSet, overallStats, yearRange } from '../lib/stats';
import { activeActivities, getActivity, store } from '../state/store';
import { h } from './dom';
import { emptyState } from './monthView';

/** Intensity 0–4 for "how many activities were marked" relative to how many exist. */
export function level(count: number, total: number): number {
  if (!count) return 0;
  if (total <= 1) return 4;
  return Math.max(1, Math.min(4, Math.ceil((count / total) * 4)));
}

export function renderYearView(host: HTMLElement, year: number) {
  const { marks, settings } = store.data;
  const today = todayKey();
  const activities = activeActivities();
  const selected = store.selection === 'all' ? null : getActivity(store.selection) ?? null;

  const header = h(
    'div',
    { class: 'view-head' },
    h(
      'div',
      { class: 'nav-group' },
      h('a', { class: 'icon-btn', href: `#/year/${year - 1}`, 'aria-label': 'Previous year' }, '‹'),
      h('h1', { class: 'view-title' }, String(year)),
      h('a', { class: 'icon-btn', href: `#/year/${year + 1}`, 'aria-label': 'Next year' }, '›'),
    ),
    year !== Number(today.slice(0, 4)) ? h('a', { class: 'btn btn-small', href: '#/year' }, 'This year') : null,
  );

  if (!activities.length) {
    host.replaceChildren(header, emptyState());
    return;
  }

  const range = yearRange(year);
  const ids = new Set(selected ? [selected.id] : activities.map((a) => a.id));
  const counts = dayCounts(marks, ids);
  const total = ids.size;

  let summary: HTMLElement;
  if (selected) {
    const set = markSet(marks, selected.id);
    summary = h(
      'div',
      { class: 'stat-line' },
      statEl(`${selected.emoji} ${countInRange(set, range)}`, `days in ${year}`),
      statEl(`${bestStreak(set, range).length}`, 'best streak'),
    );
  } else {
    const o = overallStats(marks, activities, range, today);
    summary = h(
      'div',
      { class: 'stat-line' },
      statEl(`${o.daysWithAny}`, 'days with a mark'),
      statEl(`${o.totalMarks}`, 'total marks'),
    );
  }

  const labels = weekdayLabels(settings.weekStart, 'narrow');
  const months = Array.from({ length: 12 }, (_, m) => {
    const mm = String(m + 1).padStart(2, '0');
    let monthCount = 0;
    const cells = monthGrid(year, m, settings.weekStart).map((key) => {
      if (!key) return h('span', { class: 'mini-day empty' });
      const c = counts.get(key) ?? 0;
      if (c) monthCount++;
      const el = h('span', {
        class: `mini-day l${level(c, total)} ${key === today ? 'today' : ''} ${key > today ? 'future' : ''}`,
        title: c ? `${key}: ${c} marked` : key,
      });
      return el;
    });
    return h(
      'a',
      { class: 'mini-month card', href: `#/month/${year}-${mm}`, 'aria-label': `${monthName(m)} ${year}, ${monthCount} days marked` },
      h('div', { class: 'mini-head' }, h('span', null, monthName(m, 'short')), h('span', { class: 'mini-count' }, monthCount ? String(monthCount) : '')),
      h('div', { class: 'mini-grid' }, labels.map((l) => h('span', { class: 'mini-wd' }, l)), cells),
    );
  });

  const grid = h('div', { class: 'year-grid' }, months);
  grid.style.setProperty('--c', selected?.color ?? 'var(--accent)');

  const legend = h(
    'div',
    { class: 'legend' },
    h('span', null, selected ? 'Not marked' : 'Fewer'),
    [0, 1, 2, 3, 4].filter((l) => !selected || l === 0 || l === 4).map((l) => h('span', { class: `mini-day l${l}` })),
    h('span', null, selected ? 'Marked' : 'More activities'),
  );
  legend.style.setProperty('--c', selected?.color ?? 'var(--accent)');

  host.replaceChildren(header, summary, grid, legend);
}

function statEl(value: string, label: string) {
  return h('div', { class: 'stat' }, h('strong', null, value), h('span', null, label));
}
