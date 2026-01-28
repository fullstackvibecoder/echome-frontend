'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  api,
  Trend,
  TrendWithAnalysis,
  TrendCopyWithTrend,
  TrendPlatform,
  TrendLifecycleStatus,
  TrendShotListItem,
  TrendCreativeBrief,
} from '@/lib/api-client';
import { Platform } from '@/types';

// Platform options for filtering
const PLATFORM_OPTIONS: { value: TrendPlatform | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All Platforms', icon: '🌐' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'instagram', label: 'Instagram Reels', icon: '📷' },
  { value: 'youtube_shorts', label: 'YouTube Shorts', icon: '▶️' },
];

// Lifecycle status options
const LIFECYCLE_OPTIONS: { value: TrendLifecycleStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: '' },
  { value: 'emerging', label: 'Emerging', color: 'bg-green-100 text-green-700' },
  { value: 'peaking', label: 'Peaking', color: 'bg-orange-100 text-orange-700' },
  { value: 'declining', label: 'Declining', color: 'bg-yellow-100 text-yellow-700' },
];

// Content platforms for generation
const GENERATION_PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'video-script', label: 'Video Script', icon: '🎬' },
];

type Tab = 'discover' | 'my-copies';

export default function TrendsContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Discover tab state
  const [trends, setTrends] = useState<Trend[]>([]);
  const [niches, setNiches] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Filters
  const [platformFilter, setPlatformFilter] = useState<TrendPlatform | 'all'>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<TrendLifecycleStatus | 'all'>('all');
  const [nicheFilter, setNicheFilter] = useState<string>('');
  const [curatedOnly, setCuratedOnly] = useState(false);

  // My copies state
  const [myCopies, setMyCopies] = useState<TrendCopyWithTrend[]>([]);
  const [copiesPagination, setCopiesPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Submit modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitUrl, setSubmitUrl] = useState('');
  const [submitPlatform, setSubmitPlatform] = useState<TrendPlatform>('tiktok');
  const [submitNiche, setSubmitNiche] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Trend detail modal state
  const [selectedTrend, setSelectedTrend] = useState<TrendWithAnalysis | null>(null);
  const [selectedBrief, setSelectedBrief] = useState<TrendCreativeBrief | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // Copy creation state
  const [creatingCopy, setCreatingCopy] = useState(false);
  const [copyNiche, setCopyNiche] = useState('');
  const [copyNotes, setCopyNotes] = useState('');

  // Generation modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedCopy, setSelectedCopy] = useState<TrendCopyWithTrend | null>(null);
  const [generatePlatforms, setGeneratePlatforms] = useState<Platform[]>(['instagram', 'linkedin']);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, platformFilter, lifecycleFilter, nicheFilter, curatedOnly, pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'discover') {
        // Load trends
        const [trendsResponse, nichesResponse] = await Promise.all([
          api.trends.list({
            page: pagination.page,
            limit: pagination.limit,
            platform: platformFilter !== 'all' ? platformFilter : undefined,
            lifecycle: lifecycleFilter !== 'all' ? lifecycleFilter : undefined,
            niche: nicheFilter || undefined,
            curated: curatedOnly || undefined,
          }),
          niches.length === 0 ? api.trends.getNiches() : Promise.resolve({ success: true, niches }),
        ]);

        if (trendsResponse.success) {
          setTrends(trendsResponse.trends);
          setPagination(trendsResponse.pagination);
        }

        if (nichesResponse.success) {
          setNiches(nichesResponse.niches);
        }
      } else {
        // Load my copies
        const response = await api.trends.getCopies({
          page: copiesPagination.page,
          limit: copiesPagination.limit,
        });

        if (response.success) {
          setMyCopies(response.copies);
          setCopiesPagination(response.pagination);
        }
      }
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTrend = async () => {
    if (!submitUrl.trim()) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const response = await api.trends.submit({
        source_url: submitUrl.trim(),
        source_platform: submitPlatform,
        niche: submitNiche || undefined,
      });

      if (response.success) {
        setShowSubmitModal(false);
        setSubmitUrl('');
        setSubmitNiche('');
        // Refresh trends list
        loadData();
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      setSubmitError(axiosError.response?.data?.error || axiosError.message || 'Failed to submit trend');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewTrend = async (trendId: string) => {
    try {
      setLoadingTrend(true);

      const [trendResponse, briefResponse] = await Promise.all([
        api.trends.get(trendId),
        api.trends.getBrief(trendId).catch(() => ({ success: false, brief: null })),
      ]);

      if (trendResponse.success) {
        setSelectedTrend(trendResponse.trend);
        if (briefResponse.success && briefResponse.brief) {
          setSelectedBrief(briefResponse.brief);
        } else {
          setSelectedBrief(null);
        }
      }
    } catch (err) {
      console.error('Failed to load trend details:', err);
    } finally {
      setLoadingTrend(false);
    }
  };

  const handleCreateCopy = async () => {
    if (!selectedTrend) return;

    try {
      setCreatingCopy(true);

      const response = await api.trends.createCopy(selectedTrend.id, {
        selected_niche: copyNiche || undefined,
        user_notes: copyNotes || undefined,
      });

      if (response.success) {
        // Close modal and switch to my copies
        setSelectedTrend(null);
        setCopyNiche('');
        setCopyNotes('');
        setActiveTab('my-copies');
        loadData();
      }
    } catch (err) {
      console.error('Failed to create copy:', err);
    } finally {
      setCreatingCopy(false);
    }
  };

  const handleDeleteCopy = async (copyId: string) => {
    if (!confirm('Are you sure you want to delete this copy?')) return;

    try {
      await api.trends.deleteCopy(copyId);
      setMyCopies(myCopies.filter(c => c.id !== copyId));
    } catch (err) {
      console.error('Failed to delete copy:', err);
    }
  };

  const openGenerateModal = (copy: TrendCopyWithTrend) => {
    setSelectedCopy(copy);
    setShowGenerateModal(true);
    setGenerateError(null);
  };

  const handleGenerate = async () => {
    if (!selectedCopy || generatePlatforms.length === 0) return;

    try {
      setGenerating(true);
      setGenerateError(null);

      const response = await api.trends.generate(selectedCopy.id, {
        platforms: generatePlatforms,
      });

      if (response.success) {
        setShowGenerateModal(false);
        // Navigate to content kit to see generation
        router.push(`/app/content-kit/${response.requestId}`);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      setGenerateError(axiosError.response?.data?.error || 'Failed to start generation');
    } finally {
      setGenerating(false);
    }
  };

  const toggleGeneratePlatform = (platform: Platform) => {
    setGeneratePlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLifecycleColor = (status: TrendLifecycleStatus) => {
    const option = LIFECYCLE_OPTIONS.find(o => o.value === status);
    return option?.color || '';
  };

  const getPlatformIcon = (platform: TrendPlatform) => {
    switch (platform) {
      case 'tiktok': return '🎵';
      case 'instagram': return '📷';
      case 'youtube_shorts': return '▶️';
      default: return '🎬';
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-display text-3xl mb-1">Trend Hunter</h1>
          <p className="text-body text-text-secondary">
            Discover trending formats and recreate them in your style
          </p>
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="btn-primary px-4 py-2 flex items-center gap-2"
        >
          <span>+</span> Submit Trend
        </button>
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
          Discover Trends
        </button>
        <button
          onClick={() => setActiveTab('my-copies')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'my-copies'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          My Copies ({myCopies.length})
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error">
          {error}
        </div>
      )}

      {activeTab === 'discover' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-bg-secondary rounded-lg">
            {/* Platform filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as TrendPlatform | 'all')}
              className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-sm"
            >
              {PLATFORM_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
              ))}
            </select>

            {/* Lifecycle filter */}
            <select
              value={lifecycleFilter}
              onChange={(e) => setLifecycleFilter(e.target.value as TrendLifecycleStatus | 'all')}
              className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-sm"
            >
              {LIFECYCLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Niche filter */}
            <select
              value={nicheFilter}
              onChange={(e) => setNicheFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-bg-primary text-sm"
            >
              <option value="">All Niches</option>
              {niches.map(niche => (
                <option key={niche} value={niche}>{niche}</option>
              ))}
            </select>

            {/* Curated toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={curatedOnly}
                onChange={(e) => setCuratedOnly(e.target.checked)}
                className="w-4 h-4 text-accent rounded border-border"
              />
              Curated only
            </label>
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
                Try adjusting your filters or submit a new trend
              </p>
              <button onClick={() => setShowSubmitModal(true)} className="btn-primary px-6 py-3">
                Submit Your First Trend
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends.map(trend => (
                <div
                  key={trend.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewTrend(trend.id)}
                >
                  {/* Thumbnail */}
                  {trend.thumbnail_url && (
                    <div className="relative aspect-video mb-3 rounded-lg overflow-hidden bg-bg-secondary">
                      <img
                        src={trend.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {trend.duration_seconds && (
                        <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                          {Math.floor(trend.duration_seconds / 60)}:{(trend.duration_seconds % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium line-clamp-2 flex-1">{trend.title || 'Untitled'}</h3>
                    {trend.is_curated && (
                      <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded">Curated</span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 text-small text-text-secondary mb-2">
                    <span>{getPlatformIcon(trend.source_platform)} {trend.source_platform.replace('_', ' ')}</span>
                    <span>-</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getLifecycleColor(trend.lifecycle_status)}`}>
                      {trend.lifecycle_status}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-small text-text-secondary">
                    {trend.view_count && <span>{(trend.view_count / 1000).toFixed(0)}K views</span>}
                    {trend.like_count && <span>{(trend.like_count / 1000).toFixed(0)}K likes</span>}
                  </div>

                  {/* Tags */}
                  {trend.tags && trend.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {trend.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-bg-secondary rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="px-3 py-2 border border-border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-text-secondary">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 border border-border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'my-copies' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myCopies.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-display text-2xl mb-2">No trend copies yet</h2>
              <p className="text-body text-text-secondary mb-6">
                Browse trends and click &quot;Copy This Trend&quot; to start recreating
              </p>
              <button onClick={() => setActiveTab('discover')} className="btn-primary px-6 py-3">
                Discover Trends
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myCopies.map(copy => (
                <div key={copy.id} className="card">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    {copy.trend?.thumbnail_url && (
                      <img
                        src={copy.trend.thumbnail_url}
                        alt=""
                        className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Title + Status */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium line-clamp-1">{copy.trend?.title || 'Untitled Trend'}</h3>
                          <p className="text-small text-text-secondary">
                            {copy.trend?.source_platform} - {formatDate(copy.created_at)}
                          </p>
                        </div>

                        <span className={`px-2 py-1 rounded text-xs ${
                          copy.generation_status === 'completed' ? 'bg-green-100 text-green-700' :
                          copy.generation_status === 'generating' ? 'bg-blue-100 text-blue-700' :
                          copy.generation_status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {copy.generation_status}
                        </span>
                      </div>

                      {/* Niche + Notes */}
                      {copy.selected_niche && (
                        <p className="text-small text-text-secondary mb-1">
                          Niche: {copy.selected_niche}
                        </p>
                      )}
                      {copy.user_notes && (
                        <p className="text-small text-text-secondary line-clamp-1 mb-2">
                          {copy.user_notes}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {copy.generation_status === 'draft' && (
                          <button
                            onClick={() => openGenerateModal(copy)}
                            className="px-3 py-1.5 bg-accent text-white text-small rounded-lg hover:bg-accent/90"
                          >
                            Generate Content
                          </button>
                        )}
                        {copy.generation_status === 'completed' && copy.generation_request_id && (
                          <button
                            onClick={() => router.push(`/app/content-kit/${copy.generation_request_id}`)}
                            className="px-3 py-1.5 bg-accent text-white text-small rounded-lg hover:bg-accent/90"
                          >
                            View Content
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCopy(copy.id)}
                          className="px-3 py-1.5 text-error text-small hover:bg-error/10 rounded-lg"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Submit Trend Modal */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && setShowSubmitModal(false)}
        >
          <div className="bg-bg-primary rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Submit a Trend</h2>
              <button onClick={() => setShowSubmitModal(false)} className="p-2 hover:bg-bg-secondary rounded-lg">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-body font-medium mb-3">Platform</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['tiktok', 'instagram', 'youtube_shorts'] as TrendPlatform[]).map(platform => (
                    <button
                      key={platform}
                      onClick={() => setSubmitPlatform(platform)}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                        submitPlatform === platform ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <span className="text-xl">{getPlatformIcon(platform)}</span>
                      <span className="text-small">{platform.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-body font-medium mb-2">Video URL</label>
                <input
                  type="url"
                  value={submitUrl}
                  onChange={(e) => setSubmitUrl(e.target.value)}
                  placeholder="https://tiktok.com/@user/video/..."
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-body font-medium mb-2">Niche (optional)</label>
                <input
                  type="text"
                  value={submitNiche}
                  onChange={(e) => setSubmitNiche(e.target.value)}
                  placeholder="e.g., fitness, cooking, tech..."
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              {submitError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-small">
                  {submitError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-border">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 btn-secondary py-3">
                Cancel
              </button>
              <button
                onClick={handleSubmitTrend}
                disabled={!submitUrl.trim() || submitting}
                className="flex-1 btn-primary py-3 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Trend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trend Detail Modal */}
      {(selectedTrend || loadingTrend) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && !loadingTrend && setSelectedTrend(null)}
        >
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            {loadingTrend ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedTrend && (
              <>
                <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
                  <h2 className="text-xl font-semibold">Trend Details</h2>
                  <button onClick={() => setSelectedTrend(null)} className="p-2 hover:bg-muted rounded-lg">
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Video Preview */}
                  {selectedTrend.thumbnail_url && (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={selectedTrend.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <a
                        href={selectedTrend.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <span className="px-4 py-2 bg-white text-black rounded-lg font-medium">
                          Watch Original
                        </span>
                      </a>
                    </div>
                  )}

                  {/* Info */}
                  <div>
                    <h3 className="text-lg font-medium mb-2">{selectedTrend.title || 'Untitled'}</h3>
                    <div className="flex items-center gap-3 text-small text-muted-foreground">
                      <span>{selectedTrend.source_platform.replace('_', ' ')}</span>
                      <span className={`px-2 py-0.5 rounded ${getLifecycleColor(selectedTrend.lifecycle_status)}`}>
                        {selectedTrend.lifecycle_status}
                      </span>
                      {selectedTrend.view_count && <span>{(selectedTrend.view_count / 1000).toFixed(0)}K views</span>}
                    </div>
                  </div>

                  {/* Analysis */}
                  {selectedTrend.analysis && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Analysis</h4>

                      <div className="grid grid-cols-2 gap-4">
                        {selectedTrend.analysis.hook_type && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-small text-muted-foreground">Hook Type</p>
                            <p className="font-medium">{selectedTrend.analysis.hook_type}</p>
                          </div>
                        )}
                        {selectedTrend.analysis.visual_style && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-small text-muted-foreground">Visual Style</p>
                            <p className="font-medium">{selectedTrend.analysis.visual_style.replace('_', ' ')}</p>
                          </div>
                        )}
                        {selectedTrend.analysis.pacing && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-small text-muted-foreground">Pacing</p>
                            <p className="font-medium">{selectedTrend.analysis.pacing}</p>
                          </div>
                        )}
                        {selectedTrend.analysis.audio_type && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-small text-muted-foreground">Audio</p>
                            <p className="font-medium">{selectedTrend.analysis.audio_type}</p>
                          </div>
                        )}
                      </div>

                      {selectedTrend.analysis.why_it_works && (
                        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
                          <p className="text-small font-medium mb-1">Why It Works</p>
                          <p className="text-small">{selectedTrend.analysis.why_it_works}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Brief */}
                  {selectedBrief && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Creative Brief</h4>

                      {selectedBrief.script_template && (
                        <div>
                          <p className="text-small text-muted-foreground mb-2">Script Template</p>
                          <div className="p-3 bg-muted rounded-lg">
                            <pre className="text-small whitespace-pre-wrap font-mono">{selectedBrief.script_template}</pre>
                          </div>
                        </div>
                      )}

                      {selectedBrief.shot_list && selectedBrief.shot_list.length > 0 && (
                        <div>
                          <p className="text-small text-muted-foreground mb-2">Shot List</p>
                          <div className="space-y-2">
                            {selectedBrief.shot_list.map((shot, i) => (
                              <div key={i} className="p-3 bg-muted rounded-lg flex items-start gap-3">
                                <span className="text-small text-muted-foreground whitespace-nowrap">
                                  {shot.start_seconds}s - {shot.end_seconds}s
                                </span>
                                <p className="text-small">{shot.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Copy This Trend */}
                  <div className="p-4 bg-accent/10 rounded-lg space-y-4">
                    <h4 className="font-medium">Copy This Trend</h4>

                    <div>
                      <label className="block text-small mb-2">Your Niche (optional)</label>
                      <input
                        type="text"
                        value={copyNiche}
                        onChange={(e) => setCopyNiche(e.target.value)}
                        placeholder="e.g., fitness, cooking, tech..."
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>

                    <div>
                      <label className="block text-small mb-2">Notes (optional)</label>
                      <textarea
                        value={copyNotes}
                        onChange={(e) => setCopyNotes(e.target.value)}
                        placeholder="Any specific ideas or customizations..."
                        rows={2}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none"
                      />
                    </div>

                    <button
                      onClick={handleCreateCopy}
                      disabled={creatingCopy}
                      className="w-full btn-primary py-3 disabled:opacity-50"
                    >
                      {creatingCopy ? 'Creating Copy...' : 'Copy This Trend'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && selectedCopy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && !generating && setShowGenerateModal(false)}
        >
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Generate Content</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
                className="p-2 hover:bg-muted rounded-lg disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block font-medium mb-3">Select Platforms</label>
                <div className="grid grid-cols-2 gap-3">
                  {GENERATION_PLATFORMS.map(platform => (
                    <button
                      key={platform.id}
                      onClick={() => toggleGeneratePlatform(platform.id)}
                      disabled={generating}
                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        generatePlatforms.includes(platform.id)
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      } disabled:opacity-50`}
                    >
                      <span className="text-lg">{platform.icon}</span>
                      <span className="text-small font-medium">{platform.label}</span>
                      {generatePlatforms.includes(platform.id) && (
                        <span className="ml-auto text-accent">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {generateError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-small">
                  {generateError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-border">
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
                className="flex-1 btn-secondary py-3 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || generatePlatforms.length === 0}
                className="flex-1 btn-primary py-3 disabled:opacity-50"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : (
                  `Generate for ${generatePlatforms.length} Platform${generatePlatforms.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
