/**
 * Error Handler Utilities
 *
 * Provides centralized error handling logic for API responses,
 * particularly for server errors (500) and other common error scenarios.
 */

interface ApiError {
  status?: number;
  message?: string;
  code?: string;
  response?: {
    status?: number;
    data?: {
      error?: string;
      message?: string;
      details?: string;
    };
  };
}

interface ErrorHandlerResult {
  userMessage: string;
  shouldRetry: boolean;
  retryDelay?: number;
  errorType: 'server' | 'network' | 'timeout' | 'auth' | 'notFound' | 'forbidden' | 'client' | 'unknown';
  logLevel: 'error' | 'warn' | 'info';
}

/**
 * Analyze and categorize errors to provide appropriate user feedback
 */
export function analyzeError(error: any): ErrorHandlerResult {
  const isAxiosError = error?.response || error?.code === 'ECONNABORTED';
  const statusCode = error?.response?.status || error?.status;
  const errorMessage = error?.response?.data?.error || 
                       error?.response?.data?.message || 
                       error?.message || 
                       String(error);

  // Server errors (500-599)
  if (statusCode >= 500 && statusCode < 600) {
    return {
      userMessage: 
        'Server is currently experiencing issues. This could be due to high server load ' +
        'or temporary backend problems. Please try again in a moment.',
      shouldRetry: true,
      retryDelay: Math.min(1000 * Math.pow(2, 0), 5000), // Start with 1 second
      errorType: 'server',
      logLevel: 'warn',
    };
  }

  // Authentication errors (401)
  if (statusCode === 401) {
    return {
      userMessage: 
        'Your session has expired. Please log in again to access your content.',
      shouldRetry: false,
      errorType: 'auth',
      logLevel: 'info',
    };
  }

  // Permission errors (403)
  if (statusCode === 403) {
    return {
      userMessage: 
        'You do not have permission to access this content. Please make sure you are ' +
        'logged in with the correct account.',
      shouldRetry: false,
      errorType: 'forbidden',
      logLevel: 'info',
    };
  }

  // Not found errors (404)
  if (statusCode === 404) {
    return {
      userMessage: 
        'The requested content was not found. It may have been deleted or the link is incorrect.',
      shouldRetry: false,
      errorType: 'notFound',
      logLevel: 'info',
    };
  }

  // Client errors (400-499, excluding handled ones above)
  if (statusCode >= 400 && statusCode < 500) {
    return {
      userMessage: 
        `Request failed: ${errorMessage}. Please check your input and try again.`,
      shouldRetry: false,
      errorType: 'client',
      logLevel: 'warn',
    };
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || error?.code === 'ECONNABORTED') {
    return {
      userMessage: 
        'The request is taking longer than expected. This usually happens during ' +
        'high server load. Please try refreshing the page or check your internet connection.',
      shouldRetry: true,
      retryDelay: 2000,
      errorType: 'timeout',
      logLevel: 'warn',
    };
  }

  // Network errors - enhanced detection and categorization
  if (errorMessage.includes('Network Error') || 
      errorMessage.includes('ERR_NETWORK') || 
      errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
      errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
      errorMessage.includes('ERR_CONNECTION_REFUSED') ||
      errorMessage.includes('ERR_CONNECTION_TIMED_OUT') ||
      errorMessage.includes('NETWORK_ERROR') ||
      error?.code === 'NETWORK_ERROR' ||
      !navigator.onLine) {
    
    // Detect specific network issues for better user guidance
    const isOffline = !navigator.onLine;
    const isDNSIssue = errorMessage.includes('ERR_NAME_NOT_RESOLVED') || errorMessage.includes('DNS');
    const isConnectionRefused = errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('refused');
    const isConnectionTimeout = errorMessage.includes('ERR_CONNECTION_TIMED_OUT') || errorMessage.includes('timed out');
    
    let specificGuidance = 'Please check your internet connection and try again.';
    let retryDelay = 3000;
    
    if (isOffline) {
      specificGuidance = 'You appear to be offline. Please check your internet connection.';
      retryDelay = 5000; // Longer delay for offline scenarios
    } else if (isDNSIssue) {
      specificGuidance = 'DNS resolution failed. Try switching to a different network or DNS server (like 8.8.8.8).';
      retryDelay = 4000;
    } else if (isConnectionRefused) {
      specificGuidance = 'Connection was refused by the server. The service may be temporarily unavailable.';
      retryDelay = 6000; // Longer delay for server unavailability
    } else if (isConnectionTimeout) {
      specificGuidance = 'Connection timed out. Your network may be slow or the server may be overloaded.';
      retryDelay = 4000;
    }
    
    return {
      userMessage: 
        `Unable to connect to the server. ${specificGuidance} ` +
        'If the problem persists after trying again, our servers may be temporarily unavailable.',
      shouldRetry: true,
      retryDelay,
      errorType: 'network',
      logLevel: 'warn',
    };
  }

  // Unknown errors
  return {
    userMessage: 
      `An unexpected error occurred: ${errorMessage}. ` +
      'If this error persists, please try refreshing the page or contact support.',
    shouldRetry: false,
    errorType: 'unknown',
    logLevel: 'error',
  };
}

