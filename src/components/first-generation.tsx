'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InputType, Platform, BackgroundConfig, DesignPreset } from '@/types';
import { api, ContentHistoryEntry, VideoUpload, VideoClip, ContentKit, ClipJob } from '@/lib/api-client';

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
          <p className="text-body text-text-secondary mb-2">
            Click to start recording
          </p>
          <p className="text-small text-text-secondary">
            Speak your content idea and we'll transcribe it
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
          <p className="text-body text-text-secondary">
            Recording... Click to stop
          </p>
          <div className="flex justify-center gap-1 mt-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 20 + 10}px`,
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
          <p className="text-body text-text-secondary">
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

const VIDEO_PROCESSING_STAGES: Record<string, {
  icon: string;
  title: string;
  tips: string[];
}> = {
  uploading: {
    icon: '📤',
    title: 'Uploading your video',
    tips: [
      'Preparing your video for the magic to begin...',
      'Great content starts with great source material!',
      'Your video is on its way to our processing servers...',
      'Almost there! Getting your video ready for analysis...',
    ],
  },
  transcribing: {
    icon: '🎧',
    title: 'Transcribing audio',
    tips: [
      'Listening carefully to every word...',
      'Our AI is picking up all the nuances in your speech',
      'Converting your voice into text with precision',
      'Fun fact: We can detect multiple speakers automatically!',
      'Capturing timestamps for perfect caption sync...',
    ],
  },
  analyzing: {
    icon: '🧠',
    title: 'Analyzing content',
    tips: [
      'Looking for those viral-worthy moments...',
      'Finding the hooks that will grab attention',
      'Identifying your most engaging segments',
      'Scoring clips for engagement potential',
      'Our AI is learning what makes your content unique!',
    ],
  },
  extracting: {
    icon: '✂️',
    title: 'Extracting clips',
    tips: [
      'Cutting out the best parts for you...',
      'Creating clips optimized for social media',
      'Quality over quantity - selecting only the best moments',
      'Each clip is crafted to stand on its own',
      'Adding smart face-tracking for vertical formats...',
    ],
  },
  captioning: {
    icon: '💬',
    title: 'Adding captions',
    tips: [
      'Making your content accessible to everyone!',
      '85% of social media videos are watched without sound',
      'Word-by-word timing for that professional look',
      'Captions boost engagement by up to 80%',
      'Styling your captions for maximum impact...',
    ],
  },
  generating: {
    icon: '✨',
    title: 'Generating content kit',
    tips: [
      'Writing captions that match your voice...',
      'Creating platform-optimized versions',
      'Crafting LinkedIn posts with authority',
      'Building Instagram carousels that pop',
      'Your content kit is almost ready!',
    ],
  },
  pending: {
    icon: '⏳',
    title: 'Queued for processing',
    tips: [
      'Your video is in line for the spotlight!',
      'Preparing processing resources...',
    ],
  },
  completed: {
    icon: '🎉',
    title: 'Processing complete',
    tips: [
      'Your clips are ready to shine!',
      'Time to share your best moments with the world!',
    ],
  },
};

// Carousel design preset options for the dropdown
type CarouselDesignOption = DesignPreset | 'upload';

const DESIGN_PRESET_OPTIONS: { value: CarouselDesignOption; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Modern navy with cyan accent' },
  { value: 'minimal', label: 'Minimal', description: 'Clean white background' },
  { value: 'bold', label: 'Bold', description: 'Dark with orange accent' },
  { value: 'tweet-style', label: 'Tweet Style', description: 'Twitter/X post card look' },
  { value: 'upload', label: 'Upload Custom', description: 'Use your own background' },
];

// Caption style options for video clips
type CaptionStyleOption = 'modern' | 'classic' | 'bold' | 'minimal' | 'highlight';

