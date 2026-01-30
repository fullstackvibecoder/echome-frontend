'use client';

import { useState, useCallback } from 'react';

const WELCOME_KEY = 'echome_welcome_dismissed';
const SIDEBAR_HINTS_KEY = 'echome_sidebar_hints_seen';

function getStoredHints(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(SIDEBAR_HINTS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function useFirstTimeUser() {
  const [isFirstTime, setIsFirstTime] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(WELCOME_KEY);
  });

  const [sidebarHintsSeen, setSidebarHintsSeen] = useState<Record<string, boolean>>(getStoredHints);

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
