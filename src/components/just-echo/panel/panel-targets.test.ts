import { describe, expect, it } from 'vitest';
import type { PanelTarget } from '@/lib/just-echo-client';
import {
  formatOpenParam,
  fullPageHref,
  isUuid,
  panelTitle,
  parseOpenParam,
  samePanel,
} from './panel-targets';

describe('parseOpenParam', () => {
  it('parses kind:id', () => {
    expect(parseOpenParam('kit:abc')).toEqual({ kind: 'kit', id: 'abc' });
  });

  it('parses a bare kind', () => {
    expect(parseOpenParam('calendar')).toEqual({ kind: 'calendar' });
  });

  it('rejects unknown kinds', () => {
    expect(parseOpenParam('nope')).toBeNull();
    expect(parseOpenParam('nope:abc')).toBeNull();
  });

  it('rejects an empty string and null', () => {
    expect(parseOpenParam('')).toBeNull();
    expect(parseOpenParam(null)).toBeNull();
  });

  it('rejects an empty id after the colon', () => {
    expect(parseOpenParam('kit:')).toBeNull();
  });

  it('rejects ids longer than 100 characters', () => {
    expect(parseOpenParam(`kit:${'a'.repeat(100)}`)).toEqual({ kind: 'kit', id: 'a'.repeat(100) });
    expect(parseOpenParam(`kit:${'a'.repeat(101)}`)).toBeNull();
  });

  it('rejects unknown kinds and long ids', () => {
    expect(parseOpenParam('bogus:abc')).toBeNull();
    expect(parseOpenParam(`kit:${'x'.repeat(101)}`)).toBeNull();
  });
});

describe('formatOpenParam', () => {
  it('formats a bare kind', () => {
    expect(formatOpenParam({ kind: 'clips' })).toBe('clips');
  });

  it('formats kind:id', () => {
    expect(formatOpenParam({ kind: 'kit', id: 'abc' })).toBe('kit:abc');
  });

  it('never puts the filter in the URL', () => {
    expect(formatOpenParam({ kind: 'list', filter: { source: 'list_drafts' } })).toBe('list');
  });

  it('round-trips through parseOpenParam', () => {
    const t = { kind: 'kit', id: 'abc' } as const;
    expect(parseOpenParam(formatOpenParam(t))).toEqual(t);
  });
});

describe('panelTitle', () => {
  it.each<[PanelTarget, string]>([
    [{ kind: 'kit', id: 'x' }, 'Kit'],
    [{ kind: 'clips' }, 'Clips'],
    [{ kind: 'carousel', id: 'x' }, 'Carousel'],
    [{ kind: 'calendar' }, 'Calendar'],
    [{ kind: 'voice' }, 'Your voice'],
    [{ kind: 'list', filter: { source: 'list_drafts' } }, 'Drafts'],
    [{ kind: 'list', filter: { source: 'list_recent_posts' } }, 'Recent posts'],
    [{ kind: 'list', filter: { source: 'something_else' } }, 'Your kits'],
    [{ kind: 'list' }, 'Your kits'],
  ])('titles %j', (target, title) => {
    expect(panelTitle(target)).toBe(title);
  });
});

describe('fullPageHref', () => {
  it('links a kit with an id to its library page', () => {
    expect(fullPageHref({ kind: 'kit', id: 'abc' })).toBe('/app/library/abc');
  });

  it('encodes the kit id', () => {
    expect(fullPageHref({ kind: 'kit', id: 'a/b c?d' })).toBe('/app/library/a%2Fb%20c%3Fd');
  });

  it('links a kit without an id to the library', () => {
    expect(fullPageHref({ kind: 'kit' })).toBe('/app/library');
  });

  it('links clips to /app/clips', () => {
    expect(fullPageHref({ kind: 'clips' })).toBe('/app/clips');
  });

  it('links a carousel with an id to its library page', () => {
    expect(fullPageHref({ kind: 'carousel', id: 'abc' })).toBe('/app/library/abc');
  });

  it('links a carousel without an id to the library', () => {
    expect(fullPageHref({ kind: 'carousel' })).toBe('/app/library');
  });

  it('links calendar to /app/calendar', () => {
    expect(fullPageHref({ kind: 'calendar' })).toBe('/app/calendar');
  });

  it('links voice to /app/voice', () => {
    expect(fullPageHref({ kind: 'voice' })).toBe('/app/voice');
  });

  it('links recent posts to /app/calendar', () => {
    expect(fullPageHref({ kind: 'list', filter: { source: 'list_recent_posts' } })).toBe(
      '/app/calendar',
    );
  });

  it('links any other list to /app/library', () => {
    expect(fullPageHref({ kind: 'list', filter: { source: 'list_drafts' } })).toBe('/app/library');
    expect(fullPageHref({ kind: 'list' })).toBe('/app/library');
  });
});

describe('samePanel', () => {
  it('is true for two nulls', () => {
    expect(samePanel(null, null)).toBe(true);
  });

  it('is false when only one side is null', () => {
    expect(samePanel(null, { kind: 'clips' })).toBe(false);
    expect(samePanel({ kind: 'clips' }, null)).toBe(false);
  });

  it('compares kind and id', () => {
    expect(samePanel({ kind: 'kit', id: 'a' }, { kind: 'kit', id: 'a' })).toBe(true);
    expect(samePanel({ kind: 'kit', id: 'a' }, { kind: 'kit', id: 'b' })).toBe(false);
    expect(samePanel({ kind: 'kit', id: 'a' }, { kind: 'clips' })).toBe(false);
  });

  it('compares filter equality', () => {
    expect(
      samePanel(
        { kind: 'list', filter: { source: 'list_drafts' } },
        { kind: 'list', filter: { source: 'list_drafts' } },
      ),
    ).toBe(true);
    expect(
      samePanel(
        { kind: 'list', filter: { source: 'list_drafts' } },
        { kind: 'list', filter: { source: 'list_recent_posts' } },
      ),
    ).toBe(false);
    expect(samePanel({ kind: 'list' }, { kind: 'list', filter: { source: 'list_drafts' } })).toBe(
      false,
    );
  });
});

describe('isUuid', () => {
  it('accepts a canonical uuid', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('accepts uppercase hex', () => {
    expect(isUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
  });

  it('rejects other strings, empty strings and null', () => {
    expect(isUuid('abc')).toBe(false);
    expect(isUuid('123e4567e89b12d3a456426614174000')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});
