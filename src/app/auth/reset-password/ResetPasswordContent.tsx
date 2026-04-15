'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type LinkState = 'verifying' | 'ready' | 'invalid';

const VERIFY_TIMEOUT_MS = 6000;

export default function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [linkState, setLinkState] = useState<LinkState>('verifying');
  const [linkErrorMessage, setLinkErrorMessage] = useState('');
  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const markReady = () => {
      if (cancelled || readyRef.current) return;
      readyRef.current = true;
      setLinkState('ready');
      if (timeoutId) clearTimeout(timeoutId);
    };

    const markInvalid = (message: string) => {
      if (cancelled || readyRef.current) return;
      setLinkErrorMessage(message);
      setLinkState('invalid');
      if (timeoutId) clearTimeout(timeoutId);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') markReady();
    });

    (async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);

      const urlErrorDesc = hashParams.get('error_description') || queryParams.get('error_description');
      const urlErrorCode = hashParams.get('error_code') || queryParams.get('error') || hashParams.get('error');
      if (urlErrorDesc || urlErrorCode) {
        const combined = (urlErrorDesc || urlErrorCode || '').toLowerCase();
        if (combined.includes('expired')) {
          markInvalid('This reset link has expired. Request a new one below.');
        } else if (combined.includes('access_denied') || combined.includes('invalid') || combined.includes('otp')) {
          markInvalid('This reset link is no longer valid. It may have already been used.');
        } else {
          markInvalid(urlErrorDesc || 'This reset link could not be verified.');
        }
        return;
      }

      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        markReady();
        return;
      }

      const code = queryParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          const msg = exchangeError.message.toLowerCase();
          if (msg.includes('verifier') || msg.includes('pkce')) {
            markInvalid(
              'This link was opened on a different device than where you requested it. Request a new link and open it on the same device and browser.'
            );
          } else if (msg.includes('expired')) {
            markInvalid('This reset link has expired. Request a new one below.');
          } else {
            markInvalid(exchangeError.message || 'This reset link could not be verified.');
          }
          return;
        }
        markReady();
        return;
      }

      timeoutId = setTimeout(() => {
        markInvalid('We could not verify your reset link. It may have expired or already been used.');
      }, VERIFY_TIMEOUT_MS);
    })();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="card animate-fade-in text-center">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Password Updated</h1>
        <p className="text-muted-foreground mb-6">
          Your password has been successfully reset.
        </p>
        <Link href="/auth/login" className="btn-primary inline-block">
          Sign In
        </Link>
      </div>
    );
  }

  if (linkState === 'invalid') {
    return (
      <div className="card animate-fade-in text-center">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Reset Link Invalid</h1>
        <p className="text-muted-foreground mb-6">
          {linkErrorMessage}
        </p>
        <Link href="/auth/forgot-password" className="btn-primary inline-block">
          Request a New Link
        </Link>
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (linkState === 'verifying') {
    return (
      <div className="card animate-fade-in text-center">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Reset Your Password</h1>
        <p className="text-muted-foreground mb-6">
          Verifying your reset link...
        </p>
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Set New Password</h1>
        <p className="text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
            New Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-primary transition-colors bg-input"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground mb-2">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-primary transition-colors bg-input"
            placeholder="Confirm your password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Updating...' : 'Reset Password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/auth/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
