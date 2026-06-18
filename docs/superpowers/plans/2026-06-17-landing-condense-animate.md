# Landing Page Condense + Animate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut landing-page scroll fatigue by removing the one duplicate section, re-ordering survivors around buyer objections, evolving the hero into a multi-input animation, resurrecting the persona section in a dark restyle, and instrumenting scroll-depth.

**Architecture:** Re-sequence + dedup + animate the existing `src/app/HomeContent.tsx` section tree. No rebuild. Evolve the existing `SketchExplainer` `hero-transform` scene to show three converging inputs. Add `@vercel/analytics` for `section_view` + `cta_click` events via a thin wrapper and an IntersectionObserver hook.

**Tech Stack:** Next.js App Router, TypeScript, React 19, Tailwind v4, Vitest + Testing Library (`npm run test:unit`), `@vercel/analytics`.

## Global Constraints

- Branch off **main** (PR #93 hero scene already merged, `dd9c902`). Do NOT branch off `content/office-hours-jun17`.
- Animation: **transform/opacity only**; `prefers-reduced-motion` freezes the final frame; **no new runtime deps for animation**; reuse the `SketchExplainer` engine.
- `@vercel/analytics` is the ONLY new dependency permitted (instrumentation only).
- **No em dashes** in any new/edited user-facing copy. Use periods or commas.
- Sensitive paths — DO NOT modify: `src/app/auth/`, `src/app/app/admin/`, `src/lib/api-client.ts`, any billing/subscription components. The inline pricing block in `HomeContent.tsx` is presentational copy only: re-order/wrap it, but make **no billing logic changes** (do not touch `billingPeriod`, `echoTeamsVoices`, prices, or `/auth/signup?plan=` hrefs).
- **HowItWorks: unmount, do NOT delete the file** (FeaturesSection precedent). Leave `src/components/landing/HowItWorks.tsx` in the repo for easy revert.
- Test command: `npm run test:unit`. Test files live beside source as `src/**/*.test.tsx`.
- Test env: jsdom. `vitest.setup.ts` stubs `window.matchMedia` (returns `matches:false`) and Supabase env. jsdom has NO `IntersectionObserver` — tests that need it must stub it.

---

### Task 1: Analytics core (dependency + wrapper + layout mount)

**Files:**
- Modify: `package.json` (add `@vercel/analytics` dependency)
- Create: `src/lib/analytics.ts`
- Create: `src/lib/analytics.test.ts`
- Modify: `src/app/layout.tsx` (mount `<Analytics />` in `<body>`)

**Interfaces:**
- Produces: `trackSectionView(section: string): void`, `trackCtaClick(location: string): void` from `@/lib/analytics`. Both call `track(name, props)` from `@vercel/analytics`.

- [ ] **Step 1: Install the dependency**

Run: `npm install @vercel/analytics`
Expected: `package.json` `dependencies` gains `"@vercel/analytics"` and install succeeds.

- [ ] **Step 2: Write the failing test**

Create `src/lib/analytics.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const track = vi.fn();
vi.mock('@vercel/analytics', () => ({ track: (...args: unknown[]) => track(...args) }));

import { trackSectionView, trackCtaClick } from './analytics';

describe('analytics wrapper', () => {
  beforeEach(() => track.mockClear());

  it('trackSectionView emits a section_view event with the section name', () => {
    trackSectionView('pricing');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('section_view', { section: 'pricing' });
  });

  it('trackCtaClick emits a cta_click event with the location', () => {
    trackCtaClick('hero_primary');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('cta_click', { location: 'hero_primary' });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test:unit -- src/lib/analytics.test.ts`
Expected: FAIL — cannot resolve `./analytics`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/analytics.ts`:

```ts
import { track } from '@vercel/analytics';

/** Fired once per landing section when it scrolls into view. */
export function trackSectionView(section: string): void {
  track('section_view', { section });
}

/** Fired when a primary call-to-action is clicked. */
export function trackCtaClick(location: string): void {
  track('cta_click', { location });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit -- src/lib/analytics.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Mount `<Analytics />` in the layout**

In `src/app/layout.tsx`, add the import near the other imports:

```tsx
import { Analytics } from '@vercel/analytics/react';
```

Then render `<Analytics />` inside `<body>`, immediately after the closing `</Providers>` (alongside `<Toaster />`, `<ReceiptHost />`, `<CookieConsent />`):

```tsx
        <Analytics />
```

- [ ] **Step 7: Verify build types**

Run: `npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/analytics.ts src/lib/analytics.test.ts src/app/layout.tsx
git commit -m "feat(landing): add @vercel/analytics wrapper and mount Analytics in layout"
```

---

### Task 2: Hero eyebrow ("Context is King") + hero CTA tracking

**Files:**
- Modify: `src/components/landing/HeroSection.tsx`
- Modify: `src/components/landing/HeroSection.test.tsx`

**Interfaces:**
- Consumes: `trackCtaClick` from `@/lib/analytics` (Task 1).
- Rescues the "Context is King" belief from `HowItWorks.tsx` (cut in Task 6) into the hero.

- [ ] **Step 1: Write the failing tests**

Replace the contents of `src/components/landing/HeroSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackCtaClick = vi.fn();
vi.mock('@/lib/analytics', () => ({
  trackCtaClick: (...a: unknown[]) => trackCtaClick(...a),
  trackSectionView: vi.fn(),
}));

import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  beforeEach(() => trackCtaClick.mockClear());

  it('renders the headline visible at first paint (no opacity-0 LCP trap)', () => {
    render(<HeroSection />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.className).not.toContain('opacity-0');
  });

  it('shows the "Context is King" eyebrow above the headline', () => {
    render(<HeroSection />);
    expect(screen.getByText('Context is King')).toBeInTheDocument();
  });

  it('tracks a cta_click when the primary Start Free button is clicked', async () => {
    render(<HeroSection />);
    await userEvent.click(screen.getByRole('link', { name: /start free/i }));
    expect(trackCtaClick).toHaveBeenCalledWith('hero_primary');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- src/components/landing/HeroSection.test.tsx`
Expected: FAIL — no "Context is King" text, no click tracking.

- [ ] **Step 3: Implement the eyebrow and CTA tracking**

In `src/components/landing/HeroSection.tsx`:

Change the imports at the top from:

```tsx
import { ArrowRight } from 'lucide-react';
import { HeroDemoVideo } from './HeroDemoVideo';
```

to:

```tsx
import { ArrowRight, Crown } from 'lucide-react';
import { HeroDemoVideo } from './HeroDemoVideo';
import { trackCtaClick } from '@/lib/analytics';
```

Inside the `<div className="space-y-6">`, add the eyebrow as the first child, immediately before the `<h1 ...>`:

```tsx
              {/* Eyebrow: core brand belief, rescued from the cut HowItWorks section */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span className="text-primary font-bold text-xs tracking-widest uppercase">Context is King</span>
              </div>

```

Add `onClick` to the primary "Start Free" anchor. Change:

```tsx
              <a
                href="/auth/signup"
                className="px-10 py-4 bg-gradient-to-r from-primary to-primary-dark text-white
                           rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all
                           shadow-lg shadow-primary/30 flex items-center gap-3 group"
              >
                Start Free
```

to:

```tsx
              <a
                href="/auth/signup"
                onClick={() => trackCtaClick('hero_primary')}
                className="px-10 py-4 bg-gradient-to-r from-primary to-primary-dark text-white
                           rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all
                           shadow-lg shadow-primary/30 flex items-center gap-3 group"
              >
                Start Free
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- src/components/landing/HeroSection.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/HeroSection.tsx src/components/landing/HeroSection.test.tsx
git commit -m "feat(landing): add Context is King hero eyebrow and track hero CTA"
```

---

### Task 3: Evolve hero-transform scene to multi-input (video + voice + link)

**Files:**
- Modify: `src/components/sketch/SketchExplainer.tsx` (replace the `SceneHeroTransform` function only)
- Modify: `src/components/sketch/SketchExplainer.test.tsx` (add multi-input assertions)

**Interfaces:**
- Consumes: existing `SceneProps` (`{ accent, scope, paused }`) and `sceneCss` already defined in the file. No engine changes; only the scene's SVG content changes. Animation stays transform/opacity (stroke-dashoffset draw + caption rise), `paused` freezes the final frame.
- Produces: the `hero-transform` scene now shows three converging inputs and an aria-label naming all three.

- [ ] **Step 1: Write the failing tests**

Add these two `it` blocks inside the existing `describe('SketchExplainer hero-transform scene', ...)` in `src/components/sketch/SketchExplainer.test.tsx`:

```tsx
  it('shows three input captions: video, voice, and link', () => {
    const { container } = render(
      <SketchExplainer scene="hero-transform" accent="#6FC3EC" />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Your video');
    expect(text).toContain('Your voice');
    expect(text).toContain('Or a link');
  });

  it('names all three inputs in the accessible label', () => {
    render(<SketchExplainer scene="hero-transform" accent="#6FC3EC" />);
    const label = screen.getByRole('img').getAttribute('aria-label') ?? '';
    expect(label.toLowerCase()).toContain('link');
    expect(label.toLowerCase()).toContain('voice');
    expect(label.toLowerCase()).toContain('video');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- src/components/sketch/SketchExplainer.test.tsx`
Expected: FAIL — current scene has one input ("Your video, your voice"), no "Your voice" / "Or a link" captions, label lacks "link".

- [ ] **Step 3: Replace the `SceneHeroTransform` function**

In `src/components/sketch/SketchExplainer.tsx`, replace the entire `SceneHeroTransform` function (and its leading comment block) with:

```tsx
// ---- Scene 5: "Hero transform" -------------------------------------------
// Homepage hero. Three inputs converge on one spine: your video + voice note
// + a link -> Echo reads them -> a finished post/carousel that sounds like
// you. Kills the "I don't have video" objection visually. Minimal captions
// (glanceable, not a tutorial). Echo beat is wordless.

function SceneHeroTransform({ accent, scope, paused }: SceneProps) {
  return (
    <svg
      viewBox="0 0 480 300"
      width="100%"
      role="img"
      aria-label="Your video, your voice, or a link goes in. Echo reads them and writes a finished post that sounds like you."
      className={`${scope} ${paused ? 'paused' : ''}`}
    >
      <style dangerouslySetInnerHTML={{ __html: sceneCss(scope, accent) }} />

      {/* ===== Input 1: video (frame + play) ===== */}
      <g>
        <rect x="24" y="40" width="80" height="48" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '0s' }} />
        <path d="M50 56 L50 76 L70 66 Z" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.2s' }} />
      </g>
      <text x="64" y="104" className="cap sub" style={{ ['--d' as string]: '0.4s' }}>Your video</text>

      {/* ===== Input 2: voice (waveform) ===== */}
      <g>
        <rect x="24" y="126" width="80" height="48" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '0.5s' }} />
        <path d="M40 156 V146 M50 156 V138 M60 156 V132 M70 156 V140 M80 156 V148" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '0.7s' }} />
      </g>
      <text x="64" y="190" className="cap sub" style={{ ['--d' as string]: '0.9s' }}>Your voice</text>

      {/* ===== Input 3: link (chain) ===== */}
      <g>
        <rect x="24" y="212" width="80" height="48" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '1.0s' }} />
        <path d="M50 232 a8 8 0 0 1 11 -11 l6 6 a8 8 0 0 1 -11 11" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.2s' }} />
        <path d="M70 240 a8 8 0 0 1 -11 11 l-6 -6 a8 8 0 0 1 11 -11" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.3s' }} />
      </g>
      <text x="64" y="276" className="cap sub" style={{ ['--d' as string]: '1.5s' }}>Or a link</text>

      {/* ===== Converging arrows into Echo ===== */}
      <path d="M104 64 L200 140" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.6s' }} />
      <path d="M104 150 H200" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.7s' }} />
      <path d="M104 236 L200 160" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '1.8s' }} />

      {/* ===== Echo reads it (node + transcript + pulse ring) — wordless ===== */}
      <g>
        <circle cx="240" cy="150" r="36" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.0s' }} />
        <path d="M222 144 H258 M222 152 H250 M222 160 H254" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '2.25s' }} />
        <circle cx="240" cy="150" r="46" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '2.45s' }} />
      </g>

      {/* ===== Arrow: Echo -> output ===== */}
      <path d="M288 150 H352" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.7s' }} />
      <path d="M344 143 L354 150 L344 157" pathLength={1} className="stroke" style={{ ['--d' as string]: '2.85s' }} />

      {/* ===== Output: finished post / carousel (stacked cards + lines + check) ===== */}
      <g>
        <rect x="380" y="104" width="64" height="60" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.0s' }} />
        <rect x="372" y="112" width="64" height="60" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.15s' }} />
        <rect x="364" y="120" width="64" height="60" rx="8" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.3s' }} />
        <path d="M374 142 H418 M374 154 H410" pathLength={1} className="stroke thin" style={{ ['--d' as string]: '3.5s' }} />
        <path d="M374 162 L384 172 L406 150" pathLength={1} className="stroke" style={{ ['--d' as string]: '3.75s' }} />
      </g>
      <text x="400" y="206" className="cap" style={{ ['--d' as string]: '4.0s' }}>Comes out sounding like you</text>
    </svg>
  );
}
```

- [ ] **Step 4: Run the full SketchExplainer test file**

Run: `npm run test:unit -- src/components/sketch/SketchExplainer.test.tsx`
Expected: PASS (4 tests — the 2 original + 2 new). The original accent and aria-label-length assertions still hold.

- [ ] **Step 5: Commit**

```bash
git add src/components/sketch/SketchExplainer.tsx src/components/sketch/SketchExplainer.test.tsx
git commit -m "feat(landing): hero scene shows three converging inputs (video, voice, link)"
```

---

### Task 4: Dark-restyle UseCasesSection (resurrect for mounting)

**Files:**
- Modify: `src/components/landing/UseCasesSection.tsx` (restyle light -> dark; content unchanged)
- Create: `src/components/landing/UseCasesSection.test.tsx`

**Interfaces:**
- Produces: `UseCasesSection` renders on a dark background (`bg-gray-900`) matching `TestimonialStrip` / the dark page palette. Mounted into `HomeContent` in Task 6.

- [ ] **Step 1: Write the failing test**

Create `src/components/landing/UseCasesSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { UseCasesSection } from './UseCasesSection';

describe('UseCasesSection', () => {
  it('renders the four persona cards', () => {
    render(<UseCasesSection />);
    expect(screen.getByText('Podcaster')).toBeInTheDocument();
    expect(screen.getByText('Real Estate Agent')).toBeInTheDocument();
    expect(screen.getByText('Course Creator')).toBeInTheDocument();
    expect(screen.getByText('Consultant')).toBeInTheDocument();
  });

  it('uses a dark section background, not the old light bg-white', () => {
    const { container } = render(<UseCasesSection />);
    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section!.className).toContain('bg-gray-900');
    expect(section!.className).not.toContain('bg-white');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/landing/UseCasesSection.test.tsx`
Expected: FAIL — section currently `bg-white`.

- [ ] **Step 3: Restyle the component**

Replace the full contents of `src/components/landing/UseCasesSection.tsx` with:

```tsx
'use client';

import { Mic, GraduationCap, Briefcase, Home } from 'lucide-react';
import { AnimatedSection } from '@/components/shared/AnimatedSection';

const useCases = [
  {
    role: 'Podcaster',
    icon: Mic,
    color: 'from-primary to-primary-dark',
    borderColor: 'border-primary/30',
    input: '1 podcast episode',
    outputs: ['5 viral reels', '12 social posts', '3 carousels', 'Newsletter'],
    impact: 'Saves 8 hours/week',
    description: 'Your conversations already contain the ideas. Echo pulls them out and writes the rest.',
  },
  {
    role: 'Real Estate Agent',
    icon: Home,
    color: 'from-accent-purple to-[#9775D8]',
    borderColor: 'border-accent-purple/30',
    input: '1 property tour',
    outputs: ['4 listing reels', '6 market posts', '2 carousels', 'Email campaign'],
    impact: 'Saves 6 hours/listing',
    description: 'You already know the property. Echo writes the listing content from your walkthrough, in your voice.',
  },
  {
    role: 'Course Creator',
    icon: GraduationCap,
    color: 'from-[#10B981] to-[#059669]',
    borderColor: 'border-[#10B981]/30',
    input: '1 lesson recording',
    outputs: ['3 tutorial clips', '8 LinkedIn posts', '2 Twitter threads', 'Blog post'],
    impact: 'Saves 10 hours/week',
    description: 'Your lessons already have the teaching moments. Echo finds them and writes the authority content.',
  },
  {
    role: 'Consultant',
    icon: Briefcase,
    color: 'from-[#F59E0B] to-[#D97706]',
    borderColor: 'border-[#F59E0B]/30',
    input: '1 client session',
    outputs: ['5 expertise clips', '10 thought posts', '3 carousels', 'Case study'],
    impact: 'Saves 12 hours/month',
    description: 'Your expertise is in the sessions. Echo turns it into content that shows future clients what you know.',
  },
];

export function UseCasesSection() {
  return (
    <AnimatedSection>
      <section className="py-32 px-6 bg-gray-900 relative overflow-hidden">
        {/* Ambient gradients */}
        <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/15 border border-primary/25 rounded-full mb-6">
              <span className="text-primary font-semibold text-sm">Use Cases</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold mb-6 text-white leading-tight">
              Built Around
              <span className="bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
                {' '}What You Already Do
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-white/60 font-light max-w-3xl mx-auto leading-relaxed">
              You&apos;re already recording. EchoMe turns that into a full content strategy, in your voice.
            </p>
          </div>

          {/* Use Case Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <div
                  key={index}
                  className={`group relative bg-white/[0.04] backdrop-blur rounded-2xl border-2 ${useCase.borderColor} p-8 hover:shadow-2xl transition-all hover:-translate-y-1`}
                >
                  {/* Icon & Role */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${useCase.color} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{useCase.role}</h3>
                      <p className="text-sm text-white/50">{useCase.impact}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-white/70 mb-6 leading-relaxed">
                    {useCase.description}
                  </p>

                  {/* Input -> Outputs */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm font-medium text-white/80">
                        {useCase.input}
                      </div>
                      <span className="text-white/40">&rarr;</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {useCase.outputs.map((output, i) => (
                        <div
                          key={i}
                          className={`px-3 py-2 bg-white/[0.04] border ${useCase.borderColor} rounded-lg text-sm font-medium text-white text-center`}
                        >
                          {output}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-16">
            <p className="text-white/50 text-lg">
              If you create content in any form, EchoMe already has something to work with.
            </p>
          </div>
        </div>
      </section>
    </AnimatedSection>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- src/components/landing/UseCasesSection.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/UseCasesSection.tsx src/components/landing/UseCasesSection.test.tsx
git commit -m "feat(landing): dark-restyle UseCasesSection for the dark page palette"
```

---

### Task 5: TrackedSection wrapper + useSectionView hook

**Files:**
- Create: `src/components/landing/useSectionView.ts`
- Create: `src/components/landing/TrackedSection.tsx`
- Create: `src/components/landing/TrackedSection.test.tsx`

**Interfaces:**
- Consumes: `trackSectionView` from `@/lib/analytics` (Task 1).
- Produces:
  - `useSectionView<T extends HTMLElement>(section: string): React.RefObject<T | null>` — attaches an IntersectionObserver to the returned ref; fires `trackSectionView(section)` exactly once, then disconnects.
  - `TrackedSection({ name, children }: { name: string; children: React.ReactNode })` — wraps `children` in a `<div ref data-section={name}>` driven by `useSectionView`.

- [ ] **Step 1: Write the failing test**

Create `src/components/landing/TrackedSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackSectionView = vi.fn();
vi.mock('@/lib/analytics', () => ({
  trackSectionView: (...a: unknown[]) => trackSectionView(...a),
  trackCtaClick: vi.fn(),
}));

import { TrackedSection } from './TrackedSection';

// jsdom has no IntersectionObserver. Stub one that immediately reports the
// target as intersecting so the hook's fire-once path runs synchronously.
class MockIO {
  cb: (entries: { isIntersecting: boolean }[]) => void;
  constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
    this.cb = cb;
  }
  observe() {
    this.cb([{ isIntersecting: true }]);
  }
  disconnect() {}
}

describe('TrackedSection', () => {
  beforeEach(() => {
    trackSectionView.mockClear();
    vi.stubGlobal('IntersectionObserver', MockIO as unknown as typeof IntersectionObserver);
  });

  it('renders children and fires section_view once when it enters view', () => {
    render(
      <TrackedSection name="pricing">
        <p>inner content</p>
      </TrackedSection>,
    );
    expect(screen.getByText('inner content')).toBeInTheDocument();
    expect(trackSectionView).toHaveBeenCalledTimes(1);
    expect(trackSectionView).toHaveBeenCalledWith('pricing');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/components/landing/TrackedSection.test.tsx`
Expected: FAIL — cannot resolve `./TrackedSection`.

- [ ] **Step 3: Implement the hook**

Create `src/components/landing/useSectionView.ts`:

```ts
'use client';

import { useEffect, useRef } from 'react';
import { trackSectionView } from '@/lib/analytics';

/**
 * Attach the returned ref to an element; fires a single section_view analytics
 * event the first time the element scrolls into view, then stops observing.
 * No-ops where IntersectionObserver is unavailable (SSR / jsdom without stub).
 */
export function useSectionView<T extends HTMLElement>(section: string) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    let fired = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired) {
          fired = true;
          trackSectionView(section);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [section]);

  return ref;
}
```

- [ ] **Step 4: Implement the wrapper**

Create `src/components/landing/TrackedSection.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import { useSectionView } from './useSectionView';

/** Wraps a landing section to emit a one-shot section_view event in view. */
export function TrackedSection({ name, children }: { name: string; children: ReactNode }) {
  const ref = useSectionView<HTMLDivElement>(name);
  return (
    <div ref={ref} data-section={name}>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test:unit -- src/components/landing/TrackedSection.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/useSectionView.ts src/components/landing/TrackedSection.tsx src/components/landing/TrackedSection.test.tsx
git commit -m "feat(landing): add TrackedSection + useSectionView for scroll-depth instrumentation"
```

---

### Task 6: Restructure HomeContent (cut HowItWorks, reorder spine, mount UseCases, repoint #how, wrap + track)

**Files:**
- Modify: `src/app/HomeContent.tsx`
- Modify: `src/components/landing/KnowledgeBaseSection.tsx` (add `id="how"` to its `<section>`)
- Create: `src/app/HomeContent.test.tsx`

**Interfaces:**
- Consumes: `UseCasesSection` (Task 4), `TrackedSection` (Task 5), `trackCtaClick` (Task 1).
- Final section spine inside `<main id="main-content">`: HeroSection -> KnowledgeBaseSection -> NotChatGPTSection -> OutputShowcase -> UseCasesSection -> TestimonialStrip -> CreatorRadarSection -> inline pricing -> CommunitySection -> inline Affiliate -> (footer outside main).
- `HowItWorks` import and render removed; the file stays in the repo (unmounted, not deleted).
- Nav "How It Works" link keeps `href="#how"`; the `#how` anchor moves from the cut HowItWorks `<section>` onto the `KnowledgeBaseSection` `<section>`.

- [ ] **Step 1: Add `id="how"` to KnowledgeBaseSection**

In `src/components/landing/KnowledgeBaseSection.tsx`, change the section opening tag from:

```tsx
      <section className="py-24 px-6 bg-gradient-to-b from-background to-secondary relative overflow-hidden">
```

to:

```tsx
      <section id="how" className="py-24 px-6 bg-gradient-to-b from-background to-secondary relative overflow-hidden">
```

- [ ] **Step 2: Write the failing integration test**

Create `src/app/HomeContent.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Keep the public help widget out of the integration render (it does data work).
vi.mock('@/components/help-widget', () => ({ HelpWidget: () => null }));

// Analytics is exercised in unit tests; stub here so the tree renders cleanly.
vi.mock('@/lib/analytics', () => ({
  trackSectionView: vi.fn(),
  trackCtaClick: vi.fn(),
}));

import HomeContent from './HomeContent';

describe('HomeContent landing structure', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      } as unknown as typeof IntersectionObserver,
    );
  });

  it('renders the hero "Context is King" eyebrow', () => {
    render(<HomeContent />);
    expect(screen.getByText('Context is King')).toBeInTheDocument();
  });

  it('mounts the resurrected UseCases section', () => {
    render(<HomeContent />);
    expect(screen.getByText('Real Estate Agent')).toBeInTheDocument();
  });

  it('no longer renders the cut HowItWorks section', () => {
    render(<HomeContent />);
    // "Feed it your history" is HowItWorks-only copy.
    expect(screen.queryByText('Feed it your history')).not.toBeInTheDocument();
  });

  it('repoints the #how anchor onto a rendered section', () => {
    const { container } = render(<HomeContent />);
    const how = container.querySelector('#how');
    expect(how).not.toBeNull();
    expect(how!.tagName.toLowerCase()).toBe('section');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:unit -- src/app/HomeContent.test.tsx`
Expected: FAIL — UseCases not mounted; "Feed it your history" still present (HowItWorks rendered).

- [ ] **Step 4: Update imports in HomeContent**

In `src/app/HomeContent.tsx`, replace the landing-component import block:

```tsx
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { KnowledgeBaseSection } from '@/components/landing/KnowledgeBaseSection';
import { CreatorRadarSection } from '@/components/landing/CreatorRadarSection';
import { OutputShowcase } from '@/components/landing/OutputShowcase';
import { TestimonialStrip } from '@/components/landing/TestimonialStrip';
import { NotChatGPTSection } from '@/components/landing/NotChatGPTSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { CommunitySection } from '@/components/landing/CommunitySection';
```

with (drops `HowItWorks`; adds `UseCasesSection`, `TrackedSection`, `trackCtaClick`):

```tsx
import { HeroSection } from '@/components/landing/HeroSection';
import { KnowledgeBaseSection } from '@/components/landing/KnowledgeBaseSection';
import { CreatorRadarSection } from '@/components/landing/CreatorRadarSection';
import { OutputShowcase } from '@/components/landing/OutputShowcase';
import { TestimonialStrip } from '@/components/landing/TestimonialStrip';
import { NotChatGPTSection } from '@/components/landing/NotChatGPTSection';
import { UseCasesSection } from '@/components/landing/UseCasesSection';
import { TrackedSection } from '@/components/landing/TrackedSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { CommunitySection } from '@/components/landing/CommunitySection';
import { trackCtaClick } from '@/lib/analytics';
```

- [ ] **Step 5: Track the nav "Try Free" CTAs**

In the desktop nav, change the signup anchor:

```tsx
              <a
                href="/auth/signup"
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all shadow-md"
              >
                Try Free
              </a>
```

to add the onClick:

```tsx
              <a
                href="/auth/signup"
                onClick={() => trackCtaClick('nav_signup')}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all shadow-md"
              >
                Try Free
              </a>
```

In the mobile menu, change:

```tsx
                <a
                  href="/auth/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all text-center shadow-md"
                >
                  Try Free
                </a>
```

to:

```tsx
                <a
                  href="/auth/signup"
                  onClick={() => { setIsMenuOpen(false); trackCtaClick('nav_signup_mobile'); }}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all text-center shadow-md"
                >
                  Try Free
                </a>
```

- [ ] **Step 6: Reorder the spine and wrap sections**

Replace the block that begins at `<main id="main-content">` and ends just before the inline pricing `<section id="pricing" ...>`. Change from:

```tsx
      <main id="main-content">
      <HeroSection />

      {/* How It Works */}
      <HowItWorks />

      {/* Knowledge Base */}
      <KnowledgeBaseSection />

      {/* Creator Radar */}
      <CreatorRadarSection />

      {/* Output Showcase */}
      <OutputShowcase />

      {/* Testimonials */}
      <TestimonialStrip />

      {/* Not ChatGPT */}
      <NotChatGPTSection />

      {/* Pricing */}
```

to:

```tsx
      <main id="main-content">
      <TrackedSection name="hero">
        <HeroSection />
      </TrackedSection>

      {/* Knowledge Base — now owns the #how anchor and the detailed how-it-works */}
      <TrackedSection name="knowledge_base">
        <KnowledgeBaseSection />
      </TrackedSection>

      {/* Not ChatGPT — core differentiator */}
      <TrackedSection name="not_chatgpt">
        <NotChatGPTSection />
      </TrackedSection>

      {/* Output Showcase — proof */}
      <TrackedSection name="output_showcase">
        <OutputShowcase />
      </TrackedSection>

      {/* Use Cases — persona fit */}
      <TrackedSection name="use_cases">
        <UseCasesSection />
      </TrackedSection>

      {/* Testimonials */}
      <TrackedSection name="testimonials">
        <TestimonialStrip />
      </TrackedSection>

      {/* Creator Radar — bonus differentiator */}
      <TrackedSection name="creator_radar">
        <CreatorRadarSection />
      </TrackedSection>

      {/* Pricing */}
```

- [ ] **Step 7: Wrap the inline pricing and Community sections (no logic changes)**

Wrap the existing inline pricing `<section id="pricing" ...>...</section>` in a TrackedSection. Change the opening from:

```tsx
      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-gradient-to-br from-background to-background relative overflow-hidden">
```

to:

```tsx
      {/* Pricing */}
      <TrackedSection name="pricing">
      <section id="pricing" className="py-20 px-6 bg-gradient-to-br from-background to-background relative overflow-hidden">
```

and close it: find the `</section>` that ends the pricing block (the one immediately before `{/* Community */}`) and add `</TrackedSection>` after it:

```tsx
        </div>
      </section>
      </TrackedSection>

      {/* Community */}
      <CommunitySection />
```

becomes:

```tsx
        </div>
      </section>
      </TrackedSection>

      {/* Community */}
      <TrackedSection name="community">
        <CommunitySection />
      </TrackedSection>
```

(Leave the inline Affiliate section and `<SiteFooter />` exactly as they are. Do NOT change any pricing prices, `billingPeriod`, `echoTeamsVoices`, or `/auth/signup?plan=` hrefs.)

- [ ] **Step 8: Run the integration test to verify it passes**

Run: `npm run test:unit -- src/app/HomeContent.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 9: Run the full landing/sketch test suite**

Run: `npm run test:unit -- src/components/landing src/components/sketch src/app/HomeContent.test.tsx src/lib/analytics.test.ts`
Expected: all PASS.

- [ ] **Step 10: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new type errors.

- [ ] **Step 11: Commit**

```bash
git add src/app/HomeContent.tsx src/components/landing/KnowledgeBaseSection.tsx src/app/HomeContent.test.tsx
git commit -m "feat(landing): restructure spine, cut HowItWorks, mount UseCases, repoint #how, instrument sections"
```

---

### Task 7: Full-suite verification + manual preview

**Files:** none (verification only)

- [ ] **Step 1: Run the entire unit suite**

Run: `npm run test:unit`
Expected: all tests pass (no regressions in unrelated suites).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds, no type or lint errors.

- [ ] **Step 3: Manual preview checklist (Vercel preview or `npm run dev`)**

Verify on mobile + desktop widths:
- Hero shows the "Context is King" eyebrow above the headline; the SketchExplainer animation shows three converging inputs (video, voice, link) into Echo then a finished post.
- HowItWorks section is gone; total scroll length is shorter.
- Nav "How It Works" scrolls to the Knowledge Base section (no broken `#how` jump).
- UseCases renders dark with no light-background flash.
- `prefers-reduced-motion` (OS setting on): hero animation is frozen on its final frame, not looping.

- [ ] **Step 4: Commit (only if preview required copy/style tweaks)**

```bash
git add -A
git commit -m "fix(landing): preview polish"
```

---

## Self-Review

**1. Spec coverage:**
- Cut HowItWorks (unmount, keep file) -> Task 6 Steps 4, 6. ✅
- Repoint nav `#how` -> KnowledgeBase -> Task 6 Step 1 (id on KB) + nav link unchanged. ✅
- Reorder to locked spine -> Task 6 Step 6. ✅
- Resurrect + dark-restyle UseCases -> Task 4 (restyle) + Task 6 (mount). ✅
- "Context is King" -> hero eyebrow -> Task 2. ✅
- Hero multi-input (video + voice + link converging) -> Task 3. ✅
- `@vercel/analytics` + section_view + CTA clicks -> Task 1 (dep/util/layout), Task 5 (section_view via TrackedSection/useSectionView), Task 2 + Task 6 (CTA clicks). ✅
- Testing (hero 3 inputs; reduced-motion final frame; section_view once; HowItWorks absent; UseCases dark) -> covered across Task 2/3/4/5/6 tests + Task 7 manual reduced-motion check. ✅

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". All code blocks complete. ✅

**3. Type consistency:** `trackSectionView(section)` / `trackCtaClick(location)` signatures consistent across analytics.ts, useSectionView.ts, HeroSection.tsx, HomeContent.tsx. `useSectionView<T>` returns a ref consumed by `TrackedSection` as `<HTMLDivElement>`. `SceneProps` reused unchanged. `UseCasesSection` / `TrackedSection` named exports match their imports in HomeContent. ✅

## Out of scope (per spec)

- Cutting KnowledgeBase, cycling hero through multiple scenes, pricing/billing logic changes, acting on the collected analytics data.
