import { describe, it, expect } from 'vitest';
import {
  CANNOT_RECOMPOSE,
  canShowPhotoPicker,
  shouldOfferApplyToAll,
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
  it('shows on every branded-overlay slide, body included (FUL-48)', () => {
    expect(canShowPhotoPicker('branded-overlay-cover')).toBe(true);
    expect(canShowPhotoPicker('branded-overlay-body')).toBe(true);
    expect(canShowPhotoPicker('branded-overlay-last')).toBe(true);
  });

  it('shows on every slide of a legacy restylable carousel', () => {
    expect(canShowPhotoPicker('tweet-style')).toBe(true);
    expect(canShowPhotoPicker('text-box')).toBe(true);
    expect(canShowPhotoPicker('photo-overlay')).toBe(true);
  });

  it('stays hidden for quote-card and stats-card slides (explicit family wins server-side; photo would not render)', () => {
    expect(canShowPhotoPicker('quote-card-cover')).toBe(false);
    expect(canShowPhotoPicker('quote-card-body')).toBe(false);
    expect(canShowPhotoPicker('stats-card-last')).toBe(false);
  });

  it('stays hidden when template is undefined', () => {
    expect(canShowPhotoPicker(undefined)).toBe(false);
  });
});

describe('shouldOfferApplyToAll', () => {
  it('offers on the first photo picked in the carousel (FUL-29)', () => {
    expect(shouldOfferApplyToAll(0, ['a.jpg', undefined, undefined])).toBe(true);
  });

  it('does not offer once another slide has its own photo (FUL-48 per-slide photos)', () => {
    expect(shouldOfferApplyToAll(1, ['a.jpg', 'b.jpg', undefined, 'a.jpg'])).toBe(false);
  });

  it('does not offer on a single-slide carousel', () => {
    expect(shouldOfferApplyToAll(0, ['a.jpg'])).toBe(false);
  });

  it('treats null and empty backgrounds as no photo', () => {
    expect(shouldOfferApplyToAll(2, [null, '', 'c.jpg'])).toBe(true);
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
