'use client';

import { useState, useRef } from 'react';
import { MessageSquare, Upload, Film, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api-client';
import { showErrorToast } from '@/lib/toast';
import { toast } from 'sonner';

type CarouselBackgroundMode = 'tweet-style' | 'text-box' | 'upload' | 'video-snapshot';

interface CarouselStyleEditorProps {
  kitId: string;
  currentDesignPreset?: string;
  uploadId?: string; // Used for loading snapshots
  onRestyleComplete: (carousel: {
    slides: Array<{ slideNumber: number; text: string; publicUrl: string; template?: string }>;
    designPreset?: string;
  }) => void;
}

const STYLE_OPTIONS: Array<{
  value: CarouselBackgroundMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'tweet-style',
    label: 'Quote Card',
    description: 'Clean text card layout',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    value: 'text-box',
    label: 'Text on Color',
    description: 'Bold text with color background',
    icon: <div className="w-5 h-5 rounded bg-gradient-to-br from-pink-500 to-purple-500" />,
  },
  {
    value: 'upload',
    label: 'My Image',
    description: 'Your own background image',
    icon: <Upload className="w-5 h-5" />,
  },
  {
    value: 'video-snapshot',
    label: 'Video Frame',
    description: 'Use a frame from your video',
    icon: <Film className="w-5 h-5" />,
  },
];

export function CarouselStyleEditor({
  kitId,
  currentDesignPreset,
  uploadId,
  onRestyleComplete,
}: CarouselStyleEditorProps) {
  const [selectedMode, setSelectedMode] = useState<CarouselBackgroundMode>(
    (currentDesignPreset as CarouselBackgroundMode) || 'tweet-style'
  );
  const [restyling, setRestyling] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Array<{ thumbnailUrl: string }>>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load video snapshots when video-snapshot mode is selected
  const loadSnapshots = async () => {
    if (snapshots.length > 0) return;
    setLoadingSnapshots(true);
    try {
      // Try by content kit first, then by upload ID
      const response = await api.snapshots.getForContentKit(kitId);
      if (response.success && response.data?.snapshots?.length) {
        setSnapshots(response.data.snapshots.map((s) => ({ thumbnailUrl: s.thumbnailUrl })));
      } else if (uploadId) {
        const fallback = await api.snapshots.getForUpload(uploadId);
        if (fallback.success && fallback.data?.snapshots?.length) {
          setSnapshots(fallback.data.snapshots.map((s) => ({ thumbnailUrl: s.thumbnailUrl })));
        }
      }
    } catch {
      // Snapshots not available
    } finally {
      setLoadingSnapshots(false);
    }
  };

  const handleModeChange = (mode: CarouselBackgroundMode) => {
    setSelectedMode(mode);
    if (mode === 'video-snapshot') {
      loadSnapshots();
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const response = await api.images.uploadBackground(file);
      if (response.success && response.data?.background?.publicUrl) {
        setUploadedImageUrl(response.data.background.publicUrl);
      }
    } catch (err) {
      showErrorToast(err, 'uploading background image');
    } finally {
      setUploading(false);
    }
  };

  const handleApplyStyle = async () => {
    setRestyling(true);
    try {
      let options: Parameters<typeof api.contentKits.regenerateCarousel>[1] = {};

      if (selectedMode === 'tweet-style' || selectedMode === 'text-box') {
        options = { designPreset: selectedMode };
      } else if (selectedMode === 'upload' && uploadedImageUrl) {
        options = { background: { type: 'image', imageUrl: uploadedImageUrl } };
      } else if (selectedMode === 'video-snapshot' && snapshotUrl) {
        options = { background: { type: 'image', imageUrl: snapshotUrl } };
      } else if (selectedMode === 'upload' && !uploadedImageUrl) {
        toast.error('Please upload a background image first');
        setRestyling(false);
        return;
      } else if (selectedMode === 'video-snapshot' && !snapshotUrl) {
        toast.error('Please select a video frame first');
        setRestyling(false);
        return;
      }

      const response = await api.contentKits.regenerateCarousel(kitId, options);
      if (response.success && response.data?.carousel) {
        onRestyleComplete({
          slides: response.data.carousel.slides,
          designPreset: response.data.carousel.designPreset,
        });
        toast.success('Carousel restyled successfully');
      }
    } catch (err) {
      showErrorToast(err, 'restyling carousel');
    } finally {
      setRestyling(false);
    }
  };

  const isCurrentStyle = selectedMode === (currentDesignPreset || 'tweet-style') &&
    selectedMode !== 'upload' && selectedMode !== 'video-snapshot';

  const canApply =
    (selectedMode === 'tweet-style' || selectedMode === 'text-box') ||
    (selectedMode === 'upload' && !!uploadedImageUrl) ||
    (selectedMode === 'video-snapshot' && !!snapshotUrl);

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-4 mb-4">
      <p className="text-xs uppercase tracking-wider font-medium mb-3 text-text-secondary">
        Carousel Style
      </p>

      {/* Style options grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {STYLE_OPTIONS.map((option) => {
          // Hide video-snapshot if no uploadId
          if (option.value === 'video-snapshot' && !uploadId) return null;

          const isSelected = selectedMode === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleModeChange(option.value)}
              disabled={restyling}
              className={`relative p-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all text-center ${
                isSelected
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/30'
              } ${restyling ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`${isSelected ? 'text-accent' : 'text-text-secondary'}`}>
                {option.icon}
              </div>
              <span className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-text-primary'}`}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Conditional: Image upload */}
      {selectedMode === 'upload' && (
        <div className="mb-3">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
            className="hidden"
          />
          {!uploadedImageUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || restyling}
              className="w-full py-3 border-2 border-dashed border-border rounded-lg text-sm text-text-secondary hover:border-accent hover:text-accent transition-all disabled:opacity-50"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                </span>
              ) : (
                'Click to upload background image (JPEG, PNG, WebP)'
              )}
            </button>
          ) : (
            <div className="flex items-center justify-between p-2 bg-bg-primary rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedImageUrl} alt="Background" className="w-16 h-10 object-cover rounded" />
              <button
                onClick={() => {
                  setUploadedImageUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-xs text-error hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {/* Conditional: Video snapshot picker */}
      {selectedMode === 'video-snapshot' && (
        <div className="mb-3">
          {loadingSnapshots ? (
            <div className="flex items-center justify-center py-4 text-text-secondary text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading frames...
            </div>
          ) : snapshots.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {snapshots.map((snap, i) => (
                <button
                  key={i}
                  onClick={() => setSnapshotUrl(snap.thumbnailUrl)}
                  className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    snapshotUrl === snap.thumbnailUrl ? 'border-accent' : 'border-border hover:border-accent/30'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={snap.thumbnailUrl} alt={`Frame ${i + 1}`} className="w-20 h-12 object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-secondary text-center py-3">
              No video frames available. Upload a video first.
            </p>
          )}
        </div>
      )}

      {/* Apply button */}
      <button
        onClick={handleApplyStyle}
        disabled={restyling || !canApply || isCurrentStyle}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-accent text-white hover:bg-accent/90"
      >
        {restyling ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Restyling...
          </span>
        ) : isCurrentStyle ? (
          <span className="flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Current Style
          </span>
        ) : (
          'Apply Style'
        )}
      </button>
    </div>
  );
}