const CAPTION_STYLE_OPTIONS: { value: CaptionStyleOption; label: string; description: string }[] = [
  { value: 'modern', label: 'Modern', description: 'Bold white text with shadow - TikTok/Reels style' },
  { value: 'bold', label: 'Bold', description: 'Large yellow text - maximum impact' },
  { value: 'highlight', label: 'Highlight', description: 'Word-by-word emphasis - trending style' },
  { value: 'classic', label: 'Classic', description: 'White text on dark box - traditional subtitles' },
  { value: 'minimal', label: 'Minimal', description: 'Clean subtle styling - professional look' },
];

interface FirstGenerationProps {
  onGenerate: (
    input: string,
    inputType: InputType,
    platforms: Platform[],
    carouselBackground?: BackgroundConfig,
    carouselBackgroundFile?: File
  ) => void;
  onRepurpose?: (
    contentId: string,
    platforms: Platform[],
    carouselBackground?: BackgroundConfig
  ) => void;
  onVideoProcessing?: (data: {
    upload: VideoUpload;
    clips: VideoClip[];
    contentKit: ContentKit | null;
    job?: ClipJob;
  }) => void;
  generating: boolean;
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

export function FirstGeneration({
  onGenerate,
  onRepurpose,
  onVideoProcessing,
  generating,
}: FirstGenerationProps) {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<ExtendedInputType>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Carousel design preset state
  const [carouselDesignOption, setCarouselDesignOption] = useState<CarouselDesignOption>('default');
  const [carouselBgFile, setCarouselBgFile] = useState<File | null>(null);
  const carouselBgInputRef = useRef<HTMLInputElement>(null);

  // Caption style state
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleOption>('modern');

  // Repurpose state
  const [pendingContent, setPendingContent] = useState<ContentHistoryEntry[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentHistoryEntry | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // URL state
  const [videoUrl, setVideoUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [processingUrl, setProcessingUrl] = useState(false);

  // Video processing state (Clip Finder)
  const [videoProcessing, setVideoProcessing] = useState(false);
  const [videoProcessingStatus, setVideoProcessingStatus] = useState<string | null>(null);
  const [videoProcessingProgress, setVideoProcessingProgress] = useState(0);
  const [videoProcessingStage, setVideoProcessingStage] = useState<string>('uploading');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tipRotationRef = useRef<NodeJS.Timeout | null>(null);

  // Load pending content when repurpose mode is selected
  useEffect(() => {
    if (inputType === 'repurpose') {
      loadPendingContent();
    }
  }, [inputType]);

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
      if (tipRotationRef.current) {
        clearInterval(tipRotationRef.current);
      }
    };
  }, []);

  // Rotate tips during video processing
  useEffect(() => {
    if (videoProcessing && videoProcessingStage) {
      // Reset tip index when stage changes
      setCurrentTipIndex(0);

      // Clear any existing rotation
      if (tipRotationRef.current) {
        clearInterval(tipRotationRef.current);
      }

      // Start rotating tips every 4 seconds
      tipRotationRef.current = setInterval(() => {
        const stageTips = VIDEO_PROCESSING_STAGES[videoProcessingStage]?.tips || [];
        if (stageTips.length > 1) {
          setCurrentTipIndex(prev => (prev + 1) % stageTips.length);
        }
      }, 4000);
    } else {
      // Clear rotation when not processing
      if (tipRotationRef.current) {
        clearInterval(tipRotationRef.current);
        tipRotationRef.current = null;
      }
    }

    return () => {
      if (tipRotationRef.current) {
        clearInterval(tipRotationRef.current);
      }
    };
  }, [videoProcessing, videoProcessingStage]);

