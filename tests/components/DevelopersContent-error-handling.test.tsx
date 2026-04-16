/**
 * DevelopersContent Error Handling Tests
 * 
 * Tests error handling for 500 server errors and API failures in the developers page
 * to prevent crashes and provide proper user feedback.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109681176/events/1fc87a26b4364840b2a2fdb77db26b68/
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import DevelopersContent from '@/app/app/developers/DevelopersContent';
import api from '@/lib/api-client';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/lib/api-client');
jest.mock('@/lib/error-utils', () => ({
  extractErrorMessage: (err: any) => {
    if (typeof err === 'string') return err;
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.message) return err.message;
    return 'Unknown error';
  },
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockUseSearchParams = useSearchParams as jest.Mock;

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

describe('DevelopersContent Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    
    // Reset all API mocks
    mockApi.apiKeys = {
      list: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
      getUsage: jest.fn(),
    };
    
    mockApi.apiCredits = {
      getBalance: jest.fn(),
      getPacks: jest.fn(),
      getTransactions: jest.fn(),
      checkout: jest.fn(),
      updateAutoReload: jest.fn(),
      getPaymentMethods: jest.fn(),
      setupPaymentMethod: jest.fn(),
    };
  });

  describe('500 Server Error Handling', () => {
    test('should handle 500 error from API keys endpoint', async () => {
      const serverError = {
        response: { status: 500, data: { message: 'Internal Server Error' } },
        message: 'Request failed with status code 500',
      };

      mockApi.apiKeys.list.mockRejectedValue(serverError);
      mockApi.apiCredits.getBalance.mockResolvedValue({ success: true, data: { balance: 100, lifetime_purchased: 200, lifetime_used: 100, auto_reload: { enabled: false, threshold: null, pack_id: null, has_payment_method: false } } });
      mockApi.apiCredits.getPacks.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getTransactions.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getPaymentMethods.mockResolvedValue({ success: true, data: [] });

      render(<DevelopersContent />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load API keys/)).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith('API Keys load error:', serverError);
    });

    test('should handle 500 error from credits balance endpoint', async () => {
      const serverError = {
        response: { status: 500, data: { message: 'Database connection failed' } },
        message: 'Request failed with status code 500',
      };

      mockApi.apiKeys.list.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getBalance.mockRejectedValue(serverError);
      mockApi.apiCredits.getPacks.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getTransactions.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getPaymentMethods.mockResolvedValue({ success: true, data: [] });

      render(<DevelopersContent />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load credit balance/)).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(console.error).toHaveBeenCalledWith('Balance request failed:', serverError);
    });

    test('should handle 500 error from credit packs endpoint', async () => {
      const serverError = {
        response: { status: 500, data: { message: 'Service unavailable' } },
        message: 'Request failed with status code 500',
      };

      mockApi.apiKeys.list.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getBalance.mockResolvedValue({ success: true, data: { balance: 100, lifetime_purchased: 200, lifetime_used: 100, auto_reload: { enabled: false, threshold: null, pack_id: null, has_payment_method: false } } });
      mockApi.apiCredits.getPacks.mockRejectedValue(serverError);
      mockApi.apiCredits.getTransactions.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getPaymentMethods.mockResolvedValue({ success: true, data: [] });

      render(<DevelopersContent />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load credit packs/)).toBeInTheDocument();
      });

      expect(console.error).toHaveBeenCalledWith('Packs request failed:', serverError);
    });

    test('should handle 500 error from transactions endpoint', async () => {
      const serverError = {
        response: { status: 500, data: { message: 'Query timeout' } },
        message: 'Request failed with status code 500',
      };

      mockApi.apiKeys.list.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getBalance.mockResolvedValue({ success: true, data: { balance: 100, lifetime_purchased: 200, lifetime_used: 100, auto_reload: { enabled: false, threshold: null, pack_id: null, has_payment_method: false } } });
      mockApi.apiCredits.getPacks.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getTransactions.mockRejectedValue(serverError);
      mockApi.apiCredits.getPaymentMethods.mockResolvedValue({ success: true, data: [] });

      render(<DevelopersContent />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load transactions/)).toBeInTheDocument();
      });

      expect(console.error).toHaveBeenCalledWith('Transactions request failed:', serverError);
    });

    test('should handle multiple 500 errors from different endpoints', async () => {
      const serverError = {
        response: { status: 500, data: { message: 'Server overloaded' } },
        message: 'Request failed with status code 500',
      };

      mockApi.apiKeys.list.mockRejectedValue(serverError);
      mockApi.apiCredits.getBalance.mockRejectedValue(serverError);
      mockApi.apiCredits.getPacks.mockRejectedValue(serverError);
      mockApi.apiCredits.getTransactions.mockRejectedValue(serverError);
      mockApi.apiCredits.getPaymentMethods.mockRejectedValue(serverError);

      render(<DevelopersContent />);

      await waitFor(() => {
        // Should show the first error that occurs (balance is typically first)
        expect(screen.getByText(/Failed to load credit balance/)).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('API Response Error Handling', () => {
    test('should handle API returning success: false', async () => {
      mockApi.apiKeys.list.mockResolvedValue({ success: false, error: { message: 'API key service disabled' } });
      mockApi.apiCredits.getBalance.mockResolvedValue({ success: false, error: { message: 'Credits service unavailable' } });
      mockApi.apiCredits.getPacks.mockResolvedValue({ success: false, error: { message: 'Packs not configured' } });
      mockApi.apiCredits.getTransactions.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getPaymentMethods.mockResolvedValue({ success: true, data: [] });

      render(<DevelopersContent />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load API keys: API key service disabled/)).toBeInTheDocument();
      });

      expect(console.error).toHaveBeenCalledWith('API Keys load error:', expect.any(Error));
      expect(console.error).toHaveBeenCalledWith('Balance API error:', { message: 'Credits service unavailable' });
      expect(console.error).toHaveBeenCalledWith('Packs API error:', { message: 'Packs not configured' });
    });

    test('should handle malformed API responses', async () => {
      mockApi.apiKeys.list.mockResolvedValue(null as any);
      mockApi.apiCredits.getBalance.mockResolvedValue(undefined as any);
      mockApi.apiCredits.getPacks.mockResolvedValue({ success: true, data: null });
      mockApi.apiCredits.getTransactions.mockResolvedValue({ success: true, data: undefined });
      mockApi.apiCredits.getPaymentMethods.mockResolvedValue({ success: true });

      render(<DevelopersContent />);

      await waitFor(() => {
        // Should handle malformed responses gracefully without crashing
        expect(screen.getByText('Developers')).toBeInTheDocument();
      });

      // Should set fallback data
      expect(screen.getByText('0')).toBeInTheDocument(); // Balance fallback
    });
  });

  describe('Retry Functionality', () => {
    test('should retry all endpoints when retry button is clicked', async () => {
      const initialError = {
        response: { status: 500, data: { message: 'Temporary failure' } },
        message: 'Request failed with status code 500',
      };

      // First calls fail
      mockApi.apiKeys.list.mockRejectedValueOnce(initialError);
      mockApi.apiCredits.getBalance.mockRejectedValueOnce(initialError);
      mockApi.apiCredits.getPacks.mockRejectedValueOnce(initialError);
      mockApi.apiCredits.getTransactions.mockRejectedValueOnce(initialError);
      mockApi.apiCredits.getPaymentMethods.mockRejectedValueOnce(initialError);

      // Retry calls succeed
      mockApi.apiKeys.list.mockResolvedValueOnce({ success: true, data: [] });
      mockApi.apiCredits.getBalance.mockResolvedValueOnce({ 
        success: true, 
        data: { balance: 100, lifetime_purchased: 200, lifetime_used: 100, auto_reload: { enabled: false, threshold: null, pack_id: null, has_payment_method: false } }
      });
      mockApi.apiCredits.getPacks.mockResolvedValueOnce({ success: true, data: [] });
      mockApi.apiCredits.getTransactions.mockResolvedValueOnce({ success: true, data: [] });
      mockApi.apiCredits.getPaymentMethods.mockResolvedValueOnce({ success: true, data: [] });

      render(<DevelopersContent />);

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByText(/Failed to load credit balance/)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Should show retrying state
      await waitFor(() => {
        expect(screen.getByText('Retrying...')).toBeInTheDocument();
      });

      // Wait for retry to complete
      await waitFor(() => {
        expect(screen.queryByText(/Failed to load/)).not.toBeInTheDocument();
      });

      // Should have called APIs again
      expect(mockApi.apiKeys.list).toHaveBeenCalledTimes(2);
      expect(mockApi.apiCredits.getBalance).toHaveBeenCalledTimes(2);
      expect(mockApi.apiCredits.getPacks).toHaveBeenCalledTimes(2);
    });

    test('should track retry attempts', async () => {
      const persistentError = {
        response: { status: 500, data: { message: 'Persistent failure' } },
        message: 'Request failed with status code 500',
      };

      mockApi.apiKeys.list.mockRejectedValue(persistentError);
      mockApi.apiCredits.getBalance.mockRejectedValue(persistentError);
      mockApi.apiCredits.getPacks.mockRejectedValue(persistentError);
      mockApi.apiCredits.getTransactions.mockRejectedValue(persistentError);
      mockApi.apiCredits.getPaymentMethods.mockRejectedValue(persistentError);

      render(<DevelopersContent />);

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByText(/Failed to load credit balance/)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      // Wait for retry to complete and fail again
      await waitFor(() => {
        expect(screen.getByText('Retry attempt: 1')).toBeInTheDocument();
      });
    });
  });

  describe('Graceful Degradation', () => {
    test('should show API keys tab with empty state when API fails', async () => {
      mockApi.apiKeys.list.mockRejectedValue(new Error('API keys service down'));
      mockApi.apiCredits.getBalance.mockResolvedValue({ success: true, data: { balance: 100, lifetime_purchased: 200, lifetime_used: 100, auto_reload: { enabled: false, threshold: null, pack_id: null, has_payment_method: false } } });
      mockApi.apiCredits.getPacks.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getTransactions.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getPaymentMethods.mockResolvedValue({ success: true, data: [] });

      render(<DevelopersContent />);

      await waitFor(() => {
        expect(screen.getByText('Your API Keys')).toBeInTheDocument();
      });

      // Should show error but still allow interaction with the tab
      expect(screen.getByText(/Failed to load API keys/)).toBeInTheDocument();
      expect(screen.getByText('Create Key')).toBeInTheDocument();
    });

    test('should show credits tab with fallback data when API fails', async () => {
      mockApi.apiKeys.list.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getBalance.mockRejectedValue(new Error('Credits service down'));
      mockApi.apiCredits.getPacks.mockRejectedValue(new Error('Packs service down'));
      mockApi.apiCredits.getTransactions.mockRejectedValue(new Error('Transactions service down'));
      mockApi.apiCredits.getPaymentMethods.mockResolvedValue({ success: true, data: [] });

      render(<DevelopersContent />);

      // Switch to credits tab
      fireEvent.click(screen.getByText('Credits'));

      await waitFor(() => {
        expect(screen.getByText(/Unable to load credit balance/)).toBeInTheDocument();
      });

      // Should still show the tab structure
      expect(screen.getByText('Current Balance')).toBeInTheDocument();
    });

    test('should handle payment methods errors gracefully', async () => {
      mockApi.apiKeys.list.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getBalance.mockResolvedValue({ success: true, data: { balance: 100, lifetime_purchased: 200, lifetime_used: 100, auto_reload: { enabled: false, threshold: null, pack_id: null, has_payment_method: false } } });
      mockApi.apiCredits.getPacks.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getTransactions.mockResolvedValue({ success: true, data: [] });
      mockApi.apiCredits.getPaymentMethods.mockRejectedValue(new Error('Payment methods unavailable'));

      render(<DevelopersContent />);

      // Switch to auto-reload tab
      fireEvent.click(screen.getByText('Auto-Reload'));

      await waitFor(() => {
        expect(screen.getByText('Auto-Reload')).toBeInTheDocument();
      });

      // Should not crash and should handle missing payment methods
      expect(screen.getByText('No saved payment methods')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('should show loading states for each section', async () => {
      // Mock APIs to never resolve to test loading states
      mockApi.apiKeys.list.mockImplementation(() => new Promise(() => {}));
      mockApi.apiCredits.getBalance.mockImplementation(() => new Promise(() => {}));
      mockApi.apiCredits.getPacks.mockImplementation(() => new Promise(() => {}));
      mockApi.apiCredits.getTransactions.mockImplementation(() => new Promise(() => {}));
      mockApi.apiCredits.getPaymentMethods.mockImplementation(() => new Promise(() => {}));

      render(<DevelopersContent />);

      // Should show loading for API keys
      expect(screen.getByText('Loading API keys...')).toBeInTheDocument();

      // Switch to credits tab
      fireEvent.click(screen.getByText('Credits'));

      // Should show loading for credits
      expect(screen.getByText('Loading credit information...')).toBeInTheDocument();
    });

    test('should show proper loading state during retry', async () => {
      const serverError = {
        response: { status: 500, data: { message: 'Server error' } },
        message: 'Request failed with status code 500',
      };

      mockApi.apiKeys.list.mockRejectedValue(serverError);
      mockApi.apiCredits.getBalance.mockRejectedValue(serverError);
      mockApi.apiCredits.getPacks.mockRejectedValue(serverError);
      mockApi.apiCredits.getTransactions.mockRejectedValue(serverError);
      mockApi.apiCredits.getPaymentMethods.mockRejectedValue(serverError);

      render(<DevelopersContent />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
      });

      // Start retry
      fireEvent.click(screen.getByText('Retry'));

      // Should show retrying state
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      
      // Retry button should be disabled
      expect(screen.getByRole('button', { name: /Retrying/ })).toBeDisabled();
    });
  });

  describe('Error Message Extraction', () => {
    test('should extract meaningful error messages from different error formats', async () => {
      const errorFormats = [
        {
          error: { response: { data: { message: 'Custom API error message' } } },
          expectedText: 'Custom API error message',
        },
        {
          error: { message: 'Network timeout error' },
          expectedText: 'Network timeout error',
        },
        {
          error: 'Simple string error',
          expectedText: 'Simple string error',
        },
        {
          error: new Error('Standard Error object'),
          expectedText: 'Standard Error object',
        },
      ];

      for (const { error, expectedText } of errorFormats) {
        mockApi.apiKeys.list.mockRejectedValueOnce(error);
        mockApi.apiCredits.getBalance.mockResolvedValue({ success: true, data: { balance: 0, lifetime_purchased: 0, lifetime_used: 0, auto_reload: { enabled: false, threshold: null, pack_id: null, has_payment_method: false } } });
        mockApi.apiCredits.getPacks.mockResolvedValue({ success: true, data: [] });
        mockApi.apiCredits.getTransactions.mockResolvedValue({ success: true, data: [] });
        mockApi.apiCredits.getPaymentMethods.mockResolvedValue({ success: true, data: [] });

        const { rerender } = render(<DevelopersContent />);

        await waitFor(() => {
          expect(screen.getByText(new RegExp(expectedText))).toBeInTheDocument();
        });

        rerender(<div />); // Clear component
        jest.clearAllMocks();
      }
    });
  });
});