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

// CSS styles for each preset — mirrors CAPTION_PRESETS from the backend
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
    fontSize: 'clamp(14px, 4vw, 28px)',
    fontWeight: '700',
    color: '#FFFFFF',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)',
  },
  classic: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 'clamp(12px, 3.5vw, 24px)',
    fontWeight: '400',
    color: '#FFFFFF',
    textShadow: 'none',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: '4px 12px',
    borderRadius: '4px',
  },
  bold: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: 'clamp(18px, 5vw, 36px)',
    fontWeight: '400',
    color: '#FFFF00',
    textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
  },
  minimal: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 'clamp(11px, 3vw, 20px)',
    fontWeight: '400',
    color: '#FFFFFF',
    textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
  },
  highlight: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 'clamp(14px, 4vw, 28px)',
    fontWeight: '800',
    color: '#FFFFFF',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
  },
  karaoke: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 'clamp(14px, 4vw, 28px)',
    fontWeight: '700',
    color: '#FFFFFF',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
  },
  underline: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 'clamp(14px, 4vw, 28px)',
    fontWeight: '700',
    color: '#FFFFFF',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
  },
  word_by_word: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 'clamp(16px, 4.5vw, 32px)',
    fontWeight: '800',
    color: '#FFFFFF',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
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
    () => getActiveSegment(segments, currentTime, isWordLevelStyle(style) ? 40 : 0),
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
  const windowSize = style === 'word_by_word' ? 4 : 8;
  const start = Math.max(0, activeIdx - Math.floor(windowSize / 3));
  const end = Math.min(segment.words.length, start + windowSize);
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
          wordStyle.color = isActive ? '#FFFF00' : config.color;
          wordStyle.transform = isActive ? 'scale(1.12)' : 'scale(1)';
        } else if (style === 'karaoke') {
          const fill = isActive ? getKaraokeFill(word, currentTime) : isPast ? 100 : 0;
          wordStyle.background = `linear-gradient(90deg, #FFFF00 ${fill}%, ${config.color} ${fill}%)`;
          wordStyle.WebkitBackgroundClip = 'text';
          wordStyle.WebkitTextFillColor = 'transparent';
          wordStyle.backgroundClip = 'text';
        } else if (style === 'underline') {
          wordStyle.borderBottom = isActive ? '3px solid #FFFF00' : 'none';
          wordStyle.paddingBottom = '2px';
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
