'use client';

/**
 * Global Error Handler
 *
 * Provides application-wide error handling, specifically for WebView
 * integration issues like the "Java object is gone" error from
 * enableButtonsClickedMetaDataLogging and similar native bridge failures.
 */

import { useEffect } from 'react';
import { useWebViewErrorHandler } from '@/hooks/useWebViewErrorHandler';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export default function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
  const { isWebViewContext, handleError } = useWebViewErrorHandler();

  useEffect(() => {
    // Log the context on mount for debugging
    if (isWebViewContext) {
      console.info('WebView context detected - enhanced error handling enabled');
    }

    // Additional safety measures for specific methods
    const patchProblematicMethods = () => {
      // Common problematic WebView methods that might cause "Java object is gone" errors
      const problematicMethods = [
        'enableButtonsClickedMetaDataLogging',
        'disableButtonsClickedMetaDataLogging',
        'logButtonClick',
        'trackUserInteraction',
        'reportAnalyticsEvent',
      ];

      problematicMethods.forEach(methodName => {
        // Check if method exists on window and patch it
        if (typeof (window as any)[methodName] === 'function') {
          const original = (window as any)[methodName];
          (window as any)[methodName] = function(...args: any[]) {
            try {
              return original.apply(this, args);
            } catch (error: any) {
              if (handleError(error)) {
                console.warn(`Patched WebView method "${methodName}" failed safely`);
                return undefined;
              }
              throw error;
            }
          };
        }

        // Also check nested objects (e.g., window.analytics.enableButtonsClickedMetaDataLogging)
        const checkNestedObjects = (obj: any, path: string[] = []) => {
          if (!obj || typeof obj !== 'object') return;
          
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            const currentPath = [...path, key];
            
            if (key === methodName && typeof value === 'function') {
              const original = value;
              obj[key] = function(...args: any[]) {
                try {
                  return original.apply(this, args);
                } catch (error: any) {
                  if (handleError(error)) {
                    console.warn(`Patched nested WebView method "${currentPath.join('.')}" failed safely`);
                    return undefined;
                  }
                  throw error;
                }
              };
            } else if (typeof value === 'object' && value !== null && currentPath.length < 3) {
              // Recursively check nested objects (max depth 3 to avoid infinite loops)
              checkNestedObjects(value, currentPath);
            }
          });
        };

        checkNestedObjects(window);
      });
    };

    // Patch methods after a short delay to ensure they're loaded
    const timeoutId = setTimeout(patchProblematicMethods, 1000);

    // Additional error boundary for fetch/XHR requests that might trigger WebView errors
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      try {
        return await originalFetch(input, init);
      } catch (error: any) {
        if (handleError(error)) {
          // Return a rejected promise for WebView errors
          return Promise.reject(new Error(`WebView fetch error handled: ${error.message}`));
        }
        throw error;
      }
    };

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      window.fetch = originalFetch;
    };
  }, [isWebViewContext, handleError]);

  // Add some debug info to help with troubleshooting
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.debug('GlobalErrorHandler initialized', {
        isWebViewContext,
        userAgent: navigator.userAgent,
        hasAndroidObject: !!(window as any).Android,
        hasReactNativeWebView: !!(window as any).ReactNativeWebView,
        hasWebkitMessageHandlers: !!(window as any).webkit?.messageHandlers,
      });
    }
  }, [isWebViewContext]);

  return <>{children}</>;
}