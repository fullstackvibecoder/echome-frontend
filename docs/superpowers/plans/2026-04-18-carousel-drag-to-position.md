# Carousel Drag-to-Position Text Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable free-drag text positioning on carousel slides by splitting rendering into background + text composition phases, with a draggable frontend overlay and pixel-perfect backend burn-in at download time.

**Architecture:** Backend canvas templates gain a `skipText` flag to render background-only PNGs. A new `canvas-text-compositor.ts` composites text at arbitrary x,y coordinates onto cached backgrounds. The frontend shows background images with a draggable CSS text overlay, sending final coordinates at download time.

**Tech Stack:** Node.js canvas (`@napi-rs/canvas`), React (mouse/touch drag events), Supabase Storage, TypeScript

---

## File Structure

**Backend — `/Users/aramammo/Side Quests/echome-platform-v2/`**

| File | Responsibility |
|------|---------------|
| `src/services/image/carousel-templates.ts` | Add `skipText` to `SlideConfig`, change `TextPosition` from enum to `{x,y}` |
| `src/services/image/canvas-tweet-template.ts` | Early return before text drawing when `skipText: true` |
| `src/services/image/canvas-text-box-template.ts` | Early return before text drawing when `skipText: true` |
| `src/services/image/canvas-photo-template.ts` | Early return before text drawing when `skipText: true` |
| `src/services/image/canvas-text-compositor.ts` | **New** — compose text at x,y onto a background buffer |
| `src/services/image/carousel-generator.ts` | Two-phase render: background upload + text composition, return `backgroundUrl` |
| `src/routes/content-kits.ts` | `composeOnly` fast path in regenerate-carousel endpoint |

**Frontend — `/Users/aramammo/Side Quests/echome-frontend/`**

| File | Responsibility |
|------|---------------|
| `src/components/content-kit/DraggableTextOverlay.tsx` | **New** — reusable drag-to-position text component |
| `src/components/content-kit/CarouselEditorModal.tsx` | Rebuild with background image + draggable text + download-triggers-compose |
| `src/lib/api-client.ts` | Add `composeOnly`, `textPosition: {x,y}` to `regenerateCarousel` |
| `src/app/app/content-kit/[id]/ContentKitDetailContent.tsx` | Wire carousel card click → open editor, pass `backgroundUrl` per slide |

---

### Task 1: Add `skipText` flag to SlideConfig and canvas templates

**Files:**
- Modify: `echome-platform-v2/src/services/image/carousel-templates.ts:44-57`
- Modify: `echome-platform-v2/src/services/image/canvas-tweet-template.ts:177`
- Modify: `echome-platform-v2/src/services/image/canvas-text-box-template.ts:289`
- Modify: `echome-platform-v2/src/services/image/canvas-photo-template.ts:350`

- [ ] **Step 1: Update SlideConfig in carousel-templates.ts**

Replace the current `TextPosition` type and update `SlideConfig`:

```typescript
// Replace line 44:
// export type TextPosition = 'top' | 'center' | 'bottom';
// With:
export interface TextPosition {
  x: number; // 0-1 normalized, 0.5 = center
  y: number; // 0-1 normalized, 0.5 = center
}

// Add skipText to SlideConfig (after backgroundImageUrl line):
export interface SlideConfig {
  text: string;
  slideNumber: number;
  totalSlides: number;
  slideType: SlideType;
  templateType: TemplateType;
  designSystem: CarouselDesignSystem;
  userBranding?: UserBranding;
  aspectRatio?: AspectRatio;
  backgroundImageUrl?: string;
  textPosition?: TextPosition;
  skipText?: boolean;
}
```

- [ ] **Step 2: Add skipText early return to canvas-tweet-template.ts**

Find the `// === DRAW TWEET TEXT ===` comment (around line 177). Insert before it:

```typescript
  // Skip text rendering if only generating background
  if (config.skipText) {
    return canvas.toBuffer('image/png');
  }

  // === DRAW TWEET TEXT ===
```

- [ ] **Step 3: Add skipText early return to canvas-text-box-template.ts**

Find the heading text drawing section (around line 289, before `ctx.textAlign = 'center'`). Insert before it:

