'use client';

/**
 * Admin Feedback inbox.
 *
 * Source: user_feedback table populated by /api/help/feedback (the in-app
 * "Report a bug / Send feedback" widget). Bug reports also fire an admin
 * email via templates.feedbackReceivedEmail; the "View in Dashboard"
 * button on that email lands here.
 *
 * Goals (per founder review 2026-04-30):
 *   - List view, expandable rows for full context
 *   - Status filter
 *   - Mark resolved / dismissed inline
 *   - No reply/inbox surface (separate concern)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  api,
  FeedbackRecord,
  FeedbackStatus,
  FeedbackCategory,
} from '@/lib/api-client';
import { ChevronRight, Loader2, ExternalLink } from 'lucide-react';

const STATUS_FILTERS: Array<{ id: 'all' | FeedbackStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'dismissed', label: 'Dismissed' },
];

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  feature_request: 'Feature',
  general: 'General',
  help_chat: 'Help chat',
};

const CATEGORY_STYLES: Record<FeedbackCategory, string> = {
  bug: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900',
  feature_request: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
  general: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700',
  help_chat: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
};

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  dismissed: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700',
};

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function FeedbackContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<FeedbackRecord[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) router.replace('/app');
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.help.adminListFeedback({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      });
      setItems(r.data);
      setCount(r.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user?.isAdmin, load]);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateStatus = async (id: string, status: FeedbackStatus) => {
    setSavingIds(prev => new Set(prev).add(id));
    try {
      const r = await api.help.adminUpdateFeedback(id, { status });
      setItems(prev => prev.map(it => (it.id === id ? r.data : it)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (authLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user?.isAdmin) {
    return <div className="p-8 text-center text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feedback</h1>
        <p className="text-muted-foreground text-sm">User-submitted bug reports, feature requests, and general feedback.</p>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_FILTERS.map(f => {
          const active = statusFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {f.label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? 'Loading…' : `${items.length} of ${count}`}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No feedback in this view.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map(item => {
              const expanded = expandedIds.has(item.id);
              const saving = savingIds.has(item.id);
              const fromLabel = item.user_name
                ? `${item.user_name}${item.user_email ? ` · ${item.user_email}` : ''}`
                : item.user_email ?? `user ${item.user_id.slice(0, 8)}`;
              return (
                <li key={item.id} className="hover:bg-muted/30 transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item.id)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    <ChevronRight
                      className={`w-4 h-4 mt-1 text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${CATEGORY_STYLES[item.category]}`}>
                          {CATEGORY_LABELS[item.category]}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_STYLES[item.status]}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">{fromLabel}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{formatRelative(item.created_at)}</span>
                      </div>
                      <p className={`text-sm text-foreground ${expanded ? '' : 'line-clamp-2'}`}>{item.text}</p>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 pl-11 space-y-3">
                      {item.page_context && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Page: </span>
                          <a
                            href={item.page_context.startsWith('http') ? item.page_context : `${item.page_context}`}
                            target="_blank"
                            rel="noopener"
                            className="text-primary-interactive hover:underline inline-flex items-center gap-1"
                          >
                            {item.page_context}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {item.screenshot_url && (
                        <div>
                          <a
                            href={item.screenshot_url}
                            target="_blank"
                            rel="noopener"
                            className="text-xs text-primary-interactive hover:underline inline-flex items-center gap-1"
                          >
                            View screenshot
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {item.rating != null && (
                        <div className="text-xs text-muted-foreground">Rating: {item.rating}</div>
                      )}
                      {item.admin_notes && (
                        <div className="text-xs">
                          <div className="font-medium text-foreground mb-1">Admin notes</div>
                          <div className="text-muted-foreground whitespace-pre-wrap">{item.admin_notes}</div>
                        </div>
                      )}
                      {Object.keys(item.metadata ?? {}).length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Metadata</summary>
                          <pre className="mt-2 p-2 bg-muted/40 rounded text-[11px] overflow-x-auto">{JSON.stringify(item.metadata, null, 2)}</pre>
                        </details>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {(['new', 'in_progress', 'resolved', 'dismissed'] as FeedbackStatus[]).map(s => {
                          const active = item.status === s;
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={saving || active}
                              onClick={() => updateStatus(item.id, s)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                active
                                  ? `${STATUS_STYLES[s]} cursor-default`
                                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50 disabled:opacity-50'
                              }`}
                            >
                              {active ? '✓ ' : ''}
                              {s.replace('_', ' ')}
                            </button>
                          );
                        })}
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-1" />}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
