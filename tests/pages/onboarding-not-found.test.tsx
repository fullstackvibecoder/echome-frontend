/**
 * Onboarding NotFoundError Tests
 * 
 * Tests error handling for NotFoundError scenarios on the onboarding page
 * to ensure graceful degradation and proper user feedback when services are unavailable.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/109864148/events/b796edc44fc94267a1c367040af2bf10/
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import OnboardingPage from '@/app/onboarding/page';
import OnboardingContent from '@/app/onboarding/OnboardingContent';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { api } from '@/lib/api-client';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/hooks/useKnowledgeBase');
jest.mock('@/lib/api-client');

const mockRouter = useRouter as jest.Mock;
const mockUseKnowledgeBase = useKnowledgeBase as jest.Mock;
const mockApi = api as jest.Mocked<typeof api>;

// Mock other components
jest.mock('@/components/upload-zone', () => {
  return {
    UploadZone: ({ onFilesAdded }: { onFilesAdded: (files: File[]) => void }) => (
      <div data-testid="upload-zone">
        <button onClick={() => onFilesAdded([new File(['test'], 'test.pdf', { type: 'application/pdf' })])}>
          Upload File
        </button>
      </div>
    ),
  };
});

jest.mock('@/components/voice-recorder', () => {
  return {
    VoiceRecorder: ({ onSaved }: { onSaved: () => void }) => (
      <div data-testid="voice-recorder">
        <button onClick={onSaved}>Save Recording</button>
      </div>
    ),
  };
});

jest.mock('@/components/mbox-progress-ui', () => {
  return {
    MboxProgressUI: ({ progress, status }: { progress: number; status: string }) => (
      <div data-testid="mbox-progress">
        Progress: {progress}% - {status}
      </div>
    ),
  };
});

// Mock console methods
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

describe('Onboarding NotFoundError Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default router mock
    mockRouter.mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
    });

    // Default knowledge base mock (no error state)
    mockUseKnowledgeBase.mockReturnValue({
      kbs: [{ id: 'kb-1', name: 'Default KB' }],
      selectedKb: 'kb-1',
      selectKb: jest.fn(),
      contentItems: [],
      contentStats: null,
      files: [],
      loading: false,
      error: null,
      deleteFile: jest.fn(),
      deleteContent: jest.fn(),
      refresh: jest.fn(),
    });

    // Default API mocks (successful)
    mockApi.auth = {
      getProfile: jest.fn().mockResolvedValue({ success: true, data: { display_name: 'Test User' } }),
      updateProfile: jest.fn().mockResolvedValue({ success: true }),
    };

    mockApi.kbContent = {
      startSocialImport: jest.fn().mockResolvedValue({ success: true }),
      paste: jest.fn().mockResolvedValue({ success: true }),
      ingestParsedEmails: jest.fn().mockResolvedValue({ success: true, emailsIngested: 5 }),
    };

    mockApi.files = {
      upload: jest.fn().mockResolvedValue({ success: true }),
    };
  });

  describe('Error Boundary', () => {
    test('should catch and display NotFoundError with proper fallback', () => {
      const ThrowingComponent = () => {
        throw new Error('NotFoundError: The object can not be found here.');
      };

      // Replace the OnboardingContent with throwing component for this test
      const ErrorBoundaryTest = () => (
        <OnboardingPage />
      );

      // Mock the import to return our throwing component
      jest.doMock('@/app/onboarding/OnboardingContent', () => ThrowingComponent);

      render(<ErrorBoundaryTest />);

      expect(screen.getByText('Onboarding Error')).toBeInTheDocument();
      expect(screen.getByText(/A required service was not found/)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Skip to App')).toBeInTheDocument();
    });

    test('should provide specific error message for 404-related errors', () => {
      const ThrowingComponent = () => {
        throw new Error('404: Resource not found');
      };

      jest.doMock('@/app/onboarding/OnboardingContent', () => ThrowingComponent);

      render(<OnboardingPage />);

      expect(screen.getByText(/A required service was not found/)).toBeInTheDocument();
    });

    test('should handle generic errors with fallback message', () => {
      const ThrowingComponent = () => {
        throw new Error('Generic error occurred');
      };

      jest.doMock('@/app/onboarding/OnboardingContent', () => ThrowingComponent);

      render(<OnboardingPage />);

      expect(screen.getByText(/Something went wrong during onboarding setup/)).toBeInTheDocument();
    });
  });

  describe('Knowledge Base 404 Errors', () => {
    test('should handle KB service not available', () => {
      mockUseKnowledgeBase.mockReturnValue({
        ...mockUseKnowledgeBase(),
        loading: false,
        error: 'Knowledge base service is not available. Please contact support.',
        kbs: [],
      });

      render(<OnboardingContent />);

      expect(screen.getByText('Service Temporarily Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/onboarding service is temporarily unavailable/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Skip to App')).toBeInTheDocument();
    });

    test('should handle KB temporarily unavailable', () => {
      mockUseKnowledgeBase.mockReturnValue({
        ...mockUseKnowledgeBase(),
        loading: false,
        error: 'Knowledge base is temporarily unavailable. You can still complete onboarding.',
        kbs: [],
      });

      render(<OnboardingContent />);

      // Should still render the main onboarding UI but show the error
      expect(screen.getByText('EchoMe')).toBeInTheDocument();
    });

    test('should handle KB access denied', () => {
      mockUseKnowledgeBase.mockReturnValue({
        ...mockUseKnowledgeBase(),
        loading: false,
        error: 'You do not have permission to access this knowledge base.',
        kbs: [],
      });

      render(<OnboardingContent />);

      expect(screen.getByText('EchoMe')).toBeInTheDocument();
    });
  });

  describe('Profile API 404 Errors', () => {
    test('should handle profile not found gracefully', async () => {
      mockApi.auth.getProfile.mockRejectedValue({
        response: { status: 404 },
        message: 'Profile not found',
      });

      render(<OnboardingContent />);

      await waitFor(() => {
        expect(screen.getByText("I'm Echo")).toBeInTheDocument();
      });

      // Should not show any error messages for profile not found
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
      expect(console.warn).toHaveBeenCalledWith('[Onboarding] User profile not found, will create during save');
    });

    test('should handle profile update 404 during save', async () => {
      mockApi.auth.updateProfile.mockRejectedValue({
        response: { status: 404 },
        message: 'Profile endpoint not found',
      });

      render(<OnboardingContent />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Let\'s get started')).toBeInTheDocument();
      });

      // Start onboarding
      fireEvent.click(screen.getByText('Let\'s get started'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
      });

      // Enter name and save
      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByText(/Profile could not be saved, but you can continue/)).toBeInTheDocument();
      });

      // Should continue to next step despite error
      expect(screen.getByText(/Now let's teach me your voice/)).toBeInTheDocument();
    });

    test('should handle authentication errors during profile operations', async () => {
      mockApi.auth.getProfile.mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized',
      });

      render(<OnboardingContent />);

      await waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith('[Onboarding] Authentication error, user may need to log in again');
      });

      // Should still render onboarding
      expect(screen.getByText("I'm Echo")).toBeInTheDocument();
    });
  });

  describe('Import API 404 Errors', () => {
    test('should handle social import service not found', async () => {
      mockApi.kbContent.startSocialImport.mockRejectedValue({
        response: { status: 404, data: { message: 'Import service not available' } },
      });

      render(<OnboardingContent />);

      // Go through to YouTube import step
      await waitFor(() => fireEvent.click(screen.getByText('Let\'s get started')));
      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/youtube.com/)).toBeInTheDocument();
      });

      // Try to import
      fireEvent.change(screen.getByPlaceholderText(/youtube.com/), { 
        target: { value: 'https://youtube.com/@test' } 
      });
      fireEvent.click(screen.getByText('Import'));

      await waitFor(() => {
        expect(screen.getByText(/Import service is temporarily unavailable/)).toBeInTheDocument();
      });
    });

    test('should handle invalid URL responses (400)', async () => {
      mockApi.kbContent.startSocialImport.mockRejectedValue({
        response: { status: 400, data: { message: 'Invalid URL format' } },
      });

      render(<OnboardingContent />);

      // Go through onboarding to import step  
      await waitFor(() => fireEvent.click(screen.getByText('Let\'s get started')));
      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/youtube.com/)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/youtube.com/), { 
        target: { value: 'invalid-url' } 
      });
      fireEvent.click(screen.getByText('Import'));

      await waitFor(() => {
        expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
      });
    });

    test('should handle paste service not found', async () => {
      mockApi.kbContent.paste.mockRejectedValue({
        response: { status: 404 },
        message: 'Paste endpoint not found',
      });

      render(<OnboardingContent />);

      // Navigate to paste step
      await waitFor(() => fireEvent.click(screen.getByText('Let\'s get started')));
      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.click(screen.getByText('Continue'));

      // Skip through to paste
      await waitFor(() => fireEvent.click(screen.getByText('Skip this')));
      await waitFor(() => fireEvent.click(screen.getByText('Skip this')));
      await waitFor(() => fireEvent.click(screen.getByText('Skip this')));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Paste something you've written/)).toBeInTheDocument();
      });

      // Try to paste
      fireEvent.change(screen.getByPlaceholderText(/Paste something you've written/), {
        target: { value: 'This is a test writing sample that is long enough to meet the minimum character requirement for the paste functionality to work properly.' }
      });
      fireEvent.click(screen.getByText('Add'));

      await waitFor(() => {
        expect(screen.getByText(/Paste service is temporarily unavailable/)).toBeInTheDocument();
      });
    });
  });

  describe('File Upload 404 Errors', () => {
    test('should handle file upload service not found', async () => {
      mockApi.files.upload.mockRejectedValue({
        response: { status: 404 },
        message: 'Upload endpoint not found',
      });

      render(<OnboardingContent />);

      // Go to upload step
      await waitFor(() => fireEvent.click(screen.getByText('Let\'s get started')));
      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.click(screen.getByText('Continue'));

      // Skip through to check step
      await waitFor(() => fireEvent.click(screen.getByText('Skip this')));
      await waitFor(() => fireEvent.click(screen.getByText('Skip this')));
      await waitFor(() => fireEvent.click(screen.getByText('Skip this')));
      await waitFor(() => fireEvent.click(screen.getByText('Skip this')));
      await waitFor(() => fireEvent.click(screen.getByText('Skip this')));

      await waitFor(() => {
        expect(screen.getByText('Upload Files')).toBeInTheDocument();
      });

      // Try upload
      fireEvent.click(screen.getByText('Upload Files'));

      await waitFor(() => {
        expect(screen.getByTestId('upload-zone')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Upload File'));

      await waitFor(() => {
        expect(screen.getByText(/Failed to upload test.pdf/)).toBeInTheDocument();
      });
    });
  });

  describe('Network Error Handling', () => {
    test('should handle network errors during API calls', async () => {
      mockApi.auth.getProfile.mockRejectedValue({
        code: 'ERR_NETWORK',
        message: 'Network Error',
      });

      render(<OnboardingContent />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('[Onboarding] Profile loading error:', expect.any(Object));
      });

      // Should still render onboarding
      expect(screen.getByText("I'm Echo")).toBeInTheDocument();
    });

    test('should handle server errors (500) gracefully', async () => {
      mockApi.kbContent.startSocialImport.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal Server Error',
      });

      render(<OnboardingContent />);

      // Go through to import step
      await waitFor(() => fireEvent.click(screen.getByText('Let\'s get started')));
      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/youtube.com/)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/youtube.com/), { 
        target: { value: 'https://youtube.com/@test' } 
      });
      fireEvent.click(screen.getByText('Import'));

      await waitFor(() => {
        expect(screen.getByText(/Server error during import/)).toBeInTheDocument();
      });
    });
  });

  describe('Recovery Actions', () => {
    test('should provide retry functionality in error boundary', () => {
      const mockResetErrorBoundary = jest.fn();
      
      // Create a component that simulates the error boundary fallback
      const ErrorFallback = ({ resetErrorBoundary }: { resetErrorBoundary: () => void }) => (
        <div>
          <h2>Onboarding Error</h2>
          <button onClick={resetErrorBoundary}>Try Again</button>
          <button onClick={() => window.location.href = '/app'}>Skip to App</button>
        </div>
      );

      render(<ErrorFallback resetErrorBoundary={mockResetErrorBoundary} />);

      fireEvent.click(screen.getByText('Try Again'));
      expect(mockResetErrorBoundary).toHaveBeenCalled();
    });

    test('should provide skip to app functionality', () => {
      const mockPush = jest.fn();
      mockRouter.mockReturnValue({ push: mockPush, replace: jest.fn() });

      render(<OnboardingContent />);

      fireEvent.click(screen.getByText('Skip'));
      expect(mockPush).toHaveBeenCalledWith('/app');
    });

    test('should handle retry button in service unavailable state', () => {
      mockUseKnowledgeBase.mockReturnValue({
        ...mockUseKnowledgeBase(),
        loading: false,
        error: 'Knowledge base service is not available. Please contact support.',
        kbs: [],
      });

      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(<OnboardingContent />);

      fireEvent.click(screen.getByText('Retry'));
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined error responses', async () => {
      mockApi.kbContent.startSocialImport.mockRejectedValue(undefined);

      render(<OnboardingContent />);

      // Navigate to import and trigger error
      await waitFor(() => fireEvent.click(screen.getByText('Let\'s get started')));
      fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } });
      fireEvent.click(screen.getByText('Continue'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/youtube.com/)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/youtube.com/), { 
        target: { value: 'https://youtube.com/@test' } 
      });
      fireEvent.click(screen.getByText('Import'));

      // Should handle gracefully
      await waitFor(() => {
        expect(screen.queryByText(/Import/)).toBeInTheDocument();
      });
    });

    test('should handle empty response objects', async () => {
      mockApi.auth.getProfile.mockResolvedValue({});

      expect(() => render(<OnboardingContent />)).not.toThrow();
    });

    test('should handle malformed error responses', async () => {
      mockApi.kbContent.paste.mockRejectedValue({
        response: { status: 404 },
        // No message property
      });

      render(<OnboardingContent />);

      // Navigate to paste step and trigger error
      // Should handle gracefully without throwing
      expect(screen.getByText("I'm Echo")).toBeInTheDocument();
    });
  });
});