/**
 * Branded-overlay carousel renderer — browser canvas implementation.
 *
 * MIRRORS: echome-platform-v2/src/services/image/canvas-branded-overlay-template.ts
 * Drawing operations are byte-for-byte identical to the backend, so the
 * editor preview and the downloaded PNG match. If you change anything
 * about the visual output, change both files together.
 *
 * The three render functions handle:
 *   - renderBrandedOverlayCover   — slide 1 (hook)
 *   - renderBrandedOverlayBody    — slides 2..N-1 (numeral + content)
 *   - renderBrandedOverlayLast    — slide N (centered details + CTA)
 *
 * Each takes a 2D context, dimensions, the slide config, and a
 * pre-loaded background image (or null for solid-fill fallback).
 */

import { getFontString } from './fonts';
import { SlideConfig, getDimensions } from './types';

// Overlay opacities per slide role (0..1). Match backend constants.
const OVERLAY_OPACITY_COVER = 0.45;
const OVERLAY_OPACITY_BODY = 0.6;
const OVERLAY_OPACITY_LAST = 0.7;

// =============================================================================
// Shared primitives — all platform-agnostic (Canvas2D API only)
// =============================================================================

function drawPhotoBackground(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  width: number,
  height: number,
  fallbackColor: string,
): void {
  if (!image) {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  // cover-fit: scale up to whichever dimension fills the canvas, then center-crop
  const scale = Math.max(width / image.width, height / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const dx = (width - drawW) / 2;
  const dy = (height - drawH) / 2;
  ctx.drawImage(image, dx, dy, drawW, drawH);
}

function drawDarkOverlay(
  ctx: CanvasRenderingContext2D,
  color: string,
  opacity: number,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function tokenizeRedSpans(text: string): Array<{ text: string; isRed: boolean }> {
  const tokens: Array<{ text: string; isRed: boolean }> = [];
  let cursor = 0;
  for (const match of text.matchAll(/\*\*(.+?)\*\*/g)) {
    const start = match.index ?? 0;
    if (start > cursor) tokens.push({ text: text.slice(cursor, start), isRed: false });
    tokens.push({ text: match[1], isRed: true });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor), isRed: false });
  return tokens.length > 0 ? tokens : [{ text, isRed: false }];
}

function drawTextWithRedSpans(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  font: string,
  normalColor: string,
  redColor: string,
  align: 'left' | 'center' = 'left',
  honorRedSpans = true,
): number {
  ctx.font = font;
  const tokens = honorRedSpans
    ? tokenizeRedSpans(rawText)
    : [{ text: rawText.replace(/\*\*(.+?)\*\*/g, '$1'), isRed: false }];

  type Run = { text: string; isRed: boolean; width: number };
  const runs: Run[] = [];
  for (const tok of tokens) {
    for (const part of tok.text.split(/(\s+)/)) {
      if (!part) continue;
      runs.push({ text: part, isRed: tok.isRed, width: ctx.measureText(part).width });
    }
  }

  const lines: Run[][] = [[]];
  let lineWidth = 0;
  for (const run of runs) {
    if (run.text.includes('\n')) {
      const segments = run.text.split('\n');
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg) {
          const w = ctx.measureText(seg).width;
          if (lineWidth + w > maxWidth && lineWidth > 0) {
            lines.push([]);
            lineWidth = 0;
          }
          lines[lines.length - 1].push({ text: seg, isRed: run.isRed, width: w });
          lineWidth += w;
        }
        if (i < segments.length - 1) {
          lines.push([]);
          lineWidth = 0;
        }
      }
      continue;
    }
    if (/^\s+$/.test(run.text)) {
      if (lines[lines.length - 1].length > 0) {
        lines[lines.length - 1].push(run);
        lineWidth += run.width;
      }
      continue;
    }
    if (lineWidth + run.width > maxWidth && lineWidth > 0) {
      lines.push([run]);
      lineWidth = run.width;
    } else {
      lines[lines.length - 1].push(run);
      lineWidth += run.width;
    }
  }

  for (const line of lines) {
    while (line.length > 0 && /^\s+$/.test(line[line.length - 1].text)) line.pop();
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let cursorY = y;
  for (const line of lines) {
    if (line.length === 0) {
      cursorY += lineHeight;
      continue;
    }
    const lineW = line.reduce((sum, r) => sum + r.width, 0);
    let cursorX = align === 'center' ? x - lineW / 2 : x;
    for (const run of line) {
      ctx.fillStyle = run.isRed ? redColor : normalColor;
      ctx.fillText(run.text, cursorX, cursorY);
      cursorX += run.width;
    }
    cursorY += lineHeight;
  }
  return cursorY - y;
}

