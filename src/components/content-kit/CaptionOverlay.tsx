'use client';

/**
 * CaptionOverlay — Renders styled captions synced to video playback.
 *
 * Supports all 8 caption presets:
 * - Line-level: modern, classic, bold, minimal (show full segment text)
 * - Word-level: highlight, karaoke, underline, word_by_word (animate per word)
 *
 * Positioning: free-form via positionXY, falling back to position enum or
 * viewMode default. When `draggable` + `onPositionChange` are provided,
 * the caption block is drag-to-reposition (used by ClipEditorModal). The
 * burned-in export path uses ASS \an5\pos(x,y) — same anchor convention.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import {
  CaptionSegment,
  CaptionStylePreset,
  getActiveSegment,
  getActiveWordIndex,
  getKaraokeFill,
  isWordLevelStyle,
} from '@/lib/caption-parser';

export type CaptionPosition = 'bottom' | 'center' | 'top';

interface CaptionOverlayProps {
  segments: CaptionSegment[];
  currentTime: number;
  isVisible: boolean;
  style: CaptionStylePreset;
  viewMode: 'single' | 'split';
  position?: CaptionPosition;
  /**
   * Free-form drag-to-position. 0-1 normalized; references caption block CENTER.
   * When set, takes precedence over `position` (the 3-position enum) and
   * viewMode-default placement. Matches the FFmpeg ASS \pos(x,y) override
   * applied at burn time, so the preview matches the exported file.
   */
  positionXY?: { x: number; y: number };
  /**
   * Caption box size multiplier. 1.0 = preset default. Applied as a font-size
   * + padding multiplier in preview, and as ASS \fscx/\fscy in the burn path.
   * Drag and resize are independent gestures: dragging the body moves x/y;
   * dragging the bottom-right handle adjusts sizeScale and never mutates x/y.
   */
  sizeScale?: number;
  /**
   * Enable drag-to-reposition mode. When true + onPositionChange supplied,
   * the caption block accepts pointer drags and emits new positionXY values.
   * The container element used for coordinate normalization is `containerRef`
   * (typically the VideoPlayer's outer wrapper). When false, captions remain
   * pointer-events-none for normal playback views.
   */
  draggable?: boolean;
  onPositionChange?: (pos: { x: number; y: number }) => void;
  /**
   * Called when the user resizes the caption block via the corner handle.
   * Emits a size multiplier clamped to [0.4, 2.0]. Only wired when draggable
   * is true; resize without drag-mode would be confusing.
   */
  onSizeChange?: (scale: number) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

// CSS styles for each preset — matches backend CAPTION_PRESETS from captioning.ts
// Uses multiple text-shadows to simulate the thick ASS outline (OutlineWidth: 4-5)
// that made burned-in captions crisp and readable against any background.
const OUTLINE_SHADOW = [
  '-1px -1px 0 #000', '1px -1px 0 #000', '-1px 1px 0 #000', '1px 1px 0 #000',
  '-2px 0 0 #000', '2px 0 0 #000', '0 -2px 0 #000', '0 2px 0 #000',
  '0 0 4px rgba(0,0,0,0.8)',
].join(', ');

const HEAVY_OUTLINE_SHADOW = [
  '-1px -1px 0 #000', '1px -1px 0 #000', '-1px 1px 0 #000', '1px 1px 0 #000',
  '-2px 0 0 #000', '2px 0 0 #000', '0 -2px 0 #000', '0 2px 0 #000',
  '-2px -2px 0 #000', '2px -2px 0 #000', '-2px 2px 0 #000', '2px 2px 0 #000',
  '0 0 6px rgba(0,0,0,0.9)',
].join(', ');

const STYLE_CONFIG: Record<
  CaptionStylePreset,
  {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    color: string;
    textShadow: string;
    backgroundColor?: string;
    padding?: string;
    borderRadius?: string;
  }
> = {
  modern: {
    fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
    fontSize: '18px',
    fontWeight: '700',
    color: '#FFFFFF',
    textShadow: OUTLINE_SHADOW,
  },
  classic: {
    fontFamily: "var(--font-inter), 'Inter', sans-serif",
    fontSize: '15px',
    fontWeight: '400',
    color: '#FFFFFF',
    textShadow: 'none',
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: '3px 10px',
    borderRadius: '4px',
  },
  bold: {
    fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
    fontSize: '22px',
    fontWeight: '400',
    color: '#FFFF00',
    textShadow: HEAVY_OUTLINE_SHADOW,
  },
  minimal: {
    fontFamily: "var(--font-inter), 'Inter', sans-serif",
    fontSize: '14px',
    fontWeight: '400',
    color: '#FFFFFF',
    textShadow: OUTLINE_SHADOW,
  },
  highlight: {
    fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
    fontSize: '20px',
    fontWeight: '800',
    color: '#FFFFFF',
    textShadow: HEAVY_OUTLINE_SHADOW,
  },
  karaoke: {
    fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
    fontSize: '18px',
    fontWeight: '700',
    color: '#FFFFFF',
    textShadow: HEAVY_OUTLINE_SHADOW,
  },
  underline: {
    fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
    fontSize: '18px',
    fontWeight: '700',
    color: '#FFFFFF',
    textShadow: HEAVY_OUTLINE_SHADOW,
  },
  word_by_word: {
    fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
    fontSize: '20px',
    fontWeight: '800',
    color: '#FFFFFF',
    textShadow: HEAVY_OUTLINE_SHADOW,
  },
};

