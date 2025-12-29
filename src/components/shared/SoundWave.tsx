'use client';

interface SoundWaveProps {
  bars?: number;
  color?: string;
  className?: string;
}

export function SoundWave({ bars = 5, color = '#00D4FF', className = '' }: SoundWaveProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-1 bg-current rounded-full animate-sound-wave"
          style={{
            height: '20px',
            color,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
