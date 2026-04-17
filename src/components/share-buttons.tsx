'use client';

import { useState } from 'react';

interface ShareButtonsProps {
  content: string;
  platform?: string;
  title?: string;
  url?: string;
  className?: string;
  onShare?: (platform: string) => void;
}

interface PlatformConfig {
  name: string;
  icon: string;
  color: string;
  hoverColor: string;
  canShare: boolean;
  /** Copy content to clipboard before opening share URL (fallback for unreliable pre-fill) */
  copyBeforeShare?: boolean;
  shareUrl?: (content: string, url?: string) => string;
  maxLength?: number;
}

const PLATFORMS: Record<string, PlatformConfig> = {
  twitter: {
    name: 'X (Twitter)',
    icon: '𝕏',
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
    canShare: true,
    shareUrl: (content, url) => {
      const text = encodeURIComponent(content.slice(0, 280));
      const urlParam = url ? `&url=${encodeURIComponent(url)}` : '';
      return `https://twitter.com/intent/tweet?text=${text}${urlParam}`;
    },
    maxLength: 280,
  },
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-social-linkedin',
    hoverColor: 'hover:bg-social-linkedin/80',
    canShare: true,
    // Opens LinkedIn compose with text pre-filled. Also copies to clipboard
    // as a fallback — LinkedIn has historically been unreliable about honoring
    // the text param, so the user can paste if it doesn't pre-fill.
    copyBeforeShare: true,
    shareUrl: (content) => {
      const text = encodeURIComponent(content.slice(0, 3000));
      return `https://www.linkedin.com/feed/?shareActive=true&text=${text}`;
    },
    maxLength: 3000,
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: 'bg-social-facebook',
    hoverColor: 'hover:bg-social-facebook/80',
    // Facebook deprecated the `quote` param in sharer.php — it no longer
    // pre-fills post text from external links. Copy-to-clipboard is the
    // only reliable way to get content into a Facebook post.
    canShare: false,
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: 'bg-gradient-to-r from-purple-600 via-red-500 to-orange-400',
    hoverColor: 'hover:opacity-90',
    canShare: false, // Copy only - no direct web share
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
    canShare: false, // Copy only - no direct web share
  },
  threads: {
    name: 'Threads',
    icon: '🧵',
    color: 'bg-black',
    hoverColor: 'hover:bg-gray-800',
    canShare: true,
    shareUrl: (content) => {
      const text = encodeURIComponent(content.slice(0, 500));
      return `https://www.threads.net/intent/post?text=${text}`;
    },
    maxLength: 500,
  },
  bluesky: {
    name: 'Bluesky',
    icon: '🦋',
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    canShare: true,
    shareUrl: (content) => {
      const text = encodeURIComponent(content.slice(0, 300));
      return `https://bsky.app/intent/compose?text=${text}`;
    },
    maxLength: 300,
  },
  blog: {
    name: 'Blog',
    icon: '📝',
    color: 'bg-emerald-500',
    hoverColor: 'hover:bg-emerald-600',
    canShare: false, // Copy only
  },
  email: {
    name: 'Newsletter',
    icon: '✉️',
    color: 'bg-amber-500',
    hoverColor: 'hover:bg-amber-600',
    canShare: false, // Copy only
  },
};

