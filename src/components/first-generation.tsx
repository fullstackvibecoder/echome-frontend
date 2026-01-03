'use client';

import { useState, useRef } from 'react';
import { InputType, Platform, BackgroundConfig, PresetBackground } from '@/types';
import { api } from '@/lib/api-client';

// Carousel background options for the dropdown
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

interface FirstGenerationProps {
  onGenerate: (
    input: string,
    inputType: InputType,
    platforms: Platform[],
    carouselBackground?: BackgroundConfig,
    carouselBackgroundFile?: File
  ) => void;
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

export function FirstGeneration({
  onGenerate,
  generating,
}: FirstGenerationProps) {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<InputType>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Carousel background state
  const [carouselBgOption, setCarouselBgOption] = useState<CarouselBackgroundOption>('dark-minimal');
  const [carouselBgFile, setCarouselBgFile] = useState<File | null>(null);
  const carouselBgInputRef = useRef<HTMLInputElement>(null);

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

  const handleCarouselBgChange = (value: CarouselBackgroundOption) => {
    setCarouselBgOption(value);
    // Clear file if not upload option
    if (value !== 'upload') {
      setCarouselBgFile(null);
      if (carouselBgInputRef.current) carouselBgInputRef.current.value = '';
    }
  };

  // Build the BackgroundConfig based on selection
  const buildBackgroundConfig = (): BackgroundConfig => {
    if (carouselBgOption === 'ai') {
      return { type: 'ai' };
    }
    if (carouselBgOption === 'upload') {
      return { type: 'image' };
    }
    // Preset
    return { type: 'preset', presetId: carouselBgOption as PresetBackground };
  };

  const handleGenerate = async () => {
    const bgConfig = buildBackgroundConfig();
    const bgFile = carouselBgOption === 'upload' ? carouselBgFile : undefined;

    // Validate upload option has a file
    if (carouselBgOption === 'upload' && !carouselBgFile) {
      setUploadError('Please select a background image');
      return;
    }

    // For text input
    if (inputType === 'text') {
      if (!input.trim()) return;
      onGenerate(input, inputType, ALL_PLATFORMS, bgConfig, bgFile || undefined);
      return;
    }

    // For audio/video input - need to upload file first
    if (!selectedFile) {
      setUploadError('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      // Upload file (using a temporary KB for media processing)
      const uploadResponse = await api.files.upload('media-temp', selectedFile);

      if (uploadResponse.success && uploadResponse.data?.filePath) {
        onGenerate(uploadResponse.data.filePath, inputType, ALL_PLATFORMS, bgConfig, bgFile || undefined);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadError(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const isReady = inputType === 'text' ? input.trim().length > 0 : selectedFile !== null;

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
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            type="file"
            ref={audioInputRef}
            accept="audio/*,.mp3,.wav,.m4a,.ogg"
            onChange={handleFileSelect}
            className="hidden"
          />
          {!selectedFile ? (
            <>
              <div className="text-5xl mb-4">🎤</div>
              <p className="text-body text-text-secondary mb-4">
                Upload a voice recording or audio file
              </p>
              <button
                onClick={() => audioInputRef.current?.click()}
                className="btn-secondary px-6 py-2"
                disabled={generating || uploading}
              >
                Select Audio File
              </button>
              <p className="text-small text-text-secondary mt-4">
                Supports MP3, WAV, M4A, OGG
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

      {inputType === 'video' && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <input
            type="file"
            ref={videoInputRef}
            accept="video/*,.mp4,.mov,.avi,.webm"
            onChange={handleFileSelect}
            className="hidden"
          />
          {!selectedFile ? (
            <>
              <div className="text-5xl mb-4">🎥</div>
              <p className="text-body text-text-secondary mb-4">
                Upload a video file to extract content from
              </p>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="btn-secondary px-6 py-2"
                disabled={generating || uploading}
              >
                Select Video File
              </button>
              <p className="text-small text-text-secondary mt-4">
                Supports MP4, MOV, AVI, WebM (max 500MB)
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

      {/* Carousel Background Option */}
      <div className="mt-6 p-4 bg-bg-secondary rounded-lg border border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-body font-medium text-text-primary block mb-1">
              Carousel Background
            </label>
            <p className="text-small text-text-secondary">
              Choose a style for your Instagram carousel
            </p>
          </div>
          <select
            value={carouselBgOption}
            onChange={(e) => handleCarouselBgChange(e.target.value as CarouselBackgroundOption)}
            disabled={generating || uploading}
            className="px-4 py-2 border border-border rounded-lg bg-bg-primary text-body focus:outline-none focus:border-accent min-w-[160px]"
          >
            {BACKGROUND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Conditional Upload Field */}
        {carouselBgOption === 'upload' && (
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

        {/* AI hint for AI option */}
        {carouselBgOption === 'ai' && (
          <p className="mt-3 text-small text-accent">
            ✨ AI will generate a background based on your content
          </p>
        )}
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-small text-center">
          {uploadError}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-small text-text-secondary mt-2 mb-6">
        {inputType === 'text' && 'Press ⌘+Enter to generate'}
      </p>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || uploading || !isReady}
        className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Uploading...
          </span>
        ) : generating ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating...
          </span>
        ) : (
          'Generate Content'
        )}
      </button>

      {/* Info */}
      <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
        <p className="text-small text-accent text-center">
          ✨ This usually takes 30-60 seconds
        </p>
      </div>
    </div>
  );
}
