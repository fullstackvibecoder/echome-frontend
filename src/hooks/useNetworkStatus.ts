/**
 * Network Status Hook
 *
 * Provides network connectivity detection and monitoring for better
 * user experience during network issues and automatic retry when
 * connectivity is restored.
 */

import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  lastOfflineTime: Date | null;
  isRecoveringFromOffline: boolean;
}

interface NetworkRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  connectivityCheck: () => Promise<boolean>;
}

const DEFAULT_RETRY_CONFIG: NetworkRetryConfig = {
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  connectivityCheck: async () => {
    try {
      // Try to fetch a small resource to verify connectivity
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: null,
    lastOfflineTime: null,
    isRecoveringFromOffline: false,
  });

  const [retryAttempts, setRetryAttempts] = useState(0);

  // Detect connection type and speed
  const detectConnectionInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      const isSlowConnection = connection.effectiveType === 'slow-2g' || 
                               connection.effectiveType === '2g' ||
                               connection.downlink < 0.5;

      setStatus(prev => ({
        ...prev,
        isSlowConnection,
        connectionType: connection.effectiveType || connection.type,
      }));
    }
  }, []);

  // Handle online event
  const handleOnline = useCallback(() => {
    console.log('Network: Connection restored');
    
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      isRecoveringFromOffline: !!prev.lastOfflineTime,
    }));

    // Clear recovery flag after a delay
    setTimeout(() => {
      setStatus(prev => ({ ...prev, isRecoveringFromOffline: false }));
    }, 3000);

    // Reset retry attempts on successful reconnection
    setRetryAttempts(0);
    
    // Re-detect connection info
    detectConnectionInfo();
  }, [detectConnectionInfo]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    console.warn('Network: Connection lost');
    
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      lastOfflineTime: new Date(),
      isRecoveringFromOffline: false,
    }));
  }, []);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection change events
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', detectConnectionInfo);
    }

    // Initial detection
    detectConnectionInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', detectConnectionInfo);
      }
    };
  }, [handleOnline, handleOffline, detectConnectionInfo]);

  // Network retry function with exponential backoff
  const retryWithNetworkCheck = useCallback(async <T>(
    operation: () => Promise<T>,
    config: Partial<NetworkRetryConfig> = {}
  ): Promise<T> => {
    const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let attempts = 0;

    while (attempts < fullConfig.maxRetries) {
      try {
        // Check basic connectivity first
        if (!navigator.onLine) {
          throw new Error('Device is offline');
        }

        // Try the operation
        const result = await operation();
        
        // Success - reset retry count
        setRetryAttempts(0);
        return result;
        
      } catch (error: any) {
        attempts++;
        setRetryAttempts(attempts);

        // If max retries reached, throw the error
        if (attempts >= fullConfig.maxRetries) {
          console.error(`Network retry failed after ${attempts} attempts:`, error);
          throw new Error(`Network operation failed after ${attempts} retries: ${error.message}`);
        }

        // Check if it's a network-related error
        const isNetworkError = error.message?.includes('Network Error') ||
                               error.message?.includes('ERR_NETWORK') ||
                               error.code === 'NETWORK_ERROR' ||
                               !navigator.onLine;

        if (!isNetworkError) {
          // Not a network error, don't retry
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          fullConfig.baseDelay * Math.pow(2, attempts - 1),
          fullConfig.maxDelay
        );

        console.log(`Network retry attempt ${attempts}/${fullConfig.maxRetries} after ${delay}ms`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));

        // Optional connectivity check before retry
        if (fullConfig.connectivityCheck) {
          try {
            const isConnected = await fullConfig.connectivityCheck();
            if (!isConnected) {
              console.warn('Connectivity check failed, continuing with retry anyway');
            }
          } catch {
            // Connectivity check failed, but continue with retry
          }
        }
      }
    }

    throw new Error('Network retry exceeded maximum attempts');
  }, []);

  // Test network connectivity
  const testConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  // Get user-friendly status message
  const getStatusMessage = useCallback((): string => {
    if (!status.isOnline) {
      return 'No internet connection. Please check your network settings.';
    }
    
    if (status.isRecoveringFromOffline) {
      return 'Connection restored! Retrying failed requests...';
    }
    
    if (status.isSlowConnection) {
      return 'Slow network detected. Some features may take longer to load.';
    }
    
    return 'Connected';
  }, [status]);

  // Get connection quality indicator
  const getConnectionQuality = useCallback((): 'good' | 'fair' | 'poor' | 'offline' => {
    if (!status.isOnline) return 'offline';
    
    if (status.isSlowConnection) return 'poor';
    
    if (status.connectionType === '3g' || status.connectionType === 'slow-2g') return 'fair';
    
    return 'good';
  }, [status]);

  return {
    ...status,
    retryAttempts,
    retryWithNetworkCheck,
    testConnectivity,
    getStatusMessage,
    getConnectionQuality,
  };
}

export default useNetworkStatus;