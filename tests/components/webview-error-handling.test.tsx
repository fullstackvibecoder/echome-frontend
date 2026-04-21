/**
 * WebView Error Handling Tests
 * 
 * Tests for WebView integration error handling, specifically the
 * "Java object is gone" error from enableButtonsClickedMetaDataLogging
 * and similar native bridge failures.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113787028
 */

import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import WebViewErrorBoundary from '@/components/WebViewErrorBoundary';
import GlobalErrorHandler from '@/components/GlobalErrorHandler';
import { useWebViewErrorHandler, safeNativeCall, isNativeMethodAvailable } from '@/hooks/useWebViewErrorHandler';

// Mock console methods to capture warnings
const mockConsoleWarn = jest.fn();
const mockConsoleError = jest.fn();
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Component that throws WebView errors for testing
function WebViewErrorComponent({ errorType }: { errorType: 'java-gone' | 'native-bridge' | 'other' }) {
  const errors = {
    'java-gone': () => { throw new Error('Error invoking enableButtonsClickedMetaDataLogging: Java object is gone'); },
    'native-bridge': () => { throw new Error('Java object is gone when calling native method'); },
    'other': () => { throw new Error('Regular JavaScript error'); },
  };

  errors[errorType]();
  return <div>Should not render</div>;
}

