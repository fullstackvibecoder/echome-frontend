'use client';

/**
 * EventPreviewModal
 *
 * Click-to-preview for a fanout event. Shows the full content, media thumbnails,
 * per-platform status with per-platform retry/cancel actions, and a "From kit"
 * jump link back to the source kit.
 *
 * Data comes from the /social-posting/calendar response — no additional fetch
 * on click (the backend already returns content_full + media_urls per event).
 */
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/error-utils';
import {
  X, CheckCircle, AlertTriangle, Clock, RefreshCw, ExternalLink, Sparkles,
  Loader2,
  Instagram, Linkedin, Facebook, AtSign,
  Twitter, Music2, Youtube, Pin, CloudSun, MapPin,
  type LucideIcon,
} from 'lucide-react';

const PLATFORM_ICON: Record<string, LucideIcon> = {
  instagram: Instagram, linkedin: Linkedin, facebook: Facebook, threads: AtSign,
  x: Twitter, tiktok: Music2, youtube: Youtube, pinterest: Pin, bluesky: CloudSun, google_business: MapPin,
};

export interface FanoutEventForPreview {
  fanout_id: string;
  content_kit_id?: string;
  kit_title?: string;
  source_output_id?: string;
  content_preview: string;
  content_full?: string;
  media_urls?: string[];
  output_kind: 'written_post' | 'carousel' | 'clip' | 'reel' | 'other';
  platforms: Array<{
    post_id: string;
    platform: string;
    status: string;
    scheduled_at: string;
    posted_at?: string;
    platform_post_url?: string;
    error_message?: string;
  }>;
  aggregate_status: string;
  ai_suggested: boolean;
  is_reminder: boolean;
}

interface Props {
  event: FanoutEventForPreview | null;
  onClose: () => void;
  onChanged: () => void; // fires after retry/cancel so parent can refetch
}

export function EventPreviewModal({ event, onClose, onChanged }: Props) {
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  if (!event) return null;

  const content = event.content_full || event.content_preview;
  const earliest = event.platforms.reduce(
    (min, p) => (p.scheduled_at < min ? p.scheduled_at : min),
    event.platforms[0]?.scheduled_at ?? '',
  );

  const handleRetry = async (postId: string) => {
    setBusyPostId(postId);
    try {
      await api.socialPosting.retryPost(postId);
      toast.success('Retrying post');
      onChanged();
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e, 'Retry failed'));
    } finally {
      setBusyPostId(null);
    }
  };

  const handleCancel = async (postId: string) => {
    setBusyPostId(postId);
    try {
      await api.socialPosting.cancelPost(postId);
      toast.success('Cancelled');
      onChanged();
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e, 'Cancel failed'));
    } finally {
      setBusyPostId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-1">
              <span>{formatDateTime(earliest)}</span>
              {event.ai_suggested && (
                <span className="inline-flex items-center gap-1 text-foreground/80">
                  <Sparkles className="w-3 h-3" /> AI-suggested
                </span>
              )}
              {event.is_reminder && (
                <span className="uppercase tracking-wide text-[10px] bg-muted px-1.5 py-0.5 rounded">Reminder</span>
              )}
            </div>
            {event.kit_title && event.content_kit_id ? (
              <Link
                href={`/app/content-kit/${event.content_kit_id}`}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                From kit: <span className="text-foreground">{event.kit_title}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            ) : null}
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-background flex-shrink-0" aria-label="Close">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Media thumbnails */}
          {event.media_urls && event.media_urls.length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 block">
                {event.output_kind === 'carousel' ? `Carousel · ${event.media_urls.length} slides` : event.output_kind === 'reel' ? 'Reel' : event.output_kind === 'clip' ? 'Clip' : 'Media'}
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {event.media_urls.map((url, idx) => (
                  <MediaThumb key={`${idx}-${url}`} url={url} />
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 block">Caption</label>
            <div className="bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {content || <span className="text-muted-foreground/60 italic">No caption</span>}
            </div>
          </div>

          {/* Per-platform status */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 block">Platforms</label>
            <div className="space-y-1.5">
              {event.platforms.map((p) => {
                const Icon = PLATFORM_ICON[p.platform];
                const isBusy = busyPostId === p.post_id;
                return (
                  <div key={p.post_id} className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-xs">
                    {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                    <span className="capitalize text-foreground font-medium">{p.platform.replace('_', ' ')}</span>
                    <StatusBadge status={p.status} />
                    <span className="text-muted-foreground ml-auto">{formatDateTime(p.scheduled_at)}</span>

                    {p.status === 'posted' && p.platform_post_url && (
                      <a
                        href={p.platform_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        title="View live post"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {p.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => handleRetry(p.post_id)}
                        disabled={isBusy}
                        className="text-[11px] text-red-500 underline disabled:opacity-50"
                        title={p.error_message || 'Retry this post'}
                      >
                        retry
                      </button>
                    )}

                    {(p.status === 'scheduled' || p.status === 'publishing' || p.status === 'pending_finalize') && (
                      <button
                        type="button"
                        onClick={() => handleCancel(p.post_id)}
                        disabled={isBusy}
                        className="text-[11px] text-muted-foreground hover:text-red-500 disabled:opacity-30"
                        title="Cancel this post"
                      >
                        cancel
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error details if any platform failed */}
          {event.platforms.some((p) => p.status === 'failed' && p.error_message) && (
            <div className="text-xs text-red-500/90 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
              <div className="font-medium mb-1">Error</div>
              {event.platforms.find((p) => p.error_message)?.error_message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MediaThumb({ url }: { url: string }) {
  const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
  if (isVideo) {
    return (
      <div className="relative w-20 h-20 rounded-md bg-muted overflow-hidden flex-shrink-0">
        <video
          src={url}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
        <div className="absolute bottom-0.5 right-0.5 text-[8px] uppercase bg-black/60 text-white px-1 rounded">video</div>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt=""
      className="w-20 h-20 rounded-md object-cover bg-muted flex-shrink-0"
      loading="lazy"
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: LucideIcon; label: string; color: string }> = {
    posted: { icon: CheckCircle, label: 'Posted', color: 'text-green-600 bg-green-500/10' },
    published: { icon: CheckCircle, label: 'Posted', color: 'text-green-600 bg-green-500/10' },
    failed: { icon: AlertTriangle, label: 'Failed', color: 'text-red-500 bg-red-500/10' },
    publishing: { icon: RefreshCw, label: 'Publishing', color: 'text-blue-500 bg-blue-500/10' },
    pending_finalize: { icon: Loader2, label: 'Preparing media…', color: 'text-amber-600 bg-amber-500/10' },
    scheduled: { icon: Clock, label: 'Scheduled', color: 'text-foreground bg-muted' },
    cancelled: { icon: X, label: 'Cancelled', color: 'text-muted-foreground bg-muted line-through' },
  };
  const c = config[status] || { icon: Clock, label: status, color: 'text-foreground bg-muted' };
  const Icon = c.icon;
  const spinning = status === 'publishing' || status === 'pending_finalize';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${c.color}`}>
      <Icon className={`w-2.5 h-2.5 ${spinning ? 'animate-spin' : ''}`} />
      {c.label}
    </span>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
