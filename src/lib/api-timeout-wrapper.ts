/**
 * API Timeout Wrapper
 * 
 * Wraps API client calls with enhanced timeout handling, progress tracking,
 * and user-friendly error management.
 */

import { api, apiClient } from './api-client';
import { TimeoutManager, TimeoutConfigs, TimeoutError, OperationCancelledError, withTimeout } from './timeout-manager';
import { showErrorToast, showInfoToast } from './toast';

export interface ApiTimeoutOptions {
  showProgress?: boolean;
  allowRetry?: boolean;
  onProgress?: (message: string, timeElapsed: number) => void;
  onTimeout?: (attempt: number, timeElapsed: number) => boolean;
  operationId?: string;
}

/**
 * Enhanced API wrapper with timeout management
 */
export class ApiTimeoutWrapper {
  /**
   * Wrap content generation with timeout handling
   */
  static async generateContent(
    input: Parameters<typeof api.generation.create>[0],
    options: ApiTimeoutOptions = {}
  ) {
    const operationId = options.operationId || `generation-${Date.now()}`;
    
    return TimeoutManager.executeWithTimeout(
      operationId,
      () => withTimeout(
        'Content Generation',
        () => api.generation.create(input),
        TimeoutConfigs.CONTENT_GENERATION
      ),
      TimeoutConfigs.CONTENT_GENERATION,
      options.onProgress || this.defaultProgressHandler,
      options.onTimeout || this.defaultTimeoutHandler
    );
  }

  /**
   * Wrap video processing with timeout handling
   */
  static async processVideo(
    uploadId: string,
    options: ApiTimeoutOptions = {}
  ) {
    const operationId = options.operationId || `video-${uploadId}`;
    
    return TimeoutManager.executeWithTimeout(
      operationId,
      () => withTimeout(
        'Video Processing',
        () => api.clips.get(uploadId),
        TimeoutConfigs.VIDEO_PROCESSING
      ),
      TimeoutConfigs.VIDEO_PROCESSING,
      options.onProgress || this.defaultProgressHandler,
      options.onTimeout || this.defaultTimeoutHandler
    );
  }

  /**
   * Wrap reel generation with timeout handling
   */
  static async generateReel(
    projectData: any,
    options: ApiTimeoutOptions = {}
  ) {
    const operationId = options.operationId || `reel-${Date.now()}`;
    
    return TimeoutManager.executeWithTimeout(
      operationId,
      () => withTimeout(
        'Reel Generation',
        () => api.reels.createProject(projectData),
        TimeoutConfigs.REEL_GENERATION
      ),
      TimeoutConfigs.REEL_GENERATION,
      options.onProgress || this.defaultProgressHandler,
      options.onTimeout || this.defaultTimeoutHandler
    );
  }

  /**
   * Wrap carousel generation with timeout handling
   */
  static async generateCarousel(
    kitId: string,
    aspectRatio: '1:1' | '9:16',
    options: ApiTimeoutOptions = {}
  ) {
    const operationId = options.operationId || `carousel-${kitId}`;
    
    return TimeoutManager.executeWithTimeout(
      operationId,
      () => withTimeout(
        'Carousel Generation',
        () => api.contentKits.resizeCarousel(kitId, aspectRatio),
        TimeoutConfigs.CAROUSEL_GENERATION
      ),
      TimeoutConfigs.CAROUSEL_GENERATION,
      options.onProgress || this.defaultProgressHandler,
      options.onTimeout || this.defaultTimeoutHandler
    );
  }

  /**
   * Wrap B-roll extraction with timeout handling
   */
  static async extractBRoll(
    uploadId: string,
    extractData: any,
    options: ApiTimeoutOptions = {}
  ) {
    const operationId = options.operationId || `broll-${uploadId}`;
    
    return TimeoutManager.executeWithTimeout(
      operationId,
      () => withTimeout(
        'B-Roll Extraction',
        () => api.clips.extractBRoll(uploadId, extractData),
        TimeoutConfigs.BROLL_EXTRACTION
      ),
      TimeoutConfigs.BROLL_EXTRACTION,
      options.onProgress || this.defaultProgressHandler,
      options.onTimeout || this.defaultTimeoutHandler
    );
  }

  /**
   * Wrap content kit regeneration with timeout handling
   */
  static async regenerateContentKit(
    kitId: string,
    regenerateOptions: any = {},
    options: ApiTimeoutOptions = {}
  ) {
    const operationId = options.operationId || `regenerate-${kitId}`;
    
    return TimeoutManager.executeWithTimeout(
      operationId,
      () => withTimeout(
        'Content Regeneration',
        () => api.contentKits.regenerate(kitId, regenerateOptions),
        TimeoutConfigs.CONTENT_GENERATION
      ),
      TimeoutConfigs.CONTENT_GENERATION,
      options.onProgress || this.defaultProgressHandler,
      options.onTimeout || this.defaultTimeoutHandler
    );
  }

  /**
   * Default progress handler with toast notifications
   */
  private static defaultProgressHandler = (message: string, timeElapsed: number) => {
    // Show progress updates every 30 seconds to avoid spam
    if (timeElapsed % 30000 < 2000) {
      showInfoToast(message, 3000);
    }
  };

  /**
   * Default timeout handler with user confirmation
   */
  private static defaultTimeoutHandler = (attempt: number, timeElapsed: number): boolean => {
    const minutes = Math.floor(timeElapsed / 60000);
    
    // Auto-retry first timeout
    if (attempt === 1) {
      showInfoToast(
        `Operation is taking longer than expected (${minutes}m). Retrying with extended timeout...`,
        5000
      );
      return true;
    }

    // Ask user for subsequent retries
    return confirm(
      `The operation has been running for ${minutes} minutes. Would you like to continue waiting? ` +
      `(Attempt ${attempt} of 3)`
    );
  };

