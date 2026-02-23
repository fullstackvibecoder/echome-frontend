'use client';

import { useState, useMemo, useEffect, type ReactElement } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  X,
  Clock,
  List,
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

// Hook to detect mobile viewport
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
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
  if (!category) return 'bg-muted border-border text-muted-foreground';

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
      return <X className="w-3 h-3 text-muted-foreground" />;
    default:
      return <Clock className="w-3 h-3 text-primary" />;
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
  const isMobile = useIsMobile();

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
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-border">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2.5 sm:p-2 hover:bg-muted rounded-md transition-colors touch-manipulation"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2.5 sm:p-2 hover:bg-muted rounded-md transition-colors touch-manipulation"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="font-medium text-foreground ml-1 sm:ml-2 text-sm sm:text-base">{weekRangeStr}</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors touch-manipulation"
          >
            Today
          </button>

          {/* View toggle - hidden on mobile since we auto-show list view */}
          {onViewChange && !isMobile && (
            <div className="hidden sm:flex items-center bg-muted rounded-md p-0.5">
              <button
                onClick={() => onViewChange('week')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  view === 'week'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => onViewChange('month')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  view === 'month'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Month
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile List View - Shows agenda-style list on small screens */}
      {isMobile && (
        <div className="divide-y divide-border">
          {weekDays.map((day, dayIndex) => {
            const dateKey = day.toISOString().split('T')[0];
            const dayPosts = postsByDate[dateKey] || [];
            const isTodayDate = isToday(day);

            return (
              <div key={dateKey} className={isTodayDate ? 'bg-primary/5' : ''}>
                {/* Day Header */}
                <div
                  className={`flex items-center justify-between px-4 py-3 ${
                    isTodayDate ? 'bg-primary/10' : 'bg-muted'
                  }`}
                  onClick={() => onSlotClick?.(day)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        isTodayDate
                          ? 'bg-primary text-white'
                          : 'bg-card border border-border text-muted-foreground'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div>
                      <div className={`font-medium ${isTodayDate ? 'text-primary' : 'text-foreground'}`}>
                        {FULL_DAYS[dayIndex]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {day.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  {dayPosts.length === 0 && (
                    <span className="text-sm text-muted-foreground">Tap to add</span>
                  )}
                </div>

                {/* Day Posts */}
                {dayPosts.length > 0 && (
                  <div className="px-4 py-2 space-y-2">
                    {dayPosts.map(post => (
                      <div
                        key={post.id}
                        onClick={() => onPostClick?.(post)}
                        className={`p-3 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform ${getCategoryColor(
                          post.contentCategory
                        )} ${post.status === 'skipped' ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {new Date(post.scheduledFor).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          {getStatusIcon(post.status)}
                        </div>
                        <div className="font-medium mb-2">
                          {post.title || 'Scheduled Post'}
                        </div>
                        {post.platforms.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {post.platforms.map(p => (
                              <span
                                key={p}
                                className="text-xs px-2 py-1 bg-card/60 rounded-full"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Week View - Hidden on mobile */}
      {view === 'week' && !isMobile && (
        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDays.map((day, dayIndex) => {
            const dateKey = day.toISOString().split('T')[0];
            const dayPosts = postsByDate[dateKey] || [];

            return (
              <div
                key={dateKey}
                className={`border-r border-border last:border-r-0 ${
                  isToday(day) ? 'bg-primary/10' : ''
                }`}
              >
                {/* Day Header */}
                <div
                  className={`sticky top-0 z-10 px-2 py-2 border-b border-border ${
                    isToday(day) ? 'bg-primary/10' : 'bg-muted'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground uppercase">
                      {DAYS[dayIndex]}
                    </div>
                    <div
                      className={`text-lg font-semibold ${
                        isToday(day)
                          ? 'text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                </div>

                {/* Day Content */}
                <div
                  className="p-2 min-h-[400px] space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onSlotClick?.(day)}
                >
                  {dayPosts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
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
                                className="text-[10px] px-1.5 py-0.5 bg-card/50 rounded"
                              >
                                {p}
                              </span>
                            ))}
                            {post.platforms.length > 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-card/50 rounded">
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

      {/* Month View - Simplified, hidden on mobile */}
      {view === 'month' && !isMobile && (
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {DAYS.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
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
                    className={`aspect-square border rounded-md p-1 cursor-pointer hover:bg-muted transition-colors ${
                      isTodayDate ? 'border-primary bg-primary/10' : 'border-border'
                    }`}
                  >
                    <div
                      className={`text-xs font-medium ${
                        isTodayDate ? 'text-primary' : 'text-muted-foreground'
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
                                : 'bg-muted'
                            }`}
                            title={post.title || 'Scheduled'}
                          />
                        ))}
                        {dayPosts.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">
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

      {/* Legend - Hidden on mobile for cleaner UI */}
      <div className="hidden sm:block px-4 py-2 border-t border-border bg-muted">
        <div className="flex items-center justify-center gap-4 text-xs">
          {(Object.keys(CONTENT_CATEGORY_CONFIG) as ContentCategory[]).map(
            category => (
              <div key={category} className="flex items-center gap-1">
                <div
                  className={`w-3 h-3 rounded ${
                    getCategoryColor(category).split(' ')[0]
                  }`}
                />
                <span className="text-muted-foreground">
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