  // Process video through Clip Finder pipeline
  const processVideoWithClipFinder = async (
    file?: File,
    sourceType?: 'upload' | 'youtube' | 'instagram',
    sourceUrl?: string
  ) => {
    try {
      setVideoProcessing(true);
      setVideoProcessingStage('uploading');
      setVideoProcessingStatus('Uploading video...');
      setVideoProcessingProgress(0);
      setCurrentTipIndex(0);
      setUploadError(null);

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
      setVideoProcessingStatus('Starting clip extraction...');
      setVideoProcessingProgress(35);

      // Build carousel design config
      let designPreset: DesignPreset = getDesignPreset();
      let carouselBackground: { type: 'preset' | 'image'; presetId?: string; imageUrl?: string } | undefined;

      if (carouselDesignOption === 'upload' && carouselBgFile) {
        // Upload the background image first
        try {
          const bgUploadResponse = await api.images.uploadBackground(carouselBgFile);
          if (bgUploadResponse.success && bgUploadResponse.data?.background?.publicUrl) {
            carouselBackground = { type: 'image', imageUrl: bgUploadResponse.data.background.publicUrl };
          }
        } catch (bgErr) {
          console.warn('Failed to upload carousel background, using default:', bgErr);
        }
      }

      // Step 2: Start processing
      const processResponse = await api.clips.process(upload.id, {
        generateContent: true, // Generate content kit as part of processing
        designPreset, // New design preset system
        carouselBackground, // Legacy/custom image support
        captionStyle, // Pass selected caption style
      });

      if (!processResponse.success || !processResponse.data?.jobId) {
        throw new Error('Failed to start processing');
      }

      const jobId = processResponse.data.jobId;
      setVideoProcessingStatus('Transcribing audio...');
      setVideoProcessingProgress(40);

      // Step 3: Poll for completion
      await pollProcessingStatus(upload.id, jobId);

    } catch (err) {
      console.error('Video processing error:', err);
      setUploadError(err instanceof Error ? err.message : 'Video processing failed');
      setVideoProcessing(false);
      setVideoProcessingStatus(null);
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
      const checkStatus = async () => {
        try {
          const response = await api.clips.get(uploadId);

          if (response.success && response.data) {
            const { upload, clips, contentKit } = response.data;
            const status = upload.status;

            // Update stage and progress
            setVideoProcessingStage(status);
            const stageInfo = VIDEO_PROCESSING_STAGES[status];
            setVideoProcessingStatus(stageInfo?.title || `Processing: ${status}`);
            setVideoProcessingProgress(progressByStatus[status] || 50);

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
              if (processingIntervalRef.current) {
                clearInterval(processingIntervalRef.current);
              }
              setVideoProcessing(false);
              reject(new Error(upload.statusMessage || 'Processing failed'));
            }
          }
        } catch (err) {
          console.error('Status check error:', err);
          // Continue polling on transient errors
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
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleCarouselBgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCarouselBgFile(file);
    }
  };

  const handleDesignOptionChange = (value: CarouselDesignOption) => {
    setCarouselDesignOption(value);
    // Clear file if not upload option
    if (value !== 'upload') {
      setCarouselBgFile(null);
      if (carouselBgInputRef.current) carouselBgInputRef.current.value = '';
    }
  };

  // Build the BackgroundConfig based on selection
  const buildBackgroundConfig = (): BackgroundConfig => {
    if (carouselDesignOption === 'upload') {
      return { type: 'image' };
    }
    // Use new designPreset system - map to legacy format for now
    // The backend will handle both formats
    return { type: 'preset', presetId: carouselDesignOption === 'minimal' ? 'simple-white' : 'tweet-style' };
  };

  // Get current design preset for new API
  const getDesignPreset = (): DesignPreset => {
    if (carouselDesignOption === 'upload') return 'default';
    return carouselDesignOption;
  };

  const handleGenerate = async () => {
    const bgConfig = buildBackgroundConfig();
    const bgFile = carouselDesignOption === 'upload' ? carouselBgFile : undefined;

    // Validate upload option has a file
    if (carouselDesignOption === 'upload' && !carouselBgFile) {
      setUploadError('Please select a background image');
      return;
    }

    // For repurpose mode
    if (inputType === 'repurpose') {
      if (!selectedContent || !onRepurpose) return;
      onRepurpose(selectedContent.id, ALL_PLATFORMS, bgConfig);
      return;
    }

    // For URL input - process through Clip Finder
    if (inputType === 'url') {
      const url = videoUrl.trim();
      if (!url || !isValidUrl(url)) {
        setUrlError('Please enter a valid YouTube or Instagram URL');
        return;
      }

      // Determine source type from URL
      const isYouTube = /youtube\.com|youtu\.be/.test(url);
      const sourceType = isYouTube ? 'youtube' : 'instagram';

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
      onGenerate(input, inputType as InputType, ALL_PLATFORMS, bgConfig, bgFile || undefined);
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
        setUploadError(err instanceof Error ? err.message : 'Video processing failed');
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
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const isValidUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/;
    const instagramRegex = /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|p)\//;
    return youtubeRegex.test(url) || instagramRegex.test(url);
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

  return (
    <div className="card max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-display text-3xl mb-2">What do you want to create?</h2>
        <p className="text-body text-text-secondary">
          Describe your topic, and we will generate content for all platforms
        </p>
      </div>

      {/* Input Type Tabs */}
      <div className="flex items-center gap-2 mb-4 p-1 bg-bg-secondary rounded-lg">
        <button
          onClick={() => { setInputType('text'); clearFile(); }}
          className={`
            flex-1 px-4 py-2 rounded-lg text-body font-medium transition-all
            ${
              inputType === 'text'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          ✍️ Text
        </button>
        <button
          onClick={() => { setInputType('audio'); clearFile(); }}
          className={`
            flex-1 px-4 py-2 rounded-lg text-body font-medium transition-all
            ${
              inputType === 'audio'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          🎤 Voice
        </button>
        <button
          onClick={() => { setInputType('video'); clearFile(); }}
          className={`
            flex-1 px-4 py-2 rounded-lg text-body font-medium transition-all
            ${
              inputType === 'video'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          🎥 Video
        </button>
        <button
          disabled
          className="flex-1 px-4 py-2 rounded-lg text-body font-medium transition-all text-text-secondary/50 cursor-not-allowed relative"
          title="Coming Soon"
        >
          🔗 URL
          <span className="absolute -top-1 -right-1 text-[10px] bg-accent/20 text-accent px-1 rounded">Soon</span>
        </button>
        <button
          onClick={() => { setInputType('repurpose'); clearFile(); }}
          className={`
            flex-1 px-4 py-2 rounded-lg text-body font-medium transition-all
            ${
              inputType === 'repurpose'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          🔄 Repurpose
        </button>
      </div>

      {/* Input Area */}
      {inputType === 'text' && (
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="I need content about..."
          className="w-full h-40 px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors resize-none text-body"
          disabled={generating}
        />
      )}

      {inputType === 'audio' && (
        <VoiceInputPanel
          onTranscribed={(text) => {
            setInput(text);
            setInputType('text'); // Switch to text mode with transcription
          }}
          disabled={generating || uploading}
        />
      )}

      {inputType === 'video' && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            type="file"
            ref={videoInputRef}
            accept="video/*,.mp4,.mov,.avi,.webm"
            onChange={handleFileSelect}
            className="hidden"
          />
          {videoProcessing ? (
            <div className="py-4">
              {/* Stage Icon & Title */}
              <div className="text-5xl mb-3 animate-bounce">
                {VIDEO_PROCESSING_STAGES[videoProcessingStage]?.icon || '⏳'}
              </div>
              <p className="text-body font-semibold mb-1">
                {VIDEO_PROCESSING_STAGES[videoProcessingStage]?.title || videoProcessingStatus}
              </p>

              {/* Rotating Tip */}
              <p className="text-small text-text-secondary mb-4 min-h-[40px] transition-opacity duration-500">
                {VIDEO_PROCESSING_STAGES[videoProcessingStage]?.tips[currentTipIndex] || 'Processing...'}
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-sm mx-auto mb-3">
                <div className="bg-bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-accent to-accent/70 h-2.5 rounded-full transition-all duration-500 relative"
                    style={{ width: `${videoProcessingProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Progress Percentage */}
              <p className="text-small text-text-secondary font-medium">
                {videoProcessingProgress}% complete
              </p>

              {/* Stage indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {['uploading', 'transcribing', 'analyzing', 'extracting', 'captioning', 'generating'].map((stage, idx) => {
                  const stageOrder = ['uploading', 'transcribing', 'analyzing', 'extracting', 'captioning', 'generating'];
                  const currentIdx = stageOrder.indexOf(videoProcessingStage);
                  const isComplete = idx < currentIdx;
                  const isCurrent = stage === videoProcessingStage;
                  return (
                    <div
                      key={stage}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        isComplete ? 'bg-accent' :
                        isCurrent ? 'bg-accent animate-pulse scale-125' :
                        'bg-bg-secondary'
                      }`}
                      title={VIDEO_PROCESSING_STAGES[stage]?.title}
                    />
                  );
                })}
              </div>
            </div>
          ) : !selectedFile ? (
            <>
              <div className="text-5xl mb-4">🎥</div>
              <p className="text-body text-text-secondary mb-4">
                Upload a video to extract clips and generate a content kit
              </p>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="btn-secondary px-6 py-2"
                disabled={generating || uploading || videoProcessing}
              >
                Select Video File
              </button>
              <p className="text-small text-text-secondary mt-4">
                Supports MP4, MOV, AVI, WebM (up to 5GB)
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">✅</div>
              <p className="text-body font-medium mb-2">{selectedFile.name}</p>
              <p className="text-small text-text-secondary mb-4">
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
      )}

      {inputType === 'url' && (
        <div className="border-2 border-border rounded-lg p-6">
          {videoProcessing ? (
            <div className="text-center py-4">
              {/* Stage Icon & Title */}
              <div className="text-5xl mb-3 animate-bounce">
                {VIDEO_PROCESSING_STAGES[videoProcessingStage]?.icon || '⏳'}
              </div>
              <p className="text-body font-semibold mb-1">
                {VIDEO_PROCESSING_STAGES[videoProcessingStage]?.title || videoProcessingStatus}
              </p>

              {/* Rotating Tip */}
              <p className="text-small text-text-secondary mb-4 min-h-[40px] transition-opacity duration-500">
                {VIDEO_PROCESSING_STAGES[videoProcessingStage]?.tips[currentTipIndex] || 'Processing...'}
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-sm mx-auto mb-3">
                <div className="bg-bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-accent to-accent/70 h-2.5 rounded-full transition-all duration-500 relative"
                    style={{ width: `${videoProcessingProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Progress Percentage */}
              <p className="text-small text-text-secondary font-medium">
                {videoProcessingProgress}% complete
              </p>

              {/* Stage indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {['uploading', 'transcribing', 'analyzing', 'extracting', 'captioning', 'generating'].map((stage, idx) => {
                  const stageOrder = ['uploading', 'transcribing', 'analyzing', 'extracting', 'captioning', 'generating'];
                  const currentIdx = stageOrder.indexOf(videoProcessingStage);
                  const isComplete = idx < currentIdx;
                  const isCurrent = stage === videoProcessingStage;
                  return (
                    <div
                      key={stage}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        isComplete ? 'bg-accent' :
                        isCurrent ? 'bg-accent animate-pulse scale-125' :
                        'bg-bg-secondary'
                      }`}
                      title={VIDEO_PROCESSING_STAGES[stage]?.title}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🔗</div>
                <p className="text-body text-text-secondary">
                  Paste a YouTube or Instagram video URL to extract clips
                </p>
              </div>
              <div className="space-y-4">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => { setVideoUrl(e.target.value); setUrlError(null); }}
                  placeholder="https://youtube.com/watch?v=... or https://instagram.com/reel/..."
                  className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors text-body bg-background text-foreground"
                  disabled={generating || videoProcessing}
                />
                {urlError && (
                  <p className="text-small text-error">{urlError}</p>
                )}
                <div className="flex items-center gap-4 text-small text-text-secondary">
                  <span className="flex items-center gap-1">
                    <span className="text-red-500">▶️</span> YouTube
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-pink-500">📷</span> Instagram Reels
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {inputType === 'repurpose' && (
        <div className="border-2 border-border rounded-lg overflow-hidden">
          {loadingContent ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-body text-text-secondary">Loading content from followed creators...</p>
            </div>
          ) : pendingContent.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-5xl mb-4">👥</div>
              <p className="text-body text-text-secondary mb-4">
                No content available for repurposing yet
              </p>
              <p className="text-small text-text-secondary">
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
                    <div className="flex items-center gap-2 text-small text-text-secondary">
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
                      <p className="text-small text-text-secondary mt-1 line-clamp-2">
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
      )}

      {/* Carousel Design Preset Option */}
      <div className="mt-6 p-4 bg-bg-secondary rounded-lg border border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-body font-medium text-text-primary block mb-1">
              Carousel Style
            </label>
            <p className="text-small text-text-secondary">
              Choose a design preset for your Instagram carousel
            </p>
          </div>
          <select
            value={carouselDesignOption}
            onChange={(e) => handleDesignOptionChange(e.target.value as CarouselDesignOption)}
            disabled={generating || uploading}
            className="px-4 py-2 border border-border rounded-lg bg-bg-primary text-body focus:outline-none focus:border-accent min-w-[160px]"
          >
            {DESIGN_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Show description for selected preset */}
        {carouselDesignOption !== 'upload' && (
          <p className="mt-2 text-small text-text-secondary">
            {DESIGN_PRESET_OPTIONS.find(opt => opt.value === carouselDesignOption)?.description}
          </p>
        )}

        {/* Conditional Upload Field */}
        {carouselDesignOption === 'upload' && (
          <div className="mt-4 pt-4 border-t border-border">
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
                className="w-full py-3 border-2 border-dashed border-border rounded-lg text-text-secondary hover:border-accent hover:text-accent transition-colors"
                disabled={generating || uploading}
              >
                Click to upload background image (JPEG, PNG, WebP)
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
                  className="text-small text-error hover:underline"
                  disabled={generating || uploading}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Caption Style Option - Only show for video/URL input */}
      {(inputType === 'video' || inputType === 'url') && (
        <div className="mt-4 p-4 bg-bg-secondary rounded-lg border border-border">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex-1">
              <label className="text-body font-medium text-text-primary block mb-1">
                Caption Style
              </label>
              <p className="text-small text-text-secondary">
                Choose how captions appear on your video clips
              </p>
            </div>
            <select
              value={captionStyle}
              onChange={(e) => setCaptionStyle(e.target.value as CaptionStyleOption)}
              disabled={generating || uploading || videoProcessing}
              className="px-4 py-2 border border-border rounded-lg bg-bg-primary text-body focus:outline-none focus:border-accent min-w-[140px]"
            >
              {CAPTION_STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {/* Style description */}
          <p className="text-small text-text-secondary">
            {CAPTION_STYLE_OPTIONS.find(opt => opt.value === captionStyle)?.description}
          </p>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-small text-center">
          {uploadError}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-small text-text-secondary mt-2 mb-6">
        {inputType === 'text' && 'Press ⌘+Enter to generate'}
        {inputType === 'repurpose' && selectedContent && (
          <>Selected: {selectedContent.title || 'Content'}</>
        )}
      </p>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || uploading || videoProcessing || !isReady}
        className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Uploading...
          </span>
        ) : videoProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg">{VIDEO_PROCESSING_STAGES[videoProcessingStage]?.icon || '⏳'}</span>
            {VIDEO_PROCESSING_STAGES[videoProcessingStage]?.title || 'Processing video...'}
          </span>
        ) : generating ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {inputType === 'repurpose' ? 'Repurposing...' : 'Generating...'}
          </span>
        ) : inputType === 'repurpose' ? (
          'Repurpose Content'
        ) : inputType === 'url' ? (
          'Extract Clips & Generate Content'
        ) : inputType === 'video' ? (
          'Extract Clips & Generate Content'
        ) : (
          'Generate Content'
        )}
      </button>

      {/* Info */}
      <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
        <p className="text-small text-accent text-center">
          {(inputType === 'video' || inputType === 'url')
            ? '🎬 Video processing may take 2-5 minutes depending on length'
            : '✨ This usually takes 30-60 seconds'}
        </p>
      </div>
    </div>
  );
}
