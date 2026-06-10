'use client';

/**
 * Voice waveform motif. Spec (2026-06-10): may appear ONLY at voice
 * moments — voice strength, Echo listening/working states, voice-source
 * attribution. Never decoration.
 */

const BAR_HEIGHTS = [0.35, 0.8, 0.55, 1, 0.45, 0.7, 0.3];

interface WaveformProps {
  /** Number of bars, taken from the start of the fixed pattern */
  bars?: number;
  /** Bar height in px at the tallest point */
  height?: number;
  /** Breathing animation (auto-disabled by prefers-reduced-motion) */
  animated?: boolean;
  className?: string;
}

export function Waveform({ bars = 5, height = 14, animated = false, className = '' }: WaveformProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center gap-[2px] ${className}`}
      style={{ height }}
    >
      {BAR_HEIGHTS.slice(0, bars).map((h, i) => (
        <span
          key={i}
          className={`w-[2.5px] rounded-full bg-accent ${animated ? 'animate-waveform-breathe' : ''}`}
          style={{
            height: Math.max(3, Math.round(h * height)),
            animationDelay: animated ? `${i * 120}ms` : undefined,
          }}
        />
      ))}
    </span>
  );
}
