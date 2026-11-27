import { fromKey, monthName, todayKey } from '../lib/dates';
import {
  dayCounts,
  earliestStart,
  markSet,
  monthRange,
  monthlyCounts,
  overallStats,
  summarizeActivity,
  weekdayDistribution,
  yearRange,
  type ActivitySummary,
  type Range,
} from '../lib/stats';
import { activeActivities, getActivity, setSelection, store } from '../state/store';
import { heatmap, monthChart, weekdayChart } from './charts';
import { h, pct, plural } from './dom';
import { emptyState } from './monthView';

/** 'month' | 'year' | 'all' | a specific year like '2025'. */
export type RangeId = string;

function resolveRange(id: RangeId, today: string, allFrom: string): { range: Range; label: string; year: number } {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1;
  if (id === 'month') return { range: monthRange(y, m), label: `${monthName(m)} ${y}`, year: y };
  if (id === 'all') return { range: { from: allFrom, to: today }, label: 'All time', year: y };
  if (/^\d{4}$/.test(id)) return { range: yearRange(Number(id)), label: id, year: Number(id) };
  return { range: yearRange(y), label: String(y), year: y };
}

export function renderInsightsView(host: HTMLElement, rangeId: RangeId) {
  const { marks, settings } = store.data;
  const today = todayKey();
  const activities = activeActivities();
  const selected = store.selection === 'all' ? null : getActivity(store.selection) ?? null;

  const allFrom = earliestStart(marks, store.data.activities, today);
  const { range, label, year } = resolveRange(rangeId, today, allFrom);

  const thisYear = Number(today.slice(0, 4));
  const years: number[] = [];
  for (let y = thisYear - 1; y >= Number(allFrom.slice(0, 4)); y--) years.push(y);

  const select = h(
    'select',
    {
      class: 'select',
      'aria-label': 'Date range',
      onchange: (e: Event) => {
        location.hash = `#/insights/${(e.target as HTMLSelectElement).value}`;
      },
    },
    h('option', { value: 'month', selected: rangeId === 'month' }, 'This month'),
    h('option', { value: 'year', selected: rangeId === 'year' || !rangeId }, 'This year'),
    years.map((y) => h('option', { value: String(y), selected: rangeId === String(y) }, String(y))),
    h('option', { value: 'all', selected: rangeId === 'all' }, 'All time'),
  );

  const header = h('div', { class: 'view-head' }, h('h1', { class: 'view-title' }, 'Insights'), select);

  if (!activities.length) {
    host.replaceChildren(header, emptyState());
    return;
  }

  const sub = h('p', { class: 'view-sub' }, `${label} · ${selected ? `${selected.emoji} ${selected.name}` : 'All activities'}`);

  if (selected) {
    const sum = summarizeActivity(marks, selected, range, today, settings.weekStart);
    const set = markSet(marks, selected.id);
    const content = h(
      'div',
      { class: 'insights' },
      h(
        'div',
        { class: 'cards' },
        card(`${sum.total}`, 'days marked', sum.eligible ? `out of ${plural(sum.eligible, 'day')}` : undefined),
        card(pct(sum.completion), 'completion', sum.eligible ? `${sum.total} / ${sum.eligible}` : 'no days yet'),
        card(`🔥 ${sum.current}`, 'current streak', sum.current ? 'days in a row' : 'mark today to start one'),
        card(
          `${sum.best.length}`,
          'best streak',
          sum.best.start && sum.best.length > 1 ? `${shortDate(sum.best.start)} – ${shortDate(sum.best.end!)}` : undefined,
        ),
        selected.weeklyGoal && sum.goal
          ? [
              card(`${sum.thisWeek}/${selected.weeklyGoal}`, 'this week', sum.thisWeek >= selected.weeklyGoal ? 'goal met ✓' : `${selected.weeklyGoal - sum.thisWeek} to go`),
              card(pct(sum.goal.rate), 'weeks on goal', `${sum.goal.hits} of ${plural(sum.goal.counted, 'week')}`),
              card(`${sum.weekStreak}`, 'week streak', 'weeks in a row on goal'),
            ]
          : null,
      ),
      h(
        'div',
        { class: 'charts' },
        weekdayChart(weekdayDistribution(set, range, settings.weekStart), settings.weekStart),
        monthChart(monthlyCounts(set, year), year),
      ),
      heatmap(dayCounts(marks, new Set([selected.id])), 1, year, settings.weekStart, `${selected.emoji} ${selected.name} in ${year}`),
    );
    content.style.setProperty('--c', selected.color);
    host.replaceChildren(header, sub, content);
    return;
  }

  // All activities.
  const o = overallStats(marks, activities, range, today);
  const summaries = activities.map((a) => summarizeActivity(marks, a, range, today, settings.weekStart));
  const ranked = summaries.filter((s) => s.eligible > 0).sort((a, b) => b.completion - a.completion);
  const top = ranked[0];
  const ids = new Set(activities.map((a) => a.id));
  const allWeekday = Array(7).fill(0);
  const allMonthly = Array(12).fill(0);
  for (const a of activities) {
    const set = markSet(marks, a.id);
    weekdayDistribution(set, range, settings.weekStart).forEach((v, i) => (allWeekday[i] += v));
    monthlyCounts(set, year).forEach((v, i) => (allMonthly[i] += v));
  }

  const content = h(
    'div',
    { class: 'insights' },
    h(
      'div',
      { class: 'cards' },
      card(`${o.daysWithAny}`, 'active days', o.eligibleDays ? `of ${plural(o.eligibleDays, 'day')} (${pct(o.daysWithAny / o.eligibleDays)})` : undefined),
      card(`${o.totalMarks}`, 'total marks'),
      card(o.avgPerActiveDay.toFixed(1), 'activities per active day'),
      top ? card(`${top.activity.emoji} ${pct(top.completion)}`, 'most consistent', top.activity.name) : null,
    ),
    h(
      'section',
      { class: 'card table-card' },
      h('h3', null, 'Activities'),
      h(
        'table',
        { class: 'summary-table' },
        h(
          'thead',
          null,
          h('tr', null, h('th', null, 'Activity'), h('th', null, 'Days'), h('th', null, 'Done'), h('th', null, 'Streak'), h('th', null, 'Best'), h('th', null, 'Goal')),
        ),
        h('tbody', null, summaries.map(row)),
      ),
      h('p', { class: 'hint' }, 'Tap an activity for its details.'),
    ),
    h(
      'div',
      { class: 'charts' },
      weekdayChart(allWeekday, settings.weekStart),
      monthChart(allMonthly, year),
    ),
    heatmap(dayCounts(marks, ids), ids.size, year, settings.weekStart, `All activities in ${year}`),
  );
  content.style.setProperty('--c', 'var(--accent)');
  host.replaceChildren(header, sub, content);
}

function row(sum: ActivitySummary) {
  const a = sum.activity;
  const tr = h(
    'tr',
    { tabindex: 0, role: 'button', 'aria-label': `Show insights for ${a.name}` },
    h('td', null, h('span', { class: 'row-name' }, h('span', { class: 'row-emoji' }, a.emoji), a.name)),
    h('td', null, String(sum.total)),
    h('td', null, h('span', { class: 'meter' }, h('span', { class: 'meter-fill', style: { width: pct(sum.completion) } })), pct(sum.completion)),
    h('td', null, sum.current ? `🔥 ${sum.current}` : '–'),
    h('td', null, String(sum.best.length)),
    h('td', null, a.weeklyGoal && sum.goal ? `${sum.goal.hits}/${sum.goal.counted} wk` : '–'),
  );
  tr.style.setProperty('--c', a.color);
  const open = () => setSelection(a.id);
  tr.addEventListener('click', open);
  tr.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });
  return tr;
}

function card(value: string, label: string, detail?: string) {
  return h('div', { class: 'stat-card card' }, h('strong', null, value), h('span', { class: 'stat-label' }, label), detail ? h('small', null, detail) : null);
}

const shortFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
function shortDate(key: string) {
  return shortFmt.format(fromKey(key));
}
