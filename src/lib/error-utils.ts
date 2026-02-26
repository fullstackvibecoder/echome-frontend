/**
 * Unified error extraction utility
 *
 * Handles all backend response formats:
 * 1. { error: { message, code } }     — standard AppError format
 * 2. { error: "string" }              — flat string format (legacy routes)
 * 3. { error: "msg", details: [...] } — validation errors
 *
 * Also handles: Axios errors, plain Error objects, network failures, unknowns.
 */

import { AxiosError } from 'axios';

export interface ExtractedError {
  message: string;
  code: string | null;
  status: number | null;
  isNetworkError: boolean;
  isAuthError: boolean;
  isRateLimited: boolean;
  isPaymentRequired: boolean;
}

/** Messages shown to users instead of raw technical errors */
const SANITIZED_MESSAGES: Record<string, string> = {
  'Potential SQL injection detected': 'Your input contains characters that aren\'t allowed. Please revise and try again.',
  'Potential XSS attack detected': 'Your input contains characters that aren\'t allowed. Please revise and try again.',
  'Potential path traversal detected': 'Your input contains characters that aren\'t allowed. Please revise and try again.',
  // Catch any internal service names that shouldn't reach users
  'SociaVault': 'Unable to fetch Instagram content. Please try again later.',
  'Pinecone': 'Something went wrong. Please try again.',
  'OPENAI_API_KEY': 'Something went wrong on our end. Please try again.',
  'SUPABASE_': 'Something went wrong on our end. Please try again.',
};

/** Status-based fallback messages */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You don\'t have permission to do that.',
  404: 'The requested resource was not found.',
  409: 'This conflicts with an existing resource.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again.',
  502: 'Our servers are temporarily unavailable. Please try again in a moment.',
  503: 'Service temporarily unavailable. Please try again in a moment.',
};

/**
 * Extract a rich error object from any error type.
 */
export function extractError(err: unknown, fallback = 'Something went wrong. Please try again.'): ExtractedError {
  // Default result
  const result: ExtractedError = {
    message: fallback,
    code: null,
    status: null,
    isNetworkError: false,
    isAuthError: false,
    isRateLimited: false,
    isPaymentRequired: false,
  };

  if (!err) return result;

  // Axios errors (most common in this codebase)
  if (isAxiosError(err)) {
    result.status = err.response?.status ?? null;

    // Network / timeout errors (no response from server)
    if (!err.response) {
      result.isNetworkError = true;
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        result.message = 'Request timed out. Please check your connection and try again.';
      } else {
        result.message = 'Unable to reach the server. Please check your connection.';
      }
      return result;
    }

    const data = err.response.data;

    // Format 1: { error: { message, code } }
    if (data?.error && typeof data.error === 'object' && data.error.message) {
      result.message = sanitize(data.error.message);
      result.code = data.error.code || null;
    }
    // Format 2: { error: "string" }
    else if (data?.error && typeof data.error === 'string') {
      result.message = sanitize(data.error);
    }
    // Format 3: { error: "msg", details: [...] }
    else if (data?.error && data?.details && Array.isArray(data.details)) {
      const detail = data.details[0];
      result.message = detail?.message
        ? sanitize(`${data.error}: ${detail.message}`)
        : sanitize(data.error);
    }
    // Fallback: use status-based message
    else if (result.status && STATUS_MESSAGES[result.status]) {
      result.message = STATUS_MESSAGES[result.status];
    }

    // Set boolean flags
    result.isAuthError = result.status === 401;
    result.isRateLimited = result.status === 429;
    result.isPaymentRequired = result.status === 402;

    return result;
  }

  // Plain Error objects
  if (err instanceof Error) {
    result.message = sanitize(err.message) || fallback;
    return result;
  }

  // String errors
  if (typeof err === 'string') {
    result.message = sanitize(err) || fallback;
    return result;
  }

  return result;
}

/**
 * Convenience function: extract just the message string.
 */
export function extractErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return extractError(err, fallback).message;
}

// ---- Helpers ----

function isAxiosError(err: unknown): err is AxiosError<any> {
  return (
    typeof err === 'object' &&
    err !== null &&
    'isAxiosError' in err &&
    (err as any).isAxiosError === true
  );
}

function sanitize(message: string): string {
  if (!message) return message;

  // Replace known technical messages with user-friendly versions
  for (const [pattern, replacement] of Object.entries(SANITIZED_MESSAGES)) {
    if (message.includes(pattern)) {
      return replacement;
    }
  }

  // Strip raw Stripe error internals (e.g. "raw: {...}")
  if (message.includes('raw:') && message.includes('requestId:')) {
    return 'A payment processing error occurred. Please try again.';
  }

  return message;
}
