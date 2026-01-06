'use client';

/**
 * GroupHeader Component
 *
 * Collapsible header for grouped content sections.
 */

interface GroupHeaderProps {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}

export function GroupHeader({
  title,
  count,
  collapsed,
  onToggle,
}: GroupHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 py-2 px-1 group hover:bg-bg-secondary/50 rounded-lg transition-colors"
    >
      {/* Chevron */}
      <span
        className={`
          text-text-tertiary group-hover:text-text-secondary transition-transform duration-200
          ${collapsed ? '' : 'rotate-90'}
        `}
      >
        <ChevronRightIcon />
      </span>

      {/* Title */}
      <span className="font-semibold text-text-primary">{title}</span>

      {/* Count Badge */}
      <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary text-xs font-medium">
        {count}
      </span>

      {/* Divider Line */}
      <span className="flex-1 h-px bg-border" />
    </button>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default GroupHeader;
