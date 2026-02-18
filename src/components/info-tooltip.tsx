'use client';

/**
 * InfoTooltip - Lightweight, CSS-only hover tooltip.
 * Renders a small "?" circle that shows help text on hover.
 */
export function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group ml-1">
      <span className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 text-[10px] font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center cursor-help shrink-0 leading-none">
        ?
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs leading-relaxed shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 z-50">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
