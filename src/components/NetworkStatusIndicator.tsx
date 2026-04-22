/**
 * Network Status Indicator
 *
 * Displays network connectivity status and provides user feedback
 * during network issues. Shows offline notifications, slow connection
 * warnings, and recovery status.
 */

'use client';

import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface NetworkStatusIndicatorProps {
  showWhenOnline?: boolean;
  position?: 'top' | 'bottom' | 'inline';
  className?: string;
}

export function NetworkStatusIndicator({
  showWhenOnline = false,
  position = 'top',
  className = '',
}: NetworkStatusIndicatorProps) {
  const {
    isOnline,
    isSlowConnection,
    isRecoveringFromOffline,
    retryAttempts,
    getStatusMessage,
    getConnectionQuality,
  } = useNetworkStatus();

  const [show, setShow] = useState(false);
  const [lastOnlineStatus, setLastOnlineStatus] = useState(isOnline);

  // Control visibility based on network status changes
  useEffect(() => {
    // Show immediately when going offline
    if (!isOnline) {
      setShow(true);
    }
    // Show briefly when coming back online
    else if (isOnline && !lastOnlineStatus) {
      setShow(true);
      // Hide after 3 seconds unless showWhenOnline is true
      if (!showWhenOnline) {
        setTimeout(() => setShow(false), 3000);
      }
    }
    // Show when slow connection is detected
    else if (isSlowConnection) {
      setShow(true);
      // Hide after 5 seconds for slow connection warnings
      setTimeout(() => setShow(false), 5000);
    }
    // Hide when everything is normal (unless showWhenOnline)
    else if (!showWhenOnline && !isRecoveringFromOffline) {
      setShow(false);
    }

    setLastOnlineStatus(isOnline);
  }, [isOnline, isSlowConnection, isRecoveringFromOffline, showWhenOnline, lastOnlineStatus]);

  if (!show && !showWhenOnline) {
    return null;
  }

  const quality = getConnectionQuality();
  const message = getStatusMessage();

  const getIndicatorStyle = () => {
    switch (quality) {
      case 'offline':
        return 'bg-red-500/90 text-white border-red-600';
      case 'poor':
        return 'bg-orange-500/90 text-white border-orange-600';
      case 'fair':
        return 'bg-yellow-500/90 text-white border-yellow-600';
      case 'good':
        return isRecoveringFromOffline 
          ? 'bg-green-500/90 text-white border-green-600'
          : 'bg-blue-500/90 text-white border-blue-600';
      default:
        return 'bg-gray-500/90 text-white border-gray-600';
    }
  };

  const getIcon = () => {
    switch (quality) {
      case 'offline':
        return '🔌';
      case 'poor':
        return '📶';
      case 'fair':
        return '📶';
      case 'good':
        return isRecoveringFromOffline ? '✅' : '🌐';
      default:
        return '🌐';
    }
  };

  const positionClasses = {
    top: 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
    bottom: 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
    inline: 'relative',
  };

  return (
    <div 
      className={`
        ${positionClasses[position]}
        ${getIndicatorStyle()}
        px-4 py-2 rounded-lg border shadow-lg transition-all duration-300
        ${show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        ${className}
      `}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>{getIcon()}</span>
        <span>{message}</span>
        
        {/* Show retry attempts if any */}
        {retryAttempts > 0 && (
          <span className="text-xs opacity-80">
            (Retry {retryAttempts})
          </span>
        )}
        
        {/* Loading indicator for recovery */}
        {isRecoveringFromOffline && (
          <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact network status badge for use in headers/footers
 */
export function NetworkStatusBadge({ className = '' }: { className?: string }) {
  const { isOnline, isSlowConnection, getConnectionQuality } = useNetworkStatus();

  const quality = getConnectionQuality();

  const getBadgeStyle = () => {
    switch (quality) {
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'poor':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'good':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSlowConnection) return 'Slow';
    return 'Online';
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getBadgeStyle()} ${className}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${quality === 'offline' ? 'bg-red-500' : quality === 'poor' ? 'bg-orange-500' : quality === 'fair' ? 'bg-yellow-500' : 'bg-green-500'}`} />
      {getStatusText()}
    </div>
  );
}

/**
 * Network error banner with retry options
 */
export function NetworkErrorBanner({
  error,
  onRetry,
  className = '',
}: {
  error: string;
  onRetry?: () => void;
  className?: string;
}) {
  const { isOnline, testConnectivity } = useNetworkStatus();
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    try {
      const connected = await testConnectivity();
      if (connected && onRetry) {
        onRetry();
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-red-400 text-xl">🌐</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Network Connection Issue
          </h3>
          <p className="text-sm text-red-700 mt-1">
            {error}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={testing}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Try Again'}
              </button>
            )}
            <button
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
          
          {/* Network troubleshooting tips */}
          <details className="mt-3">
            <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
              Network Troubleshooting Tips
            </summary>
            <div className="mt-2 text-xs text-red-600 space-y-1">
              <p>• Check your internet connection</p>
              <p>• Try switching between WiFi and cellular data</p>
              <p>• Restart your router or modem</p>
              <p>• Disable VPN if you're using one</p>
              <p>• Check if other websites work</p>
              <p>• Clear browser cache and cookies</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export default NetworkStatusIndicator;