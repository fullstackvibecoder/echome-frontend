'use client';

/**
 * Reel Maker Page
 *
 * Single-screen layout: topic input -> inline editor -> project grid.
 * Available to all authenticated users (no admin gate).
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Download, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { BRollStrip } from '@/components/reels/BRollStrip';
import TextOverlayPreview from '@/components/reels/TextOverlayPreview';
import { ReelProjectCard } from '@/components/reels/ReelProjectCard';
import type { ReelProject, TextOverlayStyleId } from '@/types';

// ---- Constants ----

interface BRollClip {
  id: string;
  url: string;
  thumbnailUrl: string;
  category: string;
  label?: string;
}

const STYLE_OPTIONS: Array<{ id: TextOverlayStyleId; label: string }> = [
  { id: 'bold_impact', label: 'Bold Impact' },
  { id: 'minimal_clean', label: 'Minimal Clean' },
  { id: 'brand_gradient', label: 'Brand Gradient' },
  { id: 'story_cards', label: 'Story Cards' },
  { id: 'outlined_stroke', label: 'Outlined' },
  { id: 'neon_glow', label: 'Neon' },
];

export default function ReelsContent() {
  const { user, loading: authLoading } = useAuth();

  // ---- Topic input state ----
  const [topic, setTopic] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  // ---- Editor state ----
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [clips, setClips] = useState<BRollClip[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [hookText, setHookText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<TextOverlayStyleId>('bold_impact');
  const [editorLoading, setEditorLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  // ---- Project list state ----
  const [projects, setProjects] = useState<ReelProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // ---- Video viewer ----
  const [viewingProject, setViewingProject] = useState<ReelProject | null>(null);

  // ---- Fetch projects ----
  const fetchProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      setProjectsError(null);
      const res = await api.reels.listProjects({ limit: 20 });
      if (res.success && res.data) {
        setProjects(res.data);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setProjectsError('Reel Maker is temporarily unavailable.');
      } else {
        setProjectsError('Failed to load your reels.');
      }
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchProjects();
    }
  }, [authLoading, user, fetchProjects]);

  // ---- Load editor data (B-roll library) ----
  const loadEditor = useCallback(async (projectId: string, prefillHook?: string) => {
    setEditorLoading(true);
    setEditorError(null);
    setEditingProjectId(projectId);
    setOutputUrl(null);

    try {
      const [libraryRes, projectRes] = await Promise.all([
        api.brollReels.getBRollLibrary(),
        api.reels.getProject(projectId),
      ]);

      setClips(libraryRes.clips);
      setCategories(libraryRes.categories);

      const proj = projectRes.data?.project;
      if (proj) {
        if (proj.generatedContent?.hookText) {
          setHookText(proj.generatedContent.hookText);
        } else if (prefillHook) {
          setHookText(prefillHook);
        }
        if (proj.outputUrl) {
          setOutputUrl(proj.outputUrl);
        }
      } else if (prefillHook) {
        setHookText(prefillHook);
      }

      if (libraryRes.clips.length > 0) {
        setSelectedClipId(libraryRes.clips[0].id);
      }
    } catch {
      setEditorError('Failed to load editor. Please try again.');
    } finally {
      setEditorLoading(false);
    }
  }, []);

  // ---- Handle topic submit ----
  const handleTopicSubmit = async () => {
    const trimmed = topic.trim();
    if (!trimmed) return;

    setCreatingProject(true);
    setEditorError(null);

    try {
      // Create a minimal project — the user will fill in clips/text in the editor
      const res = await api.brollReels.compose({
        brollClipIds: [],
        templateStyle: 'bold_impact',
        generateText: true,
        topic: trimmed,
        textOverlays: [],
      });

      const newProjectId = res.data?.projectId;
      if (!newProjectId) throw new Error('No project ID returned');

      // Re-fetch projects so it shows in the grid
      fetchProjects();
      // Open editor with the new project
      await loadEditor(newProjectId, trimmed);
      setTopic('');
    } catch {
      // Fallback: if compose doesn't work without clips, try a simpler approach
      // Just open the editor with an empty state
      setEditorError('Could not create project. Try selecting a clip and generating directly.');
      // Load the editor anyway so user can manually compose
      try {
        const libraryRes = await api.brollReels.getBRollLibrary();
        setClips(libraryRes.clips);
        setCategories(libraryRes.categories);
        if (libraryRes.clips.length > 0) {
          setSelectedClipId(libraryRes.clips[0].id);
        }
        setHookText(trimmed);
        setEditingProjectId('draft');
      } catch {
        setEditorError('Failed to load B-roll library.');
      }
    } finally {
      setCreatingProject(false);
    }
  };

  // ---- Generate reel ----
  const handleGenerate = async () => {
    if (!selectedClipId) return;
    setRendering(true);
    setEditorError(null);
    setOutputUrl(null);

    try {
      const composeRes = await api.brollReels.compose({
        brollClipIds: [selectedClipId],
        templateStyle: selectedStyle,
        generateText: false,
        textOverlays: [{ text: hookText, position: 'center' }],
      });

      const newProjectId = composeRes.data?.projectId;
      if (!newProjectId) throw new Error('No project ID returned');

      setEditingProjectId(newProjectId);

      // Poll for render status
      const maxPolls = 60;
      let polls = 0;
      const pollInterval = 3000;

      const poll = async (): Promise<string> => {
        const statusRes = await api.reels.getRenderStatus(newProjectId);
        const status = statusRes.data;

        if (status?.status === 'completed' && status?.outputUrl) {
          return status.outputUrl;
        }
        if (status?.status === 'failed') {
          throw new Error(status?.errorMessage ?? 'Rendering failed');
        }

        polls++;
        if (polls >= maxPolls) throw new Error('Rendering timed out');

        return new Promise((resolve, reject) => {
          setTimeout(() => poll().then(resolve).catch(reject), pollInterval);
        });
      };

      const url = await poll();
      setOutputUrl(url);
      fetchProjects();
    } catch (err: any) {
      setEditorError(err?.message ?? 'Render failed. Please try again.');
    } finally {
      setRendering(false);
    }
  };

  // ---- Handle project card click ----
  const handleProjectClick = useCallback(
    (project: ReelProject) => {
      if (project.status === 'completed' && project.outputUrl) {
        setViewingProject(project);
      } else {
        // Open in editor for editing
        loadEditor(project.id);
      }
    },
    [loadEditor],
  );

  // ---- Derived ----
  const selectedClip = clips.find((c) => c.id === selectedClipId);
  const showEditor = editingProjectId !== null;

  // ---- Early returns ----
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl space-y-10">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reel Maker</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create scroll-stopping B-roll reels with AI-generated authority hooks in your voice.
        </p>
      </div>

      {/* ---- Topic Input ---- */}
      {!showEditor && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <label htmlFor="reel-topic" className="text-sm font-medium text-foreground">
            What&apos;s this reel about?
          </label>
          <div className="flex gap-3">
            <input
              id="reel-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !creatingProject) handleTopicSubmit();
              }}
              placeholder="e.g., Why most agents still miss the mark on pricing"
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-interactive/50"
            />
            <button
              type="button"
              onClick={handleTopicSubmit}
              disabled={creatingProject || !topic.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary-interactive px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {creatingProject ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Create
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---- Inline Editor ---- */}
      {showEditor && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex flex-col lg:flex-row w-full">
            {/* Left: Phone Preview */}
            <div className="flex items-center justify-center p-6 lg:w-[40%] shrink-0 bg-background/50">
              <div className="w-full max-w-[200px]">
                <TextOverlayPreview
                  thumbnailUrl={selectedClip?.thumbnailUrl}
                  text={hookText || 'Your hook text here...'}
                  style={selectedStyle as 'bold_impact' | 'minimal_clean' | 'brand_gradient' | 'story_cards'}
                  position="center"
                />
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex flex-col gap-5 p-6 lg:w-[60%] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Edit Reel</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProjectId(null);
                    setOutputUrl(null);
                    setEditorError(null);
                    setHookText('');
                    setSelectedClipId(null);
                    setSelectedStyle('bold_impact');
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                >
                  Close
                </button>
              </div>

              {editorLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Loading editor...</p>
                </div>
              ) : (
                <>
                  {/* B-Roll picker */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">B-Roll Clip</label>
                    <BRollStrip
                      clips={clips}
                      categories={categories}
                      selectedClipId={selectedClipId}
                      onSelect={setSelectedClipId}
                    />
                  </div>

                  {/* Hook Text */}
                  <div className="space-y-2">
                    <label htmlFor="hook-text" className="text-sm font-medium text-foreground">
                      Hook Text
                    </label>
                    <textarea
                      id="hook-text"
                      value={hookText}
                      onChange={(e) => setHookText(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-interactive/50 resize-none"
                      placeholder="Enter attention-grabbing hook text..."
                    />
                  </div>

                  {/* Style selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Text Style</label>
                    <div className="flex flex-wrap gap-2">
                      {STYLE_OPTIONS.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setSelectedStyle(style.id)}
                          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                            selectedStyle === style.id
                              ? 'bg-primary-interactive text-white'
                              : 'border border-border bg-background text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {editorError && (
                    <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                      {editorError}
                    </p>
                  )}

                  {/* Action button */}
                  <div className="pt-2">
                    {outputUrl ? (
                      <div className="flex gap-3">
                        <a
                          href={outputUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-interactive px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                        >
                          <Download className="h-4 w-4" />
                          Download Reel
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setOutputUrl(null);
                            handleGenerate();
                          }}
                          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Re-generate
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={rendering || !selectedClipId}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-interactive px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rendering ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Rendering...
                          </>
                        ) : (
                          'Generate Reel'
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- My Reels ---- */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">My Reels</h2>

        {projectsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projectsError ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400 mb-3">{projectsError}</p>
            <button
              onClick={fetchProjects}
              className="text-sm font-medium text-foreground hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 text-center">
            <p className="text-sm text-muted-foreground">Your reels will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ReelProjectCard
                key={project.id}
                project={project}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- Video Viewer Modal ---- */}
      {viewingProject && viewingProject.outputUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewingProject(null)}
        >
          <div
            className="relative max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingProject(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm"
            >
              Close
            </button>
            <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden">
              <video
                src={viewingProject.outputUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <a
                href={viewingProject.outputUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center rounded-lg bg-primary-interactive px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
