# Just Echo Phase 1 (Look) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Just Echo design system (tokens, theme switch with pre-paint bootstrap, and the `ds/` components) without changing how any current page looks.

**Architecture:** New tokens live in their own stylesheet and only apply inside a `.je` scope element, so today's pages are untouched until Phase 3 mounts the new shell inside `.je`. The theme choice (Auto / Light / Dark, default Auto) is stored in localStorage and written to `<html data-theme>` by an inline script before first paint; `.je` reads that attribute. Components are small, hand-rolled, Tailwind 4 + CSS variables, no new dependencies. A founder-only preview page shows every component in both themes.

**Tech Stack:** Next 16, React 19, Tailwind 4, lucide-react, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-11-27-just-echo-redesign-design.md` (sections 4 and 7). Visual source of truth: `docs/superpowers/specs/assets/2026-11-27-just-echo/just-echo-v4.html`. Both currently live on branch `docs/just-echo-redesign` (worktree `.worktrees/just-echo-spec`); read them there if the feature branch does not have them yet.

**Theme storage:** localStorage only in this phase (spec allows "profile setting if cheap"; it needs a backend field, so it waits for Phase 3 if wanted).

**Branch:** new worktree off `develop` in the FE repo (`echome-frontend`), branch `feat/just-echo-look`. FE never branches off `main`.

## Global Constraints

- Tokens are **scoped to `.je`**. No existing selector in `globals.css` changes, and no current page may look different after this phase (builder's call allowed by spec section 11; chosen to keep Phase 1 invisible).
- Theme values: `light | dark | system`, default `system`. Storage key `echome-theme`. Attribute `data-theme="light|dark"` on `<html>`.
- Do **not** add the `.dark` class to `<html>`: the old palette keys off `.dark` and `prefers-color-scheme`, and touching it would restyle old pages.
- Colour values verbatim from spec section 4, with two AA fixes (see Task 2): light `muted` `#676C7C` (spec `#7B8091` is 3.7:1 on canvas) and light `success` `#15803D` (spec `#16A34A` is 3.0:1). All other values exact.
- The gradient (`.je-grad`, `.je-grad-text`, `.je-ring`) is used only on: Echo box ring/glow, send button, primary buttons, progress fills and scan line, greeting line 2, logo, big stat numbers. In this phase that means `Button variant="primary"`, `IconButton variant="grad"`, `Meter` fill, `StepBar` fill, `ProgressWave` hits and scan line, and nothing else.
- Type: Satoshi only (`--font-satoshi`, already loaded). Machine details use the existing **JetBrains Mono** (`--font-mono`); builder's call per spec, no new font file. Display 36/900 tracking -0.04em; title 15–17/700; body 13–14/400–500; label 12/700 muted; mono 10–11.
- Radius 8 (controls) / 12 (rows, cards, thumbs) / 22 (box, containers). Spacing only 4/8/12/16/24.
- Icons: lucide-react, `strokeWidth={1.7}`, 18px default. No emoji as icons.
- Every animation stops under `prefers-reduced-motion: reduce` (static fill, no scan, shimmer or pulse).
- No em dashes in user-facing copy. No new npm dependencies.
- Fonts Manrope / Montserrat / Inter / Bebas Neue stay loaded (caption overlays use some); removal is Phase 6.

## Review Focus

1. **Stored value is junk or storage throws** (Safari private mode, an old value like `"DARK"`): the app must fall back to Auto, never crash or paint blank. Tests in Task 1.
2. **Hydration warning on `<html>`** because the bootstrap sets `data-theme` before React hydrates: `<html>` needs `suppressHydrationWarning`. Verified in Task 1 Step 6 (dev console clean).
3. **System theme flips while the tab is open in Auto** (macOS auto-switch at sunset): the page must follow without reload; in Light/Dark it must not. Test in Task 3.
4. **Bad media**: thumbnail URL 404s or is missing, duration is `NaN`/negative/`null`: show the designed placeholder and no badge, never a broken-image icon or `NaN:NaN`. Tests in Task 5.
5. **Out-of-range progress numbers** (`current` past the last step, meter `value > total`, `total = 0`): clamp, never render negative or overflowing segments. Tests in Tasks 6 and 8.

---

### Task 1: Theme preference core and pre-paint bootstrap

