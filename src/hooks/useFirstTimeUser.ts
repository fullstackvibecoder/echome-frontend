'use client';

import { useState, useCallback, useEffect } from 'react';

const WELCOME_KEY = 'echome_welcome_dismissed';
const SIDEBAR_HINTS_KEY = 'echome_sidebar_hints_seen';

export function useFirstTimeUser() {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [sidebarHintsSeen, setSidebarHintsSeen] = useState<Record<string, boolean>>({});

  // Read localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setIsFirstTime(!localStorage.getItem(WELCOME_KEY));
    try {
      const stored = localStorage.getItem(SIDEBAR_HINTS_KEY);
      if (stored) setSidebarHintsSeen(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

  const dismissWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_KEY, new Date().toISOString());
    setIsFirstTime(false);
  }, []);

  const markSidebarHintSeen = useCallback((id: string) => {
    setSidebarHintsSeen((prev) => {
      const next = { ...prev, [id]: true };
      localStorage.setItem(SIDEBAR_HINTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { isFirstTime, dismissWelcome, sidebarHintsSeen, markSidebarHintSeen };
}
