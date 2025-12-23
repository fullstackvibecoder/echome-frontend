'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { SocialIntegration } from '@/types';

interface UseSocialIntegrationReturn {
  integrations: SocialIntegration[];
  loading: boolean;
  error: string | null;
  connect: (platform: string) => Promise<void>;
  disconnect: (platform: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSocialIntegration(): UseSocialIntegrationReturn {
  const [integrations, setIntegrations] = useState<SocialIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.social.getStatus();
      if (response.success && response.data) {
        setIntegrations(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();

    // Listen for OAuth completion events
    const handleOAuthComplete = () => {
      fetchIntegrations();
    };

    window.addEventListener('oauth-complete', handleOAuthComplete);
    return () => {
      window.removeEventListener('oauth-complete', handleOAuthComplete);
    };
  }, [fetchIntegrations]);

  const connect = useCallback(async (platform: string) => {
    try {
      setError(null);
      await api.social.connect(platform);
      await fetchIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      throw err;
    }
  }, [fetchIntegrations]);

  const disconnect = useCallback(async (platform: string) => {
    try {
      setError(null);
      await api.social.disconnect(platform);
      await fetchIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
      throw err;
    }
  }, [fetchIntegrations]);

  return {
    integrations,
    loading,
    error,
    connect,
    disconnect,
    refresh: fetchIntegrations,
  };
}