/**
 * Handle API errors with automatic retry logic
 */
export class ApiErrorHandler {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(maxRetries = 3) {
    this.maxRetries = maxRetries;
  }

  /**
   * Process an error and determine if retry should happen
   */
  async handleError(
    error: any,
    retryFn?: () => Promise<any>
  ): Promise<{ shouldThrow: boolean; result?: any; errorMessage?: string }> {
    const analysis = analyzeError(error);
    
    // Log based on severity
    if (analysis.logLevel === 'error') {
      console.error('API Error:', error);
    } else if (analysis.logLevel === 'warn') {
      console.warn('API Warning:', error);
    } else {
      console.info('API Info:', error);
    }

    // Check if we should retry
    if (analysis.shouldRetry && this.retryCount < this.maxRetries && retryFn) {
      this.retryCount++;
      const delay = analysis.retryDelay || 1000 * Math.pow(2, this.retryCount - 1);
      
      console.log(`Retrying API call (attempt ${this.retryCount}/${this.maxRetries}) after ${delay}ms`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, delay));
        const result = await retryFn();
        this.reset(); // Reset retry count on success
        return { shouldThrow: false, result };
      } catch (retryError) {
        // If max retries reached, fall through to return error
        if (this.retryCount >= this.maxRetries) {
          const finalAnalysis = analyzeError(retryError);
          return { 
            shouldThrow: true, 
            errorMessage: `${finalAnalysis.userMessage} (Failed after ${this.maxRetries} retries)` 
          };
        }
        
        // Recurse for another retry attempt
        return this.handleError(retryError, retryFn);
      }
    }

    // No retry needed or max retries exceeded
    return { shouldThrow: true, errorMessage: analysis.userMessage };
  }

  /**
   * Reset retry count (call on success or manual refresh)
   */
  reset(): void {
    this.retryCount = 0;
  }

  /**
   * Get current retry status
   */
  getRetryStatus(): { count: number; max: number; canRetry: boolean } {
    return {
      count: this.retryCount,
      max: this.maxRetries,
      canRetry: this.retryCount < this.maxRetries,
    };
  }
}

/**
 * Create user-friendly error messages for different error types
 */
export function createErrorMessage(error: any, context?: string): string {
  const analysis = analyzeError(error);
  const contextPrefix = context ? `${context}: ` : '';
  
  return `${contextPrefix}${analysis.userMessage}`;
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  const analysis = analyzeError(error);
  return analysis.shouldRetry;
}

/**
 * Get appropriate retry delay for an error
 */
export function getRetryDelay(error: any, attemptNumber = 1): number {
  const analysis = analyzeError(error);
  
  if (analysis.retryDelay) {
    return analysis.retryDelay;
  }
  
  // Exponential backoff with jitter
  const baseDelay = 1000 * Math.pow(2, attemptNumber - 1);
  const jitter = Math.random() * 500; // Add up to 500ms jitter
  return Math.min(baseDelay + jitter, 10000); // Max 10 seconds
}

/**
 * Enhanced error boundary for React components
 */
export function createErrorBoundaryMessage(error: Error, errorInfo: any): string {
  const isApiError = error.message.includes('Request failed') || 
                     error.message.includes('500') ||
                     error.message.includes('Network Error');

  if (isApiError) {
    return 'A server error occurred while loading this content. Please try refreshing the page.';
  }

  return 'An unexpected error occurred. Please try refreshing the page or contact support.';
}

export default {
  analyzeError,
  ApiErrorHandler,
  createErrorMessage,
  isRetryableError,
  getRetryDelay,
  createErrorBoundaryMessage,
};