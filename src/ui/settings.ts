import type { Theme } from '../state/schema';
import { clearAllData, store, updateSettings } from '../state/store';
import { confirmDialog, openDialog } from './dialog';
import { h, toast } from './dom';

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14141c' : '#f7f7fb');
}

function segmented<T extends string | number>(
  label: string,
  options: { value: T; label: string }[],
  current: T,
  onChange: (v: T) => void,
) {
  const group = h(
    'div',
    { class: 'segmented', role: 'radiogroup', 'aria-label': label },
    options.map((o) => {
      const b = h(
        'button',
        { type: 'button', role: 'radio', 'aria-checked': String(o.value === current) },
        o.label,
      );
      b.addEventListener('click', () => {
        group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        onChange(o.value);
      });
      return b;
    }),
  );
  return h('div', { class: 'setting' }, h('span', { class: 'field-label' }, label), group);
}

export function openSettings() {
  const { settings } = store.data;
  const dialog = openDialog({
    title: 'Settings',
    className: 'dialog-small',
    body: [
      segmented(
        'Week starts on',
        [
          { value: 1, label: 'Monday' },
          { value: 0, label: 'Sunday' },
        ],
        settings.weekStart,
        (v) => updateSettings({ weekStart: v as 0 | 1 }),
      ),
      segmented<Theme>(
        'Theme',
        [
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ],
        settings.theme,
        (v) => {
          updateSettings({ theme: v });
          applyTheme(v);
        },
      ),
      h(
        'div',
        { class: 'setting' },
        h('span', { class: 'field-label' }, 'Your data'),
        h(
          'p',
          { class: 'hint' },
          'Everything is saved only in this browser on this device. Clearing site data or browsing privately will remove it.',
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-danger-text',
            onclick: async () => {
              const ok = await confirmDialog(
                'Delete all data?',
                'All activities and marked days will be deleted from this browser. This can’t be undone.',
                'Delete everything',
                true,
              );
              if (ok) {
                clearAllData();
                toast('All data deleted');
                dialog.close();
              }
            },
          },
          'Delete all data',
        ),
      ),
    ],
    footer: h('button', { type: 'button', class: 'btn btn-primary', onclick: () => dialog.close() }, 'Done'),
  });
}
