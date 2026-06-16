'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { useAuth } from '@/hooks/useAuth';
import { useAuthForm, signupSchema } from '@/hooks/useAuthForm';
import { OAuthButtons } from '@/components/oauth-buttons';

function SignupForm() {
  const { signup } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const searchParams = useSearchParams();

  // Store plan selection in sessionStorage for checkout after signup
  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan && ['echo', 'echo-studio', 'echo-pro', 'echo-teams-2', 'echo-teams-5', 'echo-teams-10'].includes(plan)) {
      sessionStorage.setItem('pendingPlan', plan);
    }
  }, [searchParams]);

  const { errors, isLoading, generalError, handleSubmit, getPasswordStrength } =
    useAuthForm({
      schema: signupSchema,
      onSubmit: async (data) => {
        await signup(data.email, data.password, data.name, turnstileToken || undefined);
      },
    });

  const passwordStrength = password ? getPasswordStrength(password) : null;

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">Create Your Echo</h1>
        <p className="text-muted-foreground">
          Start generating content that sounds like you wrote it
        </p>
      </div>

      {/* Benefits */}
      <ul className="space-y-2 mb-8 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="text-primary">✓</span>
          5 free content kits, no credit card
        </li>
        <li className="flex items-center gap-2">
          <span className="text-primary">✓</span>
          Learns from your existing content
        </li>
        <li className="flex items-center gap-2">
          <span className="text-primary">✓</span>
          Output grounded in your voice and ideas
        </li>
      </ul>

      {/* Form */}
      {/* translate="no" is the W3C-standard signal that prevents browser
          translate engines from mutating the form's subtree — protects React
          reconciliation from the DOM swaps that produced ECHO-ME-FRONTEND-30
          on Edge Mobile / Chrome Mobile. Belt-and-suspenders with the
          notranslate meta in page.tsx. */}
      <form
        action={handleSubmit}
        className="space-y-4"
        translate="no"
      >
        {/* General Error */}
        {generalError && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm" role="alert" aria-live="polite">
            {generalError}
            <p className="mt-2 text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Sign in instead
              </Link>
            </p>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            Full Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            autoComplete="name"
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-primary transition-colors bg-input ${
              errors.name ? 'border-destructive' : 'border-border'
            }`}
            placeholder="John Doe"
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'signup-email-error' : undefined}
            autoComplete="email"
            inputMode="email"
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:border-primary transition-colors bg-input ${
              errors.email ? 'border-destructive' : 'border-border'
            }`}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p id="signup-email-error" className="mt-1 text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              // Uncontrolled (no value=) on purpose: password managers and
              // browser strong-password autofill set the DOM value WITHOUT
              // firing React's onChange. A controlled value= would then re-force
              // the field back to stale state on the next render (e.g. the
              // setIsLoading re-render at submit), while the uncontrolled
              // confirmPassword kept the autofilled value — producing a false
              // "Passwords do not match". onChange stays only to drive the live
              // strength meter when the user types; submission reads the true
              // DOM value via FormData for both fields.
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'signup-password-error' : 'password-requirements'}
              autoComplete="new-password"
              className={`w-full px-4 py-3 pr-14 border-2 rounded-lg focus:outline-none focus:border-primary transition-colors bg-input ${
                errors.password ? 'border-destructive' : 'border-border'
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p id="signup-password-error" className="mt-1 text-sm text-destructive">{errors.password}</p>
          )}

          {/* Password Requirements Checklist */}
          <ul id="password-requirements" className="mt-2 space-y-1 text-xs">
            {[
              { label: '8+ characters', met: password.length >= 8 },
              { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
              { label: 'Lowercase letter', met: /[a-z]/.test(password) },
              { label: 'Number', met: /[0-9]/.test(password) },
            ].map((req) => (
              <li key={req.label} className={`flex items-center gap-1.5 ${password ? (req.met ? 'text-green-600' : 'text-muted-foreground') : 'text-muted-foreground'}`}>
                {password && req.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {req.label}
              </li>
            ))}
          </ul>

          {/* Password Strength Indicator */}
          {passwordStrength && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordStrength.strength === 'strong'
                        ? 'bg-green-500'
                        : passwordStrength.strength === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-destructive'
                    }`}
                    style={{ width: `${passwordStrength.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground capitalize">
                  {passwordStrength.strength}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              className={`w-full px-4 py-3 pr-14 border-2 rounded-lg focus:outline-none focus:border-primary transition-colors bg-input ${
                errors.confirmPassword ? 'border-destructive' : 'border-border'
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Terms of Service */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="text-primary hover:underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </span>
          </label>
        </div>

        {/* Turnstile CAPTCHA */}
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <div className="flex justify-center">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
              options={{ size: 'normal', theme: 'dark' }}
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            isLoading ||
            !agreedToTerms ||
            (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken)
          }
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
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
        </div>
      </div>

      {/* OAuth */}
      <OAuthButtons />

      {/* Login Link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupContent() {
  return (
    <Suspense
      fallback={
        <div className="card animate-fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Create Your Echo</h1>
            <p className="text-muted-foreground">One moment...</p>
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
