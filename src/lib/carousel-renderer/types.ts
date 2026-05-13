/**
 * Carousel renderer — types
 *
 * SOURCE OF TRUTH: this mirrors the backend renderer at
 * echome-platform-v2/src/services/image/{canvas-branded-overlay-template,
 * carousel-templates,canvas-renderer}.ts. Any change here that affects the
 * pixels MUST be mirrored to the backend file. The pair are kept in sync
 * by hand. See docs/carousel-design-guardrails.md for the rendering
 * contract (palette, font sizes, overlay opacities, etc.).
 *
 * Tradeoff: we duplicate the drawing logic across two repos to get
 * pixel-perfect WYSIWYG between editor preview and downloaded PNG. A
 * shared npm package would be cleaner; not worth the deployment overhead
 * yet given how rarely this code changes.
 */

export type AspectRatio = '1:1' | '9:16' | '4:5';

export type TemplateType =
  | 'tweet-style'
  | 'text-box'
  | 'photo-overlay'
  | 'branded-overlay-cover'
  | 'branded-overlay-body'
  | 'branded-overlay-last'
  | 'quote-card-cover'
  | 'quote-card-body'
  | 'quote-card-last'
  | 'stats-card-cover'
  | 'stats-card-body'
  | 'stats-card-last';

/**
 * Subset of the backend's CarouselDesignSystem — only the fields the
 * branded-overlay templates actually consume. Mirrors the
 * 'branded-overlay' preset from backend canvas-renderer.ts:199-210.
 */
export interface DesignSystem {
  primaryColor: string; // dark overlay tint, e.g. #0E2734
  accentColor: string; // red emphasis, e.g. #E63946
  textColor: string; // headline color, typically #FFFFFF
  padding: number; // canvas-space padding, default 80
}

/**
 * Structured fields parsed from the LLM's grammar output. The render
 * functions fall back to plain `text` when these aren't set. Mirrors
 * the backend SlideConfig.structured shape.
 */
export interface StructuredFields {
  headline?: string;
  body?: string;
  subtitle?: string;
  details?: string;
  cta?: string;
}

export interface SlideConfig {
  templateType: TemplateType;
  text: string;
  slideNumber: number;
  totalSlides: number;
  aspectRatio?: AspectRatio;
  /**
   * URL of the source photo used as full-bleed background. When missing
   * or unfetchable, the renderer falls back to a solid `primaryColor`.
   */
  backgroundImageUrl?: string;
  designSystem: DesignSystem;
  structured?: StructuredFields;
  /**
   * Per-slide redKeyword override. When set, the renderer wraps the
   * matching word with **markers** before drawing so the canvas-side
   * red-span tokenizer picks it up. Cover and last slides only.
   */
  redKeyword?: string;
}

export const BRANDED_OVERLAY_PRESET: DesignSystem = {
  primaryColor: '#0E2734',
  accentColor: '#E63946',
  textColor: '#FFFFFF',
  padding: 80,
};

/**
 * Quote-card palette — Pinterest-pin energy. Mirrors backend canvas-renderer.ts
 * 'quote-card' preset. primaryColor is the slate body text; accentColor is the
 * terra-cotta used for the decorative quotation mark, ornament, and CTA.
 */
export const QUOTE_CARD_PRESET: DesignSystem = {
  primaryColor: '#2C3E50',
  accentColor: '#C9745A',
  textColor: '#2C3E50',
  padding: 96,
};

/**
 * Stats-card palette — clean-infographic energy. Mirrors backend canvas-renderer.ts
 * 'stats-card' preset. primaryColor is the deep teal used for the big stat;
 * accentColor is the warm orange used for the accent line + CTA.
 */
export const STATS_CARD_PRESET: DesignSystem = {
  primaryColor: '#0B4F5C',
  accentColor: '#E8763B',
  textColor: '#0B4F5C',
  padding: 96,
};

export function getDimensions(aspectRatio: AspectRatio = '4:5'): {
  width: number;
  height: number;
} {
  switch (aspectRatio) {
    case '1:1':
      return { width: 1080, height: 1080 };
    case '9:16':
      return { width: 1080, height: 1920 };
    case '4:5':
    default:
      return { width: 1080, height: 1350 };
  }
}