  /**
   * Cancel a running operation
   */
  static cancel(operationId: string): boolean {
    return TimeoutManager.cancel(operationId);
  }

  /**
   * Check if an operation is running
   */
  static isRunning(operationId: string): boolean {
    return TimeoutManager.isRunning(operationId);
  }

  /**
   * Get all running operations
   */
  static getRunningOperations(): string[] {
    return TimeoutManager.getRunningOperations();
  }

  /**
   * Enhanced error handler for timeout-related errors
   */
  static handleError(error: any): never {
    if (error instanceof TimeoutError) {
      const minutes = Math.floor(error.timeElapsed / 60000);
      showErrorToast(
        `${error.operation} timed out after ${minutes} minutes. ` +
        `This might be due to high server load. Please try again later.`,
        8000
      );
      throw new Error(
        `${error.operation} timed out after ${minutes} minutes. Please try again later.`
      );
    }

    if (error instanceof OperationCancelledError) {
      showInfoToast(`${error.operation} was cancelled.`, 3000);
      throw new Error(`${error.operation} was cancelled by user`);
    }

    // Handle network timeout errors from axios
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const isLongTimeout = error.message?.includes('180000');
      if (isLongTimeout) {
        showErrorToast(
          'The operation is taking longer than expected due to high server load. ' +
          'Please try again in a few minutes or contact support if this continues.',
          10000
        );
        throw new Error(
          'Operation timed out due to high server load. Please try again later.'
        );
      } else {
        showErrorToast(
          'Request timed out. Please check your connection and try again.',
          5000
        );
        throw new Error('Request timed out. Please check your connection and try again.');
      }
    }

    // Handle other common errors with better messages
    if (error.response?.status >= 500) {
      showErrorToast(
        'Server error occurred. Our team has been notified. Please try again in a few minutes.',
        8000
      );
      throw new Error('Server error. Please try again in a few minutes.');
    }

    if (error.code === 'ERR_NETWORK') {
      showErrorToast(
        'Network connection error. Please check your internet connection.',
        5000
      );
      throw new Error('Network connection error. Please check your internet connection.');
    }

    // Re-throw original error if not handled
    throw error;
  }
}

/**
 * Helper function to wrap any API call with timeout handling
 */
export function withApiTimeout<T>(
  operationName: string,
  apiCall: () => Promise<T>,
  timeoutConfig = TimeoutConfigs.QUICK_GENERATION,
  options: ApiTimeoutOptions = {}
): Promise<T> {
  const operationId = options.operationId || `api-${Date.now()}`;

  return TimeoutManager.executeWithTimeout(
    operationId,
    () => withTimeout(operationName, apiCall, timeoutConfig),
    timeoutConfig,
    options.onProgress || ApiTimeoutWrapper['defaultProgressHandler'],
    options.onTimeout || ApiTimeoutWrapper['defaultTimeoutHandler']
  ).catch(ApiTimeoutWrapper.handleError);
}

/**
 * React hook for managing long-running operations with timeout handling
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseApiTimeoutState {
  isLoading: boolean;
  progress: string | null;
  timeElapsed: number;
  canCancel: boolean;
  error: string | null;
}

export function useApiTimeout(operationId?: string) {
  const [state, setState] = useState<UseApiTimeoutState>({
    isLoading: false,
    progress: null,
    timeElapsed: 0,
    canCancel: false,
    error: null,
  });

  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentOperationId = useRef<string | null>(null);

  const startOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    config = TimeoutConfigs.QUICK_GENERATION
  ): Promise<T> => {
    const opId = operationId || `operation-${Date.now()}`;
    currentOperationId.current = opId;
    startTimeRef.current = Date.now();

    setState({
      isLoading: true,
      progress: config.progressMessages?.[0] || 'Starting...',
      timeElapsed: 0,
      canCancel: config.userCancellable,
      error: null,
    });

    // Start elapsed time tracking
    intervalRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        timeElapsed: Date.now() - startTimeRef.current,
      }));
    }, 1000);

    try {
      const result = await TimeoutManager.executeWithTimeout(
        opId,
        () => withTimeout(config.operation, operation, config),
        config,
        (message, elapsed) => {
          setState(prev => ({
            ...prev,
            progress: message,
            timeElapsed: elapsed,
          }));
        },
        (attempt, elapsed) => {
          setState(prev => ({
            ...prev,
            progress: `Retrying... (attempt ${attempt})`,
            timeElapsed: elapsed,
          }));
          return true; // Auto-retry
        }
      );

      setState({
        isLoading: false,
        progress: null,
        timeElapsed: Date.now() - startTimeRef.current,
        canCancel: false,
        error: null,
      });

      return result;
    } catch (error: any) {
      setState({
        isLoading: false,
        progress: null,
        timeElapsed: Date.now() - startTimeRef.current,
        canCancel: false,
        error: error.message || 'Operation failed',
      });
      throw error;
    } finally {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      currentOperationId.current = null;
    }
  }, [operationId]);

  const cancel = useCallback(() => {
    if (currentOperationId.current) {
      const cancelled = TimeoutManager.cancel(currentOperationId.current);
      if (cancelled) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          progress: 'Cancelled',
          canCancel: false,
        }));
      }
      return cancelled;
    }
    return false;
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      progress: null,
      timeElapsed: 0,
      canCancel: false,
      error: null,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (currentOperationId.current) {
        TimeoutManager.cancel(currentOperationId.current);
      }
    };
  }, []);

  return {
    ...state,
    startOperation,
    cancel,
    reset,
  };
}