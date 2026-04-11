/**
 * Friendly error messages for Supabase auth errors.
 *
 * Supabase's client SDK returns raw error strings like:
 *   "For security purposes, you can only request this after 49 seconds."
 *   "Email rate limit exceeded"
 *   "User already registered"
 *
 * These bubble straight to the UI as-is, which is confusing. This helper
 * detects known error patterns and returns user-friendly messages.
 */

export interface FriendlyAuthError {
  message: string;
  /** Seconds to wait, if the error is a rate limit with a known cooldown */
  waitSeconds?: number;
  /** True if the user should just wait and retry — not a permanent failure */
  isRateLimit?: boolean;
}

/**
 * Parse a raw auth error (from supabase.auth.*) into a friendly message.
 */
export function friendlyAuthError(err: unknown): FriendlyAuthError {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unexpected error';
  const lower = raw.toLowerCase();

  // Rate limit with explicit cooldown: "For security purposes, you can only request this after 49 seconds."
  const secondsMatch = raw.match(/after (\d+) seconds?/i);
  if (secondsMatch) {
    const seconds = parseInt(secondsMatch[1], 10);
    return {
      message: `Please wait ${seconds} second${seconds === 1 ? '' : 's'} before requesting another reset email.`,
      waitSeconds: seconds,
      isRateLimit: true,
    };
  }

  // Supabase's generic rate limit
  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('for security purposes')) {
    return {
      message: 'Too many requests. Please wait a minute and try again.',
      isRateLimit: true,
    };
  }

  // Email service quota (Resend/SendGrid)
  if (lower.includes('email rate limit exceeded')) {
    return {
      message: 'Our email system is temporarily throttled. Please try again in a few minutes.',
      isRateLimit: true,
    };
  }

  // User-friendly fallbacks for other common errors
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return { message: 'That email and password combination didn\'t work. Please try again.' };
  }
  if (lower.includes('user already registered')) {
    return { message: 'An account with that email already exists. Try signing in instead.' };
  }
  if (lower.includes('email not confirmed')) {
    return { message: 'Please check your email and click the confirmation link before signing in.' };
  }
  if (lower.includes('invalid email')) {
    return { message: 'That doesn\'t look like a valid email address.' };
  }
  if (lower.includes('password should be') || lower.includes('password is too weak')) {
    return { message: raw }; // Supabase's password strength messages are already user-friendly
  }

  // Default: return the raw message as-is (most Supabase errors are reasonably clear)
  return { message: raw };
}
