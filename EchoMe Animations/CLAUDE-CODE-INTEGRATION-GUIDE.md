# EchoMe Feature Animations — Claude Code Integration Brief

## What This Is

5 animated React components that showcase EchoMe's core features. Each is a self-contained full-viewport animation with real product screenshots embedded as base64 data URIs. They loop continuously and use a consistent dark theme (slate/cyan/purple palette matching EchoMe's existing brand).

## The Components

| File | Feature | Accent Color | Screenshot(s) Embedded |
|------|---------|-------------|----------------------|
| `echome-carousel-showcase.jsx` | Tweet-style carousels | Cyan + Purple | 6 real carousel output slides |
| `echome-knowledge-base.jsx` | Knowledge base / voice ingestion | Emerald + Cyan | KB import view, dashboard sidebar |
| `echome-video-processing.jsx` | Upload → Content Kit pipeline | Orange + Cyan | Homepage hero, Content Kit UI |
| `echome-content-calendar.jsx` | Content calendar scheduling | Rose + Purple | Content Kit with captions |
| `echome-creator-repurposing.jsx` | Creator following / repurposing | Amber + Cyan | Content Kit output view |

## How They Work

Each component:
- Is a single default-export React functional component
- Uses `useState` and `useEffect` (imported from "react")
- Contains inline styles only — no external CSS files needed
- Embeds product screenshots as base64 JPEG data URIs (no external image deps)
- Loops its animation sequence infinitely via async/await timing
- Renders at `width: 100%` and `height: 100vh`

## Integration Options

### Option A: Features Section on Landing Page (Recommended)

Add a horizontally scrollable or tabbed features section to tryechome.com. Each tab/card loads one animation component.

```
Prompt for Claude Code:

"I have 5 React animation components for an EchoMe features section.
Each component is a self-contained .jsx file with inline styles and
base64-embedded images. No external dependencies beyond React.

Add a features section to the tryechome.com landing page below the
hero. Use a tabbed interface with these 5 tabs:

1. Carousels (echome-carousel-showcase)
2. Knowledge Base (echome-knowledge-base)
3. Video Processing (echome-video-processing)
4. Content Calendar (echome-content-calendar)
5. Creator Following (echome-creator-repurposing)

Each tab loads its component into a viewport-height container. Default
to the 'Video Processing' tab since that shows the core value prop.

The tab bar should use the same dark slate palette as the components.
Tab labels should be the feature names with their emoji icons.

Component files are in [path to your components directory].
The site uses Next.js with [your specific version/config]."
```

### Option B: Standalone Demo Page

Create a dedicated `/demo` or `/features` route that shows all 5 animations in sequence as full-viewport scroll sections.

```
Prompt for Claude Code:

"Create a /demo page on the tryechome.com Next.js site. It should
render 5 full-viewport animated React components in a vertical scroll
layout. Each section is 100vh tall. Add a floating nav on the right
side with dots indicating which section is visible.

Sections in order:
1. Video Processing (echome-video-processing.jsx)
2. Carousels (echome-carousel-showcase.jsx)
3. Knowledge Base (echome-knowledge-base.jsx)
4. Content Calendar (echome-content-calendar.jsx)
5. Creator Following (echome-creator-repurposing.jsx)

Components are in [path]. They use inline styles and base64 images,
no external deps needed. Each exports a default React component."
```

### Option C: Individual Feature Pages

Each animation becomes the hero of its own feature detail page.

```
Prompt for Claude Code:

"For each of these 5 feature animation components, create a
dedicated page at /features/[feature-name]. The animation renders
as the hero section (100vh), followed by a text content section
explaining the feature in detail.

Routes:
- /features/carousels → echome-carousel-showcase.jsx
- /features/knowledge-base → echome-knowledge-base.jsx
- /features/video-processing → echome-video-processing.jsx
- /features/calendar → echome-content-calendar.jsx
- /features/repurposing → echome-creator-repurposing.jsx

Components are self-contained with inline styles and base64 images."
```

## Setup Steps for Claude Code

### 1. Place the component files

Copy all 5 `.jsx` files into your project's component directory:

```bash
# Example for a typical Next.js project
mkdir -p src/components/features
cp echome-*.jsx src/components/features/
```

### 2. Rename if needed

If your project uses `.tsx` (TypeScript), you may need to:
- Rename files to `.tsx`
- Add type annotations (Claude Code can do this automatically)

### 3. Tell Claude Code about your project structure

Include this context in your prompt:

```
"My project structure:
- Framework: Next.js [version]
- Styling: [Tailwind / CSS Modules / styled-components / inline]
- Components dir: [path]
- Pages/app dir: [path]
- The existing landing page is at [path]
- The site currently uses [dark/light] theme

The animation components use inline styles only. They import
useState and useEffect from 'react'. No other dependencies.
Base64 images are embedded directly in the component files."
```

### 4. Performance considerations

Tell Claude Code:

```
"These components contain large base64 strings (20-47KB per file).
For production, consider:
1. Lazy loading each component with React.lazy() + Suspense
2. Only rendering the visible/active tab component
3. Adding loading skeletons that match the dark background
4. Using Intersection Observer to pause animations when off-screen"
```

## Image Extraction (Optional)

If you want to serve images from your CDN instead of inline base64, the screenshots can be extracted. Tell Claude Code:

```
"Extract all base64 data URI images from the component files.
Save them as separate files in public/images/features/.
Replace the inline data URIs with image paths.
Use Next.js Image component where possible."
```

## Color Tokens

All components share these values:

```
Background Dark: #0f172a
Background Card: #1e293b  
Accent Cyan: #38bdf8
Accent Purple: #a78bfa
Accent Emerald: #34d399
Accent Orange: #fb923c
Accent Rose: #fb7185
Accent Amber: #fbbf24
Text Primary: #e2e8f0
Text Secondary: #64748b
Text Muted: #475569
```

These map to Tailwind's slate and color scales if your site uses Tailwind.

## Quick Test

To preview any component standalone before integrating:

```bash
# If you have a Next.js dev server running
# Create a test page at app/test/page.jsx:

import EchoMeCarouselShowcase from '@/components/features/echome-carousel-showcase'
export default function TestPage() {
  return <EchoMeCarouselShowcase />
}
```

Then visit `localhost:3000/test` to see it running.
