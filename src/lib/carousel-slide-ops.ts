/**
 * Optimistic slide-array operations for the carousel editor. These mirror
 * the backend's carousel-slide-ops.ts so the filmstrip + preview update
 * instantly; the debounced collection PATCH then persists and returns the
 * server-authoritative array.
 */

export const MIN_SLIDES = 3;
export const MAX_SLIDES = 20;

interface MinimalSlide {
  slideNumber: number;
  text: string;
  template?: string;
  publicUrl?: string;
  structured?: { headline?: string; body?: string; [k: string]: unknown };
  [k: string]: unknown;
}

/** Template-variant for a slide at `index` of `total`, given the design family. */
export function deriveTemplate(
  index: number,
  total: number,
  designPreset: string | undefined,
): string {
  const family =
    designPreset === 'branded-overlay' ||
    designPreset === 'quote-card' ||
    designPreset === 'stats-card'
      ? designPreset
      : null;
  if (!family) return 'tweet-style';
  if (index === 0) return `${family}-cover`;
  if (index === total - 1) return `${family}-last`;
  return `${family}-body`;
}

/** Renumber slideNumber 1..N and re-derive each slide's template by position. */
export function renumber<T extends MinimalSlide>(
  slides: T[],
  designPreset: string | undefined,
): T[] {
  return slides.map((s, i) => ({
    ...s,
    slideNumber: i + 1,
    template: deriveTemplate(i, slides.length, designPreset),
  }));
}

/** Move the slide at `from` to `to`, then renumber. */
export function reorderSlides<T extends MinimalSlide>(
  slides: T[],
  from: number,
  to: number,
  designPreset: string | undefined,
): T[] {
  const next = slides.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return renumber(next, designPreset);
}

/** Insert a blank slide at `index`, then renumber. */
export function insertBlankSlide<T extends MinimalSlide>(
  slides: T[],
  index: number,
  makeBlank: () => T,
  designPreset: string | undefined,
): T[] {
  const next = slides.slice();
  next.splice(index, 0, makeBlank());
  return renumber(next, designPreset);
}

/** Remove the slide at `index`, then renumber. */
export function deleteSlide<T extends MinimalSlide>(
  slides: T[],
  index: number,
  designPreset: string | undefined,
): T[] {
  const next = slides.slice();
  next.splice(index, 1);
  return renumber(next, designPreset);
}

/** True when a slide carries no user-visible content (safe to delete silently). */
export function isBlankSlide(s: MinimalSlide): boolean {
  const structuredEmpty =
    !s.structured ||
    Object.values(s.structured).every((v) => !v || (typeof v === 'string' && v.trim() === ''));
  return (!s.text || s.text.trim() === '') && structuredEmpty;
}