```typescript
  // Skip text rendering if only generating background
  if (config.skipText) {
    return canvas.toBuffer('image/png');
  }

  ctx.textAlign = 'center';
```

- [ ] **Step 4: Add skipText early return to canvas-photo-template.ts**

Find the pill drawing section (around line 350, before `const styleKey = colors[...]`). Look for the comment or loop that begins the text block rendering. Insert before the text blocks loop:

```typescript
  // Skip text rendering if only generating background
  if (config.skipText) {
    return canvas.toBuffer('image/png');
  }
```

- [ ] **Step 5: Fix any TypeScript errors from TextPosition change**

The old `TextPosition` was `'top' | 'center' | 'bottom'`. Changing it to `{ x, y }` will break references in the three templates and in `carousel-generator.ts` that check for string values like `config.textPosition === 'top'`. Find and remove these — they'll be replaced by the compositor in Task 3. For now, remove the `textPosition`-based overrides that were added in the earlier sprint (the `if (config.textPosition === 'top')` blocks in each template).

Run: `cd /Users/aramammo/Side\ Quests/echome-platform-v2 && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-platform-v2
git add src/services/image/carousel-templates.ts src/services/image/canvas-tweet-template.ts src/services/image/canvas-text-box-template.ts src/services/image/canvas-photo-template.ts
git commit -m "feat: add skipText flag to SlideConfig for background-only rendering"
```

---

### Task 2: Create canvas-text-compositor.ts

**Files:**
- Create: `echome-platform-v2/src/services/image/canvas-text-compositor.ts`

- [ ] **Step 1: Create the compositor file**

