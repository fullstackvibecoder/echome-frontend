'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      {/* Step Progress */}
      {stats?.executionsByStep?.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Step Progress</h3>
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
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
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
                  <td className="p-3 text-right">
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
                  </td>
                </tr>
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
