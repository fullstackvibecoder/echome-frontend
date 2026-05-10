/**
 * Carousel renderer — public API for the editor preview.
 *
 * Usage from a React component:
 *
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   useEffect(() => {
 *     if (!canvasRef.current) return;
 *     renderSlide(canvasRef.current, slideConfig).catch(console.error);
 *   }, [slideConfig]);
 *
 * The function:
 *   1. Loads the Inter fonts (cached after first call)
 *   2. Sizes the canvas to the slide's aspect ratio
 *   3. Loads the background image (if any)
 *   4. Dispatches to the right template function
 *
 * Branded-overlay slides render fully client-side. Non-branded templates
 * fall through to the server-rendered publicUrl — pixel parity for those
 * isn't supported yet (followup if/when needed).
 */

import {
  renderBrandedOverlayCover,
  renderBrandedOverlayBody,
  renderBrandedOverlayLast,
} from './branded-overlay';
import { registerInterFonts } from './fonts';
import { SlideConfig, getDimensions } from './types';

export type { SlideConfig, DesignSystem, AspectRatio, TemplateType, StructuredFields } from './types';
export { BRANDED_OVERLAY_PRESET, getDimensions } from './types';

/**
 * Whether a template can be rendered client-side. The legacy single-pass
 * templates (tweet-style, text-box, photo-overlay) bake text into the
 * cached background PNG and can't be re-composed without the full
 * server-side pipeline; for those, the editor falls back to the
 * server-rendered publicUrl.
 */
export function supportsClientRender(templateType: string | undefined): boolean {
  return (
    templateType === 'branded-overlay-cover' ||
    templateType === 'branded-overlay-body' ||
    templateType === 'branded-overlay-last'
  );
}

const imageCache = new Map<string, HTMLImageElement>();

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(url);
  if (cached) return cached;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function renderSlide(canvas: HTMLCanvasElement, config: SlideConfig): Promise<void> {
  await registerInterFonts();

  const { width, height } = getDimensions(config.aspectRatio || '4:5');
  // Set both the bitmap dimensions and CSS dimensions. The CSS will be
  // overridden by the parent's max-width/max-height styling, but the
  // bitmap stays at the canonical 1080×1350 resolution so text
  // measurement and drawing match the backend exactly.
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const image = config.backgroundImageUrl ? await loadImage(config.backgroundImageUrl) : null;

  switch (config.templateType) {
    case 'branded-overlay-cover':
      renderBrandedOverlayCover(ctx, config, image);
      return;
    case 'branded-overlay-body':
      renderBrandedOverlayBody(ctx, config, image);
      return;
    case 'branded-overlay-last':
      renderBrandedOverlayLast(ctx, config, image);
      return;
    default:
      // Non-branded templates aren't supported yet. Caller should fall
      // back to displaying the server-rendered publicUrl as <img>.
      ctx.fillStyle = '#0E2734';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '500 24px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Preview not supported for this template', width / 2, height / 2);
  }
}
