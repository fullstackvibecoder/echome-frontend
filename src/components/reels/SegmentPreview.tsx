'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ReelSegment {
  text: string;
  duration: number;
}

interface SegmentPreviewProps {
  thumbnailUrl?: string;
  segments: ReelSegment[];
  style: string;
  textScale?: number;
  singleBlockText?: string;
}

function renderStyledText(text: string, style: string) {
  switch (style) {
    case 'bold_impact':
      return (
        <div className="px-4 text-center">
          <p
            className="text-white font-extrabold uppercase leading-[0.95] tracking-tight"
            style={{
              fontSize: 'clamp(2rem, 10vw, 3.5rem)',
              textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 4px 16px rgba(0,0,0,0.6)',
              wordBreak: 'break-word',
            }}
          >
            {text}
          </p>
        </div>
      );

    case 'minimal_clean':
      return (
        <div className="px-5 text-center">
          <p
            className="text-white/90 font-light leading-snug"
            style={{
              fontSize: 'clamp(1.2rem, 6vw, 1.8rem)',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            {text}
          </p>
        </div>
      );

    case 'brand_gradient':
      return (
        <div className="px-4 text-center">
          <span
            className="inline-block px-5 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-purple)] text-white font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.4rem, 7vw, 2.2rem)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {text}
          </span>
        </div>
      );

    case 'story_cards':
      return (
        <div className="mx-4">
          <div
            className="bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-xl"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
          >
            <p
              className="text-gray-900 font-semibold text-center leading-snug"
              style={{ fontSize: 'clamp(1.2rem, 6vw, 1.8rem)' }}
            >
              {text}
            </p>
          </div>
        </div>
      );

    case 'outlined_stroke':
      return (
        <div className="px-4 text-center">
          <p
            className="font-extrabold uppercase leading-[0.95] tracking-tight"
            style={{
              fontSize: 'clamp(2rem, 10vw, 3.5rem)',
              color: 'transparent',
              WebkitTextStroke: '2px white',
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              wordBreak: 'break-word',
            }}
          >
            {text}
          </p>
        </div>
      );

    case 'neon_glow':
      return (
        <div className="px-4 text-center">
          <p
            className="text-white font-bold uppercase leading-[0.95] tracking-wide"
            style={{
              fontSize: 'clamp(1.8rem, 9vw, 3rem)',
              textShadow: '0 0 10px #00D4FF, 0 0 20px #00D4FF, 0 0 40px #00D4FF, 0 0 80px #0077AA',
              wordBreak: 'break-word',
            }}
          >
            {text}
          </p>
        </div>
      );

    default:
      return (
        <div className="px-4 text-center">
          <p
            className="text-white font-bold leading-tight"
            style={{
              fontSize: 'clamp(1.6rem, 8vw, 2.8rem)',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            }}
          >
            {text}
          </p>
        </div>
      );
  }
}

export default function SegmentPreview({
  thumbnailUrl,
  segments,
  style,
  textScale,
  singleBlockText,
}: SegmentPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const jumpToSegment = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  // Auto-cycle through segments
  useEffect(() => {
    if (singleBlockText || segments.length === 0) return;

    const safeIndex = activeIndex < segments.length ? activeIndex : 0;
    const durationMs = (segments[safeIndex]?.duration || 3) * 1000;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % segments.length);
    }, durationMs);

    return () => clearInterval(timer);
  }, [activeIndex, segments, singleBlockText]);

  const safeIndex = segments.length > 0 ? activeIndex % segments.length : 0;

  return (
    <div>
      <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden relative border-2 border-border">
        {/* Background */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-950" />
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ transform: `scale(${textScale || 1})` }}>
            {singleBlockText ? (
              <div className="bg-black/40 backdrop-blur-[2px] rounded-xl px-4 py-3 mx-3">
                {renderStyledText(singleBlockText, style)}
              </div>
            ) : segments.length > 0 ? (
              <div
                key={safeIndex}
                className="transition-opacity duration-300"
                style={{ animation: 'fadeIn 300ms ease-in' }}
              >
                {renderStyledText(segments[safeIndex].text, style)}
              </div>
            ) : null}
          </div>
        </div>

        {/* Inline keyframes */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>

      {/* Navigation dots — only in segments mode */}
      {!singleBlockText && segments.length > 1 && (
        <div className="flex gap-1.5 justify-center mt-2">
          {segments.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to segment ${i + 1}`}
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
