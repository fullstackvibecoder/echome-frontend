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
        <h1 className="text-3xl font-bold mb-2 text-foreground">Welcome Back</h1>
        <p className="text-muted-foreground">
          Sign in to continue creating authentic content
        </p>
      </div>

      {/* Form */}
      <form action={handleSubmit} className="space-y-4">
        {/* General Error */}
        {generalError && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {generalError}
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
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-primary transition-colors bg-input ${
              errors.email ? 'border-destructive' : 'border-border'
            }`}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-primary transition-colors bg-input ${
              errors.password ? 'border-destructive' : 'border-border'
            }`}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-destructive">{errors.password}</p>
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
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-card text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* OAuth */}
      <OAuthButtons />

      {/* Signup Link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to EchoMe?{' '}
        <Link
          href="/auth/signup"
          className="text-primary hover:underline font-medium"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
