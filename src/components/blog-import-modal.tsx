'use client';

/**
 * Blog Import Modal Component
 *
 * Modal for importing content from blogs via RSS/Atom feeds or sitemaps.
 */

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';

interface BlogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (result: {
    jobId: string;
    platform: string;
    contentCount?: number;
  }) => void;
  knowledgeBaseId?: string;
}

type ImportStatus = 'idle' | 'importing' | 'polling' | 'success' | 'error';

export function BlogImportModal({
  isOpen,
  onClose,
  onImportComplete,
  knowledgeBaseId,
}: BlogImportModalProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [isOwnContent, setIsOwnContent] = useState(true);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setStatus('idle');
      setError(null);
      setJobId(null);
      setPollCount(0);
      setIsOwnContent(true);
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

        // Stop polling after 5 minutes
        if (pollCount > 60) {
          clearInterval(pollInterval);
          setStatus('error');
          setError('Import is taking longer than expected. The job is still processing in the background - check your Knowledge Base in a few minutes.');
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [status, jobId, pollCount, onImportComplete]);

  const handleSubmit = async () => {
    if (!url.trim()) return;

    setStatus('importing');
    setError(null);

    try {
      const result = await api.kbContent.startSocialImport({
        platform: 'blog',
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-2xl">📝</span>
            Import from Blog
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
              {/* Info */}
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Enter your blog URL and we&apos;ll automatically discover your RSS feed or sitemap to import up to 100 posts.
                </p>
              </div>

              {/* URL Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Blog URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourblog.com or https://yourblog.com/feed"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Works with WordPress, Ghost, Substack, Medium, and most blogs with RSS/Atom feeds
                </p>
              </div>

              {/* Content Type Toggle */}
              <div className="mb-6">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOwnContent(!isOwnContent)}
                    className={`
                      relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
                      border-2 border-transparent transition-colors duration-200 ease-in-out
                      focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                      ${isOwnContent ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'}
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
                      This is my own blog
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {isOwnContent
                        ? 'Content will be used for voice matching when generating new content'
                        : 'Content will be stored as reference material only'}
                    </p>
                  </div>
                </div>
              </div>

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
                  disabled={!url.trim()}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400
                           disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                >
                  Import Blog
                </button>
              </div>
            </>
          ) : status === 'importing' || status === 'polling' ? (
            <div className="py-12 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                {/* Blog icon */}
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl bg-orange-500">
                  📝
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
                    className="text-orange-500"
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
                {status === 'importing' ? 'Starting Import...' : 'Importing Blog Posts...'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {status === 'polling'
                  ? 'Discovering feed and fetching blog posts...'
                  : 'Connecting to blog...'}
              </p>

              {status === 'polling' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                  {pollCount < 12
                    ? 'This usually takes 1-2 minutes'
                    : pollCount < 36
                    ? 'Processing... blogs with many posts take longer'
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
                Blog posts have been added to your knowledge base.
              </p>

              <button
                onClick={onClose}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg
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

export default BlogImportModal;
