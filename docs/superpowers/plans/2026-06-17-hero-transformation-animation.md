# Hero Transformation Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage hero's placeholder screenshot carousel with a self-drawing SVG that animates "raw input → Echo learns it → output in your voice", using the existing `SketchExplainer` engine.

**Architecture:** Add one new scene (`hero-transform`) to the dependency-free `SketchExplainer` engine. Swap the innards of `HeroDemoVideo` (keep its glass chrome + floating cards) to render that scene instead of the carousel. Drop the `opacity-0` LCP trap on the hero h1.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind, Vitest + Testing Library (jsdom). No new dependencies.

## Global Constraints

- No new dependencies. Pure coded SVG via the existing engine.
- Animate `transform`/`opacity` only (engine already complies).
- `prefers-reduced-motion` → static final frame (engine already complies).
- One mover in the hero; headline + CTAs stay static and first-paint.
- No em dashes in any user-facing copy (house style).
- Test runner: `npm run test:unit` (vitest run). jsdom stubs `matchMedia` (matches:false) in `vitest.setup.ts`; `IntersectionObserver` is undefined in jsdom and the engine renders a static scene as fallback.
- `src/components/sketch/` is currently untracked; committing it is part of this work.

---

### Task 1: Add the `hero-transform` scene to the engine

**Files:**
- Modify: `src/components/sketch/SketchExplainer.tsx` (type union ~line 28; add scene fn after `SceneSchedule` ~line 373; register in `SCENES` ~line 375 and `SCENE_DURATIONS` ~line 383)
- Test: `src/components/sketch/SketchExplainer.test.tsx` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: a new `SceneId` value `'hero-transform'`, renderable as `<SketchExplainer scene="hero-transform" accent="#RRGGBB" />`. Renders an `<svg role="img">` with an `aria-label`.

- [ ] **Step 1: Write the failing test**

Create `src/components/sketch/SketchExplainer.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SketchExplainer } from './SketchExplainer';

describe('SketchExplainer hero-transform scene', () => {
  it('renders an accessible svg for the hero-transform scene', () => {
    render(<SketchExplainer scene="hero-transform" accent="#6FC3EC" />);
    const img = screen.getByRole('img');
    expect(img.tagName.toLowerCase()).toBe('svg');
    expect(img).toHaveAttribute('aria-label');
    expect(img.getAttribute('aria-label')!.length).toBeGreaterThan(10);
  });

  it('applies the accent color to the scene strokes', () => {
    const { container } = render(
      <SketchExplainer scene="hero-transform" accent="#6FC3EC" />,
    );
    // The scoped <style> tag carries the accent in the .stroke rule.
    const style = container.querySelector('style');
    expect(style?.textContent).toContain('#6FC3EC');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/sketch/SketchExplainer.test.tsx`
Expected: FAIL — `hero-transform` is not assignable to `scene` / `SCENES['hero-transform']` is undefined (TypeScript error or runtime "Scene is not a function").

- [ ] **Step 3: Extend the SceneId union**

In `src/components/sketch/SketchExplainer.tsx`, change the type (currently line ~28):

```ts
type SceneId = 'what-is-echome' | 'video-to-kit' | 'build-voice' | 'schedule' | 'hero-transform';
```

- [ ] **Step 4: Add the scene function**

Insert after `SceneSchedule` (after its closing `}` ~line 373, before `const SCENES`):

```tsx
// ---- Scene 5: "Hero transform" -------------------------------------------
// Homepage hero. Three beats on one horizontal spine: your video + voice ->
// Echo reads it -> a finished post/carousel that sounds like you. Minimal
// captions (glanceable, not a tutorial). Beat 2 is wordless.

function SceneHeroTransform({ accent, scope, paused }: SceneProps) {
  return (
    <svg
      viewBox="0 0 460 280"
      width="100%"
      role="img"
      aria-label="Your video and voice go in. Echo reads them and writes a finished post that sounds like you."
      className={`${scope} ${paused ? 'paused' : ''}`}
    >
      <style dangerouslySetInnerHTML={{ __html: sceneCss(scope, accent) }} />

      {/* Beat 1: your video (frame + play) */}
      <g>
        <rect x="40" y="110" width="88" height="60" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '0s' }} />
        <path d="M68 128 L68 152 L92 140 Z" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.25s' }} />
      </g>
      <text x="84" y="206" className="cap" style={{ ['--d' as string]: '0.5s' }}>Your video, your voice</text>

      {/* Arrow: video -> Echo */}
      <path d="M128 140 H190" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.8s' }} />
      <path d="M182 133 L192 140 L182 147" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.95s' }} />

      {/* Beat 2: Echo reads it (node + transcript lines + pulse ring) — wordless */}
      <g>
        <circle cx="240" cy="140" r="36" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.1s' }} />
        <path d="M222 134 H258 M222 142 H250 M222 150 H254" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.35s' }} />
        <circle cx="240" cy="140" r="46" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.55s' }} />
      </g>

      {/* Arrow: Echo -> output */}
      <path d="M288 140 H350" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.85s' }} />
      <path d="M342 133 L352 140 L342 147" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.0s' }} />

      {/* Beat 3: finished post / carousel (stacked cards + lines + check) */}
      <g>
        <rect x="372" y="94" width="64" height="60" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.15s' }} />
        <rect x="364" y="102" width="64" height="60" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.3s' }} />
        <rect x="356" y="110" width="64" height="60" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.45s' }} />
        <path d="M366 132 H410 M366 144 H402" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '2.65s' }} />
        <path d="M366 152 L376 162 L398 140" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.9s' }} />
      </g>
      <text x="388" y="206" className="cap" style={{ ['--d' as string]: '3.2s' }}>Comes out sounding like you</text>
    </svg>
  );
}
```

