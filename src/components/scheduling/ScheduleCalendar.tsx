'use client';

import { useState, useMemo, type ReactElement } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  X,
  Clock,
} from 'lucide-react';
import {
  ScheduledPost,
  ContentCategory,
  CONTENT_CATEGORY_CONFIG,
} from '@/types';

interface ScheduleCalendarProps {
  scheduledPosts: ScheduledPost[];
  currentWeekStart: string;
  onWeekChange: (weekStart: string) => void;
  onPostClick?: (post: ScheduledPost) => void;
  onSlotClick?: (date: Date) => void;
  view?: 'month' | 'week';
  onViewChange?: (view: 'month' | 'week') => void;
}

// Days of the week
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Time slots for week view
const TIME_SLOTS = [
  { label: 'Morning', time: '08:00', slot: 'morning' },
  { label: 'Lunch', time: '12:00', slot: 'lunch' },
  { label: 'Evening', time: '17:00', slot: 'evening' },
];

/**
 * Get category color classes
 */
function getCategoryColor(category?: ContentCategory): string {
  if (!category) return 'bg-gray-100 border-gray-300 text-gray-700';

  const colors: Record<ContentCategory, string> = {
    authority: 'bg-blue-100 border-blue-300 text-blue-800',
    personal_story: 'bg-purple-100 border-purple-300 text-purple-800',
    pain_problem: 'bg-orange-100 border-orange-300 text-orange-800',
    testimonial: 'bg-green-100 border-green-300 text-green-800',
  };

  return colors[category];
}

/**
 * Get status icon
 */
function getStatusIcon(status: ScheduledPost['status']) {
  switch (status) {
    case 'posted':
      return <Check className="w-3 h-3 text-green-600" />;
    case 'skipped':
      return <X className="w-3 h-3 text-gray-400" />;
    default:
      return <Clock className="w-3 h-3 text-blue-500" />;
  }
}

/**
 * Calendar component for content scheduling
 */
export function ScheduleCalendar({
  scheduledPosts,
  currentWeekStart,
  onWeekChange,
  onPostClick,
  onSlotClick,
  view = 'week',
  onViewChange,
}: ScheduleCalendarProps) {
  const weekStart = new Date(currentWeekStart);

  // Generate days for the week
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekStart.toISOString()]);

  // Group posts by date
  const postsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledPost[]> = {};
    scheduledPosts.forEach(post => {
      const dateKey = new Date(post.scheduledFor).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(post);
    });
    // Sort posts within each day by time
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) =>
        new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
      );
    });
    return grouped;
  }, [scheduledPosts]);

  // Navigate weeks
  const goToPreviousWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    onWeekChange(prev.toISOString());
  };

  const goToNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    onWeekChange(next.toISOString());
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    today.setDate(diff);
    today.setHours(0, 0, 0, 0);
    onWeekChange(today.toISOString());
  };

  // Format week range for header
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekRangeStr = `${weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} - ${weekEnd.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goToNextWeek}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-medium text-gray-900 ml-2">{weekRangeStr}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Today
          </button>

          {onViewChange && (
            <div className="flex items-center bg-gray-100 rounded-md p-0.5">
              <button
                onClick={() => onViewChange('week')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  view === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => onViewChange('month')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  view === 'month'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Week View */}
      {view === 'week' && (
        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDays.map((day, dayIndex) => {
            const dateKey = day.toISOString().split('T')[0];
            const dayPosts = postsByDate[dateKey] || [];

            return (
              <div
                key={dateKey}
                className={`border-r border-gray-200 last:border-r-0 ${
                  isToday(day) ? 'bg-blue-50/50' : ''
                }`}
              >
                {/* Day Header */}
                <div
                  className={`sticky top-0 z-10 px-2 py-2 border-b border-gray-200 ${
                    isToday(day) ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xs text-gray-500 uppercase">
                      {DAYS[dayIndex]}
                    </div>
                    <div
                      className={`text-lg font-semibold ${
                        isToday(day)
                          ? 'text-blue-600'
                          : 'text-gray-900'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                </div>

                {/* Day Content */}
                <div
                  className="p-2 min-h-[400px] space-y-2 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => onSlotClick?.(day)}
                >
                  {dayPosts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      <span className="hidden md:inline">Click to schedule</span>
                    </div>
                  ) : (
                    dayPosts.map(post => (
                      <div
                        key={post.id}
                        onClick={e => {
                          e.stopPropagation();
                          onPostClick?.(post);
                        }}
                        className={`p-2 rounded-md border cursor-pointer hover:shadow-sm transition-shadow ${getCategoryColor(
                          post.contentCategory
                        )} ${
                          post.status === 'skipped' ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">
                            {new Date(post.scheduledFor).toLocaleTimeString(
                              'en-US',
                              { hour: 'numeric', minute: '2-digit' }
                            )}
                          </span>
                          {getStatusIcon(post.status)}
                        </div>
                        <div className="text-xs truncate font-medium">
                          {post.title || 'Scheduled Post'}
                        </div>
                        {post.platforms.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {post.platforms.slice(0, 3).map(p => (
                              <span
                                key={p}
                                className="text-[10px] px-1.5 py-0.5 bg-white/50 rounded"
                              >
                                {p}
                              </span>
                            ))}
                            {post.platforms.length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-white/50 rounded">
                                +{post.platforms.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View - Simplified */}
      {view === 'month' && (
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {DAYS.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}

            {/* Generate month grid */}
            {(() => {
              const monthStart = new Date(weekStart);
              monthStart.setDate(1);
              const startDay = monthStart.getDay();
              const offset = startDay === 0 ? 6 : startDay - 1;

              const daysInMonth = new Date(
                monthStart.getFullYear(),
                monthStart.getMonth() + 1,
                0
              ).getDate();

              const cells: ReactElement[] = [];

              // Empty cells before month starts
              for (let i = 0; i < offset; i++) {
                cells.push(
                  <div key={`empty-${i}`} className="aspect-square" />
                );
              }

              // Days of the month
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(
                  monthStart.getFullYear(),
                  monthStart.getMonth(),
                  day
                );
                const dateKey = date.toISOString().split('T')[0];
                const dayPosts = postsByDate[dateKey] || [];
                const isTodayDate = isToday(date);

                cells.push(
                  <div
                    key={day}
                    onClick={() => onSlotClick?.(date)}
                    className={`aspect-square border rounded-md p-1 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isTodayDate ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div
                      className={`text-xs font-medium ${
                        isTodayDate ? 'text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {day}
                    </div>
                    {dayPosts.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {dayPosts.slice(0, 3).map(post => (
                          <div
                            key={post.id}
                            className={`w-2 h-2 rounded-full ${
                              post.contentCategory
                                ? getCategoryColor(post.contentCategory).split(' ')[0]
                                : 'bg-gray-300'
                            }`}
                            title={post.title || 'Scheduled'}
                          />
                        ))}
                        {dayPosts.length > 3 && (
                          <span className="text-[8px] text-gray-500">
                            +{dayPosts.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return cells;
            })()}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center gap-4 text-xs">
          {(Object.keys(CONTENT_CATEGORY_CONFIG) as ContentCategory[]).map(
            category => (
              <div key={category} className="flex items-center gap-1">
                <div
                  className={`w-3 h-3 rounded ${
                    getCategoryColor(category).split(' ')[0]
                  }`}
                />
                <span className="text-gray-600">
                  {CONTENT_CATEGORY_CONFIG[category].label.split('/')[0]}
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
