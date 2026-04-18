# Carousel Drag-to-Position Text Editor — Design Spec

**Goal:** Replace the burned-in text carousel system with a two-phase render pipeline (background + text composition) that enables free-drag text positioning in the frontend, with pixel-perfect burn-in at download time.

**Scope:** Carousel slides only. Clip captions will follow the same pattern in a future spec.

---

## Architecture Overview

Current carousel slides are monolithic PNGs — background and text rendered together in one pass. This means any text edit or repositioning requires a full re-render.

The new system splits rendering into two phases:

1. **Background phase**: Canvas templates render everything except text (gradients, card frames, photos, overlays). Stored as `slide-{n}-bg.png`.
2. **Composition phase**: Text is composited onto the cached background at specified x,y coordinates. Stored as `slide-{n}.png`.

The frontend shows the background-only image with a draggable HTML text overlay. The user drags text anywhere on the slide. At download time, the backend composites text at the final coordinates using the template's actual fonts and styling.

---

## Backend Changes

### 1. `skipText` flag on canvas templates

**Files:**
- `src/services/image/carousel-templates.ts`
- `src/services/image/canvas-tweet-template.ts`
- `src/services/image/canvas-text-box-template.ts`
- `src/services/image/canvas-photo-template.ts`

Add `skipText?: boolean` to `SlideConfig`. Each template checks this flag and returns the canvas buffer before any text-drawing calls when `true`.

For tweet-style: skip after drawing gradient + card frame + profile avatar.
For text-box: skip after drawing background color/image + box outlines.
For photo-overlay: skip after drawing background image + shadow/gradient overlays.

### 2. Two-phase render in carousel-generator

**File:** `src/services/image/carousel-generator.ts`

`generateCarousel()` renders each slide twice:
- First pass: `skipText: true` → background buffer → upload as `slide-{n}-bg.png`
- Second pass: compose text onto background at default position `{ x: 0.5, y: 0.5 }` → upload as `slide-{n}.png`

The returned `GeneratedSlide` adds:
```typescript
backgroundUrl: string;  // Public URL to text-free background
```

For efficiency, both passes run in sequence per slide (background → immediate compose), not two full batch passes.

### 3. Text composition function

**New file:** `src/services/image/canvas-text-compositor.ts`

```typescript
export async function composeTextOnBackground(
  backgroundBuffer: Buffer,
  text: string,
  position: { x: number; y: number },  // 0-1 normalized
  templateType: TemplateType,
  designSystem: CarouselDesignSystem,
  aspectRatio: AspectRatio,
  slideType: SlideType,
): Promise<Buffer>
```

This function:
1. Loads the background buffer as a canvas image
2. Determines font family, size, weight, color, and shadow from `templateType` + `designSystem` (reuses the same font logic as the original template)
3. Draws text centered at the x,y coordinates (x = horizontal center of text block, y = vertical center)
4. Word-wraps text to fit within 80% of canvas width
5. Returns the composited PNG buffer

