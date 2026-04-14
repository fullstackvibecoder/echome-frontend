'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const EXEC_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-500/10 text-gray-500',
  sent: 'bg-emerald-500/10 text-emerald-600',
  failed: 'bg-red-500/10 text-red-600',
  skipped: 'bg-amber-500/10 text-amber-600',
};

interface ExecutionLog {
  step_number: number;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  error_message: string | null;
}

function ExecutionLogRow({ campaignId, enrollmentId }: { campaignId: string; enrollmentId: string }) {
  const [logs, setLogs] = useState<ExecutionLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.adminCampaigns.enrollmentDetail(campaignId, enrollmentId)
      .then(res => {
        if (res.success) {
          setLogs(res.data.executions ?? []);
        } else {
          setError(res.error || 'Failed to load');
        }
      })
      .catch(e => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [campaignId, enrollmentId]);

  if (loading) {
    return (
      <tr>
        <td colSpan={5} className="px-3 pb-3">
          <div className="h-16 bg-muted/40 animate-pulse rounded-lg" />
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr>
        <td colSpan={5} className="px-3 pb-3">
          <p className="text-xs text-red-500">{error}</p>
        </td>
      </tr>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="px-3 pb-3">
          <p className="text-xs text-muted-foreground">No execution log entries.</p>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={5} className="px-3 pb-3">
        <div className="rounded-lg border border-border overflow-hidden bg-muted/20">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left p-2 font-medium text-muted-foreground">Step</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Scheduled</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Sent</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="p-2 text-foreground">Email {log.step_number}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${EXEC_STATUS_STYLES[log.status] || 'bg-gray-500/10 text-gray-500'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {log.scheduled_at
                      ? new Date(log.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {log.sent_at
                      ? new Date(log.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="p-2 text-red-500 max-w-[200px] truncate" title={log.error_message ?? undefined}>
                    {log.error_message || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEnrollment, setExpandedEnrollment] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [stepPreview, setStepPreview] = useState<Record<number, string>>({});
  const [stepPreviewLoading, setStepPreviewLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.adminCampaigns.get(id),
      api.adminCampaigns.enrollments(id),
    ])
      .then(([detail, enrollData]) => {
        if (detail.success) {
          setCampaign(detail.data.campaign);
          setStats(detail.data.stats);
        }
        if (enrollData.success) {
          setEnrollments(enrollData.data.enrollments);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-48" />
      <div className="h-32 bg-muted rounded" />
    </div>;
  }

  if (!campaign) return <p className="text-muted-foreground">Campaign not found.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/app/admin/campaigns')} className="text-muted-foreground hover:text-foreground">
          &larr; Back
        </button>
        <h2 className="text-lg font-semibold text-foreground capitalize">{campaign.name} Campaign</h2>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
          campaign.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
          campaign.status === 'paused' ? 'bg-amber-500/10 text-amber-600' :
          'bg-gray-500/10 text-gray-500'
        }`}>{campaign.status}</span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(stats.enrollmentsByStatus).map(([status, count]) => (
            <div key={status} className="bg-card rounded-xl border border-border p-4">
              <p className="text-2xl font-bold text-foreground">{count as number}</p>
              <p className="text-xs text-muted-foreground capitalize">{status}</p>
            </div>
          ))}
        </div>
      )}

      {/* Email Steps Timeline */}
      {campaign.steps?.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Email Sequence ({campaign.steps.length} emails)
          </h3>
          <div className="space-y-0">
            {campaign.steps.map((step: any, i: number) => {
              const stepStats = stats?.executionsByStep?.find((s: any) => s.step_number === step.step_number);
              const total = stepStats ? stepStats.sent + stepStats.pending + stepStats.failed + stepStats.skipped : 0;
              const isExpanded = expandedStep === step.step_number;

              return (
                <div key={step.step_number} className="relative">
                  {/* Timeline connector */}
                  {i < campaign.steps.length - 1 && (
                    <div className="absolute left-[15px] top-[32px] bottom-0 w-[2px] bg-border" />
                  )}

                  {/* Step row */}
                  <button
                    onClick={() => {
                      const newStep = isExpanded ? null : step.step_number;
                      setExpandedStep(newStep);
                      // Fetch email body on first expand
                      if (newStep && !stepPreview[newStep]) {
                        setStepPreviewLoading(newStep);
                        api.adminCampaigns.previewStep(id, newStep)
                          .then((res: any) => {
                            if (res.success) {
                              setStepPreview(prev => ({ ...prev, [newStep]: res.data.body }));
                            }
                          })
                          .catch(() => {
                            setStepPreview(prev => ({ ...prev, [newStep]: '(Failed to load preview)' }));
                          })
                          .finally(() => setStepPreviewLoading(null));
                      }
                    }}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors text-left"
                  >
                    {/* Step number circle */}
                    <div className={`flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-bold ${
                      stepStats?.sent > 0
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.step_number}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{step.subject}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          Day {step.day_offset}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {step.preview_text}
                      </p>
                    </div>

                    {/* Stats pill */}
                    {total > 0 && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {stepStats?.sent}/{total} sent
                      </span>
                    )}

                    {/* Expand indicator */}
                    <svg
                      className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 mt-1 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded content — email preview */}
                  {isExpanded && (
                    <div className="ml-[42px] mr-3 mb-4 mt-1">
                      <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
                        {/* Email header */}
                        <div className="px-4 py-3 border-b border-border space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground w-16">Subject:</span>
                            <span className="text-foreground font-medium">{step.subject}</span>
                          </div>
                          {step.subject_alt && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground w-16">A/B Alt:</span>
                              <span className="text-muted-foreground">{step.subject_alt}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground w-16">Preview:</span>
                            <span className="text-muted-foreground">{step.preview_text}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs pt-1">
                            <span className="text-muted-foreground">
                              Sends on <span className="text-foreground font-medium">Day {step.day_offset}</span>
                            </span>
                            {step.segment_filter !== 'all' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
                                Filter: {step.segment_filter}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Email body */}
                        <div className="px-4 py-3">
                          {stepPreviewLoading === step.step_number ? (
                            <div className="h-32 bg-muted/40 animate-pulse rounded" />
                          ) : (
                            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-[400px] overflow-y-auto">
                              {stepPreview[step.step_number] || step.body_text || '(Loading...)'}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step Progress Bars */}
      {stats?.executionsByStep?.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Delivery Progress</h3>
          <div className="space-y-2">
            {stats.executionsByStep.map((step: any) => {
              const total = step.sent + step.pending + step.failed + step.skipped;
              const pct = total > 0 ? Math.round((step.sent / total) * 100) : 0;
              return (
                <div key={step.step_number} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16">Email {step.step_number}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {step.sent} sent / {total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enrollments Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Enrollments ({enrollments.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Step</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Enrolled</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e: any) => (
                <>
                  <tr
                    key={e.id}
                    onClick={() => setExpandedEnrollment(expandedEnrollment === e.id ? null : e.id)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer select-none"
                  >
                    <td className="p-3 text-foreground font-mono text-xs">{e.users?.email}</td>
                    <td className="p-3 text-foreground">{e.current_step} / {campaign.steps.length}</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        e.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' :
                        e.status === 'completed' ? 'bg-blue-500/10 text-blue-600' :
                        e.status === 'suppressed' ? 'bg-gray-500/10 text-gray-500' :
                        'bg-amber-500/10 text-amber-600'
                      }`}>{e.status}</span>
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(e.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-3 text-right" onClick={ev => ev.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {expandedEnrollment === e.id ? '▲ Hide log' : '▼ Log'}
                        </span>
                        {e.status === 'active' && (
                          <button
                            onClick={async () => {
                              await api.adminCampaigns.pauseEnrollment(id, e.id);
                              const res = await api.adminCampaigns.enrollments(id);
                              if (res.success) setEnrollments(res.data.enrollments);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Pause
                          </button>
                        )}
                        {e.status === 'paused' && (
                          <button
                            onClick={async () => {
                              await api.adminCampaigns.resumeEnrollment(id, e.id);
                              const res = await api.adminCampaigns.enrollments(id);
                              if (res.success) setEnrollments(res.data.enrollments);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedEnrollment === e.id && (
                    <ExecutionLogRow key={`log-${e.id}`} campaignId={id} enrollmentId={e.id} />
                  )}
                </>
              ))}
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No enrollments yet. Use the admin panel to enroll a segment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
