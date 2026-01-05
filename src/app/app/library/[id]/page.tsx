'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ContentCards } from '@/components/content-cards';
import { useResultsFeedback } from '@/hooks/useResultsFeedback';
import { ShareDropdown, QuickShareButton } from '@/components/share-buttons';
import type {
  GenerationRequestDetail,
  VideoClipDetail,
  ContentKitDetail,
  Platform,
} from '@/types';

const PLATFORM_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  linkedin: { label: 'LinkedIn', icon: '💼', color: 'bg-blue-500/10 text-blue-600' },
  twitter: { label: 'Twitter/X', icon: '𝕏', color: 'bg-slate-500/10 text-slate-700' },
  instagram: { label: 'Instagram', icon: '📸', color: 'bg-pink-500/10 text-pink-600' },
  tiktok: { label: 'TikTok', icon: '🎵', color: 'bg-slate-800/10 text-slate-800' },
  blog: { label: 'Blog Post', icon: '📝', color: 'bg-emerald-500/10 text-emerald-600' },
  email: { label: 'Newsletter', icon: '✉️', color: 'bg-amber-500/10 text-amber-600' },
};

export default function LibraryDetail() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<GenerationRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sendFeedback, copyToClipboard } = useResultsFeedback();

  const requestId = params.id as string;

  useEffect(() => {
    if (requestId) {
      loadDetail();
    }
  }, [requestId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const response = await api.generation.getRequest(requestId);
      if (response.data) {
        setData(response.data);
      }
    } catch (err) {
      setError('Failed to load content details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (content: string) => {
    await copyToClipboard(content);
  };

  const handleFeedback = (contentId: string, liked: boolean) => {
    sendFeedback(contentId, liked);
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Transform content to match ContentCards expected format
  const transformedResults = data?.content?.map((item) => ({
    id: item.id,
    requestId: requestId,
    platform: item.platform as Platform,
    content: item.content,
    voiceScore: item.voiceScore ?? 0,
    qualityScore: item.qualityScore ?? 0,
    createdAt: new Date(item.createdAt || data.request.createdAt),
  })) || [];

  // Get content kit platform content for display
  const contentKitPlatforms = data?.contentKit ? [
    { platform: 'linkedin', content: data.contentKit.contentLinkedin },
    { platform: 'twitter', content: data.contentKit.contentTwitter },
    { platform: 'instagram', content: data.contentKit.contentInstagram },
    { platform: 'tiktok', content: data.contentKit.contentTiktok },
    { platform: 'blog', content: data.contentKit.contentBlog },
    { platform: 'email', content: data.contentKit.contentEmail },
  ].filter(p => p.content) : [];

  const hasClips = data?.clips && data.clips.length > 0;
  const hasContentKitContent = contentKitPlatforms.length > 0;
  const hasGeneratedContent = transformedResults.length > 0;

  // Determine title
  const getTitle = () => {
    if (data?.contentKit?.title) return data.contentKit.title;
    if (data?.request?.inputText) {
      const text = data.request.inputText;
      // Clean up transcript-based titles
      if (text.startsWith('Create content based on this video transcript:')) {
        return 'Video Content Kit';
      }
      return text.length > 80 ? text.slice(0, 77) + '...' : text;
    }
    return 'Generated Content';
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Back Button */}
      <button
        onClick={() => router.push('/app/library')}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
      >
        <span>←</span>
        <span>Back to Library</span>
      </button>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <div className="animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-display text-3xl mb-2">{getTitle()}</h1>
            <p className="text-body text-text-secondary">
              Created {formatDate(data.request.createdAt)}
              {hasClips && ` • ${data.clips!.length} video clips`}
            </p>
          </div>

          {/* Video Clips Section */}
          {hasClips && (
            <div className="mb-12">
              <h2 className="text-display text-2xl mb-6">
                🎬 Video Clips <span className="text-text-secondary text-lg font-normal">({data.clips!.length} ready to share)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.clips!.map((clip, index) => (
                  <div
                    key={clip.id}
                    className="bg-bg-secondary rounded-xl border border-border overflow-hidden hover:border-accent/50 transition-colors"
                  >
                    {/* Clip Video Player */}
                    <div className="aspect-[9/16] bg-black relative">
                      {clip.exports && clip.exports[0]?.url ? (
                        <video
                          src={clip.exports[0].url}
                          poster={clip.thumbnailUrl}
                          controls
                          className="w-full h-full object-contain"
                          preload="metadata"
                        />
                      ) : clip.thumbnailUrl ? (
                        <img
                          src={clip.thumbnailUrl}
                          alt={clip.title || `Clip ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-accent/20 to-accent/5">
                          🎬
                        </div>
                      )}
                      {/* Virality score badge */}
                      {clip.viralityScore && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-accent to-accent/80 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
                          🔥 {clip.viralityScore}% viral
                        </div>
                      )}
                      {/* Duration badge */}
                      <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2.5 py-1 rounded-full font-mono">
                        {Math.floor(clip.duration / 60)}:{String(Math.floor(clip.duration % 60)).padStart(2, '0')}
                      </div>
                    </div>
                    {/* Clip Info */}
                    <div className="p-4">
                      <h4 className="font-semibold text-body mb-2 line-clamp-2">
                        {clip.title || `Clip ${index + 1}`}
                      </h4>
                      {clip.selectionReason && (
                        <p className="text-small text-text-secondary line-clamp-2 mb-3">
                          {clip.selectionReason}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-full font-medium">
                          {clip.format === 'portrait' ? '📱 Vertical' : clip.format === 'landscape' ? '🖥️ Horizontal' : '⬜ Square'}
                        </span>
                        {clip.hasCaptions && (
                          <span className="text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
                            CC ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Kit Platform Content */}
          {hasContentKitContent && (
            <div className="mb-12">
              <h2 className="text-display text-2xl mb-6">
                ✍️ Written Content <span className="text-text-secondary text-lg font-normal">(ready to post)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentKitPlatforms.map(({ platform, content }) => {
                  const config = PLATFORM_CONFIG[platform];
                  if (!config || !content) return null;
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
                          <ShareDropdown
                            content={content}
                            platform={platform}
                          />
                        </div>
                      </div>
                      {/* Content Preview */}
                      <div className="p-4">
                        <p className="text-small text-text-secondary line-clamp-6 whitespace-pre-wrap leading-relaxed">
                          {content}
                        </p>
                        {content.length > 200 && (
                          <button className="text-xs text-accent mt-2 hover:underline">
                            Show more...
                          </button>
                        )}
                      </div>
                      {/* Quick Post Button */}
                      <div className="px-4 pb-4 pt-2 border-t border-border/50">
                        <QuickShareButton
                          content={content}
                          platformKey={platform}
                          className="w-full justify-center"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regular Generated Content Cards (for non-clip-finder generations) */}
          {hasGeneratedContent && !hasContentKitContent && (
            <ContentCards
              results={transformedResults}
              onCopy={handleCopy}
              onFeedback={handleFeedback}
            />
          )}

          {/* No Content State */}
          {!hasClips && !hasContentKitContent && !hasGeneratedContent && (
            <div className="text-center py-12 bg-bg-secondary rounded-xl border border-border">
              <p className="text-text-secondary">No content available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
