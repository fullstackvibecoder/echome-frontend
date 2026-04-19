'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Sparkles, Calendar, Clock, XCircle, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { AppPageHeader } from '@/components/app-page-header';

// Platform display config
const PLATFORM_LABELS: Record<string, { name: string; icon: string }> = {
  instagram: { name: 'Instagram', icon: '📷' },
  linkedin: { name: 'LinkedIn', icon: '💼' },
  twitter: { name: 'X', icon: '𝕏' },
  facebook: { name: 'Facebook', icon: '📘' },
  tiktok: { name: 'TikTok', icon: '🎵' },
  threads: { name: 'Threads', icon: '🧵' },
  youtube: { name: 'YouTube', icon: '🎬' },
  bluesky: { name: 'Bluesky', icon: '🦋' },
  pinterest: { name: 'Pinterest', icon: '📌' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  scheduled: { label: 'Scheduled', icon: Clock, className: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  posted: { label: 'Posted', icon: CheckCircle, className: 'text-success bg-success/10' },
  failed: { label: 'Failed', icon: AlertCircle, className: 'text-error bg-error/10' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-muted-foreground bg-muted' },
};

interface ScheduledPost {
  id: string;
  contentKitId: string | null;
  platform: string;
  text: string;
  mediaUrls: string[] | null;
  scheduledAt: string;
  status: string;
  postedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export default function CalendarContent() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<Array<{ platform: string }>>([]);
  const [pastExpanded, setPastExpanded] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.socialPosting.listPosts();
      if (response.success && response.data) {
        setPosts(response.data.posts);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await api.socialPosting.listAccounts();
      if (response.success && response.data) {
        setConnectedAccounts(response.data.accounts);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    loadPosts();
    loadAccounts();
  }, [loadPosts, loadAccounts]);

  const handleCancel = async (postId: string) => {
    try {
      setCancelling(postId);
      await api.socialPosting.cancelPost(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: 'cancelled' } : p))
      );
      toast.success('Post cancelled');
    } catch {
      toast.error('Failed to cancel post');
    } finally {
      setCancelling(null);
    }
  };

  const upcoming = posts.filter((p) => p.status === 'scheduled');
  const past = posts.filter((p) => p.status === 'posted' || p.status === 'failed' || p.status === 'cancelled');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <AppPageHeader
        title="Content Calendar"
        description="Your content schedule"
        actions={
          <>
            <button
              onClick={loadPosts}
              disabled={loading}
              className="p-2 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link href="/app" className="btn-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Create Content
            </Link>
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 && connectedAccounts.length === 0 ? (
        /* No accounts connected — prompt to connect */
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            Connect your social accounts to start scheduling
          </h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Link your Instagram, LinkedIn, X, and more to schedule and auto-post content directly from EchoMe.
          </p>
          <Link
            href="/app/settings?tab=connections"
            className="btn-primary inline-flex items-center gap-2"
          >
            Connect Accounts
          </Link>
        </div>
      ) : posts.length === 0 ? (
        /* Accounts connected but no posts */
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No scheduled posts yet
          </h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Schedule content from any Content Kit to see it here.
          </p>
          <Link href="/app/content-kit" className="btn-primary inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            View Content Kits
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-text-secondary text-sm py-4">
                No scheduled posts. Create content and schedule it from a content kit.
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onCancel={() => handleCancel(post.id)}
                    cancelling={cancelling === post.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Past */}
          {past.length > 0 && (
            <section>
              <button
                onClick={() => setPastExpanded(!pastExpanded)}
                className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2 hover:text-accent transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                Past ({past.length})
                <span className="text-xs text-muted-foreground ml-1">
                  {pastExpanded ? '(collapse)' : '(expand)'}
                </span>
              </button>
              {pastExpanded && (
                <div className="space-y-3">
                  {past.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  onCancel,
  cancelling,
}: {
  post: ScheduledPost;
  onCancel?: () => void;
  cancelling?: boolean;
}) {
  const platform = PLATFORM_LABELS[post.platform] || { name: post.platform, icon: '🔗' };
  const status = STATUS_CONFIG[post.status] || STATUS_CONFIG.scheduled;
  const StatusIcon = status.icon;

  const displayDate = post.postedAt || post.scheduledAt;
  const formattedDate = new Date(displayDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = new Date(displayDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  // Truncate text for preview
  const preview = post.text.length > 120 ? post.text.slice(0, 120) + '...' : post.text;

  return (
    <div className="flex items-start gap-4 p-4 bg-bg-secondary rounded-lg border border-border">
      {/* Date */}
      <div className="text-center min-w-[60px]">
        <div className="text-xs text-text-secondary">{formattedDate}</div>
        <div className="text-sm font-medium text-text-primary">{formattedTime}</div>
      </div>

      {/* Platform icon */}
      <span className="text-2xl mt-0.5">{platform.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-text-primary">{platform.name}</span>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${status.className}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>
        <p className="text-sm text-text-secondary line-clamp-2">{preview}</p>
        {post.errorMessage && (
          <p className="text-xs text-error mt-1">{post.errorMessage}</p>
        )}
        {post.contentKitId && (
          <Link
            href={`/app/content-kit/${post.contentKitId}`}
            className="text-xs text-accent hover:underline mt-1 inline-block"
          >
            View content kit
          </Link>
        )}
      </div>

      {/* Actions */}
      {onCancel && post.status === 'scheduled' && (
        <button
          onClick={onCancel}
          disabled={cancelling}
          className="p-2 text-text-secondary hover:text-error transition-colors disabled:opacity-50"
          title="Cancel scheduled post"
        >
          {cancelling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}
