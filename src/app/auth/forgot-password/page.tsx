'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Implement password reset
    setTimeout(() => {
      setIsSubmitted(true);
      setIsLoading(false);
    }, 1000);
  };

  if (isSubmitted) {
    return (
      <div className="card animate-fade-in text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-subheading text-2xl mb-4">Check your email</h1>
        <p className="text-body text-text-secondary mb-6">
          We have sent password reset instructions to{' '}
          <span className="font-semibold text-text-primary">{email}</span>
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
        <h1 className="text-subheading text-3xl mb-2">Forgot Password?</h1>
        <p className="text-body text-text-secondary">
          Enter your email and we will send you reset instructions
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-small font-medium text-text-primary mb-2"
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
            className="w-full px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
            placeholder="you@example.com"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      {/* Back to Login */}
      <p className="mt-6 text-center text-small text-text-secondary">
        Remember your password?{' '}
        <Link
          href="/auth/login"
          className="text-accent hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
