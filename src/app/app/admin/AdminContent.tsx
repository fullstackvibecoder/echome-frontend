'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import {
  api,
  AdminUsageOverview,
  AdminServiceBreakdown,
  AdminUserBreakdown,
  AdminDailyTrend,
  AdminBusinessMetrics,
  AdminErrorHealth,
} from '@/lib/api-client';

// ==================== Types ====================

type Tab = 'overview' | 'services' | 'users' | 'trends' | 'providers';

interface ProviderDataEntry {
  provider: string;
  metrics: Record<string, unknown>;
  fromCache: boolean;
}

interface ProviderData {
  openai?: ProviderDataEntry;
  anthropic?: ProviderDataEntry;
  sociavault?: ProviderDataEntry;
  elevenlabs?: ProviderDataEntry;
  deepgram?: ProviderDataEntry;
  pinecone?: ProviderDataEntry;
  stripe?: ProviderDataEntry;
}

// ==================== Helpers ====================

function formatCost(cost: number): string {
  // Show 2 decimals for amounts >= $1, 4 decimals for tiny amounts
  return cost >= 1 ? `$${cost.toFixed(2)}` : `$${cost.toFixed(4)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const SERVICE_COLORS: Record<string, string> = {
  openai: 'bg-emerald-500',
  anthropic: 'bg-violet-500',
  elevenlabs: 'bg-pink-500',
  deepgram: 'bg-cyan-500',
  pinecone: 'bg-amber-500',
  sociavault: 'bg-orange-500',
  aws: 'bg-yellow-500',
  resend: 'bg-blue-500',
};

const SERVICE_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  elevenlabs: 'ElevenLabs',
  deepgram: 'Deepgram',
  pinecone: 'Pinecone',
  sociavault: 'SociaVault',
  aws: 'AWS',
  resend: 'Resend',
};

// ==================== Components ====================

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function ServiceBar({ service, cost, maxCost }: { service: AdminServiceBreakdown; cost: number; maxCost: number }) {
  const pct = maxCost > 0 ? (cost / maxCost) * 100 : 0;
  const color = SERVICE_COLORS[service.service] || 'bg-gray-400';
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-sm font-medium text-foreground truncate">
        {SERVICE_LABELS[service.service] || service.service}
      </div>
      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <div className="w-24 text-right text-sm font-mono text-foreground">{formatCost(cost)}</div>
      <div className="w-16 text-right text-xs text-muted-foreground">{formatNumber(service.requestCount)} req</div>
    </div>
  );
}

// ==================== Tab: Overview ====================

function OverviewTab({ month }: { month: string }) {
  const [data, setData] = useState<AdminUsageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.adminUsage.getOverview(month)
      .then(res => { if (res.success) setData(res.data); else setError('Failed to load'); })
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [month]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const maxCost = Math.max(...data.spendByService.map(s => s.totalCost), 0.001);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Spend" value={formatCost(data.totalSpend)} sub={getMonthLabel(data.month)} />
        <StatCard label="Total Tokens" value={formatNumber(data.totalTokens)} />
        <StatCard label="API Requests" value={formatNumber(data.totalRequests)} />
        <StatCard label="Active Users" value={data.activeUsers.toString()} />
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Spend by Service</h3>
        <div className="space-y-3">
          {data.spendByService.length === 0 && (
            <p className="text-muted-foreground text-sm">No usage data for this month.</p>
          )}
          {data.spendByService.map(s => (
            <ServiceBar key={s.service} service={s} cost={s.totalCost} maxCost={maxCost} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== Tab: Services ====================

function ServicesTab({ month }: { month: string }) {
  const [data, setData] = useState<AdminServiceBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const start = `${month}-01T00:00:00Z`;
    const [y, m] = month.split('-').map(Number);
    const end = new Date(y, m, 1).toISOString();
    api.adminUsage.getByService(start, end)
      .then(res => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));
  }, [month]);

  if (loading) return <LoadingState />;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-4 font-medium text-muted-foreground">Service</th>
            <th className="text-right p-4 font-medium text-muted-foreground">Cost</th>
            <th className="text-right p-4 font-medium text-muted-foreground">Tokens</th>
            <th className="text-right p-4 font-medium text-muted-foreground">Requests</th>
          </tr>
        </thead>
        <tbody>
          {data.map(s => (
            <tr key={s.service} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="p-4 font-medium text-foreground flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${SERVICE_COLORS[s.service] || 'bg-gray-400'}`} />
                {SERVICE_LABELS[s.service] || s.service}
              </td>
              <td className="p-4 text-right font-mono text-foreground">{formatCost(s.totalCost)}</td>
              <td className="p-4 text-right text-muted-foreground">{formatNumber(s.totalTokens)}</td>
              <td className="p-4 text-right text-muted-foreground">{formatNumber(s.requestCount)}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No data</td></tr>
          )}
        </tbody>
        {data.length > 0 && (
          <tfoot>
            <tr className="bg-muted/50 font-semibold">
              <td className="p-4 text-foreground">Total</td>
              <td className="p-4 text-right font-mono text-foreground">{formatCost(data.reduce((s, r) => s + r.totalCost, 0))}</td>
              <td className="p-4 text-right text-foreground">{formatNumber(data.reduce((s, r) => s + r.totalTokens, 0))}</td>
              <td className="p-4 text-right text-foreground">{formatNumber(data.reduce((s, r) => s + r.requestCount, 0))}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ==================== Tab: Users ====================

function UsersTab({ month }: { month: string }) {
  const [data, setData] = useState<AdminUserBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.adminUsage.getByUser(month, 50)
      .then(res => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));
  }, [month]);

  if (loading) return <LoadingState />;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-4 font-medium text-muted-foreground">#</th>
            <th className="text-left p-4 font-medium text-muted-foreground">User</th>
            <th className="text-right p-4 font-medium text-muted-foreground">Cost</th>
            <th className="text-right p-4 font-medium text-muted-foreground">Tokens</th>
            <th className="text-right p-4 font-medium text-muted-foreground">Requests</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u, i) => (
            <tr key={u.userId} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="p-4 text-muted-foreground">{i + 1}</td>
              <td className="p-4 text-foreground">
                <span className="font-medium">{u.email || 'System'}</span>
                <span className="text-xs text-muted-foreground ml-2">{u.userId?.slice(0, 8)}</span>
              </td>
              <td className="p-4 text-right font-mono text-foreground">{formatCost(u.totalCost)}</td>
              <td className="p-4 text-right text-muted-foreground">{formatNumber(u.totalTokens)}</td>
              <td className="p-4 text-right text-muted-foreground">{formatNumber(u.requestCount)}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No user data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ==================== Tab: Trends ====================

function TrendsTab({ month }: { month: string }) {
  const [data, setData] = useState<AdminDailyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    const start = `${month}-01T00:00:00Z`;
    const [y, m] = month.split('-').map(Number);
    const end = new Date(y, m, 1).toISOString();
    api.adminUsage.getTrends(start, end, serviceFilter || undefined)
      .then(res => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));
  }, [month, serviceFilter]);

  if (loading) return <LoadingState />;

  // Group by date for chart-like display
  const dateMap = new Map<string, { total: number; byService: Record<string, number> }>();
  data.forEach(d => {
    const entry = dateMap.get(d.date) || { total: 0, byService: {} };
    entry.total += d.cost;
    entry.byService[d.service] = (entry.byService[d.service] || 0) + d.cost;
    dateMap.set(d.date, entry);
  });

  const dates = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  const maxDailyCost = Math.max(...dates.map(([, v]) => v.total), 0.001);

  // Get unique services for filter
  const services = [...new Set(data.map(d => d.service))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setServiceFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !serviceFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All
        </button>
        {services.map(s => (
          <button
            key={s}
            onClick={() => setServiceFilter(s === serviceFilter ? '' : s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              serviceFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {SERVICE_LABELS[s] || s}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">Daily Cost</h3>
        {dates.length === 0 ? (
          <p className="text-muted-foreground text-sm">No trend data for this period.</p>
        ) : (
          <div className="space-y-1.5">
            {dates.map(([date, val]) => {
              const pct = (val.total / maxDailyCost) * 100;
              const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <div key={date} className="flex items-center gap-3 group">
                  <div className="w-16 text-xs text-muted-foreground shrink-0">{dayLabel}</div>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden flex">
                    {Object.entries(val.byService).map(([svc, cost]) => {
                      const svcPct = (cost / maxDailyCost) * 100;
                      const color = SERVICE_COLORS[svc] || 'bg-gray-400';
                      return (
                        <div
                          key={svc}
                          className={`h-full ${color} transition-all duration-300`}
                          style={{ width: `${svcPct}%` }}
                          title={`${SERVICE_LABELS[svc] || svc}: ${formatCost(cost)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="w-20 text-right text-xs font-mono text-foreground">{formatCost(val.total)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Tab: Providers ====================

function ProvidersTab() {
  const [data, setData] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.adminUsage.getProviders()
      .then(res => { if (res.success) setData(res.data as ProviderData); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!data) return <ErrorState message="No provider data" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* AI Providers — internal tracking */}
      <ProviderCard
        name="OpenAI"
        color="bg-emerald-500"
        data={data.openai}
        renderMetrics={(m) => (
          <>
            <MetricRow label="Monthly Cost" value={formatCost(Number(m.monthlyCost) || 0)} />
            <MetricRow label="Tokens" value={formatNumber(Number(m.totalTokens) || 0)} />
            <MetricRow label="Requests" value={formatNumber(Number(m.requestCount) || 0)} />
          </>
        )}
      />
      <ProviderCard
        name="Anthropic"
        color="bg-violet-500"
        data={data.anthropic}
        renderMetrics={(m) => (
          <>
            <MetricRow label="Monthly Cost" value={formatCost(Number(m.monthlyCost) || 0)} />
            <MetricRow label="Tokens" value={formatNumber(Number(m.totalTokens) || 0)} />
            <MetricRow label="Requests" value={formatNumber(Number(m.requestCount) || 0)} />
          </>
        )}
      />
      <ProviderCard
        name="SociaVault"
        color="bg-orange-500"
        data={data.sociavault}
        renderMetrics={(m) => (
          <>
            <MetricRow label="Monthly Cost" value={formatCost(Number(m.monthlyCost) || 0)} />
            <MetricRow label="Tokens" value={formatNumber(Number(m.totalTokens) || 0)} />
            <MetricRow label="Requests" value={formatNumber(Number(m.requestCount) || 0)} />
          </>
        )}
      />

      {/* External provider APIs */}
      <ProviderCard
        name="ElevenLabs"
        color="bg-pink-500"
        data={data.elevenlabs}
        renderMetrics={(m) => (
          <>
            <MetricRow label="Characters Used" value={formatNumber(Number(m.characterCount) || 0)} />
            <MetricRow label="Character Limit" value={formatNumber(Number(m.characterLimit) || 0)} />
            <MetricRow label="Usage" value={`${m.characterUsagePercent || 0}%`} />
            <MetricRow label="Tier" value={String(m.tier || 'unknown')} />
            {m.nextResetDate && <MetricRow label="Resets" value={new Date(String(m.nextResetDate)).toLocaleDateString()} />}
          </>
        )}
      />
      <ProviderCard
        name="Deepgram"
        color="bg-cyan-500"
        data={data.deepgram}
        renderMetrics={(m) => (
          <>
            <MetricRow label="Hours Transcribed" value={String(m.totalHours || 0)} />
            <MetricRow label="Minutes" value={String(m.totalMinutes || 0)} />
            <MetricRow label="Requests" value={formatNumber(Number(m.requestCount) || 0)} />
          </>
        )}
      />
      <ProviderCard
        name="Pinecone"
        color="bg-amber-500"
        data={data.pinecone}
        renderMetrics={(m) => (
          <>
            <MetricRow label="Total Vectors" value={formatNumber(Number(m.totalVectorCount) || 0)} />
            <MetricRow label="Index" value={String(m.indexName || 'N/A')} />
            {Array.isArray(m.namespaces) && m.namespaces.length > 0 && (
              <MetricRow label="Namespaces" value={String(m.namespaces.length)} />
            )}
          </>
        )}
      />
      <ProviderCard
        name="Stripe"
        color="bg-indigo-500"
        data={data.stripe}
        renderMetrics={(m) => (
          <>
            <MetricRow label="Monthly Revenue" value={`$${Number(m.monthlyRevenue || 0).toFixed(2)}`} />
            <MetricRow label="MRR (Paying)" value={`$${Number(m.mrr || 0).toFixed(2)}`} />
            <MetricRow label="Paying Subs" value={String(m.activeSubscriptions || 0)} />
            {Number(m.trialingSubscriptions) > 0 && (
              <MetricRow label="In Trial" value={String(m.trialingSubscriptions)} />
            )}
            <MetricRow label="Charges" value={String(m.chargesThisMonth || 0)} />
          </>
        )}
      />
    </div>
  );
}

function ProviderCard({
  name,
  color,
  data,
  renderMetrics,
}: {
  name: string;
  color: string;
  data?: { provider: string; metrics: Record<string, unknown>; fromCache: boolean };
  renderMetrics: (metrics: Record<string, unknown>) => React.ReactNode;
}) {
  if (!data) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 opacity-50">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-3 h-3 rounded-full ${color}`} />
          <h4 className="font-semibold text-foreground">{name}</h4>
        </div>
        <p className="text-sm text-muted-foreground">Not configured</p>
      </div>
    );
  }

  const hasError = 'error' in data.metrics;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${color}`} />
          <h4 className="font-semibold text-foreground">{name}</h4>
        </div>
        {data.fromCache && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">cached</span>
        )}
      </div>
      {hasError ? (
        <p className="text-sm text-destructive">{String(data.metrics.error)}</p>
      ) : (
        <div className="space-y-2">{renderMetrics(data.metrics)}</div>
      )}
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
      <p className="text-destructive font-medium">{message}</p>
    </div>
  );
}

// ==================== Business Metrics ====================

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_CONFIG = {
  green: { label: 'All Clear', bg: 'bg-emerald-500', ring: 'ring-emerald-500/20' },
  yellow: { label: 'Some Errors', bg: 'bg-amber-500', ring: 'ring-amber-500/20' },
  red: { label: 'Needs Attention', bg: 'bg-red-500', ring: 'ring-red-500/20' },
} as const;

function ErrorHealthMonitor() {
  const [data, setData] = useState<AdminErrorHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.adminErrors.getHealth();
      if (res.success) setData(res.data);
    } catch (err) {
      console.error('Failed to load error health', err);
    }
  }, []);

  useEffect(() => {
    fetchHealth().finally(() => setLoading(false));
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-muted" />
          <div className="h-4 bg-muted rounded w-28" />
          <div className="h-4 bg-muted rounded w-40 ml-auto" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cfg = STATUS_CONFIG[data.status];

  return (
    <div className="bg-card rounded-xl border border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
      >
        {/* Traffic light dot */}
        <span className={`w-3 h-3 rounded-full ${cfg.bg} ring-4 ${cfg.ring} shrink-0`} />

        <span className="text-sm font-medium text-foreground">System Health</span>
        <span className="text-xs font-medium text-muted-foreground">{cfg.label}</span>

        {/* Counts */}
        <span className="ml-auto text-xs text-muted-foreground font-mono">
          {data.counts.last1h} / 1h
          <span className="mx-1.5 text-border">·</span>
          {data.counts.last24h} / 24h
          <span className="mx-1.5 text-border">·</span>
          {data.counts.last7d} / 7d
        </span>

        {/* Expand chevron */}
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable recent errors */}
      {expanded && data.recentErrors.length > 0 && (
        <div className="border-t border-border px-4 pb-3">
          <div className="divide-y divide-border">
            {data.recentErrors.map((err) => (
              <div key={err.id} className="py-2.5 flex items-start gap-3">
                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap pt-0.5">
                  {timeAgo(err.created_at)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{err.error_message}</p>
                  <p className="text-xs text-muted-foreground">
                    {err.error_type}{err.endpoint ? ` — ${err.endpoint}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && data.recentErrors.length === 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">No recent errors</p>
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

function BusinessMetrics() {
  const [data, setData] = useState<AdminBusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminMetrics.get()
      .then(res => { if (res.success) setData(res.data); })
      .catch(err => console.error('Failed to load business metrics', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
            <div className="h-4 bg-muted rounded w-20 mb-2" />
            <div className="h-7 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  // Safe defaults for fields that may be missing from stale cache
  const trialSubs = data.trialSubscribers || [];
  const stripeTrials = trialSubs.filter(t => t.source === 'stripe');
  const adminTrials = trialSubs.filter(t => t.source === 'admin');
  const freeUsers = data.freeUsers || 0;

  return (
    <div className="space-y-4">
      {/* Top-level stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="MRR" value={formatCurrency(data.mrr)} sub="Paying only" />
        <StatCard label="ARR" value={formatCurrency(data.arr)} />
        <StatCard label="Paying" value={data.activeSubscribers.toString()} />
        <StatCard label="Stripe Trials" value={stripeTrials.length.toString()} sub={stripeTrials.length > 0 ? `${stripeTrials[0].daysRemaining}d left` : undefined} />
        <StatCard label="Admin Trials" value={adminTrials.length.toString()} sub={adminTrials.length > 0 ? `${adminTrials[0].daysRemaining}d left` : undefined} />
        <StatCard label="Total Users" value={data.totalUsers.toString()} sub={`${freeUsers} free`} />
      </div>

      {/* Tier breakdown + conversion rate */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm text-muted-foreground">
        {(data.tierBreakdown || []).map(t => (
          <span key={t.tier}>
            <span className="font-medium text-foreground">{t.tier}</span>
            {': '}
            {t.count} ({formatCurrency(t.mrr)})
          </span>
        ))}
        {data.conversionRate != null && (
          <span className="border-l border-border pl-4">
            Trial → Paid: <span className="font-medium text-foreground">{data.conversionRate}%</span>
            <span className="text-xs ml-1">({data.convertedCount || 0}/{(data.convertedCount || 0) + (data.canceledTrialCount || 0)})</span>
          </span>
        )}
      </div>

      {/* Trial subscribers table */}
      {trialSubs.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/50">
            <h3 className="text-sm font-semibold text-foreground">Trial Users ({trialSubs.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 pl-5 font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Source</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Trial Ends</th>
                <th className="text-right p-3 pr-5 font-medium text-muted-foreground">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {trialSubs.map((t, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3 pl-5 text-foreground">{t.email}</td>
                  <td className="p-3 text-muted-foreground">{t.tier}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      t.source === 'stripe' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {t.source === 'stripe' ? '7-day' : '14-day'}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(t.trialEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-3 pr-5 text-right">
                    <span className={`font-medium ${t.daysRemaining <= 3 ? 'text-destructive' : t.daysRemaining <= 7 ? 'text-amber-500' : 'text-foreground'}`}>
                      {t.daysRemaining}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== Main ====================

export default function AdminContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [month, setMonth] = useState(getCurrentMonth());

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) {
      router.replace('/app');
    }
  }, [authLoading, user, router]);

  if (authLoading) return <LoadingState />;
  if (!user?.isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'services', label: 'Services' },
    { id: 'users', label: 'Users' },
    { id: 'trends', label: 'Trends' },
    { id: 'providers', label: 'Providers' },
  ];

  // Generate month options (last 6 months)
  const monthOptions: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Platform-wide API usage and cost monitoring</p>
        </div>
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {monthOptions.map(m => (
            <option key={m} value={m}>{getMonthLabel(m)}</option>
          ))}
        </select>
      </div>

      {/* TODO: Remove after Sentry verification */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            Sentry.captureException(new Error('[Sentry Test] Direct capture — ' + new Date().toISOString()));
            alert('Sentry event sent! Check your dashboard.');
          }}
          className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          Test Sentry (Silent)
        </button>
        <button
          onClick={() => { throw new Error('[Sentry Test] Uncaught error — ' + new Date().toISOString()); }}
          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Test Sentry (Crash)
        </button>
      </div>

      {/* Business Metrics — always visible */}
      <BusinessMetrics />

      {/* Error Health Monitor */}
      <ErrorHealthMonitor />

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && <OverviewTab month={month} />}
      {tab === 'services' && <ServicesTab month={month} />}
      {tab === 'users' && <UsersTab month={month} />}
      {tab === 'trends' && <TrendsTab month={month} />}
      {tab === 'providers' && <ProvidersTab />}
    </div>
  );
}
