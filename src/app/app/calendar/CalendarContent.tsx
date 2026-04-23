'use client';

import { useState } from 'react';
import { FanoutCalendar } from '@/components/scheduling/FanoutCalendar';
import { WeekGrid } from '@/components/scheduling/WeekGrid';
import { List, LayoutGrid } from 'lucide-react';

type CalendarView = 'week' | 'list';

export default function CalendarContent() {
  const [view, setView] = useState<CalendarView>('week');

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Content Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your scheduled posts and reminders. Studio+ plans auto-post; lower tiers get email reminders at the scheduled time.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          <button
            type="button"
            onClick={() => setView('week')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'week' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Week grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Week
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Flat chronological list"
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>
      </div>

      {view === 'week' ? <WeekGrid /> : <FanoutCalendar />}
    </div>
  );
}
