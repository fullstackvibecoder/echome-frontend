# Design Elevation Pass 1 (Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the design-language token system and chrome restyle from `docs/superpowers/specs/2026-06-10-platform-redesign-echo-copilot-design.md` — frontend-only, scoped to the authenticated app shell, zero copy changes, zero layout restructuring.

**Architecture:** A scoping class (`app-canvas`) on the AppShell root redefines surface/typography/motion tokens for the authenticated app only, leaving marketing and auth pages untouched. Chrome components (sidebar, header, page header, buttons) are restyled against the new tokens; the kill-list sweep removes purple/pink/yellow accents and gradient text from app chrome. Create (`/app`) and Your Voice (`/app/voice`) get token inheritance only — they are rebuilt in Pass 2.

**Tech Stack:** Next.js App Router, Tailwind CSS v4 (`@theme inline` in `globals.css`), next/font (Satoshi local, JetBrains Mono from Google), Vercel preview deployments as staging.

**Constraints (from spec + CLAUDE.md):**
- Existing copy is kept verbatim. No em dashes in any user-facing string.
- Do NOT hand-edit: `src/app/auth/`, `src/app/app/admin/`, `src/lib/api-client.ts`, billing components (`src/app/app/billing/`). They inherit tokens only.
- Do NOT edit `src/app/app/AppContent.tsx` (Create page) or `src/app/app/voice/` beyond what token inheritance gives them.
- Dark mode is activated by BOTH `.dark` class and `prefers-color-scheme` media query — every dark token override must exist in both places.
- Cyan discipline: after this pass, cyan in app chrome appears only as (1) waveform, (2) one primary CTA per view, (3) live/ready status, (4) display-accent phrases.

---

### Task 0: Branch setup

**Files:** none

- [ ] **Step 1: Create the feature branch off develop**

```bash
cd "/Users/aramammo/Side Quests/echome-frontend"
git checkout develop && git pull && git checkout -b feat/design-elevation-pass1
```

Expected: `Switched to a new branch 'feat/design-elevation-pass1'`

---

### Task 1: JetBrains Mono font wiring

**Files:**
- Modify: `src/lib/fonts.ts`
- Modify: `src/app/layout.tsx:7,120`
- Modify: `src/app/globals.css` (`@theme inline` block, ~line 225)

- [ ] **Step 1: Add JetBrains Mono export to `src/lib/fonts.ts`**

Add after the `bebasNeue` export (before the `satoshi` export):

```ts
// Machine voice — receipts, stats, statuses, kickers (design spec 2026-06-10)
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
```

And extend the existing google import at the top of the file:

```ts
import { Manrope, Montserrat, Inter, Bebas_Neue, JetBrains_Mono } from "next/font/google";
```

- [ ] **Step 2: Wire the variable into the body class in `src/app/layout.tsx`**

Line 7 becomes:

```ts
import { satoshi, manrope, montserrat, inter, bebasNeue, jetbrainsMono } from '@/lib/fonts';
```

Line 120: add `${jetbrainsMono.variable}` inside the template literal, immediately after `${bebasNeue.variable}`.

- [ ] **Step 3: Register the mono family in the Tailwind theme**

In `src/app/globals.css`, inside the `@theme inline` block, after `--font-headline: var(--font-manrope);` add:

```css
  --font-mono: var(--font-jetbrains-mono);
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds; no font loader errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fonts.ts src/app/layout.tsx src/app/globals.css
git commit -m "feat(design): wire JetBrains Mono as the machine-voice font"
```

---

### Task 2: App canvas tokens — surface stack, grain, motion, type-role utilities

**Files:**
- Modify: `src/app/globals.css` (append a new section at the end of the file)
- Modify: `src/components/app-shell.tsx:27`

- [ ] **Step 1: Append the app-canvas token section to `src/app/globals.css`**

Append at the end of the file:

