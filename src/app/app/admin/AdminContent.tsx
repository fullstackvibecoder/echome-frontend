'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  api,
  AdminUsageOverview,
  AdminServiceBreakdown,
  AdminUserBreakdown,
  AdminDailyTrend,
  AdminBusinessMetrics,
  AdminErrorHealth,
  AdminSegmentationData,
  AdminUserSegment,
  BroadcastPreviewResponse,
  BroadcastSendResponse,
} from '@/lib/api-client';

// ==================== Types ====================

type Tab = 'overview' | 'services' | 'users' | 'trends' | 'providers' | 'curated' | 'voice-lab';

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
      {/* AI Providers - internal tracking */}
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
                    {err.error_type}{err.endpoint ? ` - ${err.endpoint}` : ''}
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
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.adminMetrics.get();
      if (res.success) {
        setData(res.data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to load business metrics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

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
      {/* Refresh row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <span className="text-xs text-muted-foreground">
              Refreshed {timeAgo(lastRefreshed.toISOString())}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchMetrics(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

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

// ==================== Email Compose Modal ====================

const ADMIN_SIGNATURES: Record<string, { name: string; title: string }> = {
  'ara@tryechome.com': { name: 'Ara', title: 'Co-founder, EchoMe' },
  'jess@jesslenouvel.com': { name: 'Jess', title: 'Co-founder, EchoMe' },
};

function getAdminSignature(email: string): { name: string; title: string } {
  return ADMIN_SIGNATURES[email.toLowerCase()] || { name: 'The EchoMe Team', title: 'EchoMe' };
}

type ComposePhase = 'compose' | 'preview' | 'sending' | 'sent' | 'error';

function EmailComposeModal({ segment, adminEmail, onClose }: {
  segment: string;
  adminEmail: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<ComposePhase>('compose');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [previewData, setPreviewData] = useState<BroadcastPreviewResponse | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signature = getAdminSignature(adminEmail);

  const handlePreview = async () => {
    try {
      setError(null);
      setPhase('preview');
      const data = await api.adminBroadcast.preview(segment, subject, body);
      setPreviewData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
      setPhase('error');
    }
  };

  const handleSend = async () => {
    try {
      setPhase('sending');
      const result = await api.adminBroadcast.send(segment, subject, body);
      setSendResult({ sent: result.sent, failed: result.failed });
      setPhase('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
      setPhase('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Email: {segment}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Compose Phase */}
        {phase === 'compose' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                rows={8}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground mt-1">{body.length}/5000 characters. Separate paragraphs with blank lines.</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Signature</p>
              <p className="text-sm font-medium text-foreground">{signature.name}</p>
              <p className="text-sm text-muted-foreground">{signature.title}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={!subject.trim() || !body.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Preview
              </button>
            </div>
          </div>
        )}

        {/* Preview Phase */}
        {phase === 'preview' && previewData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">Recipients:</span>
              <span className="text-muted-foreground">{previewData.recipientCount} users</span>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Sample recipients:</p>
              <div className="flex flex-wrap gap-1">
                {previewData.sampleRecipients.map((r, i) => (
                  <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{r.email}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Email preview:</p>
              <div
                className="border border-border rounded-lg p-4 bg-white text-black max-h-80 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: previewData.htmlPreview }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setPhase('compose'); setPreviewData(null); }}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
              >
                Back to Edit
              </button>
              <button
                onClick={handleSend}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Send to {previewData.recipientCount} recipients
              </button>
            </div>
          </div>
        )}

        {/* Preview loading */}
        {phase === 'preview' && !previewData && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Sending Phase */}
        {phase === 'sending' && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Sending emails...</p>
          </div>
        )}

        {/* Sent Phase */}
        {phase === 'sent' && sendResult && (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-foreground">Emails Sent</p>
            <p className="text-sm text-muted-foreground">
              {sendResult.sent} sent{sendResult.failed > 0 ? `, ${sendResult.failed} failed` : ''}
            </p>
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-2">
              Close
            </button>
          </div>
        )}

        {/* Error Phase */}
        {phase === 'error' && (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-foreground">Error</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex justify-center gap-2 mt-2">
              <button onClick={() => setPhase('compose')} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                Try Again
              </button>
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== User Segmentation ====================

const SEGMENT_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  'Active Trial': { border: 'border-l-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  'Converted (Free → Paid)': { border: 'border-l-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  'Hit the Wall': { border: 'border-l-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  'Tried Once': { border: 'border-l-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  'Never Generated': { border: 'border-l-gray-400', bg: 'bg-gray-500/10', text: 'text-gray-500 dark:text-gray-300', dot: 'bg-gray-400' },
  'All Paid': { border: 'border-l-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' },
};

const DEFAULT_SEGMENT_COLOR = { border: 'border-l-gray-400', bg: 'bg-gray-500/10', text: 'text-gray-500 dark:text-gray-300', dot: 'bg-gray-400' };

function UserSegmentation() {
  const [data, setData] = useState<AdminSegmentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);
  const [composeSegment, setComposeSegment] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    api.adminMetrics.getSegments()
      .then(res => { if (res.success) setData(res.data); })
      .catch(err => console.error('Failed to load segments', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-5 bg-muted rounded w-40 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-28 mb-2" />
              <div className="h-8 bg-muted rounded w-12 mb-1" />
              <div className="h-3 bg-muted rounded w-40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">User Segments ({data.totalUsers} total)</h2>
        <span className="text-xs text-muted-foreground">Updated {timeAgo(data.lastUpdated)}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.segments.map((segment) => {
          const colors = SEGMENT_COLORS[segment.name] || DEFAULT_SEGMENT_COLOR;
          const isExpanded = expandedSegment === segment.name;

          return (
            <div
              key={segment.name}
              className={`bg-card rounded-xl border border-border border-l-4 ${colors.border} transition-all ${isExpanded ? 'md:col-span-2 lg:col-span-3' : ''}`}
            >
              <button
                onClick={() => setExpandedSegment(isExpanded ? null : segment.name)}
                className="w-full p-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
                    <span className={`text-sm font-semibold ${colors.text}`}>{segment.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setComposeSegment(segment.name); }}
                      className="px-2 py-1 text-xs font-medium rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                      title={`Send email to ${segment.name} segment`}
                    >
                      Send Email
                    </button>
                    <span className="text-2xl font-bold text-foreground">{segment.count}</span>
                    <svg
                      className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{segment.description}</p>
              </button>

              {isExpanded && segment.users.length > 0 && (
                <div className="border-t border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 pl-5 font-medium text-muted-foreground">Email</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Joined</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Gens</th>
                        <th className="text-right p-3 pr-5 font-medium text-muted-foreground">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segment.users.map((u, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="p-3 pl-5 text-foreground font-mono text-xs">{u.email}</td>
                          <td className="p-3 text-muted-foreground">{u.fullName || '--'}</td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </td>
                          <td className="p-3 text-right font-medium text-foreground">{u.generationCount}</td>
                          <td className="p-3 pr-5 text-right text-muted-foreground whitespace-nowrap">
                            {u.lastActiveAt ? timeAgo(u.lastActiveAt) : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isExpanded && segment.users.length === 0 && (
                <div className="border-t border-border px-5 py-3">
                  <p className="text-sm text-muted-foreground">No users in this segment</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {composeSegment && (
        <EmailComposeModal
          segment={composeSegment}
          adminEmail={user?.email || ''}
          onClose={() => setComposeSegment(null)}
        />
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
    { id: 'curated', label: 'Curated Assets' },
    { id: 'voice-lab', label: 'Voice Lab' },
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

      {/* Business Metrics - always visible */}
      <BusinessMetrics />

      {/* User Segmentation */}
      <UserSegmentation />

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
      {tab === 'curated' && <CuratedAssetsTab />}
      {tab === 'voice-lab' && <VoiceLabTab />}
    </div>
  );
}

// ==================== Tab: Curated Assets ====================

function CuratedAssetsTab() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'b_roll' as 'b_roll' | 'caption_template' | 'reel_script',
    title: '',
    description: '',
    category: '',
    niche: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    mediaUrl: '',
    content: '',
    thumbnailUrl: '',
    minTier: 'free' as 'free' | 'starter' | 'creator' | 'studio',
  });
  const [saving, setSaving] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.curatedAssets.list({ limit: 50 });
      if (response.success && response.data) {
        setAssets(response.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.curatedAssets.create({
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category,
        niche: formData.niche || undefined,
        month: formData.month,
        year: formData.year,
        mediaUrl: formData.mediaUrl || undefined,
        content: formData.content || undefined,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        minTier: formData.minTier,
      });
      setShowForm(false);
      setFormData({
        type: 'b_roll', title: '', description: '', category: '', niche: '',
        month: new Date().getMonth() + 1, year: new Date().getFullYear(),
        mediaUrl: '', content: '', thumbnailUrl: '', minTier: 'free',
      });
      fetchAssets();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    try {
      await api.curatedAssets.delete(id);
      fetchAssets();
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Curated Assets ({assets.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Asset'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                <option value="b_roll">B-Roll</option>
                <option value="caption_template">Caption Template</option>
                <option value="reel_script">Reel Script</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Min Tier</label>
              <select
                value={formData.minTier}
                onChange={e => setFormData({ ...formData, minTier: e.target.value as any })}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="creator">Creator</option>
                <option value="studio">Studio</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
              placeholder="Asset title"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <input
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                placeholder="e.g. Business, Lifestyle"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Month / Year</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="number"
                  min={1} max={12}
                  value={formData.month}
                  onChange={e => setFormData({ ...formData, month: parseInt(e.target.value) })}
                  className="w-20 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
                <input
                  type="number"
                  min={2024}
                  value={formData.year}
                  onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
          {formData.type === 'b_roll' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Media URL</label>
              <input
                value={formData.mediaUrl}
                onChange={e => setFormData({ ...formData, mediaUrl: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm"
                placeholder="https://..."
              />
            </div>
          )}
          {(formData.type === 'caption_template' || formData.type === 'reel_script') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Content</label>
              <textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm min-h-[100px]"
                placeholder="Script or template text..."
              />
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={saving || !formData.title || !formData.category}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create Asset'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No curated assets yet</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Month</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Tier</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset: any) => (
                <tr key={asset.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{asset.title}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                      {asset.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{asset.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{asset.month}/{asset.year}</td>
                  <td className="px-4 py-3 text-muted-foreground">{asset.minTier}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Delete
                    </button>
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

// ==================== Tab: Voice Lab ====================

type VoicePoint = {
  id: string;
  platform: string;
  similarity: number;
  voiceScore: number;
  signaturePresence?: number;
  avoidAbsence?: number;
  styleAlignment?: number;
  aiBlacklistAbsence?: number;
  qualityScore?: number;
  createdAt: string;
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: '#0A66C2',
  twitter: '#1DA1F2',
  instagram: '#E1306C',
  tiktok: '#EE1D52',
  youtube: '#FF0000',
  blog: '#10B981',
  email: '#F59E0B',
  'video-script': '#8B5CF6',
};

function VoiceLabTab() {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [points, setPoints] = useState<VoicePoint[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<VoicePoint | null>(null);
  const [enabledPlatforms, setEnabledPlatforms] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.adminVoiceLab.getReport(days),
      api.adminVoiceLab.getRaw(days, 2000),
    ])
      .then(([reportRes, rawRes]) => {
        if (cancelled) return;
        if (reportRes.success) setReport(reportRes.data);
        if (rawRes.success) {
          setPoints(rawRes.data.points);
          const allPlatforms = new Set(rawRes.data.points.map(p => p.platform));
          setEnabledPlatforms(allPlatforms);
        }
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load voice lab data');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [days]);

  const visiblePoints = useMemo(
    () => points.filter(p => enabledPlatforms.has(p.platform)),
    [points, enabledPlatforms]
  );

  const liveCorrelation = useMemo(() => {
    if (visiblePoints.length < 10) return null;
    const n = visiblePoints.length;
    const sumX = visiblePoints.reduce((s, p) => s + p.similarity, 0);
    const sumY = visiblePoints.reduce((s, p) => s + p.voiceScore, 0);
    const sumXY = visiblePoints.reduce((s, p) => s + p.similarity * p.voiceScore, 0);
    const sumX2 = visiblePoints.reduce((s, p) => s + p.similarity * p.similarity, 0);
    const sumY2 = visiblePoints.reduce((s, p) => s + p.voiceScore * p.voiceScore, 0);
    const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (denom === 0) return null;
    return Math.round(((n * sumXY - sumX * sumY) / denom) * 1000) / 1000;
  }, [visiblePoints]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of points) {
      counts[p.platform] = (counts[p.platform] || 0) + 1;
    }
    return counts;
  }, [points]);

  const width = 800;
  const height = 500;
  const padding = { top: 20, right: 20, bottom: 50, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xScale = (v: number) => padding.left + (v / 100) * chartW;
  const yScale = (v: number) => padding.top + chartH - (v / 100) * chartH;

  const togglePlatform = (platform: string) => {
    setEnabledPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Voice Similarity Lab</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Live scatter plot of embedding cosine similarity vs. local voice score.
              Points cluster tight around a diagonal when the scorers agree.
            </p>
          </div>
          <div className="flex gap-2">
            {([7, 14, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  days === d
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="text-sm text-muted-foreground mt-4">Loading voice lab data…</div>}
        {error && <div className="text-sm text-destructive mt-4">Error: {error}</div>}

        {!loading && !error && report && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <VoiceMetricCard label="Data Points" value={visiblePoints.length.toString()} sub={`${report.totalGenerations} total`} />
            <VoiceMetricCard
              label="Avg Similarity"
              value={report.similarityDistribution?.avg?.toString() || '—'}
              sub="0-100 scale"
            />
            <VoiceMetricCard
              label="Live Correlation"
              value={liveCorrelation !== null ? liveCorrelation.toFixed(3) : '—'}
              sub={liveCorrelation !== null ? getCorrelationLabel(liveCorrelation) : 'need 10+ points'}
              highlight={liveCorrelation !== null && liveCorrelation > 0.3 ? 'good' : liveCorrelation !== null && liveCorrelation < 0 ? 'bad' : undefined}
            />
            <VoiceMetricCard
              label="Recommendation"
              value={getRecommendationShort(report.recommendation)}
              sub="auto"
              highlight={report.recommendation?.includes('Safe to move') ? 'good' : undefined}
            />
          </div>
        )}
      </div>

      {!loading && !error && points.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Similarity vs. Voice Score</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Each dot is one generated piece. Tight diagonal cluster = scorers agree.
              </p>
            </div>
            <div className="text-xs text-muted-foreground">Hover for details</div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(platformCounts).map(([platform, count]) => {
              const color = PLATFORM_COLORS[platform] || '#888';
              const enabled = enabledPlatforms.has(platform);
              return (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                    enabled
                      ? 'border-transparent text-white'
                      : 'border-border bg-transparent text-muted-foreground'
                  }`}
                  style={enabled ? { backgroundColor: color } : {}}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: enabled ? 'white' : color }}
                  />
                  {platform} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto max-w-4xl mx-auto"
              style={{ background: 'hsl(var(--muted) / 0.3)' }}
            >
              {[0, 25, 50, 75, 100].map(v => (
                <g key={`grid-${v}`}>
                  <line
                    x1={xScale(v)} y1={padding.top}
                    x2={xScale(v)} y2={padding.top + chartH}
                    stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2 4"
                  />
                  <line
                    x1={padding.left} y1={yScale(v)}
                    x2={padding.left + chartW} y2={yScale(v)}
                    stroke="currentColor" strokeOpacity={0.1} strokeDasharray="2 4"
                  />
                </g>
              ))}

              <line
                x1={padding.left} y1={padding.top}
                x2={padding.left} y2={padding.top + chartH}
                stroke="currentColor" strokeOpacity={0.3}
              />
              <line
                x1={padding.left} y1={padding.top + chartH}
                x2={padding.left + chartW} y2={padding.top + chartH}
                stroke="currentColor" strokeOpacity={0.3}
              />

              <line
                x1={xScale(0)} y1={yScale(0)}
                x2={xScale(100)} y2={yScale(100)}
                stroke="#10B981" strokeOpacity={0.3} strokeWidth={2} strokeDasharray="6 4"
              />

              {visiblePoints.map((p, i) => {
                const color = PLATFORM_COLORS[p.platform] || '#888';
                const age = (Date.now() - new Date(p.createdAt).getTime()) / (days * 24 * 60 * 60 * 1000);
                const opacity = Math.max(0.25, 1 - age * 0.6);
                return (
                  <circle
                    key={p.id}
                    cx={xScale(p.similarity)}
                    cy={yScale(p.voiceScore)}
                    r={hoveredPoint?.id === p.id ? 8 : 5}
                    fill={color}
                    fillOpacity={opacity}
                    stroke={hoveredPoint?.id === p.id ? 'white' : color}
                    strokeWidth={hoveredPoint?.id === p.id ? 2 : 0.5}
                    className="cursor-pointer transition-all duration-200"
                    style={{ animation: `voicePointFadeIn 0.5s ease-out ${i * 0.003}s backwards` }}
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}

              {[0, 25, 50, 75, 100].map(v => (
                <text
                  key={`xlabel-${v}`}
                  x={xScale(v)}
                  y={padding.top + chartH + 20}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize="11"
                >
                  {v}
                </text>
              ))}
              <text
                x={padding.left + chartW / 2}
                y={padding.top + chartH + 42}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="11"
              >
                Embedding Similarity Score (0-100)
              </text>

              {[0, 25, 50, 75, 100].map(v => (
                <text
                  key={`ylabel-${v}`}
                  x={padding.left - 8}
                  y={yScale(v) + 4}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize="11"
                >
                  {v}
                </text>
              ))}
              <text
                x={-padding.top - chartH / 2}
                y={18}
                textAnchor="middle"
                transform="rotate(-90)"
                className="fill-muted-foreground"
                fontSize="11"
              >
                Local Voice Score (0-100)
              </text>
            </svg>

            {hoveredPoint && (
              <div className="absolute top-4 right-4 bg-card border border-border rounded-lg p-3 shadow-lg text-xs max-w-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLORS[hoveredPoint.platform] || '#888' }}
                  />
                  <span className="font-semibold text-foreground">{hoveredPoint.platform}</span>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <div>Embedding: <span className="text-foreground font-medium">{hoveredPoint.similarity}</span></div>
                  <div>Local Voice: <span className="text-foreground font-medium">{hoveredPoint.voiceScore}</span></div>
                  {hoveredPoint.signaturePresence !== undefined && <div>Signature: {hoveredPoint.signaturePresence}</div>}
                  {hoveredPoint.avoidAbsence !== undefined && <div>Avoid: {hoveredPoint.avoidAbsence}</div>}
                  {hoveredPoint.styleAlignment !== undefined && <div>Style: {hoveredPoint.styleAlignment}</div>}
                  {hoveredPoint.aiBlacklistAbsence !== undefined && <div>AI-free: {hoveredPoint.aiBlacklistAbsence}</div>}
                  <div className="pt-1 border-t border-border mt-1 text-[10px]">
                    {new Date(hoveredPoint.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {report?.recommendation && (
            <div className="mt-4 p-3 bg-muted rounded-md text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Recommendation:</span> {report.recommendation}
            </div>
          )}
        </div>
      )}

      {!loading && !error && report?.byPlatform && Object.keys(report.byPlatform).length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Per-Platform Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(report.byPlatform as Record<string, { avg: number; count: number }>)
              .sort(([, a], [, b]) => b.avg - a.avg)
              .map(([platform, stats]) => {
                const color = PLATFORM_COLORS[platform] || '#888';
                return (
                  <div key={platform} className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-medium text-foreground">{platform}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stats.avg}</div>
                    <div className="text-xs text-muted-foreground">{stats.count} samples</div>
                    <div className="mt-2 h-1 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${stats.avg}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes voicePointFadeIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function VoiceMetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: 'good' | 'bad';
}) {
  const colorClass =
    highlight === 'good'
      ? 'text-emerald-500'
      : highlight === 'bad'
      ? 'text-destructive'
      : 'text-foreground';
  return (
    <div className="p-3 bg-muted rounded-md">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-1 ${colorClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function getCorrelationLabel(r: number): string {
  if (r > 0.5) return 'strong positive';
  if (r > 0.3) return 'positive — ready';
  if (r > 0.1) return 'weak positive';
  if (r > -0.1) return 'no correlation';
  return 'negative — broken';
}

function getRecommendationShort(rec: string): string {
  if (!rec) return '—';
  if (rec.includes('Safe to move to Phase 2')) return 'Activate 0.10';
  if (rec.includes('Need 50+')) return 'Need more data';
  if (rec.includes('Continue observing')) return 'Observe';
  if (rec.includes('inversely')) return 'Recalibrate';
  if (rec.includes('too high')) return 'Lower anchors';
  return 'Observe';
}
