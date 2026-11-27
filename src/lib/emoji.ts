/**
 * Emoji input helpers. There is no built-in picker: users enter emoji with their
 * device's own emoji keyboard / picker, and we keep exactly one emoji.
 */

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

export function graphemes(text: string): string[] {
  if (segmenter) return [...segmenter.segment(text)].map((s) => s.segment);
  return [...text];
}

/** The last non-space character entered, so the field always holds a single character. */
export function lastGrapheme(text: string): string {
  const parts = graphemes(text.trim()).filter((g) => g.trim());
  return parts.at(-1) ?? '';
}

/** One emoji: pictographs (incl. ZWJ sequences and skin tones), flags, or keycaps like 1️⃣. */
export function isEmoji(text: string): boolean {
  const parts = graphemes(text);
  if (parts.length !== 1) return false;
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u.test(parts[0]);
}

export type EmojiPlatform = 'mac' | 'windows' | 'ios' | 'android' | 'other';

export function detectPlatform(ua: string = navigator.userAgent, maxTouchPoints = navigator.maxTouchPoints ?? 0): EmojiPlatform {
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  // iPadOS reports itself as a Mac but has a touch screen.
  if (/Macintosh/i.test(ua)) return maxTouchPoints > 1 ? 'ios' : 'mac';
  if (/Windows/i.test(ua)) return 'windows';
  return 'other';
}

/** How to open the device's own emoji picker while the emoji box is focused. */
export function emojiHint(platform: EmojiPlatform = detectPlatform()): string {
  switch (platform) {
    case 'mac':
      return 'Press Control + Command + Space (or the 🌐 fn key) to open the emoji picker.';
    case 'windows':
      return 'Press Windows key + . (period) to open the emoji picker.';
    case 'ios':
      return 'Tap the 😀 or 🌐 key on your keyboard to switch to emoji.';
    case 'android':
      return 'Tap the 😀 key on your keyboard (or long-press the comma key) to switch to emoji.';
    default:
      return 'Use your keyboard’s emoji picker to choose an emoji.';
  }
}
