/**
 * Inter + Playfair Display font registration for client-side canvas rendering.
 *
 * The backend canvas renderer uses these via @napi-rs/canvas's
 * GlobalFonts.registerFromPath against the bundled TTFs in
 * echome-platform-v2/src/services/image/fonts/. To get pixel parity in
 * the browser preview, we load the same TTFs via the FontFace API and
 * add them to document.fonts so canvas drawing picks them up.
 *
 * The font family name in canvas's `ctx.font` string MUST match exactly,
 * which is why we register as 'Inter' and 'Playfair Display' here.
 *
 * Inter is used by the branded-overlay family; Playfair Display is used
 * by the quote-card family.
 */

interface FontDef {
  family: 'Inter' | 'Playfair Display';
  weight: number;
  style: 'normal' | 'italic';
  url: string;
}

const FONT_DEFINITIONS: FontDef[] = [
  // Inter — used by branded-overlay templates
  { family: 'Inter', weight: 400, style: 'normal', url: '/fonts/inter/Inter-Regular.ttf' },
  { family: 'Inter', weight: 500, style: 'normal', url: '/fonts/inter/Inter-Medium.ttf' },
  { family: 'Inter', weight: 600, style: 'normal', url: '/fonts/inter/Inter-SemiBold.ttf' },
  { family: 'Inter', weight: 700, style: 'normal', url: '/fonts/inter/Inter-Bold.ttf' },
  { family: 'Inter', weight: 800, style: 'normal', url: '/fonts/inter/Inter-ExtraBold.ttf' },
  // Playfair Display — used by quote-card templates
  { family: 'Playfair Display', weight: 400, style: 'normal', url: '/fonts/playfair/PlayfairDisplay-Regular.ttf' },
  { family: 'Playfair Display', weight: 500, style: 'normal', url: '/fonts/playfair/PlayfairDisplay-Medium.ttf' },
  { family: 'Playfair Display', weight: 600, style: 'normal', url: '/fonts/playfair/PlayfairDisplay-SemiBold.ttf' },
  { family: 'Playfair Display', weight: 700, style: 'normal', url: '/fonts/playfair/PlayfairDisplay-Bold.ttf' },
];

let registrationPromise: Promise<void> | null = null;

/**
 * Register all carousel-renderer fonts (Inter + Playfair Display). Idempotent
 * — first call kicks off the load, subsequent calls await the same promise.
 *
 * The old `registerInterFonts` alias remains for backwards compat with any
 * callers that haven't yet adopted the universal name.
 */
export function registerCarouselFonts(): Promise<void> {
  if (registrationPromise) return registrationPromise;
  if (typeof document === 'undefined') return Promise.resolve();

  registrationPromise = (async () => {
    const fonts = FONT_DEFINITIONS.map((def) => {
      const face = new FontFace(def.family, `url(${def.url})`, {
        weight: String(def.weight),
        style: def.style,
        display: 'block',
      });
      return face;
    });

    const loaded = await Promise.all(
      fonts.map((f) => f.load().catch((err) => {
        console.warn('Carousel font load failed', err);
        return null;
      })),
    );

    for (const face of loaded) {
      if (face) document.fonts.add(face);
    }

    // Wait until the browser confirms each weight is ready for use in
    // canvas drawing. Without this, the first ctx.fillText after page
    // load can render with the fallback (DejaVu/sans-serif) which has
    // different metrics, breaking pixel parity with the backend.
    await Promise.all(
      FONT_DEFINITIONS.map((def) =>
        document.fonts.load(`${def.weight} 16px "${def.family}"`).catch(() => undefined),
      ),
    );
  })();

  return registrationPromise;
}

/** Legacy alias — keep until all callers migrate to registerCarouselFonts. */
export const registerInterFonts = registerCarouselFonts;

/**
 * Build the canvas font string. Mirrors backend canvas-primitives.ts:106
 * (`getFontString`) so the same `ctx.font` syntax produces identical
 * shaping in both environments.
 */
export function getFontString(size: number, weight: number): string {
  const fontWeight = weight >= 700 ? 'bold' : weight >= 500 ? '500' : 'normal';
  return `${fontWeight} ${size}px "Inter", "Noto Sans", sans-serif`;
}
