/**
 * Timeout Manager for Long-Running Operations
 * 
 * Provides progressive timeout handling, user feedback, and graceful degradation
 * for operations that may exceed normal timeout limits.
 */

export interface TimeoutConfig {
  operation: string;
  initialTimeout: number;
  maxTimeout: number;
  retryCount: number;
  showProgress: boolean;
  progressMessages?: string[];
  userCancellable: boolean;
}

export interface TimeoutOperation<T> {
  promise: Promise<T>;
  cancel?: () => void;
  progress?: (message: string) => void;
}

export class TimeoutManager {
  private static operations = new Map<string, AbortController>();

  /**
   * Execute an operation with progressive timeout handling
   */
  static async executeWithTimeout<T>(
    operationId: string,
    operation: () => TimeoutOperation<T>,
    config: TimeoutConfig,
    onProgress?: (message: string, timeElapsed: number) => void,
    onTimeout?: (attempt: number, timeElapsed: number) => boolean // Return true to retry
  ): Promise<T> {
    
    // Cancel any existing operation with the same ID
    if (this.operations.has(operationId)) {
      this.operations.get(operationId)!.abort();
    }

    const abortController = new AbortController();
    this.operations.set(operationId, abortController);

    const startTime = Date.now();
    let attempt = 0;
    let currentTimeout = config.initialTimeout;

    while (attempt < config.retryCount) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Operation timed out after ${currentTimeout}ms`));
          }, currentTimeout);
          
          abortController.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Operation cancelled by user'));
          });
        });

        const operationInstance = operation();
        
        // Set up progress tracking if enabled
        if (config.showProgress && config.progressMessages) {
          const progressInterval = setInterval(() => {
            if (abortController.signal.aborted) {
              clearInterval(progressInterval);
              return;
            }
            
            const elapsed = Date.now() - startTime;
            const messageIndex = Math.min(
              Math.floor(elapsed / (currentTimeout / config.progressMessages!.length)),
              config.progressMessages!.length - 1
            );
            
            const message = config.progressMessages![messageIndex];
            if (onProgress) {
              onProgress(message, elapsed);
            }
            if (operationInstance.progress) {
              operationInstance.progress(message);
            }
          }, 2000);

          abortController.signal.addEventListener('abort', () => {
            clearInterval(progressInterval);
          });
        }

        // Race between operation and timeout
        const result = await Promise.race([
          operationInstance.promise,
          timeoutPromise
        ]);

        // Success - cleanup and return
        this.operations.delete(operationId);
        return result;

      } catch (error: any) {
        const timeElapsed = Date.now() - startTime;
        
        // Check if operation was cancelled
        if (abortController.signal.aborted || error.message.includes('cancelled')) {
          this.operations.delete(operationId);
          throw new Error('Operation cancelled by user');
        }

        // Check if it's a timeout error and we should retry
        if (error.message.includes('timed out')) {
          attempt++;
          
          // Ask user if they want to retry
          if (onTimeout) {
            const shouldRetry = onTimeout(attempt, timeElapsed);
            if (!shouldRetry) {
              this.operations.delete(operationId);
              throw new Error(`Operation timed out after ${timeElapsed}ms (user chose not to retry)`);
            }
          } else if (attempt >= config.retryCount) {
            this.operations.delete(operationId);
            throw new Error(`Operation timed out after ${timeElapsed}ms (max retries exceeded)`);
          }

          // Increase timeout for retry (progressive timeout)
          currentTimeout = Math.min(currentTimeout * 1.5, config.maxTimeout);
          
          if (onProgress) {
            onProgress(`Retrying with extended timeout (attempt ${attempt + 1}/${config.retryCount})...`, timeElapsed);
          }
          
          continue;
        }

        // Non-timeout error - propagate immediately
        this.operations.delete(operationId);
        throw error;
      }
    }

    this.operations.delete(operationId);
    throw new Error(`Operation failed after ${config.retryCount} attempts`);
  }

  /**
   * Cancel a running operation
   */
  static cancel(operationId: string): boolean {
    const controller = this.operations.get(operationId);
    if (controller) {
      controller.abort();
      this.operations.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * Check if an operation is currently running
   */
  static isRunning(operationId: string): boolean {
    return this.operations.has(operationId);
  }

  /**
   * Get all running operations
   */
  static getRunningOperations(): string[] {
    return Array.from(this.operations.keys());
  }

  /**
   * Cancel all running operations
   */
  static cancelAll(): void {
    for (const [id, controller] of this.operations.entries()) {
      controller.abort();
    }
    this.operations.clear();
  }
}

/**
 * Predefined timeout configurations for common operations
 */
export const TimeoutConfigs = {
  CONTENT_GENERATION: {
    operation: 'Content Generation',
    initialTimeout: 120000, // 2 minutes
    maxTimeout: 300000, // 5 minutes
    retryCount: 3,
    showProgress: true,
    progressMessages: [
      'Analyzing your content...',
      'Generating platform-specific content...',
      'Adding final touches...',
      'Almost ready...'
    ],
    userCancellable: true,
  },
  
  VIDEO_PROCESSING: {
    operation: 'Video Processing',
    initialTimeout: 180000, // 3 minutes
    maxTimeout: 600000, // 10 minutes
    retryCount: 2,
    showProgress: true,
    progressMessages: [
      'Processing video...',
      'Extracting key moments...',
      'Generating clips...',
      'Finalizing content...'
    ],
    userCancellable: true,
  },
  
  REEL_GENERATION: {
    operation: 'Reel Generation',
    initialTimeout: 240000, // 4 minutes
    maxTimeout: 480000, // 8 minutes
    retryCount: 2,
    showProgress: true,
    progressMessages: [
      'Creating reel structure...',
      'Adding music and effects...',
      'Rendering video...',
      'Finalizing export...'
    ],
    userCancellable: true,
  },

  CAROUSEL_GENERATION: {
    operation: 'Carousel Generation',
    initialTimeout: 90000, // 1.5 minutes
    maxTimeout: 240000, // 4 minutes
    retryCount: 3,
    showProgress: true,
    progressMessages: [
      'Designing carousel slides...',
      'Adding content to slides...',
      'Optimizing for Instagram...',
      'Preparing download...'
    ],
    userCancellable: true,
  },

  BROLL_EXTRACTION: {
    operation: 'B-Roll Extraction',
    initialTimeout: 150000, // 2.5 minutes
    maxTimeout: 360000, // 6 minutes
    retryCount: 2,
    showProgress: true,
    progressMessages: [
      'Analyzing video content...',
      'Identifying B-roll moments...',
      'Extracting video clips...',
      'Processing final clips...'
    ],
    userCancellable: true,
  },

  TRANSCRIPTION: {
    operation: 'Transcription',
    initialTimeout: 120000, // 2 minutes
    maxTimeout: 300000, // 5 minutes
    retryCount: 2,
    showProgress: true,
    progressMessages: [
      'Processing audio...',
      'Transcribing speech...',
      'Cleaning up transcript...',
      'Finalizing results...'
    ],
    userCancellable: true,
  },

  QUICK_GENERATION: {
    operation: 'Quick Generation',
    initialTimeout: 60000, // 1 minute
    maxTimeout: 180000, // 3 minutes
    retryCount: 2,
    showProgress: false,
    userCancellable: true,
  },
} as const;

/**
 * Enhanced error types for better user experience
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly timeElapsed: number,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class OperationCancelledError extends Error {
  constructor(public readonly operation: string) {
    super(`${operation} was cancelled by user`);
    this.name = 'OperationCancelledError';
  }
}

/**
 * Helper function to create timeout-aware operation wrapper
 */
export function withTimeout<T>(
  operationName: string,
  operation: () => Promise<T>,
  config: TimeoutConfig,
  abortSignal?: AbortSignal
): TimeoutOperation<T> {
  let cancelled = false;
  
  const cancel = () => {
    cancelled = true;
  };

  const promise = new Promise<T>((resolve, reject) => {
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        cancelled = true;
        reject(new OperationCancelledError(operationName));
      });
    }

    operation()
      .then((result) => {
        if (!cancelled) {
          resolve(result);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          reject(error);
        }
      });
  });

  return { promise, cancel };
}