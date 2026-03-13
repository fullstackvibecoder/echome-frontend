'use client';

/**
 * Reel Maker Landing Page
 *
 * Template picker with grid view, recent projects, and B-Roll Reels wizard.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import type { ReelTemplate, ReelProject } from '@/types';
import { TemplateCard } from '@/components/reels/TemplateCard';
import { ReelProjectCard } from '@/components/reels/ReelProjectCard';
import { BRollReelWizard } from '@/components/reels/BRollReelWizard';

export default function ReelsContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<ReelTemplate[]>([]);
  const [recentProjects, setRecentProjects] = useState<ReelProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'projects' | 'broll'>('templates');
  const [showBRollWizard, setShowBRollWizard] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) {
      router.replace('/app');
    }
  }, [authLoading, user, router]);

  // Fetch templates and recent projects
  useEffect(() => {
    if (!user?.isAdmin) return; // Skip fetch for non-admins
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const [templatesRes, projectsRes] = await Promise.all([
          api.reels.listTemplates(),
          api.reels.listProjects({ limit: 6 }),
        ]);

        if (templatesRes.success && templatesRes.data) {
          setTemplates(templatesRes.data);
        }

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
  }, [user, retryKey]);

  const handleTemplateSelect = useCallback((template: ReelTemplate) => {
    router.push(`/app/reels/new?template=${template.id}`);
  }, [router]);

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
            Create professional reels with beat-synced transitions and AI B-roll
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'broll' && (
            <button
              onClick={() => setShowBRollWizard(true)}
              className="btn-primary flex items-center gap-2"
            >
              <span>+</span>
              <span>New B-Roll Reel</span>
            </button>
          )}
          {activeTab !== 'broll' && recentProjects.length > 0 && (
            <Link
              href="/app/reels/new"
              className="btn-primary flex items-center gap-2"
            >
              <span>+</span>
              <span>New Reel</span>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-2 text-sm font-medium transition-colors ${
            activeTab === 'templates'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 px-2 text-sm font-medium transition-colors ${
            activeTab === 'projects'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          My Reels ({recentProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('broll')}
          className={`pb-3 px-2 text-sm font-medium transition-colors ${
            activeTab === 'broll'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          B-Roll Reels
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <p className="text-text-secondary mb-6">
            Choose a template to get started. Each template is designed for specific content types.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => handleTemplateSelect(template)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Projects Tab */}
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
                Create your first reel by selecting a template above.
              </p>
              <button
                onClick={() => setActiveTab('templates')}
                className="btn-primary"
              >
                Browse Templates
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

      {/* B-Roll Reels Tab */}
      {activeTab === 'broll' && (
        <div>
          {showBRollWizard ? (
            <BRollReelWizard
              onComplete={() => {
                setShowBRollWizard(false);
              }}
              onCancel={() => setShowBRollWizard(false)}
            />
          ) : (
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
                    d="M7 4V2m0 2a2 2 0 012 2v1a2 2 0 01-2 2 2 2 0 01-2-2V6a2 2 0 012-2zm0 10v2m0-2a2 2 0 01-2-2v-1a2 2 0 012-2 2 2 0 012 2v1a2 2 0 01-2 2zM17 4V2m0 2a2 2 0 012 2v1a2 2 0 01-2 2 2 2 0 01-2-2V6a2 2 0 012-2zm0 10v2m0-2a2 2 0 01-2-2v-1a2 2 0 012-2 2 2 0 012 2v1a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">B-Roll Reels</h3>
              <p className="text-text-secondary mb-6 max-w-md mx-auto">
                Combine AI-generated or extracted B-roll with voice-matched text overlays to create ready-to-post reels.
              </p>
              <button
                onClick={() => setShowBRollWizard(true)}
                className="btn-primary"
              >
                Create B-Roll Reel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
