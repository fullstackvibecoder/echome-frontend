/**
 * Network Resilience Tests
 * 
 * Tests the network error handling, retry logic, offline detection,
 * and user experience during network issues.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/111260913
 */

import {
  classifyNetworkError,
  isRetryableNetworkError,
  retryNetworkRequest,
  resilientRequest,
  DEFAULT_RETRY_CONFIG,
  NetworkMonitor,
  CircuitBreaker,
} from '@/lib/network-resilience';

// Mock fetch for network monitoring tests
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window event listeners
const eventListeners: Record<string, Function[]> = {};
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn((event: string, handler: Function) => {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(handler);
  }),
});

// Helper to trigger window events
const triggerWindowEvent = (event: string) => {
  if (eventListeners[event]) {
    eventListeners[event].forEach(handler => handler());
  }
};

describe('Network Error Classification', () => {
  test('should classify network connectivity errors', () => {
    const error = { code: 'ERR_NETWORK', message: 'Network Error' };
    const result = classifyNetworkError(error);

    expect(result.type).toBe('network');
    expect(result.retryable).toBe(true);
    expect(result.userMessage).toContain('check your internet connection');
    expect(result.suggestions).toContain('Check your internet connection');
  });

  test('should classify timeout errors', () => {
    const error = { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' };
    const result = classifyNetworkError(error);

    expect(result.type).toBe('timeout');
    expect(result.retryable).toBe(true);
    expect(result.userMessage).toContain('took too long');
    expect(result.suggestions).toContain('Check your internet speed');
  });

  test('should classify DNS resolution errors', () => {
    const error = { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND api.example.com' };
    const result = classifyNetworkError(error);

    expect(result.type).toBe('dns');
    expect(result.retryable).toBe(true);
    expect(result.userMessage).toContain('DNS issue');
    expect(result.suggestions).toContain('Try using a different DNS server');
  });

  test('should classify server errors as retryable', () => {
    const error = { response: { status: 500 }, message: 'Internal Server Error' };
    const result = classifyNetworkError(error);

    expect(result.type).toBe('server');
    expect(result.retryable).toBe(true);
    expect(result.userMessage).toContain('servers are experiencing issues');
  });

  test('should classify client errors as non-retryable', () => {
    const error = { response: { status: 404 }, message: 'Not Found' };
    const result = classifyNetworkError(error);

    expect(result.type).toBe('server');
    expect(result.retryable).toBe(false);
    expect(result.suggestions).toContain('Try refreshing the page');
  });

  test('should classify CORS errors', () => {
    const error = { message: 'CORS policy: Cross-Origin Request Blocked' };
    const result = classifyNetworkError(error);

    expect(result.type).toBe('cors');
    expect(result.retryable).toBe(false);
    expect(result.userMessage).toContain('configuration issue');
  });

  test('should classify rate limiting errors', () => {
    const error = { response: { status: 429 }, message: 'Too Many Requests' };
    const result = classifyNetworkError(error);

    expect(result.type).toBe('server');
    expect(result.retryable).toBe(true);
    expect(result.userMessage).toContain('Too many requests');
  });
});

describe('Retry Logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should retry retryable network errors', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce({ code: 'ERR_NETWORK' })
      .mockRejectedValueOnce({ code: 'ERR_NETWORK' })
      .mockResolvedValueOnce('success');

    const promise = retryNetworkRequest(mockFn);

    // Fast-forward through the retry delays
    jest.advanceTimersByTime(1000);
    await Promise.resolve(); // Allow first retry
    
    jest.advanceTimersByTime(2000);
    await Promise.resolve(); // Allow second retry

    const result = await promise;
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  test('should not retry non-retryable errors', async () => {
    const mockFn = jest.fn().mockRejectedValue({ response: { status: 404 } });

    await expect(retryNetworkRequest(mockFn)).rejects.toThrow();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('should respect max retry limit', async () => {
    const mockFn = jest.fn().mockRejectedValue({ code: 'ERR_NETWORK' });

    const config = { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 };
    const promise = retryNetworkRequest(mockFn, config);

    // Fast-forward through all retries
    jest.advanceTimersByTime(10000);

    await expect(promise).rejects.toThrow();
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  test('should use exponential backoff with jitter', async () => {
    const mockFn = jest.fn().mockRejectedValue({ code: 'ERR_NETWORK' });
    const delays: number[] = [];

    // Override setTimeout to capture delays
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = jest.fn((fn, delay) => {
      delays.push(delay);
      return originalSetTimeout(fn, 0); // Execute immediately for test
    });

    try {
      await retryNetworkRequest(mockFn, { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 });
    } catch {
      // Expected to fail
    }

    global.setTimeout = originalSetTimeout;

    expect(delays).toHaveLength(2);
    expect(delays[0]).toBeGreaterThan(900); // ~1000ms + jitter
    expect(delays[0]).toBeLessThan(1100);
    expect(delays[1]).toBeGreaterThan(1900); // ~2000ms + jitter
    expect(delays[1]).toBeLessThan(2100);
  });

  test('should respect custom retry condition', async () => {
    const mockFn = jest.fn().mockRejectedValue({ code: 'ERR_NETWORK' });
    const customRetryCondition = jest.fn().mockReturnValue(false);

    const config = {
      ...DEFAULT_RETRY_CONFIG,
      retryCondition: customRetryCondition,
    };

    await expect(retryNetworkRequest(mockFn, config)).rejects.toThrow();
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(customRetryCondition).toHaveBeenCalledWith({ code: 'ERR_NETWORK' });
  });
});

describe('Resilient Request Wrapper', () => {
  test('should handle successful requests', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');

    const result = await resilientRequest(mockFn, { showUserFeedback: false });
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('should use fallback on network error', async () => {
    const mockFn = jest.fn().mockRejectedValue({ code: 'ERR_NETWORK' });
    const fallback = jest.fn().mockResolvedValue('fallback-result');

    const result = await resilientRequest(mockFn, {
      showUserFeedback: false,
      fallback,
    });

    expect(result).toBe('fallback-result');
    expect(fallback).toHaveBeenCalled();
  });

  test('should enhance error with network classification', async () => {
    const mockFn = jest.fn().mockRejectedValue({ code: 'ERR_NETWORK' });

    try {
      await resilientRequest(mockFn, { showUserFeedback: false });
      fail('Should have thrown');
    } catch (error: any) {
      expect(error.networkError).toBeDefined();
      expect(error.retryable).toBe(true);
      expect(error.suggestions).toBeDefined();
    }
  });
});

describe('Network Monitor', () => {
  let monitor: NetworkMonitor;

  beforeEach(() => {
    // Reset singleton
    (NetworkMonitor as any).instance = undefined;
    monitor = NetworkMonitor.getInstance();
    jest.clearAllMocks();
  });

  test('should be a singleton', () => {
    const monitor2 = NetworkMonitor.getInstance();
    expect(monitor).toBe(monitor2);
  });

  test('should track online status changes', () => {
    const listener = jest.fn();
    monitor.addListener(listener);

    // Simulate going offline
    (navigator as any).onLine = false;
    triggerWindowEvent('offline');

    expect(listener).toHaveBeenCalledWith(false);
    expect(monitor.getStatus()).toBe(false);
  });

  test('should track online recovery', () => {
    const listener = jest.fn();
    monitor.addListener(listener);

    // Start offline
    (navigator as any).onLine = false;
    triggerWindowEvent('offline');

    // Go back online
    (navigator as any).onLine = true;
    triggerWindowEvent('online');

    expect(listener).toHaveBeenCalledWith(true);
    expect(monitor.getStatus()).toBe(true);
  });

  test('should allow unsubscribing listeners', () => {
    const listener = jest.fn();
    const unsubscribe = monitor.addListener(listener);

    unsubscribe();

    triggerWindowEvent('offline');
    expect(listener).not.toHaveBeenCalled();
  });

  test('should attempt reconnection when offline', async () => {
    jest.useFakeTimers();
    mockFetch.mockResolvedValue({ ok: true } as Response);

    // Go offline
    (navigator as any).onLine = false;
    triggerWindowEvent('offline');

    // Fast-forward to trigger reconnection attempt
    jest.advanceTimersByTime(2000);

    expect(mockFetch).toHaveBeenCalledWith('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
    });

    jest.useRealTimers();
  });
});

describe('Circuit Breaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(3, 1000, 5000); // 3 failures, 1s timeout
  });

  test('should allow requests when circuit is closed', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');

    const result = await circuitBreaker.execute(mockFn);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState().state).toBe('closed');
  });

  test('should open circuit after failure threshold', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

    // Trigger failures to open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch {
        // Expected failures
      }
    }

    expect(circuitBreaker.getState().state).toBe('open');
    expect(circuitBreaker.getState().failures).toBe(3);
  });

  test('should reject requests when circuit is open', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch {
        // Expected failures
      }
    }

    // Try another request - should be rejected immediately
    await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker is open');
    expect(mockFn).toHaveBeenCalledTimes(3); // No additional call
  });

  test('should transition to half-open after timeout', async () => {
    jest.useFakeTimers();

    const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(mockFn);
      } catch {
        // Expected failures
      }
    }

    expect(circuitBreaker.getState().state).toBe('open');

    // Fast-forward past reset timeout
    jest.advanceTimersByTime(1100);

    // Mock successful response for half-open test
    mockFn.mockResolvedValueOnce('success');

    const result = await circuitBreaker.execute(mockFn);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState().state).toBe('closed');

    jest.useRealTimers();
  });
});

