/** Tiny DOM builder. Text children are always set as text, so user input can't inject HTML. */
export type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, unknown> | null | undefined;

function applyProps(el: Element, props: Props) {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'class') {
      el.setAttribute('class', String(value));
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign((el as HTMLElement).style, value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else if (key in el && !key.includes('-') && key !== 'list' && !(el instanceof SVGElement)) {
      (el as unknown as Record<string, unknown>)[key] = value;
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

function append(el: Element, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : String(c));
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyProps(el, props);
  append(el, children);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  props?: Props,
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, props);
  append(el, children);
  return el;
}

/**
 * Tap vs long-press (or right-click) handling for a button.
 * Long-press fires after 450 ms on touch/pen/mouse; right-click fires immediately.
 * Shift+Enter acts as the long-press from the keyboard.
 */
export function onPress(el: HTMLElement, handlers: { tap: () => void; long: () => void }) {
  let timer: number | undefined;
  let longFired = false;
  let pointerType = 'mouse';
  let startX = 0;
  let startY = 0;

  const cancel = () => {
    if (timer) window.clearTimeout(timer);
    timer = undefined;
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pointerType = e.pointerType;
    longFired = false;
    startX = e.clientX;
    startY = e.clientY;
    cancel();
    timer = window.setTimeout(() => {
      timer = undefined;
      longFired = true;
      navigator.vibrate?.(10);
      handlers.long();
    }, 450);
  });
  el.addEventListener('pointermove', (e) => {
    if (timer && Math.hypot(e.clientX - startX, e.clientY - startY) > 10) cancel();
  });
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointerleave', cancel);

  el.addEventListener('click', (e) => {
    if (longFired) {
      // The click that ends a long-press shouldn't also toggle.
      longFired = false;
      e.preventDefault();
      return;
    }
    handlers.tap();
  });

  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // On touch, the long-press timer already handled it.
    if (pointerType === 'touch' || pointerType === 'pen') return;
    cancel();
    handlers.long();
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handlers.long();
    }
  });
}

export function clear(el: Element) {
  el.replaceChildren();
}

/** Short message at the bottom of the screen. */
export function toast(message: string) {
  let host = document.getElementById('toast');
  if (!host) {
    host = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  const item = h('div', { class: 'toast-item' }, message);
  host.append(item);
  window.setTimeout(() => item.classList.add('out'), 2200);
  window.setTimeout(() => item.remove(), 2600);
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
