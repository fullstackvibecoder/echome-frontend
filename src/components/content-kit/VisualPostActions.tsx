'use client';

/**
 * VisualPostActions
 *
 * Post Now + Schedule actions for visual content (carousels, clips, reels).
 * Unlike written posts, visuals can go to any platform — so this renders a
 * PlatformMultiPicker where the user picks which platforms to fan out to.
 *
 * Rendered at the bottom of visual editor modals, AFTER the user has finalized
 * their edits (styling, captions, downloads). That's deliberate — you don't
 * want to commit to a platform before you know what the final asset looks like.
 *
 * Tier + connection states mirror WrittenPostActions: Studio+ required for
 * auto-post to api-mode platforms; lower tiers get reminder fallback; link-mode
 * platforms always do copy-and-open regardless of tier.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/error-utils';
import { Loader2, Send, CalendarClock, Sparkles } from 'lucide-react';
import { PlatformMultiPicker, type PlatformId } from '@/components/scheduling/PlatformMultiPicker';

/**
 * Finalization recipe describes how the backend should produce post-ready media.
 * When present, the schedule endpoint defers to a background worker instead of
 * posting raw URLs to Outstand immediately. This is what lets clips go out
 * *with captions burned in* and carousels go out *with the user's text edits*.
 * See src/services/social-posting/clip-finalizer.ts + carousel-finalizer.ts.
 */
export type FinalizationRecipe =
  | {
      kind: 'clip';
      upload_id: string;
      clip_id: string;
      caption_style?: string;
      caption_position?: 'top' | 'center' | 'bottom';
      view_mode?: 'single' | 'split';
      skip_captions?: boolean;
    }
  | {
      kind: 'carousel';
      kit_id: string;
      design_preset?: 'auto' | 'tweet-style' | 'text-box' | 'branded-overlay' | 'quote-card' | 'stats-card';
      aspect_ratio?: '9:16' | '1:1' | '4:5';
      slide_overrides?: Array<{
        text?: string;
        text_position?: { x: number; y: number };
        structured?: {
          headline?: string;
          body?: string;
          subtitle?: string;
          details?: string;
          cta?: string;
          redKeywords?: string[];
        };
        backgroundImageUrl?: string;
        redKeyword?: string;
      }>;
      background?: { type: 'preset' | 'ai' | 'image'; presetId?: string; imageUrl?: string };
    };

interface Props {
  contentKitId?: string;
  sourceOutputId?: string;
  /** Caption/content that will be posted to each platform */
  caption: string;
  /** Media URLs to attach. For carousels, pass all slides. For clips/reels, the video URL.
   *  These are placeholder/preview URLs when a finalization recipe is provided —
   *  the backend worker replaces them with finalized URLs at post time. */
  mediaUrls: string[];
  /** Hint for the platform list: e.g., 'carousel', 'reel' — not used yet but reserved */
  outputKind?: 'carousel' | 'clip' | 'reel';
  /**
   * Optional recipe for producing post-ready media in the background. When set,
   * the post is saved as `pending_finalize` and rendered by a worker before
   * going to Outstand. Pass this from ClipEditorModal / CarouselEditorModal so
   * user edits (captions, overlays) actually land on the published post.
   */
  finalizationRecipe?: FinalizationRecipe;
  /** Per-platform disable reasons forwarded to the picker (e.g. YouTube Short ineligibility). */
  disabledReasons?: Partial<Record<PlatformId, string>>;
  /** When posting a reel to YouTube, the video title + duration for the Short override. */
  youtubeTitle?: string;
  youtubeDurationSeconds?: number;
}

// Platforms EchoMe can auto-post to via the API/recipe fanout (vs. copy-and-open
// link platforms). YouTube is here because clips publish as Shorts through the
// finalizer (networkOverrideConfiguration.isShort) — without it, selecting YouTube
// fell through to a copy-and-open redirect and no post was ever made.
const API_AUTOPOST_PLATFORMS = ['instagram', 'linkedin', 'facebook', 'threads', 'youtube'];

// Platforms pre-selected on load. Intentionally excludes YouTube: it's opt-in and
// eligibility-gated (vertical, ≤3 min), so we don't auto-select it.
const DEFAULT_SELECTED_PLATFORMS = ['instagram', 'linkedin', 'facebook', 'threads'];

