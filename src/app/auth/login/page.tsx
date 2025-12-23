'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuthForm, loginSchema } from '@/hooks/useAuthForm';
import { OAuthButtons } from '@/components/oauth-buttons';

export default function LoginPage() {
  const { login } = useAuth();

  const { errors, isLoading, generalError, handleSubmit } = useAuthForm({
    schema: loginSchema,
    onSubmit: async (data) => {
      await login(data.email, data.password);
    },
  });

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-subheading text-3xl mb-2">Welcome Back</h1>
        <p className="text-body text-text-secondary">
          Sign in to continue creating authentic content
        </p>
      </div>

      {/* Form */}
      <form action={handleSubmit} className="space-y-4">
        {/* General Error */}
        {generalError && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-small">
            {generalError}
          </div>
        )}

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
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-accent transition-colors ${
              errors.email ? 'border-error' : 'border-border'
            }`}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-small text-error">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-small font-medium text-text-primary"
            >
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-small text-accent hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-accent transition-colors ${
              errors.password ? 'border-error' : 'border-border'
            }`}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-small text-error">{errors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-small">
          <span className="px-2 bg-bg-primary text-text-secondary">
            Or continue with
          </span>
        </div>
      </div>

      {/* OAuth */}
      <OAuthButtons />

      {/* Signup Link */}
      <p className="mt-6 text-center text-small text-text-secondary">
        New to EchoMe?{' '}
        <Link
          href="/auth/signup"
          className="text-accent hover:underline font-medium"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
