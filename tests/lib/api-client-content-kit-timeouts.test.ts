/**
 * API Client Content Kit Timeout Tests
 * 
 * Tests to ensure proper timeout configurations for content kit related operations
 * to prevent 180-second timeout errors.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113703248
 */

import axios from 'axios';
import { api } from '@/lib/api-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Client Content Kit Timeout Configurations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios create to return our mocked instance
    mockedAxios.create.mockReturnValue(mockedAxios);
    
    // Mock successful responses by default
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: {} },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    mockedAxios.post.mockResolvedValue({
      data: { success: true, data: {} },
      status: 200,
      statusText: 'OK', 
      headers: {},
      config: {} as any,
    });

    mockedAxios.patch.mockResolvedValue({
      data: { success: true, data: {} },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
  });

  describe('Content Kit Loading Operations', () => {
    test('contentKits.get should use CONTENT_KIT_TIMEOUT (60s)', async () => {
      await api.contentKits.get('kit-123');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/content-kits/kit-123',
        expect.objectContaining({
          timeout: 60000, // CONTENT_KIT_TIMEOUT
        })
      );
    });

    test('generation.getRequest should use CONTENT_KIT_TIMEOUT (60s)', async () => {
      await api.generation.getRequest('req-123');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/generate/req-123',
        expect.objectContaining({
          timeout: 60000, // CONTENT_KIT_TIMEOUT
        })
      );
    });

    test('clips.get should use CONTENT_KIT_TIMEOUT (60s)', async () => {
      await api.clips.get('upload-123');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/clips/upload-123',
        expect.objectContaining({
          timeout: 60000, // CONTENT_KIT_TIMEOUT
        })
      );
    });
  });

  describe('Content Kit Modification Operations', () => {
    test('contentKits.regenerate should use GENERATION_TIMEOUT (180s)', async () => {
      await api.contentKits.regenerate('kit-123', {
        platforms: ['linkedin', 'twitter']
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/content-kits/kit-123/regenerate',
        { platforms: ['linkedin', 'twitter'] },
        expect.objectContaining({
          timeout: 180000, // GENERATION_TIMEOUT for actual generation
        })
      );
    });

    test('contentKits.resizeCarousel should use GENERATION_TIMEOUT (180s)', async () => {
      await api.contentKits.resizeCarousel('kit-123', '1:1');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/content-kits/kit-123/resize-carousel',
        { aspectRatio: '1:1' },
        expect.objectContaining({
          timeout: 180000, // GENERATION_TIMEOUT for image processing
        })
      );
    });
  });

  describe('Clip Operations', () => {
    test('clips.exportClip should use GENERATION_TIMEOUT (180s)', async () => {
      await api.clips.exportClip('upload-123', 'clip-456', {
        format: 'portrait',
        quality: '1080p'
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/clips/upload-123/clips/clip-456/export',
        { format: 'portrait', quality: '1080p' },
        expect.objectContaining({
          timeout: 180000, // GENERATION_TIMEOUT for video processing
        })
      );
    });

    test('clips.updateClip should use LIST_TIMEOUT (30s)', async () => {
      await api.clips.updateClip('upload-123', 'clip-456', {
        title: 'Updated Title',
        captionStyle: 'modern'
      });

      expect(mockedAxios.patch).toHaveBeenCalledWith(
        '/clips/upload-123/clips/clip-456',
        { title: 'Updated Title', captionStyle: 'modern' },
        expect.objectContaining({
          timeout: 30000, // LIST_TIMEOUT for quick updates
        })
      );
    });
  });

  describe('List Operations', () => {
    test('contentKits.list should use LIST_TIMEOUT (30s)', async () => {
      await api.contentKits.list(20, 0);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/content-kits',
        expect.objectContaining({
          params: { limit: 20, offset: 0 },
          timeout: 30000, // LIST_TIMEOUT
        })
      );
    });

    test('clips.list should not specify timeout (uses default)', async () => {
      await api.clips.list(10, 0);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/clips',
        expect.objectContaining({
          params: { limit: 10, offset: 0 }
        })
      );

      // Should NOT have timeout property for list operations using default
      const callArgs = mockedAxios.get.mock.calls[0];
      expect(callArgs[1]).not.toHaveProperty('timeout');
    });
  });

  describe('Timeout Error Scenarios', () => {
    test('should handle CONTENT_KIT_TIMEOUT properly', async () => {
      const timeoutError = new Error('timeout of 60000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(api.contentKits.get('kit-123')).rejects.toThrow('timeout of 60000ms exceeded');
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        '/content-kits/kit-123',
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    test('should handle GENERATION_TIMEOUT for long operations', async () => {
      const timeoutError = new Error('timeout of 180000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockedAxios.post.mockRejectedValue(timeoutError);

      await expect(api.contentKits.regenerate('kit-123')).rejects.toThrow('timeout of 180000ms exceeded');
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/content-kits/kit-123/regenerate',
        {},
        expect.objectContaining({
          timeout: 180000,
        })
      );
    });

    test('should not exceed CONTENT_KIT_TIMEOUT for loading operations', async () => {
      // Ensure loading operations don't use the full GENERATION_TIMEOUT (180s)
      // which was causing the original issue
      const apiCalls = [
        () => api.contentKits.get('kit-123'),
        () => api.generation.getRequest('req-123'),
        () => api.clips.get('upload-123'),
      ];

      for (const apiCall of apiCalls) {
        mockedAxios.get.mockClear();
        await apiCall();

        const callArgs = mockedAxios.get.mock.calls[0];
        const config = callArgs[1];
        
        expect(config).toHaveProperty('timeout');
        expect(config.timeout).toBe(60000); // CONTENT_KIT_TIMEOUT, not GENERATION_TIMEOUT
        expect(config.timeout).toBeLessThan(180000); // Less than the problematic 3-minute timeout
      }
    });
  });

  describe('Timeout Hierarchy', () => {
    test('should use appropriate timeout for different operation types', async () => {
      const operationTimeouts = [
        // Loading operations (should be reasonable ~60s)
        { operation: () => api.contentKits.get('kit-123'), expectedTimeout: 60000, type: 'loading' },
        { operation: () => api.generation.getRequest('req-123'), expectedTimeout: 60000, type: 'loading' },
        { operation: () => api.clips.get('upload-123'), expectedTimeout: 60000, type: 'loading' },
        
        // List operations (should be quick ~30s)
        { operation: () => api.contentKits.list(), expectedTimeout: 30000, type: 'list' },
        
        // Generation operations (can be long ~180s)
        { operation: () => api.contentKits.regenerate('kit-123'), expectedTimeout: 180000, type: 'generation' },
        { operation: () => api.contentKits.resizeCarousel('kit-123', '1:1'), expectedTimeout: 180000, type: 'generation' },
        { operation: () => api.clips.exportClip('upload-123', 'clip-456'), expectedTimeout: 180000, type: 'generation' },
      ];

      for (const { operation, expectedTimeout, type } of operationTimeouts) {
        jest.clearAllMocks();
        await operation();

        const method = type === 'generation' || type === 'list' ? mockedAxios.post || mockedAxios.get : mockedAxios.get;
        const calls = [...(mockedAxios.get.mock.calls || []), ...(mockedAxios.post.mock.calls || [])];
        
        expect(calls.length).toBeGreaterThan(0);
        
        const lastCall = calls[calls.length - 1];
        const config = lastCall[lastCall.length - 1]; // Config is the last parameter
        
        if (expectedTimeout) {
          expect(config).toHaveProperty('timeout', expectedTimeout);
        }
      }
    });

    test('should never use default axios timeout for content kit operations', async () => {
      // Content kit operations should always specify an explicit timeout
      // to avoid the default axios timeout which could be too long or undefined
      
      const criticalOperations = [
        () => api.contentKits.get('kit-123'),
        () => api.generation.getRequest('req-123'),
        () => api.clips.get('upload-123'),
        () => api.contentKits.regenerate('kit-123'),
        () => api.clips.exportClip('upload-123', 'clip-456'),
      ];

      for (const operation of criticalOperations) {
        jest.clearAllMocks();
        await operation();

        const allCalls = [
          ...mockedAxios.get.mock.calls,
          ...mockedAxios.post.mock.calls,
          ...mockedAxios.patch.mock.calls,
        ];

        expect(allCalls.length).toBeGreaterThan(0);
        
        const lastCall = allCalls[allCalls.length - 1];
        const config = lastCall[lastCall.length - 1];
        
        expect(config).toHaveProperty('timeout');
        expect(typeof config.timeout).toBe('number');
        expect(config.timeout).toBeGreaterThan(0);
      }
    });
  });

  describe('Progressive Timeout Strategy', () => {
    test('should use shorter timeouts for loading vs longer for processing', async () => {
      // Loading operations should have reasonable timeouts (60s)
      await api.contentKits.get('kit-123');
      let getCall = mockedAxios.get.mock.calls[0];
      expect(getCall[1].timeout).toBe(60000);

      // Processing operations can have longer timeouts (180s)
      await api.contentKits.regenerate('kit-123');
      let postCall = mockedAxios.post.mock.calls[0];
      expect(postCall[2].timeout).toBe(180000);

      // But loading timeout should still be less than processing timeout
      expect(getCall[1].timeout).toBeLessThan(postCall[2].timeout);
    });

    test('should provide reasonable timeouts that prevent user frustration', async () => {
      // All timeouts should be reasonable - not too short (causing false failures)
      // but not too long (causing poor UX)
      
      const operations = [
        { operation: () => api.contentKits.get('kit-123'), maxReasonableTimeout: 90000 }, // 1.5 minutes max for loading
        { operation: () => api.contentKits.list(), maxReasonableTimeout: 45000 }, // 45 seconds max for lists
        { operation: () => api.clips.exportClip('upload-123', 'clip-456'), maxReasonableTimeout: 300000 }, // 5 minutes max for heavy processing
      ];

      for (const { operation, maxReasonableTimeout } of operations) {
        jest.clearAllMocks();
        await operation();

        const allCalls = [
          ...mockedAxios.get.mock.calls,
          ...mockedAxios.post.mock.calls,
        ];

        const lastCall = allCalls[allCalls.length - 1];
        const config = lastCall[lastCall.length - 1];
        
        expect(config.timeout).toBeLessThanOrEqual(maxReasonableTimeout);
        expect(config.timeout).toBeGreaterThanOrEqual(10000); // At least 10 seconds
      }
    });
  });
});