**Files:**
- Create: `src/lib/theme.ts`
- Test: `src/lib/theme.test.ts`
- Modify: `src/app/layout.tsx` (add `suppressHydrationWarning` to `<html>`, inline script as the first child of `<head>`)

**Interfaces:**
- Produces:
  - `type ThemePref = 'light' | 'dark' | 'system'`
  - `type ResolvedTheme = 'light' | 'dark'`
  - `const THEME_STORAGE_KEY = 'echome-theme'`
  - `resolveTheme(pref: ThemePref, systemDark: boolean): ResolvedTheme`
  - `readThemePref(): ThemePref` (bad value or storage error → `'system'`)
  - `systemPrefersDark(): boolean` (false if `matchMedia` missing)
  - `applyThemePref(pref: ThemePref): ResolvedTheme` (writes storage, `'system'` removes the key; sets `document.documentElement.dataset.theme`; storage errors swallowed, attribute still set)
  - `const THEME_BOOTSTRAP_SCRIPT: string` (self-contained IIFE, same resolution rules, final fallback `light` inside `catch`)

- [ ] **Step 1: Write the failing tests** in `src/lib/theme.test.ts`:
  - `resolveTheme`: `('light', true) → 'light'`, `('dark', false) → 'dark'`, `('system', true) → 'dark'`, `('system', false) → 'light'`.
  - `readThemePref`: stored `'dark'` → `'dark'`; stored `'DARK'` → `'system'`; stored `'purple'` → `'system'`; nothing stored → `'system'`; `localStorage.getItem` throwing (`vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error() })`) → `'system'`.
  - `applyThemePref('dark')` → `localStorage.getItem('echome-theme') === 'dark'` and `document.documentElement.dataset.theme === 'dark'`.
  - `applyThemePref('system')` with a previously stored `'light'` → key removed; `dataset.theme` equals `matchMedia` result (stub `matchMedia` to `matches: true` → `'dark'`).
  - `applyThemePref('light')` with `setItem` throwing → returns `'light'`, `dataset.theme === 'light'`, no throw.
  - Bootstrap: `new Function(THEME_BOOTSTRAP_SCRIPT)()` with stored `'dark'` → `dataset.theme === 'dark'`; with `getItem` throwing → `dataset.theme === 'light'`.
  - `beforeEach`: `localStorage.clear()`, `delete document.documentElement.dataset.theme`.

- [ ] **Step 2: Run to verify they fail**
  Run: `npx vitest run src/lib/theme.test.ts`
  Expected: FAIL, cannot resolve `./theme`.

- [ ] **Step 3: Implement `src/lib/theme.ts`** with the interfaces above. The bootstrap string must not import anything and must only read `localStorage`, `matchMedia` and set the attribute. Valid stored values are exactly `'light'` and `'dark'`.

- [ ] **Step 4: Run to verify they pass**
  Run: `npx vitest run src/lib/theme.test.ts`
  Expected: PASS.

- [ ] **Step 5: Wire into `src/app/layout.tsx`.** `<html lang="en" suppressHydrationWarning>`; first child of `<head>`: `<script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />` (plain `<script>`, not `next/script`, so it runs before paint; CSP already allows `'unsafe-inline'` and is report-only). Do not touch `themeColor` or anything else.

- [ ] **Step 6: Verify in the browser.** `npm run dev`, open `/`. In DevTools: `<html>` has `data-theme` matching the OS; console shows no hydration warning; the homepage looks identical to before (no visual change is expected anywhere). Set `localStorage['echome-theme']='dark'`, reload: attribute is `dark`, page still looks the same.

- [ ] **Step 7: Commit**
```bash
git add src/lib/theme.ts src/lib/theme.test.ts src/app/layout.tsx
git commit -m "feat(theme): theme preference store and pre-paint bootstrap"
```

---

### Task 2: Just Echo tokens and motion

**Files:**
- Create: `src/app/just-echo.css`
- Modify: `src/app/globals.css` (one line: `@import "./just-echo.css";` directly after the existing `@plugin` line)
- Test: `src/app/just-echo-tokens.test.ts`

