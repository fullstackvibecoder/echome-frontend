/**
 * Network Resilience Utilities
 * 
 * Provides robust network error handling, retry logic, offline detection,
 * and user-friendly network error management for the EchoMe frontend.
 */

import { showErrorToast, showInfoToast, showSuccessToast } from './toast';

export interface NetworkRetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

export interface NetworkError {
  type: 'network' | 'timeout' | 'cors' | 'dns' | 'server' | 'unknown';
  originalError: any;
  message: string;
  userMessage: string;
  retryable: boolean;
  suggestions: string[];
}

/**
 * Default retry configuration for network requests
 */
export const DEFAULT_RETRY_CONFIG: NetworkRetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => isRetryableNetworkError(error),
};

/**
 * Check if an error is retryable
 */
export function isRetryableNetworkError(error: any): boolean {
  // Network connectivity issues
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return true;
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return true;
  }

  // DNS resolution errors
  if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
    return true;
  }

  // Connection refused/reset
  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
    return true;
  }

  // Server errors (5xx) are retryable
  if (error.response?.status >= 500) {
    return true;
  }

  // Rate limiting is retryable
  if (error.response?.status === 429) {
    return true;
  }

  return false;
}

/**
 * Classify network errors for better user messaging
 */
export function classifyNetworkError(error: any): NetworkError {
  const originalError = error;
  let type: NetworkError['type'] = 'unknown';
  let message = 'Unknown network error';
  let userMessage = 'An unexpected error occurred. Please try again.';
  let retryable = false;
  let suggestions: string[] = [];

  // Network connectivity issues
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    type = 'network';
    message = 'Network connectivity error';
    userMessage = 'Unable to connect to our servers. Please check your internet connection.';
    retryable = true;
    suggestions = [
      'Check your internet connection',
      'Try refreshing the page',
      'Disable VPN if using one',
      'Check if other websites are working',
    ];
  }

  // Timeout errors
  else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    type = 'timeout';
    message = 'Request timeout';
    userMessage = 'The request took too long to complete. This might be due to a slow connection.';
    retryable = true;
    suggestions = [
      'Check your internet speed',
      'Try again in a moment',
      'Use a more stable connection if possible',
    ];
  }

  // CORS errors
  else if (error.message?.includes('CORS') || error.message?.includes('Cross-Origin')) {
    type = 'cors';
    message = 'Cross-origin request blocked';
    userMessage = 'There was a configuration issue with our servers. Our team has been notified.';
    retryable = false;
    suggestions = [
      'Try refreshing the page',
      'Clear your browser cache',
      'Contact support if this continues',
    ];
  }

  // DNS resolution errors
  else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
    type = 'dns';
    message = 'DNS resolution failed';
    userMessage = 'Unable to reach our servers. This might be a temporary DNS issue.';
    retryable = true;
    suggestions = [
      'Check your internet connection',
      'Try using a different DNS server (8.8.8.8, 1.1.1.1)',
      'Try again in a few minutes',
      'Contact your ISP if this continues',
    ];
  }

  // Server errors
  else if (error.response?.status >= 500) {
    type = 'server';
    message = `Server error (${error.response.status})`;
    userMessage = 'Our servers are experiencing issues. We\'ve been notified and are working on a fix.';
    retryable = true;
    suggestions = [
      'Try again in a few minutes',
      'Check our status page',
      'Contact support if this continues',
    ];
  }

  // Connection refused/reset
  else if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
    type = 'network';
    message = 'Connection refused or reset';
    userMessage = 'Unable to establish a connection to our servers.';
    retryable = true;
    suggestions = [
      'Check your firewall settings',
      'Try disabling antivirus temporarily',
      'Check if you\'re behind a corporate proxy',
      'Try a different network if possible',
    ];
  }

  // Rate limiting
  else if (error.response?.status === 429) {
    type = 'server';
    message = 'Rate limit exceeded';
    userMessage = 'Too many requests. Please wait a moment before trying again.';
    retryable = true;
    suggestions = [
      'Wait a minute before trying again',
      'Avoid rapid repeated requests',
    ];
  }

  // Client errors (4xx) - not retryable
  else if (error.response?.status >= 400 && error.response?.status < 500) {
    type = 'server';
    message = `Client error (${error.response.status})`;
    userMessage = error.response.data?.message || 'There was an issue with the request.';
    retryable = false;
    suggestions = [
      'Try refreshing the page',
      'Log out and log back in',
      'Contact support if this continues',
    ];
  }

  return {
    type,
    originalError,
    message,
    userMessage,
    retryable,
    suggestions,
  };
}

