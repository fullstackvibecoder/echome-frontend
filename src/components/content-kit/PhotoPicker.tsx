'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '@/lib/api-client';

interface PhotoCandidate {
  url: string;
  label: string;
  source: 'snapshot' | 'profile';
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

/**
 * Photo picker rail for the post-gen carousel editor. Lists candidates
 * derived from the kit's photo source chain (per docs/carousel-design-guardrails.md
 * §2.1): video snapshots when the kit was video-triggered, plus the
 * user's profile image. V1 has no upload-your-own option — that's
 * tracked as a separate brand-asset library work item.
 */
export function PhotoPicker({ kitId, uploadId, currentPhotoUrl, onSelect }: PhotoPickerProps) {
  const [candidates, setCandidates] = useState<PhotoCandidate[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-xs text-text-tertiary leading-relaxed">
        No photo candidates yet. Upload a video to this kit to populate frames, or set a profile photo in Settings.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {candidates.map((c) => {
        const isCurrent = currentPhotoUrl === c.url;
        return (
          <button
            key={`${c.source}-${c.url}`}
            type="button"
            onClick={() => onSelect(c.url)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
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
  );
}
