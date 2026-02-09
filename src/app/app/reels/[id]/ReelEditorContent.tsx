'use client';

/**
 * Reel Editor Page
 *
 * Main editor for creating and editing reels:
 * - Upload clips for each segment
 * - Select music (optional)
 * - Configure captions
 * - Preview and render
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import type {
  ReelTemplate,
  ReelProject,
  ReelProjectClip,
  ReelProjectDetail,
  MusicTrack,
  MusicTrackSummary,
  CreateReelProjectInput,
  ReelRenderStatus,
} from '@/types';
import { TemplatePicker } from '@/components/reels/TemplatePicker';
import { ClipUploader } from '@/components/reels/ClipUploader';
import { MusicPicker } from '@/components/reels/MusicPicker';
import { SegmentTimeline } from '@/components/reels/SegmentTimeline';
import { RenderProgress } from '@/components/reels/RenderProgress';

type EditorStep = 'template' | 'clips' | 'music' | 'settings' | 'render';

interface ClipUpload {
  segmentId: string;
  file?: File;
  sourceUrl?: string;
  trimStartMs?: number;
  trimEndMs?: number;
  preview?: string;
}

export default function ReelEditorContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const isNewProject = projectId === 'new';
  const preselectedTemplateId = searchParams.get('template');
  const contentKitId = searchParams.get('contentKitId');

  // State
  const [step, setStep] = useState<EditorStep>(isNewProject ? 'template' : 'clips');
  const [templates, setTemplates] = useState<ReelTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReelTemplate | null>(null);
  const [project, setProject] = useState<ReelProject | null>(null);
  const [clips, setClips] = useState<ReelProjectClip[]>([]);
  const [clipUploads, setClipUploads] = useState<Map<string, ClipUpload>>(new Map());
  const [musicTracks, setMusicTracks] = useState<MusicTrackSummary[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [title, setTitle] = useState('');
  const [addCaptions, setAddCaptions] = useState(false);
  const [captionPreset, setCaptionPreset] = useState<'modern' | 'classic' | 'bold'>('modern');
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [beatSyncEnabled, setBeatSyncEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<ReelRenderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contentKitClips, setContentKitClips] = useState<Array<{
    id: string;
    title?: string;
    url: string;
    thumbnailUrl?: string;
    duration?: number;
  }>>([]);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);

        // Load templates
        const templatesRes = await api.reels.listTemplates();
        if (templatesRes.success && templatesRes.data) {
          setTemplates(templatesRes.data);

          // Pre-select template if specified
          if (preselectedTemplateId) {
            const template = templatesRes.data.find(t => t.id === preselectedTemplateId);
            if (template) {
              setSelectedTemplate(template);
              setStep('clips');
            }
          }
        }

        // Load music
        const musicRes = await api.reels.listMusic({ limit: 50 });
        if (musicRes.success && musicRes.data) {
          setMusicTracks(musicRes.data);
        }

        // Load content kit clips if contentKitId is provided
        if (contentKitId) {
          try {
            const kitRes = await api.contentKits.get(contentKitId);
            if (kitRes.success && kitRes.data?.clips) {
              const kitClips = kitRes.data.clips.map((clip: any) => ({
                id: clip.id,
                title: clip.title || `Clip ${clip.clipNumber || 1}`,
                url: clip.exports?.[0]?.url || clip.url,
                thumbnailUrl: clip.thumbnailUrl,
                duration: clip.duration,
              })).filter((c: any) => c.url);
              setContentKitClips(kitClips);
            }
          } catch (err) {
            console.warn('Failed to load content kit clips:', err);
          }
        }

        // Load existing project if not new
        if (!isNewProject) {
          const projectRes = await api.reels.getProject(projectId);
          if (projectRes.success && projectRes.data) {
            const data = projectRes.data;
            setProject(data.project);
            setClips(data.clips);
            setTitle(data.project.title || '');
            setAddCaptions(data.project.addCaptions);
            setCaptionPreset(data.project.captionPreset as 'modern' | 'classic' | 'bold');
            setMusicVolume(data.project.musicVolume);
            setBeatSyncEnabled(data.project.beatSyncEnabled);

            if (data.template) {
              setSelectedTemplate(data.template);
            }

            if (data.musicTrack) {
              setSelectedMusic(data.musicTrack);
            }

            // Check if rendering
            if (data.project.status === 'processing') {
              setIsRendering(true);
              setStep('render');
              pollRenderStatus();
            } else if (data.project.status === 'completed') {
              setRenderStatus({
                status: 'completed',
                progress: 100,
                outputUrl: data.project.outputUrl,
                thumbnailUrl: data.project.thumbnailUrl,
                outputDurationMs: data.project.outputDurationMs,
              });
              setStep('render');
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isNewProject, projectId, preselectedTemplateId, contentKitId]);

  // Poll render status
  const pollRenderStatus = useCallback(async () => {
    if (!project?.id) return;

    try {
      const finalStatus = await api.reels.pollRenderStatus(
        project.id,
        (status) => setRenderStatus(status),
        2000,
        300
      );
      setRenderStatus(finalStatus);
      setIsRendering(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Render failed');
      setIsRendering(false);
    }
  }, [project?.id]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: ReelTemplate) => {
    setSelectedTemplate(template);
    setStep('clips');
  }, []);

  // Handle clip upload for a segment
  const handleClipUpload = useCallback((segmentId: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setClipUploads(prev => {
      const next = new Map(prev);
      next.set(segmentId, {
        segmentId,
        file,
        preview,
      });
      return next;
    });
  }, []);

  // Handle clip URL input for a segment
  const handleClipUrl = useCallback((segmentId: string, url: string) => {
    setClipUploads(prev => {
      const next = new Map(prev);
      next.set(segmentId, {
        segmentId,
        sourceUrl: url,
      });
      return next;
    });
  }, []);

  // Handle music selection
  const handleMusicSelect = useCallback(async (track: MusicTrackSummary | null) => {
    if (!track) {
      setSelectedMusic(null);
      return;
    }

    try {
      const res = await api.reels.getMusicTrack(track.id);
      if (res.success && res.data) {
        setSelectedMusic(res.data);
      }
    } catch (err) {
      console.error('Failed to load music track:', err);
    }
  }, []);

  // Check if all segments have clips
  const allSegmentsHaveClips = useMemo(() => {
    if (!selectedTemplate) return false;
    return selectedTemplate.segments.every(segment =>
      clipUploads.has(segment.id) || clips.some(c => c.segmentId === segment.id)
    );
  }, [selectedTemplate, clipUploads, clips]);

  // Create or update project
  const handleSaveProject = useCallback(async () => {
    if (!selectedTemplate || !allSegmentsHaveClips) return;

    try {
      setIsSaving(true);
      setError(null);

      // Build clips array
      const clipInputs = selectedTemplate.segments.map(segment => {
        const upload = clipUploads.get(segment.id);
        const existingClip = clips.find(c => c.segmentId === segment.id);

        // For now, use existing clips or placeholder
        // In production, you'd upload the file first
        return {
          segmentId: segment.id,
          sourceUrl: upload?.sourceUrl || existingClip?.sourceUrl || 'placeholder',
          trimStartMs: upload?.trimStartMs,
          trimEndMs: upload?.trimEndMs,
        };
      });

      if (isNewProject || !project) {
        // Create new project
        const input: CreateReelProjectInput = {
          templateId: selectedTemplate.id,
          clips: clipInputs,
          musicTrackId: selectedMusic?.id,
          title: title || `Reel - ${selectedTemplate.name}`,
          addCaptions,
          captionPreset,
        };

        const res = await api.reels.createProject(input);
        if (res.success && res.data) {
          setProject(res.data);
          router.replace(`/app/reels/${res.data.id}`);
        }
      } else {
        // Update existing project
        await api.reels.updateProject(project.id, {
          title,
          musicTrackId: selectedMusic?.id,
          musicVolume,
          beatSyncEnabled,
          addCaptions,
          captionPreset,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedTemplate,
    allSegmentsHaveClips,
    clipUploads,
    clips,
    isNewProject,
    project,
    selectedMusic,
    title,
    addCaptions,
    captionPreset,
    musicVolume,
    beatSyncEnabled,
    router,
  ]);

  // Start rendering
  const handleStartRender = useCallback(async () => {
    if (!project) {
      // Need to save first
      await handleSaveProject();
      return;
    }

    try {
      setIsRendering(true);
      setError(null);
      setStep('render');

      const res = await api.reels.renderProject(project.id);
      if (res.success) {
        pollRenderStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start render');
      setIsRendering(false);
    }
  }, [project, handleSaveProject, pollRenderStatus]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/app/reels"
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-display text-2xl">
              {isNewProject ? 'Create Reel' : (project?.title || 'Edit Reel')}
            </h1>
            {selectedTemplate && (
              <p className="text-sm text-text-secondary">{selectedTemplate.name}</p>
            )}
          </div>
        </div>

        {step !== 'template' && step !== 'render' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveProject}
              disabled={isSaving || !allSegmentsHaveClips}
              className="btn-secondary disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleStartRender}
              disabled={!allSegmentsHaveClips || isRendering}
              className="btn-primary disabled:opacity-50"
            >
              {isRendering ? 'Rendering...' : 'Create Reel'}
            </button>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Step navigation */}
      {step !== 'render' && (
        <div className="flex gap-2 mb-8">
          {['template', 'clips', 'music', 'settings'].map((s, i) => (
            <button
              key={s}
              onClick={() => {
                if (s === 'template' && selectedTemplate) return; // Can't go back to template
                setStep(s as EditorStep);
              }}
              disabled={
                (s === 'clips' && !selectedTemplate) ||
                (s === 'music' && !allSegmentsHaveClips) ||
                (s === 'settings' && !allSegmentsHaveClips)
              }
              className={`
                px-4 py-2 text-sm rounded-lg transition-colors
                ${step === s ? 'bg-accent text-white' : 'bg-surface-secondary text-text-secondary'}
                ${s === 'template' && selectedTemplate ? 'opacity-50 cursor-not-allowed' : ''}
                disabled:opacity-30 disabled:cursor-not-allowed
              `}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Step content */}
      <div className="bg-surface rounded-xl border border-border p-6">
        {/* Template selection */}
        {step === 'template' && (
          <TemplatePicker
            templates={templates}
            selectedId={selectedTemplate?.id}
            onSelect={handleTemplateSelect}
          />
        )}

        {/* Clip uploads */}
        {step === 'clips' && selectedTemplate && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-text-primary mb-2">Upload Clips</h2>
              <p className="text-text-secondary text-sm">
                Upload a video clip for each segment. You can trim clips after uploading.
              </p>
            </div>

            {/* Content Kit clips notice */}
            {contentKitClips.length > 0 && (
              <div className="flex items-center gap-3 p-4 bg-accent/10 border border-accent/30 rounded-lg">
                <span className="text-2xl">📦</span>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Content Kit clips available
                  </p>
                  <p className="text-xs text-text-secondary">
                    {contentKitClips.length} clip{contentKitClips.length !== 1 ? 's' : ''} from your content kit are ready to use.
                    Click &quot;Select from Content Kit&quot; on any segment below.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {selectedTemplate.segments.map((segment) => (
                <ClipUploader
                  key={segment.id}
                  segment={segment}
                  upload={clipUploads.get(segment.id)}
                  existingClip={clips.find(c => c.segmentId === segment.id)}
                  availableClips={contentKitClips}
                  onFileSelect={(file) => handleClipUpload(segment.id, file)}
                  onUrlInput={(url) => handleClipUrl(segment.id, url)}
                />
              ))}
            </div>

            {allSegmentsHaveClips && (
              <div className="pt-4 border-t border-border">
                <SegmentTimeline
                  template={selectedTemplate}
                  clips={clipUploads}
                />
              </div>
            )}
          </div>
        )}

        {/* Music selection */}
        {step === 'music' && (
          <MusicPicker
            tracks={musicTracks}
            selectedTrack={selectedMusic}
            onSelect={handleMusicSelect}
            volume={musicVolume}
            onVolumeChange={setMusicVolume}
            beatSyncEnabled={beatSyncEnabled}
            onBeatSyncChange={setBeatSyncEnabled}
            musicRequired={selectedTemplate?.musicRequired || false}
          />
        )}

        {/* Settings */}
        {step === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-text-primary mb-2">Reel Settings</h2>
              <p className="text-text-secondary text-sm">
                Configure your reel title and caption settings.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Reel Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Reel - ${selectedTemplate?.name || 'Untitled'}`}
                className="w-full px-4 py-2 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">Add Captions</p>
                <p className="text-sm text-text-secondary">
                  Auto-generate and burn captions into your reel
                </p>
              </div>
              <button
                onClick={() => setAddCaptions(!addCaptions)}
                className={`
                  w-12 h-6 rounded-full transition-colors
                  ${addCaptions ? 'bg-accent' : 'bg-surface-secondary'}
                `}
              >
                <div
                  className={`
                    w-5 h-5 bg-white rounded-full shadow transition-transform
                    ${addCaptions ? 'translate-x-6' : 'translate-x-0.5'}
                  `}
                />
              </button>
            </div>

            {addCaptions && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Caption Style
                </label>
                <div className="flex gap-3">
                  {(['modern', 'classic', 'bold'] as const).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setCaptionPreset(preset)}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-colors
                        ${captionPreset === preset
                          ? 'bg-accent text-white'
                          : 'bg-surface-secondary text-text-secondary hover:text-text-primary'
                        }
                      `}
                    >
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <button
                onClick={handleStartRender}
                disabled={!allSegmentsHaveClips}
                className="btn-primary w-full disabled:opacity-50"
              >
                Create Reel
              </button>
            </div>
          </div>
        )}

        {/* Render progress */}
        {step === 'render' && (
          <RenderProgress
            status={renderStatus}
            isRendering={isRendering}
            onBack={() => setStep('settings')}
          />
        )}
      </div>
    </div>
  );
}
