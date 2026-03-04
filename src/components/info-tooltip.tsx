'use client';

let tooltipIdCounter = 0;

/**
 * InfoTooltip - Lightweight, CSS-only hover/focus tooltip.
 * Renders a small "?" circle that shows help text on hover or focus.
 * Uses peer/peer-hover and peer-focus so keyboard users can access it.
 */
export function InfoTooltip({ text }: { text: string }) {
  const tooltipId = `tooltip-${++tooltipIdCounter}`;
  return (
    <span className="relative inline-flex items-center ml-1">
      <span
        className="peer w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 text-[10px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center cursor-help shrink-0 leading-none"
        tabIndex={0}
        role="button"
        aria-describedby={tooltipId}
      >
        ?
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs leading-relaxed shadow-lg opacity-0 scale-95 transition-all duration-150 peer-hover:opacity-100 peer-hover:scale-100 peer-focus:opacity-100 peer-focus:scale-100 z-50"
      >
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