```css
/* ============================================================
   APP CANVAS — design elevation pass 1 (spec 2026-06-10)
   Scoped tokens for the authenticated app shell only.
   Marketing and auth pages are intentionally unaffected.
   ============================================================ */

.app-canvas {
  /* Motion system: one timing scale, one ease */
  --dur-fast: 140ms;
  --dur-base: 180ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* Light surface stack (quiet, warm-neutral) */
  --background: #f6f6f4;
  --surface: #f6f6f4;
  --card: #ffffff;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #efefec;
  --surface-container: #e9e9e5;
  --surface-container-high: #e2e2dd;
  --border: #e3e3de;
}

.dark .app-canvas {
  /* Dark surface stack: near-black blue ground, raised steps */
  --background: #0e1116;
  --surface: #0e1116;
  --card: #161a21;
  --surface-container-lowest: #0a0d11;
  --surface-container-low: #14181f;
  --surface-container: #1a1f27;
  --surface-container-high: #20262f;
  --border: #232936;
  --input: #14181f;
  --secondary: #14181f;
  --muted: #1a1f27;
  --popover: #161a21;
}

@media (prefers-color-scheme: dark) {
  .app-canvas {
    --background: #0e1116;
    --surface: #0e1116;
    --card: #161a21;
    --surface-container-lowest: #0a0d11;
    --surface-container-low: #14181f;
    --surface-container: #1a1f27;
    --surface-container-high: #20262f;
    --border: #232936;
    --input: #14181f;
    --secondary: #14181f;
    --muted: #1a1f27;
    --popover: #161a21;
  }
}

/* Grain: page ground only, dark mode only, barely there */
.app-canvas { position: relative; }
.app-canvas::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
}
.dark .app-canvas::before { opacity: 1; }
@media (prefers-color-scheme: dark) {
  .app-canvas::before { opacity: 1; }
}

/* Type roles */
.text-machine {
  font-family: var(--font-jetbrains-mono), ui-monospace, 'SF Mono', monospace;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}
.display-accent {
  font-family: var(--font-satoshi), sans-serif;
  font-style: italic;
  font-weight: 500;
  color: var(--accent);
}

/* Kill-list overrides, scoped to the app */
.app-canvas .btn-primary:hover {
  transform: translateY(-1px);
  background: var(--primary-dark);
  box-shadow: 0 8px 20px -4px rgba(0, 119, 170, 0.3);
}
```

- [ ] **Step 2: Apply the scope class in `src/components/app-shell.tsx`**

Line 27, the root div:

```tsx
    <div className="app-canvas flex h-screen overflow-hidden bg-surface">
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`, log in, visit `/app/library` in both light and dark OS modes.
Expected: dark ground reads blue-black with faint grain; light mode is quiet warm-neutral; marketing pages (`/`) unchanged.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/app-shell.tsx
git commit -m "feat(design): app-canvas scoped tokens - surface stack, grain, motion, type roles"
```

---

### Task 3: Waveform primitive

**Files:**
- Create: `src/components/ui/waveform.tsx`

The signature motif. Used ONLY at voice moments (spec rule). In this pass its sole consumer is the sidebar "Your Voice" item (Task 4); Pass 2 reuses it for Echo and the Voice page.

- [ ] **Step 1: Create `src/components/ui/waveform.tsx`**

```tsx
'use client';

/**
 * Voice waveform motif. Spec (2026-06-10): may appear ONLY at voice
 * moments — voice strength, Echo listening/working states, voice-source
 * attribution. Never decoration.
 */

const BAR_HEIGHTS = [0.35, 0.8, 0.55, 1, 0.45, 0.7, 0.3];

interface WaveformProps {
  /** Number of bars, taken from the start of the fixed pattern */
  bars?: number;
  /** Bar height in px at the tallest point */
  height?: number;
  /** Breathing animation (auto-disabled by prefers-reduced-motion) */
  animated?: boolean;
  className?: string;
}

