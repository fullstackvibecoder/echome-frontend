'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';

interface ConnectedAccount {
  platform: 'google' | 'meta';
  connected: boolean;
  lastSync?: string;
  username?: string;
  status?: string;
}

interface SyncJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  contentCount?: number;
  message?: string;
}

const ACCOUNT_CONFIG = {
  google: {
    name: 'Google',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    color: '#4285F4',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Access your content from Google services',
    services: [
      { name: 'YouTube', icon: '🎥', description: 'Videos, playlists, subscriptions' },
      { name: 'Calendar', icon: '📅', description: 'Events and schedules' },
      { name: 'Contacts', icon: '👥', description: 'Contact information' },
      { name: 'Drive', icon: '📁', description: 'Document metadata' },
      { name: 'Photos', icon: '🖼️', description: 'Photo albums and memories' },
    ],
  },
  meta: {
    name: 'Meta',
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#0866FF">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
    ),
    color: '#0866FF',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    description: 'Access your content from Meta platforms',
    services: [
      { name: 'Facebook', icon: '📘', description: 'Posts and pages' },
      { name: 'Instagram', icon: '📷', description: 'Posts and stories' },
    ],
    comingSoon: true,
  },
};

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([
    { platform: 'google', connected: false },
    { platform: 'meta', connected: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncJob, setSyncJob] = useState<SyncJob | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check URL params for OAuth result
  useEffect(() => {
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const message = searchParams.get('message');

    if (status === 'success' && platform) {
      setToast({ type: 'success', message: `Successfully connected to ${platform}! Your content will be synced to your knowledge base.` });
      // Auto-clear URL params
      window.history.replaceState({}, '', '/app/integrations');
      // Trigger sync
      handleSync(platform as 'google' | 'meta');
    } else if (status === 'error') {
      setToast({ type: 'error', message: message || 'Connection failed. Please try again.' });
      window.history.replaceState({}, '', '/app/integrations');
    }
  }, [searchParams]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch integration status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.social.getStatus();

      if (result.success && result.data) {
        const updatedAccounts: ConnectedAccount[] = [
          { platform: 'google', connected: false },
          { platform: 'meta', connected: false },
        ];

        for (const integration of result.data) {
          if (integration.platform === 'google') {
            updatedAccounts[0] = {
              platform: 'google',
              connected: integration.status === 'active' || integration.status === 'connected',
              lastSync: integration.last_sync_at,
              username: integration.platform_username,
              status: integration.status,
            };
          }
          // Meta will be added when implemented
        }

        setAccounts(updatedAccounts);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll sync job status
  useEffect(() => {
    if (!syncJob || syncJob.status === 'completed' || syncJob.status === 'failed') return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await api.social.getGoogleSyncStatus(syncJob.jobId);
        if (result.success && result.data) {
          setSyncJob(result.data);

          if (result.data.status === 'completed') {
            setSyncing(null);
            setToast({
              type: 'success',
              message: `Synced ${result.data.contentCount || 0} items to your knowledge base!`,
            });
            fetchStatus();
          } else if (result.data.status === 'failed') {
            setSyncing(null);
            setToast({
              type: 'error',
              message: result.data.message || 'Sync failed. Please try again.',
            });
          }
        }
      } catch (error) {
        console.error('Failed to poll sync status:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [syncJob, fetchStatus]);

  const handleConnect = async (platform: 'google' | 'meta') => {
    if (platform === 'meta') {
      setToast({ type: 'error', message: 'Meta integration coming soon!' });
      return;
    }

    try {
      setConnecting(platform);
      const result = await api.social.connect(platform);

      if (result.success && result.data?.authUrl) {
        // Redirect to OAuth - full page redirect for Google
        window.location.href = result.data.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Connect error:', error);
      setToast({ type: 'error', message: 'Failed to start connection. Please try again.' });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: 'google' | 'meta') => {
    if (!confirm(`Are you sure you want to disconnect ${ACCOUNT_CONFIG[platform].name}?`)) {
      return;
    }

    try {
      await api.social.disconnect(platform);
      setToast({ type: 'success', message: `Disconnected from ${ACCOUNT_CONFIG[platform].name}` });
      fetchStatus();
    } catch (error) {
      console.error('Disconnect error:', error);
      setToast({ type: 'error', message: 'Failed to disconnect. Please try again.' });
    }
  };

  const handleSync = async (platform: 'google' | 'meta') => {
    if (platform !== 'google') return;

    try {
      setSyncing(platform);
      const result = await api.social.syncGoogle();

      if (result.success && result.data) {
        setSyncJob(result.data);
      } else {
        throw new Error('Failed to start sync');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncing(null);
      setToast({ type: 'error', message: 'Failed to start sync. Please try again.' });
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Never synced';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">{toast.type === 'success' ? '✓' : '✕'}</span>
            <p className="text-sm">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Connected Accounts
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your accounts to sync content into your knowledge base for AI-powered generation
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Account Cards */}
      {!loading && (
        <div className="space-y-6">
          {accounts.map((account) => {
            const config = ACCOUNT_CONFIG[account.platform];
            const isConnected = account.connected;
            const isSyncing = syncing === account.platform;
            const isConnecting = connecting === account.platform;
            const isComingSoon = 'comingSoon' in config && config.comingSoon;

            return (
              <div
                key={account.platform}
                className={`rounded-xl border-2 p-6 transition-all ${
                  isConnected
                    ? `${config.bgColor} ${config.borderColor}`
                    : isComingSoon
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">{config.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {config.name}
                        </h2>
                        {isConnected && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            Connected
                          </span>
                        )}
                        {isComingSoon && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <button
                          onClick={() => handleSync(account.platform)}
                          disabled={isSyncing}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            isSyncing
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {isSyncing ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              Syncing...
                            </span>
                          ) : (
                            'Sync Now'
                          )}
                        </button>
                        <button
                          onClick={() => handleDisconnect(account.platform)}
                          disabled={isSyncing}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Disconnect"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : !isComingSoon ? (
                      <button
                        onClick={() => handleConnect(account.platform)}
                        disabled={isConnecting}
                        className="px-4 py-2 text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        {isConnecting ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-gray-400 border-t-indigo-600 rounded-full animate-spin" />
                            Connecting...
                          </span>
                        ) : (
                          'Connect'
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Sync Progress */}
                {isSyncing && syncJob && (
                  <div className="mb-4 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {syncJob.status === 'pending' && 'Starting sync...'}
                      {syncJob.status === 'processing' && 'Fetching and processing your content...'}
                    </p>
                  </div>
                )}

                {/* Last Sync Info */}
                {isConnected && account.lastSync && (
                  <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Last synced: {formatLastSync(account.lastSync)}
                  </div>
                )}

                {/* Services */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {config.services.map((service) => (
                    <div
                      key={service.name}
                      className={`p-3 rounded-lg text-center transition-colors ${
                        isConnected
                          ? 'bg-white/60 dark:bg-gray-900/40'
                          : 'bg-gray-50 dark:bg-gray-700/50'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{service.icon}</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                        {service.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
                        {service.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
          How it works
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Connect your accounts securely via OAuth</li>
          <li>• Your content is synced to your private knowledge base</li>
          <li>• AI uses this to match your voice and style when generating content</li>
          <li>• Sync anytime to keep your knowledge base updated</li>
        </ul>
      </div>
    </div>
  );
}

// Wrap in Suspense to handle useSearchParams (required by Next.js 16)
export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}