describe('Request Deduplication', () => {
  test('should deduplicate concurrent requests', async () => {
    const { requestDeduplicator } = require('@/lib/network-resilience');
    
    const mockFn = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('result'), 100))
    );

    const promise1 = requestDeduplicator.deduplicate('test-key', mockFn);
    const promise2 = requestDeduplicator.deduplicate('test-key', mockFn);
    const promise3 = requestDeduplicator.deduplicate('test-key', mockFn);

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(result3).toBe('result');
    expect(mockFn).toHaveBeenCalledTimes(1); // Only called once despite 3 requests
  });

  test('should not deduplicate different keys', async () => {
    const { requestDeduplicator } = require('@/lib/network-resilience');
    
    const mockFn = jest.fn().mockResolvedValue('result');

    await Promise.all([
      requestDeduplicator.deduplicate('key1', mockFn),
      requestDeduplicator.deduplicate('key2', mockFn),
    ]);

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  test('should clear pending requests', async () => {
    const { requestDeduplicator } = require('@/lib/network-resilience');
    
    const mockFn = jest.fn().mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    requestDeduplicator.deduplicate('test-key', mockFn);
    requestDeduplicator.clear('test-key');

    // New request with same key should call function again
    const mockFn2 = jest.fn().mockResolvedValue('result');
    await requestDeduplicator.deduplicate('test-key', mockFn2);

    expect(mockFn2).toHaveBeenCalled();
  });
});

