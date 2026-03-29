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

import { useMemo } from 'react';
import {
  CaptionSegment,
  CaptionStylePreset,
  getActiveSegment,
  getActiveWordIndex,
  getKaraokeFill,
  isWordLevelStyle,
} from '@/lib/caption-parser';

interface CaptionOverlayProps {
  segments: CaptionSegment[];
  currentTime: number;
  isVisible: boolean;
  style: CaptionStylePreset;
  viewMode: 'single' | 'split';
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
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '18px',
    fontWeight: '700',
    color: '#FFFFFF',
    textShadow: OUTLINE_SHADOW,
  },
  classic: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '15px',
    fontWeight: '400',
    color: '#FFFFFF',
    textShadow: 'none',
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: '3px 10px',
    borderRadius: '4px',
  },
  bold: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: '22px',
    fontWeight: '400',
    color: '#FFFF00',
    textShadow: HEAVY_OUTLINE_SHADOW,
  },
  minimal: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    fontWeight: '400',
    color: '#FFFFFF',
    textShadow: OUTLINE_SHADOW,
  },
  highlight: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '20px',
    fontWeight: '800',
    color: '#FFFFFF',
    textShadow: HEAVY_OUTLINE_SHADOW,
  },
  karaoke: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '18px',
    fontWeight: '700',
    color: '#FFFFFF',
    textShadow: HEAVY_OUTLINE_SHADOW,
  },
  underline: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '18px',
    fontWeight: '700',
    color: '#FFFFFF',
    textShadow: HEAVY_OUTLINE_SHADOW,
  },
  word_by_word: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '20px',
    fontWeight: '800',
    color: '#FFFFFF',
    textShadow: HEAVY_OUTLINE_SHADOW,
  },
};

export function CaptionOverlay({
  segments,
  currentTime,
  isVisible,
  style,
  viewMode,
}: CaptionOverlayProps) {
  const activeSegment = useMemo(
    () => getActiveSegment(segments, currentTime, 0),
    [segments, currentTime, style]
  );

  if (!isVisible || !activeSegment) return null;

  const config = STYLE_CONFIG[style];
  const isWordLevel = isWordLevelStyle(style);

  // Position: bottom for single view, center for split-screen
  const positionStyle: React.CSSProperties =
    viewMode === 'split'
      ? { top: '50%', transform: 'translateY(-50%)' } // center seam
      : { bottom: '18%' }; // above controls area

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
 * For line-level styles, show a rolling window of ~10-12 words from the segment
 * based on current playback time, instead of dumping the entire segment.
 */
function getVisibleText(
  fullText: string,
  currentTime: number,
  segment: CaptionSegment
): string {
  const words = fullText.split(/\s+/);
  if (words.length <= 12) return fullText;

  // Estimate which word we're at based on time position within the segment
  const progress = Math.max(0, Math.min(1,
    (currentTime - segment.start) / (segment.end - segment.start)
  ));
  const estimatedWordIdx = Math.floor(progress * words.length);
  const start = Math.max(0, estimatedWordIdx - 3);
  const end = Math.min(words.length, start + 10);

  return words.slice(start, end).join(' ');
}

/** Renders word-level animated captions — shows a window of ~8 words */
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

  // Show a window of words around the active word (not the full segment)
  // Active word sits at ~1/3 from the left so upcoming words are visible
  const windowSize = style === 'word_by_word' ? 4 : 8;
  const idealStart = Math.max(0, activeIdx - Math.floor(windowSize / 3));
  // Clamp end to segment length, then adjust start to keep window full
  const end = Math.min(segment.words.length, idealStart + windowSize);
  const start = Math.max(0, end - windowSize);
  const visibleWords = segment.words.slice(start, end);

  return (
    <span>
      {visibleWords.map((word, i) => {
        const globalIdx = start + i;
        const isActive = globalIdx === activeIdx;
        const isPast = globalIdx < activeIdx;

        let wordStyle: React.CSSProperties = {
          display: 'inline-block',
          marginRight: '0.25em',
          transition: 'color 0.1s, transform 0.1s',
        };

        if (style === 'word_by_word' || style === 'highlight') {
          // Active word pops yellow with slight scale
          wordStyle.color = isActive ? '#FFFF00' : config.color;
          wordStyle.transform = isActive ? 'scale(1.15)' : 'scale(1)';
          if (isActive) {
            wordStyle.textShadow = HEAVY_OUTLINE_SHADOW;
          }
        } else if (style === 'karaoke') {
          // Active word turns yellow, past words stay yellow, future white
          // Using solid color swap instead of gradient-clip (which kills text-shadow)
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
