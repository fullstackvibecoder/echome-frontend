'use client';

import { useState } from 'react';
import { Calendar, RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useScheduling } from '@/hooks/useScheduling';
import {
  ScheduleCalendar,
  ScheduleModal,
  WeekSuggestions,
} from '@/components/scheduling';
import { ScheduledPost, ContentCategory } from '@/types';
import { InfoTooltip } from '@/components/info-tooltip';
import { UpgradeBanner } from '@/components/upgrade-banner';

export default function CalendarContent() {
  const {
    scheduledPosts,
    weeklyAnalysis,
    loading,
    error,
    currentWeekStart,
    setCurrentWeekStart,
    updateSchedule,
    deleteSchedule,
    markAsPosted,
    markAsSkipped,
    refresh,
  } = useScheduling();

  const [view, setView] = useState<'month' | 'week'>('week');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);

  // Handle clicking on a scheduled post (opens edit modal)
  const handlePostClick = (post: ScheduledPost) => {
    setEditingPost(post);
    setModalOpen(true);
  };

  // Empty slots are not interactive - users schedule from content kits
  const handleSlotClick = () => {
    // No-op - scheduling happens from content kit pages
  };

  // Handle updating a scheduled post
  const handleUpdate = async (
    id: string,
    data: {
      scheduledFor?: string;
      platforms?: string[];
      contentCategory?: ContentCategory;
      notes?: string;
    }
  ) => {
    await updateSchedule(id, data);
  };

  // Handle deleting a scheduled post
  const handleDelete = async (id: string) => {
    await deleteSchedule(id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary/15 to-accent-purple/10 rounded-xl shadow-sm">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Content Calendar
              <InfoTooltip text="Plan when to publish your generated content. Drag posts to different dates to schedule them." />
            </h1>
            <p className="text-sm text-muted-foreground">
              View and manage your scheduled content
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/app"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Create Content
          </Link>
        </div>
      </div>

      <UpgradeBanner />

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar - takes 2 columns */}
        <div className="lg:col-span-2">
          <ScheduleCalendar
            scheduledPosts={scheduledPosts}
            currentWeekStart={currentWeekStart}
            onWeekChange={setCurrentWeekStart}
            onPostClick={handlePostClick}
            onSlotClick={handleSlotClick}
            view={view}
            onViewChange={setView}
          />
        </div>

        {/* Sidebar - content balance and tips */}
        <div className="space-y-6">
          {/* Content Mix Balance */}
          <WeekSuggestions
            analysis={weeklyAnalysis}
            loading={loading}
          />

          {/* How to Schedule */}
          <div className="bg-card rounded-xl border border-border overflow-hidden card-lift">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground">How to Schedule</h3>
            </div>
            <div className="p-4 space-y-3 text-sm text-muted-foreground">
              <p>
                To add content to your calendar:
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Go to your <Link href="/app" className="text-primary hover:underline">Content Kits</Link></li>
                <li>Open a content kit</li>
                <li>Click &quot;Add to Calendar&quot; on any content piece</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-3">
                This ensures every scheduled post is linked to actual content you&apos;ve created.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal - only for editing existing posts */}
      {editingPost && (
        <ScheduleModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingPost(null);
          }}
          onSave={async () => {}} // Not used for edit-only modal
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onMarkPosted={markAsPosted}
          onMarkSkipped={markAsSkipped}
          unscheduledContent={[]}
          editingPost={editingPost}
        />
      )}
    </div>
  );
}
