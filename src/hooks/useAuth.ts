/**
 * useAuth Hook
 * Authentication state management
 */

'use client';

import { useEffect, useState } from 'react';
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
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    // Validate token and fetch user data
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.auth.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.auth.login(email, password);
      if (response.success && response.data) {
        localStorage.setItem('authToken', response.data.token);
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
        localStorage.setItem('authToken', response.data.token);
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
        const storedRedirect = localStorage.getItem('redirectAfterLogin');
        if (storedRedirect && storedRedirect.startsWith('/') && !storedRedirect.startsWith('//')) {
          localStorage.removeItem('redirectAfterLogin');
          router.push(storedRedirect);
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
  };
}
