'use client';

/**
 * WebView Error Handler Hook
 *
 * Provides global error handling for WebView integration issues,
 * particularly JavaScript-to-Java bridge errors like "Java object is gone"
 * from methods like enableButtonsClickedMetaDataLogging.
 */

import { useEffect } from 'react';

interface WebViewErrorHandler {
  isWebViewContext: boolean;
  handleError: (error: Error) => boolean;
}

const WEBVIEW_ERROR_PATTERNS = [
  'Java object is gone',
  'enableButtonsClickedMetaDataLogging',
  'Java object',
  'native bridge',
  'Android',
  'WebView',
  'bridge method',
  'native method',
];

const isWebViewError = (error: Error | string): boolean => {
  const message = typeof error === 'string' ? error : error.message || '';
  return WEBVIEW_ERROR_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
};

const detectWebViewContext = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Detect common WebView contexts
  return (
    // Android WebView
    userAgent.includes('wv') ||
    userAgent.includes('webview') ||
    
    // iOS WebView  
    (userAgent.includes('mobile') && !userAgent.includes('safari')) ||
    
    // Cordova/PhoneGap
    !!(window as any).cordova ||
    
    // React Native WebView
    !!(window as any).ReactNativeWebView ||
    
    // Other hybrid app indicators
    !!(window as any).webkit?.messageHandlers ||
    !!(window as any).Android
  );
};

export function useWebViewErrorHandler(): WebViewErrorHandler {
  const isWebViewContext = detectWebViewContext();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Global error handler for unhandled errors
    const handleGlobalError = (event: ErrorEvent): boolean => {
      if (event.error && isWebViewError(event.error)) {
        console.warn('WebView error intercepted:', {
          message: event.error.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        });
        
        // Prevent the error from bubbling up and being reported to Sentry
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      
      // Let non-WebView errors proceed normally
      return true;
    };

    // Global promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent): boolean => {
      const reason = event.reason;
      const errorMessage = reason?.message || String(reason);
      
      if (isWebViewError(errorMessage)) {
        console.warn('WebView promise rejection intercepted:', {
          reason: errorMessage,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        });
        
        // Prevent the rejection from being reported
        event.preventDefault();
        return false;
      }
      
      // Let non-WebView rejections proceed normally
      return true;
    };

    // Monkey-patch console.error to catch WebView errors
    const originalConsoleError = console.error;
    const patchedConsoleError = (...args: any[]) => {
      const errorMessage = args.join(' ');
      
      if (isWebViewError(errorMessage)) {
        console.warn('WebView error detected in console.error:', errorMessage);
        // Still log it but don't let it propagate to error reporting
        return;
      }
      
      // Call original console.error for non-WebView errors
      originalConsoleError.apply(console, args);
    };

    // Add event listeners
    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    console.error = patchedConsoleError;

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      console.error = originalConsoleError;
    };
  }, []);

  const handleError = (error: Error): boolean => {
    if (isWebViewError(error)) {
      console.warn('WebView error handled:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        isWebViewContext,
      });
      return true; // Handled
    }
    return false; // Not handled
  };

  return {
    isWebViewContext,
    handleError,
  };
}

/**
 * Safe wrapper for potentially problematic native method calls
 */
export function safeNativeCall<T>(
  methodName: string,
  fn: () => T,
  fallback?: T
): T | undefined {
  try {
    return fn();
  } catch (error: any) {
    if (isWebViewError(error)) {
      console.warn(`WebView method "${methodName}" failed safely:`, error.message);
      return fallback;
    }
    
    // Re-throw non-WebView errors
    throw error;
  }
}

/**
 * Check if a native method is available before calling
 */
export function isNativeMethodAvailable(path: string): boolean {
  try {
    const parts = path.split('.');
    let obj: any = window;
    
    for (const part of parts) {
      if (!obj || typeof obj[part] === 'undefined') {
        return false;
      }
      obj = obj[part];
    }
    
    return typeof obj === 'function';
  } catch {
    return false;
  }
}

export default useWebViewErrorHandler;