'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ContentCards } from '@/components/content-cards';
import { useResultsFeedback } from '@/hooks/useResultsFeedback';
import { Platform } from '@/types';

interface GenerationDetail {
  request: {
    id: string;
    status: string;
    prompt?: string;
    created_at: string;
    completed_at?: string;
  };
  content: Array<{
    id: string;
    platform: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
}

export default function LibraryDetail() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<GenerationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sendFeedback, copyToClipboard } = useResultsFeedback();

  const requestId = params.id as string;

  useEffect(() => {
    if (requestId) {
      loadDetail();
    }
  }, [requestId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const response = await api.generation.getRequest(requestId);
      if (response.data) {
        setData(response.data as unknown as GenerationDetail);
      }
    } catch (err) {
      setError('Failed to load content details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (content: string) => {
    await copyToClipboard(content);
  };

  const handleFeedback = (contentId: string, liked: boolean) => {
    sendFeedback(contentId, liked);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Transform content to match ContentCards expected format
  const transformedResults = data?.content?.map((item) => ({
    id: item.id,
    requestId: requestId,
    platform: item.platform as Platform,
    content: item.content,
    voiceScore: (item.metadata as { voiceScore?: number })?.voiceScore || 0,
    qualityScore: (item.metadata as { qualityScore?: number })?.qualityScore || 0,
    createdAt: new Date(data.request.created_at),
  })) || [];

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Back Button */}
      <button
        onClick={() => router.push('/app/library')}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
      >
        <span>←</span>
        <span>Back to Library</span>
      </button>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-center">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <div className="animate-fade-in">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-display text-3xl mb-2">
              {data.request.prompt || 'Generated Content'}
            </h1>
            <p className="text-body text-text-secondary">
              Created {formatDate(data.request.created_at)}
            </p>
          </div>

          {/* Content Cards */}
          {transformedResults.length > 0 ? (
            <ContentCards
              results={transformedResults}
              onCopy={handleCopy}
              onFeedback={handleFeedback}
            />
          ) : (
            <div className="text-center py-12 bg-bg-secondary rounded-xl border border-border">
              <p className="text-text-secondary">No content available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
