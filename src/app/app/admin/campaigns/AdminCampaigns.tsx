'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused';
  trigger_on: string;
  steps: any[];
  enrollment_count: number;
  sent_count: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  paused: { bg: 'bg-amber-500/10', text: 'text-amber-600', dot: 'bg-amber-500' },
  draft: { bg: 'bg-gray-500/10', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const SEGMENTS = ['Active Trial', 'Never Generated', 'Tried Once', 'Hit the Wall', 'All Users'];

interface EnrollModalProps {
  campaign: Campaign;
  onClose: () => void;
}

function EnrollModal({ campaign, onClose }: EnrollModalProps) {
  const [segment, setSegment] = useState(SEGMENTS[0]);
  const [preview, setPreview] = useState<{ count: number; sample: { email: string }[] } | null>(null);
  const [result, setResult] = useState<{ enrolled: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.adminCampaigns.enroll(campaign.id, segment, true);
      if (res.success) {
        setPreview(res.data);
      } else {
        setError(res.error || 'Preview failed');
      }
    } catch (e: any) {
      setError(e?.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminCampaigns.enroll(campaign.id, segment, false);
      if (res.success) {
        setResult(res.data);
        setPreview(null);
      } else {
        setError(res.error || 'Enroll failed');
      }
    } catch (e: any) {
      setError(e?.message || 'Enroll failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Enroll Segment</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
        </div>

        <p className="text-sm text-muted-foreground">
          Campaign: <span className="font-medium text-foreground capitalize">{campaign.name}</span>
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Segment</label>
          <select
            value={segment}
            onChange={e => { setSegment(e.target.value); setPreview(null); setResult(null); setError(null); }}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {SEGMENTS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {preview && !result && (
          <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              {preview.count} eligible user{preview.count !== 1 ? 's' : ''}
            </p>
            {preview.sample?.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {preview.sample.map((u, i) => (
                  <li key={i} className="font-mono">{u.email}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {result && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
            <p className="text-sm font-medium text-emerald-600">
              Successfully enrolled {result.enrolled} user{result.enrolled !== 1 ? 's' : ''}.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          {!result ? (
            <>
              <button
                onClick={handlePreview}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
              >
                {loading && !preview ? 'Loading…' : 'Preview'}
              </button>
              {preview && (
                <button
                  onClick={handleConfirm}
                  disabled={loading || preview.count === 0}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Enrolling…' : 'Confirm Enroll'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              Done
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollTarget, setEnrollTarget] = useState<Campaign | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.adminCampaigns.list()
      .then(res => { if (res.success) setCampaigns(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id: string, currentStatus: string) => {
    if (currentStatus === 'active') {
      await api.adminCampaigns.pause(id);
    } else {
      await api.adminCampaigns.resume(id);
    }
    // Refresh
    const res = await api.adminCampaigns.list();
    if (res.success) setCampaigns(res.data);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-card rounded-xl border border-border p-6 animate-pulse">
            <div className="h-6 bg-muted rounded w-32 mb-3" />
            <div className="h-4 bg-muted rounded w-48 mb-4" />
            <div className="flex gap-4">
              <div className="h-10 bg-muted rounded w-20" />
              <div className="h-10 bg-muted rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Drip Campaigns</h2>

      {enrollTarget && (
        <EnrollModal campaign={enrollTarget} onClose={() => setEnrollTarget(null)} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map(campaign => {
          const style = STATUS_STYLES[campaign.status] || STATUS_STYLES.draft;
          return (
            <div
              key={campaign.id}
              className="bg-card rounded-xl border border-border p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground capitalize">{campaign.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
                </div>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {campaign.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-2xl font-bold text-foreground">{campaign.steps.length}</p>
                  <p className="text-xs text-muted-foreground">Emails</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{campaign.enrollment_count}</p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{campaign.sent_count}</p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => router.push(`/app/admin/campaigns/${campaign.id}`)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => handleToggle(campaign.id, campaign.status)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {campaign.status === 'active' ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={() => setEnrollTarget(campaign)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  Enroll Segment
                </button>
                <span className="text-xs text-muted-foreground ml-auto">
                  Trigger: {campaign.trigger_on}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
