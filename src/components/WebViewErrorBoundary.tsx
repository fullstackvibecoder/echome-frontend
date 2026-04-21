'use client';

/**
 * WebView Error Boundary
 *
 * Handles JavaScript-to-Java bridge errors and other WebView-specific issues
 * that can occur when the app runs in mobile WebView contexts.
 * 
 * Specifically handles the "Java object is gone" error from enableButtonsClickedMetaDataLogging
 * and similar native bridge integration failures.
 */

import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class WebViewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a WebView/Java bridge related error
    const isWebViewError = error.message?.includes('Java object is gone') ||
                          error.message?.includes('enableButtonsClickedMetaDataLogging') ||
                          error.message?.includes('Java object') ||
                          error.message?.includes('native bridge') ||
                          error.message?.includes('Android');

    if (isWebViewError) {
      console.warn('WebView integration error detected:', error.message);
      // For WebView errors, we'll just log and continue
      return { hasError: false };
    }

    // For non-WebView errors, let them bubble up normally
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Check if this is a WebView/Java bridge related error
    const isWebViewError = error.message?.includes('Java object is gone') ||
                          error.message?.includes('enableButtonsClickedMetaDataLogging') ||
                          error.message?.includes('Java object') ||
                          error.message?.includes('native bridge') ||
                          error.message?.includes('Android');

    if (isWebViewError) {
      console.warn('WebView error caught by boundary:', {
        error: error.message,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
      
      // Don't report WebView errors to Sentry - they're not actionable
      // Just log locally for debugging
      return;
    }

    // For non-WebView errors, log normally
    console.error('Error caught by WebViewErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Show fallback UI for non-WebView errors
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-red-800 font-medium">Something went wrong</h2>
          <p className="text-red-600 mt-1">
            Please refresh the page or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WebViewErrorBoundary;