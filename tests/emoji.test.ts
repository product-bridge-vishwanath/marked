import { describe, expect, it } from 'vitest';
import { detectPlatform, emojiHint, isEmoji, lastGrapheme } from '../src/lib/emoji';

describe('isEmoji', () => {
  it('accepts single emoji, including sequences', () => {
    for (const e of ['🏃', '📖', '❤️', '👍🏽', '👨‍👩‍👧', '🏳️‍🌈', '🇮🇳', '1️⃣', '🧘‍♀️']) expect(isEmoji(e), e).toBe(true);
  });

  it('rejects letters, digits, empty and multiple emoji', () => {
    for (const e of ['a', 'R', '1', '', ' ', '🏃📖', 'ab']) expect(isEmoji(e), e).toBe(false);
  });
});

describe('lastGrapheme', () => {
  it('keeps only the last character entered', () => {
    expect(lastGrapheme('🏃📖')).toBe('📖');
    expect(lastGrapheme('🏃👨‍👩‍👧')).toBe('👨‍👩‍👧');
    expect(lastGrapheme('  ')).toBe('');
  });
});

describe('platform hints', () => {
  it('detects platforms from the user agent', () => {
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('mac');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios'); // iPad
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5)).toBe('android');
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe('windows');
    expect(detectPlatform('Mozilla/5.0 (X11; Linux x86_64)', 0)).toBe('other');
  });

  it('gives the right shortcut', () => {
    expect(emojiHint('mac')).toContain('Control + Command + Space');
    expect(emojiHint('windows')).toContain('Windows key + .');
    expect(emojiHint('ios')).toContain('keyboard');
  });
});
