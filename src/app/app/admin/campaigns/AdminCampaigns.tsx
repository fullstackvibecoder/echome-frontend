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

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
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
