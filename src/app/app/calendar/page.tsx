'use client';

import { useState } from 'react';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { useScheduling } from '@/hooks/useScheduling';
import {
  ScheduleCalendar,
  ScheduleModal,
  WeekSuggestions,
} from '@/components/scheduling';
import { ScheduledPost, ScheduleSuggestion, ContentCategory } from '@/types';

export default function CalendarPage() {
  const {
    scheduledPosts,
    weeklyAnalysis,
    unscheduledContent,
    loading,
    error,
    currentWeekStart,
    setCurrentWeekStart,
    schedulePost,
    updateSchedule,
    deleteSchedule,
    markAsPosted,
    markAsSkipped,
    refresh,
  } = useScheduling();

  const [view, setView] = useState<'month' | 'week'>('week');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  // Handle clicking on a scheduled post
  const handlePostClick = (post: ScheduledPost) => {
    setEditingPost(post);
    setDefaultDate(undefined);
    setModalOpen(true);
  };

  // Handle clicking on an empty slot
  const handleSlotClick = (date: Date) => {
    setEditingPost(null);
    setDefaultDate(date);
    setModalOpen(true);
  };

  // Handle applying a suggestion
  const handleApplySuggestion = (suggestion: ScheduleSuggestion) => {
    setEditingPost(null);
    setDefaultDate(new Date(suggestion.suggestedTime));
    setModalOpen(true);
  };

  // Handle saving a scheduled post
  const handleSave = async (data: {
    contentKitId: string;
    scheduledFor: string;
    platforms: string[];
    contentCategory?: ContentCategory;
    notes?: string;
  }) => {
    await schedulePost(
      data.contentKitId,
      data.scheduledFor,
      data.platforms,
      data.contentCategory,
      data.notes
    );
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
          <div className="p-2 bg-purple-100 rounded-lg">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
            <p className="text-sm text-gray-600">
              Plan and schedule your content posts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setEditingPost(null);
              setDefaultDate(undefined);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Schedule Content
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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

        {/* Sidebar - suggestions and unscheduled */}
        <div className="space-y-6">
          {/* TLL Suggestions */}
          <WeekSuggestions
            analysis={weeklyAnalysis}
            loading={loading}
            onApplySuggestion={handleApplySuggestion}
          />

          {/* Unscheduled Content */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Ready to Schedule</h3>
              <p className="text-xs text-gray-500">
                Content kits waiting to be scheduled
              </p>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : unscheduledContent.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  All your content has been scheduled!
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {unscheduledContent.map(content => (
                    <div
                      key={content.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setEditingPost(null);
                        setDefaultDate(undefined);
                        setModalOpen(true);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {content.thumbnailUrl ? (
                          <img
                            src={content.thumbnailUrl}
                            alt=""
                            className="w-12 h-12 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-200 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {content.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(content.createdAt).toLocaleDateString(
                              'en-US',
                              { month: 'short', day: 'numeric' }
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {unscheduledContent.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  Click on a content item or calendar slot to schedule
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPost(null);
          setDefaultDate(undefined);
        }}
        onSave={handleSave}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onMarkPosted={markAsPosted}
        onMarkSkipped={markAsSkipped}
        unscheduledContent={unscheduledContent}
        editingPost={editingPost}
        defaultDate={defaultDate}
      />
    </div>
  );
}
