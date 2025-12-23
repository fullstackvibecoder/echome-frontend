'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api-client';

interface UseResultsFeedbackReturn {
  sendFeedback: (contentId: string, liked: boolean) => Promise<void>;
  copyToClipboard: (content: string) => Promise<boolean>;
}

export function useResultsFeedback(): UseResultsFeedbackReturn {
  const sendFeedback = useCallback(
    async (contentId: string, liked: boolean) => {
      try {
        const feedback = liked ? 'good' : 'bad';
        await api.generation.provideFeedback(contentId, feedback);
      } catch (error) {
        console.error('Failed to send feedback:', error);
      }
    },
    []
  );

  const copyToClipboard = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  return {
    sendFeedback,
    copyToClipboard,
  };
}
