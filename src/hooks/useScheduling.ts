'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import {
  ScheduledPost,
  WeeklyAnalysis,
  ContentCategory,
  UnscheduledContent,
} from '@/types';

interface UseSchedulingReturn {
  // Data
  scheduledPosts: ScheduledPost[];
  weeklyAnalysis: WeeklyAnalysis | null;
  unscheduledContent: UnscheduledContent[];

  // State
  loading: boolean;
  error: string | null;

  // Current view
  currentWeekStart: string;
  setCurrentWeekStart: (date: string) => void;

  // Actions
  schedulePost: (
    contentKitId: string,
    scheduledFor: string,
    platforms: string[],
    contentCategory?: ContentCategory,
    notes?: string
  ) => Promise<ScheduledPost | null>;
  updateSchedule: (id: string, updates: {
    scheduledFor?: string;
    platforms?: string[];
    contentCategory?: ContentCategory;
    notes?: string;
  }) => Promise<ScheduledPost | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
  markAsPosted: (id: string) => Promise<boolean>;
  markAsSkipped: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Hook for managing content calendar scheduling
 * Provides CRUD operations for scheduled posts and AI-powered suggestions
 */
export function useScheduling(): UseSchedulingReturn {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [weeklyAnalysis, setWeeklyAnalysis] = useState<WeeklyAnalysis | null>(null);
  const [unscheduledContent, setUnscheduledContent] = useState<UnscheduledContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(
    getWeekStart(new Date()).toISOString()
  );

  /**
   * Fetch scheduled posts and suggestions for the current week
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate week end (7 days from start)
      const weekStart = new Date(currentWeekStart);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Fetch all data in parallel
      const [postsRes, suggestionsRes, unscheduledRes] = await Promise.all([
        api.scheduling.list({
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString(),
        }),
        api.scheduling.getSuggestions(currentWeekStart),
        api.scheduling.getUnscheduled(),
      ]);

      if (postsRes.success && postsRes.data) {
        setScheduledPosts(postsRes.data.posts);
      }

      if (suggestionsRes.success && suggestionsRes.data) {
        setWeeklyAnalysis(suggestionsRes.data);
      }

      if (unscheduledRes.success && unscheduledRes.data) {
        setUnscheduledContent(unscheduledRes.data.content);
      }
    } catch (err) {
      console.error('[useScheduling] Failed to fetch data:', err);
      setError(extractErrorMessage(err, 'Failed to load schedule'));
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart]);

  // Fetch data when week changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Schedule a new post
   */
  const schedulePost = useCallback(async (
    contentKitId: string,
    scheduledFor: string,
    platforms: string[],
    contentCategory?: ContentCategory,
    notes?: string
  ): Promise<ScheduledPost | null> => {
    try {
      setError(null);

      const response = await api.scheduling.create({
        contentKitId,
        scheduledFor,
        platforms,
        contentCategory,
        notes,
      });

      if (response.success && response.data?.post) {
        // Add to local state
        setScheduledPosts(prev => [...prev, response.data.post!]);
        // Refresh suggestions
        const suggestionsRes = await api.scheduling.getSuggestions(currentWeekStart);
        if (suggestionsRes.success) {
          setWeeklyAnalysis(suggestionsRes.data);
        }
        // Remove from unscheduled
        setUnscheduledContent(prev => prev.filter(c => c.id !== contentKitId));
        return response.data.post;
      }

      return null;
    } catch (err) {
      console.error('[useScheduling] Failed to schedule post:', err);
      setError(extractErrorMessage(err, 'Failed to schedule post'));
      return null;
    }
  }, [currentWeekStart]);

  /**
   * Update a scheduled post
   */
  const updateSchedule = useCallback(async (
    id: string,
    updates: {
      scheduledFor?: string;
      platforms?: string[];
      contentCategory?: ContentCategory;
      notes?: string;
    }
  ): Promise<ScheduledPost | null> => {
    try {
      setError(null);

      const response = await api.scheduling.update(id, updates);

      if (response.success && response.data?.post) {
        // Update local state
        setScheduledPosts(prev =>
          prev.map(p => (p.id === id ? response.data.post! : p))
        );
        // Refresh suggestions if category changed
        if (updates.contentCategory) {
          const suggestionsRes = await api.scheduling.getSuggestions(currentWeekStart);
          if (suggestionsRes.success) {
            setWeeklyAnalysis(suggestionsRes.data);
          }
        }
        return response.data.post;
      }

      return null;
    } catch (err) {
      console.error('[useScheduling] Failed to update schedule:', err);
      setError(extractErrorMessage(err, 'Failed to update schedule'));
      return null;
    }
  }, [currentWeekStart]);

  /**
   * Delete a scheduled post
   */
  const deleteSchedule = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await api.scheduling.delete(id);

      if (response.success) {
        // Remove from local state
        setScheduledPosts(prev => prev.filter(p => p.id !== id));
        // Refresh suggestions
        const suggestionsRes = await api.scheduling.getSuggestions(currentWeekStart);
        if (suggestionsRes.success) {
          setWeeklyAnalysis(suggestionsRes.data);
        }
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useScheduling] Failed to delete schedule:', err);
      setError(extractErrorMessage(err, 'Failed to delete schedule'));
      return false;
    }
  }, [currentWeekStart]);

  /**
   * Mark a scheduled post as posted
   */
  const markAsPosted = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await api.scheduling.markPosted(id);

      if (response.success) {
        // Update local state
        setScheduledPosts(prev =>
          prev.map(p => (p.id === id ? { ...p, status: 'posted' as const, postedAt: new Date().toISOString() } : p))
        );
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useScheduling] Failed to mark as posted:', err);
      setError(extractErrorMessage(err, 'Failed to mark as posted'));
      return false;
    }
  }, []);

  /**
   * Mark a scheduled post as skipped
   */
  const markAsSkipped = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);

      const response = await api.scheduling.skip(id);

      if (response.success) {
        // Update local state
        setScheduledPosts(prev =>
          prev.map(p => (p.id === id ? { ...p, status: 'skipped' as const } : p))
        );
        return true;
      }

      return false;
    } catch (err) {
      console.error('[useScheduling] Failed to mark as skipped:', err);
      setError(extractErrorMessage(err, 'Failed to mark as skipped'));
      return false;
    }
  }, []);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
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
  };
}
