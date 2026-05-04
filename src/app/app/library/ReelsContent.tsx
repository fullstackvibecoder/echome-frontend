'use client';

/**
 * Reel Maker Page
 *
 * Compact create bar + status-grouped project grid.
 * Editor lives in ReelEditorModal; inline editor removed.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wand2, FolderOpen, Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { showErrorToast } from '@/lib/toast';
import { StatusSection } from '@/components/StatusSection';
import { ReelProjectCard } from '@/components/reels/ReelProjectCard';
import ReelEditorModal from '@/components/reels/ReelEditorModal';
import { BRollReelWizard } from '@/components/reels/BRollReelWizard';
import type { ReelProject } from '@/types';

export default function ReelsContent() {
  const router = useRouter();

  // ---- State ----
  const [projects, setProjects] = useState<ReelProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [reelModalProjectId, setReelModalProjectId] = useState<string | null>(null);
  const [reelModalContentKitId, setReelModalContentKitId] = useState<string | undefined>();

  // ---- Data fetching ----
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.reels.listProjects({ limit: 50 });
      setProjects(res.data || []);
    } catch (err) {
      // Surface to the user — silent console.error here (paired with the
      // create silent-fail below) is what hid the createProjectSchema
      // contract mismatch in production for ~5 days.
      console.error('Failed to load reel projects', err);
      showErrorToast(err, 'loading your reels');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ---- Create handler ----
  const handleCreate = async () => {
    if (!topic.trim() || creating) return;
    setCreating(true);
    try {
      const res = await api.reels.createProject({
        title: topic.trim(),
        templateId: '',
        clips: [],
      });
      const newProject = res.data;
      if (newProject?.id) {
        setTopic('');
        setReelModalProjectId(newProject.id);
        fetchProjects();
      }
    } catch (err) {
      console.error('Failed to create reel', err);
      showErrorToast(err, 'creating your reel');
    } finally {
      setCreating(false);
    }
  };

  // ---- Delete handler ----
  const handleDelete = async (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    try {
      await api.reels.deleteProject(projectId);
    } catch (err) {
      console.error('Failed to delete reel', err);
      showErrorToast(err, 'deleting your reel');
      fetchProjects(); // Revert on failure
    }
  };

  // ---- Card click routing ----
  const handleCardClick = (project: ReelProject) => {
    setReelModalProjectId(project.id);
    setReelModalContentKitId(project.contentKitId);
  };

  // ---- Status groups ----
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const drafts = projects.filter(
    (p) =>
      (p.status === 'draft' || p.status === 'failed') &&
      new Date(p.createdAt).getTime() > thirtyDaysAgo,
  );
  const rendering = projects.filter(
    (p) => p.status === 'processing' || (p.status as string) === 'rendering',
  );
  const ready = projects.filter(
    (p) =>
      p.status === 'completed' &&
      new Date(p.createdAt).getTime() > thirtyDaysAgo,
  );
  const earlier = projects.filter(
    (p) => new Date(p.createdAt).getTime() <= thirtyDaysAgo,
  );

  const hasProjects = projects.length > 0;

  // ---- Grid helper ----
  const CardGrid = ({ items }: { items: ReelProject[] }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
      {items.map((p) => (
        <ReelProjectCard
          key={p.id}
          project={p}
          onClick={() => handleCardClick(p)}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );

  // ---- Wizard view ----
  if (showWizard) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <BRollReelWizard
          onComplete={() => {
            setShowWizard(false);
            fetchProjects();
          }}
          onCancel={() => setShowWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-8">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reel Maker</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create short-form video reels with text overlays
        </p>
      </div>

      {/* ---- Create bar ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 min-w-[200px] gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            placeholder="Enter a topic for your reel..."
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-interactive/50"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !topic.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary-interactive px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors shrink-0"
        >
          <Wand2 className="h-4 w-4" />
          B-Roll Wizard
        </button>

        <a
          href="/app/library"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors shrink-0"
        >
          <FolderOpen className="h-4 w-4" />
          From Content Kit
        </a>
      </div>

      {/* ---- Loading state ---- */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* ---- Status sections ---- */}
      {!loading && hasProjects && (
        <>
          <StatusSection label="Rendering" dotColor="#f59e0b" count={rendering.length}>
            <CardGrid items={rendering} />
          </StatusSection>

          <StatusSection label="Drafts" dotColor="#888" count={drafts.length}>
            <CardGrid items={drafts} />
          </StatusSection>

          <StatusSection label="Ready" dotColor="#22c55e" count={ready.length}>
            <CardGrid items={ready} />
          </StatusSection>

          <StatusSection label="Earlier" dotColor="#666" count={earlier.length} defaultCollapsed>
            <CardGrid items={earlier} />
          </StatusSection>
        </>
      )}

      {/* ---- Empty state ---- */}
      {!loading && !hasProjects && (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No reels yet. Enter a topic above to get started.
          </p>
        </div>
      )}

      {/* ---- Reel Editor Modal ---- */}
      <ReelEditorModal
        open={!!reelModalProjectId}
        onClose={() => {
          setReelModalProjectId(null);
          setReelModalContentKitId(undefined);
          fetchProjects();
        }}
        contentKitId={reelModalContentKitId || ''}
        reelProjectId={reelModalProjectId || undefined}
      />
    </div>
  );
}
