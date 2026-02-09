'use client';

/**
 * Reel Editor Page
 *
 * Main editor for creating and editing reels:
 * - Select template
 * - Upload media (images + videos) using template-specific arrangers
 * - Select music (optional)
 * - Configure captions
 * - Preview and render
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import type {
  ReelTemplate,
  ReelProject,
  ReelProjectClip,
  MusicTrack,
  MusicTrackSummary,
  CreateReelProjectInput,
  ReelRenderStatus,
  MotionEffect,
} from '@/types';
import { TemplatePicker } from '@/components/reels/TemplatePicker';
import { MusicPicker } from '@/components/reels/MusicPicker';
import { RenderProgress } from '@/components/reels/RenderProgress';
import {
  BeatSyncArranger,
  BeforeAfterArranger,
  HookArranger,
  SequenceArranger,
  type MediaItem,
  type SequenceSection,
} from '@/components/reels';

type EditorStep = 'template' | 'content' | 'music' | 'settings' | 'render';

// Map template categories to arranger types
type ArrangerType = 'beatsync' | 'beforeafter' | 'hook' | 'sequence';

function getArrangerType(template: ReelTemplate): ArrangerType {
  const templateId = template.id.toLowerCase();
  const category = template.category?.toLowerCase() || '';

  if (templateId.includes('before') || templateId.includes('after') || category === 'transformation') {
    return 'beforeafter';
  }
  if (templateId.includes('hook') || templateId.includes('3-clip') || templateId.includes('3clip')) {
    return 'hook';
  }
  if (templateId.includes('tutorial') || templateId.includes('day') || templateId.includes('sequence') || category === 'tutorial' || category === 'lifestyle') {
    return 'sequence';
  }
  // Default to beat sync for trending/music-driven templates
  return 'beatsync';
}

export default function ReelEditorContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const projectId = params.id as string;
  const isNewProject = projectId === 'new';
  const preselectedTemplateId = searchParams.get('template');
  const contentKitId = searchParams.get('contentKitId');

  // State
  const [step, setStep] = useState<EditorStep>(isNewProject ? 'template' : 'content');
  const [templates, setTemplates] = useState<ReelTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReelTemplate | null>(null);
  const [project, setProject] = useState<ReelProject | null>(null);
  const [clips, setClips] = useState<ReelProjectClip[]>([]);
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [renderStatus, setRenderStatus] = useState<ReelRenderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New media state for redesigned arrangers
  const [beatSyncItems, setBeatSyncItems] = useState<MediaItem[]>([]);
  const [beforeItems, setBeforeItems] = useState<MediaItem[]>([]);
  const [afterItems, setAfterItems] = useState<MediaItem[]>([]);
  const [hookItem, setHookItem] = useState<MediaItem | null>(null);
  const [mainItem, setMainItem] = useState<MediaItem | null>(null);
  const [ctaItem, setCtaItem] = useState<MediaItem | null>(null);
  const [sequenceSections, setSequenceSections] = useState<SequenceSection[]>([
    { id: 'sec1', label: 'Step 1', item: null },
    { id: 'sec2', label: 'Step 2', item: null },
    { id: 'sec3', label: 'Step 3', item: null },
  ]);

  // Determine arranger type based on selected template
  const arrangerType = useMemo(() => {
    if (!selectedTemplate) return null;
    return getArrangerType(selectedTemplate);
  }, [selectedTemplate]);

  // Check if content is ready for next step
  const hasRequiredContent = useMemo(() => {
    if (!arrangerType) return false;

    switch (arrangerType) {
      case 'beatsync':
        return beatSyncItems.length >= 3;
      case 'beforeafter':
        return beforeItems.length > 0 && afterItems.length > 0;
      case 'hook':
        return hookItem !== null && mainItem !== null && ctaItem !== null;
      case 'sequence':
        return sequenceSections.filter(s => s.item !== null).length >= 3;
      default:
        return false;
    }
  }, [arrangerType, beatSyncItems, beforeItems, afterItems, hookItem, mainItem, ctaItem, sequenceSections]);

  // Check if all requirements are met (content + music when required)
  const canCreateReel = useMemo(() => {
    if (!hasRequiredContent) return false;
    // If template requires music, check that music is selected
    if (selectedTemplate?.musicRequired && !selectedMusic) return false;
    return true;
  }, [hasRequiredContent, selectedTemplate?.musicRequired, selectedMusic]);

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
              initializeArrangerState(template);
              setStep('content');
            }
          }
        }

        // Load music
        const musicRes = await api.reels.listMusic({ limit: 50 });
        if (musicRes.success && musicRes.data) {
          setMusicTracks(musicRes.data);
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
              initializeArrangerState(data.template);
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

  // Initialize arranger state based on template
  const initializeArrangerState = useCallback((template: ReelTemplate) => {
    const type = getArrangerType(template);
    if (type === 'sequence') {
      const category = template.category?.toLowerCase() || '';
      const labels = category === 'lifestyle'
        ? ['Morning', 'Midday', 'Evening']
        : ['Step 1', 'Step 2', 'Step 3'];
      setSequenceSections([
        { id: 'sec1', label: labels[0], item: null },
        { id: 'sec2', label: labels[1], item: null },
        { id: 'sec3', label: labels[2], item: null },
      ]);
    }
  }, []);

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
    initializeArrangerState(template);
    setStep('content');
  }, [initializeArrangerState]);

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

  // Build clips from current media state
  const buildClipsFromMedia = useCallback(() => {
    const clipInputs: Array<{
      segmentId: string;
      sourceUrl: string;
      mediaType: 'video' | 'image';
      motionEffect?: MotionEffect;
    }> = [];

    if (!arrangerType) return clipInputs;

    switch (arrangerType) {
      case 'beatsync':
        beatSyncItems.forEach((item, index) => {
          if (item.file || item.url) {
            clipInputs.push({
              segmentId: `beat_${index}`,
              sourceUrl: item.url || 'pending_upload',
              mediaType: item.type,
              motionEffect: item.motionEffect,
            });
          }
        });
        break;

      case 'beforeafter':
        beforeItems.forEach((item, index) => {
          if (item.file || item.url) {
            clipInputs.push({
              segmentId: `before_${index}`,
              sourceUrl: item.url || 'pending_upload',
              mediaType: item.type,
              motionEffect: item.motionEffect,
            });
          }
        });
        afterItems.forEach((item, index) => {
          if (item.file || item.url) {
            clipInputs.push({
              segmentId: `after_${index}`,
              sourceUrl: item.url || 'pending_upload',
              mediaType: item.type,
              motionEffect: item.motionEffect,
            });
          }
        });
        break;

      case 'hook':
        if (hookItem) {
          clipInputs.push({
            segmentId: 'hook',
            sourceUrl: hookItem.url || 'pending_upload',
            mediaType: hookItem.type,
            motionEffect: hookItem.motionEffect,
          });
        }
        if (mainItem) {
          clipInputs.push({
            segmentId: 'main',
            sourceUrl: mainItem.url || 'pending_upload',
            mediaType: mainItem.type,
            motionEffect: mainItem.motionEffect,
          });
        }
        if (ctaItem) {
          clipInputs.push({
            segmentId: 'cta',
            sourceUrl: ctaItem.url || 'pending_upload',
            mediaType: ctaItem.type,
            motionEffect: ctaItem.motionEffect,
          });
        }
        break;

      case 'sequence':
        sequenceSections.forEach((section) => {
          if (section.item) {
            clipInputs.push({
              segmentId: section.id,
              sourceUrl: section.item.url || 'pending_upload',
              mediaType: section.item.type,
              motionEffect: section.item.motionEffect,
            });
          }
        });
        break;
    }

    return clipInputs;
  }, [arrangerType, beatSyncItems, beforeItems, afterItems, hookItem, mainItem, ctaItem, sequenceSections]);

  // Get all media items that need to be included
  const getAllMediaItems = useCallback((): MediaItem[] => {
    if (!arrangerType) return [];

    switch (arrangerType) {
      case 'beatsync':
        return beatSyncItems.filter(item => item.file || item.url);
      case 'beforeafter':
        return [...beforeItems, ...afterItems].filter(item => item.file || item.url);
      case 'hook':
        return [hookItem, mainItem, ctaItem].filter((item): item is MediaItem => item !== null);
      case 'sequence':
        return sequenceSections.map(s => s.item).filter((item): item is MediaItem => item !== null);
      default:
        return [];
    }
  }, [arrangerType, beatSyncItems, beforeItems, afterItems, hookItem, mainItem, ctaItem, sequenceSections]);

  // Upload all media files and return URLs
  const uploadAllMedia = useCallback(async (): Promise<Map<string, string>> => {
    if (!user?.id) throw new Error('User not authenticated');

    const mediaItems = getAllMediaItems();
    const urlMap = new Map<string, string>();
    const itemsToUpload = mediaItems.filter(item => item.file && !item.url);

    if (itemsToUpload.length === 0) {
      // All items already have URLs
      mediaItems.forEach(item => {
        if (item.url) urlMap.set(item.id, item.url);
      });
      return urlMap;
    }

    setIsUploading(true);
    let uploaded = 0;

    for (const item of mediaItems) {
      if (item.url) {
        urlMap.set(item.id, item.url);
        continue;
      }

      if (item.file) {
        setUploadProgress(`Uploading ${++uploaded}/${itemsToUpload.length}...`);
        try {
          const result = await api.reels.uploadMedia(item.file, user.id);
          urlMap.set(item.id, result.url);
        } catch (err) {
          throw new Error(`Failed to upload ${item.file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }

    setIsUploading(false);
    setUploadProgress('');
    return urlMap;
  }, [user?.id, getAllMediaItems]);

  // Create or update project - returns the project if created/updated successfully
  const handleSaveProject = useCallback(async (): Promise<ReelProject | null> => {
    if (!selectedTemplate || !canCreateReel) return null;

    try {
      setIsSaving(true);
      setError(null);

      // Upload all media files first
      const urlMap = await uploadAllMedia();

      // Build clips with uploaded URLs
      const clipInputs: Array<{ segmentId: string; sourceUrl: string }> = [];

      if (arrangerType === 'beatsync') {
        beatSyncItems.forEach((item, index) => {
          const url = urlMap.get(item.id);
          if (url) clipInputs.push({ segmentId: `beat_${index}`, sourceUrl: url });
        });
      } else if (arrangerType === 'beforeafter') {
        beforeItems.forEach((item, index) => {
          const url = urlMap.get(item.id);
          if (url) clipInputs.push({ segmentId: `before_${index}`, sourceUrl: url });
        });
        afterItems.forEach((item, index) => {
          const url = urlMap.get(item.id);
          if (url) clipInputs.push({ segmentId: `after_${index}`, sourceUrl: url });
        });
      } else if (arrangerType === 'hook') {
        if (hookItem) {
          const url = urlMap.get(hookItem.id);
          if (url) clipInputs.push({ segmentId: 'hook', sourceUrl: url });
        }
        if (mainItem) {
          const url = urlMap.get(mainItem.id);
          if (url) clipInputs.push({ segmentId: 'main', sourceUrl: url });
        }
        if (ctaItem) {
          const url = urlMap.get(ctaItem.id);
          if (url) clipInputs.push({ segmentId: 'cta', sourceUrl: url });
        }
      } else if (arrangerType === 'sequence') {
        sequenceSections.forEach((section) => {
          if (section.item) {
            const url = urlMap.get(section.item.id);
            if (url) clipInputs.push({ segmentId: section.id, sourceUrl: url });
          }
        });
      }

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
          return res.data;
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
        return project;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
      return null;
    } finally {
      setIsSaving(false);
      setIsUploading(false);
      setUploadProgress('');
    }
    return null;
  }, [
    selectedTemplate,
    canCreateReel,
    uploadAllMedia,
    arrangerType,
    beatSyncItems,
    beforeItems,
    afterItems,
    hookItem,
    mainItem,
    ctaItem,
    sequenceSections,
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
    let projectToRender = project;

    if (!projectToRender) {
      // Need to save first, then use the returned project
      const savedProject = await handleSaveProject();
      if (!savedProject) {
        // Save failed, error already set by handleSaveProject
        return;
      }
      projectToRender = savedProject;
    }

    try {
      setIsRendering(true);
      setError(null);
      setStep('render');

      const res = await api.reels.renderProject(projectToRender.id);
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

  // Render content arranger based on template type
  const renderContentArranger = () => {
    if (!selectedTemplate || !arrangerType) return null;

    switch (arrangerType) {
      case 'beatsync':
        return (
          <BeatSyncArranger
            items={beatSyncItems}
            onItemsChange={setBeatSyncItems}
            tempo={selectedMusic?.tempo}
            beatCount={selectedMusic?.downbeats?.length}
          />
        );

      case 'beforeafter':
        return (
          <BeforeAfterArranger
            beforeItems={beforeItems}
            afterItems={afterItems}
            onBeforeChange={setBeforeItems}
            onAfterChange={setAfterItems}
          />
        );

      case 'hook':
        return (
          <HookArranger
            hookItem={hookItem}
            mainItem={mainItem}
            ctaItem={ctaItem}
            onHookChange={setHookItem}
            onMainChange={setMainItem}
            onCtaChange={setCtaItem}
          />
        );

      case 'sequence':
        return (
          <SequenceArranger
            sections={sequenceSections}
            onSectionsChange={setSequenceSections}
            variant={selectedTemplate.category === 'lifestyle' ? 'dayinlife' : 'tutorial'}
            minSections={3}
            maxSections={6}
          />
        );

      default:
        return null;
    }
  };

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
              disabled={isSaving || isUploading || !canCreateReel}
              className="btn-secondary disabled:opacity-50"
            >
              {isUploading ? uploadProgress : isSaving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleStartRender}
              disabled={!canCreateReel || isRendering || isUploading || isSaving}
              className="btn-primary disabled:opacity-50"
            >
              {isUploading ? uploadProgress : isRendering ? 'Rendering...' : isSaving ? 'Saving...' : 'Create Reel'}
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
          {['template', 'content', 'music', 'settings'].map((s, i) => (
            <button
              key={s}
              onClick={() => {
                if (s === 'template' && selectedTemplate) return;
                setStep(s as EditorStep);
              }}
              disabled={
                (s === 'content' && !selectedTemplate) ||
                (s === 'music' && !hasRequiredContent) ||
                (s === 'settings' && !hasRequiredContent)
              }
              className={`
                px-4 py-2 text-sm rounded-lg transition-colors
                ${step === s ? 'bg-accent text-white' : 'bg-surface-secondary text-text-secondary'}
                ${s === 'template' && selectedTemplate ? 'opacity-50 cursor-not-allowed' : ''}
                disabled:opacity-30 disabled:cursor-not-allowed
              `}
            >
              {i + 1}. {s === 'content' ? 'Content' : s.charAt(0).toUpperCase() + s.slice(1)}
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

        {/* Content upload - template-specific arrangers */}
        {step === 'content' && selectedTemplate && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium text-text-primary mb-2">Add Your Content</h2>
              <p className="text-text-secondary text-sm">
                Upload images and videos. Each piece of content will become a segment in your reel.
              </p>
            </div>

            {renderContentArranger()}

            {hasRequiredContent && (
              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  onClick={() => setStep('music')}
                  className="btn-primary"
                >
                  Continue to Music
                </button>
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
                disabled={!canCreateReel || isUploading || isSaving}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isUploading ? uploadProgress : isSaving ? 'Saving...' : 'Create Reel'}
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
