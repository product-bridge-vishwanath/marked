import { detectPlatform, emojiHint, isEmoji, lastGrapheme } from '../lib/emoji';
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
  let emoji = existing?.emoji ?? preset?.emoji ?? '';
  let color = existing?.color ?? nextColor();
  const platform = detectPlatform();
  const touch = platform === 'ios' || platform === 'android';

  const preview = h('span', { class: 'chip-preview' });
  const error = h('p', { class: 'form-error', role: 'alert' });

  // The emoji box is a plain text field: focusing it brings up the device keyboard,
  // and the user switches to their own emoji keyboard / picker.
  const emojiInput = h('input', {
    class: 'emoji-input',
    value: emoji,
    placeholder: '😀',
    'aria-label': 'Emoji',
    'aria-describedby': 'emoji-hint',
    autocomplete: 'off',
    autocorrect: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    enterkeyhint: 'next',
  });
  const nameInput = h('input', {
    class: 'text-input',
    value: existing?.name ?? preset?.name ?? '',
    placeholder: 'e.g. Morning run',
    maxlength: 40,
    required: true,
    'aria-label': 'Activity name',
    enterkeyhint: 'done',
  });

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
      h('span', { class: 'chip-emoji' }, emoji || '·'),
      h('span', null, nameInput.value.trim() || 'Activity'),
    );
    chip.style.setProperty('--c', color);
    preview.replaceChildren(chip);
  };

  emojiInput.addEventListener('input', () => {
    const g = lastGrapheme(emojiInput.value);
    emojiInput.value = g;
    if (g && !isEmoji(g)) {
      error.textContent = 'That’s not an emoji. Use your keyboard’s emoji picker.';
      emojiInput.value = '';
      emoji = '';
    } else {
      error.textContent = '';
      emoji = g;
      // Picked one: move on to the name if it's still empty.
      if (g && !nameInput.value.trim()) nameInput.focus();
    }
    updatePreview();
  });
  emojiInput.addEventListener('focus', () => emojiInput.select());
  emojiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameInput.focus();
    }
  });
  nameInput.addEventListener('input', updatePreview);

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
    if (!isEmoji(emoji)) {
      error.textContent = 'Pick an emoji for this activity.';
      emojiInput.focus();
      return;
    }
    if (!name) {
      error.textContent = 'Give the activity a name.';
      nameInput.focus();
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
    h(
      'div',
      { class: 'editor-row' },
      h('label', { class: 'emoji-field' }, emojiInput, h('span', { class: 'emoji-field-label' }, 'Emoji')),
      nameInput,
    ),
    error,
    h(
      'p',
      { class: 'emoji-hint', id: 'emoji-hint' },
      h('strong', null, `${touch ? 'Tap' : 'Click'} the emoji box. `),
      emojiHint(platform),
    ),
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
  // New activity without an emoji yet: start in the emoji box so the keyboard comes up.
  if (!existing && !emoji) emojiInput.focus();
  else if (!existing) nameInput.focus();
}
