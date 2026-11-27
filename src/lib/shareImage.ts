import { monthGrid, monthName, todayKey, weekdayLabels } from './dates';
import { countInRange, markSet, monthRange } from './stats';
import type { Activity } from '../state/schema';
import { activeActivities, getActivity, marksOn, store } from '../state/store';
import { toast } from '../ui/dom';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const TEXT_FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hgt: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + hgt, r);
  ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
  ctx.arcTo(x, y + hgt, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexA(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Draw the month as a PNG-ready canvas (always a light theme so it reads well anywhere). */
export function drawMonth(year: number, month0: number): HTMLCanvasElement {
  const { settings, marks } = store.data;
  const selected = store.selection === 'all' ? null : getActivity(store.selection) ?? null;
  const activities = selected ? [selected] : activeActivities();
  const cells = monthGrid(year, month0, settings.weekStart);
  const rows = cells.length / 7;
  const today = todayKey();

  const W = 1080;
  const pad = 64;
  const gap = 10;
  const cellW = (W - pad * 2 - gap * 6) / 7;
  const cellH = cellW;
  const gridTop = 260;
  const legendTop = gridTop + rows * (cellH + gap) + 40;
  const legendRows = Math.ceil(activities.length / 2);
  const H = legendTop + legendRows * 56 + 100;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f7f7fb';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#1d1b2e';
  ctx.font = `700 64px ${TEXT_FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${monthName(month0)} ${year}`, pad, 130);
  ctx.font = `500 34px ${TEXT_FONT}`;
  ctx.fillStyle = '#6b6880';
  const range = monthRange(year, month0);
  const daysWithAny = Object.keys(marks).filter(
    (k) => k >= range.from && k <= range.to && marksOn(k).some((id) => activities.some((a) => a.id === id)),
  ).length;
  ctx.fillText(
    selected ? `${selected.emoji}  ${selected.name}` : `${activities.length} activities · ${daysWithAny} active days`,
    pad,
    184,
  );

  // Weekday header
  ctx.font = `600 26px ${TEXT_FONT}`;
  ctx.fillStyle = '#8a879c';
  ctx.textAlign = 'center';
  weekdayLabels(settings.weekStart, 'short').forEach((l, i) => {
    ctx.fillText(l, pad + i * (cellW + gap) + cellW / 2, gridTop - 18);
  });

  // Cells
  cells.forEach((key, i) => {
    const x = pad + (i % 7) * (cellW + gap);
    const y = gridTop + Math.floor(i / 7) * (cellH + gap);
    if (!key) return;
    const ids = marksOn(key);
    const dayActs = ids
      .map((id) => getActivity(id))
      .filter((a): a is Activity => !!a && activities.some((x) => x.id === a.id))
      .sort((a, b) => a.order - b.order);

    roundRect(ctx, x, y, cellW, cellH, 18);
    ctx.fillStyle = selected && dayActs.length ? hexA(selected.color, 0.22) : key > today ? '#f0f0f5' : '#ffffff';
    ctx.fill();
    if (key === today) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#6d5efc';
      ctx.stroke();
    }

    ctx.textAlign = 'left';
    ctx.font = `600 24px ${TEXT_FONT}`;
    ctx.fillStyle = key > today ? '#b9b7c6' : '#4a475c';
    ctx.fillText(String(Number(key.slice(8))), x + 14, y + 34);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = x + cellW / 2;
    const cy = y + cellH / 2 + 12;
    if (selected) {
      if (dayActs.length) {
        ctx.font = `60px ${EMOJI_FONT}`;
        ctx.fillText(selected.emoji, cx, cy);
      }
    } else if (dayActs.length === 1) {
      ctx.font = `54px ${EMOJI_FONT}`;
      ctx.fillText(dayActs[0].emoji, cx, cy);
    } else if (dayActs.length === 2) {
      ctx.font = `40px ${EMOJI_FONT}`;
      ctx.fillText(dayActs[0].emoji, cx - 24, cy);
      ctx.fillText(dayActs[1].emoji, cx + 24, cy);
    } else if (dayActs.length > 2) {
      const shown = dayActs.length > 4 ? dayActs.slice(0, 3) : dayActs;
      ctx.font = `34px ${EMOJI_FONT}`;
      const pos = [
        [-22, -20],
        [22, -20],
        [-22, 22],
        [22, 22],
      ];
      shown.forEach((a, k) => ctx.fillText(a.emoji, cx + pos[k][0], cy + pos[k][1]));
      if (dayActs.length > 4) {
        ctx.font = `700 24px ${TEXT_FONT}`;
        ctx.fillStyle = '#6b6880';
        ctx.fillText(`+${dayActs.length - 3}`, cx + 22, cy + 22);
      }
    }
    ctx.textBaseline = 'alphabetic';
  });

  // Legend with counts for the month
  ctx.textAlign = 'left';
  const colW = (W - pad * 2) / 2;
  activities.forEach((a, i) => {
    const x = pad + (i % 2) * colW;
    const y = legendTop + Math.floor(i / 2) * 56 + 30;
    const n = countInRange(markSet(marks, a.id), range);
    ctx.font = `34px ${EMOJI_FONT}`;
    ctx.fillText(a.emoji, x, y + 4);
    ctx.font = `500 28px ${TEXT_FONT}`;
    ctx.fillStyle = '#1d1b2e';
    const name = a.name.length > 22 ? `${a.name.slice(0, 21)}…` : a.name;
    ctx.fillText(name, x + 52, y);
    ctx.fillStyle = a.color;
    ctx.font = `700 28px ${TEXT_FONT}`;
    ctx.fillText(`${n}`, x + colW - 70, y);
  });

  ctx.fillStyle = '#a5a2b6';
  ctx.font = `500 24px ${TEXT_FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Daymarks', W - pad, H - 40);
  return canvas;
}

export async function shareMonthImage(year: number, month0: number) {
  const canvas = drawMonth(year, month0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not render image');
  const filename = `daymarks-${year}-${String(month0 + 1).padStart(2, '0')}.png`;
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `${monthName(month0)} ${year}` });
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
      // Fall through to download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Image downloaded');
}
