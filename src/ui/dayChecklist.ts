import { canMark, isMarked, marksOn, activeActivities, getActivity, toggleMark } from '../state/store';
import { formatLong, todayKey, type DateKey } from '../lib/dates';
import { openActivityEditor } from './activityEditor';
import { openDialog } from './dialog';
import { h } from './dom';

/** Checklist of every activity for one day. Changes apply immediately. */
export function openDayChecklist(key: DateKey) {
  if (!canMark(key)) return;

  // Active activities, plus archived ones that are marked on this day (so they can be unmarked).
  const active = activeActivities();
  const archivedMarked = marksOn(key)
    .map((id) => getActivity(id))
    .filter((a) => a && a.archived);
  const list = [...active, ...archivedMarked];

  const body = list.length
    ? h(
        'ul',
        { class: 'checklist' },
        list.map((a) => {
          const input = h('input', { type: 'checkbox', checked: isMarked(key, a!.id) });
          input.addEventListener('change', () => {
            toggleMark(key, a!.id);
            input.checked = isMarked(key, a!.id);
          });
          const row = h(
            'li',
            null,
            h(
              'label',
              { class: 'check-row' },
              input,
              h('span', { class: 'check-emoji' }, a!.emoji),
              h('span', { class: 'check-name' }, a!.name, a!.archived ? h('small', null, ' (archived)') : null),
              h('span', { class: 'check-box', 'aria-hidden': 'true' }),
            ),
          );
          row.style.setProperty('--c', a!.color);
          return row;
        }),
      )
    : h(
        'div',
        { class: 'empty-small' },
        h('p', null, 'No activities yet.'),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary',
            onclick: () => {
              dialog.close();
              openActivityEditor();
            },
          },
          'Create an activity',
        ),
      );

  const dialog = openDialog({
    title: key === todayKey() ? `Today · ${formatLong(key)}` : formatLong(key),
    className: 'dialog-small',
    body,
    footer: h('button', { type: 'button', class: 'btn btn-primary', onclick: () => dialog.close() }, 'Done'),
  });
}
