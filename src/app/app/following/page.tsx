'use client';

import { useState, useEffect, useRef } from 'react';
import { api, MonitoredCreator, ContentHistoryEntry } from '@/lib/api-client';
import { Platform, BackgroundConfig, PresetBackground, GeneratedContent } from '@/types';

type CreatorPlatform = 'youtube' | 'instagram';

// All available content platforms
const ALL_PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'video-script', label: 'Video Script', icon: '🎬' },
];

// Carousel background options
type CarouselBackgroundOption = PresetBackground | 'ai' | 'upload';
const BACKGROUND_OPTIONS: { value: CarouselBackgroundOption; label: string }[] = [
  { value: 'dark-minimal', label: 'Dark Minimal' },
  { value: 'ocean-blue', label: 'Ocean Blue' },
  { value: 'sunset-warm', label: 'Sunset Warm' },
  { value: 'purple-glow', label: 'Purple Glow' },
  { value: 'forest-green', label: 'Forest Green' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'rose-gold', label: 'Rose Gold' },
  { value: 'neon-cyber', label: 'Neon Cyber' },
  { value: 'earth-tones', label: 'Earth Tones' },
  { value: 'ai', label: 'AI Generated' },
  { value: 'upload', label: 'Upload Custom' },
];

export default function FollowingPage() {
  const [creators, setCreators] = useState<MonitoredCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add creator modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCreatorUrl, setNewCreatorUrl] = useState('');
  const [newCreatorPlatform, setNewCreatorPlatform] = useState<CreatorPlatform>('youtube');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Content preview state
  const [selectedCreator, setSelectedCreator] = useState<MonitoredCreator | null>(null);
  const [creatorContent, setCreatorContent] = useState<ContentHistoryEntry[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Polling state
  const [polling, setPolling] = useState<string | null>(null);

  // Repurpose modal state
  const [showRepurposeModal, setShowRepurposeModal] = useState(false);
  const [selectedVideoForRepurpose, setSelectedVideoForRepurpose] = useState<ContentHistoryEntry | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'linkedin', 'blog']);
  const [carouselBgOption, setCarouselBgOption] = useState<CarouselBackgroundOption>('dark-minimal');
  const [carouselBgFile, setCarouselBgFile] = useState<File | null>(null);
  const carouselBgInputRef = useRef<HTMLInputElement>(null);
  const [repurposing, setRepurposing] = useState(false);
  const [repurposeError, setRepurposeError] = useState<string | null>(null);
  const [repurposeResults, setRepurposeResults] = useState<GeneratedContent[] | null>(null);

  useEffect(() => {
    loadCreators();
  }, []);

  const loadCreators = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.creators.list();
      if (response.success) {
        setCreators(response.creators);
      }
    } catch (err) {
      setError('Failed to load followed creators');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCreator = async () => {
    if (!newCreatorUrl.trim()) return;

    try {
      setAdding(true);
      setAddError(null);
      const response = await api.creators.follow({
        platform: newCreatorPlatform,
        creatorUrl: newCreatorUrl.trim(),
      });

      if (response.success) {
        setCreators([response.creator, ...creators]);
        setShowAddModal(false);
        setNewCreatorUrl('');
      }
    } catch (err: unknown) {
      // Extract error message from Axios response
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.error
        || axiosError.message
        || 'Failed to follow creator';
      setAddError(errorMessage);
    } finally {
      setAdding(false);
    }
  };

  const handleUnfollow = async (creatorId: string) => {
    if (!confirm('Are you sure you want to unfollow this creator?')) return;

    try {
      await api.creators.unfollow(creatorId);
      setCreators(creators.filter(c => c.id !== creatorId));
      if (selectedCreator?.id === creatorId) {
        setSelectedCreator(null);
        setCreatorContent([]);
      }
    } catch (err) {
      console.error('Failed to unfollow:', err);
    }
  };

  // Polling status message
  const [pollStatus, setPollStatus] = useState<{ creatorId: string; message: string; type: 'success' | 'error' } | null>(null);

  const handlePoll = async (creatorId: string) => {
    try {
      setPolling(creatorId);
      setPollStatus(null);
      const response = await api.creators.poll(creatorId);
      if (response.success) {
        // Always refresh creator to update last_checked_at
        loadCreators();

        if (response.newContentCount > 0) {
          setPollStatus({
            creatorId,
            message: `Found ${response.newContentCount} new video${response.newContentCount > 1 ? 's' : ''}!`,
            type: 'success'
          });
          // Refresh content if viewing this creator
          if (selectedCreator?.id === creatorId) {
            loadCreatorContent(creatorId);
          }
        } else {
          setPollStatus({
            creatorId,
            message: 'No new content found',
            type: 'success'
          });
        }

        // Clear status after 3 seconds
        setTimeout(() => setPollStatus(null), 3000);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.error || 'Failed to check for content';
      setPollStatus({
        creatorId,
        message: errorMessage,
        type: 'error'
      });
      console.error('Failed to poll:', err);
    } finally {
      setPolling(null);
    }
  };

  const handleToggleAutomation = async (creator: MonitoredCreator) => {
    try {
      const response = await api.creators.update(creator.id, {
        automationEnabled: !creator.automation_enabled,
      });
      if (response.success) {
        setCreators(creators.map(c =>
          c.id === creator.id ? response.creator : c
        ));
      }
    } catch (err) {
      console.error('Failed to update automation:', err);
    }
  };

  const loadCreatorContent = async (creatorId: string) => {
    try {
      setLoadingContent(true);
      const response = await api.creators.getContent(creatorId, 20);
      if (response.success) {
        setCreatorContent(response.content);
      }
    } catch (err) {
      console.error('Failed to load content:', err);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSelectCreator = (creator: MonitoredCreator) => {
    setSelectedCreator(creator);
    loadCreatorContent(creator.id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeAgo = (dateStr: string | undefined) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Repurpose handlers
  const openRepurposeModal = (content: ContentHistoryEntry) => {
    setSelectedVideoForRepurpose(content);
    setShowRepurposeModal(true);
    setRepurposeError(null);
    setRepurposeResults(null);
    setSelectedPlatforms(['instagram', 'linkedin', 'blog']);
    setCarouselBgOption('dark-minimal');
    setCarouselBgFile(null);
  };

  const closeRepurposeModal = () => {
    setShowRepurposeModal(false);
    setSelectedVideoForRepurpose(null);
    setRepurposeError(null);
    setRepurposeResults(null);
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleCarouselBgChange = (value: CarouselBackgroundOption) => {
    setCarouselBgOption(value);
    if (value !== 'upload') {
      setCarouselBgFile(null);
      if (carouselBgInputRef.current) carouselBgInputRef.current.value = '';
    }
  };

  const handleCarouselBgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCarouselBgFile(file);
    }
  };

  const buildBackgroundConfig = (): BackgroundConfig => {
    if (carouselBgOption === 'ai') {
      return { type: 'ai' };
    }
    if (carouselBgOption === 'upload') {
      return { type: 'image' };
    }
    return { type: 'preset', presetId: carouselBgOption as PresetBackground };
  };

  const handleRepurpose = async () => {
    if (!selectedVideoForRepurpose || selectedPlatforms.length === 0) return;

    // Validate carousel background file if upload selected
    if (selectedPlatforms.includes('instagram') && carouselBgOption === 'upload' && !carouselBgFile) {
      setRepurposeError('Please select a background image for the carousel');
      return;
    }

    try {
      setRepurposing(true);
      setRepurposeError(null);

      const response = await api.creators.repurpose(selectedVideoForRepurpose.id, {
        platforms: selectedPlatforms as string[],
      });

      if (response.success && response.result.generatedContent) {
        // Transform results to GeneratedContent format
        const results: GeneratedContent[] = response.result.generatedContent.results.map((r, idx) => ({
          id: `${selectedVideoForRepurpose.id}-${r.platform}-${idx}`,
          requestId: selectedVideoForRepurpose.id,
          platform: r.platform as Platform,
          content: r.content,
          voiceScore: 0,
          qualityScore: 0,
          createdAt: new Date(),
        }));
        setRepurposeResults(results);
      } else {
        throw new Error(response.result.error || 'Repurposing failed');
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.error
        || (err instanceof Error ? err.message : 'Repurposing failed');
      setRepurposeError(errorMessage);
    } finally {
      setRepurposing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display text-3xl mb-2">Following</h1>
          <p className="text-body text-text-secondary">
            Follow creators to repurpose their content in your voice
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-6 py-3 flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Follow Creator
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : creators.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">👥</div>
          <h2 className="text-display text-2xl mb-2">No creators followed yet</h2>
          <p className="text-body text-text-secondary mb-6">
            Start following creators to see their content here and repurpose it in your voice
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-6 py-3"
          >
            Follow Your First Creator
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creators List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-subheading font-medium text-text-secondary mb-4">
              Followed Creators ({creators.length})
            </h3>

            {creators.map((creator) => (
              <div
                key={creator.id}
                onClick={() => handleSelectCreator(creator)}
                className={`
                  card cursor-pointer transition-all hover:shadow-lg
                  ${selectedCreator?.id === creator.id ? 'ring-2 ring-accent' : ''}
                `}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0
                    ${creator.platform === 'youtube' ? 'bg-red-100' : 'bg-pink-100'}
                  `}>
                    {creator.creator_avatar_url ? (
                      <img
                        src={creator.creator_avatar_url}
                        alt=""
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      creator.platform === 'youtube' ? '▶️' : '📷'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {creator.creator_name || creator.creator_username || 'Creator'}
                    </p>
                    <p className="text-small text-text-secondary capitalize">
                      {creator.platform}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-small text-text-secondary">
                      <span>{creator.new_content_count} new</span>
                      <span>•</span>
                      <span>Checked {formatTimeAgo(creator.last_checked_at)}</span>
                    </div>
                  </div>

                  {/* Automation toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAutomation(creator);
                    }}
                    className={`
                      p-2 rounded-lg transition-colors
                      ${creator.automation_enabled
                        ? 'text-success bg-success/10'
                        : 'text-text-secondary bg-bg-secondary'}
                    `}
                    title={creator.automation_enabled ? 'Auto-monitoring ON' : 'Auto-monitoring OFF'}
                  >
                    {creator.automation_enabled ? '🔔' : '🔕'}
                  </button>
                </div>

                {/* Poll Status Message */}
                {pollStatus?.creatorId === creator.id && (
                  <div className={`
                    mt-3 p-2 rounded text-small text-center
                    ${pollStatus.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}
                  `}>
                    {pollStatus.message}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePoll(creator.id);
                    }}
                    disabled={polling === creator.id}
                    className="flex-1 btn-secondary py-2 text-small flex items-center justify-center gap-2"
                  >
                    {polling === creator.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>🔄 Check Now</>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnfollow(creator.id);
                    }}
                    className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                    title="Unfollow"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Content Preview */}
          <div className="lg:col-span-2">
            {selectedCreator ? (
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-subheading font-medium">
                    Content from {selectedCreator.creator_name || selectedCreator.creator_username}
                  </h3>
                  <a
                    href={selectedCreator.creator_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent text-small hover:underline"
                  >
                    View Channel →
                  </a>
                </div>

                {loadingContent ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : creatorContent.length === 0 ? (
                  <div className="text-center py-12 text-text-secondary">
                    <p>No content found yet</p>
                    <p className="text-small mt-2">Try checking for new content</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {creatorContent.map((content) => (
                      <div
                        key={content.id}
                        className="flex items-start gap-4 p-4 bg-bg-secondary rounded-lg hover:bg-bg-secondary/80 transition-colors"
                      >
                        {content.thumbnail_url && (
                          <img
                            src={content.thumbnail_url}
                            alt=""
                            className="w-32 h-20 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium line-clamp-2">
                              {content.title || 'Untitled'}
                            </p>
                            {content.is_new_content && (
                              <span className="px-2 py-0.5 bg-accent text-white text-xs rounded flex-shrink-0">
                                NEW
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-2 text-small text-text-secondary">
                            {content.published_at && (
                              <span>{formatDate(content.published_at)}</span>
                            )}
                            {content.view_count && (
                              <>
                                <span>•</span>
                                <span>{content.view_count.toLocaleString()} views</span>
                              </>
                            )}
                          </div>

                          {/* AI Summary */}
                          {content.summary && (
                            <p className="mt-2 text-small text-text-primary bg-accent/5 p-2 rounded border-l-2 border-accent">
                              💡 {content.summary}
                            </p>
                          )}

                          {/* Status badges and Repurpose button */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <span className={`
                                px-2 py-1 rounded text-xs
                                ${content.extraction_status === 'completed'
                                  ? 'bg-success/10 text-success'
                                  : content.extraction_status === 'failed'
                                  ? 'bg-error/10 text-error'
                                  : 'bg-accent/10 text-accent'}
                              `}>
                                {content.extraction_status === 'completed' ? '✓ Extracted' :
                                 content.extraction_status === 'failed' ? '✗ Failed' :
                                 '⏳ Pending'}
                              </span>

                              <span className={`
                                px-2 py-1 rounded text-xs
                                ${content.repurpose_status === 'completed'
                                  ? 'bg-success/10 text-success'
                                  : content.repurpose_status === 'skipped'
                                  ? 'bg-text-secondary/10 text-text-secondary'
                                  : 'bg-accent/10 text-accent'}
                              `}>
                                {content.repurpose_status === 'completed' ? '✓ Repurposed' :
                                 content.repurpose_status === 'skipped' ? 'Skipped' :
                                 '📝 Ready'}
                              </span>
                            </div>

                            {/* Repurpose Button */}
                            <button
                              onClick={() => openRepurposeModal(content)}
                              className="px-3 py-1.5 bg-accent text-white text-small rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-1.5"
                            >
                              ✨ Repurpose
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card text-center py-16">
                <div className="text-5xl mb-4">👈</div>
                <p className="text-body text-text-secondary">
                  Select a creator to view their content
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Creator Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div className="bg-bg-primary rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Follow a Creator</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Platform Selection */}
              <div>
                <label className="block text-body font-medium mb-3">Platform</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setNewCreatorPlatform('youtube')}
                    className={`
                      flex-1 p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2
                      ${newCreatorPlatform === 'youtube'
                        ? 'border-red-500 bg-red-50'
                        : 'border-border hover:border-red-300'}
                    `}
                  >
                    <span className="text-3xl">▶️</span>
                    <span className="font-medium">YouTube</span>
                  </button>
                  <button
                    onClick={() => setNewCreatorPlatform('instagram')}
                    className={`
                      flex-1 p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2
                      ${newCreatorPlatform === 'instagram'
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-border hover:border-pink-300'}
                    `}
                  >
                    <span className="text-3xl">📷</span>
                    <span className="font-medium">Instagram</span>
                  </button>
                </div>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-body font-medium mb-2">
                  {newCreatorPlatform === 'youtube' ? 'YouTube Channel URL' : 'Instagram Profile URL'}
                </label>
                <input
                  type="url"
                  value={newCreatorUrl}
                  onChange={(e) => setNewCreatorUrl(e.target.value)}
                  placeholder={
                    newCreatorPlatform === 'youtube'
                      ? 'https://youtube.com/@username or channel URL'
                      : 'https://instagram.com/username'
                  }
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
                <p className="text-small text-text-secondary mt-2">
                  {newCreatorPlatform === 'youtube'
                    ? 'We\'ll monitor their channel for new videos via RSS'
                    : 'We\'ll monitor their profile for new posts'}
                </p>
              </div>

              {addError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-small">
                  {addError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-border">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 btn-secondary py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCreator}
                disabled={!newCreatorUrl.trim() || adding}
                className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Following...
                  </span>
                ) : (
                  'Follow Creator'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repurpose Modal */}
      {showRepurposeModal && selectedVideoForRepurpose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && !repurposing && closeRepurposeModal()}
        >
          <div className="bg-bg-primary rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-bg-primary z-10">
              <h2 className="text-xl font-semibold">
                {repurposeResults ? 'Generated Content' : 'Repurpose Content'}
              </h2>
              <button
                onClick={closeRepurposeModal}
                disabled={repurposing}
                className="p-2 hover:bg-bg-secondary rounded-lg transition-colors disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Results View */}
            {repurposeResults ? (
              <div className="p-6 space-y-6">
                {/* Success Header */}
                <div className="text-center">
                  <div className="text-5xl mb-3">✨</div>
                  <h3 className="text-lg font-semibold mb-1">Content Generated!</h3>
                  <p className="text-small text-text-secondary">
                    Generated for {repurposeResults.length} platform{repurposeResults.length > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Results */}
                <div className="space-y-4">
                  {repurposeResults.map((result) => (
                    <div key={result.id} className="bg-bg-secondary rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {result.platform === 'instagram' ? '📷' :
                             result.platform === 'linkedin' ? '💼' :
                             result.platform === 'blog' ? '📝' :
                             result.platform === 'email' ? '📧' :
                             result.platform === 'tiktok' ? '🎵' :
                             result.platform === 'video-script' ? '🎬' : '📄'}
                          </span>
                          <span className="font-medium capitalize">{result.platform}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(result.content)}
                          className="px-3 py-1 text-small bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="p-4 max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-small font-sans">
                          {result.content}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={closeRepurposeModal}
                    className="flex-1 btn-secondary py-3"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      setRepurposeResults(null);
                      setRepurposeError(null);
                    }}
                    className="flex-1 btn-primary py-3"
                  >
                    Generate Again
                  </button>
                </div>
              </div>
            ) : (
              /* Configuration View */
              <div className="p-6 space-y-6">
                {/* Source Video Info */}
                <div className="flex items-start gap-4 p-4 bg-bg-secondary rounded-lg">
                  {selectedVideoForRepurpose.thumbnail_url && (
                    <img
                      src={selectedVideoForRepurpose.thumbnail_url}
                      alt=""
                      className="w-32 h-20 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-2 mb-1">
                      {selectedVideoForRepurpose.title || 'Untitled Video'}
                    </p>
                    <p className="text-small text-text-secondary line-clamp-2">
                      {selectedVideoForRepurpose.description || 'No description'}
                    </p>
                    {selectedVideoForRepurpose.extraction_status !== 'completed' && (
                      <p className="text-small text-accent mt-2">
                        ⚠️ Transcript not yet extracted - content may be limited
                      </p>
                    )}
                  </div>
                </div>

                {/* Platform Selection */}
                <div>
                  <label className="block text-body font-medium mb-3">
                    Select Platforms
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ALL_PLATFORMS.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        disabled={repurposing}
                        className={`
                          p-3 rounded-lg border-2 transition-all flex items-center gap-2
                          ${selectedPlatforms.includes(platform.id)
                            ? 'border-accent bg-accent/10'
                            : 'border-border hover:border-accent/50'}
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <span className="text-xl">{platform.icon}</span>
                        <span className="text-small font-medium">{platform.label}</span>
                        {selectedPlatforms.includes(platform.id) && (
                          <span className="ml-auto text-accent">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedPlatforms.length === 0 && (
                    <p className="text-small text-error mt-2">
                      Select at least one platform
                    </p>
                  )}
                </div>

                {/* Carousel Background (only if Instagram selected) */}
                {selectedPlatforms.includes('instagram') && (
                  <div className="p-4 bg-bg-secondary rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <label className="text-body font-medium block">
                          Carousel Background
                        </label>
                        <p className="text-small text-text-secondary">
                          Style for your Instagram carousel
                        </p>
                      </div>
                      <select
                        value={carouselBgOption}
                        onChange={(e) => handleCarouselBgChange(e.target.value as CarouselBackgroundOption)}
                        disabled={repurposing}
                        className="px-4 py-2 border border-border rounded-lg bg-bg-primary text-body focus:outline-none focus:border-accent min-w-[160px]"
                      >
                        {BACKGROUND_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Upload field if upload selected */}
                    {carouselBgOption === 'upload' && (
                      <div className="pt-3 border-t border-border">
                        <input
                          type="file"
                          ref={carouselBgInputRef}
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleCarouselBgFileSelect}
                          className="hidden"
                        />
                        {!carouselBgFile ? (
                          <button
                            onClick={() => carouselBgInputRef.current?.click()}
                            disabled={repurposing}
                            className="w-full py-3 border-2 border-dashed border-border rounded-lg text-text-secondary hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                          >
                            Click to upload background image
                          </button>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">🖼️</span>
                              <div>
                                <p className="text-body font-medium">{carouselBgFile.name}</p>
                                <p className="text-small text-text-secondary">
                                  {(carouselBgFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setCarouselBgFile(null);
                                if (carouselBgInputRef.current) carouselBgInputRef.current.value = '';
                              }}
                              disabled={repurposing}
                              className="text-small text-error hover:underline disabled:opacity-50"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {carouselBgOption === 'ai' && (
                      <p className="text-small text-accent">
                        ✨ AI will generate a background based on the content
                      </p>
                    )}
                  </div>
                )}

                {/* Error */}
                {repurposeError && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-small">
                    {repurposeError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={closeRepurposeModal}
                    disabled={repurposing}
                    className="flex-1 btn-secondary py-3 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRepurpose}
                    disabled={repurposing || selectedPlatforms.length === 0}
                    className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {repurposing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      `Generate for ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`
                    )}
                  </button>
                </div>

                {/* Info */}
                <p className="text-small text-center text-text-secondary">
                  ✨ This usually takes 30-60 seconds
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
