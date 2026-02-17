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
import { extractErrorMessage } from '@/lib/error-utils';
import { showErrorToast } from '@/lib/toast';

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
type ImportStatus = 'idle' | 'importing' | 'error';
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
      setIsOwnContent(true);
      setSyncStatus({});
      setSyncJobId(null);
      setSyncPollCount(0);
      setSyncError(null);
    }
  }, [isOpen]);

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
      const msg = extractErrorMessage(err, 'Failed to start connection. Please try again.');
      setSyncError(msg);
      showErrorToast(err, 'connecting account');
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
      const msg = extractErrorMessage(err, 'Failed to start sync');
      setSyncError(msg);
      showErrorToast(err, 'syncing content');
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
      let normalizedUrl = url.trim();
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      const result = await api.kbContent.startSocialImport({
        platform: selectedPlatform,
        url: normalizedUrl,
        knowledgeBaseId,
        useForVoiceMatching: isOwnContent,
      });

      if (result.success) {
        onImportComplete?.({
          jobId: result.jobId,
          platform: selectedPlatform,
        });
        onClose();
      } else {
        throw new Error('Failed to start import');
      }
    } catch (err) {
      console.error('Import error:', err);
      setStatus('error');
      setError(extractErrorMessage(err, 'Failed to start import'));
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
          {/* ============ URL IMPORT SECTION ============ */}
          {(status === 'idle' || status === 'error') && (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default SocialImportModal;
