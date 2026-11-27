import { h, type Child } from './dom';

/** Open a modal <dialog>. It's removed from the page when closed. Clicking the backdrop closes it. */
export function openDialog(opts: { title: string; className?: string; body: Child; footer?: Child }) {
  const dialog = h(
    'dialog',
    { class: `dialog ${opts.className ?? ''}`, 'aria-label': opts.title },
    h(
      'div',
      { class: 'dialog-inner' },
      h(
        'header',
        { class: 'dialog-head' },
        h('h2', null, opts.title),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: () => dialog.close() }, '✕'),
      ),
      h('div', { class: 'dialog-body' }, opts.body),
      opts.footer ? h('footer', { class: 'dialog-foot' }, opts.footer) : null,
    ),
  );
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

export function confirmDialog(title: string, message: string, confirmLabel: string, danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    let result = false;
    const dialog = openDialog({
      title,
      className: 'dialog-small',
      body: h('p', null, message),
      footer: [
        h('button', { type: 'button', class: 'btn', onclick: () => dialog.close() }, 'Cancel'),
        h(
          'button',
          {
            type: 'button',
            class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`,
            onclick: () => {
              result = true;
              dialog.close();
            },
          },
          confirmLabel,
        ),
      ],
    });
    dialog.addEventListener('close', () => resolve(result));
  });
}
