'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyAuthError } from '@/lib/auth-error-messages';

export default function ForgotPasswordContent() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // When the error is a rate limit with a known cooldown, count it down
  // so the button re-enables automatically instead of making the user guess.
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => setCooldownSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldownSeconds > 0) return;
    setIsLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setIsSubmitted(true);
    } catch (err) {
      const friendly = friendlyAuthError(err);
      setError(friendly.message);
      if (friendly.waitSeconds) {
        setCooldownSeconds(friendly.waitSeconds);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="card animate-fade-in text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold mb-4 text-foreground">Check your email</h1>
        <p className="text-muted-foreground mb-6">
          We have sent password reset instructions to{' '}
          <span className="font-semibold text-foreground">{email}</span>
        </p>
        <Link href="/auth/login" className="btn-primary inline-block">
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Forgot Password?</h1>
        <p className="text-muted-foreground">
          Enter your email and we will send you reset instructions
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-primary transition-colors bg-input"
            placeholder="you@example.com"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || cooldownSeconds > 0}
          className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? 'Sending...'
            : cooldownSeconds > 0
            ? `Wait ${cooldownSeconds}s…`
            : 'Send Reset Link'}
        </button>
      </form>

      {/* Back to Login */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link
          href="/auth/login"
          className="text-primary hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
