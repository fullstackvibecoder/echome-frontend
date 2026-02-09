'use client';

/**
 * Reel Maker Landing Page
 *
 * Template picker with grid view of available templates.
 * Users select a template to start creating a new reel.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import type { ReelTemplate, ReelProject } from '@/types';
import { TemplateCard } from '@/components/reels/TemplateCard';
import { ReelProjectCard } from '@/components/reels/ReelProjectCard';

export default function ReelsContent() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ReelTemplate[]>([]);
  const [recentProjects, setRecentProjects] = useState<ReelProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'projects'>('templates');

  // Fetch templates and recent projects
  useEffect(() => {
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleTemplateSelect = useCallback((template: ReelTemplate) => {
    // Navigate to editor with template pre-selected
    router.push(`/app/reels/new?template=${template.id}`);
  }, [router]);

  const handleProjectClick = useCallback((project: ReelProject) => {
    router.push(`/app/reels/${project.id}`);
  }, [router]);

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
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-accent hover:underline"
          >
            Try again
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
            Create professional reels with beat-synced transitions
          </p>
        </div>
        {recentProjects.length > 0 && (
          <Link
            href="/app/reels/new"
            className="btn-primary flex items-center gap-2"
          >
            <span>+</span>
            <span>New Reel</span>
          </Link>
        )}
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
    </div>
  );
}
