'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Calendar, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

interface ScheduledItem {
  id: string;
  title: string;
  scheduledFor: string;
  platforms: string[];
  status: string;
  contentCategory?: string;
  notes?: string;
}

export default function CalendarContent() {
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      // Use the existing scheduling API (not social posting)
      const response = await api.scheduling.list();
      if (response.success && response.data) {
        setItems(Array.isArray(response.data) ? response.data : []);
      }
    } catch {
      // Calendar works even if API fails — just shows empty
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const upcoming = items.filter(i => new Date(i.scheduledFor) > new Date() && i.status !== 'cancelled');
  const past = items.filter(i => new Date(i.scheduledFor) <= new Date() || i.status === 'cancelled');

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Content Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your scheduled content reminders. Auto-posting coming soon.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <h3 className="text-lg font-medium text-foreground mb-2">No scheduled content</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Schedule content from any Content Kit to see it here.
          </p>
          <Link href="/app/content-kit" className="text-sm text-primary-interactive hover:underline">
            Go to Content Kits
          </Link>
        </div>
      )}

      {!loading && upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(item.scheduledFor)}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{formatTime(item.scheduledFor)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.platforms?.join(', ')}
                    {item.contentCategory && ` · ${item.contentCategory}`}
                  </p>
                </div>
                <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full font-medium">
                  Scheduled
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Past</h2>
          <div className="space-y-2">
            {past.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-4 py-3 bg-card/50 border border-border/50 rounded-xl opacity-60">
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <CheckCircle className="w-4 h-4" />
                  <span>{formatDate(item.scheduledFor)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.platforms?.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
