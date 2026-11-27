import type { Activity } from '../state/schema';
import { activeActivities, archivedActivities, countMarks, moveActivity, updateActivity } from '../state/store';
import { openActivityEditor } from './activityEditor';
import { h, plural } from './dom';

export function renderActivitiesView(host: HTMLElement) {
  const active = activeActivities();
  const archived = archivedActivities();

  const header = h(
    'div',
    { class: 'view-head' },
    h('h1', { class: 'view-title' }, 'Activities'),
    h('button', { type: 'button', class: 'btn btn-primary btn-small', onclick: () => openActivityEditor() }, '+ Add'),
  );

  const list = (items: Activity[], isArchived: boolean) =>
    h(
      'ul',
      { class: 'activity-list card' },
      items.map((a, i) => {
        const li = h(
          'li',
          { class: 'activity-row' },
          h('span', { class: 'row-emoji big' }, a.emoji),
          h(
            'div',
            { class: 'activity-info' },
            h('strong', null, a.name),
            h(
              'small',
              null,
              plural(countMarks(a.id), 'marked day'),
              a.weeklyGoal ? ` · goal ${a.weeklyGoal}× a week` : '',
            ),
          ),
          h(
            'div',
            { class: 'row-actions' },
            isArchived
              ? h('button', { type: 'button', class: 'btn btn-small', onclick: () => updateActivity(a.id, { archived: false }) }, 'Restore')
              : [
                  h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Move ${a.name} up`, disabled: i === 0, onclick: () => moveActivity(a.id, -1) }, '↑'),
                  h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Move ${a.name} down`, disabled: i === items.length - 1, onclick: () => moveActivity(a.id, 1) }, '↓'),
                ],
            h('button', { type: 'button', class: 'btn btn-small', onclick: () => openActivityEditor(a) }, 'Edit'),
          ),
        );
        li.style.setProperty('--c', a.color);
        return li;
      }),
    );

  host.replaceChildren(
    header,
    active.length
      ? list(active, false)
      : h('p', { class: 'hint' }, 'No activities yet. Add one to start marking days.'),
    archived.length
      ? h(
          'section',
          null,
          h('h2', { class: 'section-title' }, 'Archived'),
          h('p', { class: 'hint' }, 'Archived activities are hidden from the calendar but keep their history.'),
          list(archived, true),
        )
      : '',
    h('p', { class: 'center' }, h('a', { class: 'btn', href: '#/month' }, '← Back to calendar')),
  );
}
