'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  api,
  TrendingReel,
  TrendUserReel,
} from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

// Category badge colors
const CATEGORY_COLORS: Record<string, string> = {
  lifestyle: 'bg-purple-100 text-purple-700',
  real_estate: 'bg-blue-100 text-blue-700',
  business: 'bg-green-100 text-green-700',
  wellness: 'bg-pink-100 text-pink-700',
};

const STATUS_COLORS: Record<string, string> = {
  generating: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

type Tab = 'discover' | 'my-reels';

export default function TrendsContent() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Discover tab
  const [trends, setTrends] = useState<TrendingReel[]>([]);
  const [trendsPagination, setTrendsPagination] = useState({ total: 0, limit: 20, offset: 0 });
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // My Reels tab
  const [myReels, setMyReels] = useState<TrendUserReel[]>([]);
  const [reelsPagination, setReelsPagination] = useState({ total: 0, limit: 20, offset: 0 });

  // Generation modal
  const [selectedTrend, setSelectedTrend] = useState<TrendingReel | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    reel: TrendUserReel;
    caption: string;
    hashtags: string[];
  } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'discover') {
        const response = await api.trendDiscovery.list({
          category: categoryFilter || undefined,
          platform: platformFilter || undefined,
          limit: trendsPagination.limit,
          offset: trendsPagination.offset,
        });
        if (response.success) {
          setTrends(response.trends);
          setTrendsPagination(response.pagination);
        }
      } else {
        const response = await api.trendDiscovery.listReels({
          limit: reelsPagination.limit,
          offset: reelsPagination.offset,
        });
        if (response.success) {
          setMyReels(response.reels);
          setReelsPagination(response.pagination);
        }
      }
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, categoryFilter, platformFilter, trendsPagination.limit, trendsPagination.offset, reelsPagination.limit, reelsPagination.offset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefreshTrends = async () => {
    try {
      setRefreshing(true);
      await api.trendDiscovery.refresh();
      await loadData();
    } catch (err) {
      console.error('Failed to refresh trends:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateReel = async (brollAssetId?: string) => {
    if (!selectedTrend) return;

    try {
      setGenerating(true);
      setGenerateError(null);

      const response = await api.trendDiscovery.generateReel(selectedTrend.id, {
        brollAssetId,
      });

      if (response.success) {
        setGenerationResult({
          reel: response.reel,
          caption: response.caption,
          hashtags: response.hashtags,
        });
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      setGenerateError(axiosError.response?.data?.error || axiosError.message || 'Failed to generate reel');
    } finally {
      setGenerating(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const currentPage = activeTab === 'discover'
    ? Math.floor(trendsPagination.offset / trendsPagination.limit) + 1
    : Math.floor(reelsPagination.offset / reelsPagination.limit) + 1;

  const totalPages = activeTab === 'discover'
    ? Math.ceil(trendsPagination.total / trendsPagination.limit)
    : Math.ceil(reelsPagination.total / reelsPagination.limit);

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-display text-3xl mb-1">Trending Reels</h1>
          <p className="text-body text-text-secondary">
            Discover trending formats and generate ready-to-post reels in your voice
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleRefreshTrends}
            disabled={refreshing}
            className="btn-primary px-4 py-2 flex items-center gap-2 disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh Trends'
            )}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('discover')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'discover'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => setActiveTab('my-reels')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'my-reels'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          My Reels
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error">
          {error}
        </div>
      )}

      {/* ==================== DISCOVER TAB ==================== */}
      {activeTab === 'discover' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-bg-secondary rounded-lg">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setTrendsPagination(p => ({ ...p, offset: 0 }));
              }}
              className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-sm"
            >
              <option value="">All Categories</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="real_estate">Real Estate</option>
              <option value="business">Business</option>
              <option value="wellness">Wellness</option>
            </select>

            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setTrendsPagination(p => ({ ...p, offset: 0 }));
              }}
              className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-sm"
            >
              <option value="">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>

          {/* Trends Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : trends.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-6xl mb-4">🔥</div>
              <h2 className="text-display text-2xl mb-2">No trends found</h2>
              <p className="text-body text-text-secondary mb-6">
                {isAdmin ? 'Click "Refresh Trends" to discover current trending formats' : 'Check back soon for trending formats'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends.map(trend => {
                const isExpanded = expandedCards.has(trend.id);
                return (
                  <div key={trend.id} className="card transition-shadow hover:shadow-md">
                    {/* Category Badge */}
                    <div className="flex items-center justify-between mb-3">
                      {trend.category && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${CATEGORY_COLORS[trend.category] || 'bg-gray-100 text-gray-700'}`}>
                          {trend.category.replace('_', ' ')}
                        </span>
                      )}
                      <span className="text-xs text-text-secondary">{formatDate(trend.created_at)}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{trend.title}</h3>

                    {/* Audio Info */}
                    {trend.audio_name && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary mb-3">
                        <span>🎵</span>
                        <span className="line-clamp-1">
                          {trend.audio_name}
                          {trend.audio_artist && <span className="text-text-secondary"> - {trend.audio_artist}</span>}
                        </span>
                      </div>
                    )}

                    {/* Expandable Sections */}
                    <div className="space-y-2 mb-4">
                      {/* Use Case */}
                      {trend.use_case && (
                        <button
                          onClick={() => toggleExpanded(`${trend.id}-use`)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between text-sm font-medium text-text-secondary">
                            <span>How to Use</span>
                            <span className="text-xs">{expandedCards.has(`${trend.id}-use`) ? '▲' : '▼'}</span>
                          </div>
                          {expandedCards.has(`${trend.id}-use`) && (
                            <p className="mt-2 text-sm text-text-primary">{trend.use_case}</p>
                          )}
                        </button>
                      )}

                      {/* Script Template */}
                      {trend.script_template && (
                        <button
                          onClick={() => toggleExpanded(`${trend.id}-script`)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between text-sm font-medium text-text-secondary">
                            <span>Script & Instructions</span>
                            <span className="text-xs">{expandedCards.has(`${trend.id}-script`) ? '▲' : '▼'}</span>
                          </div>
                          {expandedCards.has(`${trend.id}-script`) && (
                            <pre className="mt-2 text-sm text-text-primary whitespace-pre-wrap font-mono bg-bg-secondary p-3 rounded-lg">
                              {trend.script_template}
                            </pre>
                          )}
                        </button>
                      )}

                      {/* Caption Template */}
                      {trend.caption_template && (
                        <button
                          onClick={() => toggleExpanded(`${trend.id}-caption`)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between text-sm font-medium text-text-secondary">
                            <span>Caption Template</span>
                            <span className="text-xs">{expandedCards.has(`${trend.id}-caption`) ? '▲' : '▼'}</span>
                          </div>
                          {expandedCards.has(`${trend.id}-caption`) && (
                            <div className="mt-2">
                              <p className="text-sm text-text-primary mb-2">{trend.caption_template}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(trend.caption_template!);
                                }}
                                className="text-xs text-accent hover:underline"
                              >
                                Copy caption
                              </button>
                            </div>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Hashtags */}
                    {trend.hashtags && trend.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {trend.hashtags.slice(0, 5).map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-bg-secondary rounded text-xs text-text-secondary">
                            #{tag.replace(/^#/, '')}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      onClick={() => {
                        setSelectedTrend(trend);
                        setGenerationResult(null);
                        setGenerateError(null);
                      }}
                      className="w-full btn-primary py-2.5 text-sm font-medium"
                    >
                      Make This Reel
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ==================== MY REELS TAB ==================== */}
      {activeTab === 'my-reels' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myReels.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-6xl mb-4">🎬</div>
              <h2 className="text-display text-2xl mb-2">No reels yet</h2>
              <p className="text-body text-text-secondary mb-6">
                Discover a trend and click &quot;Make This Reel&quot; to generate your first one
              </p>
              <button onClick={() => setActiveTab('discover')} className="btn-primary px-6 py-3">
                Discover Trends
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myReels.map(reel => (
                <div key={reel.id} className="card">
                  <div className="flex items-start gap-4">
                    {/* Video preview */}
                    {reel.output_url && reel.status === 'ready' ? (
                      <video
                        src={reel.output_url}
                        className="w-32 h-20 object-cover rounded-lg flex-shrink-0 bg-bg-secondary"
                        muted
                      />
                    ) : (
                      <div className="w-32 h-20 bg-bg-secondary rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
                        🎬
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium line-clamp-1">
                            {reel.trending_reels?.title || 'Trend Reel'}
                          </h3>
                          <p className="text-small text-text-secondary">
                            {formatDate(reel.created_at)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[reel.status] || 'bg-gray-100 text-gray-700'}`}>
                          {reel.status}
                        </span>
                      </div>

                      {/* Generated caption preview */}
                      {reel.generated_caption && (
                        <p className="text-small text-text-secondary line-clamp-2 mb-2">
                          {reel.generated_caption}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {reel.status === 'ready' && reel.output_url && (
                          <>
                            <a
                              href={reel.output_url}
                              download
                              className="px-3 py-1.5 bg-accent text-white text-small rounded-lg hover:bg-accent/90"
                            >
                              Download
                            </a>
                            {reel.generated_caption && (
                              <button
                                onClick={() => copyToClipboard(reel.generated_caption!)}
                                className="px-3 py-1.5 text-accent text-small hover:bg-accent/10 rounded-lg"
                              >
                                Copy Caption
                              </button>
                            )}
                          </>
                        )}
                        {reel.status === 'generating' && (
                          <span className="flex items-center gap-2 text-small text-text-secondary">
                            <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            Generating your reel...
                          </span>
                        )}
                        {reel.status === 'failed' && (
                          <span className="text-small text-error">
                            {reel.error_message || 'Generation failed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => {
              if (activeTab === 'discover') {
                setTrendsPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }));
              } else {
                setReelsPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }));
              }
            }}
            disabled={currentPage <= 1}
            className="px-3 py-2 border border-border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => {
              if (activeTab === 'discover') {
                setTrendsPagination(p => ({ ...p, offset: p.offset + p.limit }));
              } else {
                setReelsPagination(p => ({ ...p, offset: p.offset + p.limit }));
              }
            }}
            disabled={currentPage >= totalPages}
            className="px-3 py-2 border border-border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* ==================== GENERATION MODAL ==================== */}
      {selectedTrend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && !generating && setSelectedTrend(null)}
        >
          <div className="bg-bg-primary rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Make This Reel</h2>
              <button
                onClick={() => setSelectedTrend(null)}
                disabled={generating}
                className="p-2 hover:bg-bg-secondary rounded-lg disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Trend preview */}
              <div>
                {selectedTrend.category && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${CATEGORY_COLORS[selectedTrend.category] || 'bg-gray-100 text-gray-700'}`}>
                    {selectedTrend.category.replace('_', ' ')}
                  </span>
                )}
                <h3 className="font-semibold text-lg mt-2">{selectedTrend.title}</h3>
                {selectedTrend.audio_name && (
                  <p className="text-sm text-text-secondary mt-1">
                    🎵 {selectedTrend.audio_name}
                    {selectedTrend.audio_artist && ` - ${selectedTrend.audio_artist}`}
                  </p>
                )}
              </div>

              {/* Script preview */}
              {selectedTrend.script_template && (
                <div>
                  <p className="text-sm font-medium mb-2">Script</p>
                  <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono bg-bg-secondary p-3 rounded-lg max-h-40 overflow-y-auto">
                    {selectedTrend.script_template}
                  </pre>
                </div>
              )}

              {/* Generation result */}
              {generationResult && (
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <span className="text-lg">✓</span>
                    <span className="font-medium">Reel is being generated!</span>
                  </div>

                  <p className="text-sm text-text-secondary">
                    Your reel is rendering in the background. Check the &quot;My Reels&quot; tab for progress.
                  </p>

                  {generationResult.caption && (
                    <div>
                      <p className="text-sm font-medium mb-1">Caption</p>
                      <p className="text-sm text-text-secondary">{generationResult.caption}</p>
                      <button
                        onClick={() => copyToClipboard(generationResult.caption)}
                        className="text-xs text-accent hover:underline mt-1"
                      >
                        Copy caption
                      </button>
                    </div>
                  )}

                  {generationResult.hashtags.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Hashtags</p>
                      <div className="flex flex-wrap gap-1">
                        {generationResult.hashtags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-bg-secondary rounded text-xs">
                            #{tag.replace(/^#/, '')}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => copyToClipboard(generationResult.hashtags.map(t => `#${t.replace(/^#/, '')}`).join(' '))}
                        className="text-xs text-accent hover:underline mt-1"
                      >
                        Copy hashtags
                      </button>
                    </div>
                  )}
                </div>
              )}

              {generateError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-small">
                  {generateError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-border">
              {generationResult ? (
                <>
                  <button
                    onClick={() => {
                      setSelectedTrend(null);
                      setActiveTab('my-reels');
                      loadData();
                    }}
                    className="flex-1 btn-primary py-3"
                  >
                    View My Reels
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedTrend(null)}
                    disabled={generating}
                    className="flex-1 btn-secondary py-3 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleGenerateReel()}
                    disabled={generating}
                    className="flex-1 btn-primary py-3 disabled:opacity-50"
                  >
                    {generating ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      'Generate Reel'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