```typescript
/**
 * Canvas Text Compositor
 *
 * Composites text onto a pre-rendered background image at arbitrary x,y
 * coordinates. Used by the two-phase carousel pipeline: templates render
 * backgrounds, this module adds text on top.
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import { logger } from '../../utils/logger';
import type {
  TemplateType,
  SlideType,
  AspectRatio,
  CarouselDesignSystem,
} from './carousel-templates';
import { getDimensions } from './carousel-templates';

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textShadow?: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  maxWidthRatio: number; // fraction of canvas width for word wrap
}

/**
 * Get text styling based on template type and design system.
 * Mirrors the font choices made by each canvas template.
 */
function getTextStyle(
  templateType: TemplateType,
  designSystem: CarouselDesignSystem,
  canvasWidth: number,
): TextStyle {
  switch (templateType) {
    case 'tweet-style':
      return {
        fontFamily: designSystem.fontFamily || 'Montserrat',
        fontSize: 40,
        fontWeight: 500,
        color: '#0f1419',
        maxWidthRatio: 0.65, // tweet card is narrower
        backgroundColor: undefined,
      };

    case 'text-box':
      return {
        fontFamily: designSystem.fontFamily || 'Montserrat',
        fontSize: 52,
        fontWeight: designSystem.headingWeight || 800,
        color: designSystem.textColor || '#FFFFFF',
        textShadow: '2px 2px 8px rgba(0,0,0,0.6)',
        maxWidthRatio: 0.80,
      };

    case 'photo-overlay':
      return {
        fontFamily: designSystem.fontFamily || 'Montserrat',
        fontSize: 38,
        fontWeight: 700,
        color: '#FFFFFF',
        backgroundColor: 'rgba(0,0,0,0.65)',
        padding: 16,
        borderRadius: 12,
        maxWidthRatio: 0.85,
      };

    default:
      return {
        fontFamily: 'Montserrat',
        fontSize: 44,
        fontWeight: 700,
        color: '#FFFFFF',
        textShadow: '2px 2px 8px rgba(0,0,0,0.6)',
        maxWidthRatio: 0.80,
      };
  }
}

/**
 * Word-wrap text to fit within maxWidth, returning lines.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Compose text at normalized x,y position onto a background image buffer.
 *
 * @param backgroundBuffer - PNG buffer of the background-only slide
 * @param text - Text content to draw
 * @param position - { x: 0-1, y: 0-1 } normalized coordinates (0.5, 0.5 = center)
 * @param templateType - Which template style to mimic for font/color
 * @param designSystem - Design system for brand colors/fonts
 * @param aspectRatio - '9:16' or '1:1'
 * @returns PNG buffer of the composited slide
 */
export async function composeTextOnBackground(
  backgroundBuffer: Buffer,
  text: string,
  position: { x: number; y: number },
  templateType: TemplateType,
  designSystem: CarouselDesignSystem,
  aspectRatio: AspectRatio = '9:16',
): Promise<Buffer> {
  const { width, height } = getDimensions(aspectRatio);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw background
  const bgImage = await loadImage(backgroundBuffer);
  ctx.drawImage(bgImage, 0, 0, width, height);

  if (!text.trim()) {
    return canvas.toBuffer('image/png');
  }

  const style = getTextStyle(templateType, designSystem, width);
  const maxWidth = width * style.maxWidthRatio;

  // Set font
  ctx.font = `${style.fontWeight} ${style.fontSize}px "${style.fontFamily}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word wrap
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = style.fontSize * 1.35;
  const totalTextHeight = lines.length * lineHeight;

  // Convert normalized position to pixel coordinates
  // x,y represent the center of the text block
  const centerX = position.x * width;
  const centerY = position.y * height;
  const startY = centerY - totalTextHeight / 2 + lineHeight / 2;

  // Draw background pill/box if template uses one
  if (style.backgroundColor) {
    const boxPadding = style.padding || 16;
    const boxWidth = maxWidth + boxPadding * 2;
    const boxHeight = totalTextHeight + boxPadding * 2;
    const boxX = centerX - boxWidth / 2;
    const boxY = centerY - boxHeight / 2;
    const radius = style.borderRadius || 0;

    ctx.fillStyle = style.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
    ctx.fill();
  }

  // Draw text shadow if specified
  if (style.textShadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  // Draw each line
  ctx.fillStyle = style.color;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], centerX, startY + i * lineHeight);
  }

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  logger.info('Text composited onto background', {
    templateType,
    position,
    lineCount: lines.length,
    textLength: text.length,
  });

  return canvas.toBuffer('image/png');
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-platform-v2 && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-platform-v2
git add src/services/image/canvas-text-compositor.ts
git commit -m "feat: add canvas-text-compositor for x,y text composition on backgrounds"
```

---

### Task 3: Two-phase render in carousel-generator.ts

**Files:**
- Modify: `echome-platform-v2/src/services/image/carousel-generator.ts:49-55,288-343`

- [ ] **Step 1: Update GeneratedSlide interface**

Add `backgroundUrl` to the interface (around line 49):

```typescript
export interface GeneratedSlide {
  slideNumber: number;
  text: string;
  imageUrl: string;
  publicUrl: string;
  template: TemplateType;
  backgroundUrl: string; // Public URL to text-free background
}
```

- [ ] **Step 2: Update CarouselSlide to use {x,y} position**

Update the `CarouselSlide` interface (around line 29):

```typescript
export interface CarouselSlide {
  text: string;
  backgroundImageUrl?: string;
  textPosition?: { x: number; y: number };
}
```

- [ ] **Step 3: Replace the rendering + upload loop with two-phase pipeline**

Find the rendering section (around lines 288-343). Replace the single-pass render + upload with:

```typescript
    // === TWO-PHASE RENDER ===
    // Phase 1: Render background-only slides (skipText: true)
    const bgConfigs = slideConfigs.map(c => ({ ...c, skipText: true }));

    logger.info('Phase 1: Rendering background-only slides', {
      contentId,
      totalSlides: bgConfigs.length,
    });

    let bgBuffers: Buffer[];
    try {
      bgBuffers = await renderSlidesToBuffers(bgConfigs, 3);
    } catch (error) {
      logger.error('Background rendering failed', {
        contentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }

    // Phase 2: Compose text onto backgrounds + upload both
    const { composeTextOnBackground } = await import('./canvas-text-compositor');
    const aspectFolder = aspectRatio === '1:1' ? 'square' : 'portrait';

    const uploadPromises = bgBuffers.map(async (bgBuffer, i) => {
      const slideConfig = slideConfigs[i];
      const slideNumber = i + 1;
      const slide = slides[i];
      const position = slide.textPosition || { x: 0.5, y: 0.5 };

      // Upload background
      const bgFileName = `carousels/${contentId}/${aspectFolder}/slide-${slideNumber}-bg.png`;
      const { error: bgUploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(bgFileName, bgBuffer, {
          contentType: 'image/png',
          upsert: true,
        });
      if (bgUploadError) {
        throw new Error(`Failed to upload bg slide ${slideNumber}: ${bgUploadError.message}`);
      }
      const { data: bgUrlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(bgFileName);

      // Compose text onto background
      const compositeBuffer = await composeTextOnBackground(
        bgBuffer,
        slideConfig.text,
        position,
        slideConfig.templateType,
        slideConfig.designSystem,
        aspectRatio,
      );

      // Upload composite
      const fileName = `carousels/${contentId}/${aspectFolder}/slide-${slideNumber}.png`;
      const { error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, compositeBuffer, {
          contentType: 'image/png',
          upsert: true,
        });
      if (uploadError) {
        throw new Error(`Failed to upload slide ${slideNumber}: ${uploadError.message}`);
      }
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      logger.info(`Slide ${slideNumber} uploaded (bg + composite)`, {
        template: slideConfig.templateType,
        bgFileName,
        fileName,
      });

      return {
        slideNumber,
        text: slideConfig.text,
        imageUrl: fileName,
        publicUrl: urlData.publicUrl,
        template: slideConfig.templateType,
        backgroundUrl: bgUrlData.publicUrl,
      } as GeneratedSlide;
    });

    const results = await Promise.all(uploadPromises);
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-platform-v2 && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-platform-v2
git add src/services/image/carousel-generator.ts
git commit -m "feat: two-phase carousel render — background + text composition"
```

---

### Task 4: composeOnly fast path in regenerate-carousel endpoint

**Files:**
- Modify: `echome-platform-v2/src/routes/content-kits.ts:547-665`

- [ ] **Step 1: Add composeOnly handling**

After the existing `slideOverrides` parsing and before the `generateCarousel` call (around line 610), add the compose-only fast path:

```typescript
    // --- COMPOSE-ONLY FAST PATH ---
    // When composeOnly is true, skip background re-rendering.
    // Load cached backgrounds from storage and composite text at new positions.
    const composeOnly = req.body.composeOnly === true;

    if (composeOnly) {
      const { composeTextOnBackground } = await import('../services/image/canvas-text-compositor');
      const { createDesignSystem } = await import('../services/image/canvas-renderer');

      // Look up existing carousel to find background URLs
      const { data: existingCarousel } = await supabase
        .from('generated_carousels')
        .select('slides')
        .eq('generation_request_id', kit.generation_request_id)
        .single();

      if (!existingCarousel?.slides) {
        throw new AppError('No existing carousel backgrounds found. Run a full regenerate first.', 400);
      }

      const existingSlides = existingCarousel.slides as Array<{
        slide_number: number;
        text: string;
        public_url: string;
        background_url?: string;
        template?: string;
      }>;

      // Compose text onto each cached background
      const composedSlides = await Promise.all(
        existingSlides.map(async (existing, i) => {
          const override = slideOverrides?.[i];
          const bgUrl = existing.background_url;
          if (!bgUrl) {
            throw new AppError(`Slide ${i + 1} has no cached background. Run a full regenerate.`, 400);
          }

          // Fetch background image from storage
          const bgResponse = await fetch(bgUrl);
          if (!bgResponse.ok) {
            throw new AppError(`Failed to fetch background for slide ${i + 1}`, 500);
          }
          const bgBuffer = Buffer.from(await bgResponse.arrayBuffer());

          const text = override?.text ?? existing.text;
          const position = override?.textPosition ?? { x: 0.5, y: 0.5 };
          const templateType = (existing.template || 'tweet-style') as import('../services/image/carousel-templates').TemplateType;
          const designSystem = createDesignSystem(resolved.designPreset || 'auto');

          const compositeBuffer = await composeTextOnBackground(
            bgBuffer,
            text,
            position,
            templateType,
            designSystem,
          );

          // Upload new composite (overwrite)
          const aspectFolder = '9-16'; // default
          const fileName = `carousels/kit-${kitId}-composed/${aspectFolder}/slide-${i + 1}.png`;
          const { error: uploadError } = await supabase.storage
            .from('generated-images')
            .upload(fileName, compositeBuffer, { contentType: 'image/png', upsert: true });
          if (uploadError) {
            throw new Error(`Failed to upload composed slide ${i + 1}: ${uploadError.message}`);
          }
          const { data: urlData } = supabase.storage
            .from('generated-images')
            .getPublicUrl(fileName);

          return {
            slideNumber: i + 1,
            text,
            publicUrl: urlData.publicUrl,
            backgroundUrl: bgUrl,
            template: templateType,
          };
        })
      );

      const response: ApiResponse = {
        success: true,
        data: {
          carousel: {
            id: `composed-${kitId}`,
            slideCount: composedSlides.length,
            designPreset: resolved.designPreset || 'auto',
            slides: composedSlides,
          },
        },
        timestamp: new Date().toISOString(),
      };

      return res.json(response);
    }
    // --- END COMPOSE-ONLY ---
```

- [ ] **Step 2: Update the full-regenerate path to store backgroundUrl in database**

After the existing carousel is generated and saved, ensure `background_url` is included in the slide data saved to `generated_carousels`. Find the `saveCarouselToDatabase` call and verify it passes the full slide data including `backgroundUrl`. If `saveCarouselToDatabase` doesn't persist `background_url`, update the slide mapping before the call:

```typescript
    // Before saveCarouselToDatabase, ensure slides include background_url
    // The carousel.slides already have backgroundUrl from the two-phase generator
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-platform-v2 && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-platform-v2
git add src/routes/content-kits.ts
git commit -m "feat: composeOnly fast path for carousel text repositioning"
```

---

### Task 5: Create DraggableTextOverlay component

**Files:**
- Create: `echome-frontend/src/components/content-kit/DraggableTextOverlay.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface DraggableTextOverlayProps {
  text: string;
  position: { x: number; y: number }; // 0-1 normalized
  onPositionChange: (pos: { x: number; y: number }) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  style?: {
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    textShadow?: string;
    maxWidth?: string;
    backgroundColor?: string;
    padding?: string;
    borderRadius?: string;
  };
}

export function DraggableTextOverlay({
  text,
  position,
  onPositionChange,
  containerRef,
  style: textStyle,
}: DraggableTextOverlayProps) {
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  const getContainerRect = useCallback(() => {
    return containerRef.current?.getBoundingClientRect() ?? null;
  }, [containerRef]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = getContainerRect();
      if (!rect) return;

      setDragging(true);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        posX: position.x,
        posY: position.y,
      };

      // Capture pointer for reliable tracking outside element
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [position, getContainerRect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !dragStartRef.current) return;
      const rect = getContainerRect();
      if (!rect) return;

      const deltaX = (e.clientX - dragStartRef.current.mouseX) / rect.width;
      const deltaY = (e.clientY - dragStartRef.current.mouseY) / rect.height;

      const newX = clamp(dragStartRef.current.posX + deltaX, 0.05, 0.95);
      const newY = clamp(dragStartRef.current.posY + deltaY, 0.05, 0.95);

      onPositionChange({ x: newX, y: newY });
    },
    [dragging, getContainerRect, onPositionChange]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    dragStartRef.current = null;
  }, []);

  if (!text.trim()) return null;

  return (
    <div
      ref={overlayRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute select-none"
      style={{
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        cursor: dragging ? 'grabbing' : 'grab',
        zIndex: 10,
        maxWidth: textStyle?.maxWidth || '80%',
        textAlign: 'center',
        // Text styling
        color: textStyle?.color || '#FFFFFF',
        fontSize: textStyle?.fontSize || '14px',
        fontWeight: textStyle?.fontWeight || '700',
        textShadow: textStyle?.textShadow || '0 2px 8px rgba(0,0,0,0.8)',
        backgroundColor: textStyle?.backgroundColor,
        padding: textStyle?.padding,
        borderRadius: textStyle?.borderRadius,
        lineHeight: '1.35',
        wordBreak: 'break-word',
        // Visual feedback during drag
        outline: dragging ? '2px dashed rgba(0,212,255,0.6)' : 'none',
        outlineOffset: '4px',
        transition: dragging ? 'none' : 'outline 0.15s ease',
      }}
    >
      {text}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-frontend
git add src/components/content-kit/DraggableTextOverlay.tsx
git commit -m "feat: add DraggableTextOverlay component for free-position text editing"
```

---

### Task 6: Update API client with composeOnly and {x,y} position

**Files:**
- Modify: `echome-frontend/src/lib/api-client.ts:2290-2317`

- [ ] **Step 1: Update regenerateCarousel signature**

Find the `regenerateCarousel` method (around line 2290). Update the options type:

```typescript
    /** Regenerate carousel with a different design preset or background */
    regenerateCarousel: async (kitId: string, options: {
      designPreset?: 'tweet-style' | 'text-box' | 'auto';
      background?: { type: 'preset' | 'image'; presetId?: string; imageUrl?: string };
      slideOverrides?: Array<{
        text?: string;
        textPosition?: { x: number; y: number };
      }>;
      composeOnly?: boolean;
    }) => {
```

- [ ] **Step 2: Update the response type to include backgroundUrl**

In the return type (around line 2307), add `backgroundUrl`:

```typescript
      return response.data as {
        success: boolean;
        data: {
          carousel: {
            id: string;
            slideCount: number;
            designPreset: string;
            slides: Array<{
              slideNumber: number;
              text: string;
              publicUrl: string;
              slideType?: string;
              template?: string;
              backgroundUrl?: string;
            }>;
          };
        };
      };
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-frontend
git add src/lib/api-client.ts
git commit -m "feat: add composeOnly and textPosition {x,y} to carousel API client"
```

---

### Task 7: Rebuild CarouselEditorModal with drag-to-position

**Files:**
- Modify: `echome-frontend/src/components/content-kit/CarouselEditorModal.tsx`

- [ ] **Step 1: Rewrite CarouselEditorModal**

Replace the entire file with the new implementation that uses background images + `DraggableTextOverlay` + download-triggers-compose:

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  Loader2,
} from 'lucide-react';
import { downloadImage } from '@/lib/download';
import { showErrorToast } from '@/lib/toast';
import { CarouselStyleEditor } from './CarouselStyleEditor';
import { DraggableTextOverlay } from './DraggableTextOverlay';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

interface CarouselSlide {
  slideNumber: number;
  publicUrl: string;
  backgroundUrl?: string;
  text: string;
  template?: string;
}

interface SlideEdit {
  text: string;
  position: { x: number; y: number };
}

interface CarouselEditorModalProps {
  open: boolean;
  onClose: () => void;
  slides: CarouselSlide[];
  contentKitId: string;
  designPreset?: string;
  uploadId?: string;
  onCarouselUpdate: () => void;
}

/** Approximate CSS text style per template type for the drag overlay preview */
const TEMPLATE_TEXT_STYLES: Record<string, {
  color: string;
  fontSize: string;
  fontWeight: string;
  textShadow: string;
  backgroundColor?: string;
  padding?: string;
  borderRadius?: string;
}> = {
  'tweet-style': {
    color: '#0f1419',
    fontSize: '11px',
    fontWeight: '500',
    textShadow: 'none',
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: '8px 12px',
    borderRadius: '10px',
  },
  'text-box': {
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: '800',
    textShadow: '0 2px 8px rgba(0,0,0,0.7)',
  },
  'photo-overlay': {
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: '700',
    textShadow: 'none',
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: '6px 14px',
    borderRadius: '8px',
  },
};

export default function CarouselEditorModal({
  open,
  onClose,
  slides: initialSlides,
  contentKitId,
  designPreset,
  uploadId,
  onCarouselUpdate,
}: CarouselEditorModalProps) {
  const [slides, setSlides] = useState<CarouselSlide[]>(initialSlides);
  const [edits, setEdits] = useState<SlideEdit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Init edits from slides
  useEffect(() => {
    setSlides(initialSlides);
    setEdits(initialSlides.map((s) => ({
      text: s.text,
      position: { x: 0.5, y: 0.5 },
    })));
  }, [initialSlides]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const active = document.activeElement;
      const isTyping = active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT';
      if (e.key === 'ArrowLeft' && !isTyping) setActiveIndex((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight' && !isTyping) setActiveIndex((p) => Math.min(slides.length - 1, p + 1));
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose, slides.length]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  const updateEdit = (index: number, patch: Partial<SlideEdit>) => {
    setEdits((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const handleDownload = async (slideIndex?: number) => {
    setDownloading(true);
    try {
      // Send edits to backend for composition
      const overrides = (slideIndex !== undefined ? [edits[slideIndex]] : edits).map((e) => ({
        text: e.text,
        textPosition: e.position,
      }));

      const response = await api.contentKits.regenerateCarousel(contentKitId, {
        designPreset: (designPreset as any) || 'auto',
        composeOnly: true,
        slideOverrides: slideIndex !== undefined
          // For single slide, pad overrides array so the target index aligns
          ? edits.map((e, i) => i === slideIndex
              ? { text: e.text, textPosition: e.position }
              : { text: slides[i]?.text, textPosition: { x: 0.5, y: 0.5 } }
            )
          : overrides,
      });

      if (response.success && response.data?.carousel?.slides) {
        const composedSlides = response.data.carousel.slides;
        if (slideIndex !== undefined) {
          // Download single slide
          const slide = composedSlides[slideIndex];
          if (slide) await downloadImage(slide.publicUrl, `carousel-slide-${slide.slideNumber}.png`);
        } else {
          // Download all slides
          for (const slide of composedSlides) {
            await downloadImage(slide.publicUrl, `carousel-slide-${slide.slideNumber}.png`);
          }
        }
        toast.success(slideIndex !== undefined ? 'Slide downloaded' : 'All slides downloaded');
      }
    } catch (err) {
      showErrorToast(err, 'downloading carousel');
    } finally {
      setDownloading(false);
    }
  };

  const handleRestyleComplete = (carousel: {
    slides: Array<{ slideNumber: number; text: string; publicUrl: string; template?: string; backgroundUrl?: string }>;
    designPreset?: string;
  }) => {
    const newSlides = carousel.slides.map((s) => ({
      slideNumber: s.slideNumber,
      publicUrl: s.publicUrl,
      backgroundUrl: s.backgroundUrl,
      text: s.text,
      template: s.template,
    }));
    setSlides(newSlides);
    setEdits(newSlides.map((s) => ({ text: s.text, position: { x: 0.5, y: 0.5 } })));
    onCarouselUpdate();
  };

  const activeSlide = slides[activeIndex];
  const activeEdit = edits[activeIndex];

  if (!open || slides.length === 0 || !activeSlide || !activeEdit) return null;

  // Use background URL if available, fall back to composite
  const previewImageUrl = activeSlide.backgroundUrl || activeSlide.publicUrl;
  const hasBackground = !!activeSlide.backgroundUrl;
  const templateStyle = TEMPLATE_TEXT_STYLES[activeSlide.template || 'text-box'] || TEMPLATE_TEXT_STYLES['text-box'];

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="relative flex w-full max-w-[920px] max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col lg:flex-row w-full overflow-y-auto">
          {/* Left: Slide preview with draggable text */}
          <div className="flex flex-col items-center justify-center p-6 lg:w-[45%] shrink-0 bg-background/50">
            <div className="relative w-full max-w-[300px]" ref={previewContainerRef}>
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img
                  src={previewImageUrl}
                  alt={`Slide ${activeSlide.slideNumber}`}
                  className="w-full"
                  draggable={false}
                />

                {/* Draggable text overlay — only when background available */}
                {hasBackground && (
                  <DraggableTextOverlay
                    text={activeEdit.text}
                    position={activeEdit.position}
                    onPositionChange={(pos) => updateEdit(activeIndex, { position: pos })}
                    containerRef={previewContainerRef}
                    style={templateStyle}
                  />
                )}
              </div>

              {/* Nav arrows */}
              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((p) => Math.max(0, p - 1))}
                    disabled={activeIndex === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/70 transition-colors z-20"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((p) => Math.min(slides.length - 1, p + 1))}
                    disabled={activeIndex === slides.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/70 transition-colors z-20"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Filmstrip */}
            <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
              {slides.map((slide, i) => (
                <button
                  key={slide.slideNumber}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                    i === activeIndex
                      ? 'border-primary-interactive ring-1 ring-primary-interactive/30'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <img src={slide.publicUrl} alt={`Slide ${slide.slideNumber}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white drop-shadow-md">{slide.slideNumber}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">{activeIndex + 1} / {slides.length}</p>

            {!hasBackground && (
              <p className="text-[10px] text-muted-foreground/50 mt-2 text-center">
                Drag-to-position available after next style change
              </p>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex flex-col gap-4 p-6 lg:w-[55%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Carousel Editor</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Slide text editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Slide {activeSlide.slideNumber} Text
              </label>
              <textarea
                value={activeEdit.text}
                onChange={(e) => updateEdit(activeIndex, { text: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary-interactive/50 resize-none"
                rows={3}
                placeholder="Slide text..."
              />
              {hasBackground && (
                <p className="text-[11px] text-muted-foreground/60">
                  Drag the text on the preview to reposition
                </p>
              )}
            </div>

            {/* Style editor */}
            <CarouselStyleEditor
              kitId={contentKitId}
              currentDesignPreset={designPreset}
              uploadId={uploadId}
              onRestyleComplete={handleRestyleComplete}
            />

            {/* Download */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDownload(activeIndex)}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-interactive px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Slide
              </button>
              <button
                type="button"
                onClick={() => handleDownload()}
                disabled={downloading}
                className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card transition-colors disabled:opacity-50"
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
                All ({slides.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-frontend
git add src/components/content-kit/CarouselEditorModal.tsx
git commit -m "feat: rebuild CarouselEditorModal with draggable text + download-triggers-compose"
```

---

### Task 8: Wire carousel card to open editor in ContentKitDetailContent

**Files:**
- Modify: `echome-frontend/src/app/app/content-kit/[id]/ContentKitDetailContent.tsx`

- [ ] **Step 1: Add import and state**

Add the import (after the existing ClipEditorModal import):
```typescript
import CarouselEditorModal from '@/components/content-kit/CarouselEditorModal';
```

Add state (after `activeClipForEditor` state):
```typescript
const [carouselEditorOpen, setCarouselEditorOpen] = useState(false);
```

- [ ] **Step 2: Wire the carousel card onClick**

Find the carousel card's `onClick` (the one with the comment `/* carousel editor — pending drag-to-position redesign */`). Replace with:

```typescript
onClick={() => setCarouselEditorOpen(true)}
```

- [ ] **Step 3: Add the modal instance**

Before the `{/* Reel Editor Modal */}` comment, add:

```tsx
      {/* Carousel Editor Modal */}
      {hasCarousel && (
        <CarouselEditorModal
          open={carouselEditorOpen}
          onClose={() => setCarouselEditorOpen(false)}
          slides={detail.carousel.slides.map((s: any) => ({
            slideNumber: s.slideNumber,
            publicUrl: s.publicUrl,
            backgroundUrl: s.backgroundUrl || s.background_url,
            text: s.text || '',
            template: s.template || s.slideType,
          }))}
          contentKitId={contentKitId || id}
          designPreset={detail.carousel.designPreset}
          uploadId={detail?.clips?.[0]?.videoUploadId}
          onCarouselUpdate={() => refresh()}
        />
      )}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/aramammo/Side\ Quests/echome-frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /Users/aramammo/Side\ Quests/echome-frontend
git add src/app/app/content-kit/\[id\]/ContentKitDetailContent.tsx
git commit -m "feat: wire carousel card to drag-to-position editor"
```

- [ ] **Step 6: Push both repos**

```bash
cd /Users/aramammo/Side\ Quests/echome-platform-v2 && git push
cd /Users/aramammo/Side\ Quests/echome-frontend && git push
```
