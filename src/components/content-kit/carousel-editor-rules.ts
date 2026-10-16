/**
 * Pure eligibility rules for the carousel editor. Extracted from
 * CarouselEditorModal so they can be unit-tested without mounting the modal.
 *
 * Server contract these mirror (backend compose-template-remap.ts):
 * when any slide override carries a backgroundImageUrl and the request does
 * not name a role family, the WHOLE carousel is promoted to branded-overlay
 * and every slide is remapped by role (cover/body/last). So legacy carousels
 * gain a photo path — picking a photo restyles the carousel rather than
 * failing silently.
 */

/**
 * Templates rendered single-pass (text burned into the slide image — no
 * separate background layer). Compose-only re-render can't reflect text
 * edits for these; the only refresh path is a full server re-render — UNLESS
 * a photo override is present, which promotes the carousel to the
 * branded-overlay family server-side (see canRebake). Mirrors the backend's
 * cf63c01 fix ("single-pass for tweet-style, two-phase for others").
 */
export const CANNOT_RECOMPOSE = new Set(['tweet-style']);

/**
 * Legacy families that auto-restyle to branded-overlay when a photo is
 * applied. quote-card / stats-card are NOT here: an explicit role-family
 * preset wins server-side and the photo would simply not render.
 */
const PHOTO_RESTYLE_TEMPLATES = new Set(['tweet-style', 'text-box', 'photo-overlay']);

export function isPhotoRestyleTemplate(template: string | undefined): boolean {
  return PHOTO_RESTYLE_TEMPLATES.has(template || '');
}

/**
 * Photo picker visibility. Every branded-overlay slide draws a photo
 * background (body slides under a heavier overlay, renderBrandedOverlayBody),
 * and the compose route honors a per-slide backgroundImageUrl, so each slide
 * can carry its own photo. Legacy restylable templates get the picker on
 * every slide too: picking a photo anywhere promotes the whole carousel to
 * branded-overlay, and every position keeps the picker after the restyle.
 *
 * Until 2026-10-16 this was cover/last only, which left body slides stuck on
 * the cover photo or none (FUL-29, FUL-48: users want a different photo on
 * each slide).
 */
export function canShowPhotoPicker(template: string | undefined): boolean {
  if (
    template === 'branded-overlay-cover' ||
    template === 'branded-overlay-body' ||
    template === 'branded-overlay-last'
  ) {
    return true;
  }
  return isPhotoRestyleTemplate(template);
}

/**
 * Whether picking a photo should offer "Apply to all". Only for the first
 * photo in the carousel: once another slide already has a photo, the user is
 * choosing per-slide photos and the prompt would invite overwriting them.
 */
export function shouldOfferApplyToAll(
  slideIndex: number,
  effectiveBackgrounds: Array<string | undefined | null>,
): boolean {
  if (effectiveBackgrounds.length < 2) return false;
  return effectiveBackgrounds.every((bg, i) => i === slideIndex || !bg);
}

/**
 * Auto-rebake eligibility. Any composable (non-single-pass) slide makes the
 * carousel rebakeable. An all-single-pass carousel becomes rebakeable the
 * moment a photo override lands: the server promotes it to branded-overlay,
 * which CAN compose. Without that clause, the first photo picked on a
 * tweet-style carousel would never re-bake and the user would see nothing
 * change.
 */
export function canRebake(
  slides: Array<{ template?: string }>,
  overrides: Array<{ backgroundImageUrl?: string }>,
): boolean {
  if (slides.some((s) => !CANNOT_RECOMPOSE.has(s.template || ''))) return true;
  return overrides.some((o) => !!o.backgroundImageUrl);
}
