'use client';

/**
 * useTourState — shared hook for the guided-tour system.
 *
 * Reads `user.preferences.toursSeen` to decide whether to fire a tour, and
 * writes back via PATCH /api/me/preferences when a tour is dismissed or
 * completed. The localStorage fallback prevents the same tab from re-firing
 * a tour within a session if the PATCH failed (network blip).
 *
 * See docs/superpowers/specs/2026-05-23-guided-tour-system-design.md §8.3.
 */
import { useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from './useAuth';

const FALLBACK_KEY = 'toursSeenFallback';

function readFallback(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeFallback(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(ids));
  } catch {
    /* localStorage full or disabled — accept the loss */
  }
}

export function useTourState() {
  const { user, refreshUser } = useAuth();

  const serverSeen: string[] = user?.preferences?.toursSeen ?? [];
  const localSeen = readFallback();
  const allSeen = Array.from(new Set([...serverSeen, ...localSeen]));

  const hasSeen = useCallback(
    (id: string) => allSeen.includes(id),
    [allSeen],
  );

  const markSeen = useCallback(
    async (id: string) => {
      if (allSeen.includes(id)) return;
      const next = [...serverSeen, id];
      try {
        await api.profile.updatePreferences({ toursSeen: next });
        await refreshUser();
      } catch (err) {
        console.warn('[useTourState] PATCH failed, falling back to localStorage', err);
        writeFallback([...localSeen, id]);
      }
    },
    [allSeen, serverSeen, localSeen, refreshUser],
  );

  return { hasSeen, markSeen };
}