export function ShareButtons({
  content,
  platform,
  title,
  url,
  className = '',
  onShare,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShare?.('copy');
  };

  const handleShare = async (platformKey: string) => {
    const config = PLATFORMS[platformKey];
    if (!config) return;

    if (config.canShare && config.shareUrl) {
      // Some platforms (LinkedIn) are unreliable about pre-filling text,
      // so we copy to clipboard first as a fallback the user can paste.
      if (config.copyBeforeShare) {
        await navigator.clipboard.writeText(content);
      }
      const shareUrl = config.shareUrl(content, url);
      window.open(shareUrl, '_blank', 'width=600,height=400');
      onShare?.(platformKey);
    } else {
      // Copy to clipboard for platforms without web share
      handleCopy();
    }
  };

  // Web Share API for mobile
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Share content',
          text: content,
          url: url,
        });
        onShare?.('native');
      } catch (e) {
        // User cancelled or not supported
      }
    }
  };

  // Determine which platforms to show based on content type
  const getPlatformsForContent = (): string[] => {
    if (platform) {
      // Show the matching platform first, then others
      const platformKey = platform.toLowerCase();
      const others = Object.keys(PLATFORMS).filter((p) => p !== platformKey);
      return PLATFORMS[platformKey] ? [platformKey, ...others] : others;
    }
    return Object.keys(PLATFORMS);
  };

  const platforms = getPlatformsForContent();
  const visiblePlatforms = showAll ? platforms : platforms.slice(0, 4);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          copied
            ? 'bg-success text-white'
            : 'bg-bg-secondary border border-border text-text-primary hover:bg-bg-tertiary'
        }`}
      >
        {copied ? '✓ Copied!' : '📋 Copy'}
      </button>

      {/* Platform share buttons */}
      {visiblePlatforms.map((platformKey) => {
        const config = PLATFORMS[platformKey];
        if (!config) return null;

        return (
          <button
            key={platformKey}
            onClick={() => handleShare(platformKey)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white transition-all ${config.color} ${config.hoverColor}`}
            title={config.canShare ? `Share to ${config.name}` : `Copy for ${config.name}`}
          >
            <span>{config.icon}</span>
            <span className="hidden sm:inline">{config.name}</span>
          </button>
        );
      })}

      {/* Show more button */}
      {platforms.length > 4 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="px-3 py-1.5 rounded-full text-sm font-medium bg-bg-secondary border border-border text-text-secondary hover:text-text-primary transition-colors"
        >
          +{platforms.length - 4} more
        </button>
      )}

      {/* Native share (mobile) */}
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors sm:hidden"
        >
          📤 Share
        </button>
      )}
    </div>
  );
}

/**
 * Compact share dropdown for inline use
 */
export function ShareDropdown({
  content,
  platform,
  url,
  className = '',
}: Omit<ShareButtonsProps, 'title' | 'onShare'>) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setIsOpen(false);
  };

  const handleShare = async (platformKey: string) => {
    const config = PLATFORMS[platformKey];
    if (!config) return;

    if (config.canShare && config.shareUrl) {
      if (config.copyBeforeShare) {
        await navigator.clipboard.writeText(content);
      }
      const shareUrl = config.shareUrl(content, url);
      window.open(shareUrl, '_blank', 'width=600,height=400');
    } else {
      handleCopy();
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
          copied
            ? 'bg-success text-white'
            : 'bg-accent text-white hover:bg-accent/90'
        }`}
      >
        {copied ? '✓ Copied!' : '📤 Share'}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 bg-bg-primary border border-border rounded-xl shadow-lg overflow-hidden min-w-[200px]">
            <div className="p-2">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-secondary transition-colors text-left"
              >
                <span>📋</span>
                <span>Copy to clipboard</span>
              </button>

              <div className="h-px bg-border my-2" />

              {Object.entries(PLATFORMS).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleShare(key)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-secondary transition-colors text-left"
                >
                  <span>{config.icon}</span>
                  <span>
                    {config.canShare ? 'Post to' : 'Copy for'} {config.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Export platform keys for type safety
export type SocialPlatform = keyof typeof PLATFORMS;

/**
 * Quick share button for a specific platform
 */
export function QuickShareButton({
  content,
  platformKey,
  url,
  className = '',
}: {
  content: string;
  platformKey: string;
  url?: string;
  className?: string;
}) {
  const config = PLATFORMS[platformKey as SocialPlatform];
  const [clicked, setClicked] = useState(false);

  if (!config) {
    // Fallback for unknown platforms - just show copy
    return (
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(content);
          setClicked(true);
          setTimeout(() => setClicked(false), 2000);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-bg-secondary border border-border text-text-primary hover:bg-bg-tertiary transition-all ${className}`}
      >
        <span>📋</span>
        <span>{clicked ? 'Copied!' : 'Copy'}</span>
      </button>
    );
  }

  const handleClick = async () => {
    if (config.canShare && config.shareUrl) {
      if (config.copyBeforeShare) {
        await navigator.clipboard.writeText(content);
      }
      const shareUrl = config.shareUrl(content, url);
      window.open(shareUrl, '_blank', 'width=600,height=400');
    } else {
      await navigator.clipboard.writeText(content);
    }
    setClicked(true);
    setTimeout(() => setClicked(false), 2000);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white transition-all ${config.color} ${config.hoverColor} ${className}`}
      title={config.canShare ? `Post to ${config.name}` : `Copy for ${config.name}`}
    >
      <span>{config.icon}</span>
      <span>{clicked ? 'Done!' : config.canShare ? 'Post' : 'Copy'}</span>
    </button>
  );
}