const POSITION_STYLES: Record<CaptionPosition, React.CSSProperties> = {
  bottom: { bottom: '18%' },
  center: { top: '50%', transform: 'translateY(-50%)' },
  top: { top: '12%' },
};

export function CaptionOverlay({
  segments,
  currentTime,
  isVisible,
  style,
  viewMode,
  position,
  positionXY,
  sizeScale,
  draggable,
  onPositionChange,
  onSizeChange,
  containerRef,
}: CaptionOverlayProps) {
  const activeSegment = getActiveSegment(segments, currentTime, 0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startPos: { x: number; y: number };
  } | null>(null);
  const resizeStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startScale: number;
    /** Captured pixel size of the box at gesture start — used so a 1px drag
     *  delta corresponds to ~1px size change at any starting scale. */
    startBoxDim: number;
  } | null>(null);

  // Pixel-locked width during interaction. While dragging or resizing, we
  // pin the inner block to its measured width so the box doesn't visually
  // reflow as the active segment text changes (the bug user flagged from
  // the carousel implementation: "moving also resizes it"). Released on
  // gesture end so subsequent segments size to fit naturally.
  const innerBlockRef = useRef<HTMLDivElement | null>(null);
  const [lockedWidthPx, setLockedWidthPx] = useState<number | null>(null);

  // Drag handlers — only wired when draggable mode is on. Mirrors the
  // pattern from DraggableTextOverlay (carousel work) so coordinate math
  // and clamp behavior are identical across both editors.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggable || !onPositionChange) return;
      // Resize handle has its own pointerdown that stops propagation; if we
      // reach this handler, the user is dragging the body (move-only).
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      // Capture current rendered width so the box doesn't reflow mid-drag.
      if (innerBlockRef.current) {
        setLockedWidthPx(innerBlockRef.current.offsetWidth);
      }
      setIsDragging(true);
      const startXY = positionXY ?? { x: 0.5, y: 0.85 };
      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        startPos: { x: startXY.x, y: startXY.y },
      };
    },
    [draggable, onPositionChange, positionXY],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStartRef.current || !containerRef?.current || !onPositionChange) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.pointerX;
      const deltaY = e.clientY - dragStartRef.current.pointerY;
      // Clamp at 0.15/0.85 (not 0.05/0.95). The burn-time auto-margin
      // logic guarantees text wraps inside the available space, but
      // positions in the outer 5-15% strip force wrap windows < ~250px
      // wide where text degenerates into 1-2 word lines. The tighter
      // range keeps rendered output legible at any user-chosen position.
      const newX = Math.min(0.85, Math.max(0.15, dragStartRef.current.startPos.x + deltaX / rect.width));
      const newY = Math.min(0.85, Math.max(0.15, dragStartRef.current.startPos.y + deltaY / rect.height));
      onPositionChange({ x: newX, y: newY });
    },
    [containerRef, onPositionChange],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    setLockedWidthPx(null);
  }, []);

  // Resize handlers — pointer-down on the corner handle. Independent from
  // drag: this never reads or writes positionXY. Movement is interpreted as
  // a size delta relative to the box's diagonal, so the user gets a uniform
  // "pull to grow / push to shrink" feel regardless of starting size.
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggable || !onSizeChange) return;
      e.preventDefault();
      // Critical: stop propagation so the body's pointerdown handler doesn't
      // also fire and start a drag. Without this, the user resizing would
      // also pan the box.
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (innerBlockRef.current) {
        setLockedWidthPx(innerBlockRef.current.offsetWidth);
      }
      setIsResizing(true);
      const box = innerBlockRef.current;
      const dim = box ? Math.max(box.offsetWidth, box.offsetHeight) : 200;
      resizeStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        startScale: sizeScale ?? 1,
        startBoxDim: dim,
      };
    },
    [draggable, onSizeChange, sizeScale],
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!resizeStartRef.current || !onSizeChange) return;
      const start = resizeStartRef.current;
      // Use diagonal pointer travel as scale delta. Bottom-right corner
      // grows as the user drags down-right (matches the visual cue).
      const deltaX = e.clientX - start.pointerX;
      const deltaY = e.clientY - start.pointerY;
      const diag = (deltaX + deltaY) / 2; // average so vertical-only also works
      const ratio = (start.startBoxDim + diag) / start.startBoxDim;
      const next = Math.max(0.4, Math.min(2.0, start.startScale * ratio));
      onSizeChange(next);
    },
    [onSizeChange],
  );

  const handleResizePointerUp = useCallback(() => {
    setIsResizing(false);
    resizeStartRef.current = null;
    setLockedWidthPx(null);
  }, []);

  // Fail-safe: if the component unmounts mid-gesture, clear lock state.
  useEffect(() => () => {
    setLockedWidthPx(null);
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  if (!isVisible || !activeSegment) return null;

  const config = STYLE_CONFIG[style];
  const isWordLevel = isWordLevelStyle(style);

  // Position priority: positionXY (drag-to-position) > position enum > viewMode default.
  // In draggable mode, ALWAYS use positionXY anchoring (default to bottom-center
  // if user hasn't set one yet) so drag math is consistent regardless of mode.
  let positionStyle: React.CSSProperties;
  let wrapperClasses: string;
  const effectiveXY = draggable ? (positionXY ?? { x: 0.5, y: 0.85 }) : positionXY;
  if (effectiveXY) {
    positionStyle = {
      left: `${effectiveXY.x * 100}%`,
      top: `${effectiveXY.y * 100}%`,
      transform: 'translate(-50%, -50%)',
    };
    wrapperClasses = `absolute flex justify-center z-20 ${draggable ? '' : 'pointer-events-none'}`;
  } else {
    const effectivePosition = position || (viewMode === 'split' ? 'center' : 'bottom');
    positionStyle = POSITION_STYLES[effectivePosition];
    wrapperClasses = 'absolute left-0 right-0 flex justify-center pointer-events-none z-20 px-4';
  }

  // For line-level styles, show only a short window of text (~12 words max)
  const displayText = !isWordLevel
    ? getVisibleText(activeSegment.text, currentTime, activeSegment)
    : '';

  // Effective scale: 1.0 default; user resize multiplies. Applied to font-size
  // so text REFITS into the resized box rather than just stretching the
  // container. Also nudges padding so the box visually scales with the text.
  const effectiveScale = sizeScale ?? 1;
  const baseFontSize = parseFloat(config.fontSize) || 18;
  const scaledFontSize = `${baseFontSize * effectiveScale}px`;
  const basePadding = config.padding || '4px 8px';
  // Multiply numeric pixel values in padding by the scale. Keeps spacing
  // proportional so the box looks like a coherent unit at any size.
  const scaledPadding = basePadding.replace(/(\d+(?:\.\d+)?)(px|em|rem)/g, (_m, n, u) => `${parseFloat(n) * effectiveScale}${u}`);

  const isInteracting = isDragging || isResizing;

  return (
    <div
      className={wrapperClasses}
      style={positionStyle}
      onPointerDown={draggable ? handlePointerDown : undefined}
      onPointerMove={draggable ? handlePointerMove : undefined}
      onPointerUp={draggable ? handlePointerUp : undefined}
    >
      <div
        ref={innerBlockRef}
        className="text-center leading-snug relative"
        style={{
          fontFamily: config.fontFamily,
          fontSize: scaledFontSize,
          fontWeight: config.fontWeight,
          color: config.color,
          textShadow: config.textShadow,
          backgroundColor: config.backgroundColor,
          padding: scaledPadding,
          borderRadius: config.borderRadius,
          // Width handling:
          //  - During drag/resize: pin to measured pixel width so the box
          //    can't visually reflow on segment changes (fixes "moving also
          //    resizes" carousel bug).
          //  - Otherwise: 85% max so long segments don't run off-screen.
          ...(lockedWidthPx
            ? { width: `${lockedWidthPx}px`, maxWidth: 'none' as const }
            : { maxWidth: '85%' as const }),
          // Draggable affordance: dashed outline + grab cursor when edit mode
          ...(draggable ? {
            cursor: isResizing ? 'nwse-resize' : isDragging ? 'grabbing' : 'grab',
            outline: isInteracting ? '2px dashed rgba(0,212,255,0.7)' : '1px dashed rgba(255,255,255,0.4)',
            outlineOffset: '4px',
            userSelect: 'none' as const,
            touchAction: 'none' as const,
          } : {}),
        }}
      >
        {isWordLevel && activeSegment.words.length > 0 ? (
          <WordLevelCaption
            segment={activeSegment}
            currentTime={currentTime}
            style={style}
            config={config}
          />
        ) : (
          <span>{displayText}</span>
        )}
        {draggable && onSizeChange && (
          // Bottom-right resize handle. Stops pointerdown propagation so it
          // never triggers the body's drag handler. Visible only in editor
          // mode; pointer-events isolated from the rest of the block.
          <div
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            title="Drag to resize captions"
            style={{
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              width: '14px',
              height: '14px',
              borderRadius: '3px',
              background: isResizing ? 'rgba(0,212,255,0.9)' : 'rgba(255,255,255,0.85)',
              border: '1.5px solid rgba(0,0,0,0.6)',
              cursor: 'nwse-resize',
              touchAction: 'none',
              zIndex: 1,
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
            aria-label="Resize captions"
            role="slider"
          />
        )}
      </div>
    </div>
  );
}

/**
 * For line-level styles, show words progressively in lines of ~6.
 * Only shows words up to the estimated current word position,
 * grouped into complete lines as the speaker progresses.
 */
function getVisibleText(
  fullText: string,
  currentTime: number,
  segment: CaptionSegment
): string {
  const words = fullText.split(/\s+/);
  if (words.length <= 6) return fullText;

  // Estimate which word we're at based on time position
  const progress = Math.max(0, Math.min(1,
    (currentTime - segment.start) / (segment.end - segment.start)
  ));
  const estimatedWordIdx = Math.floor(progress * words.length);

  // Show the current line of ~6 words, reveal progressively within it
  const lineSize = 6;
  const lineIndex = Math.floor(estimatedWordIdx / lineSize);
  const lineStart = lineIndex * lineSize;
  const revealEnd = Math.min(words.length, estimatedWordIdx + 1);
  const lineEnd = Math.min(words.length, lineStart + lineSize);

  // Show revealed words in the current line
  return words.slice(lineStart, Math.min(revealEnd, lineEnd)).join(' ');
}

/** Renders word-level animated captions with progressive reveal.
 * Words appear in groups of ~5 (a "line"). Within each line, words
 * are revealed progressively as the speaker says them. When a line
 * is complete, the next line starts fresh. This prevents text blobs
 * that get ahead of the speaker.
 */
function WordLevelCaption({
  segment,
  currentTime,
  style,
  config,
}: {
  segment: CaptionSegment;
  currentTime: number;
  style: CaptionStylePreset;
  config: (typeof STYLE_CONFIG)[CaptionStylePreset];
}) {
  const activeIdx = getActiveWordIndex(segment, currentTime);

  // Group words into "lines" of ~5 words. Show only the current line.
  // Within the line, only reveal words up to the active word (progressive).
  const lineSize = style === 'word_by_word' ? 3 : 5;
  const lineIndex = activeIdx >= 0 ? Math.floor(activeIdx / lineSize) : 0;
  const lineStart = lineIndex * lineSize;
  const lineEnd = Math.min(segment.words.length, lineStart + lineSize);
  // Show all words in the current line, but only reveal up to activeIdx
  const visibleWords = segment.words.slice(lineStart, lineEnd);

  return (
    <span>
      {visibleWords.map((word, i) => {
        const globalIdx = lineStart + i;
        const isActive = globalIdx === activeIdx;
        const isPast = globalIdx < activeIdx;
        const isFuture = globalIdx > activeIdx;

        // Progressive reveal: future words in the line are invisible
        // This prevents the text blob from getting ahead of the speaker
        if (isFuture && style !== 'highlight') {
          return <span key={`${word.start}-${i}`} style={{ display: 'inline-block', marginRight: '0.25em', opacity: 0 }}>{word.word}</span>;
        }

        let wordStyle: React.CSSProperties = {
          display: 'inline-block',
          marginRight: '0.25em',
          transition: 'color 0.15s, transform 0.15s, opacity 0.15s',
          opacity: 1,
        };

        if (style === 'highlight') {
          // Highlight: show all words in the line, pop the active one
          wordStyle.color = isActive ? '#FFFF00' : isFuture ? 'rgba(255,255,255,0.4)' : config.color;
          wordStyle.transform = isActive ? 'scale(1.15)' : 'scale(1)';
          if (isActive) {
            wordStyle.textShadow = HEAVY_OUTLINE_SHADOW;
          }
        } else if (style === 'word_by_word') {
          wordStyle.color = isActive ? '#FFFF00' : config.color;
          wordStyle.transform = isActive ? 'scale(1.15)' : 'scale(1)';
        } else if (style === 'karaoke') {
          wordStyle.color = isPast || isActive ? '#FFFF00' : config.color;
          if (isActive) {
            wordStyle.transform = 'scale(1.1)';
            wordStyle.textShadow = HEAVY_OUTLINE_SHADOW;
          }
        } else if (style === 'underline') {
          wordStyle.borderBottom = isActive ? '3px solid #FFFF00' : 'none';
          wordStyle.paddingBottom = '2px';
          if (isActive) wordStyle.color = '#FFFF00';
        }

        return (
          <span key={`${word.start}-${i}`} style={wordStyle}>
            {word.word}
          </span>
        );
      })}
    </span>
  );
}
