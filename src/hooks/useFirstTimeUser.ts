'use client';

import { useState, useCallback, useEffect } from 'react';

const WELCOME_KEY = 'echome_welcome_dismissed';

export function useFirstTimeUser() {
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Read localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setIsFirstTime(!localStorage.getItem(WELCOME_KEY));
  }, []);

  const dismissWelcome = useCallback(() => {
    localStorage.setItem(WELCOME_KEY, new Date().toISOString());
    setIsFirstTime(false);
  }, []);

  return { isFirstTime, dismissWelcome };
}
