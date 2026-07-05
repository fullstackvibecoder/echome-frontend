'use client';

/**
 * WrittenPostActions
 *
 * Per-platform Post Now + Schedule buttons for a written post output. Platform
 * is implicit from the content type (Instagram caption → IG, LinkedIn post → LI,
 * etc.) — no platform picker, just two buttons.
 *
 * Tier behavior:
 *   Studio+ → Post Now calls the API, Schedule opens the time picker
 *   Lower tiers → Schedule becomes "Schedule reminder" (creates a calendar
 *   reminder with email notification at the scheduled time)
 *
 * Platform behavior:
 *   api-mode platforms (ig/li/fb/threads) → Post Now calls the API
 *   link-mode platforms (x/tiktok/...) → Post Now copies content and opens
 *     the native compose view
 */
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/error-utils';
import { Loader2, Send, CalendarClock, ExternalLink, Copy } from 'lucide-react';

type PostingMode = 'api' | 'link';

const PLATFORM_CONFIG: Record<string, { label: string; mode: PostingMode; composeUrl: string }> = {
  instagram:       { label: 'Instagram', mode: 'api',  composeUrl: 'https://www.instagram.com' },
  linkedin:        { label: 'LinkedIn',  mode: 'api',  composeUrl: 'https://www.linkedin.com/feed/' },
  facebook:        { label: 'Facebook',  mode: 'api',  composeUrl: 'https://www.facebook.com' },
  threads:         { label: 'Threads',   mode: 'api',  composeUrl: 'https://www.threads.net' },
  x:               { label: 'X',         mode: 'link', composeUrl: 'https://x.com/intent/tweet' },
  // TikTok is 'api' for VIDEO (clips/reels) but stays 'link' HERE on purpose:
  // this component posts WRITTEN text, and TikTok has no text-post shape —
  // an api-mode attempt would 400 at the backend video-only guard. Copy the
  // caption + open the upload page is the correct written-content behavior.
  tiktok:          { label: 'TikTok',    mode: 'link', composeUrl: 'https://www.tiktok.com/upload' },
  pinterest:       { label: 'Pinterest', mode: 'link', composeUrl: 'https://www.pinterest.com/pin-creation-tool/' },
  bluesky:         { label: 'Bluesky',   mode: 'api',  composeUrl: 'https://bsky.app' },
  google_business: { label: 'Google Business', mode: 'link', composeUrl: 'https://business.google.com' },
};

interface Props {
  platform: string;
  contentKitId?: string;
  sourceOutputId?: string;
  text: string;
  /** Whether this user has connected this platform (for api-mode only) */
  connected: boolean;
  /** Content-kit field name (e.g. 'contentLinkedin'). When provided, the
   *  current text is persisted to the kit after a successful post or schedule
   *  so live edits are not lost. */
  fieldName?: string;
}