- [ ] **Step 5: Register the scene**

In the `SCENES` map (~line 375) add the entry:

```ts
const SCENES: Record<SceneId, (p: SceneProps) => React.JSX.Element> = {
  'what-is-echome': Scene1,
  'video-to-kit': SceneVideoToKit,
  'build-voice': SceneBuildVoice,
  'schedule': SceneSchedule,
  'hero-transform': SceneHeroTransform,
};
```

In `SCENE_DURATIONS` (~line 383) add:

```ts
const SCENE_DURATIONS: Record<SceneId, number> = {
  'what-is-echome': 9500,
  'video-to-kit': 9500,
  'build-voice': 7500,
  'schedule': 8000,
  'hero-transform': 8000,
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test:unit -- src/components/sketch/SketchExplainer.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/sketch/SketchExplainer.tsx src/components/sketch/SketchExplainer.test.tsx
git commit -m "feat(sketch): add hero-transform scene to SketchExplainer"
```

---

### Task 2: Swap HeroDemoVideo innards to render the scene

**Files:**
- Modify: `src/components/landing/HeroDemoVideo.tsx` (replace carousel state + markup; keep glass chrome, floating cards, decorative ring)
- Test: `src/components/landing/HeroDemoVideo.test.tsx` (create)

**Interfaces:**
- Consumes: `SketchExplainer` with `scene="hero-transform"` from Task 1.
- Produces: `HeroDemoVideo` still exported with the same name and no props (HeroSection import unchanged).

- [ ] **Step 1: Write the failing test**

Create `src/components/landing/HeroDemoVideo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroDemoVideo } from './HeroDemoVideo';

describe('HeroDemoVideo', () => {
  it('renders the hero-transform sketch, not the screenshot carousel', () => {
    render(<HeroDemoVideo />);
    // The sketch scene exposes an accessible svg.
    expect(screen.getByRole('img')).toBeInTheDocument();
    // Old carousel artifacts are gone.
    expect(screen.queryByAltText('EchoMe create page')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Show slide/ })).not.toBeInTheDocument();
  });

  it('keeps the floating proof cards', () => {
    render(<HeroDemoVideo />);
    expect(screen.getByText('Voice Matched 99%')).toBeInTheDocument();
    expect(screen.getByText('Instagram Carousel Gen')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/landing/HeroDemoVideo.test.tsx`
Expected: FAIL — `getByAltText('EchoMe create page')` still matches (carousel present) / no `role="img"` svg yet.

- [ ] **Step 3: Replace the file contents**

Overwrite `src/components/landing/HeroDemoVideo.tsx` with:

