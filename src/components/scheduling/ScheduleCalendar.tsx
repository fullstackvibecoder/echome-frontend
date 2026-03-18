'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  Plus,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
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

/**
 * Get category color classes (dark-mode safe)
 */
function getCategoryColor(category?: ContentCategory): string {
  if (!category) return 'bg-muted border-border text-muted-foreground';

  const colors: Record<ContentCategory, string> = {
    authority: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
    personal_story: 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300',
    pain_problem: 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300',
    testimonial: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  };

  return colors[category];
}

/**
 * Get status icon
 */
function getStatusIcon(status: ScheduledPost['status']) {
  switch (status) {
    case 'posted':
      return <Check className="w-3 h-3 text-emerald-500" />;
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

  const hasAnyPosts = scheduledPosts.length > 0;

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

        <button
          onClick={goToToday}
          className="px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors touch-manipulation"
        >
          Today
        </button>
      </div>

      {/* Full-calendar empty state */}
      {!hasAnyPosts && !isMobile && (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No content scheduled</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
            Create content first, then add it to your calendar from any content kit.
          </p>
          <Link
            href="/app"
            className="btn-primary flex items-center gap-2 px-5 py-2.5"
          >
            <Sparkles className="w-4 h-4" />
            Create Content
          </Link>
        </div>
      )}

      {/* Mobile List View */}
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
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        isTodayDate
                          ? 'bg-primary text-primary-foreground'
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
                    <Link
                      href="/app"
                      className="p-2 text-muted-foreground/40 hover:text-primary transition-colors"
                      aria-label="Create content"
                    >
                      <Plus className="w-5 h-5" />
                    </Link>
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

      {/* Week View - Hidden on mobile, hidden when fully empty */}
      {hasAnyPosts && !isMobile && (
        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDays.map((day, dayIndex) => {
            const dateKey = day.toISOString().split('T')[0];
            const dayPosts = postsByDate[dateKey] || [];

            return (
              <div
                key={dateKey}
                className={`border-r border-border last:border-r-0 ${
                  isToday(day) ? 'bg-primary/5' : ''
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
                <div className="p-2 min-h-[400px] space-y-2">
                  {dayPosts.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <Link
                        href="/app"
                        className="p-3 text-muted-foreground/30 hover:text-primary/60 transition-colors rounded-lg hover:bg-muted/50"
                        aria-label={`Create content for ${DAYS[dayIndex]}`}
                      >
                        <Plus className="w-5 h-5" />
                      </Link>
                    </div>
                  ) : (
                    dayPosts.map(post => (
                      <div
                        key={post.id}
                        onClick={() => onPostClick?.(post)}
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
    </div>
  );
}