export function WrittenPostActions({ platform, contentKitId, sourceOutputId, text, connected, fieldName }: Props) {
  const { canAutoPost } = useSubscription();

  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) return null;

  const [postingNow, setPostingNow] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Compose URL for link-mode platforms (copy-and-open)
  const composeUrl = (() => {
    if (platform === 'x') {
      const q = new URLSearchParams({ text }).toString();
      return `${cfg.composeUrl}?${q}`;
    }
    return cfg.composeUrl;
  })();

  const handlePostNow = async () => {
    if (cfg.mode === 'link') {
      // Copy content + open native compose view
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // clipboard can fail in some contexts; still open the tab
      }
      window.open(composeUrl, '_blank', 'noopener,noreferrer');
      toast.success(`Content copied — paste into ${cfg.label}`);
      return;
    }

    // API mode
    if (!canAutoPost) {
      toast('Auto-post is an Echo Studio feature', {
        description: 'Upgrade to post directly, or use Schedule to set an email reminder instead.',
        action: { label: 'Upgrade', onClick: () => { window.location.href = '/app/billing'; } },
      });
      return;
    }
    if (!connected) {
      toast.error(`Connect your ${cfg.label} account in Settings first.`);
      return;
    }

    setPostingNow(true);
    try {
      await api.socialPosting.schedule({
        contentKitId,
        platform,
        text,
        scheduledAt: new Date().toISOString(),
      });
      toast.success(`Posted to ${cfg.label}`);
      if (contentKitId && fieldName) {
        api.contentKits.update(contentKitId, { [fieldName]: text } as any).catch(() => {/* best-effort */});
      }
    } catch (err: unknown) {
      console.error('[WrittenPostActions] Post failed', err);
      toast.error(extractErrorMessage(err, `Failed to post to ${cfg.label}`));
    } finally {
      setPostingNow(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledAt) return;
    const scheduleIso = new Date(scheduledAt).toISOString();
    setScheduling(true);
    try {
      if (canAutoPost && cfg.mode === 'api' && connected) {
        await api.socialPosting.schedule({
          contentKitId,
          platform,
          text,
          scheduledAt: scheduleIso,
        });
        toast.success(`Scheduled for ${cfg.label}`);
        if (contentKitId && fieldName) {
          api.contentKits.update(contentKitId, { [fieldName]: text } as any).catch(() => {/* best-effort */});
        }
      } else {
        // Fallback: create a reminder (works for all tiers and all platforms)
        await api.socialPosting.createReminder({
          content_kit_id: contentKitId,
          source_output_id: sourceOutputId,
          platform,
          text,
          scheduled_at: scheduleIso,
          created_via: 'manual_inline',
        });
        toast.success(`Reminder set for ${cfg.label}`);
        if (contentKitId && fieldName) {
          api.contentKits.update(contentKitId, { [fieldName]: text } as any).catch(() => {/* best-effort */});
        }
      }
      setShowSchedule(false);
      setScheduledAt('');
    } catch (err: unknown) {
      console.error('[WrittenPostActions] Schedule failed', err);
      toast.error(extractErrorMessage(err, 'Failed to schedule'));
    } finally {
      setScheduling(false);
    }
  };

  // --- Render ---

  if (showSchedule) {
    return (
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="text-xs bg-background border border-border rounded-md px-2 py-1.5"
          min={new Date().toISOString().slice(0, 16)}
        />
        <button
          type="button"
          onClick={handleSchedule}
          disabled={!scheduledAt || scheduling}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-foreground text-background rounded-md text-xs font-medium hover:opacity-90 disabled:opacity-50"
        >
          {scheduling ? <Loader2 className="w-3 h-3 animate-spin" /> : <CalendarClock className="w-3 h-3" />}
          {canAutoPost && cfg.mode === 'api' && connected ? 'Schedule' : 'Set reminder'}
        </button>
        <button
          type="button"
          onClick={() => { setShowSchedule(false); setScheduledAt(''); }}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
      <button
        type="button"
        onClick={handlePostNow}
        disabled={postingNow || (cfg.mode === 'api' && canAutoPost && !connected)}
        title={
          cfg.mode === 'link'
            ? `Copies content and opens ${cfg.label}`
            : !canAutoPost
              ? 'Auto-post is available on Echo Studio and above'
              : !connected
                ? `Connect ${cfg.label} in Settings to post directly`
                : `Post to ${cfg.label} now`
        }
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {postingNow ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : cfg.mode === 'link' ? (
          <ExternalLink className="w-3 h-3" />
        ) : (
          <Send className="w-3 h-3" />
        )}
        {cfg.mode === 'link' ? `Open ${cfg.label}` : 'Post now'}
      </button>

      <button
        type="button"
        onClick={() => setShowSchedule(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-foreground hover:bg-card transition-colors"
        title={canAutoPost && cfg.mode === 'api' && connected ? 'Schedule an auto-post' : 'Set a reminder'}
      >
        <CalendarClock className="w-3 h-3" />
        Schedule
      </button>

      {/* Helper text for non-capable states */}
      {cfg.mode === 'api' && !canAutoPost && (
        <span className="text-[10px] text-muted-foreground/70">
          <Link href="/app/billing" className="underline hover:text-foreground">Upgrade to Studio</Link> for auto-post
        </span>
      )}
      {cfg.mode === 'api' && canAutoPost && !connected && (
        <span className="text-[10px] text-muted-foreground/70">
          <Link href="/app/settings" className="underline hover:text-foreground">Connect {cfg.label}</Link> to post directly
        </span>
      )}
    </div>
  );
}