**Interfaces:**
- Produces CSS custom properties on `.je`: `--je-canvas`, `--je-bg` (canvas with both radial glows), `--je-g1`, `--je-g2`, `--je-ink`, `--je-ink-2`, `--je-muted`, `--je-item`, `--je-field`, `--je-panel`, `--je-hair`, `--je-faint`, `--je-accent`, `--je-tint`, `--je-glow`, `--je-glow-2`, `--je-on-grad`, `--je-ok`, `--je-thumb`, `--je-badge-ring`; radii `--je-r-control: 8px`, `--je-r-item: 12px`, `--je-r-box: 22px`.
- Produces Tailwind colours via `@theme inline` (`--color-je-<name>: var(--je-<name>)`) for: canvas, ink, ink-2, muted, item, field, panel, hair, faint, accent, tint, on-grad, ok. So `text-je-ink`, `bg-je-item`, `border-je-hair` work.
- Produces classes: `.je` (sets `color: var(--je-ink)`, `font-family: var(--font-satoshi)`), `.je-canvas` (background `var(--je-bg)`), `.je-grad`, `.je-grad-text`, `.je-ring`, `.je-mono` (`font-family: var(--font-mono)`), `.je-sr-only`; keyframes `je-scan`, `je-pulse`, `je-shimmer`, `je-slide`.
- Theme selectors (no duplication of the dark block):
  - `.je` → dark values (default).
  - `html[data-theme="light"] .je:not([data-je-theme="dark"]), .je[data-je-theme="light"]` → light values.
  - `data-je-theme` on a `.je` element forces a theme for that subtree (used by the preview page).

Values (dark / light), from spec section 4 and the mockup's `.dark` / `.light` blocks:

| var | dark | light |
|---|---|---|
| canvas | `#08090D` | `#F4F5F8` |
| bg | `radial-gradient(700px 420px at 52% 45%, rgba(167,139,250,.13), transparent 65%), radial-gradient(600px 340px at 15% 0%, rgba(34,211,238,.06), transparent 60%), #08090D` | same shape with `rgba(139,92,246,.10)`, `rgba(6,182,212,.06)`, `#F4F5F8` |
| g1 / g2 | `#22D3EE` / `#A78BFA` | `#06B6D4` / `#8B5CF6` |
| ink / ink-2 / muted | `#F2F3F7` / `#C3C6D1` / `#7D8294` | `#0F1117` / `#363A48` / **`#676C7C`** |
| item | `rgba(255,255,255,.04)` | `rgba(15,17,23,.03)` |
| field | `rgba(20,22,30,.95)` | `#FFFFFF` |
| panel | `rgba(255,255,255,.025)` | `rgba(255,255,255,.6)` |
| hair | `rgba(255,255,255,.07)` | `rgba(15,17,23,.08)` |
| faint | `rgba(255,255,255,.14)` | `rgba(15,17,23,.14)` |
| accent | `#C4B5FD` | `#6D28D9` |
| tint | `rgba(167,139,250,.14)` | `rgba(124,58,237,.08)` |
| glow / glow-2 | `rgba(167,139,250,.28)` / `rgba(34,211,238,.16)` | `rgba(124,58,237,.20)` / `rgba(6,182,212,.14)` |
| on-grad | `#08090D` | `#FFFFFF` |
| ok | `#4ADE80` | **`#15803D`** |
| thumb | `linear-gradient(160deg,#2a2f42,#151823)` | `linear-gradient(160deg,#e1e4ec,#cdd1db)` |
| badge-ring | `#08090D` | `#FFFFFF` |