Font styling per template:
- **tweet-style**: Dark text (#0f1419), Montserrat, inside card bounds
- **text-box**: White/accent text, bold weight, with outline shadow
- **photo-overlay**: White text in pill/badge containers with backdrop blur effect

### 4. Updated regenerate-carousel endpoint

**File:** `src/routes/content-kits.ts`

The `POST /api/content-kits/:id/regenerate-carousel` endpoint accepts:
```typescript
slideOverrides?: Array<{
  text?: string;
  textPosition?: { x: number; y: number };
}>
```

**Two execution paths:**

**Full regenerate** (style/design change): Runs the full two-phase pipeline. Generates new backgrounds + composites.

**Compose-only** (text/position change): When `composeOnly: true` is passed and backgrounds exist in storage, skips background rendering entirely. Loads cached backgrounds, composites with new text/position, uploads final slides. This is the fast path for drag-to-position edits — should complete in under 2 seconds.

### 5. Database changes

Add `background_url` to the slides JSONB stored in `generated_carousels`. No new columns on the table itself — the slides array already stores per-slide metadata.

---

## Frontend Changes

### 1. CarouselEditorModal rebuild

**File:** `src/components/content-kit/CarouselEditorModal.tsx`

**Layout:** Same split-panel modal (left = preview, right = controls).

**Left panel — slide preview:**
- Shows the background-only image (`backgroundUrl`) as `<img>`
- Text rendered as an absolutely-positioned `<div>` inside the preview container
- Text is draggable via mouse/touch events
- Position stored as normalized 0-1 coordinates

**Right panel — controls:**
- Textarea for editing current slide's text
- Slide filmstrip for navigation (arrow keys + click)
- Aspect ratio toggle (Portrait / Square)
- Style editor (Quote Card / Text on Color / My Image / Video Frame)
- Download Slide / Download All buttons

**No "Apply & Regenerate" button.** Download triggers composition with current edits.

### 2. DraggableTextOverlay component

**New file:** `src/components/content-kit/DraggableTextOverlay.tsx`

A reusable component for drag-to-position text on any canvas.

**Props:**
```typescript
interface DraggableTextOverlayProps {
  text: string;
  position: { x: number; y: number };  // 0-1 normalized
  onPositionChange: (pos: { x: number; y: number }) => void;
  containerRef: RefObject<HTMLDivElement>;  // Parent bounds for coordinate normalization
  style?: {
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    textShadow?: string;
    maxWidth?: string;
  };
}
```

**Behavior:**
- Renders text at position within container bounds
- mousedown/touchstart initiates drag
- mousemove/touchmove updates position (clamped to 5%-95% to prevent off-screen)
- mouseup/touchend commits position
- Cursor changes to `grab` on hover, `grabbing` while dragging
- Position converted to/from normalized coordinates using container dimensions

This component is designed to be reusable for the future clip caption drag-to-position feature.

### 3. Per-slide edit state

```typescript
interface SlideEdit {
  text: string;
  position: { x: number; y: number };
}

const [edits, setEdits] = useState<SlideEdit[]>(
  slides.map(s => ({
    text: s.text,
    position: { x: 0.5, y: 0.5 },  // Default: centered
  }))
);
```

Each slide maintains independent text + position. Navigating between slides preserves edits.

### 4. Download flow

When user clicks Download:
1. Frontend calls `regenerateCarousel` with `composeOnly: true` and `slideOverrides` containing each slide's text + position
2. Backend loads cached backgrounds, composites text, returns new URLs
3. Frontend triggers download of the composed images

Single slide download sends overrides for just that slide. "Download All" sends all.

### 5. API client update

**File:** `src/lib/api-client.ts`

```typescript
regenerateCarousel: async (kitId: string, options: {
  designPreset?: string;
  background?: { type: string; presetId?: string; imageUrl?: string };
  slideOverrides?: Array<{
    text?: string;
    textPosition?: { x: number; y: number };
  }>;
  composeOnly?: boolean;
}) => { ... }
```

---

## Preview vs. Final Output

The frontend preview uses CSS-styled text (approximate font weight, size, color). The backend composition uses the actual template fonts (Montserrat, Inter, etc.) with precise rendering. There will be minor visual differences between preview and download — this is acceptable and expected. The preview is directional; the download is pixel-perfect.

To minimize the gap, the `DraggableTextOverlay` uses style hints per template:
- tweet-style: dark text, serif-adjacent font, card-like container
- text-box: white bold text, text shadow
- photo-overlay: white text with pill/badge background

---

## What This Does NOT Include

- **Clip caption drag-to-position** — future spec, same `DraggableTextOverlay` component
- **Multiple text layers** — single text block per slide only
- **Font selection** — uses template defaults
- **Text color picker** — uses template defaults
- **Rotation or scaling** — drag is position-only
- **Undo/redo** — edits are ephemeral until download

---

## File Summary

**Backend (echome-platform-v2):**
| File | Change |
|------|--------|
| `src/services/image/carousel-templates.ts` | Add `skipText`, `textPosition: {x,y}` to SlideConfig |
| `src/services/image/canvas-tweet-template.ts` | Early return when `skipText` |
| `src/services/image/canvas-text-box-template.ts` | Early return when `skipText` |
| `src/services/image/canvas-photo-template.ts` | Early return when `skipText` |
| `src/services/image/canvas-text-compositor.ts` | **New** — compose text at x,y on background |
| `src/services/image/carousel-generator.ts` | Two-phase render, return `backgroundUrl` |
| `src/routes/content-kits.ts` | `composeOnly` fast path, `slideOverrides` with x,y |

**Frontend (echome-frontend):**
| File | Change |
|------|--------|
| `src/components/content-kit/DraggableTextOverlay.tsx` | **New** — reusable drag-to-position text component |
| `src/components/content-kit/CarouselEditorModal.tsx` | Rebuild with background image + draggable text + download flow |
| `src/lib/api-client.ts` | Add `composeOnly`, `textPosition: {x,y}` to regenerateCarousel |
| `src/app/app/content-kit/[id]/ContentKitDetailContent.tsx` | Wire carousel card to open editor, pass `backgroundUrl` |
