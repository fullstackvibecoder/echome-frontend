'use client';

/**
 * CaptionOverlay — Renders styled captions synced to video playback.
 *
 * Supports all 8 caption presets:
 * - Line-level: modern, classic, bold, minimal (show full segment text)
 * - Word-level: highlight, karaoke, underline, word_by_word (animate per word)
 *
 * Positioning adapts to single (bottom) vs split (center seam) view.
 */

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
}: CaptionOverlayProps) {
  const activeSegment = getActiveSegment(segments, currentTime, 0);

  if (!isVisible || !activeSegment) return null;

  const config = STYLE_CONFIG[style];
  const isWordLevel = isWordLevelStyle(style);

  // Position: use explicit position if set, otherwise default based on viewMode
  const effectivePosition = position || (viewMode === 'split' ? 'center' : 'bottom');
  const positionStyle = POSITION_STYLES[effectivePosition];

  // For line-level styles, show only a short window of text (~12 words max)
  const displayText = !isWordLevel
    ? getVisibleText(activeSegment.text, currentTime, activeSegment)
    : '';

  return (
    <div
      className="absolute left-0 right-0 flex justify-center pointer-events-none z-20 px-4"
      style={positionStyle}
    >
      <div
        className="text-center max-w-[85%] leading-snug"
        style={{
          fontFamily: config.fontFamily,
          fontSize: config.fontSize,
          fontWeight: config.fontWeight,
          color: config.color,
          textShadow: config.textShadow,
          backgroundColor: config.backgroundColor,
          padding: config.padding || '4px 8px',
          borderRadius: config.borderRadius,
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
