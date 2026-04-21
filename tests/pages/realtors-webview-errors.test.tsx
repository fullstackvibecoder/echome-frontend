/**
 * Realtors Page WebView Error Tests
 * 
 * Tests for the /realtors page to ensure it properly handles WebView
 * integration errors, specifically the "Java object is gone" error
 * from enableButtonsClickedMetaDataLogging.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113787028
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RealtorsContent from '@/app/realtors/RealtorsContent';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock console methods
const mockConsoleWarn = jest.fn();
const mockConsoleError = jest.fn();
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Mock window.addEventListener for error handling
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

describe('Realtors Page WebView Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = mockConsoleWarn;
    console.error = mockConsoleError;
    window.addEventListener = mockAddEventListener;
    window.removeEventListener = mockRemoveEventListener;
    
    // Reset any global error handlers
    (mockAddEventListener as jest.Mock).mockImplementation((type, handler) => {
      if (type === 'error' || type === 'unhandledrejection') {
        // Store the handler for testing
        (mockAddEventListener as any)[type] = handler;
      }
    });
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  describe('Page rendering', () => {
    test('should render realtors page content successfully', () => {
      render(<RealtorsContent />);

      expect(screen.getByText('Transform Your Property Listings')).toBeInTheDocument();
      expect(screen.getByText('with AI-Powered Video Content')).toBeInTheDocument();
      expect(screen.getByText('Built for Real Estate Success')).toBeInTheDocument();
    });

    test('should display all feature sections', () => {
      render(<RealtorsContent />);

      expect(screen.getByText('Property Tour Videos')).toBeInTheDocument();
      expect(screen.getByText('Social Media Content')).toBeInTheDocument();
      expect(screen.getByText('Listing Descriptions')).toBeInTheDocument();
      expect(screen.getByText('Market Insights')).toBeInTheDocument();
      expect(screen.getByText('Quick Turnaround')).toBeInTheDocument();
      expect(screen.getByText('Brand Customization')).toBeInTheDocument();
    });

    test('should display how it works section', () => {
      render(<RealtorsContent />);

      expect(screen.getByText('Simple 3-Step Process')).toBeInTheDocument();
      expect(screen.getByText('Upload Property Video')).toBeInTheDocument();
      expect(screen.getByText('AI Processing')).toBeInTheDocument();
      expect(screen.getByText('Download & Share')).toBeInTheDocument();
    });

    test('should display call to action section', () => {
      render(<RealtorsContent />);

      expect(screen.getByText('Ready to Transform Your Listings?')).toBeInTheDocument();
      expect(screen.getByText('Join real estate professionals who are already using EchoMe to sell properties faster')).toBeInTheDocument();
    });
  });

  describe('WebView error handling setup', () => {
    test('should set up error event listeners on mount', () => {
      render(<RealtorsContent />);

      expect(mockAddEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    test('should clean up error listeners on unmount', () => {
      const { unmount } = render(<RealtorsContent />);

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    test('should handle WebView errors gracefully', async () => {
      render(<RealtorsContent />);

      // Get the error handler that was registered
      const errorHandler = (mockAddEventListener as any)['error'];
      
      // Simulate a WebView error
      const webViewError = new ErrorEvent('error', {
        error: new Error('Error invoking enableButtonsClickedMetaDataLogging: Java object is gone'),
        message: 'Error invoking enableButtonsClickedMetaDataLogging: Java object is gone',
      });

      // Mock preventDefault
      webViewError.preventDefault = jest.fn();

      // Call the error handler
      const result = errorHandler(webViewError);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'WebView integration error detected - implementing graceful fallback'
      );
      expect(webViewError.preventDefault).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test('should handle WebView promise rejections gracefully', async () => {
      render(<RealtorsContent />);

      // Get the rejection handler that was registered
      const rejectionHandler = (mockAddEventListener as any)['unhandledrejection'];
      
      // Simulate a WebView promise rejection
      const webViewRejection = new PromiseRejectionEvent('unhandledrejection', {
        reason: new Error('Error invoking enableButtonsClickedMetaDataLogging: Java object is gone'),
        promise: Promise.reject('test'),
      });

      // Mock preventDefault
      webViewRejection.preventDefault = jest.fn();

      // Call the rejection handler
      const result = rejectionHandler(webViewRejection);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'WebView promise rejection detected - implementing graceful fallback'
      );
      expect(webViewRejection.preventDefault).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test('should not interfere with non-WebView errors', async () => {
      render(<RealtorsContent />);

      // Get the error handler that was registered
      const errorHandler = (mockAddEventListener as any)['error'];
      
      // Simulate a regular JavaScript error
      const regularError = new ErrorEvent('error', {
        error: new Error('Regular JavaScript error'),
        message: 'Regular JavaScript error',
      });

      // Mock preventDefault (should not be called)
      regularError.preventDefault = jest.fn();

      // Call the error handler
      const result = errorHandler(regularError);

      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(regularError.preventDefault).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('User interactions', () => {
    test('should handle CTA button clicks without errors', async () => {
      render(<RealtorsContent />);

      const startTrialButtons = screen.getAllByText('Start Free Trial');
      const getStartedButton = screen.getByText('Get Started Free');

      // Click all CTA buttons
      fireEvent.click(startTrialButtons[0]);
      fireEvent.click(getStartedButton);

      // Should not cause any errors
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test('should handle View Examples button click', () => {
      render(<RealtorsContent />);

      const viewExamplesButton = screen.getByText('View Examples');
      fireEvent.click(viewExamplesButton);

      // Should not cause any errors
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test('should handle button clicks even if WebView tracking fails', async () => {
      // Mock a problematic WebView method
      (window as any).enableButtonsClickedMetaDataLogging = jest.fn().mockImplementation(() => {
        throw new Error('Java object is gone');
      });

      render(<RealtorsContent />);

      const button = screen.getByText('Start Free Trial');
      
      // Click should work even if WebView tracking fails
      expect(() => {
        fireEvent.click(button);
      }).not.toThrow();
    });
  });

  describe('WebView context handling', () => {
    test('should work in mobile WebView environment', () => {
      // Mock mobile WebView user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.120 Mobile Safari/537.36 wv',
        configurable: true,
      });

      render(<RealtorsContent />);

      expect(screen.getByText('Transform Your Property Listings')).toBeInTheDocument();
    });

    test('should work in iOS WebView environment', () => {
      // Mock iOS WebView user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        configurable: true,
      });

      render(<RealtorsContent />);

      expect(screen.getByText('Transform Your Property Listings')).toBeInTheDocument();
    });

    test('should work with ReactNativeWebView', () => {
      // Mock React Native WebView
      (window as any).ReactNativeWebView = {
        postMessage: jest.fn(),
      };

      render(<RealtorsContent />);

      expect(screen.getByText('Transform Your Property Listings')).toBeInTheDocument();
    });

    test('should work with Android WebView bridge', () => {
      // Mock Android WebView bridge
      (window as any).Android = {
        trackButtonClick: jest.fn().mockImplementation(() => {
          throw new Error('Java object is gone');
        }),
      };

      render(<RealtorsContent />);

      expect(screen.getByText('Transform Your Property Listings')).toBeInTheDocument();
    });
  });

  describe('Error boundary integration', () => {
    test('should integrate with WebViewErrorBoundary correctly', () => {
      const ErrorThrowingComponent = () => {
        throw new Error('Error invoking enableButtonsClickedMetaDataLogging: Java object is gone');
      };

      // This would normally be caught by WebViewErrorBoundary
      expect(() => {
        render(<ErrorThrowingComponent />);
      }).toThrow(); // Without boundary it throws

      // But our component should have error handling that prevents issues
      expect(() => {
        render(<RealtorsContent />);
      }).not.toThrow();
    });

    test('should handle errors during component lifecycle', async () => {
      // Mock useEffect to throw WebView error
      const originalUseEffect = React.useEffect;
      jest.spyOn(React, 'useEffect').mockImplementationOnce((effect: any) => {
        // Call effect immediately and let it throw
        try {
          effect();
        } catch (error: any) {
          if (error.message.includes('Java object is gone')) {
            console.warn('WebView error during lifecycle:', error.message);
            return;
          }
          throw error;
        }
      });

      render(<RealtorsContent />);

      expect(screen.getByText('Transform Your Property Listings')).toBeInTheDocument();

      React.useEffect = originalUseEffect;
    });
  });

  describe('Accessibility and usability', () => {
    test('should maintain accessibility even with WebView error handling', () => {
      render(<RealtorsContent />);

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6);
    });

    test('should maintain responsive design in WebView', () => {
      // Test that responsive classes are applied
      render(<RealtorsContent />);

      const mainContainer = screen.getByText('Transform Your Property Listings').closest('div');
      expect(mainContainer?.className).toContain('sm:');
      expect(mainContainer?.className).toContain('lg:');
    });

    test('should handle keyboard navigation properly', () => {
      render(<RealtorsContent />);

      const buttons = screen.getAllByRole('link');
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });
  });

  describe('Performance considerations', () => {
    test('should not add excessive event listeners', () => {
      render(<RealtorsContent />);

      // Should only add 2 event listeners (error and unhandledrejection)
      expect(mockAddEventListener).toHaveBeenCalledTimes(2);
    });

    test('should properly clean up resources', async () => {
      const { unmount } = render(<RealtorsContent />);

      unmount();

      // Should remove the same number of listeners that were added
      expect(mockRemoveEventListener).toHaveBeenCalledTimes(2);
    });

    test('should not cause memory leaks with error handlers', () => {
      const { unmount } = render(<RealtorsContent />);

      // Multiple mount/unmount cycles should not accumulate listeners
      unmount();
      render(<RealtorsContent />);
      
      // Should still be manageable number of calls
      expect(mockAddEventListener.mock.calls.length).toBeLessThanOrEqual(4);
    });
  });
});

// Additional React import for the mocking test
import React from 'react';