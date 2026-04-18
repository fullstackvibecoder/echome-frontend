'use client';

import {
  Linkedin,
  Instagram,
  Twitter,
  Mail,
  Music2,
  Youtube,
  FileText,
  Film,
  LayoutGrid,
  Play,
  type LucideIcon,
} from 'lucide-react';

// Platform identity — icon + accent color for quick recognition
const PLATFORM_IDENTITY: Record<string, { icon: LucideIcon; accent: string }> = {
  linkedin: { icon: Linkedin, accent: '#0A66C2' },
  instagram: { icon: Instagram, accent: '#E4405F' },
  'twitter/x': { icon: Twitter, accent: '#000000' },
  twitter: { icon: Twitter, accent: '#000000' },
  email: { icon: Mail, accent: '#0077AA' },
  tiktok: { icon: Music2, accent: '#000000' },
  youtube: { icon: Youtube, accent: '#FF0000' },
  substack: { icon: FileText, accent: '#FF6719' },
  carousel: { icon: LayoutGrid, accent: '#8B5CF6' },
  reel: { icon: Film, accent: '#0077AA' },
  clip: { icon: Play, accent: '#0077AA' },
};

interface OutputCardProps {
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  thumbnailFallback?: React.ReactNode;
  aspectRatio?: '16/9' | '9/16' | '4/5' | '1/1';
  onClick: () => void;
  badge?: string;
  /** Platform key for icon + accent color (e.g., 'linkedin', 'substack', 'clip') */
  platform?: string;
  /** Variant: 'visual' for clips/carousel/reel (larger), 'text' for posts/articles (compact) */
  variant?: 'visual' | 'text';
}

export function OutputCard({
  title,
  subtitle,
  thumbnailUrl,
  thumbnailFallback,
  aspectRatio = '16/9',
  onClick,
  badge,
  platform,
  variant = 'visual',
}: OutputCardProps) {
  const identity = platform ? PLATFORM_IDENTITY[platform.toLowerCase()] : null;
  const Icon = identity?.icon;
  const accentColor = identity?.accent;

  // Visual variant (clips, carousel, reel) — taller thumbnail, more visual prominence
  if (variant === 'visual') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary-interactive/40 transition-all duration-200 text-left w-full"
        style={{ boxShadow: 'var(--shadow-soft)' }}
      >
        <div
          className="relative overflow-hidden bg-surface-container-low"
          style={{ aspectRatio }}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            />
          ) : thumbnailFallback ? (
            <div className="w-full h-full flex items-center justify-center">
              {thumbnailFallback}
            </div>
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-2"
              style={{
                background: accentColor
                  ? `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}08 50%, ${accentColor}15 100%)`
                  : 'linear-gradient(135deg, var(--surface-container-low) 0%, var(--surface-container) 100%)',
              }}
            >
              {Icon && (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor || '#666'}20` }}
                >
                  <Icon className="w-6 h-6" style={{ color: accentColor || undefined, opacity: 0.6 }} />
                </div>
              )}
              <span className="text-[10px] font-medium text-muted-foreground/50">Click to create</span>
            </div>
          )}

          {badge && (
            <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}

          {/* Play button overlay for clips */}
          {platform === 'clip' && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          )}

          {/* Gradient scrim at bottom for readability */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </div>

        <div className="px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            {Icon && (
              <Icon className="w-3 h-3 flex-shrink-0" style={{ color: accentColor || undefined }} />
            )}
            <p className="text-[13px] font-medium text-foreground truncate">{title}</p>
          </div>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
      </button>
    );
  }

  // Text variant (platform posts, Substack) — compact with platform icon + accent
  return (
    <button
      type="button"
      onClick={onClick}
      className="group bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary-interactive/40 transition-all duration-200 text-left w-full"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="flex items-stretch">
        {/* Accent side stripe */}
        {accentColor && (
          <div className="w-1 flex-shrink-0" style={{ backgroundColor: accentColor }} />
        )}

        <div className="flex-1 min-w-0">
          {/* Platform header bar */}
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            {Icon && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${accentColor}12` }}
              >
                <Icon className="w-4 h-4" style={{ color: accentColor }} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{title}</p>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground/50 flex-shrink-0 group-hover:text-primary-interactive transition-colors">
              Edit →
            </span>
          </div>

          {/* Content preview */}
          <div className="px-4 pb-3">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full rounded-lg object-cover max-h-[80px]"
              />
            ) : thumbnailFallback ? (
              <div className="text-[12px] text-muted-foreground/60 leading-relaxed line-clamp-3">
                {thumbnailFallback}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/40 italic">No content yet</p>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default OutputCard;
