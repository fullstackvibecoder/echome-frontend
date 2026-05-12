/**
 * Quote-card renderer — frontend mirror.
 *
 * MUST stay pixel-identical to the backend at
 * echome-platform-v2/src/services/image/canvas-quote-card-template.ts.
 * Any change to colors, font sizes, paddings, ornament metrics, etc.
 * MUST be made in both files together.
 *
 * The three render functions match the backend's:
 *   - renderQuoteCardCover  — cover slide (slide 1)
 *   - renderQuoteCardBody   — body slides (2 through N-1)
 *   - renderQuoteCardLast   — last slide (slide N)
 *
 * Background: solid cream + subtle inset border. No photo.
 * Quote text: Playfair Display Regular, slate.
 * Decorative marks + ornaments + CTA: terra-cotta.
 */

import { SlideConfig, StructuredFields } from './types';

// Palette — locked. Mirror in backend canvas-quote-card-template.ts.
const COLOR_BG = '#FAF6EF';
const COLOR_BORDER = '#E5DDD0';
const COLOR_TEXT = '#2C3E50';
const COLOR_ACCENT = '#C9745A';
const COLOR_ATTR = '#7A6C5D';

const BORDER_INSET = 36;
const BORDER_WIDTH = 1;
const PADDING = 96;

function fillBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = COLOR_BORDER;
  ctx.lineWidth = BORDER_WIDTH;
  ctx.strokeRect(BORDER_INSET, BORDER_INSET, width - BORDER_INSET * 2, height - BORDER_INSET * 2);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): string[] {
  ctx.font = font;
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawCenteredLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  centerX: number,
  topY: number,
  lineHeight: number,
  font: string,
  color: string,
): number {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let y = topY;
  for (const line of lines) {
    ctx.fillText(line, centerX, y);
    y += lineHeight;
  }
  return y - topY;
}

function drawOrnament(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number = 80,
): void {
  ctx.strokeStyle = COLOR_ACCENT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - width / 2, y);
  ctx.lineTo(centerX + width / 2, y);
  ctx.stroke();
}

function stripBoldMarkers(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1');
}

function asStructured(config: SlideConfig): StructuredFields | undefined {
  return config.structured;
}

// ============================================================================
// Cover
// ============================================================================
//
// All three render functions accept (ctx, config) and mutate ctx in place.
// The dispatcher sizes the canvas to the slide's aspect ratio before calling.
// Background image is not used by quote-card templates (cream-only bg) so the
// dispatcher's `image` argument is accepted and ignored.

export function renderQuoteCardCover(
  ctx: CanvasRenderingContext2D,
  config: SlideConfig,
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  fillBackground(ctx, width, height);

  const centerX = width / 2;
  const contentWidth = width - PADDING * 2;

  const structured = asStructured(config);
  const quoteRaw = stripBoldMarkers(structured?.headline ?? config.text);
  const attribution = structured?.subtitle ?? '';

  // 1. Oversized opening curly quotation mark
  ctx.font = 'bold 220px "Playfair Display", "Noto Serif", serif';
  ctx.fillStyle = COLOR_ACCENT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('“', centerX, 80);

  // 2. Quote text — Playfair Regular, large, centered, multi-line wrap
  const quoteFontSize = 56;
  const quoteFont = `400 ${quoteFontSize}px "Playfair Display", "Noto Serif", serif`;
  const quoteLineHeight = quoteFontSize * 1.25;
  const quoteLines = wrapLines(ctx, quoteRaw, contentWidth, quoteFont);
  const quoteBlockHeight = quoteLines.length * quoteLineHeight;
  const quoteTop = Math.max(360, (height - quoteBlockHeight) / 2 - 40);

  drawCenteredLines(
    ctx,
    quoteLines,
    centerX,
    quoteTop,
    quoteLineHeight,
    quoteFont,
    COLOR_TEXT,
  );

  // 3. Ornament + attribution
  const ornamentY = quoteTop + quoteBlockHeight + 56;
  drawOrnament(ctx, centerX, ornamentY);

  if (attribution.trim()) {
    const attrFont = '500 26px "Inter", "Noto Sans", sans-serif';
    const cleaned = attribution.replace(/^[-–—]\s*/, '');
    const attrText = `— ${cleaned}`;
    ctx.font = attrFont;
    ctx.fillStyle = COLOR_ATTR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(attrText, centerX, ornamentY + 36);
  }
}

