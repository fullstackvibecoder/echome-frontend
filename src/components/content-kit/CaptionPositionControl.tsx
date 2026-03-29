'use client';

import type { CaptionPosition } from './CaptionOverlay';

interface CaptionPositionControlProps {
  value: CaptionPosition;
  onChange: (position: CaptionPosition) => void;
  disabled?: boolean;
}

const POSITIONS: { value: CaptionPosition; label: string; icon: React.ReactNode }[] = [
  {
    value: 'top',
    label: 'Top',
    icon: (
      <svg viewBox="0 0 20 28" className="w-4 h-5">
        <rect x="1" y="1" width="18" height="26" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.3} />
        <rect x="4" y="4" width="12" height="3" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: 'center',
    label: 'Center',
    icon: (
      <svg viewBox="0 0 20 28" className="w-4 h-5">
        <rect x="1" y="1" width="18" height="26" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.3} />
        <rect x="4" y="12" width="12" height="3" rx="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: 'bottom',
    label: 'Bottom',
    icon: (
      <svg viewBox="0 0 20 28" className="w-4 h-5">
        <rect x="1" y="1" width="18" height="26" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.3} />
        <rect x="4" y="21" width="12" height="3" rx="1" fill="currentColor" />
      </svg>
    ),
  },
];

export function CaptionPositionControl({ value, onChange, disabled }: CaptionPositionControlProps) {
  return (
    <div className="flex items-center rounded-full bg-bg-tertiary border border-border overflow-hidden">
      {POSITIONS.map((pos) => {
        const isSelected = pos.value === value;
        return (
          <button
            key={pos.value}
            onClick={() => !disabled && onChange(pos.value)}
            disabled={disabled}
            title={pos.label}
            className={`flex items-center justify-center w-7 h-7 transition-colors ${
              isSelected
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
            } disabled:opacity-50`}
          >
            {pos.icon}
          </button>
        );
      })}
    </div>
  );
}
