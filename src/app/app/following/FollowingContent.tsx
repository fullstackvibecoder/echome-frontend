'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { api, MonitoredCreator, ContentHistoryEntry } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { showErrorToast } from '@/lib/toast';
import { Platform, BackgroundConfig, DesignPreset } from '@/types';
import { InfoTooltip } from '@/components/info-tooltip';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { AppPageHeader } from '@/components/app-page-header';
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

// Carousel design preset options — visual thumbnail grid
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

export default function FollowingContent() {
  const [creators, setCreators] = useState<MonitoredCreator[]>([]);
  const [allContent, setAllContent] = useState<ContentWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [contentLoadingErrors, setContentLoadingErrors] = useState<Record<string, string>>({});

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

  // Retry utility for handling timeout and network errors
  const retryOperation = async <T,>(
    operation: () => Promise<T>,
    maxRetries: number = 2,
    delay: number = 1000
  ): Promise<T | null> => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        const isRetryable = 
          error?.code === 'ECONNABORTED' || // Timeout
          error?.code === 'ERR_NETWORK' || // Network error
          error?.message?.includes('timeout') ||
          error?.message?.includes('network') ||
          (error?.response?.status >= 500 && error?.response?.status < 600); // Server errors

        if (attempt === maxRetries || !isRetryable) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        console.warn(`Retrying operation (attempt ${attempt + 1}/${maxRetries + 1})...`);
      }
    }
    return null;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setContentLoadingErrors({});

      // Load creators with retry logic
      const creatorsResponse = await retryOperation(
        async () => api.creators.list(),
        2, // 2 retries
        1000 // 1 second delay
      );

      if (creatorsResponse?.success) {
        setCreators(creatorsResponse.creators);

        // Load all content from all creators with enhanced error handling
        await loadAllContent(creatorsResponse.creators);
      } else {
        throw new Error('Failed to load creators list');
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      
      // Enhanced error messaging
      let errorMessage = 'Failed to load data';
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again or check your connection.';
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('network')) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      } else if (err?.response?.status >= 500) {
        errorMessage = 'Server error. Please try again in a few moments.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const loadAllContent = async (creatorsList: MonitoredCreator[]) => {
    try {
      setLoadingContent(true);
      setContentLoadingErrors({});

      // Use Promise.allSettled instead of Promise.all to handle individual failures
      const contentPromises = creatorsList.map(async (creator) => {
        try {
          const response = await retryOperation(
            async () => api.creators.getContent(creator.id, 10),
            1, // 1 retry for content loading
            1000
          );

          if (response?.success) {
            return {
              creatorId: creator.id,
              success: true,
              content: response.content.map((c: ContentHistoryEntry) => ({ ...c, creator })),
            };
          } else {
            return {
              creatorId: creator.id,
              success: false,
              error: 'Failed to load content',
              content: [],
            };
          }
        } catch (error: any) {
          console.error(`Failed to load content for ${creator.creator_name || creator.id}:`, error);
          
          let errorMessage = 'Loading failed';
          if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
            errorMessage = 'Timed out';
          } else if (error?.code === 'ERR_NETWORK') {
            errorMessage = 'Network error';
          } else if (error?.response?.status >= 500) {
            errorMessage = 'Server error';
          }

          return {
            creatorId: creator.id,
            success: false,
            error: errorMessage,
            content: [],
          };
        }
      });

      const results = await Promise.allSettled(contentPromises);
      const flatContent: ContentWithCreator[] = [];
      const errors: Record<string, string> = {};

      results.forEach((result, index) => {
        const creator = creatorsList[index];
        
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.success) {
            flatContent.push(...data.content);
          } else {
            errors[creator.id] = data.error;
          }
        } else {
          console.error(`Promise rejected for creator ${creator.creator_name || creator.id}:`, result.reason);
          errors[creator.id] = 'Request failed';
        }
      });

      // Update errors state
      setContentLoadingErrors(errors);

      // Sort by created_at descending (newest first)
      flatContent.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setAllContent(flatContent);

      // Show toast if some content failed to load but not all
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failureCount = Object.keys(errors).length;
      
      if (failureCount > 0 && successCount > 0) {
        showErrorToast(
          new Error(`Failed to load content from ${failureCount} creator${failureCount > 1 ? 's' : ''}`),
          'loading some creator content'
        );
      }
    } catch (err) {
      console.error('Failed to load content:', err);
      showErrorToast(err, 'loading creator content');
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
          // Content loading failed but creator was followed successfully - not critical
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
      setPolling(creatorId);
      
      // Use retry logic for individual creator polling
      const response = await retryOperation(
        async () => api.creators.poll(creatorId),
        1, // 1 retry for individual poll
        1500 // 1.5 second delay
      );
      
      if (response?.success && response.newContentCount > 0) {
        // Reload all content
        await loadAllContent(creators);
      }
      
      // Update creator in list
      try {
        const updatedCreators = await retryOperation(
          async () => api.creators.list(),
          1
        );
        if (updatedCreators?.success) {
          setCreators(updatedCreators.creators);
        }
      } catch (updateErr) {
        console.warn('Failed to update creators list after poll:', updateErr);
        // Non-critical error, don't show toast
      }
    } catch (err: any) {
      console.error('Failed to poll:', err);
      
      let errorMessage = 'Failed to sync creator';
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        errorMessage = 'Sync timed out. This creator may take longer to sync.';
      } else if (err?.code === 'ERR_NETWORK') {
        errorMessage = 'Network error during sync.';
      }
      
      showErrorToast(new Error(errorMessage), 'syncing creator content');
    } finally {
      setPolling(null);
    }
  };

  const handlePollAll = async () => {
    try {
      setPollingAll(true);
      
      // Use retry logic for poll all operation
      await retryOperation(
        async () => api.creators.pollAll(),
        1, // 1 retry for poll all
        2000 // 2 second delay
      );
      
      // Reload all data after polling
      await loadData();
    } catch (err: any) {
      console.error('Failed to poll all:', err);
      
      let errorMessage = 'Failed to sync creators';
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        errorMessage = 'Sync timed out. Some creators may take longer to sync.';
      } else if (err?.code === 'ERR_NETWORK') {
        errorMessage = 'Network error during sync. Please check your connection.';
      }
      
      showErrorToast(new Error(errorMessage), 'syncing all creators');
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
    setCarouselDesignOption('auto'); // Default to auto
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
      const designPreset: DesignPreset = (carouselDesignOption === 'upload' || carouselDesignOption === 'video-snapshot')
        ? 'auto'
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
        <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-error/20 flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-error" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-error font-medium mb-1">
                {error.includes('timeout') || error.includes('timed out') ? 'Request Timed Out' : 'Loading Error'}
              </p>
              <p className="text-error/80 text-sm mb-3">{error}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setError(null);
                    setRetryCount(0);
                    loadData();
                  }}
                  disabled={loading}
                  className="bg-error/20 hover:bg-error/30 text-error px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Retrying...' : 'Try Again'}
                </button>
                {retryCount > 0 && (
                  <span className="text-error/60 text-xs">
                    Retry attempt: {retryCount}
                  </span>
                )}
                {error.includes('timeout') && (
                  <span className="text-error/60 text-xs">
                    This operation is taking longer than expected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Loading Errors */}
      {Object.keys(contentLoadingErrors).length > 0 && !loading && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-amber-700 dark:text-amber-400 font-medium mb-1">
                Some creators couldn't load
              </p>
              <p className="text-amber-600 dark:text-amber-300 text-sm mb-2">
                Failed to load content from {Object.keys(contentLoadingErrors).length} creator{Object.keys(contentLoadingErrors).length > 1 ? 's' : ''}
              </p>
              <button
                onClick={() => {
                  setContentLoadingErrors({});
                  loadAllContent(creators);
                }}
                disabled={loadingContent}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                Retry Failed Creators
              </button>
            </div>
          </div>
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

                {/* Carousel Look — visual thumbnail picker */}
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

                    {/* Upload zone for "My Own Image" */}
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
                          ) : (
                            <span className="text-muted-foreground text-sm">Drag & drop or click to upload background image</span>
                          )}
                        </label>
                      </div>
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