Gradient helpers: `.je-grad { background: linear-gradient(135deg, var(--je-g1), var(--je-g2)); }`, `.je-grad-text` (90deg, background-clip text, transparent colour), `.je-ring` (the mockup's `.ring::before` mask technique, 1.5px). Keyframes copied from the mockup (`scan`, `pulse`, `shimmer`, `slide`) with the `je-` prefix. Reduced motion: `@media (prefers-reduced-motion: reduce) { .je *, .je *::before, .je *::after { animation: none !important; } }`.

- [ ] **Step 1: Write the failing test** `src/app/just-echo-tokens.test.ts`. Read `just-echo.css` with `fs.readFileSync`, split it into the dark block (the rule whose selector is exactly `.je`) and the light block (the rule whose selector starts with `html[data-theme="light"] .je`) with a small regex helper, then:
  - `it.each` over every row of the table above: dark block contains `--je-<var>: <dark value>;` and light block contains `--je-<var>: <light value>;` (compare with whitespace collapsed, case-insensitive hex).
  - Contrast: a `contrast(hexFg, hexBg)` helper (WCAG relative luminance). Assert `>= 4.5` for ink, ink-2, muted, accent, ok against canvas in both themes.
  - `globals.css` contains `@import "./just-echo.css";` and the file has a `prefers-reduced-motion: reduce` block.

- [ ] **Step 2: Run to verify it fails**
  Run: `npx vitest run src/app/just-echo-tokens.test.ts`
  Expected: FAIL, ENOENT on `just-echo.css`.

- [ ] **Step 3: Write `src/app/just-echo.css`** per the interfaces and table, and add the `@import` line to `globals.css`.

- [ ] **Step 4: Run to verify it passes**
  Run: `npx vitest run src/app/just-echo-tokens.test.ts`
  Expected: PASS. If a contrast assertion fails on a value this plan pinned, stop and report it rather than picking a new colour.

- [ ] **Step 5: Verify no visual change.** `npm run build` succeeds (Tailwind accepts the import and `@theme inline`). With `npm run dev`, `/app` and `/` look exactly as before in both OS themes.

- [ ] **Step 6: Commit**
```bash
git add src/app/just-echo.css src/app/globals.css src/app/just-echo-tokens.test.ts
git commit -m "feat(ds): Just Echo tokens scoped to .je"
```

---

### Task 3: ThemeSwitch and useThemePref

**Files:**
- Create: `src/hooks/useThemePref.ts`, `src/components/ds/ThemeSwitch.tsx`, `src/components/ds/cx.ts`
- Test: `src/components/ds/ThemeSwitch.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`readThemePref`, `applyThemePref`, `systemPrefersDark`, `resolveTheme`, `ThemePref`, `ResolvedTheme`).
- Produces:
  - `cx(...parts: Array<string | false | null | undefined>): string` (joins truthy parts with a space; used by every ds component).
  - `useThemePref(): { pref: ThemePref; resolved: ResolvedTheme; setPref: (p: ThemePref) => void }`. Reads storage after mount (initial render uses `'system'` to stay hydration-safe). While `pref === 'system'`, subscribes to `matchMedia('(prefers-color-scheme: dark)')` `change` and re-applies; unsubscribes otherwise and on unmount.
  - `ThemeSwitch({ className?: string })`: a `role="radiogroup"` with `aria-label="Theme"` and three `role="radio"` buttons in this order: Auto (lucide `Monitor`), Light (`Sun`), Dark (`Moon`). Each 26px square, icon 15px, `aria-label` = the word, `aria-checked`. Selected one gets `bg-je-tint text-je-ink`; others `text-je-muted`. Container: hairline border, radius 8, padding 2. Arrow keys move selection (standard radiogroup).

- [ ] **Step 1: Write the failing tests**
  - Renders a radiogroup named "Theme" with radios Auto, Light, Dark; with nothing stored, Auto is `aria-checked="true"` after mount.
  - With `'light'` stored, Light is checked after mount.
  - Clicking Dark → `localStorage['echome-theme'] === 'dark'`, `<html data-theme="dark">`, Dark checked.
  - Clicking Auto after Dark → storage key removed.
  - System change in Auto: stub `matchMedia` with a controllable fake that records the `change` listener; fire it with `matches: true` → `data-theme` becomes `dark`. Same fire while on Light → stays `light`.
  - Unmount removes the listener (fake's listener set is empty).
  - ArrowRight from Auto checks Light.

- [ ] **Step 2: Run to verify they fail**
  Run: `npx vitest run src/components/ds/ThemeSwitch.test.tsx`
  Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `cx.ts`, `useThemePref.ts`, `ThemeSwitch.tsx`.

- [ ] **Step 4: Run to verify they pass**
  Run: `npx vitest run src/components/ds/ThemeSwitch.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/hooks/useThemePref.ts src/components/ds/ThemeSwitch.tsx src/components/ds/cx.ts src/components/ds/ThemeSwitch.test.tsx
git commit -m "feat(ds): ThemeSwitch with Auto/Light/Dark"
```

---

### Task 4: Button and IconButton

**Files:**
- Create: `src/components/ds/Button.tsx`, `src/components/ds/IconButton.tsx`
- Test: `src/components/ds/Button.test.tsx`

**Interfaces:**
- Consumes: `cx` (Task 3), token classes (Task 2).
- Produces:
  - `Button` (forwardRef to `HTMLButtonElement`): props `ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; size?: 'md' | 'sm'; loading?: boolean }`. Defaults `variant='secondary'`, `size='md'`, `type='button'`. md: h-10, radius 12, 13px/700. sm: h-8, radius 8, 12px/700. primary: `je-grad text-je-on-grad`. secondary: `bg-je-item border border-je-hair text-je-ink`. `loading` → `disabled`, `aria-busy="true"`, opacity 70; label stays (no spinner). Visible focus ring: `focus-visible:outline-2 outline-offset-2` in `--je-accent`.
  - `IconButton` (forwardRef): props `Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { label: string; icon: LucideIcon; size?: 30 | 34 | 38; variant?: 'ghost' | 'grad' }`. Defaults size 34, variant ghost. ghost: hairline border, `text-je-muted`, radius 10 at 34/38 and 9 at 30. grad: `je-grad text-je-on-grad`, radius 11 (the send button). Icon 18px, `strokeWidth={1.7}`, `aria-hidden`. `aria-label={label}` and `title={label}`.

- [ ] **Step 1: Write the failing tests**
  - `Button` renders children, defaults to `type="button"`.
  - `variant="primary"` has class `je-grad`; secondary does not.
  - `loading` → button disabled, `aria-busy="true"`, click handler not called.
  - `IconButton label="Send" icon={ArrowUp}` → accessible name "Send"; the svg has `stroke-width="1.7"` and `aria-hidden="true"`; `variant="grad"` has `je-grad`.

- [ ] **Step 2: Run to verify they fail**
  Run: `npx vitest run src/components/ds/Button.test.tsx`
  Expected: FAIL, module not found.

- [ ] **Step 3: Implement both components.**

- [ ] **Step 4: Run to verify they pass**
  Run: `npx vitest run src/components/ds/Button.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/ds/Button.tsx src/components/ds/IconButton.tsx src/components/ds/Button.test.tsx
