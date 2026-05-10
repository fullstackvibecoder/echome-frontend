/**
 * Inter font registration for client-side canvas rendering.
 *
 * The backend canvas renderer uses Inter via @napi-rs/canvas's
 * GlobalFonts.registerFromPath against the bundled TTFs in
 * src/services/image/fonts/. To get pixel parity in the browser preview,
 * we load the same TTFs via the FontFace API and add them to
 * document.fonts so canvas drawing picks them up.
 *
 * The font family name in canvas's `ctx.font` string MUST match exactly,
 * which is why we register as 'Inter' here.
 */

const FONT_DEFINITIONS: Array<{
  weight: number;
  style: 'normal' | 'italic';
  url: string;
}> = [
  { weight: 400, style: 'normal', url: '/fonts/inter/Inter-Regular.ttf' },
  { weight: 500, style: 'normal', url: '/fonts/inter/Inter-Medium.ttf' },
  { weight: 600, style: 'normal', url: '/fonts/inter/Inter-SemiBold.ttf' },
  { weight: 700, style: 'normal', url: '/fonts/inter/Inter-Bold.ttf' },
  { weight: 800, style: 'normal', url: '/fonts/inter/Inter-ExtraBold.ttf' },
];

let registrationPromise: Promise<void> | null = null;

export function registerInterFonts(): Promise<void> {
  if (registrationPromise) return registrationPromise;
  if (typeof document === 'undefined') return Promise.resolve();

  registrationPromise = (async () => {
    const fonts = FONT_DEFINITIONS.map((def) => {
      const face = new FontFace('Inter', `url(${def.url})`, {
        weight: String(def.weight),
        style: def.style,
        display: 'block',
      });
      return face;
    });

    const loaded = await Promise.all(
      fonts.map((f) => f.load().catch((err) => {
        console.warn('Inter font load failed', err);
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
        document.fonts.load(`${def.weight} 16px Inter`).catch(() => undefined),
      ),
    );
  })();

  return registrationPromise;
}

/**
 * Build the canvas font string. Mirrors backend canvas-primitives.ts:106
 * (`getFontString`) so the same `ctx.font` syntax produces identical
 * shaping in both environments.
 */
export function getFontString(size: number, weight: number): string {
  const fontWeight = weight >= 700 ? 'bold' : weight >= 500 ? '500' : 'normal';
  return `${fontWeight} ${size}px "Inter", "Noto Sans", sans-serif`;
}
