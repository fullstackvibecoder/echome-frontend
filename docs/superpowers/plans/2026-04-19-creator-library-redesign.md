# Creator Library Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Creator Library from a tab-based browse-only catalog into a section-based, action-oriented content toolkit with AI B-Roll generation, real estate focus, and "Use in Reel" actions on every asset.

**Architecture:** Replace the tab-switcher layout in `CreatorLibraryContent.tsx` with a single scrollable page. Add `BRollGenerateInput` at the top for AI generation via the existing `api.broll.generate` + `api.broll.pollStatus` flow. Add `AssetTextCard` for compact horizontal caption/script cards with Copy and Use actions. Add a new backend endpoint to bridge `broll_generations` to `user_broll_clips` so generated clips appear in the Reel Editor.

**Tech Stack:** React, Next.js App Router, TypeScript, Tailwind CSS, lucide-react, Sonner (toast)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/app/app/library/BRollGenerateInput.tsx` | **New** -- AI B-Roll generation input with hint pills + inline progress |
| Create | `src/app/app/library/AssetTextCard.tsx` | **New** -- compact horizontal card for caption templates + reel scripts |
| Rewrite | `src/app/app/library/CreatorLibraryContent.tsx` | Section-based layout, merged data fetching, action cards, AI input |
| Modify | `echome-platform-v2: src/routes/reels.ts` | Add `POST /api/reels/save-generated-broll` endpoint |
| Modify | `src/lib/api-client.ts` | Add `brollReels.saveGeneratedClip()` method |

---

### Task 1: Create BRollGenerateInput component

**Files:**
- Create: `src/app/app/library/BRollGenerateInput.tsx`

This component provides a textarea for describing a B-Roll clip, clickable hint pills, and inline generation progress. On completion it calls a callback so the parent can refresh and insert the new clip.

- [ ] **Step 1: Create BRollGenerateInput.tsx**

Create `src/app/app/library/BRollGenerateInput.tsx`:

```tsx
'use client';

import { useState, useRef } from 'react';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import type { AIGeneratedBRoll } from '@/types';

interface BRollGenerateInputProps {
  onGenerated: (broll: AIGeneratedBRoll) => void;
}

const HINT_PILLS = [
  'luxury kitchen walkthrough',
  'aerial neighborhood shot',
  'modern condo lobby',
  'open house walkthrough',
  'sold sign celebration',
];

type GenerationPhase = 'idle' | 'submitting' | 'polling' | 'saving';

