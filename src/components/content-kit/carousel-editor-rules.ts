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
 * Photo picker visibility. Branded-overlay cover/last render the photo in
 * place (compose-only fast path). Legacy restylable templates get the picker
 * on the first/last slide only, mirroring the cover/last rule — after the
 * restyle those positions become branded-overlay-cover/-last, so the picker
 * stays put across the transition.
 */
export function canShowPhotoPicker(
  template: string | undefined,
  slideIndex: number,
  totalSlides: number,
): boolean {
  if (template === 'branded-overlay-cover' || template === 'branded-overlay-last') return true;
  if (isPhotoRestyleTemplate(template)) {
    return slideIndex === 0 || slideIndex === totalSlides - 1;
  }
  return false;
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
