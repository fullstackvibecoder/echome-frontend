'use client';

import { useState } from 'react';
import { Instagram, CalendarClock, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';

interface InstagramPostActionsProps {
  contentKitId: string;
  caption: string;
  mediaUrls: string[];
  igConnected: boolean;
  /** Label for the content type (e.g., "Clip 1", "Carousel", "B-Roll Reel") */
  label: string;
}

/**
 * Reusable Instagram auto-post actions for visual content.
 * Shows "Post to Instagram" + "Schedule IG Post" buttons when available.
 * Used on clips, carousels, and reels.
 */
export function InstagramPostActions({
  contentKitId,
  caption,
  mediaUrls,
  igConnected,
  label,
}: InstagramPostActionsProps) {
  const { hasTierAccess } = useSubscription();
  const canAutoPost = hasTierAccess('studio');

  const [postingNow, setPostingNow] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduling, setScheduling] = useState(false);

  if (!canAutoPost) {
    return (
      <p className="text-[10px] text-muted-foreground/60 mt-2">
        Auto-post to Instagram available on <Link href="/app/billing" className="text-accent hover:underline">Echo Studio</Link> and above.
      </p>
    );
  }

  if (!igConnected) {
    return (
      <p className="text-[10px] text-muted-foreground/60 mt-2">
        <Link href="/app/settings?tab=connections" className="text-accent hover:underline">Connect Instagram</Link> to post {label} directly.
      </p>
    );
  }

  const handlePostNow = async () => {
    setPostingNow(true);
    try {
      await api.socialPosting.schedule({
        contentKitId,
        platform: 'instagram',
        text: caption,
        mediaUrls,
        scheduledAt: new Date().toISOString(),
      });
      toast.success(`${label} posted to Instagram!`);
    } catch (err) {
      console.error('Failed to post:', err);
      toast.error(`Failed to post ${label} to Instagram`);
    } finally {
      setPostingNow(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledAt) return;
    setScheduling(true);
    try {
      await api.socialPosting.schedule({
        contentKitId,
        platform: 'instagram',
        text: caption,
        mediaUrls,
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      const displayDate = new Date(scheduledAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      });
      toast.success(`${label} scheduled for ${displayDate} on Instagram`);
      setShowSchedule(false);
      setScheduledAt('');
    } catch (err) {
      console.error('Failed to schedule:', err);
      toast.error('Failed to schedule post');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handlePostNow}
          disabled={postingNow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E4405F] text-white text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {postingNow ? <Loader2 className="w-3 h-3 animate-spin" /> : <Instagram className="w-3 h-3" />}
          {postingNow ? 'Posting...' : 'Post to IG'}
        </button>
        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
            showSchedule ? 'bg-primary-interactive text-white' : 'border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarClock className="w-3 h-3" />
          Schedule
        </button>
      </div>

      {showSchedule && (
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="flex-1 min-w-[160px] px-2 py-1.5 text-[11px] bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50"
          />
          <button
            onClick={handleSchedule}
            disabled={!scheduledAt || scheduling}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-interactive text-white text-[11px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {scheduling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            {scheduling ? '...' : 'Confirm'}
          </button>
        </div>
      )}
    </div>
  );
}