export function BRollGenerateInput({ onGenerated }: BRollGenerateInputProps) {
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [statusText, setStatusText] = useState('');
  const abortRef = useRef(false);

  const isBusy = phase !== 'idle';

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isBusy) return;

    abortRef.current = false;
    setPhase('submitting');
    setStatusText('Starting generation...');

    try {
      // 1. Kick off generation
      const genResponse = await api.broll.generate({
        prompt: trimmed,
        duration: 5,
        aspectRatio: '9:16',
      });

      if (!genResponse.success || !genResponse.data) {
        throw new Error('Failed to start generation');
      }

      const generationId = genResponse.data.id;

      // 2. Poll until complete
      setPhase('polling');
      setStatusText('Generating your clip... usually takes 30-60 seconds.');

      const completed = await api.broll.pollStatus(
        generationId,
        (update) => {
          if (update.status === 'processing') {
            setStatusText('Generating your clip... usually takes 30-60 seconds.');
          }
        },
        5000,
        120,
      );

      if (completed.status === 'failed') {
        throw new Error(completed.errorMessage || 'Generation failed');
      }

      // 3. Save to user_broll_clips so it appears in Reel Editor
      setPhase('saving');
      setStatusText('Saving clip to your library...');

      try {
        await api.brollReels.saveGeneratedClip(generationId);
      } catch (saveErr) {
        // Non-fatal: clip still exists in broll_generations
        console.warn('Failed to save generated clip to user library', saveErr);
      }

      // 4. Done
      setPrompt('');
      setPhase('idle');
      setStatusText('');
      toast.success('B-Roll clip generated!');
      onGenerated(completed);
    } catch (err: any) {
      console.error('B-Roll generation failed', err);
      setPhase('idle');
      setStatusText('');
      toast.error(err?.message || 'Generation failed. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleHintClick = (hint: string) => {
    if (isBusy) return;
    setPrompt(hint);
  };

  return (
    <div className="space-y-3">
      {/* Input card */}
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="flex items-start gap-3 p-4">
          <Sparkles className="h-5 w-5 text-accent mt-0.5 shrink-0" />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your ideal B-Roll clip..."
            rows={2}
            disabled={isBusy}
            className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-relaxed"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isBusy || !prompt.trim()}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
            title="Generate (Cmd+Enter)"
          >
            {isBusy ? (
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Hint pills */}
      {!isBusy && (
        <div className="flex flex-wrap gap-2 px-1">
          {HINT_PILLS.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => handleHintClick(hint)}
              className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors"
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      {/* Generation progress */}
      {isBusy && (
        <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
          <p className="text-sm text-muted-foreground">{statusText}</p>
        </div>
      )}
    </div>
  );
}

export default BRollGenerateInput;
```

---

### Task 2: Create AssetTextCard component

**Files:**
- Create: `src/app/app/library/AssetTextCard.tsx`

Compact horizontal card used for caption templates and reel scripts. Shows truncated preview text, category pill, and action buttons (Copy + Use/Use in Reel).

- [ ] **Step 1: Create AssetTextCard.tsx**

Create `src/app/app/library/AssetTextCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import type { CuratedAsset } from '@/types';

interface AssetTextCardProps {
  asset: CuratedAsset;
  /** Label for the primary action button */
  actionLabel: string;
  /** Called when the primary action button is clicked */
  onAction: (asset: CuratedAsset) => void;
  /** Max characters to show in preview before truncating */
  previewLength?: number;
}

export function AssetTextCard({
  asset,
  actionLabel,
  onAction,
  previewLength = 120,
}: AssetTextCardProps) {
  const [copied, setCopied] = useState(false);

  const previewText = asset.content
    ? asset.content.length > previewLength
      ? asset.content.slice(0, previewLength) + '...'
      : asset.content
    : asset.description || asset.title;

  const handleCopy = async () => {
    const textToCopy = asset.content || asset.description || asset.title;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4 group hover:border-accent/30 transition-colors">
      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary leading-relaxed line-clamp-2">
          {previewText}
        </p>
        {asset.category && (
          <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-full">
            {asset.category}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Copy
        </button>
        <button
          type="button"
          onClick={() => onAction(asset)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default AssetTextCard;
```

---

### Task 3: Backend endpoint to save generated B-Roll to user_broll_clips

**Files:**
- Modify: `echome-platform-v2/src/routes/reels.ts` -- add `POST /api/reels/save-generated-broll`
- Modify: `echome-frontend/src/lib/api-client.ts` -- add `brollReels.saveGeneratedClip()`

This endpoint reads a completed `broll_generations` row and copies its video/thumbnail URLs into `user_broll_clips` so the clip appears in the Reel Editor's BRollStrip under "My Clips."

- [ ] **Step 1: Add the backend endpoint in reels.ts**

In `echome-platform-v2/src/routes/reels.ts`, add the following route block **before** the final `export default router;` line:

```ts
// ============================================================
// SAVE GENERATED B-ROLL TO USER CLIPS
// ============================================================

const saveGeneratedBrollSchema = z.object({
  generation_id: z.string().uuid(),
});

/**
 * POST /api/reels/save-generated-broll
 *
 * Copies a completed broll_generation into user_broll_clips
 * so it appears in the Reel Editor's clip picker.
 */
router.post('/save-generated-broll', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parsed = saveGeneratedBrollSchema.parse(req.body);

    // 1. Fetch the generation and verify ownership + completion
    const { data: generation, error: fetchError } = await supabase
      .from('broll_generations')
      .select('*')
      .eq('id', parsed.generation_id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !generation) {
      throw new AppError('B-Roll generation not found', 404);
    }

    if (generation.status !== 'completed') {
      throw new AppError('B-Roll generation is not yet completed', 400);
    }

    if (!generation.video_url) {
      throw new AppError('B-Roll generation has no video URL', 400);
    }

    // 2. Check if already saved (idempotent)
    const { data: existing } = await supabase
      .from('user_broll_clips')
      .select('id')
      .eq('user_id', userId)
      .eq('source_generation_id', parsed.generation_id)
      .maybeSingle();

    if (existing) {
      const response: ApiResponse = {
        success: true,
        data: {
          clip: {
            id: existing.id,
            url: generation.video_url,
            thumbnailUrl: generation.thumbnail_url,
            category: 'My Clips',
            label: generation.prompt?.slice(0, 60) || 'AI Generated',
          },
          alreadyExists: true,
        },
        timestamp: new Date().toISOString(),
      };
      res.json(response);
      return;
    }

    // 3. Insert into user_broll_clips
    const clipId = crypto.randomUUID();

    // Extract storage paths from public URLs (they follow the pattern: .../storage/v1/object/public/reels/...)
    const videoStoragePath = generation.video_url.includes('/reels/')
      ? generation.video_url.split('/reels/').pop() || ''
      : '';
    const thumbStoragePath = generation.thumbnail_url?.includes('/reels/')
      ? generation.thumbnail_url.split('/reels/').pop() || ''
      : '';

    const { error: insertError } = await supabase
      .from('user_broll_clips')
      .insert({
        id: clipId,
        user_id: userId,
        url: generation.video_url,
        thumbnail_url: generation.thumbnail_url || null,
        storage_path: videoStoragePath,
        thumbnail_path: thumbStoragePath || null,
        original_filename: `ai-generated-${parsed.generation_id.slice(0, 8)}.mp4`,
        duration: generation.duration_seconds || 5,
        source_generation_id: parsed.generation_id,
      });

    if (insertError) {
      logger.error('Failed to save generated B-Roll to user clips', { error: insertError });
      throw new AppError('Failed to save clip', 500);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        clip: {
          id: clipId,
          url: generation.video_url,
          thumbnailUrl: generation.thumbnail_url,
          category: 'My Clips',
          label: generation.prompt?.slice(0, 60) || 'AI Generated',
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(error.issues.map(e => e.message).join(', '), 400, 'VALIDATION_ERROR');
    }
    if (error instanceof AppError) throw error;
    logger.error('Failed to save generated B-Roll', { error });
    throw new AppError('Failed to save generated B-Roll', 500);
  }
});
```

**Important:** This endpoint requires a `source_generation_id` column on the `user_broll_clips` table. Add it with a migration:

```sql
ALTER TABLE user_broll_clips
  ADD COLUMN IF NOT EXISTS source_generation_id UUID REFERENCES broll_generations(id);

CREATE INDEX IF NOT EXISTS idx_user_broll_clips_source_generation
  ON user_broll_clips(source_generation_id)
  WHERE source_generation_id IS NOT NULL;
```

- [ ] **Step 2: Add the frontend API method**

In `src/lib/api-client.ts`, add the following method inside the `brollReels` object, after the `deleteClip` method:

```ts
    /** Save a completed AI-generated B-Roll clip to user's clip library */
    saveGeneratedClip: async (generationId: string) => {
      const response = await apiClient.post('/reels/save-generated-broll', {
        generation_id: generationId,
      }, { timeout: 30000 });
      return response.data as {
        success: boolean;
        data: {
          clip: { id: string; url: string; thumbnailUrl: string; category: string; label: string };
          alreadyExists?: boolean;
        };
      };
    },
```

---

### Task 4: Rewrite CreatorLibraryContent with section-based layout

**Files:**
- Rewrite: `src/app/app/library/CreatorLibraryContent.tsx`

This is the main page component. Removes tabs, adds the AI input at top, fetches all three asset types in parallel along with user clips, and renders three collapsible sections.

- [ ] **Step 1: Rewrite CreatorLibraryContent.tsx**

Replace the entire contents of `src/app/app/library/CreatorLibraryContent.tsx` with:

```tsx
'use client';

/**
 * Creator Library Page — Redesigned
 *
 * Section-based layout with AI B-Roll generation, action cards,
 * and "Use in Reel" integration. No more tabs.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Download } from 'lucide-react';
import api from '@/lib/api-client';
import type { CuratedAsset, AIGeneratedBRoll } from '@/types';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { BRollGenerateInput } from './BRollGenerateInput';
import { AssetTextCard } from './AssetTextCard';
import ReelEditorModal from '@/components/reels/ReelEditorModal';

// ---- Types for merged B-Roll data ----
interface BRollCardData {
  id: string;
  thumbnailUrl: string;
  mediaUrl: string;
  title: string;
  category: string;
  badge: 'generated' | 'my-clip' | null;
  isNew?: boolean;
}

// ---- Collapsible Section ----
function LibrarySection({
  title,
  count,
  defaultExpanded = true,
  children,
}: {
  title: string;
  count: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className="mb-8">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 py-2 text-left mb-4"
        aria-expanded={expanded}
      >
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground font-medium">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground/60">{count}</span>
      </button>
      {expanded && children}
    </section>
  );
}

export default function CreatorLibraryContent() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { isFreeUser, freeGenerationsRemaining } = useSubscription();
  const freeUserExhausted = isFreeUser && freeGenerationsRemaining <= 0;

  // ---- Data state ----
  const [brollCards, setBrollCards] = useState<BRollCardData[]>([]);
  const [captionTemplates, setCaptionTemplates] = useState<CuratedAsset[]>([]);
  const [reelScripts, setReelScripts] = useState<CuratedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // ---- B-Roll category filter ----
  const [activeCategory, setActiveCategory] = useState<string>('realestate');
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // ---- Reel Editor modal ----
  const [reelEditorOpen, setReelEditorOpen] = useState(false);
  const [reelEditorClipId, setReelEditorClipId] = useState<string | undefined>(undefined);
  const [reelEditorContentKitId, setReelEditorContentKitId] = useState<string>('');

  // ---- Fetch all data in parallel ----
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [brollCurated, userClipsRes, captionRes, scriptRes] = await Promise.all([
        api.curatedAssets.list({ type: 'b_roll' }),
        api.brollReels.getUserClips().catch(() => ({ clips: [] })),
        api.curatedAssets.list({ type: 'caption_template' }),
        api.curatedAssets.list({ type: 'reel_script' }),
      ]);

      // Build merged B-Roll card list: user clips first, then curated
      const userClips = userClipsRes?.clips || [];
      const userCards: BRollCardData[] = userClips.map((clip: any) => ({
        id: clip.id,
        thumbnailUrl: clip.thumbnailUrl,
        mediaUrl: clip.url,
        title: clip.label || 'My Clip',
        category: 'My Clips',
        badge: clip.label?.startsWith('ai-generated') ? 'generated' as const : 'my-clip' as const,
      }));

      const curatedAssets = brollCurated.success ? (brollCurated.data || []) : [];
      const curatedCards: BRollCardData[] = curatedAssets.map((asset: CuratedAsset) => ({
        id: asset.id,
        thumbnailUrl: asset.thumbnailUrl || '',
        mediaUrl: asset.mediaUrl || '',
        title: asset.title,
        category: asset.category || 'other',
        badge: null,
      }));

      // Extract categories from curated assets
      const cats = ['All', ...new Set(curatedAssets.map((a: CuratedAsset) => a.category).filter(Boolean))];
      if (userCards.length > 0) cats.splice(1, 0, 'My Clips');
      setAllCategories(cats as string[]);

      setBrollCards([...userCards, ...curatedCards]);
      setCaptionTemplates(captionRes.success ? (captionRes.data || []) : []);
      setReelScripts(scriptRes.success ? (scriptRes.data || []) : []);
    } catch (err: any) {
      if (err?.message?.includes('network') || err?.message?.includes('fetch') || err?.message?.includes('Failed to fetch')) {
        setError('Network error - please check your connection and try again.');
      } else {
        setError('Could not load the library. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (freeUserExhausted) return;
    fetchData();
  }, [authLoading, freeUserExhausted, fetchData, retryKey]);

  // ---- Handlers ----
  const handleBRollGenerated = (broll: AIGeneratedBRoll) => {
    // Insert newly generated clip at top of list
    const newCard: BRollCardData = {
      id: broll.id,
      thumbnailUrl: broll.thumbnailUrl || '',
      mediaUrl: broll.videoUrl || '',
      title: broll.prompt?.slice(0, 60) || 'AI Generated',
      category: 'My Clips',
      badge: 'generated',
      isNew: true,
    };
    setBrollCards((prev) => [newCard, ...prev]);

    // Ensure My Clips category exists
    setAllCategories((prev) =>
      prev.includes('My Clips') ? prev : ['All', 'My Clips', ...prev.slice(1)]
    );
  };

  const handleUseInReel = (clipId: string) => {
    // We need a contentKitId for the ReelEditorModal.
    // Open it with a placeholder -- the modal fetches its own data.
    setReelEditorClipId(clipId);
    setReelEditorContentKitId('');
    setReelEditorOpen(true);
  };

  const handleCaptionUse = (asset: CuratedAsset) => {
    // Navigate to create page with template pre-filled as topic
    const topic = encodeURIComponent(asset.content || asset.title);
    router.push(`/app/create?topic=${topic}`);
  };

  const handleScriptUseInReel = (asset: CuratedAsset) => {
    // Open Reel Editor -- the script text would be used as overlay text
    // For now, copy to clipboard and open reel maker
    if (asset.content) {
      navigator.clipboard.writeText(asset.content).catch(() => {});
    }
    router.push('/app/reels');
  };

  // ---- Filter B-Roll cards by category ----
  const filteredBrollCards = activeCategory === 'All'
    ? brollCards
    : activeCategory === 'My Clips'
      ? brollCards.filter((c) => c.badge !== null)
      : brollCards.filter((c) => c.category === activeCategory);

  // ---- Auth loading ----
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display text-3xl mb-2">Creator Library</h1>
        <p className="text-body text-text-secondary">
          Your content toolkit — clips, templates, and scripts
        </p>
      </div>

      {/* Tier gate for free users */}
      {freeUserExhausted && (
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm z-10 rounded-xl flex items-center justify-center">
            <div className="text-center p-8">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Upgrade to access the Creator Library
              </h3>
              <p className="text-text-secondary mb-4">
                Get curated B-roll, caption templates, and reel scripts.
              </p>
              <a href="/app/billing" className="btn-primary">
                View Plans
              </a>
            </div>
          </div>
          <div className="filter blur-sm pointer-events-none">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="aspect-[4/5] bg-bg-secondary" />
                  <div className="p-3">
                    <div className="h-4 bg-bg-secondary rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!freeUserExhausted && (
        <>
          {/* AI B-Roll Generation Input */}
          <div className="mb-10">
            <BRollGenerateInput onGenerated={handleBRollGenerated} />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center mb-6">
              <p className="text-red-400 mb-3">{error}</p>
              <button
                onClick={() => setRetryKey((k) => k + 1)}
                className="text-sm text-accent hover:underline"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* ---- B-Roll Clips Section ---- */}
              <LibrarySection title="B-Roll Clips" count={filteredBrollCards.length}>
                {/* Category pills */}
                {allCategories.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {allCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          activeCategory === cat
                            ? 'bg-primary-interactive text-white'
                            : 'border border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {filteredBrollCards.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary text-sm">
                    No clips in this category yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
                    {filteredBrollCards.map((card) => (
                      <div
                        key={card.id}
                        className="bg-card rounded-xl border border-border overflow-hidden group relative"
                        style={{ boxShadow: 'var(--shadow-soft)' }}
                      >
                        <div className="aspect-[4/5] bg-surface-container-low relative">
                          {card.thumbnailUrl ? (
                            <img
                              src={card.thumbnailUrl}
                              alt={card.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl text-text-tertiary">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                              </svg>
                            </div>
                          )}

                          {/* Badge */}
                          {card.badge === 'generated' && (
                            <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-purple-500/80 text-white rounded-md font-medium backdrop-blur-sm">
                              Generated
                            </span>
                          )}
                          {card.badge === 'my-clip' && (
                            <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-blue-500/80 text-white rounded-md font-medium backdrop-blur-sm">
                              My Clip
                            </span>
                          )}
                          {card.isNew && (
                            <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-green-500/80 text-white rounded-md font-medium backdrop-blur-sm">
                              New
                            </span>
                          )}
                          {!card.badge && card.category && (
                            <span className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 bg-black/60 text-white rounded-md backdrop-blur-sm">
                              {card.category}
                            </span>
                          )}

                          {/* Hover overlay with actions */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUseInReel(card.id)}
                              className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-colors"
                            >
                              Use in Reel
                            </button>
                            {card.mediaUrl && (
                              <a
                                href={card.mediaUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-4 py-2 bg-white/20 text-white rounded-lg text-xs font-medium hover:bg-white/30 transition-colors backdrop-blur-sm"
                              >
                                <Download className="h-3 w-3" />
                                Save
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </LibrarySection>

              {/* ---- Caption Templates Section ---- */}
              {captionTemplates.length > 0 && (
                <LibrarySection title="Caption Templates" count={captionTemplates.length}>
                  <div className="space-y-3">
                    {captionTemplates.map((asset) => (
                      <AssetTextCard
                        key={asset.id}
                        asset={asset}
                        actionLabel="Use"
                        onAction={handleCaptionUse}
                        previewLength={120}
                      />
                    ))}
                  </div>
                </LibrarySection>
              )}

              {/* ---- Reel Scripts Section ---- */}
              {reelScripts.length > 0 && (
                <LibrarySection title="Reel Scripts" count={reelScripts.length}>
                  <div className="space-y-3">
                    {reelScripts.map((asset) => (
                      <AssetTextCard
                        key={asset.id}
                        asset={asset}
                        actionLabel="Use in Reel"
                        onAction={handleScriptUseInReel}
                        previewLength={100}
                      />
                    ))}
                  </div>
                </LibrarySection>
              )}
            </>
          )}
        </>
      )}

      {/* Reel Editor Modal */}
      {reelEditorOpen && (
        <ReelEditorModal
          open={reelEditorOpen}
          onClose={() => {
            setReelEditorOpen(false);
            setReelEditorClipId(undefined);
          }}
          contentKitId={reelEditorContentKitId}
        />
      )}
    </div>
  );
}
```

---

## Verification

After implementing all tasks, verify:

```bash
cd /Users/aramammo/Side\ Quests/echome-frontend && npm run build
```

Check for:
1. No TypeScript errors
2. Page loads with all three sections visible
3. AI input shows hint pills and accepts prompt
4. B-Roll category pills filter the grid correctly
5. Caption template and reel script cards show Copy + Use actions
6. "Use in Reel" opens the Reel Editor modal
