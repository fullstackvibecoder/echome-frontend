/**
 * useAuth Hook
 * Authentication state management
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { trackSignup } from '@/lib/meta-pixel';
import type { User } from '@/types';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, turnstileToken?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** True while /auth/me is being retried after a backend or network error. */
  reconnecting: boolean;
  /** True when every retry failed. The session is kept; the user can try again. */
  connectionFailed: boolean;
  retry: () => void;
}

/** Waits between /auth/me attempts after a non-401 failure (about 30s in all). */
export const AUTH_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000];

function isUnauthorized(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 401;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const router = useRouter();
  const mounted = useRef(true);
  const userLoaded = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Only a 401 means the session is gone (the api client has already cleared the
  // token and queued the login redirect). A 5xx, timeout or network error during
  // a deploy keeps the token and retries with backoff.
  const fetchCurrentUser = useCallback(async () => {
    setConnectionFailed(false);
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await api.auth.getCurrentUser();
        if (!mounted.current) return;
        if (response.success && response.data) {
          userLoaded.current = true;
          setUser(response.data);
        }
        setReconnecting(false);
        setLoading(false);
        return;
      } catch (error) {
        if (!mounted.current) return;
        if (isUnauthorized(error)) {
          localStorage.removeItem('authToken');
          userLoaded.current = false;
          setUser(null);
          setReconnecting(false);
          setLoading(false);
          return;
        }
        console.error('Failed to fetch user:', error);
        const delay = AUTH_RETRY_DELAYS_MS[attempt];
        if (delay === undefined) {
          setReconnecting(false);
          // A user we already have stays signed in; only a cold load shows the retry card.
          if (!userLoaded.current) setConnectionFailed(true);
          setLoading(false);
          return;
        }
        // Skip the reconnecting screen when a user is already on screen.
        if (!userLoaded.current) setReconnecting(true);
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (!mounted.current) return;
      }
    }
  }, []);

  // Check if user is authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    // Validate token and fetch user data
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const retry = useCallback(() => {
    setLoading(true);
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.auth.login(email, password);
      if (response.success && response.data) {
        await api.auth.adoptSession(response.data.token, response.data.refreshToken);
        setUser(response.data.user);
        // Check for stored redirect path (from 401 session expiry), URL param, or default to /app
        const storedRedirect = localStorage.getItem('redirectAfterLogin');
        if (storedRedirect && storedRedirect.startsWith('/') && !storedRedirect.startsWith('//')) {
          localStorage.removeItem('redirectAfterLogin');
          router.push(storedRedirect);
        } else {
          localStorage.removeItem('redirectAfterLogin');
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = urlParams.get('redirect');
          const redirectTo = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/app';
          router.push(redirectTo);
        }
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Login failed'));
    }
  };

  const signup = async (email: string, password: string, name: string, turnstileToken?: string) => {
    try {
      const response = await api.auth.signup(email, password, name, turnstileToken);
      if (response.success && response.data) {
        await api.auth.adoptSession(response.data.token, response.data.refreshToken);
        setUser(response.data.user);

        // Track signup for Affonso affiliate attribution
        if (typeof window !== 'undefined' && (window as any).Affonso) {
          (window as any).Affonso.signup(email);
        }

        // Track signup for Meta Pixel (ad conversion optimization)
        trackSignup(email);

        // A stashed redirect takes precedence: a cold user who hit a partner
        // redeem link before having an account gets sent back to finish that
        // flow (the redeem page auto-claims once they return authenticated).
        // Falls back to the ?redirect= URL param so the destination survives a
        // localStorage wipe between the redeem page and here — mirrors login().
        const storedRedirect = localStorage.getItem('redirectAfterLogin');
        localStorage.removeItem('redirectAfterLogin');
        const urlRedirect = new URLSearchParams(window.location.search).get('redirect');
        const target = [storedRedirect, urlRedirect].find(
          (r): r is string => !!r && r.startsWith('/') && !r.startsWith('//')
        );
        if (target) {
          router.push(target);
        } else {
          // New users go to the WBTW lookup loading screen first.
          // It surfaces a privacy disclosure, then auto-populates from public sources
          // and routes onward (review → /app, or silent fallthrough to /app if the
          // backend feature flag is off / lookup empty).
          router.push('/onboarding/lookup');
        }
      } else {
        throw new Error(response.error || 'Signup failed');
      }
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Signup failed'));
    }
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    refreshUser,
    reconnecting,
    connectionFailed,
    retry,
  };
}