describe('Retry Condition Function', () => {
  test('should identify retryable network errors', () => {
    expect(isRetryableNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
    expect(isRetryableNetworkError({ code: 'ECONNABORTED' })).toBe(true);
    expect(isRetryableNetworkError({ code: 'ENOTFOUND' })).toBe(true);
    expect(isRetryableNetworkError({ code: 'ECONNREFUSED' })).toBe(true);
    expect(isRetryableNetworkError({ response: { status: 500 } })).toBe(true);
    expect(isRetryableNetworkError({ response: { status: 503 } })).toBe(true);
    expect(isRetryableNetworkError({ response: { status: 429 } })).toBe(true);
  });

  test('should identify non-retryable errors', () => {
    expect(isRetryableNetworkError({ response: { status: 400 } })).toBe(false);
    expect(isRetryableNetworkError({ response: { status: 401 } })).toBe(false);
    expect(isRetryableNetworkError({ response: { status: 403 } })).toBe(false);
    expect(isRetryableNetworkError({ response: { status: 404 } })).toBe(false);
    expect(isRetryableNetworkError({ message: 'Random error' } })).toBe(false);
  });

  test('should handle edge cases', () => {
    expect(isRetryableNetworkError({})).toBe(false);
    expect(isRetryableNetworkError(null)).toBe(false);
    expect(isRetryableNetworkError(undefined)).toBe(false);
    expect(isRetryableNetworkError({ message: 'Network Error occurred' })).toBe(true);
    expect(isRetryableNetworkError({ message: 'timeout exceeded' })).toBe(true);
  });
});