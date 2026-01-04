'use client';

/**
 * Social Import Modal Component
 *
 * Modal for importing content from social media platforms.
 * Supports YouTube (via yt-dlp) and Instagram (via Apify).
 */

import { useState, useEffect } from 'react';
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

type Platform = 'youtube' | 'instagram';
type ImportStatus = 'idle' | 'importing' | 'polling' | 'success' | 'error';

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
    placeholder: 'https://youtube.com/watch?v=... or channel URL',
    hint: 'Paste a video URL or channel URL to import transcripts',
    color: 'bg-red-500',
  },
  instagram: {
    name: 'Instagram',
    icon: '📷',
    placeholder: 'https://instagram.com/username or post URL',
    hint: 'Import captions from posts and reels',
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
  },
};

export function SocialImportModal({
  isOpen,
  onClose,
  onImportComplete,
  knowledgeBaseId,
}: SocialImportModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlatform(null);
      setUrl('');
      setStatus('idle');
      setError(null);
      setJobId(null);
      setPollCount(0);
    }
  }, [isOpen]);

  // Poll for job status
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

        // Stop polling after 2 minutes (24 polls at 5 second intervals)
        if (pollCount > 24) {
          clearInterval(pollInterval);
          setStatus('error');
          setError('Import is taking longer than expected. Check back later.');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [status, jobId, pollCount, onImportComplete]);

  const handleSubmit = async () => {
    if (!selectedPlatform || !url.trim()) return;

    setStatus('importing');
    setError(null);

    try {
      const result = await api.kbContent.startSocialImport({
        platform: selectedPlatform,
        url: url.trim(),
        knowledgeBaseId,
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Import from Social Media
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
                      className={`
                        p-3 rounded-xl flex flex-col items-center gap-1 transition-all
                        ${selectedPlatform === platform
                          ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
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
                  onClick={handleSubmit}
                  disabled={!selectedPlatform || !url.trim()}
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
                {/* Platform icon */}
                <div className={`
                  w-20 h-20 rounded-full flex items-center justify-center text-3xl
                  ${selectedPlatform ? PLATFORM_CONFIG[selectedPlatform].color : 'bg-gray-200'}
                `}>
                  {selectedPlatform && PLATFORM_CONFIG[selectedPlatform].icon}
                </div>
                {/* Spinner overlay */}
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
                  ? 'This may take a few minutes. Please wait...'
                  : 'Connecting to ' + (selectedPlatform ? PLATFORM_CONFIG[selectedPlatform].name : 'platform')}
              </p>

              {status === 'polling' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                  Checking status... ({pollCount}/24)
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
