'use client';

import { useEffect, useRef, useState } from 'react';

let tooltipIdCounter = 0;

/**
 * InfoTooltip — small "?" affordance with help text.
 *
 * Behavior:
 *   - Desktop: hover or keyboard-focus shows the tip.
 *   - Mobile / touch: tap toggles open state (CSS hover doesn't exist).
 *     Outside-tap or Escape closes it.
 *
 * Earlier version was CSS-only with peer-hover/peer-focus, which silently
 * broke on iOS — taps don't keep :focus on a non-button span, so users
 * never saw the tip.
 */
export function InfoTooltip({ text }: { text: string }) {
  const tooltipId = `tooltip-${++tooltipIdCounter}`;
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={wrapperRef} className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 text-[10px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center cursor-help shrink-0 leading-none"
        aria-describedby={tooltipId}
        aria-expanded={open}
        aria-label="More info"
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs leading-relaxed shadow-lg transition-all duration-150 z-50 ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
