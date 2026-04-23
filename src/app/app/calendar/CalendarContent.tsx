'use client';

import { useState } from 'react';
import { FanoutCalendar } from '@/components/scheduling/FanoutCalendar';
import { WeekGrid } from '@/components/scheduling/WeekGrid';
import { MonthGrid } from '@/components/scheduling/MonthGrid';
import { List, LayoutGrid, CalendarDays } from 'lucide-react';

type CalendarView = 'week' | 'month' | 'list';

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
          <ViewButton active={view === 'week'} onClick={() => setView('week')} Icon={LayoutGrid} label="Week" />
          <ViewButton active={view === 'month'} onClick={() => setView('month')} Icon={CalendarDays} label="Month" />
          <ViewButton active={view === 'list'} onClick={() => setView('list')} Icon={List} label="List" />
        </div>
      </div>

      {view === 'week' && <WeekGrid />}
      {view === 'month' && <MonthGrid />}
      {view === 'list' && <FanoutCalendar />}
    </div>
  );
}

function ViewButton({
  active, onClick, Icon, label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
      }`}
      title={`${label} view`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
