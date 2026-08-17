import { describe, it, expect } from 'vitest';
import {
  CANNOT_RECOMPOSE,
  canShowPhotoPicker,
  isPhotoRestyleTemplate,
  canRebake,
} from './carousel-editor-rules';

describe('CANNOT_RECOMPOSE', () => {
  it('contains tweet-style (single-pass, no compose-only path without a photo restyle)', () => {
    expect(CANNOT_RECOMPOSE.has('tweet-style')).toBe(true);
  });

  it('does not contain composable templates', () => {
    expect(CANNOT_RECOMPOSE.has('branded-overlay-cover')).toBe(false);
    expect(CANNOT_RECOMPOSE.has('quote-card-body')).toBe(false);
  });
});

describe('canShowPhotoPicker', () => {
  it('shows for branded-overlay cover and last slides (existing behavior)', () => {
    expect(canShowPhotoPicker('branded-overlay-cover', 0, 5)).toBe(true);
    expect(canShowPhotoPicker('branded-overlay-last', 4, 5)).toBe(true);
  });

  it('stays hidden for branded-overlay body slides', () => {
    expect(canShowPhotoPicker('branded-overlay-body', 2, 5)).toBe(false);
  });

  it('shows for legacy restylable templates on the first and last slide', () => {
    expect(canShowPhotoPicker('tweet-style', 0, 5)).toBe(true);
    expect(canShowPhotoPicker('tweet-style', 4, 5)).toBe(true);
    expect(canShowPhotoPicker('text-box', 0, 3)).toBe(true);
    expect(canShowPhotoPicker('photo-overlay', 2, 3)).toBe(true);
  });

  it('stays hidden for legacy templates on middle slides (mirrors cover/last rule)', () => {
    expect(canShowPhotoPicker('tweet-style', 2, 5)).toBe(false);
    expect(canShowPhotoPicker('text-box', 1, 3)).toBe(false);
  });

  it('shows on a single-slide legacy carousel (slide is both cover and last)', () => {
    expect(canShowPhotoPicker('tweet-style', 0, 1)).toBe(true);
  });

  it('stays hidden for quote-card and stats-card slides (explicit family wins server-side; photo would not render)', () => {
    expect(canShowPhotoPicker('quote-card-cover', 0, 5)).toBe(false);
    expect(canShowPhotoPicker('stats-card-last', 4, 5)).toBe(false);
  });

  it('stays hidden when template is undefined', () => {
    expect(canShowPhotoPicker(undefined, 0, 5)).toBe(false);
  });
});

describe('isPhotoRestyleTemplate', () => {
  it('is true for legacy families that auto-restyle to branded-overlay on photo', () => {
    expect(isPhotoRestyleTemplate('tweet-style')).toBe(true);
    expect(isPhotoRestyleTemplate('text-box')).toBe(true);
    expect(isPhotoRestyleTemplate('photo-overlay')).toBe(true);
  });

  it('is false for branded-overlay slides (photo renders in place, no restyle)', () => {
    expect(isPhotoRestyleTemplate('branded-overlay-cover')).toBe(false);
    expect(isPhotoRestyleTemplate(undefined)).toBe(false);
  });
});

describe('canRebake', () => {
  const slide = (template: string) => ({ template });

  it('true when any slide is composable (existing behavior)', () => {
    expect(canRebake([slide('branded-overlay-cover'), slide('tweet-style')], [{}, {}])).toBe(true);
  });

  it('false for an all-tweet-style carousel with no photo override', () => {
    expect(canRebake([slide('tweet-style'), slide('tweet-style')], [{}, {}])).toBe(false);
  });

  it('true for an all-tweet-style carousel once a photo override lands (backend promotes to branded-overlay)', () => {
    expect(
      canRebake([slide('tweet-style'), slide('tweet-style')], [
        { backgroundImageUrl: 'https://cdn.example/p.jpg' },
        {},
      ]),
    ).toBe(true);
  });

  it('ignores empty-string photo overrides', () => {
    expect(canRebake([slide('tweet-style')], [{ backgroundImageUrl: '' }])).toBe(false);
  });

  it('handles overrides array shorter than slides', () => {
    expect(canRebake([slide('tweet-style'), slide('tweet-style')], [])).toBe(false);
  });
});
