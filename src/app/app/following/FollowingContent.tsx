'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, MonitoredCreator, ContentHistoryEntry } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { showErrorToast } from '@/lib/toast';
import { Platform, DesignPreset } from '@/types';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { StylePicker, StyleOption } from '@/components/style-picker';

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
const CAROUSEL_STYLE_OPTIONS: StyleOption[] = [
  { value: 'auto', label: 'Pick for me', thumbnail: '/style-previews/slides/pick-for-me.svg' },
  { value: 'tweet-style', label: 'Quote Card', thumbnail: '/style-previews/slides/quote-card.svg' },
  { value: 'text-box', label: 'Text on Color', thumbnail: '/style-previews/slides/text-on-color.svg' },
  { value: 'upload', label: 'My Own Image', thumbnail: '/style-previews/slides/my-own-image.svg' },
  { value: 'video-snapshot', label: 'Video Frame', thumbnail: '/style-previews/slides/video-frame.svg' },
];

// Extended content with creator info
interface ContentWithCreator extends ContentHistoryEntry {
  creator?: MonitoredCreator;
}

/** Detect platform from URL */
function detectPlatform(url: string): CreatorPlatform {
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    return 'instagram';
  }
  return 'youtube';
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

  // Inline follow input state
  const [newCreatorUrl, setNewCreatorUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Repurpose modal state
  const [showRepurposeModal, setShowRepurposeModal] = useState(false);
  const [selectedVideoForRepurpose, setSelectedVideoForRepurpose] = useState<ContentWithCreator | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'linkedin', 'blog']);
  const [carouselDesignOption, setCarouselDesignOption] = useState<CarouselDesignOption>('auto');
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

      const creatorsResponse = await api.creators.list();
      if (creatorsResponse.success) {
        setCreators(creatorsResponse.creators);
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
      flatContent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllContent(flatContent);
    } catch (err) {
      console.error('Failed to load content:', err);
      showErrorToast(err, 'loading creator content');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleAddCreator = async () => {
    if (!newCreatorUrl.trim()) return;

    const platform = detectPlatform(newCreatorUrl.trim());

    try {
      setAdding(true);
      setAddError(null);
      const response = await api.creators.follow({
        platform,
        creatorUrl: newCreatorUrl.trim(),
      });

      if (response.success && response.creator) {
        const newCreator = response.creator;
        setCreators(prev => [newCreator, ...prev]);
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
      showErrorToast(err, 'unfollowing creator');
    }
  };

  const handlePoll = async (creatorId: string) => {
    try {
      const response = await api.creators.poll(creatorId);
      if (response.success && response.newContentCount > 0) {
        await loadAllContent(creators);
      }
      const updatedCreators = await api.creators.list();
      if (updatedCreators.success) {
        setCreators(updatedCreators.creators);
      }
    } catch (err) {
      console.error('Failed to poll:', err);
      showErrorToast(err, 'syncing creator content');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
    setCarouselDesignOption('auto');
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
      await loadAllContent(creators);

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
        try {
          await api.creators.extractTranscript(selectedVideoForRepurpose.id);
          setSelectedVideoForRepurpose({
            ...selectedVideoForRepurpose,
            extraction_status: 'completed',
          });
        } catch (extractErr) {
          console.error('Transcript extraction failed:', extractErr);
        }
      }

      // Build design preset config
      const designPreset: DesignPreset = (carouselDesignOption === 'upload' || carouselDesignOption === 'video-snapshot')
        ? 'auto'
        : carouselDesignOption;
      let carouselBackground: { type: 'image'; imageUrl: string } | undefined;

      if (carouselDesignOption === 'upload' && carouselBgFile) {
        try {
          const uploadResponse = await api.images.uploadBackground(carouselBgFile);
          if (uploadResponse.success && uploadResponse.data?.background?.publicUrl) {
            carouselBackground = { type: 'image', imageUrl: uploadResponse.data.background.publicUrl };
          } else {
            throw new Error('Failed to upload background image');
          }
        } catch {
          setRepurposeError('Failed to upload background image. Please try again.');
          setRepurposing(false);
          return;
        }
      }

      const response = await api.creators.repurpose(selectedVideoForRepurpose.id, {
        platforms: selectedPlatforms as string[],
        designPreset,
        carouselBackground,
      });

      if (response.success && response.result.requestId) {
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
          Creator Radar
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          See what top creators are talking about. One click turns their ideas into content written in your voice — not theirs.
        </p>
      </div>

      <UpgradeBanner />

      {/* Inline Follow Input */}
      <div className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddCreator();
          }}
          className="flex gap-2"
        >
          <input
            type="url"
            value={newCreatorUrl}
            onChange={(e) => {
              setNewCreatorUrl(e.target.value);
              if (addError) setAddError(null);
            }}
            placeholder="Paste a YouTube channel or Instagram profile URL..."
            className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary-interactive focus:ring-1 focus:ring-primary-interactive"
          />
          <button
            type="submit"
            disabled={!newCreatorUrl.trim() || adding}
            className="px-5 py-2.5 bg-primary-interactive text-white rounded-lg font-medium hover:bg-primary-interactive/90 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {adding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Following...
              </>
            ) : (
              'Follow'
            )}
          </button>
        </form>
        {addError && (
          <p className="mt-2 text-sm text-error">{addError}</p>
        )}
        {creators.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Following {creators.length} creator{creators.length !== 1 ? 's' : ''} &middot;{' '}
            <button
              onClick={() => setShowCreatorPanel(!showCreatorPanel)}
              className="text-primary-interactive hover:underline font-medium"
            >
              Manage
            </button>
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 space-y-4 animate-fade-in stagger-children">
          <div className="skeleton h-10 rounded-xl w-2/3" />
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
        </div>
      ) : creators.length === 0 ? (
        <div className="card py-16 px-8 text-center">
          <p className="text-muted-foreground max-w-md mx-auto">
            Add a creator and any new video they post gets filtered through your knowledge base. Their idea, your voice. Paste a YouTube channel or Instagram profile above.
          </p>
        </div>
      ) : (
        <>
          {/* Creator Management Panel (collapsible) */}
          {showCreatorPanel && (
            <div className="mb-6 p-4 bg-card rounded-xl border border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {creators.map((creator) => (
                  <div key={creator.id} className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {creator.creator_avatar_url ? (
                        <img src={creator.creator_avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${
                          creator.platform === 'youtube' ? 'bg-red-100' : 'bg-pink-100'
                        }`}>
                          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">
                        {creator.creator_name || creator.creator_username}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{creator.platform}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePoll(creator.id)}
                        className="p-2 hover:bg-bg-secondary rounded transition-colors"
                        title="Check for new content"
                      >
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleUnfollow(creator.id)}
                        className="p-2 hover:bg-error/10 text-error rounded transition-colors"
                        title="Unfollow"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Creator Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => setFilterCreatorId(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filterCreatorId === null
                  ? 'bg-primary-interactive text-white'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({allContent.length})
            </button>
            {creators.map((creator) => {
              const count = allContent.filter(c => c.creator_id === creator.id).length;
              return (
                <button
                  key={creator.id}
                  onClick={() => setFilterCreatorId(filterCreatorId === creator.id ? null : creator.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                    filterCreatorId === creator.id
                      ? 'bg-primary-interactive text-white'
                      : 'border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {creator.creator_avatar_url && (
                    <img src={creator.creator_avatar_url} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span className="truncate max-w-[120px]">
                    {creator.creator_name || creator.creator_username || 'Creator'}
                  </span>
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Compact Feed */}
          {loadingContent ? (
            <div className="py-4 space-y-3 animate-fade-in stagger-children">
              <div className="skeleton h-20 rounded-xl" />
              <div className="skeleton h-20 rounded-xl" />
              <div className="skeleton h-20 rounded-xl" />
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-muted-foreground">
                Waiting for fresh content from your creators. We&apos;ll check for new videos automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContent.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center gap-4 p-3 bg-card border border-border rounded-xl hover:border-primary-interactive/30 transition-colors"
                >
                  {/* Thumbnail */}
                  {content.thumbnail_url ? (
                    <img
                      src={content.thumbnail_url}
                      alt=""
                      className="w-[120px] aspect-video object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-[120px] aspect-video bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}

                  {/* Content info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">
                      {content.creator?.creator_name || content.creator?.creator_username || 'Creator'}
                    </p>
                    <h3 className="font-semibold text-sm text-foreground truncate">
                      {content.title || 'Untitled'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {content.published_at && <span>{formatDate(content.published_at)}</span>}
                      {content.view_count != null && content.view_count > 0 && (
                        <>
                          <span>&middot;</span>
                          <span>{content.view_count.toLocaleString()} views</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Repurpose button */}
                  <button
                    onClick={() => openRepurposeModal(content)}
                    className="px-4 py-2 bg-primary-interactive text-white text-sm font-medium rounded-lg hover:bg-primary-interactive/90 transition-colors flex-shrink-0 whitespace-nowrap"
                  >
                    Repurpose &rarr;
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                  <p className="text-sm text-muted-foreground line-clamp-2">{selectedVideoForRepurpose.description || 'No description'}</p>
                  {selectedVideoForRepurpose.extraction_status === 'completed' ? (
                    <p className="text-sm text-green-500 mt-2">Transcript available</p>
                  ) : selectedVideoForRepurpose.extraction_status === 'processing' || extracting ? (
                    <p className="text-sm text-blue-500 mt-2">Extracting transcript...</p>
                  ) : (
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-sm text-amber-500">No transcript</p>
                      <button onClick={handleExtractTranscript} disabled={extracting} className="text-sm px-3 py-1 bg-primary-interactive text-white rounded disabled:opacity-50">
                        Extract
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Summary */}
              {selectedVideoForRepurpose.summary && (
                <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20">
                  <p className="text-sm text-foreground">{selectedVideoForRepurpose.summary}</p>
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
                        selectedPlatforms.includes(platform.id) ? 'border-primary-interactive bg-primary-interactive/10 text-foreground' : 'border-border hover:border-primary-interactive/50 text-foreground'
                      } disabled:opacity-50`}
                    >
                      <span className="text-xl">{platform.icon}</span>
                      <span className="text-sm font-medium">{platform.label}</span>
                      {selectedPlatforms.includes(platform.id) && (
                        <svg className="w-4 h-4 ml-auto text-primary-interactive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Carousel Look */}
              {selectedPlatforms.includes('instagram') && (
                <div>
                  <StylePicker
                    label="Carousel Look"
                    options={CAROUSEL_STYLE_OPTIONS}
                    value={carouselDesignOption}
                    onChange={(v) => handleDesignOptionChange(v as CarouselDesignOption)}
                    columns={5}
                    aspect="square"
                  />

                  {carouselDesignOption === 'upload' && (
                    <div className="mt-3 space-y-2">
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
                            ? 'border-primary-interactive bg-primary-interactive/10 scale-[1.01]'
                            : 'border-border hover:border-primary-interactive hover:bg-primary-interactive/5'
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
                            <svg className="w-4 h-4 text-primary-interactive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
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
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Drag & drop or click to upload background image</span>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              )}

              {repurposeError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                  {repurposeError}
                </div>
              )}

              {selectedVideoForRepurpose.extraction_status !== 'completed' && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-400">
                    Transcript will be automatically extracted when you click Generate
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

              <p className="text-sm text-center text-muted-foreground">Usually takes 30-60 seconds</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
