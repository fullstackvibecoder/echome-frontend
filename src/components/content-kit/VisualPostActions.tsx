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
import { Loader2, Send, CalendarClock, Sparkles } from 'lucide-react';
import { PlatformMultiPicker, type PlatformId } from '@/components/scheduling/PlatformMultiPicker';

interface Props {
  contentKitId?: string;
  sourceOutputId?: string;
  /** Caption/content that will be posted to each platform */
  caption: string;
  /** Media URLs to attach. For carousels, pass all slides. For clips/reels, the video URL. */
  mediaUrls: string[];
  /** Hint for the platform list: e.g., 'carousel', 'reel' — not used yet but reserved */
  outputKind?: 'carousel' | 'clip' | 'reel';
}

export function VisualPostActions({ contentKitId, sourceOutputId, caption, mediaUrls }: Props) {
  const { hasTierAccess } = useSubscription();
  const canAutoPost = hasTierAccess('studio');

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
          // Default-select Instagram if connected (matches most users' primary target)
          if (platforms.includes('instagram' as PlatformId)) setSelected(['instagram' as PlatformId]);
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasApiSelection = selected.some((p) => ['instagram', 'linkedin', 'facebook', 'threads'].includes(p));
  const hasLinkSelection = selected.some((p) => !['instagram', 'linkedin', 'facebook', 'threads'].includes(p));

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
      toast.error('Auto-post to Instagram / LinkedIn / Facebook / Threads requires Studio');
      return;
    }
    const apiRows = selected
      .filter((p) => ['instagram', 'linkedin', 'facebook', 'threads'].includes(p))
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
        rows: apiRows,
        created_via: 'manual_inline',
      });
      toast.success(`Posting to ${apiRows.length} platform${apiRows.length === 1 ? '' : 's'}`);

      // Also open any link-mode selections for the user to complete manually
      const linkSelections = selected.filter((p) => !['instagram', 'linkedin', 'facebook', 'threads'].includes(p));
      if (linkSelections.length > 0) {
        try { await navigator.clipboard.writeText(caption); } catch { /* ignore */ }
        for (const platform of linkSelections) {
          const url = platform === 'x'
            ? `https://x.com/intent/tweet?text=${encodeURIComponent(caption)}`
            : linkComposeUrlFor(platform);
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to post');
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
        .filter((p) => ['instagram', 'linkedin', 'facebook', 'threads'].includes(p))
        .filter((p) => connectedAccounts.includes(p))
        .map((platform) => ({ platform, scheduled_at: iso }));

      if (canAutoPost && apiRows.length > 0) {
        await api.socialPosting.scheduleFanout({
          content_kit_id: contentKitId,
          source_output_id: sourceOutputId,
          text: caption,
          media_urls: mediaUrls,
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
    } catch (e: any) {
      toast.error(e?.message || 'Failed to schedule');
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
    youtube: 'https://studio.youtube.com',
    pinterest: 'https://www.pinterest.com/pin-creation-tool/',
    bluesky: 'https://bsky.app',
    google_business: 'https://business.google.com',
  };
  return map[platform] || '#';
}
