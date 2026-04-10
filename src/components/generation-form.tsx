'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { InputType, Platform, BackgroundConfig, DesignPreset } from '@/types';
import { api, ContentHistoryEntry, VideoUpload, VideoClip, ContentKit, ClipJob, MusicTrackSummary, ReelTemplate } from '@/lib/api-client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { InfoTooltip } from './info-tooltip';
import type { StyleOption } from './style-picker';
import { setActiveGeneration, useActiveGeneration } from './generation-banner';
import { useGenerationProgress, isVideoStep } from '@/hooks/useGenerationProgress';
import { showErrorToast } from '@/lib/toast';
import { Upload, Download, Headphones, Brain, Scissors, MessageSquareText, Sparkles, CheckCircle, ShieldCheck, Loader2, Film, PenLine, Mic, ArrowRight, ArrowLeft, type LucideIcon } from 'lucide-react';

/**
 * Extract error message from various error types (axios, standard Error, etc.)
 * Backend returns errors in format: { success: false, error: { message: "..." } }
 */
function getErrorMessage(err: unknown): string {
  // Check for axios error with response data
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as AxiosError<{ error?: { message?: string }; message?: string }>;
    const responseData = axiosErr.response?.data;
    if (responseData?.error?.message) {
      return responseData.error.message;
    }
    if (responseData?.message) {
      return responseData.message;
    }
  }
  // Standard Error object
  if (err instanceof Error) {
    const msg = err.message;
    // Translate raw upload/network errors into user-friendly messages
    if (msg.includes('Server responded with 0') || msg.includes('Mux upload failed')) {
      return 'Video upload was interrupted. Please check your connection and try again.';
    }
    if (msg.includes('transcoding timed out')) {
      return 'Video processing is taking longer than expected. Your video may still be processing — check your library in a few minutes.';
    }
    if (msg.includes('transcoding failed')) {
      return 'Video processing failed. Please try uploading again or use a different video format.';
    }
    return msg;
  }
  // Fallback
  return 'An unexpected error occurred';
}

// ============================================
// VOICE INPUT PANEL - Direct voice recording
// ============================================

type VoiceState = 'idle' | 'recording' | 'transcribing';

