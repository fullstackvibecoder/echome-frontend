/**
 * TimeoutManager Tests
 * 
 * Tests the timeout management system for long-running operations
 * with progressive timeout handling and user cancellation.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/111243862
 */

import { TimeoutManager, TimeoutConfigs, TimeoutError, OperationCancelledError } from '@/lib/timeout-manager';

// Mock timers
jest.useFakeTimers();

describe('TimeoutManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Clear any existing operations
    TimeoutManager.cancelAll();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Operation Execution', () => {
    test('should execute operation successfully within timeout', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 5000,
        maxTimeout: 10000,
        retryCount: 3,
        showProgress: false,
        userCancellable: true,
      };

      const promise = TimeoutManager.executeWithTimeout(
        'test-op',
        () => ({ promise: mockOperation() }),
        config
      );

      // Fast-forward past operation completion
      jest.advanceTimersByTime(1000);
      
      const result = await promise;
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    test('should handle operation timeout', async () => {
      const mockOperation = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 5000,
        maxTimeout: 10000,
        retryCount: 1,
        showProgress: false,
        userCancellable: true,
      };

      const promise = TimeoutManager.executeWithTimeout(
        'test-op',
        () => ({ promise: mockOperation() }),
        config
      );

      // Advance past timeout
      jest.advanceTimersByTime(6000);

      await expect(promise).rejects.toThrow(/timed out/);
    });

    test('should handle operation cancellation', async () => {
      const mockOperation = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 5000,
        maxTimeout: 10000,
        retryCount: 3,
        showProgress: false,
        userCancellable: true,
      };

      const promise = TimeoutManager.executeWithTimeout(
        'test-op',
        () => ({ promise: mockOperation() }),
        config
      );

      // Cancel operation after a short delay
      setTimeout(() => {
        TimeoutManager.cancel('test-op');
      }, 1000);

      jest.advanceTimersByTime(2000);

      await expect(promise).rejects.toThrow(/cancelled/);
    });
  });

  describe('Progressive Timeout and Retry Logic', () => {
    test('should increase timeout on retry', async () => {
      let attemptCount = 0;
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        return new Promise(() => {}); // Never resolves - will timeout
      });
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 2000,
        maxTimeout: 10000,
        retryCount: 3,
        showProgress: false,
        userCancellable: true,
      };

      const promise = TimeoutManager.executeWithTimeout(
        'test-op',
        () => ({ promise: mockOperation() }),
        config,
        undefined,
        () => true // Always retry
      );

      // First timeout at 2s
      jest.advanceTimersByTime(2100);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Second timeout at 3s (2s * 1.5)
      jest.advanceTimersByTime(3100);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Third timeout at 4.5s (3s * 1.5)
      jest.advanceTimersByTime(4600);

      await expect(promise).rejects.toThrow();
      expect(attemptCount).toBe(3);
    });

    test('should respect max timeout limit', async () => {
      const mockOperation = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 5000,
        maxTimeout: 6000, // Max timeout smaller than what would be calculated
        retryCount: 3,
        showProgress: false,
        userCancellable: true,
      };

      const promise = TimeoutManager.executeWithTimeout(
        'test-op',
        () => ({ promise: mockOperation() }),
        config,
        undefined,
        () => true // Always retry
      );

      // First timeout at 5s
      jest.advanceTimersByTime(5100);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Second timeout should be capped at 6s (max timeout)
      jest.advanceTimersByTime(6100);

      await expect(promise).rejects.toThrow();
    });

    test('should handle user declining retry', async () => {
      const mockOperation = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 2000,
        maxTimeout: 10000,
        retryCount: 3,
        showProgress: false,
        userCancellable: true,
      };

      const onTimeout = jest.fn()
        .mockReturnValueOnce(true)  // First retry - yes
        .mockReturnValueOnce(false); // Second retry - no

      const promise = TimeoutManager.executeWithTimeout(
        'test-op',
        () => ({ promise: mockOperation() }),
        config,
        undefined,
        onTimeout
      );

      // First timeout
      jest.advanceTimersByTime(2100);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Second timeout - user declines retry
      jest.advanceTimersByTime(3100);

      await expect(promise).rejects.toThrow(/user chose not to retry/);
      expect(onTimeout).toHaveBeenCalledTimes(2);
    });
  });

  describe('Progress Tracking', () => {
    test('should call progress callback with messages', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const onProgress = jest.fn();
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 10000,
        maxTimeout: 20000,
        retryCount: 1,
        showProgress: true,
        progressMessages: [
          'Step 1...',
          'Step 2...',
          'Step 3...',
          'Almost done...'
        ],
        userCancellable: true,
      };

      const promise = TimeoutManager.executeWithTimeout(
        'test-op',
        () => ({ promise: mockOperation() }),
        config,
        onProgress
      );

      // Advance time to trigger progress updates
      jest.advanceTimersByTime(2500); // Should trigger first progress message
      jest.advanceTimersByTime(2500); // Should trigger second progress message

      await promise;

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress.mock.calls.some(call => 
        call[0].includes('Step 1') || call[0].includes('Step 2')
      )).toBe(true);
    });

    test('should clean up progress interval on completion', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 10000,
        maxTimeout: 20000,
        retryCount: 1,
        showProgress: true,
        progressMessages: ['Working...'],
        userCancellable: true,
      };

      await TimeoutManager.executeWithTimeout(
        'test-op',
        () => ({ promise: mockOperation() }),
        config
      );

      // Verify no timers are running after completion
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Multiple Operations Management', () => {
    test('should track multiple concurrent operations', async () => {
      const mockOp1 = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      const mockOp2 = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 10000,
        maxTimeout: 20000,
        retryCount: 1,
        showProgress: false,
        userCancellable: true,
      };

      TimeoutManager.executeWithTimeout('op1', () => ({ promise: mockOp1() }), config);
      TimeoutManager.executeWithTimeout('op2', () => ({ promise: mockOp2() }), config);

      const runningOps = TimeoutManager.getRunningOperations();
      expect(runningOps).toContain('op1');
      expect(runningOps).toContain('op2');
      expect(TimeoutManager.isRunning('op1')).toBe(true);
      expect(TimeoutManager.isRunning('op2')).toBe(true);
    });

    test('should cancel specific operation', async () => {
      const mockOp1 = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      const mockOp2 = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 10000,
        maxTimeout: 20000,
        retryCount: 1,
        showProgress: false,
        userCancellable: true,
      };

      TimeoutManager.executeWithTimeout('op1', () => ({ promise: mockOp1() }), config);
      TimeoutManager.executeWithTimeout('op2', () => ({ promise: mockOp2() }), config);

      const cancelled = TimeoutManager.cancel('op1');
      
      expect(cancelled).toBe(true);
      expect(TimeoutManager.isRunning('op1')).toBe(false);
      expect(TimeoutManager.isRunning('op2')).toBe(true);
    });

    test('should cancel all operations', async () => {
      const mockOp1 = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      const mockOp2 = jest.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 10000,
        maxTimeout: 20000,
        retryCount: 1,
        showProgress: false,
        userCancellable: true,
      };

      TimeoutManager.executeWithTimeout('op1', () => ({ promise: mockOp1() }), config);
      TimeoutManager.executeWithTimeout('op2', () => ({ promise: mockOp2() }), config);

      TimeoutManager.cancelAll();
      
      expect(TimeoutManager.getRunningOperations()).toHaveLength(0);
      expect(TimeoutManager.isRunning('op1')).toBe(false);
      expect(TimeoutManager.isRunning('op2')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-timeout errors immediately', async () => {
      const testError = new Error('Network error');
      const mockOperation = jest.fn().mockRejectedValue(testError);
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 10000,
        maxTimeout: 20000,
        retryCount: 3,
        showProgress: false,
        userCancellable: true,
      };

      const promise = TimeoutManager.executeWithTimeout(
        'test-op',
        () => ({ promise: mockOperation() }),
        config
      );

      await expect(promise).rejects.toThrow('Network error');
      expect(mockOperation).toHaveBeenCalledTimes(1); // Should not retry non-timeout errors
    });

    test('should clean up on error', async () => {
      const testError = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(testError);
      
      const config = {
        operation: 'Test Operation',
        initialTimeout: 10000,
        maxTimeout: 20000,
        retryCount: 1,
        showProgress: false,
        userCancellable: true,
      };

      try {
        await TimeoutManager.executeWithTimeout(
          'test-op',
          () => ({ promise: mockOperation() }),
          config
        );
      } catch {
        // Expected to throw
      }

      expect(TimeoutManager.isRunning('test-op')).toBe(false);
    });
  });

  describe('Predefined Configurations', () => {
    test('should have reasonable timeout configs for different operations', () => {
      expect(TimeoutConfigs.CONTENT_GENERATION.initialTimeout).toBe(120000); // 2 minutes
      expect(TimeoutConfigs.CONTENT_GENERATION.maxTimeout).toBe(300000); // 5 minutes
      expect(TimeoutConfigs.CONTENT_GENERATION.retryCount).toBe(3);
      expect(TimeoutConfigs.CONTENT_GENERATION.userCancellable).toBe(true);
      expect(TimeoutConfigs.CONTENT_GENERATION.progressMessages).toBeDefined();

      expect(TimeoutConfigs.VIDEO_PROCESSING.initialTimeout).toBe(180000); // 3 minutes
      expect(TimeoutConfigs.VIDEO_PROCESSING.maxTimeout).toBe(600000); // 10 minutes

      expect(TimeoutConfigs.REEL_GENERATION.initialTimeout).toBe(240000); // 4 minutes
      expect(TimeoutConfigs.CAROUSEL_GENERATION.initialTimeout).toBe(90000); // 1.5 minutes
      expect(TimeoutConfigs.BROLL_EXTRACTION.initialTimeout).toBe(150000); // 2.5 minutes
    });
  });
});