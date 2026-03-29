'use client';

import { useCallback } from 'react';

export interface StyleOption {
  /** API value sent to backend — never shown to users */
  value: string;
  /** Plain-English label shown under thumbnail */
  label: string;
  /** Path to preview thumbnail (SVG/PNG/WebP) */
  thumbnail: string;
  /** Optional badge text (e.g. "Popular") */
  badge?: string;
}

interface StylePickerProps {
  /** Section header shown above the grid */
  label: string;
  /** Style options to display */
  options: StyleOption[];
  /** Currently selected value */
  value: string;
  /** Selection change handler */
  onChange: (value: string) => void;
  /** Number of columns on desktop (default 4) */
  columns?: 4 | 5;
  /** Aspect ratio of thumbnails: 'portrait' for 9:16 captions, 'square' for 1:1 slides */
  aspect?: 'portrait' | 'square';
  /** Whether the picker is disabled */
  disabled?: boolean;
}

/**
 * StylePicker — visual thumbnail grid picker that replaces <select> dropdowns.
 * Cards show a preview image with label below. Selected card gets cyan border + glow + checkmark.
 */
export function StylePicker({
  label,
  options,
  value,
  onChange,
  columns = 4,
  aspect = 'square',
  disabled = false,
}: StylePickerProps) {
  const handleSelect = useCallback(
    (optionValue: string) => {
      if (!disabled) onChange(optionValue);
    },
    [disabled, onChange]
  );

  const gridCols =
    columns === 5
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';

  const aspectClass = aspect === 'portrait' ? 'aspect-[3/4]' : 'aspect-square';

  return (
    <div className="mt-6">
      {/* Section Header */}
      <h3 className="font-headline font-bold text-base mb-3">
        {label} <span className="text-text-secondary font-normal">(optional)</span>
      </h3>

      {/* Thumbnail Grid */}
      <div className={`grid ${gridCols} gap-3`}>
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              disabled={disabled}
              aria-label={`${option.label}${isSelected ? ' (selected)' : ''}`}
              aria-pressed={isSelected}
              className={`
                relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] focus-visible:ring-offset-2
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${
                  isSelected
                    ? 'ring-2 ring-[#00D4FF] shadow-[0_0_12px_rgba(0,212,255,0.2)] scale-[1.02]'
                    : 'ring-1 ring-outline-variant/60 hover:scale-[1.01]'
                }
              `}
              style={{
                // Respect prefers-reduced-motion
                transition: 'all 0.2s ease',
              }}
            >
              {/* Thumbnail */}
              <div
                className={`relative ${aspectClass} w-full bg-gray-800 rounded-2xl overflow-hidden`}
              >
                <img
                  src={option.thumbnail}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                  draggable={false}
                />

                {/* Selected checkmark overlay */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-lg animate-[scale-in_0.2s_ease-out] origin-center"
                    style={{ animation: 'scale-in 0.2s ease-out' }}
                  >
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}

                {/* Badge */}
                {option.badge && (
                  <div className="absolute top-1.5 left-1.5 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    {option.badge}
                  </div>
                )}
              </div>

              {/* Label below thumbnail */}
              <div
                className={`px-2 py-1.5 font-headline font-bold text-sm text-center leading-tight ${
                  isSelected ? 'text-[#00D4FF]' : 'text-gray-300'
                }`}
              >
                {option.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StylePicker;
