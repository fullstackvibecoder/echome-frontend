'use client';

/**
 * Enhanced Social Import Modal Component
 *
 * Two sections:
 * 1. Connected Accounts - OAuth connections (Google, Meta) with sync functionality
 * 2. Import by URL - One-time imports from YouTube, Blog URLs
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';

interface SocialImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: {
    jobId: string;
    platform: string;
    contentCount?: number;
  }) => void;
  knowledgeBaseId?: string;
}

type Platform = 'youtube' | 'blog';
type ImportStatus = 'idle' | 'importing' | 'polling' | 'success' | 'error';
type SyncStatus = 'idle' | 'syncing' | 'polling' | 'success' | 'error';

interface ConnectedAccount {
  platform: 'google' | 'meta';
  connected: boolean;
  lastSync?: string;
  username?: string;
}

const PLATFORM_CONFIG: Record<Platform, {
  name: string;
  icon: string;
  placeholder: string;
  hint: string;
  color: string;
}> = {
  youtube: {
    name: 'YouTube',
    icon: '▶️',
    placeholder: 'Paste any YouTube link',
    hint: 'Works with any link format - videos, channels, playlists, or share links',
    color: 'bg-red-500',
  },
  blog: {
    name: 'Blog',
    icon: '📝',
    placeholder: 'https://yourblog.com or RSS feed URL',
    hint: 'Auto-discovers RSS/Atom feeds or sitemaps. Imports up to 100 posts.',
    color: 'bg-orange-500',
  },
};

const CONNECTED_ACCOUNT_CONFIG: Record<'google' | 'meta', {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  services: string[];
}> = {
  google: {
    name: 'Google',
    icon: '🔵',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    description: 'YouTube, Calendar, Contacts, Drive, Photos',
    services: ['YouTube', 'Calendar', 'Contacts', 'Drive', 'Photos'],
  },
  meta: {
    name: 'Meta',
    icon: '🔷',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    description: 'Facebook, Instagram',
    services: ['Facebook', 'Instagram'],
  },
};

export function SocialImportModal({
  isOpen,
  onClose,
  onImportComplete,
  knowledgeBaseId,
}: SocialImportModalProps) {
  // Connected accounts state
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([
    { platform: 'google', connected: false },
    { platform: 'meta', connected: false },
  ]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncStatus>>({});
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncPollCount, setSyncPollCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // URL import state
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [isOwnContent, setIsOwnContent] = useState(true);

  // Fetch connected accounts status
  const fetchAccountStatus = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const result = await api.social.getStatus();

      if (result.success && result.data) {
        const accounts: ConnectedAccount[] = [
          { platform: 'google', connected: false },
          { platform: 'meta', connected: false },
        ];

        for (const integration of result.data) {
          const isConnected = integration.status === 'active' || integration.status === 'connected';
          const lastSync = integration.last_sync_at || (integration.lastSynced ? String(integration.lastSynced) : undefined);
          const username = integration.platform_username || integration.accountName;

          if (integration.platform === 'google') {
            accounts[0] = {
              platform: 'google',
              connected: isConnected,
              lastSync,
              username,
            };
          }
          // Meta will come later when we add it
        }

        setConnectedAccounts(accounts);
      }
    } catch (err) {
      console.error('Failed to fetch account status:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  // Load account status when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAccountStatus();
    }
  }, [isOpen, fetchAccountStatus]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlatform(null);
      setUrl('');
      setStatus('idle');
      setError(null);
      setJobId(null);
      setPollCount(0);
      setIsOwnContent(true);
      setSyncStatus({});
      setSyncJobId(null);
      setSyncPollCount(0);
      setSyncError(null);
    }
  }, [isOpen]);

  // Poll for URL import job status
  useEffect(() => {
    if (status !== 'polling' || !jobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await api.kbContent.getSocialImportStatus(jobId);

        if (result.job) {
          if (result.job.status === 'completed') {
            setStatus('success');
            clearInterval(pollInterval);
            onImportComplete?.({
              jobId,
              platform: result.job.platform,
              contentCount: result.job.contentCount,
            });
          } else if (result.job.status === 'failed') {
            setStatus('error');
            setError(result.job.message || 'Import failed');
            clearInterval(pollInterval);
          }
        }

        setPollCount(prev => prev + 1);

        if (pollCount > 60) {
          clearInterval(pollInterval);
          setStatus('error');
          setError('Import is taking longer than expected. Check your Knowledge Base in a few minutes.');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [status, jobId, pollCount, onImportComplete]);

  // Poll for Google sync job status
  useEffect(() => {
    if (syncStatus.google !== 'polling' || !syncJobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await api.social.getGoogleSyncStatus(syncJobId);

        if (result.success && result.data) {
          if (result.data.status === 'completed') {
            setSyncStatus(prev => ({ ...prev, google: 'success' }));
            clearInterval(pollInterval);
            fetchAccountStatus(); // Refresh to get new lastSync time
            onImportComplete?.({
              jobId: syncJobId,
              platform: 'google',
              contentCount: result.data.contentCount,
            });
          } else if (result.data.status === 'failed') {
            setSyncStatus(prev => ({ ...prev, google: 'error' }));
            setSyncError(result.data.message || 'Sync failed');
            clearInterval(pollInterval);
          }
        }

        setSyncPollCount(prev => prev + 1);

        if (syncPollCount > 60) {
          clearInterval(pollInterval);
          setSyncStatus(prev => ({ ...prev, google: 'error' }));
          setSyncError('Sync is taking longer than expected. Check back in a few minutes.');
        }
      } catch (err) {
        console.error('Sync poll error:', err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [syncStatus.google, syncJobId, syncPollCount, fetchAccountStatus, onImportComplete]);

  const handleConnect = async (platform: 'google' | 'meta') => {
    try {
      setConnectingPlatform(platform);
      const result = await api.social.connect(platform);

      if (result.success && result.data?.authUrl) {
        // Redirect to OAuth
        window.location.href = result.data.authUrl;
      }
    } catch (err) {
      console.error('Connect error:', err);
      setSyncError('Failed to start connection. Please try again.');
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleSync = async (platform: 'google' | 'meta') => {
    if (platform === 'meta') {
      // Meta sync not implemented yet
      return;
    }

    try {
      setSyncStatus(prev => ({ ...prev, [platform]: 'syncing' }));
      setSyncError(null);

      const result = await api.social.syncGoogle({
        knowledgeBaseId,
      });

      if (result.success && result.data) {
        setSyncJobId(result.data.jobId);
        setSyncStatus(prev => ({ ...prev, [platform]: 'polling' }));
        setSyncPollCount(0);
      } else {
        throw new Error('Failed to start sync');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setSyncStatus(prev => ({ ...prev, [platform]: 'error' }));
      setSyncError(err instanceof Error ? err.message : 'Failed to start sync');
    }
  };

  const handleDisconnect = async (platform: 'google' | 'meta') => {
    try {
      await api.social.disconnect(platform);
      fetchAccountStatus();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const handleUrlSubmit = async () => {
    if (!selectedPlatform || !url.trim()) return;

    setStatus('importing');
    setError(null);

    try {
      const result = await api.kbContent.startSocialImport({
        platform: selectedPlatform,
        url: url.trim(),
        knowledgeBaseId,
        useForVoiceMatching: isOwnContent,
      });

      if (result.success) {
        setJobId(result.jobId);
        setStatus('polling');
      } else {
        throw new Error('Failed to start import');
      }
    } catch (err) {
      console.error('Import error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start import');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Never synced';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  const isAnySyncing = Object.values(syncStatus).some(s => s === 'syncing' || s === 'polling');
  const isUrlImporting = status === 'importing' || status === 'polling';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Import Social Content
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* ============ CONNECTED ACCOUNTS SECTION ============ */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">
              Connected Accounts
            </h3>

            {loadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {connectedAccounts.map((account) => {
                  const config = CONNECTED_ACCOUNT_CONFIG[account.platform];
                  const isSyncing = syncStatus[account.platform] === 'syncing' || syncStatus[account.platform] === 'polling';
                  const syncSuccess = syncStatus[account.platform] === 'success';

                  return (
                    <div
                      key={account.platform}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        account.connected
                          ? 'border-gray-200 dark:border-gray-600'
                          : 'border-dashed border-gray-300 dark:border-gray-600'
                      } ${config.bgColor}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{config.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {config.name}
                              </span>
                              {account.connected && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                  Connected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {config.description}
                            </p>
                            {account.connected && account.lastSync && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                Last sync: {formatLastSync(account.lastSync)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {account.connected ? (
                            <>
                              {syncSuccess ? (
                                <span className="text-green-500 text-sm flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Synced
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleSync(account.platform)}
                                  disabled={isSyncing || isUrlImporting}
                                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
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
                              )}
                              <button
                                onClick={() => handleDisconnect(account.platform)}
                                disabled={isSyncing}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Disconnect"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : account.platform === 'meta' ? (
                            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              Coming soon
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConnect(account.platform)}
                              disabled={connectingPlatform === account.platform}
                              className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                              {connectingPlatform === account.platform ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-4 h-4 border-2 border-gray-400 border-t-indigo-600 rounded-full animate-spin" />
                                  Connecting...
                                </span>
                              ) : (
                                'Connect'
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sync progress indicator */}
                      {isSyncing && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {syncPollCount < 6
                              ? 'Fetching your content from Google APIs...'
                              : syncPollCount < 18
                              ? 'Processing and indexing content...'
                              : 'Almost done...'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {syncError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm">{syncError}</p>
              </div>
            )}
          </div>

          {/* ============ DIVIDER ============ */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                or import by URL
              </span>
            </div>
          </div>

          {/* ============ URL IMPORT SECTION ============ */}
          {status === 'idle' || status === 'error' ? (
            <>
              {/* Platform Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Platform
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((platform) => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      disabled={isAnySyncing}
                      className={`
                        p-3 rounded-xl flex flex-col items-center gap-1 transition-all
                        ${selectedPlatform === platform
                          ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                        ${isAnySyncing ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <span className="text-2xl">{PLATFORM_CONFIG[platform].icon}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {PLATFORM_CONFIG[platform].name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* URL Input */}
              {selectedPlatform && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {PLATFORM_CONFIG[selectedPlatform].name} URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={PLATFORM_CONFIG[selectedPlatform].placeholder}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {PLATFORM_CONFIG[selectedPlatform].hint}
                  </p>
                </div>
              )}

              {/* Content Type Toggle */}
              {selectedPlatform && (
                <div className="mb-6">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOwnContent(!isOwnContent)}
                      className={`
                        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
                        border-2 border-transparent transition-colors duration-200 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                        ${isOwnContent ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'}
                      `}
                    >
                      <span
                        className={`
                          pointer-events-none inline-block h-5 w-5 transform rounded-full
                          bg-white shadow ring-0 transition duration-200 ease-in-out
                          ${isOwnContent ? 'translate-x-5' : 'translate-x-0'}
                        `}
                      />
                    </button>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        This is my own content
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {isOwnContent
                          ? 'Content will be used for voice matching when generating new content'
                          : 'Content will be stored as reference material only'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                           transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUrlSubmit}
                  disabled={!selectedPlatform || !url.trim() || isAnySyncing}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400
                           disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  Start Import
                </button>
              </div>
            </>
          ) : status === 'importing' || status === 'polling' ? (
            <div className="py-12 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className={`
                  w-20 h-20 rounded-full flex items-center justify-center text-3xl
                  ${selectedPlatform ? PLATFORM_CONFIG[selectedPlatform].color : 'bg-gray-200'}
                `}>
                  {selectedPlatform && PLATFORM_CONFIG[selectedPlatform].icon}
                </div>
                <svg
                  className="absolute inset-0 w-20 h-20 animate-spin"
                  viewBox="0 0 100 100"
                >
                  <circle
                    className="text-gray-200 dark:text-gray-600"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    strokeWidth="8"
                    stroke="currentColor"
                  />
                  <circle
                    className="text-indigo-600"
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    strokeWidth="8"
                    stroke="currentColor"
                    strokeDasharray="280"
                    strokeDashoffset="200"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {status === 'importing' ? 'Starting Import...' : 'Importing Content...'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {status === 'polling'
                  ? selectedPlatform === 'blog'
                    ? 'Discovering feed and fetching blog posts...'
                    : 'Analyzing content and extracting transcripts...'
                  : 'Connecting to ' + (selectedPlatform ? PLATFORM_CONFIG[selectedPlatform].name : 'platform')}
              </p>

              {status === 'polling' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                  {selectedPlatform === 'blog'
                    ? pollCount < 12
                      ? 'This usually takes 1-2 minutes'
                      : pollCount < 36
                      ? 'Processing... blogs with many posts take longer'
                      : 'Still working... almost there'
                    : pollCount < 12
                    ? 'This usually takes 1-2 minutes for single videos'
                    : pollCount < 36
                    ? 'Processing... channels and playlists take longer'
                    : 'Still working... almost there'}
                </p>
              )}
            </div>
          ) : status === 'success' ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Import Complete!
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                Content has been added to your knowledge base.
              </p>

              <button
                onClick={onClose}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg
                         transition-colors font-medium"
              >
                Done
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SocialImportModal;
