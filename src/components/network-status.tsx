/**
 * Network Status Components
 * 
 * Provides user feedback for network connectivity issues, offline state,
 * and recovery actions.
 */

'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useNetworkStatus } from '@/lib/network-resilience';

interface NetworkStatusBannerProps {
  className?: string;
  showWhenOnline?: boolean;
}

export function NetworkStatusBanner({ 
  className = '',
  showWhenOnline = false 
}: NetworkStatusBannerProps) {
  const { isOnline, hasBeenOffline } = useNetworkStatus();
  const [showRecoveryMessage, setShowRecoveryMessage] = useState(false);

  useEffect(() => {
    if (isOnline && hasBeenOffline) {
      setShowRecoveryMessage(true);
      // Hide recovery message after 3 seconds
      const timer = setTimeout(() => setShowRecoveryMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, hasBeenOffline]);

  // Don't show banner when online unless specified
  if (isOnline && !showWhenOnline && !showRecoveryMessage) {
    return null;
  }

  return (
    <div className={`transition-all duration-300 ${className}`}>
      {!isOnline && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
          <div className="flex items-center">
            <WifiOff className="w-5 h-5 text-red-400 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Connection Lost
              </h3>
              <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                <p>
                  You're currently offline. Some features may not work properly until your connection is restored.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecoveryMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                Connection Restored
              </h3>
              <div className="mt-1 text-sm text-green-700 dark:text-green-300">
                <p>You're back online! All features are now available.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NetworkErrorDisplayProps {
  error: any;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function NetworkErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss,
  className = '' 
}: NetworkErrorDisplayProps) {
  const networkError = error?.networkError;
  const isNetworkRelated = error?.retryable || 
    error?.code === 'ERR_NETWORK' || 
    error?.message?.includes('Network') ||
    error?.message?.includes('timeout');

  if (!isNetworkRelated && !networkError) {
    return null;
  }

  const errorType = networkError?.type || 'network';
  const userMessage = networkError?.userMessage || error?.message || 'Network error occurred';
  const suggestions = networkError?.suggestions || [];

  const getIcon = () => {
    switch (errorType) {
      case 'network':
        return <WifiOff className="w-6 h-6 text-red-500" />;
      case 'timeout':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'dns':
        return <WifiOff className="w-6 h-6 text-orange-500" />;
      case 'server':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-gray-500" />;
    }
  };

  const getTitle = () => {
    switch (errorType) {
      case 'network':
        return 'Connection Problem';
      case 'timeout':
        return 'Request Timeout';
      case 'dns':
        return 'DNS Resolution Error';
      case 'server':
        return 'Server Error';
      default:
        return 'Network Error';
    }
  };

  const getBgColor = () => {
    switch (errorType) {
      case 'timeout':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'dns':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    }
  };

  return (
    <div className={`rounded-xl border p-6 ${getBgColor()} ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {getTitle()}
          </h3>
          
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {userMessage}
          </p>

          {suggestions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Try these solutions:
              </h4>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex space-x-3">
            {onRetry && (networkError?.retryable !== false) && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ConnectionIndicatorProps {
  className?: string;
  showText?: boolean;
}

export function ConnectionIndicator({ 
  className = '',
  showText = true 
}: ConnectionIndicatorProps) {
  const { isOnline } = useNetworkStatus();

  return (
    <div className={`flex items-center ${className}`}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          {showText && (
            <span className="ml-2 text-sm text-green-600 dark:text-green-400">
              Online
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          {showText && (
            <span className="ml-2 text-sm text-red-600 dark:text-red-400">
              Offline
            </span>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Hook for handling network-aware operations
 */
export function useNetworkAwareOperation() {
  const { isOnline, retry } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  const executeOperation = async <T>(
    operation: () => Promise<T>,
    options: {
      showOfflineMessage?: boolean;
      fallback?: () => T | Promise<T>;
    } = {}
  ): Promise<T> => {
    const { showOfflineMessage = true, fallback } = options;

    if (!isOnline) {
      if (showOfflineMessage) {
        throw new Error('This operation requires an internet connection. Please check your connection and try again.');
      }
      
      if (fallback) {
        return await fallback();
      }
      
      throw new Error('No internet connection available');
    }

    try {
      setIsRetrying(false);
      return await retry(operation);
    } catch (error: any) {
      if (error?.retryable) {
        setIsRetrying(true);
        try {
          return await retry(operation);
        } finally {
          setIsRetrying(false);
        }
      }
      throw error;
    }
  };

  return {
    isOnline,
    isRetrying,
    executeOperation,
  };
}

/**
 * Inline network status for forms and interactive elements
 */
interface InlineNetworkStatusProps {
  when?: 'offline' | 'online' | 'always';
  className?: string;
}

export function InlineNetworkStatus({ 
  when = 'offline',
  className = '' 
}: InlineNetworkStatusProps) {
  const { isOnline } = useNetworkStatus();

  const shouldShow = when === 'always' || 
    (when === 'offline' && !isOnline) || 
    (when === 'online' && isOnline);

  if (!shouldShow) return null;

  return (
    <div className={`inline-flex items-center text-sm ${className}`}>
      {isOnline ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
          <span className="text-green-600 dark:text-green-400">Connected</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
          <span className="text-red-600 dark:text-red-400">No connection</span>
        </>
      )}
    </div>
  );
}