function VoiceInputPanel({
  onTranscribed,
  disabled,
}: {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        // Transcribe
        setState('transcribing');
        try {
          const result = await api.kbContent.transcribeVoice(audioBlob);
          if (result.success && result.text) {
            onTranscribed(result.text);
            setState('idle');
            setDuration(0);
          } else {
            throw new Error('No transcription returned');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          setError('Failed to transcribe. Please try again.');
          setState('idle');
        }
      };

      mediaRecorder.start(100);
      setState('recording');

      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  }, [onTranscribed]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  return (
    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
      {state === 'idle' && (
        <>
          <button
            onClick={startRecording}
            disabled={disabled}
            className="w-20 h-20 rounded-full bg-accent hover:bg-accent/90 flex items-center justify-center mx-auto mb-4 transition-all shadow-lg disabled:opacity-50"
          >
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
            </svg>
          </button>
          <p className="text-body text-gray-600 dark:text-gray-300 mb-2">
            Click to start recording
          </p>
          <p className="text-small text-gray-600 dark:text-gray-300">
            Speak your content idea and we&apos;ll transcribe it
            <InfoTooltip text="Speak naturally about your content idea. We'll transcribe your words and generate content from them." />
          </p>
        </>
      )}

      {state === 'recording' && (
        <>
          <button
            onClick={stopRecording}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center mx-auto mb-4 transition-all shadow-lg animate-pulse"
          >
            <span className="w-8 h-8 bg-white rounded-md" />
          </button>
          <p className="text-2xl font-bold text-red-500 mb-1">
            {formatDuration(duration)}
          </p>
          <p className="text-body text-gray-600 dark:text-gray-300">
            Recording... Click to stop
          </p>
          <div className="flex justify-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${10 + ((i * 17 + 7) % 20)}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {state === 'transcribing' && (
        <>
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body text-gray-600 dark:text-gray-300">
            Transcribing your voice...
          </p>
        </>
      )}

      {error && (
        <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-small text-error">{error}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// VIDEO PROCESSING TIPS - Engaging messages per stage
// ============================================

type VideoSourceType = 'upload' | 'youtube' | 'instagram' | 'url' | 'loom' | 'zoom';

const FIRST_STEP_BY_SOURCE: Record<VideoSourceType, { title: string; description: string; icon: LucideIcon }> = {
  upload:    { title: 'Uploading video',      description: 'Sending your video to our processing servers...', icon: Upload },
  youtube:   { title: 'Downloading video',    description: 'Fetching video from YouTube...',                  icon: Download },
  instagram: { title: 'Downloading video',    description: 'Fetching video from Instagram...',                icon: Download },
  loom:      { title: 'Downloading video',    description: 'Fetching video from Loom...',                     icon: Download },
  zoom:      { title: 'Downloading video',    description: 'Fetching video from Zoom...',                     icon: Download },
  url:       { title: 'Downloading video',    description: 'Fetching video from URL...',                      icon: Download },
};

function getVideoProcessingStages(source: VideoSourceType): Array<{
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
}> {
  const first = FIRST_STEP_BY_SOURCE[source];
  return [
    { key: 'uploading',    icon: first.icon,       title: first.title,              description: first.description },
    { key: 'transcribing', icon: Headphones,       title: 'Transcribing audio',     description: 'Converting speech to text with speaker detection.' },
    { key: 'analyzing',    icon: Brain,            title: 'Analyzing content',      description: 'Identifying the most engaging moments in your video.' },
    { key: 'extracting',   icon: Scissors,         title: 'Extracting clips',       description: 'Cutting highlight clips optimized for social media.' },
    { key: 'captioning',   icon: MessageSquareText, title: 'Adding captions',       description: 'Generating word-level captions for accessibility.' },
    { key: 'generating',   icon: Sparkles,         title: 'Generating content kit', description: 'Writing platform-optimized posts from your transcript.' },
  ];
}

// Lookup map — built from upload stages as default, overridden at render time
function getStagesMap(source: VideoSourceType) {
  const stages = getVideoProcessingStages(source);
  return Object.fromEntries(stages.map(s => [s.key, s])) as Record<string, ReturnType<typeof getVideoProcessingStages>[number]>;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins === 0) return `${seconds}s`;
  return `${mins} min`;
}

// Rotating messages shown during YouTube downloads to keep users engaged.
// YouTube throttles external servers, so downloads can take up to 30 minutes
// depending on video length. These messages explain what's happening.
const YOUTUBE_DOWNLOAD_MESSAGES = [
  'YouTube throttles external servers, so downloads can take up to 30 minutes for longer videos.',
  'Still pulling your video — YouTube intentionally slows down non-browser downloads.',
  'Longer videos take longer to fetch. A 1-hour video can take 15-25 minutes to download.',
  'You can safely leave this tab open — we\'ll keep working in the background.',
  'The download speed depends on YouTube\'s current throttling. Hang tight.',
  'Once the download finishes, transcription and content generation are much faster.',
  'Some days YouTube is faster than others. Today might be one of the slower days.',
  'We\'re fetching the highest quality version available so your clips look great.',
];

/**
 * Rotates through an array of messages every N seconds.
 */
function useRotatingMessage(messages: string[], intervalMs: number = 6000): string {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [messages.length, intervalMs]);
  return messages[index];
}

/**
 * YouTube download banner with rotating engagement messages.
 * Shown during the 'uploading' stage when the source is YouTube, because
 * YouTube throttles external downloads and this can take up to 30 minutes.
 */
function YouTubeDownloadBanner() {
  const message = useRotatingMessage(YOUTUBE_DOWNLOAD_MESSAGES, 6000);
  return (
    <div className="mt-4 flex items-start gap-2.5 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <Loader2 className="w-4 h-4 text-amber-500 flex-shrink-0 animate-spin mt-0.5" />
      <div className="text-xs text-gray-600 dark:text-gray-300 leading-snug">
        <p className="mb-1">
          <span className="text-amber-500 font-medium">Downloading from YouTube — this can take up to 30 minutes</span> depending on video length.
        </p>
        <p className="transition-opacity duration-500" key={message}>
          {message}
        </p>
      </div>
    </div>
  );
}

// Carousel design preset options — visual thumbnail grid
// Carousel style is now selected post-generation in the content kit editor

// Caption style options — visual thumbnail grid (video input only)
type CaptionStyleOption = 'modern' | 'classic' | 'bold' | 'minimal' | 'highlight' | 'karaoke' | 'underline' | 'word_by_word';

const CAPTION_STYLE_GRID: StyleOption[] = [
  { value: 'modern', label: 'Modern', thumbnail: '/style-previews/captions/modern.svg', badge: 'Popular' },
  { value: 'bold', label: 'Big & Bold', thumbnail: '/style-previews/captions/big-bold.svg' },
  { value: 'highlight', label: 'Color Pop', thumbnail: '/style-previews/captions/color-pop.svg' },
  { value: 'karaoke', label: 'Karaoke', thumbnail: '/style-previews/captions/karaoke.svg' },
  { value: 'underline', label: 'Underline', thumbnail: '/style-previews/captions/underline.svg' },
  { value: 'word_by_word', label: 'One at a Time', thumbnail: '/style-previews/captions/one-at-a-time.svg' },
  { value: 'classic', label: 'Subtitle Bar', thumbnail: '/style-previews/captions/subtitle-bar.svg' },
  { value: 'minimal', label: 'Clean & Simple', thumbnail: '/style-previews/captions/clean-simple.svg' },
];

interface FirstGenerationProps {
  onGenerate: (
    input: string,
    inputType: InputType,
    platforms: Platform[],
    carouselBackground?: BackgroundConfig,
    carouselBackgroundFile?: File,
    designPreset?: DesignPreset
  ) => void;
  onRepurpose?: (
    contentId: string,
    platforms: Platform[],
    options?: { designPreset?: DesignPreset; carouselBackground?: BackgroundConfig }
  ) => void;
  activeVoice?: { id: string; name: string; profileRole?: string; knowledgeBaseId?: string };
  onVideoProcessing?: (data: {
    upload: VideoUpload;
    clips: VideoClip[];
    contentKit: ContentKit | null;
    job?: ClipJob;
  }) => void;
  generating: boolean;
  isQuotaError?: boolean;
}

const ALL_PLATFORMS: Platform[] = [
  'instagram',
  'linkedin',
  'blog',
  'email',
  'tiktok',
  'video-script',
];

// Extended input type to include repurpose and url
type ExtendedInputType = InputType | 'repurpose' | 'url';

export function GenerationForm({
  onGenerate,
  onRepurpose,
  onVideoProcessing,
  generating,
  isQuotaError: quotaErrorFromParent,
  activeVoice,
}: FirstGenerationProps) {
  const [input, setInput] = useState('');
  const [showModeSelector, setShowModeSelector] = useState(true);
  const [inputType, setInputType] = useState<ExtendedInputType>('video');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoDragActive, setVideoDragActive] = useState(false);
  const formCardRef = useRef<HTMLDivElement>(null);

  // Video snapshot state (used for clip finder)
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);

  // Caption style state
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleOption>('modern');

  // Reel configuration state
  const [reelTemplate, setReelTemplate] = useState<string>('auto');
  const [reelMusicTrackId, setReelMusicTrackId] = useState<string>('auto');
  const [musicTracks, setMusicTracks] = useState<MusicTrackSummary[]>([]);
  const [reelTemplates, setReelTemplates] = useState<ReelTemplate[]>([]);
  const [loadingReelOptions, setLoadingReelOptions] = useState(false);

  // Repurpose state
  const [pendingContent, setPendingContent] = useState<ContentHistoryEntry[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentHistoryEntry | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // URL state
  const [videoUrl, setVideoUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [processingUrl, setProcessingUrl] = useState(false);

  // Subscription & free generation state
  const { isSubscribed, isTrial, isFreeUser, freeGenerationsUsed, freeGenerationsLimit, freeGenerationsRemaining, canGenerate, refresh: refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const router = useRouter();

  // Refresh subscription state when a quota error comes back from the backend
  // This updates freeGenerationsRemaining so the paywall card replaces the button
  useEffect(() => {
    if (quotaErrorFromParent) {
      refreshSubscription();
    }
  }, [quotaErrorFromParent, refreshSubscription]);

  // Free users who exhausted generations can't use video/repurpose - switch to text if needed
  const freeUserExhausted = isFreeUser && freeGenerationsRemaining <= 0;
  useEffect(() => {
    if (freeUserExhausted && (inputType === 'video' || inputType === 'repurpose' || inputType === 'url')) {
      setInputType('text');
    }
  }, [freeUserExhausted, inputType]);

  // Rotating microcopy for upload zone
  const UPLOAD_HINTS = [
    'Drop a podcast, interview, or talking-head video',
    'Works best with 2–60 minute videos',
    'We\u2019ll find the best clips automatically',
    'One video = clips, posts, carousels, and emails',
  ];
  const [hintIndex, setHintIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setHintIndex(prev => (prev + 1) % UPLOAD_HINTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Video processing state (Clip Finder)
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [videoProcessingStatus, setVideoProcessingStatus] = useState<string | null>(null);
  const [videoProcessingProgress, setVideoProcessingProgress] = useState(0);
  const [videoProcessingStage, setVideoProcessingStage] = useState<string>('uploading');
  const [videoSourceType, setVideoSourceType] = useState<VideoSourceType>('upload');
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // SSE progress (from the generation progress stream).
  // NOTE: We deliberately do NOT use this to drive the inline stage anymore —
  // the poller (pollProcessingStatus) is the single source of truth for the
  // stage key. Mixing SSE-driven and poll-driven stage updates caused flicker
  // (SSE would set 'downloading' → poll would set 'uploading' → SSE back to
  // 'downloading'…). The poller reads upload.status which progresses cleanly:
  // uploading → transcribing → analyzing → extracting → generating → completed.
  //
  // SSE is still useful for:
  //  - Status MESSAGE text ("Downloading video...", "Transcribing audio...")
  //  - Completion/error detection
  //  - Fine-grained % inside a stage
  const { activeGeneration } = useActiveGeneration();
  const { progress: sseProgress, isComplete: sseComplete, hasError: sseError } = useGenerationProgress(
    activeGeneration?.requestId ?? null
  );

  // SSE message sync — only updates the human-readable status text, not the stage key.
  useEffect(() => {
    if (!sseProgress || !videoProcessing) return;
    if (sseProgress.step === 'error') return;
    if (sseProgress.message) {
      setVideoProcessingStatus(sseProgress.message);
    }
  }, [sseProgress, videoProcessing]);

  // Handle SSE completion/error
  useEffect(() => {
    if (!videoProcessing) return;
    if (sseComplete) {
      setVideoProcessingStage('completed');
      setVideoProcessingProgress(100);
    }
  }, [sseComplete, videoProcessing]);

  // Load pending content when repurpose mode is selected
  useEffect(() => {
    if (inputType === 'repurpose') {
      loadPendingContent();
    }
  }, [inputType]);

  // Load reel templates and music tracks when video mode is selected
  useEffect(() => {
    if (inputType === 'video' || inputType === 'url') {
      loadReelOptions();
    }
  }, [inputType]);

  const loadReelOptions = async () => {
    if (reelTemplates.length > 0 && musicTracks.length > 0) return; // Already loaded

    try {
      setLoadingReelOptions(true);
      const [templatesRes, musicRes] = await Promise.all([
        api.reels.listTemplates(),
        api.reels.listMusic({ limit: 20 }),
      ]);

      if (templatesRes.success && templatesRes.data) {
        setReelTemplates(templatesRes.data);
      }
      if (musicRes.success && musicRes.data) {
        setMusicTracks(musicRes.data);
      }
    } catch (error) {
      console.error('Failed to load reel options:', error);
    } finally {
      setLoadingReelOptions(false);
    }
  };

  const loadPendingContent = async () => {
    try {
      setLoadingContent(true);
      const response = await api.creators.getPendingRepurpose(10);
      if (response.success) {
        setPendingContent(response.content);
      }
    } catch (error) {
      console.error('Failed to load pending content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  // Cleanup polling and tip rotation intervals on unmount
  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, []);

  // Elapsed time tracker during video processing
  useEffect(() => {
    if (videoProcessing) {
      const startTime = processingStartTime || Date.now();
      if (!processingStartTime) setProcessingStartTime(startTime);

      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      setProcessingStartTime(null);
      setElapsedSeconds(0);
    }

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [videoProcessing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Process video through Clip Finder pipeline
  const processVideoWithClipFinder = async (
    file?: File,
    sourceType?: VideoSourceType,
    sourceUrl?: string
  ) => {
    try {
      const effectiveSource = sourceType || 'upload';
      setVideoSourceType(effectiveSource);
      setVideoProcessing(true);
      setVideoProcessingStage('uploading');
      setVideoProcessingStatus(FIRST_STEP_BY_SOURCE[effectiveSource].title + '...');
      setVideoProcessingProgress(0);
      setUploadError(null);

      // Scroll the form into view so user sees the progress
      setTimeout(() => {
        formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      // Step 1: Upload the video
      const uploadResponse = await api.clips.upload(
        {
          file,
          sourceType: sourceType || 'upload',
          sourceUrl,
        },
        (progress) => {
          setUploadProgress(progress);
          setVideoProcessingProgress(Math.min(progress * 0.3, 30)); // Upload is 30% of progress
        }
      );

      if (!uploadResponse.success || !uploadResponse.data?.upload) {
        throw new Error('Failed to upload video');
      }

      const upload = uploadResponse.data.upload;
      setCurrentUploadId(upload.id); // Save for snapshot picker
      setVideoProcessingStatus('Starting clip extraction...');
      setVideoProcessingProgress(35);

      // Carousel style is selected post-generation; use tweet-style default
      const designPreset: DesignPreset = 'tweet-style';

      // Step 2: Start processing
      const processResponse = await api.clips.process(upload.id, {
        generateContent: true, // Generate content kit as part of processing
        designPreset, // New design preset system
        captionStyle, // Pass selected caption style
        // Reel configuration
        reelTemplate: reelTemplate === 'auto' ? undefined : reelTemplate,
        reelMusicTrackId: reelMusicTrackId === 'auto' ? undefined : reelMusicTrackId === 'none' ? null : reelMusicTrackId,
        generateReel: false, // Old reel content generation not needed (using carousel-reel instead)
      });

      if (!processResponse.success || !processResponse.data?.jobId) {
        throw new Error('Failed to start processing');
      }

      const jobId = processResponse.data.jobId;
      setVideoProcessingStatus('Transcribing audio...');
      setVideoProcessingProgress(40);

      // Wire video processing into the global progress drawer
      setActiveGeneration(upload.id);

      // Step 3: Poll for completion
      await pollProcessingStatus(upload.id, jobId);

    } catch (err) {
      console.error('Video processing error:', err);
      const errorMsg = getErrorMessage(err);
      setUploadError(errorMsg);
      setVideoProcessing(false);
      setVideoProcessingStatus(null);
      showErrorToast(err, 'processing video');
    }
  };

  // Poll for processing status
  const pollProcessingStatus = async (uploadId: string, jobId: string) => {
    const progressByStatus: Record<string, number> = {
      pending: 35,
      uploading: 40,
      transcribing: 50,
      analyzing: 60,
      extracting: 70,
      captioning: 80,
      generating: 90,
      completed: 100,
    };

    return new Promise<void>((resolve, reject) => {
      let consecutiveErrors = 0;

      const checkStatus = async () => {
        try {
          const response = await api.clips.get(uploadId);

          if (response.success && response.data) {
            const { upload, clips, contentKit } = response.data;
            const status = upload.status;

            // Only reset consecutiveErrors on non-failed statuses.
            // Otherwise a 'failed' status would indefinitely reset its own counter.
            if (status !== 'failed') {
              consecutiveErrors = 0;
            }

            // Map backend upload.status → inline stage key.
            // Backend statuses that don't have a matching stage (e.g. 'pending',
            // 'processing', unknown) should NOT reset the stage — we keep whatever
            // the previous stage was. This prevents flicker when the backend
            // reports a transitional status the UI doesn't know about.
            const stageInfo = getStagesMap(videoSourceType)[status];
            if (stageInfo) {
              setVideoProcessingStage(status);
              setVideoProcessingStatus(stageInfo.title);
            }
            if (progressByStatus[status] !== undefined) {
              setVideoProcessingProgress(progressByStatus[status]);
            }

            if (status === 'completed') {
              if (processingIntervalRef.current) {
                clearInterval(processingIntervalRef.current);
              }
              setVideoProcessing(false);
              setVideoProcessingStatus(null);

              // Notify parent with results
              if (onVideoProcessing) {
                onVideoProcessing({
                  upload,
                  clips,
                  contentKit,
                });
              }
              resolve();
            } else if (status === 'failed') {
              // Backend has set status to failed. Surface the error quickly —
              // the clip-finder pipeline already exhausted its internal retry/fallback
              // chain (Apify → yt-dlp → etc.) before setting this status.
              // Wait for 2 consecutive failed polls to avoid a transient stale read.
              consecutiveErrors++;
              if (consecutiveErrors >= 2) {
                if (processingIntervalRef.current) {
                  clearInterval(processingIntervalRef.current);
                }
                setVideoProcessing(false);
                setVideoProcessingStatus(null);
                reject(new Error(upload.statusMessage || 'Video processing failed'));
              }
            }
          } else {
            // Response indicates failure (e.g. 404 not found)
            consecutiveErrors++;
            if (consecutiveErrors >= 3) {
              if (processingIntervalRef.current) {
                clearInterval(processingIntervalRef.current);
              }
              setVideoProcessing(false);
              reject(new Error('Upload not found'));
            }
          }
        } catch (err) {
          console.error('Status check error:', err);
          consecutiveErrors++;
          // Stop polling after 3 consecutive errors
          if (consecutiveErrors >= 3) {
            if (processingIntervalRef.current) {
              clearInterval(processingIntervalRef.current);
            }
            setVideoProcessing(false);
            reject(new Error('Lost connection to processing status'));
          }
        }
      };

      // Start polling every 3 seconds
      processingIntervalRef.current = setInterval(checkStatus, 3000);
      // Initial check
      checkStatus();
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    const WARN_SIZE = 500 * 1024 * 1024; // 500MB

    if (file.size > MAX_SIZE) {
      const sizeMB = Math.round(file.size / (1024 * 1024));
      setUploadError(`File is too large (${sizeMB}MB). Maximum is 2GB. Compress it with a free tool like HandBrake (see guide: /guides/compress-video) or paste a YouTube/Vimeo URL instead.`);
      return;
    }

    if (file.size > WARN_SIZE) {
      const sizeMB = Math.round(file.size / (1024 * 1024));
      const estMinutes = Math.round(file.size / (2 * 1024 * 1024) / 60); // ~2MB/s estimate
      setUploadError(`This is a ${sizeMB}MB file — upload may take ${estMinutes}+ min. For faster, more reliable uploads, compress it first (see guide: /guides/compress-video) or paste a YouTube/Vimeo URL instead.`);
    } else {
      setUploadError(null);
    }

    setSelectedFile(file);
  };

  // Shared drag-and-drop helpers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleVideoDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(true);
  };

  const handleVideoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate if we left the drop zone (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setVideoDragActive(false);
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVideoDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setUploadError(null);
    } else if (file) {
      setUploadError('Please drop a video file (MP4, MOV, AVI, or WebM)');
    }
  };

  const handleGenerate = async () => {
    // For repurpose mode
    if (inputType === 'repurpose') {
      if (!selectedContent || !onRepurpose) return;
      onRepurpose(selectedContent.id, ALL_PLATFORMS, { designPreset: 'tweet-style' });
      return;
    }

    // For URL input - process through Clip Finder
    if (inputType === 'url') {
      const url = videoUrl.trim();
      if (!url || !isValidUrl(url)) {
        setUrlError('Please enter a valid video URL (YouTube, Loom, Zoom, Vimeo, or Instagram)');
        return;
      }

      // Determine source type from URL
      const isYouTube = /youtube\.com|youtu\.be/.test(url);
      const isInstagram = /instagram\.com/.test(url);
      const isLoom = /loom\.com/.test(url);
      const isZoom = /zoom\.us/.test(url);
      const sourceType = isYouTube ? 'youtube' : isInstagram ? 'instagram' : isLoom ? 'loom' : isZoom ? 'zoom' : 'url';

      try {
        await processVideoWithClipFinder(undefined, sourceType, url);
        setVideoUrl('');
        clearFile();
      } catch (err) {
        setUrlError(err instanceof Error ? err.message : 'Failed to process video URL');
      }
      return;
    }

    // For text input
    if (inputType === 'text') {
      if (!input.trim()) return;
      onGenerate(input, inputType as InputType, ALL_PLATFORMS, undefined, undefined, 'tweet-style');
      return;
    }

    // For video input - process through Clip Finder
    if (inputType === 'video') {
      if (!selectedFile) {
        setUploadError('Please select a video file first');
        return;
      }

      try {
        await processVideoWithClipFinder(selectedFile, 'upload');
        clearFile();
      } catch (err) {
        const errorMsg = getErrorMessage(err);
        setUploadError(errorMsg);
        showErrorToast(err, 'uploading video');
      }
      return;
    }

    // Note: Audio input is handled by VoiceInputPanel which transcribes
    // and switches to text mode, so audio case never reaches here
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    setSelectedContent(null);
    setCurrentUploadId(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const isValidUrl = (url: string) => {
    // yt-dlp supports 1000+ sites — we validate the most common ones client-side
    // and let the backend handle the rest via yt-dlp
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)/, // YouTube
      /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|p)\//, // Instagram
      /^(https?:\/\/)?(www\.)?vimeo\.com\/\d+/, // Vimeo
      /^(https?:\/\/)?(www\.)?loom\.com\/share\//, // Loom
      /^(https?:\/\/)?(www\.)?zoom\.us\/rec\//, // Zoom cloud recordings
      /^(https?:\/\/)?(www\.)?streamyard\.com\//, // StreamYard
      /^(https?:\/\/)?(www\.)?riverside\.fm\//, // Riverside
      /^(https?:\/\/)?(www\.)?(twitch\.tv|clips\.twitch\.tv)\//, // Twitch
      /^(https?:\/\/)?(www\.)?tiktok\.com\/@[^/]+\/video\//, // TikTok
      /^(https?:\/\/)?(www\.)?facebook\.com\/.+\/videos\//, // Facebook
      /^https?:\/\/.+\.(mp4|mov|webm)(\?|$)/i, // Direct video URLs
    ];
    return patterns.some(p => p.test(url));
  };

  // Voice mode always shows ready since user can click to record
  const isReady = inputType === 'text'
    ? input.trim().length > 0
    : inputType === 'audio'
    ? true // Voice recording handles its own flow
    : inputType === 'url'
    ? videoUrl.trim().length > 0 && isValidUrl(videoUrl.trim())
    : inputType === 'repurpose'
    ? selectedContent !== null
    : selectedFile !== null;

  const selectMode = (mode: ExtendedInputType) => {
    setInputType(mode);
    setShowModeSelector(false);
    clearFile();
  };

  // ─── MODE SELECTOR (3 equal cards) ───
  if (showModeSelector && !videoProcessing && !generating && !uploading) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Ambient background */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-[120px] -z-10 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-purple/5 blur-[100px] -z-10 rounded-full pointer-events-none" />

        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary mb-3">
            What are we working with?
          </h2>
          <p className="text-base text-text-secondary max-w-lg mx-auto">
            Pick your source material. Echo handles the rest.
          </p>
          {activeVoice && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mt-3 bg-primary/5 border border-primary/15 rounded-full text-sm">
              <span className="text-primary font-semibold">Voice:</span>
              <span className="font-bold">{activeVoice.name}</span>
            </div>
          )}
        </div>

        {/* 3 Equal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload Video */}
          <button
            onClick={() => selectMode('video')}
            className="group relative flex flex-col items-center text-center p-8 rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent/40 transition-all duration-300 hover:-translate-y-2 hover:bg-white/[0.05]"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center mb-6 group-hover:bg-accent group-hover:scale-110 transition-all duration-300">
              <Film className="w-8 h-8 text-accent group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Upload Video</h3>
            <p className="text-sm text-text-secondary leading-relaxed">Drop a video or paste a YouTube, Loom, Zoom, or Vimeo link.</p>
            <div className="mt-6 flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
              Get Started <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* Type or Paste */}
          <button
            onClick={() => selectMode('text')}
            className="group relative flex flex-col items-center text-center p-8 rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent-purple/40 transition-all duration-300 hover:-translate-y-2 hover:bg-white/[0.05]"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent-purple/15 flex items-center justify-center mb-6 group-hover:bg-accent-purple group-hover:scale-110 transition-all duration-300">
              <PenLine className="w-8 h-8 text-accent-purple group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Type or Paste</h3>
            <p className="text-sm text-text-secondary leading-relaxed">Describe an idea, paste an article, or write a prompt.</p>
            <div className="mt-6 flex items-center gap-2 text-accent-purple text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
              Open Editor <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* Record Voice */}
          <button
            onClick={() => selectMode('audio')}
            className="group relative flex flex-col items-center text-center p-8 rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-accent-yellow/40 transition-all duration-300 hover:-translate-y-2 hover:bg-white/[0.05]"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent-yellow/15 flex items-center justify-center mb-6 group-hover:bg-accent-yellow group-hover:scale-110 transition-all duration-300">
              <Mic className="w-8 h-8 text-accent-yellow group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Record Voice</h3>
            <p className="text-sm text-text-secondary leading-relaxed">Speak your idea. Echo transcribes and creates from your words.</p>
            <div className="mt-6 flex items-center gap-2 text-accent-yellow text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
              Start Recording <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group max-w-3xl mx-auto">
      {/* Ambient glow behind card */}
      <div className="absolute -inset-2 bg-gradient-to-r from-[#00D4FF]/15 to-[#B794F6]/15 rounded-[2.5rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />

      <div ref={formCardRef} className="relative backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-outline-variant/40 dark:border-white/10 rounded-[2rem] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.04)] hover:shadow-[0_40px_90px_rgba(0,0,0,0.06)] transition-shadow">
        {/* Header — changes per input mode */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => { setShowModeSelector(true); clearFile(); }}
              className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors mb-2"
            >
              <ArrowLeft className="w-3 h-3" /> Change input type
            </button>
            <h2 className="font-headline text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {inputType === 'video' && 'Upload Video'}
              {inputType === 'text' && 'Type or Paste'}
              {inputType === 'audio' && 'Record Voice'}
              {inputType === 'repurpose' && 'Repurpose Content'}
              {inputType === 'url' && 'Import from URL'}
            </h2>
          </div>
          {activeVoice && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/15 rounded-full text-xs">
              <span className="text-primary font-semibold">Voice:</span>
              <span className="font-bold">{activeVoice.name}</span>
            </div>
          )}
        </div>

      {/* ─── Primary Input Area ─── */}
      {inputType === 'repurpose' ? (
        /* Repurpose content list */
        <div className="border-2 border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary border-b border-border">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Select content to repurpose</span>
            <button
              onClick={() => { setInputType('video'); clearFile(); }}
              className="text-xs text-accent hover:underline"
            >
              Back to create
            </button>
          </div>
          {loadingContent ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-body text-gray-600 dark:text-gray-300">Loading content from followed creators...</p>
            </div>
          ) : pendingContent.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-5xl mb-4">👥</div>
              <p className="text-body text-gray-600 dark:text-gray-300 mb-4">
                No content available for repurposing yet
              </p>
              <p className="text-small text-gray-600 dark:text-gray-300">
                Follow creators in the Following page to see their content here
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {pendingContent.map((content) => (
                <button
                  key={content.id}
                  onClick={() => setSelectedContent(content)}
                  className={`
                    w-full flex items-start gap-4 p-4 text-left transition-all border-b border-border last:border-b-0
                    ${selectedContent?.id === content.id
                      ? 'bg-accent/10 border-l-4 border-l-accent'
                      : 'hover:bg-bg-secondary'}
                  `}
                >
                  {content.thumbnail_url && (
                    <img
                      src={content.thumbnail_url}
                      alt=""
                      className="w-24 h-16 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium line-clamp-2 mb-1">
                      {content.title || 'Untitled Content'}
                    </p>
                    <div className="flex items-center gap-2 text-small text-gray-600 dark:text-gray-300">
                      <span className={content.platform === 'youtube' ? 'text-red-500' : 'text-pink-500'}>
                        {content.platform === 'youtube' ? '▶️' : '📷'}
                      </span>
                      <span className="capitalize">{content.platform}</span>
                      {content.published_at && (
                        <>
                          <span>•</span>
                          <span>{new Date(content.published_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                    {content.extraction_status === 'completed' && content.transcript && (
                      <p className="text-small text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                        {content.transcript.substring(0, 150)}...
                      </p>
                    )}
                    {content.extraction_status === 'pending' && (
                      <p className="text-small text-accent mt-1">
                        ⏳ Transcript extraction pending
                      </p>
                    )}
                  </div>
                  {selectedContent?.id === content.id && (
                    <span className="text-accent text-xl flex-shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : inputType === 'text' ? (
        /* Text input mode */
        <div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your content idea, paste a script, or share a topic..."
            className="w-full h-44 px-5 py-4 bg-surface-container-low border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none text-body"
            disabled={generating}
          />
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">Press ⌘+Enter to generate</p>
        </div>
      ) : inputType === 'audio' ? (
        /* Voice recording mode */
        <VoiceInputPanel
          onTranscribed={(text) => {
            setInput(text);
            setInputType('text');
          }}
          disabled={generating || uploading}
        />
      ) : (
        /* Video upload — the hero input, wrapped in a tinted container */
        <div className="rounded-[1.25rem] bg-surface-container-low dark:bg-white/[0.03] p-1">
          <div
            className={`relative border-2 border-dashed rounded-[1rem] p-8 text-center transition-all duration-300 ${
              videoDragActive
                ? 'border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10'
                : 'border-primary/30 dark:border-primary/25 hover:border-primary/60'
            }`}
            onDragEnter={handleVideoDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleVideoDragLeave}
            onDrop={handleVideoDrop}
          >
            <input
              type="file"
              ref={videoInputRef}
              accept="video/*,.mp4,.mov,.avi,.webm"
              onChange={handleFileSelect}
              className="hidden"
            />
            {videoProcessing ? (
              <div className="py-6 px-2 text-left">
                {/* Vertical Step Timeline */}
                <div className="space-y-0">
                  {getVideoProcessingStages(videoSourceType).map((stage, idx, stages) => {
                    const activeIdx = stages.findIndex(s => s.key === videoProcessingStage);
                    const isCompleted = activeIdx >= 0 ? idx < activeIdx : videoProcessingStage === 'completed';
                    const isActive = idx === activeIdx;
                    const isFuture = !isCompleted && !isActive;
                    const isLast = idx === stages.length - 1;
                    const StageIcon = stage.icon;

                    return (
                      <div key={stage.key} className="flex gap-3">
                        {/* Icon column with connecting line */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                              isCompleted
                                ? 'bg-accent text-white'
                                : isActive
                                ? 'bg-accent/15 border-2 border-accent'
                                : 'bg-bg-secondary border border-border'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : isActive ? (
                              <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                            ) : (
                              <StageIcon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300 opacity-40" />
                            )}
                          </div>
                          {!isLast && (
                            <div
                              className={`w-0.5 flex-1 min-h-[16px] transition-all duration-300 ${
                                isCompleted
                                  ? 'bg-accent'
                                  : isActive
                                  ? 'bg-accent/30'
                                  : 'border-l border-dashed border-border'
                              }`}
                            />
                          )}
                        </div>

                        {/* Text content */}
                        <div className={`pb-3 ${isActive ? 'pb-4' : ''}`}>
                          {isActive ? (
                            <div className="bg-accent/5 rounded-lg px-3 py-2 border-l-2 border-accent -ml-1">
                              <p className="text-sm font-semibold text-accent">{stage.title}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{stage.description}</p>
                            </div>
                          ) : (
                            <p className={`text-sm pt-1 ${
                              isCompleted ? 'font-medium text-foreground' : 'text-gray-600 dark:text-gray-300 opacity-50'
                            }`}>
                              {stage.title}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar with shimmer */}
                <div className="mt-5">
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent-purple rounded-full relative overflow-hidden transition-all duration-700 ease-out"
                      style={{ width: `${Math.max(videoProcessingProgress, 2)}%` }}
                    >
                      <div className="absolute inset-0 progress-shimmer" />
                    </div>
                  </div>
                </div>

                {/* Footer: elapsed + estimate */}
                <div className="flex justify-between mt-3 text-xs text-gray-600 dark:text-gray-300">
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <span className="w-1 h-1 rounded-full bg-accent" />
                    {formatElapsed(elapsedSeconds)} elapsed
                  </span>
                  <span>
                    {videoSourceType === 'youtube' && videoProcessingStage === 'uploading'
                      ? 'Up to 30 min'
                      : 'Usually 5-15 min'}
                  </span>
                </div>

                {/* Navigate-away banner — contextual based on stage */}
                {videoProcessingStage === 'uploading' && videoSourceType === 'youtube' ? (
                  <YouTubeDownloadBanner />
                ) : videoProcessingStage === 'uploading' ? (
                  <div className="mt-4 flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Loader2 className="w-4 h-4 text-amber-500 flex-shrink-0 animate-spin" />
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                      <span className="text-amber-500 font-medium">Please stay on this page</span> while your video uploads. You can navigate away once processing begins.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2.5 px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                      <span className="text-accent font-medium">Safe to navigate away.</span> We&apos;ll notify you when your content kit is ready.
                    </p>
                  </div>
                )}
              </div>
            ) : !selectedFile ? (
              <div className="relative">
                {videoDragActive ? (
                  <>
                    <div className="text-6xl mb-3 animate-bounce">📥</div>
                    <p className="text-xl font-bold bg-gradient-to-r from-[#00D4FF] to-[#B794F6] bg-clip-text text-transparent mb-1">
                      Drop your video here
                    </p>
                    <p className="text-sm text-gray-500">Release to upload</p>
                  </>
                ) : (
                  <>
                    <div className="relative inline-block mb-5">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                    </div>

                    <h3 className="font-headline font-bold text-xl mb-1">Upload Source Video</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 min-h-[20px] transition-opacity duration-500" key={hintIndex}>
                      {UPLOAD_HINTS[hintIndex]}
                    </p>

                    <button
                      onClick={() => videoInputRef.current?.click()}
                      className="aurora-gradient px-8 py-3.5 text-white rounded-xl font-bold text-base hover:shadow-2xl hover:shadow-primary/25 hover:scale-105 active:scale-95 transition-all shadow-lg mb-3"
                      disabled={generating || uploading || videoProcessing}
                    >
                      Select Video File
                    </button>

                    <p className="text-xs text-gray-600 dark:text-gray-300/70 mb-4">
                      MP4, MOV, AVI, WebM • Up to 2GB
                    </p>

                    {/* URL paste — faster than file upload for large videos */}
                    <div className="w-full max-w-full sm:max-w-sm">
                      <p className="text-xs text-gray-600 dark:text-gray-300 text-center mb-2 font-medium">Or paste a video URL (no upload needed)</p>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={videoUrl}
                          onChange={(e) => { setVideoUrl(e.target.value); setUrlError(null); }}
                          placeholder="YouTube, Loom, Zoom, Vimeo, TikTok, Riverside..."
                          className="flex-1 px-3 py-2 rounded-lg bg-[#2A2A2C] border border-[#3A3A3C] text-white text-sm placeholder:text-gray-500 focus:border-[#00D4FF] focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const url = videoUrl.trim();
                            if (!url) return;
                            const isYouTube = /youtube\.com|youtu\.be/.test(url);
                            const isInstagram = /instagram\.com/.test(url);
                            const isLoom = /loom\.com/.test(url);
                            const isZoom = /zoom\.us/.test(url);
                            const sourceType = isYouTube ? 'youtube' : isInstagram ? 'instagram' : isLoom ? 'loom' : isZoom ? 'zoom' : 'url';
                            processVideoWithClipFinder(undefined, sourceType, url);
                          }}
                          disabled={!videoUrl.trim() || generating || videoProcessing}
                          className="px-4 py-2 bg-[#00D4FF] text-black rounded-lg text-sm font-bold disabled:opacity-40 hover:brightness-110 transition-all"
                        >
                          Go
                        </button>
                      </div>
                      {urlError && <p className="text-xs text-red-400 mt-1">{urlError}</p>}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="text-4xl mb-3">✅</div>
                <p className="text-body font-medium mb-1">{selectedFile.name}</p>
                <p className="text-small text-gray-600 dark:text-gray-300 mb-3">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={clearFile}
                  className="text-small text-error hover:underline"
                  disabled={generating || uploading}
                >
                  Remove file
                </button>
              </>
            )}
          </div>

        </div>
      )}


      {/* ─── How it works + You'll get ─── */}
      {inputType !== 'repurpose' && (
        <div className="mt-6 space-y-3">
          {/* 3-step process */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-300">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold">1</span>
              <span>{inputType === 'video' ? 'Upload' : inputType === 'audio' ? 'Record' : 'Describe'}</span>
            </span>
            <span className="w-4 border-t border-gray-300 dark:border-gray-600" />
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold">2</span>
              <span>AI creates</span>
            </span>
            <span className="w-4 border-t border-gray-300 dark:border-gray-600" />
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Download everything</span>
            </span>
          </div>

          {/* Output types */}
          <div className="flex items-center justify-center gap-3 text-xs text-gray-400 dark:text-gray-300">
            {(inputType === 'video') && (
              <span className="flex items-center gap-1">✂️ Clips</span>
            )}
            <span>•</span>
            <span className="flex items-center gap-1">📸 Carousel</span>
            <span>•</span>
            <span className="flex items-center gap-1">📝 Posts</span>
            <span>•</span>
            <span className="flex items-center gap-1">✉️ Email</span>
            {(inputType === 'video') && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">💬 Captions</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Caption style and carousel look are now selected post-generation */}

      {/* Reel Configuration - Coming Soon (live for admins) */}
      {(inputType === 'video' || inputType === 'url') && (
        <div className={`mt-4 p-4 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 rounded-lg border border-violet-500/20 ${!user?.isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <h3 className="text-body font-semibold text-foreground">Video Reel</h3>
            {!user?.isAdmin && (
              <span className="text-xs bg-violet-500/20 text-violet-600 px-2 py-0.5 rounded-full">Coming Soon</span>
            )}
          </div>
          <p className="text-small text-gray-600 dark:text-gray-300 mt-2">
            {user?.isAdmin ? (
              <>After generation, create animated reels from your carousel slides or compose B-roll reels with text overlays in the{' '}
              <a href="/app/reels" className="text-accent hover:underline">Reel Maker</a>.</>
            ) : (
              <>Animated carousel reels with text overlays - coming soon.</>
            )}
          </p>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="mt-4 p-4 bg-error/10 border border-error/20 rounded-lg">
          {uploadError.toLowerCase().includes('insufficient') || uploadError.toLowerCase().includes('minutes') ? (
            // Quota exceeded - show upgrade prompt
            <div className="text-center">
              <div className="text-error font-medium mb-2">Video Minutes Exceeded</div>
              <p className="text-gray-600 dark:text-gray-300 text-small mb-3">
                You&apos;ve used all your video processing minutes for this month.
              </p>
              <a
                href="/app/billing"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-small font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Upgrade for More Minutes
              </a>
            </div>
          ) : (
            // Regular error with retry
            <div className="text-center">
              <p className="text-error text-small mb-3">
                {uploadError.includes('/guides/compress-video')
                  ? <>
                      {uploadError.split('(see guide: /guides/compress-video)')[0]}
                      (<a href="/guides/compress-video" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-error/80">see compression guide</a>)
                      {uploadError.split('(see guide: /guides/compress-video)')[1]}
                    </>
                  : uploadError
                }
              </p>
              {selectedFile && (
                <button
                  onClick={() => {
                    setUploadError(null);
                    processVideoWithClipFinder(selectedFile, 'upload');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors text-small font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      {inputType === 'repurpose' && selectedContent && (
        <p className="text-small text-gray-600 dark:text-gray-300 mt-2 mb-6">
          Selected: {selectedContent.title || 'Content'}
        </p>
      )}

      {/* Free generation paywall - replaces generate button when exhausted */}
      {isFreeUser && freeGenerationsRemaining <= 0 ? (
        <div className="mt-6 p-8 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 rounded-2xl text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-xl font-bold text-white mb-2">
            You&apos;ve used your {freeGenerationsLimit} free generations
          </h3>
          <p className="text-gray-400 mb-6">
            You&apos;ve seen what EchoMe can do. Subscribe to unlock:
          </p>
          <div className="text-left max-w-sm mx-auto mb-6 space-y-2">
            {[
              'Unlimited content generation',
              'Video clip extraction',
              'Creator Radar - follow & repurpose',
              'Instagram carousels',
              'Priority processing',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-gray-200">
                <span className="text-green-500">✓</span> {feature}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[
              { name: 'Echo', price: '$29/mo', id: 'echo' },
              { name: 'Echo Studio', price: '$49/mo', id: 'echo-studio', popular: true },
              { name: 'Echo Pro', price: '$99/mo', id: 'echo-pro' },
            ].map((plan) => (
              <button
                key={plan.id}
                onClick={() => router.push(`/app/billing?plan=${plan.id}`)}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-between ${
                  plan.popular
                    ? 'bg-gradient-to-r from-[#00D4FF] to-[#0099CC] text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                    : 'bg-gray-800 border-2 border-gray-600 text-gray-200 hover:border-[#00D4FF] hover:scale-[1.02]'
                }`}
              >
                <span>{plan.name} - {plan.price}</span>
                <span className="text-sm">{plan.popular ? 'Most Popular →' : 'Subscribe →'}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Previously generated content is still available in your Content Library.
          </p>
        </div>
      ) : (
        <>
          {/* Free generation banner */}
          {isFreeUser && freeGenerationsRemaining > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-primary/5 to-accent-purple/5 border border-primary/15 rounded-2xl flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                ✨ Free Plan - {freeGenerationsUsed} of {freeGenerationsLimit} generations used
              </span>
              <button
                onClick={() => router.push('/app/billing')}
                className="text-xs font-semibold text-[#00D4FF] hover:text-[#0099CC] transition-colors"
              >
                Subscribe for unlimited →
              </button>
            </div>
          )}

          {/* Generate Button */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating || uploading || videoProcessing || !isReady}
              className="w-full aurora-gradient text-white font-headline text-lg font-extrabold py-5 rounded-[1.25rem] shadow-2xl shadow-primary/20 active:scale-[0.98] hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </span>
              ) : videoProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {getStagesMap(videoSourceType)[videoProcessingStage]?.title || 'Processing video...'}
                </span>
              ) : generating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {inputType === 'repurpose' ? 'Repurposing...' : 'Creating...'}
                </span>
              ) : inputType === 'repurpose' ? (
                'Repurpose Content'
              ) : (
                'Create My Content'
              )}
            </button>
          </div>
        </>
      )}

      {/* Info */}
      <div className="mt-6 p-4 bg-primary/5 rounded-2xl">
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center font-medium">
          {(inputType === 'video' || inputType === 'url')
            ? '🎬 Video processing may take 2-5 minutes depending on length'
            : '✨ This usually takes 30-60 seconds'}
        </p>
      </div>
      </div>
    </div>
  );
}