```tsx
'use client';

/**
 * Homepage hero visual. A self-drawing SVG (SketchExplainer "hero-transform"
 * scene) showing: your video + voice -> Echo reads it -> a finished post in
 * your voice. Wrapped in the same glass chrome + floating cards as the prior
 * placeholder so a real product walkthrough video can drop back into this
 * frame later with zero relayout. Keep this component's name so the
 * HeroSection import stays stable.
 */

import { Zap } from 'lucide-react';
import { SketchExplainer } from '@/components/sketch/SketchExplainer';

// Bright accent so the line-art strokes + captions read on the dark hero bg.
// Tunable against the live card.
const HERO_ACCENT = '#6FC3EC';

export function HeroDemoVideo() {
  return (
    <div className="relative group">
      {/* Glass Container */}
      <div className="relative z-10 p-4 sm:p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-xl border border-white/5 shadow-[0_20px_40px_rgba(0,103,126,0.15)]">
        <div className="rounded-xl overflow-hidden bg-gray-950 relative flex items-center justify-center px-6 py-10 sm:py-12">
          <SketchExplainer scene="hero-transform" accent={HERO_ACCENT} className="w-full" />
        </div>

        {/* Floating card: Voice Matched — top right, bouncing */}
        <div className="absolute -top-5 -right-5 sm:-top-6 sm:-right-6 z-20 bg-white/[0.03] backdrop-blur-xl p-3 sm:p-4 rounded-xl border border-white/10 shadow-[0_20px_40px_rgba(0,103,126,0.15)] flex items-center gap-3 animate-bounce pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-accent-purple" />
          </div>
          <span className="text-[11px] font-bold text-white whitespace-nowrap">Voice Matched 99%</span>
        </div>

        {/* Floating card: Instagram Carousel Gen — bottom left */}
        <div className="absolute -bottom-6 -left-4 sm:-bottom-8 sm:-left-12 z-20 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,103,126,0.15)] flex flex-col gap-2 max-w-[180px] pointer-events-none">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-white/40 uppercase tracking-tight">Drafting...</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse" />
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-[70%] bg-primary rounded-full transition-all duration-1000" />
          </div>
          <span className="text-xs text-white/80 font-medium">Instagram Carousel Gen</span>
        </div>
      </div>

      {/* Decorative circle behind container */}
      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] border border-white/5 rounded-full opacity-50 pointer-events-none" />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/components/landing/HeroDemoVideo.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/HeroDemoVideo.tsx src/components/landing/HeroDemoVideo.test.tsx
git commit -m "feat(hero): render hero-transform sketch in place of screenshot carousel"
```

---

### Task 3: Fix the hero h1 LCP trap

**Files:**
- Modify: `src/components/landing/HeroSection.tsx:22-30` (the h1)
- Test: `src/components/landing/HeroSection.test.tsx` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed downstream. The h1 paints at first paint (no `opacity-0`).

- [ ] **Step 1: Write the failing test**

Create `src/components/landing/HeroSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('renders the headline visible at first paint (no opacity-0 LCP trap)', () => {
    render(<HeroSection />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.className).not.toContain('opacity-0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/landing/HeroSection.test.tsx`
Expected: FAIL — h1 className contains `opacity-0`.

- [ ] **Step 3: Drop opacity-0 (and its fade) on the h1 only**

In `src/components/landing/HeroSection.tsx`, change the h1's className (line ~23) from:

```tsx
className="font-headline text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight opacity-0 animate-fade-in"
```

to (remove `opacity-0 animate-fade-in`):

```tsx
className="font-headline text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight"
```

Then remove the now-dead `style={{ animationDelay: '200ms' }}` from the same h1 (the surrounding `<h1 ... >` opening tag). Leave the value prop, CTAs, social proof, and right slot fades untouched.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/components/landing/HeroSection.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/HeroSection.tsx src/components/landing/HeroSection.test.tsx
git commit -m "fix(hero): paint h1 at first paint (drop opacity-0 LCP trap)"
```

---

### Task 4: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test:unit`
Expected: PASS (no regressions in existing landing/echo tests).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build completes with no type errors (the `SceneId` union change compiles).

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`, open `http://localhost:3000`.
Confirm:
- The hero right slot draws the 3-beat scene left→right inside the glass card.
- Floating cards ("Voice Matched 99%", "Instagram Carousel Gen") and the decorative ring are intact.
- The scene loops (~8s) while in view.
- The headline is visible immediately on load (no fade-in flash).
- With OS "Reduce motion" on, the scene shows a static final frame (no loop).

- [ ] **Step 4: Commit (if any tuning changes were made)**

If you adjusted `HERO_ACCENT` or scene coordinates during the visual check:

```bash
git add -A
git commit -m "chore(hero): tune hero-transform accent/coords against live card"
```

---

## Self-Review

**Spec coverage:**
- Replace carousel with hero-transform scene → Tasks 1 + 2. ✓
- Keep glass chrome + floating cards for future video drop-in → Task 2 (chrome/cards preserved verbatim). ✓
- 3 beats (input → learning pulse → output) + minimal captions, beat 2 wordless, no em dashes → Task 1 scene code. ✓
- Theming 3a (bright accent on dark) → Task 2 `HERO_ACCENT`. ✓
- LCP h1 fix → Task 3. ✓
- Guardrails (one mover, transform/opacity, reduced-motion, in-view) → inherited from engine; verified in Task 4 Step 3. ✓
- Promote untracked `src/components/sketch/` to tracked → committed in Task 1. ✓
- Testing section (visual, reduced-motion, in-view, a11y, LCP, build) → Tasks 1–4 tests + Task 4 manual checks. ✓

**Placeholder scan:** No TBD/TODO; all code blocks complete; exact paths and commands given. ✓

**Type consistency:** `SceneId` extended in Task 1 and consumed as `scene="hero-transform"` in Task 2. `SceneHeroTransform` registered in both `SCENES` and `SCENE_DURATIONS`. `HeroDemoVideo` keeps its name/no-props contract. `HERO_ACCENT` defined and used in the same file. ✓
