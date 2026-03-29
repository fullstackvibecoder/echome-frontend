'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { CAPTION_STYLE_GRID, CAPTION_STYLE_LABELS } from '@/lib/caption-constants';
import type { CaptionStylePreset } from '@/lib/caption-parser';

interface CaptionStylePopoverProps {
  value: CaptionStylePreset;
  onChange: (style: CaptionStylePreset) => void;
  disabled?: boolean;
}

export function CaptionStylePopover({ value, onChange, disabled }: CaptionStylePopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors bg-black/40 hover:bg-black/60 border border-[#3A3A3C] text-white/80 hover:text-white disabled:opacity-50"
      >
        <span>{CAPTION_STYLE_LABELS[value] || value}</span>
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-[#2A2A2C] border border-[#3A3A3C] rounded-xl shadow-2xl p-2 w-[280px]">
          <p className="text-[10px] uppercase tracking-wider text-[#9B8BAF] font-bold px-1 mb-1.5">Caption Style</p>
          <div className="grid grid-cols-4 gap-1.5">
            {CAPTION_STYLE_GRID.map((style) => {
              const isSelected = style.value === value;
              return (
                <button
                  key={style.value}
                  onClick={() => {
                    onChange(style.value as CaptionStylePreset);
                    setOpen(false);
                  }}
                  className={`relative flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-[#00D4FF]/15 ring-2 ring-[#00D4FF]'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <div className="w-full aspect-[3/4] rounded-md bg-[#1C1C1E] overflow-hidden">
                    <img
                      src={style.thumbnail}
                      alt={style.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className={`text-[10px] leading-tight ${isSelected ? 'text-[#00D4FF] font-semibold' : 'text-white/60'}`}>
                    {style.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
