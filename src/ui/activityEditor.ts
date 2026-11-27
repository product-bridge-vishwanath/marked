import { EMOJI_GROUPS, isSingleGrapheme, lastGrapheme } from '../lib/emoji';
import { COLORS, type Activity } from '../state/schema';
import {
  addActivity,
  countMarks,
  deleteActivity,
  nextColor,
  setSelection,
  updateActivity,
} from '../state/store';
import { confirmDialog, openDialog } from './dialog';
import { h, plural, toast } from './dom';

/** Create a new activity (no argument) or edit an existing one. */
export function openActivityEditor(existing?: Activity, preset?: { name: string; emoji: string }) {
  let emoji = existing?.emoji ?? preset?.emoji ?? '✅';
  let color = existing?.color ?? nextColor();

  const preview = h('span', { class: 'chip-preview' });
  const emojiInput = h('input', {
    class: 'emoji-input',
    value: emoji,
    'aria-label': 'Emoji',
    autocomplete: 'off',
    inputmode: 'text',
    title: 'Type or paste any emoji',
  });
  const nameInput = h('input', {
    class: 'text-input',
    value: existing?.name ?? preset?.name ?? '',
    placeholder: 'e.g. Morning run',
    maxlength: 40,
    required: true,
    'aria-label': 'Activity name',
  });
  const error = h('p', { class: 'form-error', role: 'alert' });

  const goalSelect = h(
    'select',
    { class: 'select', 'aria-label': 'Weekly goal' },
    h('option', { value: '' }, 'No goal'),
    [1, 2, 3, 4, 5, 6, 7].map((n) =>
      h('option', { value: String(n), selected: existing?.weeklyGoal === n }, n === 7 ? 'Every day (7× a week)' : `${n}× a week`),
    ),
  );

  const updatePreview = () => {
    const chip = h(
      'span',
      { class: 'chip active' },
      h('span', { class: 'chip-emoji' }, emoji || '?'),
      h('span', null, nameInput.value.trim() || 'Activity'),
    );
    chip.style.setProperty('--c', color);
    preview.replaceChildren(chip);
    picker.querySelectorAll('.emoji-btn').forEach((b) => b.classList.toggle('selected', b.textContent === emoji));
  };

  const setEmoji = (value: string) => {
    emoji = value;
    emojiInput.value = value;
    updatePreview();
  };

  emojiInput.addEventListener('input', () => {
    const g = lastGrapheme(emojiInput.value);
    emoji = g;
    emojiInput.value = g;
    updatePreview();
  });
  emojiInput.addEventListener('focus', () => emojiInput.select());
  nameInput.addEventListener('input', updatePreview);

  const picker = h(
    'div',
    { class: 'emoji-picker' },
    EMOJI_GROUPS.map((group) =>
      h(
        'section',
        null,
        h('h4', null, group.name),
        h(
          'div',
          { class: 'emoji-grid' },
          group.emojis.map((e) =>
            h('button', { type: 'button', class: 'emoji-btn', 'aria-label': e, onclick: () => setEmoji(e) }, e),
          ),
        ),
      ),
    ),
  );

  const swatches = h(
    'div',
    { class: 'swatches', role: 'radiogroup', 'aria-label': 'Color' },
    COLORS.map((c) => {
      const b = h('button', {
        type: 'button',
        class: 'swatch',
        role: 'radio',
        'aria-label': c,
        'aria-checked': String(c === color),
        onclick: () => {
          color = c;
          swatches.querySelectorAll('.swatch').forEach((el) => el.setAttribute('aria-checked', String(el === b)));
          updatePreview();
        },
      });
      b.style.background = c;
      return b;
    }),
  );

  const save = () => {
    const name = nameInput.value.trim();
    if (!name) {
      error.textContent = 'Give the activity a name.';
      nameInput.focus();
      return;
    }
    if (!isSingleGrapheme(emoji)) {
      error.textContent = 'Pick one emoji.';
      emojiInput.focus();
      return;
    }
    const weeklyGoal = goalSelect.value ? Number(goalSelect.value) : undefined;
    if (existing) {
      updateActivity(existing.id, { name, emoji, color, weeklyGoal });
    } else {
      const created = addActivity({ name, emoji, color, weeklyGoal });
      setSelection(created.id);
      toast(`${emoji} ${name} added. Tap days to mark it.`);
    }
    dialog.close();
  };

  const form = h(
    'form',
    {
      class: 'editor',
      onsubmit: (e: Event) => {
        e.preventDefault();
        save();
      },
    },
    h('div', { class: 'editor-row' }, emojiInput, nameInput),
    error,
    h('p', { class: 'hint' }, 'Pick an emoji below, or type or paste any emoji into the box.'),
    picker,
    h('label', { class: 'field-label' }, 'Color'),
    swatches,
    h('label', { class: 'field-label' }, 'Weekly goal'),
    goalSelect,
    h('div', { class: 'editor-preview' }, h('span', { class: 'field-label' }, 'Preview'), preview),
    h('button', { type: 'submit', hidden: true }),
  );

  const footer = [
    existing
      ? h(
          'div',
          { class: 'foot-left' },
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost',
              onclick: () => {
                updateActivity(existing.id, { archived: !existing.archived });
                toast(existing.archived ? `${existing.name} restored` : `${existing.name} archived`);
                dialog.close();
              },
            },
            existing.archived ? 'Unarchive' : 'Archive',
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-danger-text',
              onclick: async () => {
                const n = countMarks(existing.id);
                const ok = await confirmDialog(
                  'Delete activity?',
                  `"${existing.name}" and its ${plural(n, 'marked day')} will be deleted. This can't be undone. Archive it instead to keep the history.`,
                  'Delete',
                  true,
                );
                if (ok) {
                  deleteActivity(existing.id);
                  toast(`${existing.name} deleted`);
                  dialog.close();
                }
              },
            },
            'Delete',
          ),
        )
      : null,
    h('button', { type: 'button', class: 'btn', onclick: () => dialog.close() }, 'Cancel'),
    h('button', { type: 'button', class: 'btn btn-primary', onclick: save }, existing ? 'Save' : 'Add activity'),
  ];

  const dialog = openDialog({
    title: existing ? 'Edit activity' : 'New activity',
    className: 'dialog-editor',
    body: form,
    footer,
  });
  updatePreview();
  if (!existing) nameInput.focus();
}
