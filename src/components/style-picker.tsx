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

  const aspectClass = aspect === 'portrait' ? 'aspect-[9/16]' : 'aspect-square';

  return (
    <div className="mt-6">
      {/* Section Header */}
      <h3 className="text-sm font-medium text-text-primary mb-3">
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
                relative flex flex-col rounded-xl overflow-hidden transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] focus-visible:ring-offset-2
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${
                  isSelected
                    ? 'ring-2 ring-[#00D4FF] shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                    : 'ring-1 ring-white/10 hover:ring-white/25 hover:scale-[1.03]'
                }
              `}
              style={{
                // Respect prefers-reduced-motion
                transition: 'all 0.2s ease',
              }}
            >
              {/* Thumbnail */}
              <div
                className={`relative ${aspectClass} w-full bg-gray-800 overflow-hidden`}
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
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#00D4FF] rounded-full flex items-center justify-center shadow-lg">
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
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#00D4FF]/90 rounded text-[10px] font-semibold text-white leading-tight">
                    {option.badge}
                  </div>
                )}
              </div>

              {/* Label below thumbnail */}
              <div
                className={`px-2 py-1.5 text-xs font-medium text-center leading-tight ${
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
