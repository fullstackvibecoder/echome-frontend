'use client';

import { useEffect, useState } from 'react';

interface VoiceWaveformProps {
  /** 32 values between 0-1, derived from voice centroid */
  waveformData: number[];
  /** 0-100 overall voice strength, controls color vibrancy */
  overallStrength: number;
  className?: string;
}

export function VoiceWaveform({ waveformData, overallStrength, className = '' }: VoiceWaveformProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Trigger entry animation after mount
    const timer = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  // Vibrancy: low strength = faded, high = vibrant
  const opacity = 0.4 + (overallStrength / 100) * 0.6;
  const maxHeight = 56; // px
  const minHeight = 4;  // px — always visible

  return (
    <div className={`flex items-end gap-[2px] h-14 sm:h-16 ${className}`}>
      {waveformData.map((value, i) => {
        const targetHeight = minHeight + value * (maxHeight - minHeight);

        return (
          <div
            key={i}
            className={`
              flex-1 rounded-full
              ${i % 2 === 1 ? 'hidden sm:block' : ''}
            `}
            style={{
              height: loaded ? `${targetHeight}px` : `${minHeight}px`,
              background: `linear-gradient(to top, #00D4FF, #B794F6)`,
              opacity,
              transition: `height 0.6s ease-out`,
              transitionDelay: `${i * 25}ms`,
              animation: loaded ? `breathe 3s ease-in-out infinite` : 'none',
              animationDelay: `${0.8 + i * 0.08}s`, // start after entry finishes
              boxShadow: 'var(--waveform-glow, none)',
            }}
          />
        );
      })}
    </div>
  );
}
