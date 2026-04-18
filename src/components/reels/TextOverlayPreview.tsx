'use client';

import React from 'react';

type OverlayStyle = 'bold_impact' | 'minimal_clean' | 'brand_gradient' | 'story_cards' | 'outlined_stroke' | 'neon_glow';

interface TextOverlayPreviewProps {
  thumbnailUrl?: string;
  text: string;
  style: OverlayStyle;
  position?: 'top' | 'center' | 'bottom';
}

const positionClasses: Record<string, string> = {
  top: 'justify-start pt-8',
  center: 'justify-center',
  bottom: 'justify-end pb-8',
};

export default function TextOverlayPreview({
  thumbnailUrl,
  text,
  style,
  position = 'center',
}: TextOverlayPreviewProps) {
  const renderText = () => {
    // Truncate to ~12 words max for preview — overlay text should be short
    const words = text.split(/\s+/);
    const displayText = words.length > 12 ? words.slice(0, 12).join(' ') + '...' : text;

    switch (style) {
      case 'bold_impact':
        return (
          <div className="px-4 text-center">
            <p
              className="text-white font-extrabold uppercase leading-[0.95] tracking-tight"
              style={{
                fontSize: 'clamp(1.5rem, 8vw, 2.5rem)',
                textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 4px 16px rgba(0,0,0,0.6)',
                wordBreak: 'break-word',
              }}
            >
              {displayText}
            </p>
          </div>
        );

      case 'minimal_clean':
        return (
          <div className="px-5 self-end pb-4 w-full">
            <p
              className="text-white/90 font-light leading-snug"
              style={{
                fontSize: 'clamp(0.75rem, 4vw, 1rem)',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              {displayText}
            </p>
          </div>
        );

      case 'brand_gradient':
        return (
          <div className="px-4 text-center">
            <span
              className="inline-block px-5 py-3 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-purple)] text-white font-bold leading-tight"
              style={{
                fontSize: 'clamp(1rem, 5vw, 1.5rem)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {displayText}
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
                style={{ fontSize: 'clamp(0.85rem, 4.5vw, 1.2rem)' }}
              >
                {displayText}
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
                fontSize: 'clamp(1.5rem, 8vw, 2.5rem)',
                color: 'transparent',
                WebkitTextStroke: '2px white',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                wordBreak: 'break-word',
              }}
            >
              {displayText}
            </p>
          </div>
        );

      case 'neon_glow':
        return (
          <div className="px-4 text-center">
            <p
              className="text-white font-bold uppercase leading-[0.95] tracking-wide"
              style={{
                fontSize: 'clamp(1.3rem, 7vw, 2.2rem)',
                textShadow: '0 0 10px #00D4FF, 0 0 20px #00D4FF, 0 0 40px #00D4FF, 0 0 80px #0077AA',
                wordBreak: 'break-word',
              }}
            >
              {displayText}
            </p>
          </div>
        );

      default:
        return (
          <div className="px-4 text-center">
            <p
              className="text-white font-bold leading-tight"
              style={{
                fontSize: 'clamp(1.2rem, 6vw, 2rem)',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              }}
            >
              {displayText}
            </p>
          </div>
        );
    }
  };

  return (
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

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Text overlay */}
      <div
        className={`absolute inset-0 flex flex-col items-center ${positionClasses[position]} px-1`}
      >
        {renderText()}
      </div>
    </div>
  );
}
