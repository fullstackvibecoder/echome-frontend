'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ReelSegment {
  text: string;
  duration: number;
}

interface SegmentPreviewProps {
  thumbnailUrl?: string;
  /** MP4 URL for live video preview — plays looped and muted */
  videoUrl?: string;
  segments: ReelSegment[];
  style: string;
  textScale?: number;
  singleBlockText?: string;
}

/**
 * Base font sizes per style (in rem). The scale multiplier is applied
 * to these values so text REFLOWS at different sizes instead of just
 * zooming in/out uniformly via transform.
 */
const STYLE_CONFIG: Record<string, {
  baseSize: number;    // rem
  weight: string;
  uppercase: boolean;
  leading: string;
  tracking: string;
  shadow: string;
  extras?: React.CSSProperties;
  wrapperClass?: string;
}> = {
  bold_impact: {
    baseSize: 2.8,
    weight: '800',
    uppercase: true,
    leading: '0.95',
    tracking: '-0.02em',
    shadow: '0 2px 4px rgba(0,0,0,0.9), 0 4px 16px rgba(0,0,0,0.6)',
  },
  minimal_clean: {
    baseSize: 1.4,
    weight: '300',
    uppercase: false,
    leading: '1.3',
    tracking: '0',
    shadow: '0 1px 3px rgba(0,0,0,0.8)',
  },
  brand_gradient: {
    baseSize: 2.0,
    weight: '700',
    uppercase: false,
    leading: '1.1',
    tracking: '0',
    shadow: 'none',
    wrapperClass: 'inline-block px-5 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-purple)]',
    extras: { boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  },
  story_cards: {
    baseSize: 1.5,
    weight: '600',
    uppercase: false,
    leading: '1.2',
    tracking: '0',
    shadow: 'none',
    wrapperClass: 'bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-xl mx-3',
    extras: { color: '#111827' }, // gray-900
  },
  outlined_stroke: {
    baseSize: 2.8,
    weight: '800',
    uppercase: true,
    leading: '0.95',
    tracking: '-0.02em',
    shadow: '0 2px 8px rgba(0,0,0,0.6)',
    extras: { color: 'transparent', WebkitTextStroke: '2px white' },
  },
  neon_glow: {
    baseSize: 2.4,
    weight: '700',
    uppercase: true,
    leading: '0.95',
    tracking: '0.05em',
    shadow: '0 0 10px #00D4FF, 0 0 20px #00D4FF, 0 0 40px #00D4FF, 0 0 80px #0077AA',
  },
};

const DEFAULT_CONFIG = {
  baseSize: 2.2,
  weight: '700',
  uppercase: false,
  leading: '1.1',
  tracking: '0',
  shadow: '0 2px 8px rgba(0,0,0,0.8)',
};

function renderStyledText(text: string, style: string, scale: number) {
  const config = STYLE_CONFIG[style] || DEFAULT_CONFIG;
  const fontSize = `${config.baseSize * scale}rem`;

  const textStyle: React.CSSProperties = {
    fontSize,
    fontWeight: config.weight,
    lineHeight: config.leading,
    letterSpacing: config.tracking,
    textShadow: config.shadow !== 'none' ? config.shadow : undefined,
    textTransform: config.uppercase ? 'uppercase' : undefined,
    wordBreak: 'break-word' as const,
    textAlign: 'center' as const,
    ...config.extras,
  };

  const textColorClass = config.extras?.color ? '' : 'text-white';

  if (config.wrapperClass) {
    return (
      <div className="px-4 text-center">
        <div className={config.wrapperClass} style={config.extras}>
          <p className={textColorClass} style={textStyle}>{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 text-center">
      <p className={textColorClass} style={textStyle}>{text}</p>
    </div>
  );
}

export default function SegmentPreview({
  thumbnailUrl,
  videoUrl,
  segments,
  style,
  textScale = 1.0,
  singleBlockText,
}: SegmentPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const jumpToSegment = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  // Auto-cycle through segments
  useEffect(() => {
    if (singleBlockText || segments.length === 0) return;

    const safeIdx = activeIndex < segments.length ? activeIndex : 0;
    const durationMs = (segments[safeIdx]?.duration || 3) * 1000;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % segments.length);
    }, durationMs);

    return () => clearInterval(timer);
  }, [activeIndex, segments, singleBlockText]);

  const safeIndex = segments.length > 0 ? activeIndex % segments.length : 0;

  return (
    <div>
      <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden relative border-2 border-border">
        {/* Background — video if available, otherwise thumbnail, otherwise gradient */}
        {videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-950" />
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Text overlay — no transform:scale, font size drives reflow */}
        <div className="absolute inset-0 flex items-center justify-center">
          {singleBlockText ? (
            <div className="bg-black/40 backdrop-blur-[2px] rounded-xl px-4 py-3 mx-3 max-w-[90%]">
              {renderStyledText(singleBlockText, style, textScale * 0.6)}
            </div>
          ) : segments.length > 0 ? (
            <div
              key={`${safeIndex}-${segments[safeIndex]?.text}`}
              className="w-full"
              style={{ animation: 'segFadeIn 300ms ease-in' }}
            >
              {renderStyledText(segments[safeIndex].text, style, textScale)}
            </div>
          ) : null}
        </div>

        <style>{`
          @keyframes segFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      {/* Navigation dots */}
      {!singleBlockText && segments.length > 1 && (
        <div className="flex gap-1.5 justify-center mt-2">
          {segments.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Segment ${i + 1}`}
              onClick={() => jumpToSegment(i)}
              className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${
                i === safeIndex ? 'bg-primary-interactive' : 'bg-border'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
