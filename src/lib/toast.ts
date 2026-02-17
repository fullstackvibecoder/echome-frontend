/**
 * Toast notification wrappers (powered by Sonner)
 *
 * Usage:
 *   import { showErrorToast, showSuccessToast } from '@/lib/toast';
 *   showErrorToast(err, 'uploading file');
 *   showSuccessToast('Profile saved');
 */

import { toast } from 'sonner';
import { extractError } from './error-utils';

/**
 * Show an error toast with context-aware messaging.
 * Extracts the message from any error type (Axios, Error, string, unknown).
 */
export function showErrorToast(err: unknown, context?: string) {
  const extracted = extractError(err);

  // Rate-limited: auto-dismiss after a longer period
  if (extracted.isRateLimited) {
    toast.error('Too many requests', {
      description: 'Please wait a moment and try again.',
      duration: 8000,
    });
    return;
  }

  // Network error
  if (extracted.isNetworkError) {
    toast.error('Connection problem', {
      description: 'Please check your internet connection and try again.',
      duration: 6000,
    });
    return;
  }

  // Payment required
  if (extracted.isPaymentRequired) {
    toast.error('Subscription required', {
      description: extracted.message,
      duration: 6000,
    });
    return;
  }

  // General error with optional context
  const title = context ? `Error ${context}` : 'Something went wrong';
  toast.error(title, {
    description: extracted.message,
    duration: 5000,
  });
}

/**
 * Show a success toast.
 */
export function showSuccessToast(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

/**
 * Show an informational toast.
 */
export function showInfoToast(message: string, description?: string) {
  toast.info(message, {
    description,
    duration: 4000,
  });
}
