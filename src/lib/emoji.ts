/** Curated, offline emoji groups for the picker. Users can also type or paste any emoji. */
export const EMOJI_GROUPS: { name: string; emojis: string[] }[] = [
  {
    name: 'Fitness',
    emojis: ['🏃', '🚶', '🚴', '🏊', '🧘', '💪', '🏋️', '🤸', '⚽', '🏀', '🎾', '🏸', '🥊', '🧗', '⛹️', '🛹', '⛷️', '🥾', '🏓', '🤾'],
  },
  {
    name: 'Health',
    emojis: ['💧', '😴', '🛏️', '💊', '🦷', '🧴', '🥗', '🍎', '🥦', '🚭', '🚫', '🍵', '☕', '🧠', '❤️', '🩺', '⚖️', '🌞', '🧊', '🫁'],
  },
  {
    name: 'Mind & learning',
    emojis: ['📖', '📚', '✍️', '📝', '🎓', '🧩', '♟️', '🗣️', '🌍', '🔤', '🎧', '🎹', '🎸', '🎨', '📷', '🧑‍💻', '💡', '🔬', '🙏', '🧘‍♀️'],
  },
  {
    name: 'Home & chores',
    emojis: ['🧹', '🧺', '🍳', '🛒', '🪴', '🌱', '🐕', '🐈', '🧼', '🗑️', '🛠️', '🚿', '🛁', '👕', '🍽️', '📦', '🔑', '🏠', '🧽', '🪥'],
  },
  {
    name: 'Work & money',
    emojis: ['💼', '💻', '📈', '💰', '💵', '🏦', '📅', '⏰', '📧', '📞', '🎯', '🚀', '📊', '🗂️', '✅', '📌', '🔥', '⭐', '🏆', '⌛'],
  },
  {
    name: 'Social & fun',
    emojis: ['👨‍👩‍👧', '👫', '💬', '🎉', '🎮', '🎬', '🍿', '🎤', '🎲', '🧳', '✈️', '🚗', '🏕️', '🌊', '⛰️', '🍕', '🍰', '🍷', '🎁', '💌'],
  },
  {
    name: 'Feelings',
    emojis: ['😀', '😊', '🥰', '😌', '😐', '😔', '😢', '😡', '😤', '🤒', '🥱', '🤩', '😎', '🤔', '😇', '🥳', '😬', '🫶', '👍', '👎'],
  },
  {
    name: 'Symbols',
    emojis: ['✔️', '❌', '⭕', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟥', '🟩', '🟦', '💯', '✨', '💎', '🌈', '☀️', '🌙'],
  },
];

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

export function graphemes(text: string): string[] {
  if (segmenter) return [...segmenter.segment(text)].map((s) => s.segment);
  return [...text];
}

/** The last non-space character the user typed, so the field always holds exactly one emoji. */
export function lastGrapheme(text: string): string {
  const parts = graphemes(text.trim()).filter((g) => g.trim());
  return parts.at(-1) ?? '';
}

export function isSingleGrapheme(text: string): boolean {
  const parts = graphemes(text);
  return parts.length === 1 && parts[0].trim().length > 0;
}
