'use client';

/**
 * Unified Content Kit Detail Page
 *
 * Displays full content kit details including video clips,
 * written content, carousels, and share options.
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useContentKitDetail } from '@/hooks/useContentKit';
import { VideoPlayer } from '@/components/content-kit';
import { ShareDropdown, QuickShareButton } from '@/components/share-buttons';
import { PLATFORM_CONFIG, CONTENT_TYPE_CONFIG, formatDuration } from '@/lib/content-kit-utils';

export default function ContentKitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { item, detail, loading, error, refresh } = useContentKitDetail({ id });
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (content: string, contentId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(contentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get platform content from content kit or generated_content table
  const getPlatformContent = () => {
    const results: { platform: string; content: string }[] = [];

    // First try contentKit (unified content_kits table)
    if (detail?.contentKit) {
      const kit = detail.contentKit;
      const kitContent = [
        { platform: 'linkedin', content: kit.contentLinkedin },
        { platform: 'twitter', content: kit.contentTwitter },
        { platform: 'instagram', content: kit.contentInstagram },
        { platform: 'tiktok', content: kit.contentTiktok },
        { platform: 'blog', content: kit.contentBlog },
        { platform: 'email', content: kit.contentEmail },
        { platform: 'youtube', content: kit.contentYoutube },
        { platform: 'video-script', content: kit.contentVideoScript },
      ].filter(p => p.content);
      results.push(...kitContent as { platform: string; content: string }[]);
    }

    // Fall back to content array (generated_content table)
    if (results.length === 0 && detail?.content && detail.content.length > 0) {
      for (const item of detail.content) {
        if (item.content && item.platform) {
          results.push({
            platform: item.platform,
            content: item.content,
          });
        }
      }
    }

    return results;
  };

  const platformContent = getPlatformContent();
  const hasClips = detail?.clips && detail.clips.length > 0;
  const hasWrittenContent = platformContent.length > 0;
  const hasCarousel = detail?.carousel?.slides && detail.carousel.slides.length > 0;
  const isProcessing = item?.status === 'processing' || item?.status === 'pending';
  const typeConfig = item ? CONTENT_TYPE_CONFIG[item.type] : null;

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Back Button */}
      <Link
        href="/app/content-kit"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
      >
        <span>←</span>
        <span>Back to Content Kit</span>
      </Link>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary">Loading content...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center">
          {error}
          <button onClick={refresh} className="ml-4 underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && item && (
        <div className="animate-fade-in space-y-8">
          {/* Header */}
          <div className="bg-bg-secondary rounded-xl border border-border p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                {/* Type Badge */}
                {typeConfig && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mb-3 ${typeConfig.color}`}>
                    <span>{typeConfig.icon}</span>
                    <span>{typeConfig.label}</span>
                  </div>
                )}
                <h1 className="text-display text-3xl mb-2">{item.title}</h1>
                <div className="flex items-center gap-4 text-text-secondary text-sm flex-wrap">
                  <span>Created {formatDate(item.createdAt)}</span>
                  {hasClips && (
                    <>
                      <span>•</span>
                      <span className="text-accent font-medium">
                        🎬 {detail.clips.length} clip{detail.clips.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                  {hasWrittenContent && (
                    <>
                      <span>•</span>
                      <span className="text-accent font-medium">
                        ✍️ {platformContent.length} platform{platformContent.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                  {hasCarousel && (
                    <>
                      <span>•</span>
                      <span className="text-accent font-medium">
                        📸 {detail.carousel.slides.length} slides
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-accent bg-bg-tertiary rounded-lg transition-colors"
              >
                <span className={loading ? 'animate-spin' : ''}>↻</span>
                <span>Refresh</span>
              </button>
            </div>

            {/* Processing State */}
            {isProcessing && (
              <div className="mt-6 bg-accent/5 border border-accent/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">
                      {item.statusMessage || 'Processing your content...'}
                    </p>
                    {item.progressPercent !== undefined && (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-sm text-accent font-medium">
                          {item.progressPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Clips Section */}
          {hasClips && (
            <section>
              <h2 className="text-display text-2xl mb-6 flex items-center gap-3">
                <span>🎬</span>
                <span>Video Clips</span>
                <span className="text-text-secondary text-lg font-normal">
                  ({detail.clips.length} ready to share)
                </span>
              </h2>

              {/* Featured Clip Player */}
              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
                  {detail.clips[activeClipIndex] && (
                    <>
                      <VideoPlayer
                        src={detail.clips[activeClipIndex].exports?.[0]?.url || ''}
                        poster={detail.clips[activeClipIndex].thumbnailUrl}
                        aspectRatio="9:16"
                        viralityScore={detail.clips[activeClipIndex].viralityScore}
                        duration={detail.clips[activeClipIndex].duration}
                        title={detail.clips[activeClipIndex].title}
                        className="max-h-[500px]"
                      />
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {detail.clips[activeClipIndex].title || `Clip ${activeClipIndex + 1}`}
                        </h3>
                        {detail.clips[activeClipIndex].selectionReason && (
                          <p className="text-text-secondary text-sm mb-3">
                            {detail.clips[activeClipIndex].selectionReason}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium">
                            {detail.clips[activeClipIndex].format === 'portrait' ? '📱 Vertical' :
                             detail.clips[activeClipIndex].format === 'landscape' ? '🖥️ Horizontal' : '⬜ Square'}
                          </span>
                          {detail.clips[activeClipIndex].hasCaptions && (
                            <span className="text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
                              CC ✓
                            </span>
                          )}
                          {detail.clips[activeClipIndex].exports?.[0]?.url && (
                            <a
                              href={detail.clips[activeClipIndex].exports[0].url}
                              download
                              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-full text-sm font-medium hover:bg-accent/90 transition-colors"
                            >
                              ⬇️ Download
                            </a>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Clip Thumbnails */}
                {detail.clips.length > 1 && (
                  <div className="space-y-3">
                    <p className="text-sm text-text-secondary font-medium">Select a clip</p>
                    <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                      {detail.clips.map((clip, index) => (
                        <button
                          key={clip.id}
                          onClick={() => setActiveClipIndex(index)}
                          className={`
                            relative rounded-lg overflow-hidden border-2 transition-all
                            ${index === activeClipIndex
                              ? 'border-accent ring-2 ring-accent/20'
                              : 'border-border hover:border-accent/50'}
                          `}
                        >
                          <div className="aspect-video bg-bg-tertiary">
                            {clip.thumbnailUrl ? (
                              <img
                                src={clip.thumbnailUrl}
                                alt={clip.title || `Clip ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">
                                🎬
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                            {formatDuration(clip.duration)}
                          </div>
                          {clip.viralityScore && (
                            <div className="absolute top-1 left-1 bg-gradient-to-r from-accent to-accent/80 text-white text-xs px-1.5 py-0.5 rounded-full">
                              🔥 {clip.viralityScore}%
                            </div>
                          )}
                          {index === activeClipIndex && (
                            <div className="absolute inset-0 bg-accent/10 flex items-center justify-center">
                              <span className="text-2xl">▶️</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Written Content Section */}
          {hasWrittenContent && (
            <section>
              <h2 className="text-display text-2xl mb-6 flex items-center gap-3">
                <span>✍️</span>
                <span>Written Content</span>
                <span className="text-text-secondary text-lg font-normal">
                  (ready to post)
                </span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platformContent.map(({ platform, content }) => {
                  const config = PLATFORM_CONFIG[platform];
                  if (!config || !content) return null;
                  const isExpanded = expandedPlatform === platform;
                  const contentId = `${platform}-${item.id}`;

                  return (
                    <div
                      key={platform}
                      className="bg-bg-secondary rounded-xl border border-border overflow-hidden hover:border-accent/50 transition-colors group"
                    >
                      {/* Platform Header */}
                      <div className={`px-4 py-3 ${config.color} border-b border-border/50`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{config.icon}</span>
                            <h4 className="font-semibold">{config.label}</h4>
                          </div>
                          <ShareDropdown content={content} platform={platform} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <p className={`text-small text-text-secondary whitespace-pre-wrap leading-relaxed ${isExpanded ? '' : 'line-clamp-6'}`}>
                          {content}
                        </p>
                        {content.length > 250 && (
                          <button
                            onClick={() => setExpandedPlatform(isExpanded ? null : platform)}
                            className="text-xs text-accent mt-2 hover:underline"
                          >
                            {isExpanded ? 'Show less' : 'Show more...'}
                          </button>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="px-4 pb-4 pt-2 border-t border-border/50 flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(content, contentId)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                            copiedId === contentId
                              ? 'bg-success/10 text-success'
                              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/80'
                          }`}
                        >
                          {copiedId === contentId ? '✓ Copied!' : '📋 Copy'}
                        </button>
                        <QuickShareButton
                          content={content}
                          platformKey={platform}
                          className="flex-1 justify-center"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Instagram Carousel Section */}
          {hasCarousel && (
            <section>
              <h2 className="text-display text-2xl mb-6 flex items-center gap-3">
                <span>📸</span>
                <span>Instagram Carousel</span>
                <span className="text-text-secondary text-lg font-normal">
                  ({detail.carousel.slides.length} slides)
                </span>
              </h2>

              <div className="bg-bg-secondary rounded-xl border border-border p-6">
                {/* Carousel Preview */}
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
                  {detail.carousel.slides.map((slide: any, index: number) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-72 snap-center"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-bg-tertiary border border-border/50 relative group">
                        <img
                          src={slide.publicUrl}
                          alt={`Slide ${slide.slideNumber}: ${slide.text?.slice(0, 30)}...`}
                          className="w-full h-full object-cover"
                        />
                        {/* Slide type badge */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full capitalize">
                          {slide.slideType}
                        </div>
                        {/* Slide number */}
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                          {slide.slideNumber}/{detail.carousel.slides.length}
                        </div>
                        {/* Download hover button */}
                        <a
                          href={slide.publicUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium">
                            ⬇️ Download
                          </span>
                        </a>
                      </div>
                      {/* Slide text preview */}
                      <p className="mt-2 text-xs text-text-secondary line-clamp-2">
                        {slide.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Carousel Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">
                      {detail.carousel.slides.length} slides
                    </span>
                    {detail.carousel.backgroundType && (
                      <span> • {detail.carousel.backgroundType} background</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        // Download all slides
                        for (const slide of detail.carousel.slides) {
                          const link = document.createElement('a');
                          link.href = slide.publicUrl;
                          link.download = `slide-${slide.slideNumber}.png`;
                          link.click();
                          await new Promise(r => setTimeout(r, 500));
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors"
                    >
                      ⬇️ Download All
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Empty State */}
          {!hasClips && !hasWrittenContent && !hasCarousel && !isProcessing && (
            <div className="text-center py-16 bg-bg-secondary rounded-xl border border-border">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold mb-2">No content available</h3>
              <p className="text-text-secondary mb-6">
                This content kit doesn&apos;t have any content yet.
              </p>
              <Link href="/app" className="btn-primary">
                Create New Content
              </Link>
            </div>
          )}

          {/* Quick Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <Link
              href="/app/content-kit"
              className="text-text-secondary hover:text-accent transition-colors"
            >
              ← Back to Content Kit
            </Link>
            <Link
              href="/app"
              className="btn-primary"
            >
              ✨ Create New
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
