/**
 * Settings Page Timeout Handling Tests
 * 
 * Tests for enhanced timeout handling on the /app/settings page
 * to prevent 15-second timeout errors from affecting user experience.
 * 
 * Regression test for Sentry issue:
 * https://sentry.io/organizations/bottleneck-labs/issues/113376796
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { api } from '@/lib/api-client';
import SettingsContent from '@/app/app/settings/SettingsContent';

// Mock all the dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useSubscription');
jest.mock('@/lib/api-client');
jest.mock('@/lib/supabase');

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;
const mockApi = api as jest.Mocked<typeof api>;

import { toast } from 'sonner';

describe('Settings Page Timeout Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: { 
        id: 'test-user', 
        email: 'test@example.com',
        name: 'Test User'
      },
      loading: false,
    } as any);

    mockUseSubscription.mockReturnValue({
      isFreeUser: true,
      tier: 'free',
    } as any);

    // Default successful API responses
    mockApi.auth.getProfile.mockResolvedValue({
      success: true,
      data: {
        display_name: 'Test User',
        full_name: 'Test User',
        email: 'test@example.com',
        bio: 'Test bio',
        twitter_handle: 'testuser',
        instagram_handle: 'testuser',
        website_url: 'https://test.com',
        profile_role: 'Test role',
        profile_topics: 'Test topics',
        profile_cta: 'Test CTA',
        profile_guardrails: 'Test guardrails',
        email_notifications: true,
        weekly_digest: false,
        theme: 'light',
      } as any,
    });

    mockApi.stripe.getUsageLimits.mockResolvedValue({
      success: true,
      data: {
        tier: 'free',
        generationsUsed: 1,
        generationsLimit: 2,
        generationsRemaining: 1,
        isUnlimited: false,
      } as any,
    });

    mockApi.auth.updateProfile.mockResolvedValue({
      success: true,
      data: {} as any,
    });

    mockApi.auth.uploadProfileImage.mockResolvedValue({
      success: true,
      data: { profile_image_url: 'https://example.com/image.jpg' },
    });

    mockApi.stripe.getPortalUrl.mockResolvedValue({
      success: true,
      data: { url: 'https://billing.stripe.com/portal' },
    });
  });

  describe('Profile Loading Timeout', () => {
    test('should handle getProfile timeout gracefully', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      
      mockApi.auth.getProfile.mockRejectedValue(timeoutError);

      render(<SettingsContent />);

      await waitFor(() => {
        expect(screen.getByText(/Loading profile timed out/)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText('Retry')).toBeInTheDocument();
      
      // Test retry functionality
      mockApi.auth.getProfile.mockResolvedValue({
        success: true,
        data: { display_name: 'Test User' } as any,
      });

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(mockApi.auth.getProfile).toHaveBeenCalledTimes(2);
      });
    });

    test('should handle network errors differently from timeouts', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ERR_NETWORK';
      
      mockApi.auth.getProfile.mockRejectedValue(networkError);

      render(<SettingsContent />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load profile/)).toBeInTheDocument();
        expect(screen.queryByText(/timed out/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Profile Update Timeout', () => {
    test('should handle updateProfile timeout with helpful message', async () => {
      render(<SettingsContent />);

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Mock timeout error for update
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.auth.updateProfile.mockRejectedValue(timeoutError);

      // Update display name
      const nameInput = screen.getByDisplayValue('Test User');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      // Save profile
      fireEvent.click(screen.getByText('Save Profile'));

      await waitFor(() => {
        expect(screen.getByText(/Profile update timed out/)).toBeInTheDocument();
      });
    });

    test('should show success toast on successful update', async () => {
      render(<SettingsContent />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

      fireEvent.click(screen.getByText('Save Profile'));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!');
      });
    });
  });

  describe('Image Upload Timeout', () => {
    test('should handle uploadProfileImage timeout', async () => {
      render(<SettingsContent />);

      await waitFor(() => {
        expect(screen.getByText('Upload Image')).toBeInTheDocument();
      });

      // Mock timeout error
      const timeoutError = new Error('timeout of 60000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.auth.uploadProfileImage.mockRejectedValue(timeoutError);

      // Create a file input event
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/Image upload timed out/)).toBeInTheDocument();
      });
    });

    test('should handle successful image upload', async () => {
      render(<SettingsContent />);

      await waitFor(() => {
        expect(screen.getByText('Upload Image')).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Profile image updated successfully!');
      });
    });

    test('should validate file size and type', async () => {
      render(<SettingsContent />);

      await waitFor(() => {
        expect(screen.getByText('Upload Image')).toBeInTheDocument();
      });

      // Test large file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/Image must be less than 5MB/)).toBeInTheDocument();
      });

      // Test invalid file type
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [textFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/Please select an image file/)).toBeInTheDocument();
      });
    });
  });

  describe('Preferences Timeout', () => {
    test('should handle preference update timeout and revert state', async () => {
      render(<SettingsContent />);

      // Switch to preferences tab
      fireEvent.click(screen.getByText('Preferences'));

      await waitFor(() => {
        expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      });

      // Mock timeout error
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.auth.updateProfile.mockRejectedValue(timeoutError);

      // Toggle email notifications
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(screen.getByText(/Preference update timed out/)).toBeInTheDocument();
      });
    });

    test('should show success toast for preference updates', async () => {
      render(<SettingsContent />);

      fireEvent.click(screen.getByText('Preferences'));

      await waitFor(() => {
        expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      });

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Preference updated!');
      });
    });
  });

  describe('Billing Operations Timeout', () => {
    test('should handle usage loading timeout', async () => {
      const timeoutError = new Error('timeout of 45000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.stripe.getUsageLimits.mockRejectedValue(timeoutError);

      render(<SettingsContent />);

      // Switch to billing tab
      fireEvent.click(screen.getByText('Billing'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Loading took longer than expected. Please try refreshing the page.',
          expect.objectContaining({
            action: expect.objectContaining({
              label: 'Refresh'
            })
          })
        );
      });
    });

    test('should handle billing portal timeout', async () => {
      // Set up paid user
      mockUseSubscription.mockReturnValue({
        isFreeUser: false,
        tier: 'pro',
      } as any);

      mockApi.stripe.getUsageLimits.mockResolvedValue({
        success: true,
        data: {
          tier: 'pro',
          isUnlimited: true,
        } as any,
      });

      const timeoutError = new Error('timeout of 45000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.stripe.getPortalUrl.mockRejectedValue(timeoutError);

      render(<SettingsContent />);

      fireEvent.click(screen.getByText('Billing'));

      await waitFor(() => {
        expect(screen.getByText('Open Billing Portal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Open Billing Portal'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Billing portal is taking longer than expected to load. Please try again in a moment.'
        );
      });
    });

    test('should handle successful billing portal access', async () => {
      mockUseSubscription.mockReturnValue({
        isFreeUser: false,
        tier: 'pro',
      } as any);

      mockApi.stripe.getUsageLimits.mockResolvedValue({
        success: true,
        data: { tier: 'pro', isUnlimited: true } as any,
      });

      // Mock window.location
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(<SettingsContent />);

      fireEvent.click(screen.getByText('Billing'));

      await waitFor(() => {
        expect(screen.getByText('Open Billing Portal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Open Billing Portal'));

      await waitFor(() => {
        expect(window.location.href).toBe('https://billing.stripe.com/portal');
      });
    });
  });

  describe('Tab Navigation and State Management', () => {
    test('should load data when switching to billing tab', async () => {
      render(<SettingsContent />);

      // Initially on profile tab, usage should not be loaded
      expect(mockApi.stripe.getUsageLimits).not.toHaveBeenCalled();

      // Switch to billing tab
      fireEvent.click(screen.getByText('Billing'));

      // Usage should be loaded
      await waitFor(() => {
        expect(mockApi.stripe.getUsageLimits).toHaveBeenCalled();
      });
    });

    test('should handle tab switching while operations are in progress', async () => {
      render(<SettingsContent />);

      // Start profile update
      const nameInput = screen.getByDisplayValue('Test User');
      fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
      fireEvent.click(screen.getByText('Save Profile'));

      // Switch tabs immediately
      fireEvent.click(screen.getByText('Billing'));

      // Should not interfere with the ongoing operation
      await waitFor(() => {
        expect(mockApi.auth.updateProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Error Recovery and User Guidance', () => {
    test('should provide actionable error messages for timeouts', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      mockApi.auth.getProfile.mockRejectedValue(timeoutError);

      render(<SettingsContent />);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Loading profile timed out/);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage.textContent).toContain('refresh the page');
      });
    });

    test('should handle multiple timeout scenarios gracefully', async () => {
      const timeoutError = new Error('timeout exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      mockApi.auth.getProfile.mockRejectedValue(timeoutError);
      mockApi.stripe.getUsageLimits.mockRejectedValue(timeoutError);

      render(<SettingsContent />);

      // Should handle profile timeout
      await waitFor(() => {
        expect(screen.getByText(/Loading profile timed out/)).toBeInTheDocument();
      });

      // Switch to billing and should handle usage timeout
      fireEvent.click(screen.getByText('Billing'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('longer than expected')
        );
      });
    });
  });
});