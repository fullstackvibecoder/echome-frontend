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
  aspectRatio?: '16/9' | '9/16' | '1/1';
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
        className="group bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary-interactive transition-all hover:shadow-lg hover:shadow-primary-interactive/5 text-left w-full"
      >
        <div
          className="relative overflow-hidden bg-surface-container-low"
          style={{ aspectRatio }}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : thumbnailFallback ? (
            <div className="w-full h-full flex items-center justify-center">
              {thumbnailFallback}
            </div>
          ) : (
            <div className="w-full h-full bg-surface-container-low flex items-center justify-center">
              {Icon && <Icon className="w-8 h-8 text-muted-foreground/20" />}
            </div>
          )}

          {badge && (
            <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}

          {/* Play button overlay for clips */}
          {platform === 'clip' && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          )}
        </div>

        <div className="p-2.5">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
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
      className="group bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary-interactive transition-all text-left w-full"
    >
      {/* Platform header bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-border"
        style={accentColor ? { borderBottomColor: `${accentColor}30` } : undefined}
      >
        {Icon && (
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
        </div>
        {badge && (
          <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">{badge}</span>
        )}
      </div>

      {/* Content preview */}
      <div className="p-3">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full rounded-lg object-cover max-h-[80px]"
          />
        ) : thumbnailFallback ? (
          <div className="text-[12px] text-muted-foreground/70 leading-relaxed line-clamp-4">
            {thumbnailFallback}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/40 italic">No content yet</p>
        )}
        {subtitle && !Icon && (
          <p className="text-xs text-muted-foreground truncate mt-1.5">{subtitle}</p>
        )}
      </div>
    </button>
  );
}

export default OutputCard;