function drawLargeNumeral(
  ctx: CanvasRenderingContext2D,
  numeral: number,
  x: number,
  y: number,
  color: string,
  fontSize: number,
): number {
  ctx.font = getFontString(fontSize, 800);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${numeral}.`, x, y);
  return fontSize;
}

function estimateTextHeight(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  maxWidth: number,
  lineHeight: number,
  font: string,
): number {
  ctx.font = font;
  const stripped = rawText.replace(/\*\*(.+?)\*\*/g, '$1');
  const words = stripped.split(/\s+/);
  let lineW = 0;
  let lines = 1;
  for (const word of words) {
    const w = ctx.measureText(word + ' ').width;
    if (lineW + w > maxWidth && lineW > 0) {
      lines++;
      lineW = w;
    } else {
      lineW += w;
    }
  }
  return lines * lineHeight;
}

/**
 * Apply a redKeyword override to the raw text by stripping prior **markers**
 * and wrapping the chosen word with **markers**. Mirrors the backend
 * route handler at echome-platform-v2/src/routes/content-kits.ts:842-852.
 * Used for cover and last slides only.
 */
function applyRedKeywordOverride(text: string, redKeyword: string | undefined): string {
  if (!redKeyword) return text;
  const escaped = redKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stripped = text.replace(/\*\*(.+?)\*\*/g, '$1');
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  return re.test(stripped) ? stripped.replace(re, (m) => `**${m}**`) : stripped;
}

// =============================================================================
// Cover slide
// =============================================================================

export function renderBrandedOverlayCover(
  ctx: CanvasRenderingContext2D,
  config: SlideConfig,
  image: HTMLImageElement | null,
): void {
  const { width, height } = getDimensions(config.aspectRatio || '4:5');
  const ds = config.designSystem;
  const padding = ds.padding ?? 80;

  drawPhotoBackground(ctx, image, width, height, ds.primaryColor);
  drawDarkOverlay(ctx, ds.primaryColor, OVERLAY_OPACITY_COVER, width, height);

  const headlineRaw = applyRedKeywordOverride(
    config.structured?.headline ?? config.text,
    config.redKeyword,
  );
  const subtitleRaw = config.structured?.subtitle;

  const headlineFont = getFontString(64, 800);
  const subtitleFont = getFontString(28, 400);
  const lineHeight = 64 * 1.18;
  const subtitleLineHeight = 28 * 1.4;

  const textAreaTop = Math.round(height * 0.55);
  const textAreaLeft = padding;
  const textAreaWidth = width - padding * 2;

  const headlineHeight = drawTextWithRedSpans(
    ctx,
    headlineRaw,
    textAreaLeft,
    textAreaTop,
    textAreaWidth,
    lineHeight,
    headlineFont,
    ds.textColor,
    ds.accentColor,
    'left',
    true,
  );

  if (subtitleRaw) {
    drawTextWithRedSpans(
      ctx,
      subtitleRaw,
      textAreaLeft,
      textAreaTop + headlineHeight + 24,
      textAreaWidth,
      subtitleLineHeight,
      subtitleFont,
      ds.textColor,
      ds.accentColor,
      'left',
      false,
    );
  }
}

// =============================================================================
// Body slide
// =============================================================================

export function renderBrandedOverlayBody(
  ctx: CanvasRenderingContext2D,
  config: SlideConfig,
  image: HTMLImageElement | null,
): void {
  const { width, height } = getDimensions(config.aspectRatio || '4:5');
  const ds = config.designSystem;
  const padding = ds.padding ?? 80;

  drawPhotoBackground(ctx, image, width, height, ds.primaryColor);
  drawDarkOverlay(ctx, ds.primaryColor, OVERLAY_OPACITY_BODY, width, height);

  const bodyIndex = Math.max(1, config.slideNumber - 1);
  const numeralFontSize = 96;
  const numeralY = Math.round(height * 0.32);
  drawLargeNumeral(ctx, bodyIndex, padding, numeralY, ds.textColor, numeralFontSize);

  // Body slides ignore redKeyword per design rule, so no override here.
  const headlineRaw = config.structured?.headline ?? config.text.split('\n')[0];
  const bodyRaw = config.structured?.body ?? config.text.split('\n').slice(1).join('\n').trim();

  const headlineFont = getFontString(48, 700);
  const bodyFont = getFontString(28, 400);
  const headlineLine = 48 * 1.2;
  const bodyLine = 28 * 1.45;

  const textLeft = padding;
  const textWidth = width - padding * 2;
  let cursorY = numeralY + numeralFontSize + 24;

  if (headlineRaw) {
    const drawn = drawTextWithRedSpans(
      ctx,
      headlineRaw,
      textLeft,
      cursorY,
      textWidth,
      headlineLine,
      headlineFont,
      ds.textColor,
      ds.accentColor,
      'left',
      false,
    );
    cursorY += drawn + 20;
  }

  if (bodyRaw) {
    drawTextWithRedSpans(
      ctx,
      bodyRaw,
      textLeft,
      cursorY,
      textWidth,
      bodyLine,
      bodyFont,
      ds.textColor,
      ds.accentColor,
      'left',
      false,
    );
  }
}

// =============================================================================
// Last slide
// =============================================================================

export function renderBrandedOverlayLast(
  ctx: CanvasRenderingContext2D,
  config: SlideConfig,
  image: HTMLImageElement | null,
): void {
  const { width, height } = getDimensions(config.aspectRatio || '4:5');
  const ds = config.designSystem;
  const padding = ds.padding ?? 80;

  drawPhotoBackground(ctx, image, width, height, ds.primaryColor);
  drawDarkOverlay(ctx, ds.primaryColor, OVERLAY_OPACITY_LAST, width, height);

  const detailsRaw = config.structured?.details;
  const ctaRaw = applyRedKeywordOverride(
    config.structured?.cta ?? config.text,
    config.redKeyword,
  );

  const detailsFont = getFontString(28, 400);
  const ctaFont = getFontString(56, 800);
  const detailsLine = 28 * 1.4;
  const ctaLine = 56 * 1.2;

  const textWidth = width - padding * 2;
  const centerX = width / 2;

  const detailsHeight = detailsRaw
    ? estimateTextHeight(ctx, detailsRaw, textWidth, detailsLine, detailsFont)
    : 0;
  const ctaHeight = ctaRaw
    ? estimateTextHeight(ctx, ctaRaw, textWidth, ctaLine, ctaFont)
    : 0;
  const totalHeight = detailsHeight + (detailsRaw && ctaRaw ? 32 : 0) + ctaHeight;

  let cursorY = (height - totalHeight) / 2;

  if (detailsRaw) {
    drawTextWithRedSpans(
      ctx,
      detailsRaw,
      centerX,
      cursorY,
      textWidth,
      detailsLine,
      detailsFont,
      ds.textColor,
      ds.accentColor,
      'center',
      false,
    );
    cursorY += detailsHeight + 32;
  }

  if (ctaRaw) {
    drawTextWithRedSpans(
      ctx,
      ctaRaw,
      centerX,
      cursorY,
      textWidth,
      ctaLine,
      ctaFont,
      ds.textColor,
      ds.accentColor,
      'center',
      true,
    );
  }
}