git commit -m "feat(ds): Button and IconButton"
```

---

### Task 5: PlatformBadge and Thumb

**Files:**
- Create: `src/components/ds/PlatformBadge.tsx`, `src/components/ds/Thumb.tsx`, `src/components/ds/format.ts`
- Test: `src/components/ds/Thumb.test.tsx`

**Interfaces:**
- Consumes: `cx`, tokens.
- Produces:
  - `formatDuration(seconds: number | null | undefined): string | null`: `0 → '0:00'`, `42 → '0:42'`, `65 → '1:05'`, `3725 → '1:02:05'`; `null`, `undefined`, `NaN`, negative, `Infinity` → `null`. Fractions floor.
  - `PlatformBadge({ platform: string; className?: string })`: 16px square, radius 5, 8.5px/900 white glyph, `box-shadow: 0 0 0 2px var(--je-badge-ring)`, `role="img"`, `aria-label` = display name. Map (case-insensitive): `instagram` → "Instagram", glyph `IG`, IG gradient `linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)`; `linkedin` → "LinkedIn", `in`, `#0A66C2`; `facebook` → "Facebook", `f`, `#1877F2`; `tiktok` → "TikTok", `TT`, `#111111`; `youtube` → "YouTube", `YT`, `#FF0000`; `twitter` and `x` → "X", `X`, `#111111`; `threads` → "Threads", `@`, `#111111`; `blog` → "Blog", `B`, `#6D28D9`. Unknown → display name = input capitalised, glyph = first letter uppercase, background `#7D8294`. Empty string → render nothing.
  - `Thumb({ src?: string | null; alt: string; duration?: number | null; platform?: string; aspect?: 'square' | 'reel' | 'wide'; state?: 'default' | 'done' | 'pending'; className?: string })`. Aspects: square `1/1`, reel `9/14`, wide `16/9`. Radius 12 (10 in the mockup's week grid is fine via `className`). Image as `<img>` with `object-cover`, `loading="lazy"`, `alt`. No `src` or `onError` → placeholder `div` with `background: var(--je-thumb)`, `role="img"`, `aria-label={alt}`. Duration badge (from `formatDuration`) bottom-left, `je-mono` 10px, white on `rgba(0,0,0,.55)`, radius 5. Platform badge bottom-right offset -4px. `done`: opacity .5, `saturate(.4)`, centred check (lucide `Check`, white) and `<span className="je-sr-only">Posted</span>`. `pending`: dashed `--je-faint` border, `bg-je-item`, shimmer overlay using `je-shimmer`, `<span className="je-sr-only">Loading</span>`.

- [ ] **Step 1: Write the failing tests**
  - `formatDuration` table above, including `NaN`, `-3`, `Infinity`, `null`, `42.9 → '0:42'`.
  - `Thumb` with `src` renders an img with the alt; firing `error` on it swaps to an element with `role="img"` and the same name, and no `img` remains.
  - `Thumb` without `src` renders the placeholder (no `img`).
  - `duration={65}` shows `1:05`; `duration={NaN}` shows no badge.
  - `state="done"` exposes text "Posted"; `state="pending"` exposes "Loading".
  - `PlatformBadge platform="Instagram"` → name "Instagram", text `IG`; `platform="mastodon"` → name "Mastodon", text `M`; `platform=""` renders nothing.

- [ ] **Step 2: Run to verify they fail**
  Run: `npx vitest run src/components/ds/Thumb.test.tsx`
  Expected: FAIL, module not found.

- [ ] **Step 3: Implement** `format.ts`, `PlatformBadge.tsx`, `Thumb.tsx`.

- [ ] **Step 4: Run to verify they pass**
  Run: `npx vitest run src/components/ds/Thumb.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/ds/PlatformBadge.tsx src/components/ds/Thumb.tsx src/components/ds/format.ts src/components/ds/Thumb.test.tsx
git commit -m "feat(ds): PlatformBadge and Thumb"
```

---

### Task 6: Row, Tile and Meter

**Files:**
- Create: `src/components/ds/Row.tsx`, `src/components/ds/Tile.tsx`, `src/components/ds/Meter.tsx`
- Test: `src/components/ds/Row.test.tsx`

**Interfaces:**
- Consumes: `cx`, tokens; `next/link`.
- Produces:
  - `Row({ lead?: ReactNode; title: ReactNode; detail?: ReactNode; trail?: ReactNode; onClick?: () => void; href?: string; selected?: boolean; className?: string })`. Element: `Link` when `href`, `button type="button"` when `onClick`, else `div`. Layout from mockup `.nx`: flex, gap 12, padding 10, radius 14, `bg-je-item border border-je-hair`. Title 13/500 `truncate`, detail 11.5px `text-je-muted` `truncate`, middle column `min-w-0 flex-1`, trail `ml-auto shrink-0`. `selected` → `bg-je-tint` and `aria-current="true"`.
  - `Tile({ picture: ReactNode; action: string; onClick?: () => void; href?: string; className?: string })`. From mockup `.tile`: radius 16, `bg-je-item border border-je-hair`, picture area h-[84px] relative overflow hidden, action row padding 10/12, 13/500, trailing lucide `ArrowRight` 16px in `text-je-accent`. Same element rule as `Row`. Accessible name = `action`.
  - `Meter({ value: number; total: number; label: string; className?: string })`. `total <= 0` or not finite → render nothing. `value` clamped to `[0, total]` and floored. Segments: one per unit when `total <= 14` (each 10×4, radius 2, gap 3), else one continuous 64×4 bar filled to `value/total`. Filled = `je-grad` with `data-filled="true"`, empty = `--je-faint` with `data-filled="false"`. Then `je-mono` 11px `text-je-muted` text `${value}/${total}`. Root `role="meter"`, `aria-valuemin=0`, `aria-valuemax=total`, `aria-valuenow=value`, `aria-label={label}`.

- [ ] **Step 1: Write the failing tests**
  - `Row onClick` renders a button; `Row href="/x"` renders a link to `/x`; neither renders no button and no link.
  - `Row selected` → `aria-current="true"`.
  - Title element has class `truncate`.
  - `Tile action="Clip my latest video" onClick` → button named "Clip my latest video"; clicking calls handler.
  - `Meter value={4} total={7} label="Days covered"` → meter named "Days covered", `aria-valuenow="4"`, text `4/7`, 7 segments with 4 filled (query by `data-filled="true"`).
  - `Meter value={9} total={7}` → `aria-valuenow="7"`, text `7/7`. `value={-2}` → `0/7`. `total={0}` → renders nothing. `total={30} value={12}` → one continuous bar, text `12/30`.

- [ ] **Step 2: Run to verify they fail**
  Run: `npx vitest run src/components/ds/Row.test.tsx`
  Expected: FAIL, module not found.

- [ ] **Step 3: Implement** the three components.

- [ ] **Step 4: Run to verify they pass**
  Run: `npx vitest run src/components/ds/Row.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/ds/Row.tsx src/components/ds/Tile.tsx src/components/ds/Meter.tsx src/components/ds/Row.test.tsx
git commit -m "feat(ds): Row, Tile and Meter"
```

---

### Task 7: Panel

**Files:**
- Create: `src/components/ds/Panel.tsx`
- Test: `src/components/ds/Panel.test.tsx`

**Interfaces:**
- Consumes: `IconButton` (Task 4), `cx`.
- Produces: `Panel({ title: string; onClose: () => void; actions?: ReactNode; children: ReactNode; className?: string })`. `<section aria-label={title}>`, full height flex column, `bg-je-panel`, left hairline. Header: padding 20, title 15/700, `actions` then `IconButton label="Close" icon={X} size={30}` at the right. Body: `flex-1 overflow-y-auto` padding 20, gap 20. Escape closes only when focus is inside the section (keydown handler on the section, not `window`, so it never steals Escape from the Echo box).

- [ ] **Step 1: Write the failing tests**
  - Region named by `title` renders children.
  - Clicking "Close" calls `onClose` once.
  - Escape pressed with focus on a button inside the panel calls `onClose`.
  - Escape pressed with focus on an input outside the panel does not.

- [ ] **Step 2: Run to verify they fail**
  Run: `npx vitest run src/components/ds/Panel.test.tsx`
  Expected: FAIL, module not found.

- [ ] **Step 3: Implement `Panel.tsx`.**

- [ ] **Step 4: Run to verify they pass**
  Run: `npx vitest run src/components/ds/Panel.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/ds/Panel.tsx src/components/ds/Panel.test.tsx
git commit -m "feat(ds): Panel"
```

---

### Task 8: StepBar and ProgressWave

**Files:**
- Create: `src/components/ds/StepBar.tsx`, `src/components/ds/ProgressWave.tsx`
- Test: `src/components/ds/StepBar.test.tsx`

**Interfaces:**
- Consumes: `cx`, tokens, keyframes `je-slide`, `je-scan` (Task 2).
- Produces:
  - `StepBar({ steps: string[]; current: number; className?: string })`. `steps.length === 0` → nothing. `current` floored and clamped to `[0, steps.length]`; `current === steps.length` means all done. `<ol aria-label="Progress">`, one `<li>` per step with `data-state="done" | "now" | "todo"`. Bar row (from mockup `.steps`): flex gap 6, each 4px tall radius 2, done = `je-grad`, todo = `--je-faint`, now = faint with a 40%-wide gradient slider animated by `je-slide` (1.4s ease-in-out infinite alternate). Label row under it: 10.5px `text-je-muted`, now = `text-je-accent` 700. Current `li` gets `aria-current="step"`; done steps include `<span className="je-sr-only">done</span>`.
  - `ProgressWave({ bars: number[]; hits?: number[]; scanning?: boolean; className?: string })`. Decorative: root `aria-hidden="true"`. Height 38, flex gap 2, one `<i>` per bar, height `clamp(value, 0.08, 1) * 100%` (non-finite → 0.08), radius 2, `--je-faint`; indices in `hits` get `je-grad` (vertical) and `data-hit="true"`; out-of-range hit indices ignored. `scanning` adds a 2px scan line element with a `data-scan` attribute (gradient `transparent → var(--je-g2) → transparent`, `box-shadow: 0 0 12px var(--je-g2)`) animated by `je-scan` 4.5s linear infinite. Empty `bars` → nothing.

- [ ] **Step 1: Write the failing tests**
  - `StepBar steps={['Upload','Transcribe','Find moments','Captions']} current={2}` → states `done, done, now, todo`; the third item has `aria-current="step"`; labels visible.
  - `current={9}` → all `done`, no `aria-current`. `current={-1}` → first is `now`. `steps={[]}` → renders nothing.
  - `ProgressWave bars={[0.5, 2, -1, NaN]} hits={[1, 7]}` → root `aria-hidden="true"`; 4 bars; heights `50%`, `100%`, `8%`, `8%`; exactly one `data-hit="true"` (index 1).
  - `scanning` renders an element with `data-scan`; omitted → none.

- [ ] **Step 2: Run to verify they fail**
  Run: `npx vitest run src/components/ds/StepBar.test.tsx`
  Expected: FAIL, module not found.

- [ ] **Step 3: Implement both components.**

- [ ] **Step 4: Run to verify they pass**
  Run: `npx vitest run src/components/ds/StepBar.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/components/ds/StepBar.tsx src/components/ds/ProgressWave.tsx src/components/ds/StepBar.test.tsx
git commit -m "feat(ds): StepBar and ProgressWave"
```

---

### Task 9: Founder preview page and phase verification

**Files:**
- Create: `src/app/app/admin/design-system/page.tsx`
- Modify: `src/app/app/admin/layout.tsx` (append `{ id: 'design', label: 'Design', href: '/app/admin/design-system' }` to `ADMIN_TABS`)
- Test: `src/app/app/admin/design-system/page.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2 to 8.
- Produces: a client page, fixture data only (no API calls, no user data, no external image URLs: thumbnails use the placeholder or files already in `/public`). Layout: a top bar inside an unforced `.je je-canvas` with the live `ThemeSwitch` (proves the real switch). Below, two columns side by side, `.je je-canvas` with `data-je-theme="dark"` and `data-je-theme="light"`, each showing in this order: display heading "Make something today." with line 2 in `je-grad-text`; Buttons (primary, secondary, sm, loading); IconButtons (ghost, grad); PlatformBadges (all eight plus one unknown); Thumbs (square, reel with `duration={42}`, `done`, `pending`, broken `src="/does-not-exist.jpg"`); a week strip of 7 square Thumbs with `Meter value={4} total={7} label="Days covered"`; two Rows (one selected); three Tiles; a Panel (title "Clips", `onClose` no-op) containing a StepBar (`current={2}`, the clip steps) over a ProgressWave (48 bars, a few hits, `scanning`).

- [ ] **Step 1: Write the failing test**: page renders headings for both columns ("Dark", "Light"), a radiogroup named "Theme", and exactly two elements with `data-je-theme` (values `dark`, `light`).

- [ ] **Step 2: Run to verify it fails**
  Run: `npx vitest run src/app/app/admin/design-system/page.test.tsx`
  Expected: FAIL, module not found.

- [ ] **Step 3: Implement the page and the admin tab.**

- [ ] **Step 4: Run to verify it passes**
  Run: `npx vitest run src/app/app/admin/design-system/page.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Visual check against the mockup.** `npm run dev`, sign in as an admin, open `/app/admin/design-system`. Compare side by side with `just-echo-v4.html` (both themes): colours, radii, badge rings, meter, step bar, scan line, shimmer. Check: gradient appears only on the allowed elements listed in Global Constraints; the live ThemeSwitch flips the top bar and the forced columns do not move; with macOS "Reduce motion" on (or DevTools rendering emulation), scan, shimmer, slide and pulse are static. Take Playwright screenshots into `.playwright-mcp/` (gitignored), attach them to the PR description, then delete them and close the browser.

- [ ] **Step 6: Regression check.** Open `/`, `/app`, `/app/library`, `/app/calendar` in both OS themes: they must look exactly as on `develop`.

- [ ] **Step 7: Full suite, lint, build**
  Run: `npm run test:unit && npm run lint && npm run build`
  Expected: all pass, no new lint warnings in touched files.

- [ ] **Step 8: Commit**
```bash
git add src/app/app/admin/design-system src/app/app/admin/layout.tsx
git commit -m "feat(ds): founder preview page for the Just Echo design system"
```

PR to `develop` (merge, never squash) when the founder asks to ship. No backend change and no MCP change in this phase: nothing user-facing ships, so the MCP parity rule has nothing to update.
