'use client';

import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useScheduling } from '@/hooks/useScheduling';
import {
  ScheduleCalendar,
  ScheduleModal,
  WeekSuggestions,
} from '@/components/scheduling';
import { ScheduledPost, ContentCategory } from '@/types';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { AppPageHeader } from '@/components/app-page-header';

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

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);

  const handlePostClick = (post: ScheduledPost) => {
    setEditingPost(post);
    setModalOpen(true);
  };

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

  const handleDelete = async (id: string) => {
    await deleteSchedule(id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <AppPageHeader
        title="Content Calendar"
        actions={
          <>
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
              className="btn-primary flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Create Content
            </Link>
          </>
        }
      />

      <UpgradeBanner />

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Content Mix Strip */}
      <div className="mb-4">
        <WeekSuggestions
          analysis={weeklyAnalysis}
          loading={loading}
        />
      </div>

      {/* Calendar — full width */}
      <ScheduleCalendar
        scheduledPosts={scheduledPosts}
        currentWeekStart={currentWeekStart}
        onWeekChange={setCurrentWeekStart}
        onPostClick={handlePostClick}
      />

      {/* Edit Modal */}
      {editingPost && (
        <ScheduleModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingPost(null);
          }}
          onSave={async () => {}}
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