export function Waveform({ bars = 5, height = 14, animated = false, className = '' }: WaveformProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center gap-[2px] ${className}`}
      style={{ height }}
    >
      {BAR_HEIGHTS.slice(0, bars).map((h, i) => (
        <span
          key={i}
          className={`w-[2.5px] rounded-full bg-accent ${animated ? 'animate-waveform-breathe' : ''}`}
          style={{
            height: Math.max(3, Math.round(h * height)),
            animationDelay: animated ? `${i * 120}ms` : undefined,
          }}
        />
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Add the breathe animation class to `src/app/globals.css`**

Append inside the APP CANVAS section (after `.display-accent`):

```css
/* Waveform breathing — the only ambient animation in the app */
@keyframes waveform-breathe {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.35); }
}
.animate-waveform-breathe {
  animation: waveform-breathe 1.8s var(--ease-standard, ease-in-out) infinite;
  transform-origin: center;
}
@media (prefers-reduced-motion: reduce) {
  .animate-waveform-breathe { animation: none !important; }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/waveform.tsx src/app/globals.css
git commit -m "feat(design): Waveform primitive - the voice signature motif"
```

---

### Task 4: Sidebar restyle

**Files:**
- Modify: `src/components/sidebar.tsx`

Changes: group labels become machine voice; active item drops the filled-cyan pill (cyan discipline) for a raised-surface treatment; the "Your Voice" item gets the waveform; everything else (logic, hints, badges, user section) is untouched.

- [ ] **Step 1: Import the Waveform at the top of `src/components/sidebar.tsx`**

```tsx
import { Waveform } from '@/components/ui/waveform';
```

- [ ] **Step 2: Replace the group-label `<p>` (currently `text-[10px] uppercase tracking-[0.15em] font-bold text-gray-500 dark:text-gray-400`)**

```tsx
            <p className="px-3 mb-1.5 text-machine text-[10px]">
              {group.label}
            </p>
```

- [ ] **Step 3: Replace the active/idle classes in `SidebarItem`**

The ternary inside the button `className` becomes:

```tsx
        ${
          disabled
            ? 'text-muted-foreground/60 cursor-not-allowed'
            : isActive
              ? 'bg-surface-container-low text-foreground border border-border shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-foreground hover:bg-surface-container-low hover:translate-x-0.5'
        }
```

(Removes `bg-primary text-white shadow-md shadow-primary/20 active-glow` — cyan leaves the nav.)

- [ ] **Step 4: Add the waveform to the Your Voice item**

In `SidebarItem`, after `<span className="flex-1 text-left truncate">{item.label}</span>`, add:

```tsx
      {item.id === 'voice' && <Waveform bars={4} height={10} />}
```

- [ ] **Step 5: Visual check + build**

Run: `npm run dev` — confirm: mono group labels, no cyan-filled active pill, waveform beside Your Voice, hints/badges still render.
Run: `npm run build` — expected PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat(design): sidebar restyle - machine-voice labels, quiet active state, voice waveform"
```

---

### Task 5: AppPageHeader restyle (kills gradient text app-wide)

**Files:**
- Modify: `src/components/app-page-header.tsx` (full replacement below)

This one component restyles every page header that uses it. The `gradient` prop is kept for API compatibility but no longer renders gradient text (kill list). A new optional `kicker` renders the machine-voice line above the title.

- [ ] **Step 1: Replace the component**

```tsx
interface AppPageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /** Deprecated (design elevation 2026-06-10): gradient text removed; prop kept for compatibility */
  gradient?: boolean;
  /** Machine-voice line rendered above the title, e.g. "LIBRARY · 23 KITS" */
  kicker?: string;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
}

export function AppPageHeader({
  title,
  description,
  icon,
  kicker,
  actions,
  stats,
}: AppPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 bg-surface-container-low border border-border rounded-xl">
            {icon}
          </div>
        )}
        <div>
          {kicker && <p className="text-machine mb-1">{kicker}</p>}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {stats}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify no caller breaks**

Run: `grep -rn "AppPageHeader" src --include="*.tsx" -l`
For each caller, confirm props used are still accepted (gradient remains a valid prop; it is just ignored).
Run: `npm run build`
Expected: PASS (TypeScript catches any prop mismatch).

- [ ] **Step 3: Commit**

```bash
git add src/components/app-page-header.tsx
git commit -m "feat(design): AppPageHeader - machine-voice kicker, gradient text removed"
```

---### Task 6: AppHeader + MobileSidebar parity

**Files:**
- Modify: `src/components/app-header.tsx`
- Modify: `src/components/mobile-sidebar.tsx`

- [ ] **Step 1: Read both files and apply the same substitutions as Tasks 4-5**

Mechanical mapping (apply wherever present in these two files):

| Find | Replace with |
|---|---|
| `bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent` | `text-foreground` |
| `from-primary/15 to-accent-purple/10` (icon chips) | `bg-surface-container-low border border-border` |
| Group label classes `text-[10px] uppercase tracking-[0.15em] font-bold text-gray-500 dark:text-gray-400` | `text-machine text-[10px]` |
| Active nav `bg-primary text-white shadow-md shadow-primary/20 active-glow` | `bg-surface-container-low text-foreground border border-border shadow-sm` |
| `accent-purple` / `accent-pink` / `accent-yellow` in chrome decoration | `muted-foreground` (text) or `surface-container-high` (backgrounds) |

Copy strings must not change. If a mapping case appears ambiguous (e.g. a colored status that conveys meaning), leave it and note it in the commit body.

- [ ] **Step 2: Visual check + build**

Run: `npm run dev` — check desktop header and mobile drawer (resize to <1024px).
Run: `npm run build` — expected PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/app-header.tsx src/components/mobile-sidebar.tsx
git commit -m "feat(design): app header + mobile sidebar on app-canvas language"
```

---

### Task 7: Kill-list sweep — surviving pages

**Files (modify each):**
- `src/app/app/library/ContentKitContent.tsx`, `src/app/app/library/LibraryTabs.tsx`, `src/app/app/library/ReelsContent.tsx` (EXCEPT `[id]/ContentKitDetailContent.tsx`, which is content-display, not chrome — token inheritance only)
- `src/app/app/calendar/CalendarContent.tsx`
- `src/app/app/radar/FollowingContent.tsx` and siblings
- `src/app/app/toolkit/CreatorLibraryContent.tsx`
- `src/app/app/settings/SettingsContent.tsx`

Explicitly OUT of this sweep: `src/app/app/AppContent.tsx`, `src/app/app/voice/**`, `src/app/app/billing/**`, `src/app/app/admin/**`, `src/components/generation-form.tsx` (all Pass 2 or protected).

- [ ] **Step 1: Inventory the violations per file**

```bash
grep -rn "accent-purple\|accent-pink\|accent-yellow\|aurora-gradient\|bg-clip-text" \
  src/app/app/library src/app/app/calendar src/app/app/radar \
  src/app/app/toolkit src/app/app/settings --include="*.tsx"
```

- [ ] **Step 2: Apply the Task 6 mapping table to every hit, one page directory per commit**

Rules of thumb for judgment calls:
- Decorative gradient chips/borders → flat `bg-surface-container-low border border-border`
- Purple/pink/yellow text used as decoration → `text-muted-foreground`
- Colored elements that encode data (chart series, platform brand colors, status semantics like success/error/live) → KEEP, they are not on the kill list
- Cyan kept only for: the page's single primary CTA, live/ready status, focus rings

- [ ] **Step 3: Page-header kickers (optional, only where AppPageHeader is already used)**

Where these pages already render `<AppPageHeader title="..." />`, add a kicker with data already available in the component (no new fetches), e.g. Library: `kicker={`LIBRARY · ${kits.length} KITS`}`. Skip if the count is not already in scope — no new data plumbing in this pass.

- [ ] **Step 4: Verify zero remaining violations in scope**

Re-run the Step 1 grep.
Expected: zero hits in the five page directories (hits elsewhere are out of scope).

- [ ] **Step 5: Build + visual pass on all five pages, both modes**

Run: `npm run build` — expected PASS.
Run: `npm run dev` — walk Library, Calendar, Radar, Toolkit, Settings in light and dark.

- [ ] **Step 6: Commit (one per page directory, message pattern)**

```bash
git commit -m "feat(design): <page> on app-canvas language - kill-list sweep"
```

---

### Task 8: Verification gate + staging

**Files:** none (verification + PR)

- [ ] **Step 1: Full gates**

```bash
npm run lint && npm run build && npm run test:unit
```

Expected: all PASS (test:unit covers existing node tests; none should be affected).

- [ ] **Step 2: Run the frontend-gate skill** (build, type safety, visual consistency, Tailwind patterns, a11y) and fix anything it flags.

- [ ] **Step 3: Push and open a PR against `develop`**

```bash
git push -u origin feat/design-elevation-pass1
gh pr create --base develop --title "Design elevation pass 1: app-canvas shell" \
  --body "Implements Pass 1 of docs/superpowers/specs/2026-06-10-platform-redesign-echo-copilot-design.md ..."
```

- [ ] **Step 4: Founder review on the Vercel preview URL (staging)**

Review checklist for the preview:
- [ ] Dark + light mode on: Library, Calendar, Radar, Toolkit, Settings
- [ ] Marketing pages and auth pages visually unchanged
- [ ] Create + Voice pages: inherit tokens, no breakage (rebuild comes in Pass 2)
- [ ] Mobile drawer + header at <1024px
- [ ] No copy changed anywhere
- [ ] prefers-reduced-motion: waveform static

Nothing merges to `develop` until this checklist passes; nothing merges to `main` until founder sign-off on staging.

---

## Self-review notes

- **Spec coverage:** type roles (T1, T2), surface stack + grain (T2), motion tokens (T2), accent discipline + kill list (T2 btn override, T4 nav, T5 headers, T7 sweep), waveform rules (T3, single consumer T4), copy untouched (constraint, T8 checklist), sensitive paths excluded (constraints, T7 scope), staging rollout (T0, T8). Echo/Home/Voice rebuilds are Pass 2 — intentionally absent.
- **Light mode:** the spec mockups were dark; the app supports both modes via class AND media query. This plan defines both palettes and duplicates dark overrides in both activation paths (T2).
- **Known judgment areas:** T6/T7 are mapping-table sweeps, not full file listings, because the files are large and the violations are localized; the mapping table plus grep inventory makes them deterministic. Data-encoding colors are explicitly exempted.
