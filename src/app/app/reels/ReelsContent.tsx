'use client';

/**
 * Reel Maker Landing Page
 *
 * Simplified 2-tab layout: Create Reel | My Reels
 * "Create Reel" shows the 3-step B-Roll wizard directly.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import type { ReelProject } from '@/types';
import { ReelProjectCard } from '@/components/reels/ReelProjectCard';
import { BRollReelWizard } from '@/components/reels/BRollReelWizard';

export default function ReelsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [recentProjects, setRecentProjects] = useState<ReelProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'projects'>('create');
  const [retryKey, setRetryKey] = useState(0);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) {
      router.replace('/app');
    }
  }, [authLoading, user, router]);

  // Fetch recent projects
  useEffect(() => {
    if (!user?.isAdmin) return;
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const projectsRes = await api.reels.listProjects({ limit: 20 });

        if (projectsRes.success && projectsRes.data) {
          setRecentProjects(projectsRes.data);
        }
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setError('Reel Maker is temporarily unavailable. Please try again in a few minutes.');
        } else if (err?.message?.includes('network') || err?.message?.includes('fetch') || err?.message?.includes('Failed to fetch')) {
          setError('Network error — please check your connection and try again.');
        } else {
          setError('Something went wrong loading Reel Maker. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user, retryKey, activeTab]);

  const handleProjectClick = useCallback((project: ReelProject) => {
    router.push(`/app/reels/${project.id}`);
  }, [router]);

  // Early returns AFTER all hooks
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">This feature is not available yet.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-400 mb-3">{error}</p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="btn-primary text-sm px-6"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display text-3xl mb-2">Reel Maker</h1>
          <p className="text-body text-text-secondary">
            Create reels with curated B-roll and AI-generated text in your voice
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('create')}
          className={`pb-3 px-2 text-sm font-medium transition-colors ${
            activeTab === 'create'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Create Reel
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 px-2 text-sm font-medium transition-colors ${
            activeTab === 'projects'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          My Reels
        </button>
      </div>

      {/* Create Reel Tab */}
      {activeTab === 'create' && (
        <BRollReelWizard
          onComplete={() => {
            // Don't refresh here — it remounts the wizard and loses the completion screen.
            // User will see the result in the wizard's own "Your Reel is Ready" view.
            // Projects list refreshes when they switch to "My Reels" tab.
          }}
          onCancel={() => setActiveTab('projects')}
        />
      )}

      {/* My Reels Tab */}
      {activeTab === 'projects' && (
        <div>
          {recentProjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">No reels yet</h3>
              <p className="text-text-secondary mb-6">
                Create your first reel to get started.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="btn-primary"
              >
                Create Reel
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProjects.map((project) => (
                <ReelProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => handleProjectClick(project)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