export function VisualPostActions({ contentKitId, sourceOutputId, caption, mediaUrls, finalizationRecipe, disabledReasons, youtubeTitle, youtubeDurationSeconds }: Props) {
  const { canAutoPost } = useSubscription();

  const [connectedAccounts, setConnectedAccounts] = useState<PlatformId[]>([]);
  const [selected, setSelected] = useState<PlatformId[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.socialPosting.listAccounts();
        if (resp.success && resp.data) {
          const platforms = resp.data.accounts.map((a) => a.platform as PlatformId);
          setConnectedAccounts(platforms);
          // Default-select every api-mode platform the user has connected. Saves clicks for
          // the common case of "post this visual to all my managed platforms."
          const apiPlatforms = platforms.filter((p) =>
            (DEFAULT_SELECTED_PLATFORMS as PlatformId[]).includes(p),
          );
          if (apiPlatforms.length > 0) setSelected(apiPlatforms);
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasApiSelection = selected.some((p) => API_AUTOPOST_PLATFORMS.includes(p));
  const hasLinkSelection = selected.some((p) => !API_AUTOPOST_PLATFORMS.includes(p));

  const handlePostNow = async () => {
    if (selected.length === 0) {
      toast.error('Pick at least one platform');
      return;
    }

    // Link-mode: open each selected platform with caption copied
    if (hasLinkSelection && !hasApiSelection) {
      try { await navigator.clipboard.writeText(caption); } catch { /* ignore */ }
      for (const platform of selected) {
        const url = platform === 'x'
          ? `https://x.com/intent/tweet?text=${encodeURIComponent(caption)}`
          : linkComposeUrlFor(platform);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      toast.success('Caption copied — paste into each platform');
      return;
    }

    // Mixed or api-only: fanout-schedule with now-time
    if (!canAutoPost) {
      toast.error('Auto-post to Instagram / LinkedIn / Facebook / Threads / YouTube requires Studio');
      return;
    }
    const apiRows = selected
      .filter((p) => API_AUTOPOST_PLATFORMS.includes(p))
      .filter((p) => connectedAccounts.includes(p))
      .map((platform) => ({ platform, scheduled_at: new Date().toISOString() }));

    if (apiRows.length === 0) {
      toast.error('Connect at least one of the selected platforms in Settings first.');
      return;
    }

    setSubmitting(true);
    try {
      await api.socialPosting.scheduleFanout({
        content_kit_id: contentKitId,
        source_output_id: sourceOutputId,
        text: caption,
        media_urls: mediaUrls,
        finalization_recipe: finalizationRecipe,
        youtube_title: youtubeTitle,
        youtube_duration_seconds: youtubeDurationSeconds,
        rows: apiRows,
        created_via: 'manual_inline',
      });
      toast.success(
        finalizationRecipe
          ? `Queued for ${apiRows.length} platform${apiRows.length === 1 ? '' : 's'} — finalizing media in background`
          : `Posting to ${apiRows.length} platform${apiRows.length === 1 ? '' : 's'}`,
      );

      // Also open any link-mode selections for the user to complete manually
      const linkSelections = selected.filter((p) => !API_AUTOPOST_PLATFORMS.includes(p));
      if (linkSelections.length > 0) {
        try { await navigator.clipboard.writeText(caption); } catch { /* ignore */ }
        for (const platform of linkSelections) {
          const url = platform === 'x'
            ? `https://x.com/intent/tweet?text=${encodeURIComponent(caption)}`
            : linkComposeUrlFor(platform);
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (e: unknown) {
      const msg = extractErrorMessage(e, 'Failed to post');
      toast.error(msg);
      console.error('[VisualPostActions] Post Now failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledAt || selected.length === 0) return;
    const iso = new Date(scheduledAt).toISOString();
    setSubmitting(true);
    try {
      const apiRows = selected
        .filter((p) => API_AUTOPOST_PLATFORMS.includes(p))
        .filter((p) => connectedAccounts.includes(p))
        .map((platform) => ({ platform, scheduled_at: iso }));

      if (canAutoPost && apiRows.length > 0) {
        await api.socialPosting.scheduleFanout({
          content_kit_id: contentKitId,
          source_output_id: sourceOutputId,
          text: caption,
          media_urls: mediaUrls,
          finalization_recipe: finalizationRecipe,
          youtube_title: youtubeTitle,
          youtube_duration_seconds: youtubeDurationSeconds,
          rows: apiRows,
          created_via: 'manual_inline',
        });
      }

      // Any platforms we can't auto-post to (non-Studio tier, disconnected, or link-mode) become reminders
      const reminderPlatforms = selected.filter((p) => !apiRows.some((r) => r.platform === p));
      for (const platform of reminderPlatforms) {
        await api.socialPosting.createReminder({
          content_kit_id: contentKitId,
          source_output_id: sourceOutputId,
          platform,
          text: caption,
          media_urls: mediaUrls,
          scheduled_at: iso,
          created_via: 'manual_inline',
        });
      }

      toast.success(`Scheduled for ${selected.length} platform${selected.length === 1 ? '' : 's'}`);
      setShowSchedule(false);
      setScheduledAt('');
    } catch (e: unknown) {
      const msg = extractErrorMessage(e, 'Failed to schedule');
      toast.error(msg);
      console.error('[VisualPostActions] Schedule failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Post to</label>
        {!canAutoPost && (
          <Link href="/app/billing" className="text-[10px] text-muted-foreground hover:text-foreground">
            <Sparkles className="w-3 h-3 inline mr-0.5" />
            Upgrade for auto-post
          </Link>
        )}
      </div>

      <PlatformMultiPicker
        value={selected}
        onChange={setSelected}
        connectedPlatforms={connectedAccounts}
        disabled={submitting}
        disabledReasons={disabledReasons}
      />

      {!showSchedule ? (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePostNow}
            disabled={submitting || selected.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Post now
          </button>
          <button
            type="button"
            onClick={() => setShowSchedule(true)}
            disabled={submitting || selected.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border border-border text-foreground hover:bg-card disabled:opacity-50"
          >
            <CalendarClock className="w-3 h-3" />
            Schedule
          </button>
          {selected.length === 0 && (
            <span className="text-[10px] text-muted-foreground">Pick one or more platforms above</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="text-xs bg-background border border-border rounded-md px-2 py-1.5"
          />
          <button
            type="button"
            onClick={handleSchedule}
            disabled={!scheduledAt || submitting}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-foreground text-background rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CalendarClock className="w-3 h-3" />}
            Confirm schedule
          </button>
          <button
            type="button"
            onClick={() => { setShowSchedule(false); setScheduledAt(''); }}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function linkComposeUrlFor(platform: string): string {
  const map: Record<string, string> = {
    tiktok: 'https://www.tiktok.com/upload',
    pinterest: 'https://www.pinterest.com/pin-creation-tool/',
    bluesky: 'https://bsky.app',
    google_business: 'https://business.google.com',
  };
  return map[platform] || '#';
}
