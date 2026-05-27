'use client';

/**
 * Admin Drafts Analytics
 *
 * D4 Shape C — surface the draft_outcomes data so we can see what's
 * actually firing before committing to a V3 refinement build. Read-only
 * dashboard; admin-gated by the AdminContent.tsx pattern + render guard.
 *
 * Backed by GET /api/admin/drafts/analytics?days=N.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

type Analytics = Awaited<ReturnType<typeof api.adminDraftsAnalytics.get>>;

const WINDOW_OPTIONS = [7, 14, 30, 60, 90];

export default function DraftsAnalyticsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.adminDraftsAnalytics.get(days);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [days]);

  // Admin gate
  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) {
      router.replace('/app');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user?.isAdmin, load]);

  if (authLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }
  if (!user?.isAdmin) {
    return <div className="p-8 text-center text-muted-foreground">Admin access required.</div>;
  }

  return (
    <div className="container mx-auto px-6 py-6 max-w-6xl">
      <header className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drafts analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            What users actually do with their drafts. Helps decide whether V3 voice-refinement is worth building.
          </p>
        </div>
        <div className="flex gap-2">
          {WINDOW_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                d === days
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Totals */}
          <section className="grid grid-cols-3 gap-4 mb-8">
            <Stat label="Outcomes recorded" value={data.totals.outcomes} />
            <Stat label="Distinct users" value={data.totals.distinct_users} />
            <Stat label="Distinct drafts acted on" value={data.totals.distinct_kits} />
          </section>

          {/* Funnel */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-foreground mb-3">Funnel</h2>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <FunnelRow label="Drafts created in window" value={data.funnel.drafts_created} of={data.funnel.drafts_created} />
              <FunnelRow label="Reviewed" value={data.funnel.reviewed} of={data.funnel.drafts_created} />
              <FunnelRow label="Scheduled" value={data.funnel.scheduled} of={data.funnel.drafts_created} />
              <FunnelRow label="Edited" value={data.funnel.edited} of={data.funnel.drafts_created} />
              <FunnelRow label="Posted" value={data.funnel.posted} of={data.funnel.drafts_created} />
              <FunnelRow label="Killed" value={data.funnel.killed} of={data.funnel.drafts_created} />
            </div>
          </section>

          {/* By action */}
          <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">By action</h2>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(data.byAction).map(([action, count]) => (
                    <tr key={action} className="border-b border-border last:border-0">
                      <td className="py-2 text-muted-foreground capitalize">{action}</td>
                      <td className="py-2 text-right font-medium text-foreground">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">By origin (cron vs manual)</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left py-2">action</th>
                    <th className="text-right py-2">autonomous</th>
                    <th className="text-right py-2">user</th>
                  </tr>
                </thead>
                <tbody>
                  {(['reviewed', 'scheduled', 'edited', 'posted', 'killed'] as const).map((a) => (
                    <tr key={a} className="border-b border-border last:border-0">
                      <td className="py-2 text-muted-foreground capitalize">{a}</td>
                      <td className="py-2 text-right text-foreground">{data.byOrigin.autonomous?.[a] || 0}</td>
                      <td className="py-2 text-right text-foreground">{data.byOrigin.user?.[a] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top users */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-foreground mb-3">Top users by engagement (max 20)</h2>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-3">email</th>
                    <th className="text-right py-2 px-3">total</th>
                    <th className="text-right py-2 px-3">reviewed</th>
                    <th className="text-right py-2 px-3">scheduled</th>
                    <th className="text-right py-2 px-3">posted</th>
                    <th className="text-right py-2 px-3">killed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        No outcomes recorded in this window.
                      </td>
                    </tr>
                  )}
                  {data.topUsers.map((u) => (
                    <tr key={u.user_id} className="border-b border-border last:border-0">
                      <td className="py-2 px-3 text-foreground truncate max-w-[280px]">{u.email}</td>
                      <td className="py-2 px-3 text-right font-medium text-foreground">{u.total}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{u.reviewed}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{u.scheduled}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{u.posted}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{u.killed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Daily */}
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-3">Daily breakdown</h2>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border bg-muted/30">
                    <th className="text-left py-2 px-3">date</th>
                    <th className="text-right py-2 px-3">total</th>
                    <th className="text-right py-2 px-3">reviewed</th>
                    <th className="text-right py-2 px-3">scheduled</th>
                    <th className="text-right py-2 px-3">edited</th>
                    <th className="text-right py-2 px-3">posted</th>
                    <th className="text-right py-2 px-3">killed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground">
                        No outcomes in this window.
                      </td>
                    </tr>
                  )}
                  {data.daily.map((d) => (
                    <tr key={d.date} className="border-b border-border last:border-0">
                      <td className="py-2 px-3 text-muted-foreground">{d.date}</td>
                      <td className="py-2 px-3 text-right font-medium text-foreground">{d.total}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{Number(d.reviewed) || 0}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{Number(d.scheduled) || 0}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{Number(d.edited) || 0}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{Number(d.posted) || 0}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{Number(d.killed) || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
    </div>
  );
}

function FunnelRow({ label, value, of }: { label: string; value: number; of: number }) {
  const pct = of > 0 ? Math.round((value / of) * 100) : 0;
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-sm tabular-nums">
        <span className="font-medium text-foreground">{value}</span>
        <span className="text-muted-foreground ml-2">{of > 0 ? `${pct}%` : '—'}</span>
      </span>
    </div>
  );
}
