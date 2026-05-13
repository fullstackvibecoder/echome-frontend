/**
 * Stats-card renderer — frontend mirror.
 *
 * MUST stay pixel-identical to backend
 * echome-platform-v2/src/services/image/canvas-stats-card-template.ts.
 * Any change to colors, font sizes, paddings, accent metrics, etc. MUST be
 * made in both files together.
 */

import { SlideConfig } from './types';

// Palette — locked. Mirror in backend canvas-stats-card-template.ts.
const COLOR_BG = '#FAFAF7';
const COLOR_BORDER = '#E5E0D8';
const COLOR_STAT = '#0B4F5C';
const COLOR_ACCENT = '#E8763B';
const COLOR_CAPTION = '#5A5A5A';

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

function drawAccentLine(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  width: number = 80,
): void {
  ctx.strokeStyle = COLOR_ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX - width / 2, y);
  ctx.lineTo(centerX + width / 2, y);
  ctx.stroke();
}

function pickStatFontSize(stat: string): number {
  const len = stat.replace(/\s+/g, '').length;
  if (len <= 4) return 220;
  if (len <= 7) return 180;
  if (len <= 10) return 150;
  if (len <= 14) return 120;
  return 96;
}

function statFontString(size: number): string {
  return `800 ${size}px "Inter", "Noto Sans", sans-serif`;
}

function stripBoldMarkers(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1');
}

// ============================================================================
// Cover
// ============================================================================

export function renderStatsCardCover(
  ctx: CanvasRenderingContext2D,
  config: SlideConfig,
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  fillBackground(ctx, width, height);

  const centerX = width / 2;
  const contentWidth = width - PADDING * 2;

  const statRaw = stripBoldMarkers(config.structured?.headline ?? config.text);
  const subtitleRaw = stripBoldMarkers(config.structured?.subtitle ?? '');

  const statSize = pickStatFontSize(statRaw);
  const statFont = statFontString(statSize);
  const statLineHeight = statSize * 1.05;
  const statLines = wrapLines(ctx, statRaw, contentWidth, statFont);
  const statBlockHeight = statLines.length * statLineHeight;

  const accentGap = 56;
  const subtitleSize = 28;
  const subtitleLineHeight = subtitleSize * 1.4;
  const subtitleFont = `500 ${subtitleSize}px "Inter", "Noto Sans", sans-serif`;
  const subtitleLines = subtitleRaw ? wrapLines(ctx, subtitleRaw, contentWidth, subtitleFont) : [];
  const subtitleBlockHeight = subtitleLines.length * subtitleLineHeight;

  const totalBlockHeight =
    statBlockHeight + (subtitleBlockHeight > 0 ? accentGap + 24 + subtitleBlockHeight : 0);
  const blockTop = (height - totalBlockHeight) / 2;

  drawCenteredLines(ctx, statLines, centerX, blockTop, statLineHeight, statFont, COLOR_STAT);

  if (subtitleBlockHeight > 0) {
    const accentY = blockTop + statBlockHeight + accentGap / 2;
    drawAccentLine(ctx, centerX, accentY);

    drawCenteredLines(
      ctx,
      subtitleLines,
      centerX,
      blockTop + statBlockHeight + accentGap + 24,
      subtitleLineHeight,
      subtitleFont,
      COLOR_CAPTION,
    );
  }
}

// ============================================================================
// Body
// ============================================================================

export function renderStatsCardBody(
  ctx: CanvasRenderingContext2D,
  config: SlideConfig,
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  fillBackground(ctx, width, height);

  const centerX = width / 2;
  const contentWidth = width - PADDING * 2;

  const statRaw = stripBoldMarkers(config.structured?.headline ?? config.text.split('\n')[0] ?? '');
  const captionRaw = stripBoldMarkers(
    config.structured?.body ?? config.text.split('\n').slice(1).join('\n').trim(),
  );

  const bodyIndex = Math.max(1, config.slideNumber - 1);
  ctx.font = `800 64px "Inter", "Noto Sans", sans-serif`;
  ctx.fillStyle = COLOR_STAT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${String(bodyIndex).padStart(2, '0')}`, PADDING, PADDING);

  const statSize = pickStatFontSize(statRaw);
  const statFont = statFontString(statSize);
  const statLineHeight = statSize * 1.05;
  const statLines = wrapLines(ctx, statRaw, contentWidth, statFont);
  const statBlockHeight = statLines.length * statLineHeight;

  const captionFontSize = 28;
  const captionFont = `500 ${captionFontSize}px "Inter", "Noto Sans", sans-serif`;
  const captionLineHeight = captionFontSize * 1.5;
  const captionLines = captionRaw ? wrapLines(ctx, captionRaw, contentWidth, captionFont) : [];
  const captionBlockHeight = captionLines.length * captionLineHeight;

  const accentGap = 40;
  const totalBlockHeight =
    statBlockHeight + (captionBlockHeight > 0 ? accentGap + captionBlockHeight : 0);
  const blockTop = (height - totalBlockHeight) / 2;

  drawCenteredLines(ctx, statLines, centerX, blockTop, statLineHeight, statFont, COLOR_STAT);

  if (captionBlockHeight > 0) {
    drawCenteredLines(
      ctx,
      captionLines,
      centerX,
      blockTop + statBlockHeight + accentGap,
      captionLineHeight,
      captionFont,
      COLOR_CAPTION,
    );
  }
}

// ============================================================================
// Last
// ============================================================================

export function renderStatsCardLast(
  ctx: CanvasRenderingContext2D,
  config: SlideConfig,
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  fillBackground(ctx, width, height);

  const centerX = width / 2;
  const contentWidth = width - PADDING * 2;

  const statRaw = stripBoldMarkers(config.structured?.headline ?? config.text);
  const ctaRaw = stripBoldMarkers(config.structured?.cta ?? '');

  const topAccentY = height * 0.32;
  drawAccentLine(ctx, centerX, topAccentY, 60);

  const statSize = pickStatFontSize(statRaw);
  const statFont = statFontString(statSize);
  const statLineHeight = statSize * 1.05;
  const statLines = wrapLines(ctx, statRaw, contentWidth, statFont);
  const statBlockHeight = statLines.length * statLineHeight;

  drawCenteredLines(
    ctx,
    statLines,
    centerX,
    topAccentY + 48,
    statLineHeight,
    statFont,
    COLOR_STAT,
  );

  if (ctaRaw.trim()) {
    const ctaFont = `600 22px "Inter", "Noto Sans", sans-serif`;
    ctx.font = ctaFont;
    ctx.fillStyle = COLOR_ACCENT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const formatted = ctaRaw.toUpperCase().split('').join(' ');
    ctx.fillText(formatted, centerX, topAccentY + 48 + statBlockHeight + 56);
  }

  drawAccentLine(ctx, centerX, height - PADDING - 24, 60);
}