// ============================================================================
// Body
// ============================================================================

export function renderQuoteCardBody(
  ctx: CanvasRenderingContext2D,
  config: SlideConfig,
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  fillBackground(ctx, width, height);

  const centerX = width / 2;
  const contentWidth = width - PADDING * 2;

  const structured = asStructured(config);
  const headlineRaw = stripBoldMarkers(
    structured?.headline ?? config.text.split('\n')[0] ?? '',
  );
  const bodyRaw = stripBoldMarkers(
    structured?.body ?? config.text.split('\n').slice(1).join('\n').trim(),
  );

  // Numeral top-left
  const bodyIndex = Math.max(1, config.slideNumber - 1);
  ctx.font = 'bold 64px "Playfair Display", "Noto Serif", serif';
  ctx.fillStyle = COLOR_ACCENT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${String(bodyIndex).padStart(2, '0')}`, PADDING, PADDING);

  // Headline + body block, vertically centered
  const headlineFontSize = 48;
  const headlineFont = `700 ${headlineFontSize}px "Playfair Display", "Noto Serif", serif`;
  const headlineLineHeight = headlineFontSize * 1.2;
  const headlineLines = wrapLines(ctx, headlineRaw, contentWidth, headlineFont);
  const headlineBlockHeight = headlineLines.length * headlineLineHeight;

  const bodyFontSize = 26;
  const bodyFont = `400 ${bodyFontSize}px "Inter", "Noto Sans", sans-serif`;
  const bodyLineHeight = bodyFontSize * 1.5;
  const bodyLines = bodyRaw ? wrapLines(ctx, bodyRaw, contentWidth, bodyFont) : [];
  const bodyBlockHeight = bodyLines.length * bodyLineHeight;

  const gap = bodyLines.length > 0 ? 40 : 0;
  const totalBlockHeight = headlineBlockHeight + gap + bodyBlockHeight;
  const blockTop = (height - totalBlockHeight) / 2;

  drawCenteredLines(
    ctx,
    headlineLines,
    centerX,
    blockTop,
    headlineLineHeight,
    headlineFont,
    COLOR_TEXT,
  );

  if (bodyLines.length > 0) {
    drawCenteredLines(
      ctx,
      bodyLines,
      centerX,
      blockTop + headlineBlockHeight + gap,
      bodyLineHeight,
      bodyFont,
      COLOR_TEXT,
    );
  }
}

// ============================================================================
// Last
// ============================================================================

export function renderQuoteCardLast(
  ctx: CanvasRenderingContext2D,
  config: SlideConfig,
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  fillBackground(ctx, width, height);

  const centerX = width / 2;
  const contentWidth = width - PADDING * 2;

  const structured = asStructured(config);
  const headlineRaw = stripBoldMarkers(structured?.headline ?? config.text);
  const ctaRaw = stripBoldMarkers(structured?.cta ?? '');

  const ornamentTopY = height * 0.35;
  drawOrnament(ctx, centerX, ornamentTopY, 60);

  const headlineFontSize = 64;
  const headlineFont = `700 ${headlineFontSize}px "Playfair Display", "Noto Serif", serif`;
  const headlineLineHeight = headlineFontSize * 1.2;
  const headlineLines = wrapLines(ctx, headlineRaw, contentWidth, headlineFont);
  const headlineBlockHeight = headlineLines.length * headlineLineHeight;

  drawCenteredLines(
    ctx,
    headlineLines,
    centerX,
    ornamentTopY + 48,
    headlineLineHeight,
    headlineFont,
    COLOR_TEXT,
  );

  if (ctaRaw.trim()) {
    const ctaFont = '600 22px "Inter", "Noto Sans", sans-serif';
    ctx.font = ctaFont;
    ctx.fillStyle = COLOR_ACCENT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const formatted = ctaRaw.toUpperCase().split('').join(' ');
    ctx.fillText(formatted, centerX, ornamentTopY + 48 + headlineBlockHeight + 56);
  }

  drawOrnament(ctx, centerX, height - PADDING - 24, 60);
}
