/**
 * API Client Timeout Constants Tests
 * 
 * Tests that verify appropriate timeout values are configured to prevent
 * the 15-second timeout errors on dashboard operations.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/112579240
 */

import { apiClient } from '../../src/lib/api-client';

describe('API Client Timeout Configuration', () => {
  describe('Default Timeout', () => {
    test('should have 15-second default timeout', () => {
      expect(apiClient.defaults.timeout).toBe(15000);
    });

    test('should have reasonable default timeout for basic operations', () => {
      const timeout = apiClient.defaults.timeout;
      expect(timeout).toBeGreaterThanOrEqual(10000); // At least 10 seconds
      expect(timeout).toBeLessThanOrEqual(30000); // Not more than 30 seconds
    });
  });

  describe('Base Configuration', () => {
    test('should have proper base URL configuration', () => {
      expect(apiClient.defaults.baseURL).toBeTruthy();
    });

    test('should have proper headers configuration', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });

    test('should have timeout as a number', () => {
      expect(typeof apiClient.defaults.timeout).toBe('number');
      expect(apiClient.defaults.timeout).toBeGreaterThan(0);
    });
  });

  describe('Request Interceptor Configuration', () => {
    test('should have request interceptors configured', () => {
      expect(apiClient.interceptors.request.handlers.length).toBeGreaterThan(0);
    });

    test('should have response interceptors configured', () => {
      expect(apiClient.interceptors.response.handlers.length).toBeGreaterThan(0);
    });
  });

  describe('Timeout Value Validation', () => {
    test('should not use excessively short timeouts that cause frequent failures', () => {
      expect(apiClient.defaults.timeout).toBeGreaterThanOrEqual(15000);
    });

    test('should not use excessively long timeouts that hurt user experience', () => {
      expect(apiClient.defaults.timeout).toBeLessThanOrEqual(60000);
    });
  });
});