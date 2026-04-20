/**
 * API Client List Timeout Fix Tests
 * 
 * Tests to ensure clips.list method uses proper timeout configuration
 * to prevent 10-second timeout errors.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113717306
 */

import axios from 'axios';
import { api } from '@/lib/api-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Client List Timeout Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios create to return our mocked instance
    mockedAxios.create.mockReturnValue(mockedAxios);
    
    // Mock successful responses by default
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: { uploads: [] } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
  });

  describe('clips.list timeout configuration', () => {
    test('should use LIST_TIMEOUT (30s) instead of default', async () => {
      await api.clips.list(20, 0);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/clips',
        expect.objectContaining({
          params: { limit: 20, offset: 0 },
          timeout: 30000, // LIST_TIMEOUT
        })
      );
    });

    test('should not use old 10-second timeout', async () => {
      await api.clips.list();

      const callArgs = mockedAxios.get.mock.calls[0];
      const config = callArgs[1];
      
      expect(config.timeout).not.toBe(10000);
      expect(config.timeout).toBe(30000);
    });

    test('should not use default axios timeout (15s)', async () => {
      await api.clips.list(10, 5);

      const callArgs = mockedAxios.get.mock.calls[0];
      const config = callArgs[1];
      
      expect(config.timeout).not.toBe(15000);
      expect(config.timeout).toBe(30000);
    });

    test('should handle timeout parameters correctly', async () => {
      await api.clips.list();
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/clips',
        expect.objectContaining({
          params: { limit: undefined, offset: undefined },
          timeout: 30000,
        })
      );

      await api.clips.list(50);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/clips',
        expect.objectContaining({
          params: { limit: 50, offset: undefined },
          timeout: 30000,
        })
      );

      await api.clips.list(25, 10);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/clips',
        expect.objectContaining({
          params: { limit: 25, offset: 10 },
          timeout: 30000,
        })
      );
    });
  });

  describe('Comparison with other list operations', () => {
    test('contentKits.list should also use LIST_TIMEOUT', async () => {
      await api.contentKits.list(20, 0);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/content-kits',
        expect.objectContaining({
          params: { limit: 20, offset: 0 },
          timeout: 30000, // LIST_TIMEOUT
        })
      );
    });

    test('generation.listRequests should use DASHBOARD_TIMEOUT (25s)', async () => {
      await api.generation.listRequests({ limit: 20, offset: 0 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/generate',
        expect.objectContaining({
          params: { limit: 20, offset: 0 },
          timeout: 25000, // DASHBOARD_TIMEOUT
        })
      );
    });

    test('all list operations should have explicit timeouts', async () => {
      const listOperations = [
        () => api.clips.list(10, 0),
        () => api.contentKits.list(10, 0),
        () => api.generation.listRequests({ limit: 10, offset: 0 }),
      ];

      for (const operation of listOperations) {
        mockedAxios.get.mockClear();
        await operation();

        const callArgs = mockedAxios.get.mock.calls[0];
        const config = callArgs[1];
        
        expect(config).toHaveProperty('timeout');
        expect(typeof config.timeout).toBe('number');
        expect(config.timeout).toBeGreaterThan(0);
        // Should not use problematic 10-second timeout
        expect(config.timeout).not.toBe(10000);
      }
    });
  });

  describe('Timeout error handling', () => {
    test('should handle LIST_TIMEOUT properly', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(api.clips.list(20, 0)).rejects.toThrow('timeout of 30000ms exceeded');
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/clips',
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    test('should not hit 10-second timeout anymore', async () => {
      // This test ensures we never see the original 10-second timeout
      const originalTimeoutError = new Error('timeout of 10000ms exceeded');
      (originalTimeoutError as any).code = 'ECONNABORTED';

      // If clips.list uses proper timeout, it won't hit the 10s limit
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { uploads: [] } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await api.clips.list(20, 0);

      // Should have been called with 30-second timeout
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/clips',
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    test('should provide reasonable timeout for content library operations', async () => {
      // Content library operations should have reasonable timeouts
      // - Not too short (causing false failures)
      // - Not too long (causing poor UX)
      
      await api.clips.list(100, 0); // Large request

      const callArgs = mockedAxios.get.mock.calls[0];
      const config = callArgs[1];
      
      // Should be reasonable (30s)
      expect(config.timeout).toBe(30000);
      // Should be longer than the problematic 10s
      expect(config.timeout).toBeGreaterThan(10000);
      // Should be shorter than generation operations (180s)
      expect(config.timeout).toBeLessThan(180000);
      // Should be appropriate for list operations
      expect(config.timeout).toBeLessThanOrEqual(60000); // Max 1 minute for lists
    });
  });

  describe('Performance and scalability', () => {
    test('should handle large list requests without premature timeout', async () => {
      // Simulate large dataset request
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `upload-${i}`,
        title: `Video ${i}`,
        status: 'completed',
      }));

      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: { uploads: largeDataset.slice(0, 100) } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await api.clips.list(100, 0);

      const callArgs = mockedAxios.get.mock.calls[0];
      expect(callArgs[1].timeout).toBe(30000); // Should still use appropriate timeout
    });

    test('should handle pagination requests efficiently', async () => {
      // Simulate paginated requests
      const pageRequests = [
        () => api.clips.list(20, 0),   // First page
        () => api.clips.list(20, 20),  // Second page
        () => api.clips.list(20, 40),  // Third page
      ];

      for (const request of pageRequests) {
        mockedAxios.get.mockClear();
        await request();

        const callArgs = mockedAxios.get.mock.calls[0];
        expect(callArgs[1].timeout).toBe(30000);
      }
    });

    test('should not accumulate timeout issues during rapid requests', async () => {
      // Simulate rapid successive requests (like auto-refresh or user clicking)
      const rapidRequests = Array.from({ length: 5 }, () => api.clips.list(10, 0));

      await Promise.all(rapidRequests);

      // All requests should have used proper timeout
      expect(mockedAxios.get).toHaveBeenCalledTimes(5);
      mockedAxios.get.mock.calls.forEach(call => {
        expect(call[1].timeout).toBe(30000);
      });
    });
  });

  describe('Backward compatibility and consistency', () => {
    test('should maintain API compatibility while fixing timeout', async () => {
      // Test various call patterns
      const callPatterns = [
        () => api.clips.list(),
        () => api.clips.list(10),
        () => api.clips.list(20, 0),
        () => api.clips.list(undefined, 10),
        () => api.clips.list(50, 25),
      ];

      for (const pattern of callPatterns) {
        mockedAxios.get.mockClear();
        await pattern();

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get.mock.calls[0][0]).toBe('/clips');
        expect(mockedAxios.get.mock.calls[0][1].timeout).toBe(30000);
      }
    });

    test('should be consistent with other list operation timeouts', async () => {
      const listMethods = [
        { method: () => api.clips.list(10, 0), expectedTimeout: 30000 },
        { method: () => api.contentKits.list(10, 0), expectedTimeout: 30000 },
        { method: () => api.generation.listRequests({ limit: 10, offset: 0 }), expectedTimeout: 25000 },
      ];

      for (const { method, expectedTimeout } of listMethods) {
        mockedAxios.get.mockClear();
        await method();

        const callArgs = mockedAxios.get.mock.calls[0];
        expect(callArgs[1].timeout).toBe(expectedTimeout);
      }
    });

    test('should distinguish list operations from other operation types', async () => {
      // List operations should use reasonable timeouts (10-60s)
      await api.clips.list(20, 0);
      let listCall = mockedAxios.get.mock.calls[0];
      expect(listCall[1].timeout).toBe(30000);

      // Generation operations should use longer timeouts (180s)
      // (This would be tested if we had a generation call that uses POST)
      mockedAxios.post.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await api.contentKits.regenerate('kit-123');
      let generateCall = mockedAxios.post.mock.calls[0];
      expect(generateCall[2].timeout).toBe(180000); // Should use GENERATION_TIMEOUT
    });
  });
});