'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthForm, signupSchema } from '@/hooks/useAuthForm';
import { OAuthButtons } from '@/components/oauth-buttons';

export default function SignupPage() {
  const { signup } = useAuth();
  const [password, setPassword] = useState('');

  const { errors, isLoading, generalError, handleSubmit, getPasswordStrength } =
    useAuthForm({
      schema: signupSchema,
      onSubmit: async (data) => {
        await signup(data.email, data.password, data.name);
      },
    });

  const passwordStrength = password ? getPasswordStrength(password) : null;

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-subheading text-3xl mb-2">Create Your Echo</h1>
        <p className="text-body text-text-secondary">
          Join 500+ creators making authentic content
        </p>
      </div>

      {/* Benefits */}
      <ul className="space-y-2 mb-8 text-small text-text-secondary">
        <li className="flex items-center gap-2">
          <span className="text-accent">✓</span>
          Generate content in your unique voice
        </li>
        <li className="flex items-center gap-2">
          <span className="text-accent">✓</span>
          Cross-platform in seconds
        </li>
        <li className="flex items-center gap-2">
          <span className="text-accent">✓</span>
          Free forever plan
        </li>
      </ul>

      {/* Form */}
      <form
        action={handleSubmit}
        className="space-y-4"
      >
        {/* General Error */}
        {generalError && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-small">
            {generalError}
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-small font-medium text-text-primary mb-2">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-accent transition-colors ${
              errors.name ? 'border-error' : 'border-border'
            }`}
            placeholder="John Doe"
          />
          {errors.name && (
            <p className="mt-1 text-small text-error">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-small font-medium text-text-primary mb-2">
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
          <label htmlFor="password" className="block text-small font-medium text-text-primary mb-2">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-accent transition-colors ${
              errors.password ? 'border-error' : 'border-border'
            }`}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-small text-error">{errors.password}</p>
          )}

          {/* Password Strength Indicator */}
          {passwordStrength && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordStrength.strength === 'strong'
                        ? 'bg-success'
                        : passwordStrength.strength === 'medium'
                        ? 'bg-warning'
                        : 'bg-error'
                    }`}
                    style={{ width: `${passwordStrength.percentage}%` }}
                  />
                </div>
                <span className="text-small text-text-secondary capitalize">
                  {passwordStrength.strength}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-small font-medium text-text-primary mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-accent transition-colors ${
              errors.confirmPassword ? 'border-error' : 'border-border'
            }`}
            placeholder="••••••••"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-small text-error">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-small">
          <span className="px-2 bg-bg-primary text-text-secondary">Or continue with</span>
        </div>
      </div>

      {/* OAuth */}
      <OAuthButtons />

      {/* Login Link */}
      <p className="mt-6 text-center text-small text-text-secondary">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-accent hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
