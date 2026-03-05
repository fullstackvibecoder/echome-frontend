'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, MonitoredCreator, ContentHistoryEntry } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { Platform, BackgroundConfig, DesignPreset } from '@/types';
import { InfoTooltip } from '@/components/info-tooltip';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { AppPageHeader } from '@/components/app-page-header';

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

// Carousel design preset options
type CarouselDesignOption = DesignPreset | 'upload' | 'video-snapshot';
const DESIGN_PRESET_OPTIONS: { value: CarouselDesignOption; label: string; description: string; disabled?: boolean }[] = [
  { value: 'tweet-style', label: 'Tweet Style', description: 'Twitter/X post card look' },
  { value: 'upload', label: 'Upload Custom', description: 'Use your own background image' },
  { value: 'video-snapshot', label: 'Video Snapshots', description: 'Use a frame from your uploaded video' },
];

// Extended content with creator info
interface ContentWithCreator extends ContentHistoryEntry {
  creator?: MonitoredCreator;
}

export default function FollowingContent() {
  const [creators, setCreators] = useState<MonitoredCreator[]>([]);
  const [allContent, setAllContent] = useState<ContentWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterCreatorId, setFilterCreatorId] = useState<string | null>(null);
  const [showCreatorPanel, setShowCreatorPanel] = useState(false);

  // Add creator modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCreatorUrl, setNewCreatorUrl] = useState('');
  const [newCreatorPlatform, setNewCreatorPlatform] = useState<CreatorPlatform>('youtube');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Polling state
  const [polling, setPolling] = useState<string | null>(null);
  const [pollingAll, setPollingAll] = useState(false);

  // Repurpose modal state
  const [showRepurposeModal, setShowRepurposeModal] = useState(false);
  const [selectedVideoForRepurpose, setSelectedVideoForRepurpose] = useState<ContentWithCreator | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'linkedin', 'blog']);
  const [carouselDesignOption, setCarouselDesignOption] = useState<CarouselDesignOption>('tweet-style');
  const [carouselBgFile, setCarouselBgFile] = useState<File | null>(null);
  const carouselBgInputRef = useRef<HTMLInputElement>(null);
  const [carouselBgDragActive, setCarouselBgDragActive] = useState(false);
  const [repurposing, setRepurposing] = useState(false);
  const [repurposeError, setRepurposeError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load creators
      const creatorsResponse = await api.creators.list();
      if (creatorsResponse.success) {
        setCreators(creatorsResponse.creators);

        // Load all content from all creators
        await loadAllContent(creatorsResponse.creators);
      }
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAllContent = async (creatorsList: MonitoredCreator[]) => {
    try {
      setLoadingContent(true);
      const contentPromises = creatorsList.map(async (creator) => {
        const response = await api.creators.getContent(creator.id, 10);
        if (response.success) {
          return response.content.map((c: ContentHistoryEntry) => ({ ...c, creator }));
        }
        return [];
      });

      const results = await Promise.all(contentPromises);
      const flatContent = results.flat();

      // Sort by created_at descending (newest first)
      flatContent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setAllContent(flatContent);
    } catch (err) {
      console.error('Failed to load content:', err);
    } finally {
      setLoadingContent(false);
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

      if (response.success && response.creator) {
        const newCreator = response.creator;
        setCreators([newCreator, ...creators]);
        setShowAddModal(false);
        setNewCreatorUrl('');

        // Load content for the new creator
        try {
          const contentResponse = await api.creators.getContent(newCreator.id, 10);
          if (contentResponse.success && contentResponse.content) {
            const newContent = contentResponse.content.map((c: ContentHistoryEntry) => ({ ...c, creator: newCreator }));
            setAllContent(prev => [...newContent, ...prev].sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ));
          }
        } catch (contentErr) {
          // Content loading failed but creator was followed successfully — not critical
          console.error('Failed to load initial content:', contentErr);
        }
      } else if (!response.success) {
        setAddError(response.error || 'Failed to follow creator. Please try again.');
      }
    } catch (err) {
      setAddError(extractErrorMessage(err, 'Failed to follow creator'));
    } finally {
      setAdding(false);
    }
  };

  const handleUnfollow = async (creatorId: string) => {
    if (!confirm('Are you sure you want to unfollow this creator?')) return;

    try {
      await api.creators.unfollow(creatorId);
      setCreators(creators.filter(c => c.id !== creatorId));
      setAllContent(allContent.filter(c => c.creator_id !== creatorId));
      if (filterCreatorId === creatorId) {
        setFilterCreatorId(null);
      }
    } catch (err) {
      console.error('Failed to unfollow:', err);
    }
  };

  const handlePoll = async (creatorId: string) => {
    try {
      setPolling(creatorId);
      const response = await api.creators.poll(creatorId);
      if (response.success && response.newContentCount > 0) {
        // Reload all content
        await loadAllContent(creators);
      }
      // Update creator in list
      const updatedCreators = await api.creators.list();
      if (updatedCreators.success) {
        setCreators(updatedCreators.creators);
      }
    } catch (err) {
      console.error('Failed to poll:', err);
    } finally {
      setPolling(null);
    }
  };

  const handlePollAll = async () => {
    try {
      setPollingAll(true);
      await api.creators.pollAll();
      // Reload all data
      await loadData();
    } catch (err) {
      console.error('Failed to poll all:', err);
    } finally {
      setPollingAll(false);
    }
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

  // Filtered content
  const filteredContent = filterCreatorId
    ? allContent.filter(c => c.creator_id === filterCreatorId)
    : allContent;

  // Repurpose handlers
  const openRepurposeModal = (content: ContentWithCreator) => {
    setSelectedVideoForRepurpose(content);
    setShowRepurposeModal(true);
    setRepurposeError(null);
    setSelectedPlatforms(['instagram', 'linkedin', 'blog']);
    setCarouselDesignOption('tweet-style'); // Default to tweet-style for better carousels
    setCarouselBgFile(null);
  };

  const closeRepurposeModal = () => {
    setShowRepurposeModal(false);
    setSelectedVideoForRepurpose(null);
    setRepurposeError(null);
  };

  const handleExtractTranscript = async () => {
    if (!selectedVideoForRepurpose) return;

    try {
      setExtracting(true);
      await api.creators.extractTranscript(selectedVideoForRepurpose.id);

      // Refresh content
      await loadAllContent(creators);

      // Update selected video
      const updated = allContent.find(c => c.id === selectedVideoForRepurpose.id);
      if (updated) {
        setSelectedVideoForRepurpose(updated);
      }
    } catch (err) {
      console.error('Failed to extract transcript:', err);
      setRepurposeError('Failed to extract transcript. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleDesignOptionChange = (value: CarouselDesignOption) => {
    setCarouselDesignOption(value);
    if (value !== 'upload') {
      setCarouselBgFile(null);
      if (carouselBgInputRef.current) carouselBgInputRef.current.value = '';
    }
  };

  const handleRepurpose = async () => {
    if (!selectedVideoForRepurpose || selectedPlatforms.length === 0) return;

    if (selectedPlatforms.includes('instagram') && carouselDesignOption === 'upload' && !carouselBgFile) {
      setRepurposeError('Please select a background image for the carousel');
      return;
    }

    try {
      setRepurposing(true);
      setRepurposeError(null);

      // Auto-extract transcript if not available
      if (selectedVideoForRepurpose.extraction_status !== 'completed') {
        setRepurposeError(null);
        try {
          await api.creators.extractTranscript(selectedVideoForRepurpose.id);
          // Update the local state to reflect extraction is done
          setSelectedVideoForRepurpose({
            ...selectedVideoForRepurpose,
            extraction_status: 'completed',
          });
        } catch (extractErr) {
          console.error('Transcript extraction failed:', extractErr);
          // Continue anyway - backend will use description if available
        }
      }

      // Build design preset config
      // video-snapshot is coming soon and disabled, so default to tweet-style if somehow selected
      const designPreset: DesignPreset = (carouselDesignOption === 'upload' || carouselDesignOption === 'video-snapshot')
        ? 'tweet-style'
        : carouselDesignOption;
      let carouselBackground: { type: 'image'; imageUrl: string } | undefined;

      if (carouselDesignOption === 'upload' && carouselBgFile) {
        // Upload the background image first
        try {
          const uploadResponse = await api.images.uploadBackground(carouselBgFile);
          if (uploadResponse.success && uploadResponse.data?.background?.publicUrl) {
            carouselBackground = { type: 'image', imageUrl: uploadResponse.data.background.publicUrl };
          } else {
            throw new Error('Failed to upload background image');
          }
        } catch (uploadError) {
          setRepurposeError('Failed to upload background image. Please try again.');
          setRepurposing(false);
          return;
        }
      }

      // Debug log what we're sending
      console.log('Repurpose request:', {
        designPreset,
        carouselBackground,
        hasImageUrl: carouselBackground?.imageUrl ? 'yes' : 'no',
      });

      const response = await api.creators.repurpose(selectedVideoForRepurpose.id, {
        platforms: selectedPlatforms as string[],
        designPreset,
        carouselBackground,
      });

      if (response.success && response.result.requestId) {
        // Close modal and navigate to Content Kit detail page
        // User sees real-time progress via SSE
        closeRepurposeModal();
        router.push(`/app/content-kit/${response.result.requestId}`);
      } else {
        throw new Error(response.result?.error || 'Repurposing failed');
      }
    } catch (err) {
      setRepurposeError(extractErrorMessage(err, 'Repurposing failed'));
    } finally {
      setRepurposing(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      {/* Header */}
      <AppPageHeader
        title="Following"
        description="Track YouTube creators and repurpose their ideas in your voice"
        actions={
          <>
            <button
              onClick={handlePollAll}
              disabled={pollingAll || creators.length === 0}
              className="btn-secondary px-4 py-2 flex items-center gap-2 disabled:opacity-50"
            >
              {pollingAll ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Pulling...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Pull Fresh Content
                </>
              )}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-4 py-2 flex items-center gap-2"
            >
              <span>+</span> Follow Creator
            </button>
          </>
        }
      />

      <UpgradeBanner />

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 space-y-6 animate-fade-in stagger-children">
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      ) : creators.length === 0 ? (
        <div className="card py-12 px-8">
          <div className="max-w-xl mx-auto text-center mb-10">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">Follow creators you admire</h2>
            <p className="text-body text-text-secondary">
              Track YouTube creators and repurpose their best ideas into your own content, matched to your voice.
            </p>
          </div>

          {/* How it works steps */}
          <div className="max-w-2xl mx-auto grid gap-4 mb-10">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-bg-secondary/60 border border-border">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">1</div>
              <div>
                <p className="font-medium text-text-primary">Add a YouTube creator</p>
                <p className="text-sm text-text-secondary">Paste their channel or video URL. We&apos;ll start tracking their new uploads.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-bg-secondary/60 border border-border">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">2</div>
              <div>
                <p className="font-medium text-text-primary">Pull fresh content anytime</p>
                <p className="text-sm text-text-secondary">Click &quot;Pull Fresh Content&quot; to check for new videos from everyone you follow.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-bg-secondary/60 border border-border">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">3</div>
              <div>
                <p className="font-medium text-text-primary">Repurpose in your voice</p>
                <p className="text-sm text-text-secondary">
                  Pick any video and repurpose it right here, or use the <span className="font-medium text-accent">Repurpose</span> tab on the Dashboard to browse all followed content.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button onClick={() => setShowAddModal(true)} className="btn-primary px-6 py-3">
              + Follow Your First Creator
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Creator Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-border">
            <button
              onClick={() => setFilterCreatorId(null)}
              className={`px-4 py-2 rounded-full text-small font-medium transition-all ${
                filterCreatorId === null
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary hover:bg-bg-secondary/80'
              }`}
            >
              All ({allContent.length})
            </button>
            {creators.map((creator) => {
              const count = allContent.filter(c => c.creator_id === creator.id).length;
              const newCount = allContent.filter(c => c.creator_id === creator.id && c.is_new_content).length;
              return (
                <button
                  key={creator.id}
                  onClick={() => setFilterCreatorId(filterCreatorId === creator.id ? null : creator.id)}
                  className={`px-4 py-2 rounded-full text-small font-medium transition-all flex items-center gap-2 ${
                    filterCreatorId === creator.id
                      ? 'bg-accent text-white'
                      : 'bg-bg-secondary hover:bg-bg-secondary/80'
                  }`}
                >
                  {creator.creator_avatar_url ? (
                    <img src={creator.creator_avatar_url} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <span>{creator.platform === 'youtube' ? '▶️' : '📷'}</span>
                  )}
                  <span className="truncate max-w-[120px]">
                    {creator.creator_name || creator.creator_username || 'Creator'}
                  </span>
                  <span className="opacity-70">({count})</span>
                  {newCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">{newCount} new</span>
                  )}
                </button>
              );
            })}

            {/* Manage Creators Toggle */}
            <button
              onClick={() => setShowCreatorPanel(!showCreatorPanel)}
              className="ml-auto px-3 py-2 text-small text-text-secondary hover:text-text-primary transition-colors"
            >
              {showCreatorPanel ? 'Hide' : 'Manage'} Creators
            </button>
          </div>

          {/* Creator Management Panel (collapsible) */}
          {showCreatorPanel && (
            <div className="mb-6 p-4 bg-bg-secondary rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {creators.map((creator) => (
                  <div key={creator.id} className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg card-lift">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {creator.creator_avatar_url ? (
                        <img src={creator.creator_avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${
                          creator.platform === 'youtube' ? 'bg-red-100' : 'bg-pink-100'
                        }`}>
                          {creator.platform === 'youtube' ? '▶️' : '📷'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-small">
                        {creator.creator_name || creator.creator_username}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Checked {formatTimeAgo(creator.last_checked_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePoll(creator.id)}
                        disabled={polling === creator.id}
                        className="p-2 hover:bg-bg-secondary rounded transition-colors disabled:opacity-50"
                        title="Check for new content"
                      >
                        {polling === creator.id ? (
                          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        ) : (
                          '🔄'
                        )}
                      </button>
                      <button
                        onClick={() => handleUnfollow(creator.id)}
                        className="p-2 hover:bg-error/10 text-error rounded transition-colors"
                        title="Unfollow"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Feed */}
          {loadingContent ? (
            <div className="py-8 space-y-4 animate-fade-in stagger-children">
              <div className="skeleton h-32 rounded-xl" />
              <div className="skeleton h-32 rounded-xl" />
              <div className="skeleton h-32 rounded-xl" />
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-text-secondary">No content found. Try checking for new content.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContent.map((content) => (
                <div
                  key={content.id}
                  className="card card-lift transition-shadow"
                >
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    {content.thumbnail_url && (
                      <img
                        src={content.thumbnail_url}
                        alt=""
                        className="w-40 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Creator + Title Row */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          {/* Creator Badge */}
                          <div className="flex items-center gap-2 mb-1">
                            {content.creator?.creator_avatar_url ? (
                              <img src={content.creator.creator_avatar_url} alt="" className="w-5 h-5 rounded-full" />
                            ) : (
                              <span className="text-sm">{content.platform === 'youtube' ? '▶️' : '📷'}</span>
                            )}
                            <span className="text-small text-text-secondary">
                              {content.creator?.creator_name || content.creator?.creator_username || 'Creator'}
                            </span>
                            {content.is_new_content && (
                              <span className="px-2 py-0.5 bg-accent text-white text-xs rounded">NEW</span>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="font-medium line-clamp-1">{content.title || 'Untitled'}</h3>
                        </div>

                        {/* Repurpose Button */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openRepurposeModal(content)}
                            className="px-4 py-2 bg-accent text-white text-small rounded-lg hover:bg-accent/90 transition-colors"
                          >
                            ✨ Repurpose
                          </button>
                          <InfoTooltip text="Takes this creator's video and generates social posts in YOUR voice. Their ideas + your style = authentic content." />
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-small text-text-secondary mb-2">
                        {content.published_at && <span>{formatDate(content.published_at)}</span>}
                        {content.view_count && (
                          <>
                            <span>•</span>
                            <span>{content.view_count.toLocaleString()} views</span>
                          </>
                        )}
                      </div>

                      {/* AI Summary */}
                      {content.summary && (
                        <div className="p-3 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-lg border-l-2 border-purple-500">
                          <p className="text-small">💡 {content.summary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Creator Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div className="bg-bg-primary rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold">Follow a Creator</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-bg-secondary rounded-lg">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-body font-medium mb-3">Platform</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setNewCreatorPlatform('youtube')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      newCreatorPlatform === 'youtube' ? 'border-red-500 bg-red-50' : 'border-border hover:border-red-300'
                    }`}
                  >
                    <span className="text-3xl">▶️</span>
                    <span className="font-medium">YouTube</span>
                  </button>
                  <button
                    onClick={() => setNewCreatorPlatform('instagram')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      newCreatorPlatform === 'instagram' ? 'border-pink-500 bg-pink-50' : 'border-border hover:border-pink-300'
                    }`}
                  >
                    <span className="text-3xl">📷</span>
                    <span className="font-medium">Instagram</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-body font-medium mb-2">
                  {newCreatorPlatform === 'youtube' ? 'YouTube Channel URL' : 'Instagram Profile URL'}
                  <InfoTooltip text="Paste a channel URL (youtube.com/@creator) or any video URL. We'll find the channel automatically." />
                </label>
                <input
                  type="url"
                  value={newCreatorUrl}
                  onChange={(e) => setNewCreatorUrl(e.target.value)}
                  placeholder={newCreatorPlatform === 'youtube' ? 'https://youtube.com/@username' : 'https://instagram.com/username'}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              {addError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-small">
                  {addError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-border">
              <button onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary py-3">
                Cancel
              </button>
              <button
                onClick={handleAddCreator}
                disabled={!newCreatorUrl.trim() || adding}
                className="flex-1 btn-primary py-3 disabled:opacity-50"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && !repurposing && !extracting && closeRepurposeModal()}
        >
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-xl font-semibold text-foreground">Repurpose Content</h2>
              <button onClick={closeRepurposeModal} disabled={repurposing} className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 text-foreground">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
                {/* Source Info */}
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  {selectedVideoForRepurpose.thumbnail_url && (
                    <img src={selectedVideoForRepurpose.thumbnail_url} alt="" className="w-32 h-20 object-cover rounded flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-2 mb-1 text-foreground">{selectedVideoForRepurpose.title || 'Untitled'}</p>
                    <p className="text-small text-muted-foreground line-clamp-2">{selectedVideoForRepurpose.description || 'No description'}</p>
                    {selectedVideoForRepurpose.extraction_status === 'completed' ? (
                      <p className="text-small text-green-500 mt-2">✓ Transcript available</p>
                    ) : selectedVideoForRepurpose.extraction_status === 'processing' || extracting ? (
                      <p className="text-small text-blue-500 mt-2">⏳ Extracting transcript...</p>
                    ) : (
                      <div className="mt-2 flex items-center gap-3">
                        <p className="text-small text-amber-500">⚠️ No transcript</p>
                        <button onClick={handleExtractTranscript} disabled={extracting} className="text-small px-3 py-1 bg-accent text-white rounded disabled:opacity-50">
                          Extract
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Summary */}
                {selectedVideoForRepurpose.summary && (
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
                    <p className="text-small text-foreground">💡 {selectedVideoForRepurpose.summary}</p>
                  </div>
                )}

                {/* Platform Selection */}
                <div>
                  <label className="block font-medium mb-3 text-foreground">Select Platforms</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ALL_PLATFORMS.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        disabled={repurposing}
                        className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                          selectedPlatforms.includes(platform.id) ? 'border-accent bg-accent/10 text-foreground' : 'border-border hover:border-accent/50 text-foreground'
                        } disabled:opacity-50`}
                      >
                        <span className="text-xl">{platform.icon}</span>
                        <span className="text-small font-medium">{platform.label}</span>
                        {selectedPlatforms.includes(platform.id) && <span className="ml-auto text-accent">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Carousel Design Preset */}
                {selectedPlatforms.includes('instagram') && (
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <label className="font-medium text-foreground">Carousel Style</label>
                        <p className="text-small text-muted-foreground">Design preset for Instagram carousel</p>
                      </div>
                      <select
                        value={carouselDesignOption}
                        onChange={(e) => handleDesignOptionChange(e.target.value as CarouselDesignOption)}
                        className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
                      >
                        {DESIGN_PRESET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                            {opt.label}{opt.disabled ? ' (Coming Soon)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {carouselDesignOption === 'upload' ? (
                      <div className="space-y-2">
                        <input
                          ref={carouselBgInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => setCarouselBgFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="carousel-bg-upload"
                        />
                        <label
                          htmlFor="carousel-bg-upload"
                          className={`flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                            carouselBgDragActive
                              ? 'border-accent bg-accent/10 scale-[1.01]'
                              : 'border-border hover:border-accent hover:bg-accent/5'
                          }`}
                          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setCarouselBgDragActive(true); }}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setCarouselBgDragActive(false); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCarouselBgDragActive(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) setCarouselBgFile(file);
                          }}
                        >
                          {carouselBgFile ? (
                            <div className="flex items-center gap-3">
                              <span className="text-accent">✓</span>
                              <span className="text-foreground font-medium truncate max-w-[200px]">{carouselBgFile.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCarouselBgFile(null);
                                  if (carouselBgInputRef.current) carouselBgInputRef.current.value = '';
                                }}
                                className="text-error hover:text-error/80"
                              >
                                ✕
                              </button>
                            </div>
                          ) : carouselBgDragActive ? (
                            <>
                              <span className="text-2xl">📥</span>
                              <span className="text-accent font-medium">Drop image here</span>
                            </>
                          ) : (
                            <>
                              <span className="text-2xl">📷</span>
                              <span className="text-foreground">Drag & drop or click to upload background image</span>
                            </>
                          )}
                        </label>
                        <p className="text-small text-muted-foreground">
                          Your text will be overlaid on this image. Recommended: 1080x1080px
                        </p>
                      </div>
                    ) : (
                      <p className="text-small text-muted-foreground">
                        {DESIGN_PRESET_OPTIONS.find(opt => opt.value === carouselDesignOption)?.description}
                      </p>
                    )}
                  </div>
                )}

                {repurposeError && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-small">
                    {repurposeError}
                  </div>
                )}

                {/* Info about transcript extraction */}
                {selectedVideoForRepurpose.extraction_status !== 'completed' && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-small text-blue-400">
                      ℹ️ Transcript will be automatically extracted when you click Generate
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={closeRepurposeModal} disabled={repurposing} className="flex-1 btn-secondary py-3 disabled:opacity-50">
                    Cancel
                  </button>
                  <button
                    onClick={handleRepurpose}
                    disabled={repurposing || selectedPlatforms.length === 0}
                    className="flex-1 btn-primary py-3 disabled:opacity-50"
                  >
                    {repurposing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {selectedVideoForRepurpose.extraction_status !== 'completed' ? 'Extracting & Generating...' : 'Generating...'}
                      </span>
                    ) : (
                      `Generate for ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`
                    )}
                  </button>
                </div>

                <p className="text-small text-center text-muted-foreground">✨ Usually takes 30-60 seconds</p>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