/**
 * Retry a network request with exponential backoff
 */
export async function retryNetworkRequest<T>(
  requestFn: () => Promise<T>,
  config: Partial<NetworkRetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }
      
      // Check if error is retryable
      if (!finalConfig.retryCondition!(error)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const finalDelay = delay + jitter;
      
      console.log(`Network request failed (attempt ${attempt + 1}/${finalConfig.maxRetries + 1}), retrying in ${Math.round(finalDelay)}ms...`, error);
      
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
  
  throw lastError;
}

/**
 * Network connectivity monitor
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private isOnline: boolean = navigator.onLine;
  private listeners: Array<(online: boolean) => void> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  private constructor() {
    // Listen for browser online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Periodic connectivity check
    this.startConnectivityCheck();
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  private handleOnline = () => {
    if (!this.isOnline) {
      this.isOnline = true;
      this.reconnectAttempts = 0;
      showSuccessToast('Connection restored! 🎉', 3000);
      this.notifyListeners(true);
    }
  };

  private handleOffline = () => {
    if (this.isOnline) {
      this.isOnline = false;
      showErrorToast('Connection lost. Working in offline mode...', 5000);
      this.notifyListeners(false);
      this.attemptReconnect();
    }
  };

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(async () => {
      try {
        // Try to fetch a small resource to test connectivity
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        
        if (response.ok) {
          this.handleOnline();
        } else {
          this.attemptReconnect();
        }
      } catch {
        this.attemptReconnect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private startConnectivityCheck() {
    // Check connectivity every 30 seconds
    setInterval(async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        
        if (!response.ok && this.isOnline) {
          this.handleOffline();
        } else if (response.ok && !this.isOnline) {
          this.handleOnline();
        }
      } catch {
        if (this.isOnline) {
          this.handleOffline();
        }
      }
    }, 30000);
  }

  private notifyListeners(online: boolean) {
    this.listeners.forEach(listener => {
      try {
        listener(online);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  public addListener(listener: (online: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getStatus(): boolean {
    return this.isOnline;
  }
}

/**
 * Enhanced axios request wrapper with network resilience
 */
export async function resilientRequest<T>(
  requestFn: () => Promise<T>,
  options: {
    retryConfig?: Partial<NetworkRetryConfig>;
    showUserFeedback?: boolean;
    operation?: string;
    fallback?: () => T | Promise<T>;
  } = {}
): Promise<T> {
  const {
    retryConfig = {},
    showUserFeedback = true,
    operation = 'Request',
    fallback,
  } = options;

  try {
    return await retryNetworkRequest(requestFn, retryConfig);
  } catch (error) {
    const networkError = classifyNetworkError(error);
    
    console.error(`${operation} failed:`, {
      type: networkError.type,
      message: networkError.message,
      retryable: networkError.retryable,
      originalError: networkError.originalError,
    });

    if (showUserFeedback) {
      showErrorToast(networkError.userMessage, 8000);
    }

    // Try fallback if available
    if (fallback) {
      try {
        return await fallback();
      } catch (fallbackError) {
        console.error(`Fallback for ${operation} also failed:`, fallbackError);
      }
    }

    // Enhance error with network classification
    const enhancedError = new Error(networkError.userMessage);
    (enhancedError as any).networkError = networkError;
    (enhancedError as any).retryable = networkError.retryable;
    (enhancedError as any).suggestions = networkError.suggestions;
    
    throw enhancedError;
  }
}

/**
 * Circuit breaker implementation for failing endpoints
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private resetTimeout: number = 60000, // 1 minute
    private monitorWindow: number = 300000 // 5 minutes
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - endpoint is temporarily unavailable');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  private reset() {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

/**
 * React hook for network status
 */
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);

  useEffect(() => {
    const monitor = NetworkMonitor.getInstance();
    
    const unsubscribe = monitor.addListener((online) => {
      setIsOnline(online);
      if (!online) {
        setHasBeenOffline(true);
      }
    });

    // Set initial state
    setIsOnline(monitor.getStatus());

    return unsubscribe;
  }, []);

  const retry = async (requestFn: () => Promise<any>) => {
    if (!isOnline) {
      throw new Error('No internet connection available');
    }
    return resilientRequest(requestFn);
  };

  return {
    isOnline,
    hasBeenOffline,
    retry,
  };
}

/**
 * Request deduplication to prevent duplicate network calls
 */
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = requestFn()
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  clear(key?: string) {
    if (key) {
      this.pending.delete(key);
    } else {
      this.pending.clear();
    }
  }
}

export const requestDeduplicator = new RequestDeduplicator();