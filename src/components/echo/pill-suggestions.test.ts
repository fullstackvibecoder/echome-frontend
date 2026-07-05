import { describe, it, expect } from 'vitest';
import { getPillSuggestions } from './pill-suggestions';

describe('getPillSuggestions', () => {
  it('returns kit-page chips for a library detail route', () => {
    expect(getPillSuggestions('/app/library/d169fed1-d291-45dd-9216-521d8440cf5a')).toEqual([
      'Regenerate the LinkedIn post',
      "What's in this kit?",
      'Schedule this kit',
    ]);
  });

  it('returns library chips for the library index (no trailing id)', () => {
    expect(getPillSuggestions('/app/library')).toEqual([
      'What should I post next?',
      'Find my kit about...',
    ]);
  });

  it('returns calendar chips', () => {
    expect(getPillSuggestions('/app/calendar')).toEqual([
      "What's scheduled this week?",
      'What should I post next?',
    ]);
  });

  it('returns voice chip', () => {
    expect(getPillSuggestions('/app/voice')).toEqual([
      'How strong is my voice profile?',
    ]);
  });

  it('falls back to default chips on unknown routes', () => {
    expect(getPillSuggestions('/app/settings')).toEqual([
      'Paste a link to create content',
      'Ask me anything about your content',
    ]);
  });

  it('never returns more than 3 chips for any known route', () => {
    for (const p of ['/app/library/abc', '/app/library', '/app/calendar', '/app/voice', '/app/anything']) {
      expect(getPillSuggestions(p).length).toBeLessThanOrEqual(3);
    }
  });
});
