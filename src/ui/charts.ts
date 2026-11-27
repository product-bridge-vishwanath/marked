import { addDays, fromKey, monthName, todayKey, weekStartKey, weekdayLabels, type DateKey, type WeekStart } from '../lib/dates';
import { h, s } from './dom';
import { level } from './yearView';

/** Vertical bar chart with value labels. Color comes from the --c CSS variable. */
export function barChart(values: number[], labels: string[], opts: { title: string; highlight?: number }) {
  const W = 320;
  const H = 150;
  const top = 18;
  const bottom = 22;
  const max = Math.max(1, ...values);
  const slot = W / values.length;
  const barW = Math.min(28, slot * 0.62);

  const svg = s(
    'svg',
    { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `${opts.title}: ${labels.map((l, i) => `${l} ${values[i]}`).join(', ')}` },
    s('line', { x1: 0, x2: W, y1: H - bottom, y2: H - bottom, class: 'axis' }),
    values.map((v, i) => {
      const bh = ((H - top - bottom) * v) / max;
      const x = i * slot + (slot - barW) / 2;
      const y = H - bottom - bh;
      return s(
        'g',
        null,
        s('rect', { x, y, width: barW, height: Math.max(bh, v ? 2 : 0), rx: 4, class: `bar ${opts.highlight === i ? 'hl' : ''}` }),
        v ? s('text', { x: x + barW / 2, y: y - 5, class: 'bar-value', 'text-anchor': 'middle' }, String(v)) : null,
        s('text', { x: x + barW / 2, y: H - 6, class: 'bar-label', 'text-anchor': 'middle' }, labels[i]),
      );
    }),
  );
  return h('figure', { class: 'chart-wrap card' }, h('figcaption', null, opts.title), svg);
}

export function weekdayChart(values: number[], weekStart: WeekStart) {
  const max = Math.max(...values);
  return barChart(values, weekdayLabels(weekStart, 'short').map((l) => l.slice(0, 3)), {
    title: 'By day of week',
    highlight: max > 0 ? values.indexOf(max) : undefined,
  });
}

export function monthChart(values: number[], year: number) {
  const now = new Date();
  return barChart(values, Array.from({ length: 12 }, (_, m) => monthName(m, 'short').slice(0, 1)), {
    title: `By month, ${year}`,
    highlight: now.getFullYear() === year ? now.getMonth() : undefined,
  });
}

/** GitHub-style year heatmap: one column per week, one row per weekday. */
export function heatmap(counts: Map<DateKey, number>, total: number, year: number, weekStart: WeekStart, title: string) {
  const cell = 11;
  const gap = 3;
  const left = 0;
  const top = 16;
  const first = weekStartKey(`${year}-01-01`, weekStart);
  const last = `${year}-12-31`;
  const today = todayKey();
  const rects: SVGElement[] = [];
  const monthLabels: SVGElement[] = [];
  let col = 0;
  for (let w = first; w <= last; w = addDays(w, 7), col++) {
    for (let r = 0; r < 7; r++) {
      const key = addDays(w, r);
      if (key.slice(0, 4) !== String(year)) continue;
      const c = counts.get(key) ?? 0;
      rects.push(
        s(
          'rect',
          {
            x: left + col * (cell + gap),
            y: top + r * (cell + gap),
            width: cell,
            height: cell,
            rx: 2.5,
            class: `hm l${level(c, total)} ${key > today ? 'future' : ''}`,
          },
          s('title', null, `${key}${c ? `: ${c}` : ''}`),
        ),
      );
      if (fromKey(key).getDate() === 1) {
        monthLabels.push(
          s('text', { x: left + col * (cell + gap), y: 10, class: 'hm-label' }, monthName(fromKey(key).getMonth(), 'short')),
        );
      }
    }
  }
  const width = left + col * (cell + gap);
  const height = top + 7 * (cell + gap);
  const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, class: 'heatmap', role: 'img', 'aria-label': title }, monthLabels, rects);
  const scroller = h('div', { class: 'heatmap-scroll' }, svg);
  // On narrow screens the heatmap scrolls sideways; show the current month first.
  if (today.startsWith(String(year))) {
    requestAnimationFrame(() => {
      const x = (fromKey(today).getMonth() / 12) * scroller.scrollWidth - scroller.clientWidth / 2;
      scroller.scrollLeft = Math.max(0, x);
    });
  }
  return h('figure', { class: 'chart-wrap card' }, h('figcaption', null, title), scroller);
}
