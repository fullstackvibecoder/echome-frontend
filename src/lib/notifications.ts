/**
 * Browser Notification Helpers
 *
 * Utilities for requesting notification permissions and
 * showing browser notifications when content generation completes.
 */

/**
 * Check if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) return null;
  return Notification.permission;
}

/**
 * Request notification permission from user
 * Returns true if permission is granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    console.warn('Failed to request notification permission');
    return false;
  }
}

/**
 * Check if notifications are enabled (permission granted)
 */
export function isNotificationEnabled(): boolean {
  return getNotificationPermission() === 'granted';
}

/**
 * Show a browser notification
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isNotificationEnabled()) return null;

  try {
    return new Notification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      requireInteraction: false,
      ...options,
    });
  } catch {
    console.warn('Failed to show notification');
    return null;
  }
}

/**
 * Show completion notification for content generation
 * Uses a tag to prevent duplicate notifications
 */
export function showCompletionNotification(
  title: string = 'Content Ready!',
  body: string = 'Your content has been generated and is ready to view.'
): Notification | null {
  return showNotification(title, {
    body,
    tag: 'generation-complete', // Prevents duplicate notifications
  });
}

/**
 * Show error notification for failed generation
 */
export function showErrorNotification(
  title: string = 'Generation Failed',
  body: string = 'There was an error generating your content. Please try again.'
): Notification | null {
  return showNotification(title, {
    body,
    tag: 'generation-error',
  });
}

/**
 * Check if document is currently hidden (user not viewing the tab)
 */
export function isDocumentHidden(): boolean {
  if (typeof document === 'undefined') return false;
  return document.hidden || document.visibilityState === 'hidden';
}

/**
 * Show notification only if document is hidden
 * This prevents annoying the user when they're already looking at the page
 */
export function showNotificationIfHidden(
  title: string,
  body: string
): Notification | null {
  if (!isDocumentHidden()) return null;
  return showCompletionNotification(title, body);
}
