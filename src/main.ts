import './styles/main.css';
import { parseYearMonth, todayKey } from './lib/dates';
import { store } from './state/store';
import { renderActivityBar } from './ui/activityBar';
import { renderActivitiesView } from './ui/activitiesView';
import { h, toast } from './ui/dom';
import { renderInsightsView } from './ui/insightsView';
import { renderMonthView } from './ui/monthView';
import { applyTheme, openSettings } from './ui/settings';
import { renderYearView } from './ui/yearView';

type Route =
  | { name: 'month'; year: number; month0: number }
  | { name: 'year'; year: number }
  | { name: 'insights'; range: string }
  | { name: 'activities' };

function parseRoute(): Route {
  const [, name, arg] = location.hash.replace(/^#/, '').split('/');
  const now = todayKey();
  const year = Number(now.slice(0, 4));
  const month0 = Number(now.slice(5, 7)) - 1;
  if (name === 'year') {
    const y = Number(arg);
    return { name: 'year', year: Number.isInteger(y) && y > 1900 && y < 3000 ? y : year };
  }
  if (name === 'insights') return { name: 'insights', range: arg || 'year' };
  if (name === 'activities') return { name: 'activities' };
  const ym = parseYearMonth(arg);
  return ym ? { name: 'month', ...ym } : { name: 'month', year, month0 };
}

const tabs: { route: Route['name']; label: string; icon: string; href: string }[] = [
  { route: 'month', label: 'Month', icon: '▦', href: '#/month' },
  { route: 'year', label: 'Year', icon: '▤', href: '#/year' },
  { route: 'insights', label: 'Insights', icon: '◔', href: '#/insights' },
];

const nav = h('nav', { class: 'tabs', 'aria-label': 'Views' });
const bar = h('div', { class: 'activity-bar' });
const view = h('main', { class: 'view', id: 'view' });

document.getElementById('app')!.replaceChildren(
  h(
    'header',
    { class: 'topbar' },
    h('a', { class: 'brand', href: '#/month' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }), 'Daymarks'),
    nav,
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Settings', onclick: openSettings }, '⚙'),
  ),
  bar,
  view,
);

let lastToday = todayKey();

function render() {
  const route = parseRoute();

  // Remember keyboard focus so re-rendering after a tap doesn't lose it.
  const active = document.activeElement as HTMLElement | null;
  const focusKey = active?.dataset?.key;
  const focusInBar = active && bar.contains(active) ? [...bar.querySelectorAll('.chip')].indexOf(active) : -1;

  nav.replaceChildren(
    ...tabs.map((t) =>
      h('a', { href: t.href, class: `tab ${route.name === t.route ? 'active' : ''}`, 'aria-current': route.name === t.route ? 'page' : undefined },
        h('span', { class: 'tab-icon', 'aria-hidden': 'true' }, t.icon),
        h('span', null, t.label),
      ),
    ),
  );

  bar.hidden = route.name === 'activities';
  if (!bar.hidden) renderActivityBar(bar);

  switch (route.name) {
    case 'month':
      renderMonthView(view, route.year, route.month0);
      document.title = 'Daymarks';
      break;
    case 'year':
      renderYearView(view, route.year);
      document.title = `${route.year} · Daymarks`;
      break;
    case 'insights':
      renderInsightsView(view, route.range);
      document.title = 'Insights · Daymarks';
      break;
    case 'activities':
      renderActivitiesView(view);
      document.title = 'Activities · Daymarks';
      break;
  }

  if (focusKey) view.querySelector<HTMLElement>(`[data-key="${focusKey}"]`)?.focus();
  else if (focusInBar >= 0) bar.querySelectorAll<HTMLElement>('.chip')[focusInBar]?.focus();
}

store.subscribe(render);
store.onSaveError(() => toast('Couldn’t save. Browser storage may be full or disabled.'));
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo({ top: 0 });
});

// Theme
applyTheme(store.data.settings.theme);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(store.data.settings.theme));

// If the app stays open past midnight, move "today" forward.
const checkDay = () => {
  const t = todayKey();
  if (t !== lastToday) {
    lastToday = t;
    render();
  }
};
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkDay());
setInterval(checkDay, 60_000);

render();