describe('WebView Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.warn = mockConsoleWarn;
    console.error = mockConsoleError;
    
    // Reset window objects
    delete (window as any).Android;
    delete (window as any).ReactNativeWebView;
    delete (window as any).webkit;
    
    // Reset user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true,
    });
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('WebViewErrorBoundary', () => {
    test('should catch and handle Java object gone error silently', () => {
      const { container } = render(
        <WebViewErrorBoundary>
          <WebViewErrorComponent errorType="java-gone" />
        </WebViewErrorBoundary>
      );

      // Should not render the error component
      expect(screen.queryByText('Should not render')).not.toBeInTheDocument();
      
      // Should log a warning instead of error
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('WebView integration error detected'),
        expect.stringContaining('enableButtonsClickedMetaDataLogging')
      );
      
      // Should not have any error UI since WebView errors are handled silently
      expect(container.textContent).toBe('');
    });

    test('should catch and handle native bridge errors silently', () => {
      render(
        <WebViewErrorBoundary>
          <WebViewErrorComponent errorType="native-bridge" />
        </WebViewErrorBoundary>
      );

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('WebView integration error detected'),
        expect.stringContaining('Java object is gone')
      );
    });

    test('should display error UI for non-WebView errors', () => {
      render(
        <WebViewErrorBoundary>
          <WebViewErrorComponent errorType="other" />
        </WebViewErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    test('should use custom fallback UI when provided', () => {
      const CustomFallback = <div data-testid="custom-fallback">Custom Error UI</div>;
      
      render(
        <WebViewErrorBoundary fallback={CustomFallback}>
          <WebViewErrorComponent errorType="other" />
        </WebViewErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
  });

  describe('useWebViewErrorHandler hook', () => {
    test('should detect WebView context from Android user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.120 Mobile Safari/537.36 wv',
        configurable: true,
      });

      const { result } = renderHook(() => useWebViewErrorHandler());
      expect(result.current.isWebViewContext).toBe(true);
    });

    test('should detect WebView context from ReactNativeWebView', () => {
      (window as any).ReactNativeWebView = { postMessage: jest.fn() };

      const { result } = renderHook(() => useWebViewErrorHandler());
      expect(result.current.isWebViewContext).toBe(true);
    });

    test('should detect WebView context from Android object', () => {
      (window as any).Android = { someMethod: jest.fn() };

      const { result } = renderHook(() => useWebViewErrorHandler());
      expect(result.current.isWebViewContext).toBe(true);
    });

    test('should detect WebView context from iOS webkit messageHandlers', () => {
      (window as any).webkit = { messageHandlers: { someHandler: {} } };

      const { result } = renderHook(() => useWebViewErrorHandler());
      expect(result.current.isWebViewContext).toBe(true);
    });

    test('should not detect WebView context in regular browser', () => {
      const { result } = renderHook(() => useWebViewErrorHandler());
      expect(result.current.isWebViewContext).toBe(false);
    });

    test('should handle WebView errors and return true', () => {
      const { result } = renderHook(() => useWebViewErrorHandler());
      
      const webViewError = new Error('Error invoking enableButtonsClickedMetaDataLogging: Java object is gone');
      const handled = result.current.handleError(webViewError);

      expect(handled).toBe(true);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'WebView error handled:',
        expect.objectContaining({
          message: expect.stringContaining('enableButtonsClickedMetaDataLogging'),
        })
      );
    });

    test('should not handle non-WebView errors and return false', () => {
      const { result } = renderHook(() => useWebViewErrorHandler());
      
      const regularError = new Error('Regular JavaScript error');
      const handled = result.current.handleError(regularError);

      expect(handled).toBe(false);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe('safeNativeCall utility', () => {
    test('should execute function successfully when no error occurs', () => {
      const mockFunction = jest.fn().mockReturnValue('success');
      
      const result = safeNativeCall('testMethod', mockFunction, 'fallback');
      
      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalled();
    });

    test('should return fallback for WebView errors', () => {
      const mockFunction = jest.fn().mockImplementation(() => {
        throw new Error('Error invoking enableButtonsClickedMetaDataLogging: Java object is gone');
      });
      
      const result = safeNativeCall('enableButtonsClickedMetaDataLogging', mockFunction, 'fallback');
      
      expect(result).toBe('fallback');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('WebView method "enableButtonsClickedMetaDataLogging" failed safely'),
        expect.stringContaining('enableButtonsClickedMetaDataLogging')
      );
    });

    test('should return undefined when no fallback is provided for WebView errors', () => {
      const mockFunction = jest.fn().mockImplementation(() => {
        throw new Error('Java object is gone');
      });
      
      const result = safeNativeCall('testMethod', mockFunction);
      
      expect(result).toBeUndefined();
    });

    test('should re-throw non-WebView errors', () => {
      const mockFunction = jest.fn().mockImplementation(() => {
        throw new Error('Regular error');
      });
      
      expect(() => {
        safeNativeCall('testMethod', mockFunction, 'fallback');
      }).toThrow('Regular error');
    });
  });

  describe('isNativeMethodAvailable utility', () => {
    test('should return true for available window methods', () => {
      (window as any).testMethod = jest.fn();
      
      expect(isNativeMethodAvailable('testMethod')).toBe(true);
    });

    test('should return true for nested available methods', () => {
      (window as any).analytics = { track: jest.fn() };
      
      expect(isNativeMethodAvailable('analytics.track')).toBe(true);
    });

    test('should return false for unavailable methods', () => {
      expect(isNativeMethodAvailable('nonExistentMethod')).toBe(false);
    });

    test('should return false for non-function properties', () => {
      (window as any).notAFunction = 'string value';
      
      expect(isNativeMethodAvailable('notAFunction')).toBe(false);
    });

    test('should handle errors gracefully', () => {
      // Create a property that throws when accessed
      Object.defineProperty(window, 'throwingProperty', {
        get() { throw new Error('Access error'); },
        configurable: true,
      });
      
      expect(isNativeMethodAvailable('throwingProperty.method')).toBe(false);
    });
  });

  describe('GlobalErrorHandler integration', () => {
    test('should wrap children without errors', () => {
      render(
        <GlobalErrorHandler>
          <div>Test content</div>
        </GlobalErrorHandler>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    test('should initialize WebView error handling', () => {
      renderHook(() => useWebViewErrorHandler());
      
      // Should not throw any errors during initialization
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    test('should patch problematic methods safely', async () => {
      // Mock a problematic method
      (window as any).enableButtonsClickedMetaDataLogging = jest.fn().mockImplementation(() => {
        throw new Error('Java object is gone');
      });

      render(
        <GlobalErrorHandler>
          <div>Test content</div>
        </GlobalErrorHandler>
      );

      // Wait for patching to complete
      await new Promise(resolve => setTimeout(resolve, 1100));

      // The method should still exist but be patched
      expect(typeof (window as any).enableButtonsClickedMetaDataLogging).toBe('function');
      
      // Calling it should not throw
      expect(() => {
        (window as any).enableButtonsClickedMetaDataLogging();
      }).not.toThrow();
    });
  });

  describe('Error patterns detection', () => {
    const webViewErrorMessages = [
      'Error invoking enableButtonsClickedMetaDataLogging: Java object is gone',
      'Java object is gone when calling native method',
      'Android bridge method failed',
      'WebView native call failed',
      'Bridge method invocation failed',
    ];

    const nonWebViewErrorMessages = [
      'TypeError: Cannot read property of undefined',
      'ReferenceError: variable is not defined',
      'Network request failed',
      'Invalid JSON response',
    ];

    webViewErrorMessages.forEach(message => {
      test(`should detect "${message}" as WebView error`, () => {
        const { result } = renderHook(() => useWebViewErrorHandler());
        const error = new Error(message);
        
        expect(result.current.handleError(error)).toBe(true);
      });
    });

    nonWebViewErrorMessages.forEach(message => {
      test(`should not detect "${message}" as WebView error`, () => {
        const { result } = renderHook(() => useWebViewErrorHandler());
        const error = new Error(message);
        
        expect(result.current.handleError(error)).toBe(false);
      });
    });
  });

  describe('Real-world WebView scenarios', () => {
    test('should handle analytics tracking failure in mobile WebView', () => {
      // Simulate mobile WebView environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 wv',
        configurable: true,
      });

      const { result } = renderHook(() => useWebViewErrorHandler());
      
      const analyticsError = new Error('Error invoking enableButtonsClickedMetaDataLogging: Java object is gone');
      const handled = result.current.handleError(analyticsError);

      expect(handled).toBe(true);
      expect(result.current.isWebViewContext).toBe(true);
    });

    test('should provide safe fallback for button click tracking', () => {
      const trackButtonClick = () => {
        throw new Error('enableButtonsClickedMetaDataLogging: Java object is gone');
      };

      const result = safeNativeCall('trackButtonClick', trackButtonClick, 'tracking-disabled');
      
      expect(result).toBe('tracking-disabled');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('WebView method "trackButtonClick" failed safely')
      );
    });

    test('should handle /realtors page navigation in WebView context', () => {
      // Simulate navigation to /realtors in WebView that might trigger the error
      Object.defineProperty(window, 'location', {
        value: { pathname: '/realtors' },
        configurable: true,
      });

      render(
        <WebViewErrorBoundary>
          <GlobalErrorHandler>
            <div>Realtors page content</div>
          </GlobalErrorHandler>
        </WebViewErrorBoundary>
      );

      expect(screen.getByText('Realtors page content')).toBeInTheDocument();
    });
  });
});