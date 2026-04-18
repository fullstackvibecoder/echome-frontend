'use client';

interface OutputCardProps {
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  thumbnailFallback?: React.ReactNode;
  aspectRatio?: '16/9' | '9/16' | '1/1';
  onClick: () => void;
  badge?: string;
}

export function OutputCard({
  title,
  subtitle,
  thumbnailUrl,
  thumbnailFallback,
  aspectRatio = '16/9',
  onClick,
  badge,
}: OutputCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary-interactive transition-colors text-left w-full"
    >
      {/* Thumbnail area */}
      <div
        className="relative max-h-[120px] overflow-hidden"
        style={{ aspectRatio }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : thumbnailFallback ? (
          <div className="w-full h-full flex items-center justify-center">
            {thumbnailFallback}
          </div>
        ) : (
          <div className="w-full h-full bg-zinc-800" />
        )}

        {badge && (
          <span className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
    </button>
  );
}

export default OutputCard;
