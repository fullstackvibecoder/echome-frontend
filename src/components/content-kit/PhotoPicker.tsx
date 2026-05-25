'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api-client';

interface PhotoCandidate {
  url: string;
  label: string;
  source: 'snapshot' | 'profile' | 'upload';
}

interface PhotoPickerProps {
  /** Kit ID — used to fetch video snapshots for this kit. */
  kitId: string;
  /** Optional fallback upload ID if snapshots-by-kit returns nothing. */
  uploadId?: string;
  /** The current slide's source photo URL. Renders a check on the matching candidate. */
  currentPhotoUrl?: string;
  /** Fired when the user clicks a candidate. Caller updates slide state and triggers a re-render. */
  onSelect: (url: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Photo picker rail for the post-gen carousel editor. Lists candidates
 * derived from the kit's photo source chain (per docs/carousel-design-guardrails.md
 * §2.1): video snapshots when the kit was video-triggered, plus the
 * user's profile image. The "Upload your own" tile (source: 'upload') is
 * always shown first so users can bring any image they like.
 */
export function PhotoPicker({ kitId, uploadId, currentPhotoUrl, onSelect }: PhotoPickerProps) {
  const [candidates, setCandidates] = useState<PhotoCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list: PhotoCandidate[] = [];

      // Video snapshots — by kit first, fall back to upload ID.
      try {
        const resp = await api.snapshots.getForContentKit(kitId);
        const snaps = resp.success ? resp.data?.snapshots : undefined;
        if (snaps?.length) {
          snaps.forEach((s, i) => {
            list.push({ url: s.thumbnailUrl, label: `Frame ${i + 1}`, source: 'snapshot' });
          });
        } else if (uploadId) {
          const fallback = await api.snapshots.getForUpload(uploadId);
          if (fallback.success && fallback.data?.snapshots?.length) {
            fallback.data.snapshots.forEach((s, i) => {
              list.push({ url: s.thumbnailUrl, label: `Frame ${i + 1}`, source: 'snapshot' });
            });
          }
        }
      } catch {
        // No snapshots available — fine, profile image is still a candidate.
      }

      // User's profile photo (from the extended profile under api.account,
      // which carries profile_image_url — the basic User type doesn't).
      try {
        const profileResp = await api.auth.getProfile();
        const profileImageUrl = profileResp.success
          ? profileResp.data?.profile_image_url
          : undefined;
        if (profileImageUrl) {
          list.push({
            url: profileImageUrl,
            label: 'Your photo',
            source: 'profile',
          });
        }
      } catch {
        // Profile fetch failed — fall through, snapshots may still be available.
      }

      if (!cancelled) {
        setCandidates(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kitId, uploadId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so the same file can be re-selected after an error.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    // Client-side validation.
    if (!file.type.startsWith('image/')) {
      setUploadError('Pick an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Image is too large. Max 10MB.');
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const resp = await api.images.uploadBackground(file, kitId);
      if (resp.success && resp.data?.background?.publicUrl) {
        const publicUrl = resp.data.background.publicUrl;
        const newCandidate: PhotoCandidate = {
          url: publicUrl,
          label: 'Your upload',
          source: 'upload',
        };
        setCandidates((prev) => [...prev, newCandidate]);
        onSelect(publicUrl);
      } else {
        setUploadError('Upload failed. Please try again.');
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        'Upload failed. Please try again.';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Error banner */}
      {uploadError && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            aria-label="Dismiss error"
            className="shrink-0 hover:opacity-70"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Upload tile — always first */}
        <button
          type="button"
          aria-label="Upload your own photo"
          disabled={uploading}
          onClick={() => {
            setUploadError(null);
            fileInputRef.current?.click();
          }}
          className={`relative aspect-square rounded-lg border-2 border-dashed border-border text-muted-foreground flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${
            uploading ? '' : 'hover:border-primary/50 hover:text-foreground'
          }`}
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <Upload size={24} />
          )}
          <span className="text-[10px] font-medium leading-tight">
            {uploading ? 'Uploading…' : 'Upload your own'}
          </span>
        </button>

        {/* Photo candidates */}
        {candidates.map((c) => {
          const isCurrent = currentPhotoUrl === c.url;
          return (
            <button
              key={`${c.source}-${c.url}`}
              type="button"
              disabled={uploading}
              onClick={() => onSelect(c.url)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all disabled:opacity-50 ${
                isCurrent
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border hover:border-primary/50'
              }`}
              title={c.label}
              aria-label={`Use ${c.label} as background`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.url} alt={c.label} className="w-full h-full object-cover" />
              {isCurrent && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5">
                <span className="text-[10px] text-white font-medium truncate block">
                  {c.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
