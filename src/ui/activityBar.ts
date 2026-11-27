import { activeActivities, setSelection, store } from '../state/store';
import { openActivityEditor } from './activityEditor';
import { h, onPress } from './dom';

/**
 * Chip row. Selecting "All" shows every activity (tapping a day opens the checklist);
 * selecting an activity focuses on it (tapping a day toggles it). Long-press a chip to edit it.
 */
export function renderActivityBar(host: HTMLElement) {
  const sel = store.selection;
  const all = h(
    'button',
    { type: 'button', class: `chip chip-all ${sel === 'all' ? 'active' : ''}`, 'aria-pressed': String(sel === 'all') },
    'All',
  );
  all.addEventListener('click', () => setSelection('all'));

  const chips = activeActivities().map((a) => {
    const chip = h(
      'button',
      {
        type: 'button',
        class: `chip ${sel === a.id ? 'active' : ''}`,
        'aria-pressed': String(sel === a.id),
        title: `${a.name}. Long-press or right-click to edit.`,
      },
      h('span', { class: 'chip-emoji' }, a.emoji),
      h('span', { class: 'chip-name' }, a.name),
    );
    chip.style.setProperty('--c', a.color);
    onPress(chip, { tap: () => setSelection(sel === a.id ? 'all' : a.id), long: () => openActivityEditor(a) });
    return chip;
  });

  host.replaceChildren(
    h(
      'div',
      { class: 'chip-row', role: 'toolbar', 'aria-label': 'Activities' },
      all,
      chips,
      h(
        'button',
        { type: 'button', class: 'chip chip-add', 'aria-label': 'Add activity', onclick: () => openActivityEditor() },
        '+ Add',
      ),
      chips.length
        ? h('a', { class: 'chip chip-manage', href: '#/activities', 'aria-label': 'Manage activities' }, '✎')
        : null,
    ),
  );

  host.querySelector('.chip.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
