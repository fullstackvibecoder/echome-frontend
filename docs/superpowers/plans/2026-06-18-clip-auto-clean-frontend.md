# Clip Auto-Clean — Frontend Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface backend-produced auto-clean results in the EchoMe frontend — show what was cleaned on a clip, let the user compare cleaned vs original, and let the user opt the feature on/off in settings.

**Architecture:** The backend (Railway, out of scope) removes filler words + long pauses at clip creation and returns three new fields on each clip (`cleanedUrl`, `autoCleanApplied`, `cleanReport`) plus a new user preference (`auto_clean_clips`). The frontend ships *behind that contract*: all new fields are optional, so old clips and a not-yet-deployed backend degrade to current behavior. Logic is extracted into two small, pure-ish units (a video-source selector and a presentational banner) that are unit-tested in isolation; `ClipEditorModal` only wires them together.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind, vitest + @testing-library/react.

## Global Constraints

- All new clip/profile fields are OPTIONAL (`?`) — frontend must render correctly when they are absent (old clips, backend not yet deployed). Verbatim contract fields: `cleanedUrl?: string`, `autoCleanApplied?: boolean`, `cleanReport?: CleanReport`, `auto_clean_clips?: boolean`.
- User-facing copy: NO em dashes. Use periods or commas.
- `VideoClip` is imported from `@/lib/api-client` (NOT `@/types`). There is no `VideoClip` in `src/types/index.ts`.
- Test runner is vitest. Unit test command: `npm run test:unit` (`vitest run`). Test files: `src/**/*.test.{ts,tsx}`, jsdom env, `@` alias → `./src`.
- Preference persistence mechanism is `api.auth.updateProfile({ <key>: value })` — mirror the existing `email_notifications` toggle exactly.

---

### Task 1: Clip type extension + video-source selector

Adds the contract fields to `VideoClip`, a shared `CleanReport` type, and a pure function that decides which URL the player shows (cleaned by default, original when the user is comparing). Extracting the selection keeps `ClipEditorModal`'s wiring testable without rendering the whole modal.

**Files:**
- Modify: `src/lib/api-client.ts` (VideoClip interface at lines 4715-4761; add `CleanReport` just above it)
- Create: `src/components/content-kit/clip-video-src.ts`
- Test: `src/components/content-kit/clip-video-src.test.ts`

**Interfaces:**
- Consumes: existing `VideoClip` (`src/lib/api-client.ts:4715`), whose video URL lives at `clip.exports?.[0]?.url` and optional split URL at `(clip as any).splitScreenUrl`.
- Produces:
  - `export interface CleanReport { fillerRemoved: number; pausesTrimmed: number; secondsSaved: number; }` in `src/lib/api-client.ts`
  - `VideoClip` gains `cleanedUrl?: string; autoCleanApplied?: boolean; cleanReport?: CleanReport;`
  - `export function selectClipVideoSrc(clip: VideoClip, viewMode: 'single' | 'split', showOriginal: boolean): string` in `clip-video-src.ts`

- [ ] **Step 1: Extend the VideoClip type and add CleanReport**

In `src/lib/api-client.ts`, find the VideoClip interface opening (line 4715):

```typescript
export interface VideoClip {
  id: string;
  userId: string;
```

Insert the `CleanReport` interface immediately ABOVE `export interface VideoClip {`:

```typescript
/** Result summary of the auto-clean pass (filler + pause removal) applied at clip creation. */
export interface CleanReport {
  fillerRemoved: number;
  pausesTrimmed: number;
  secondsSaved: number;
}

```

Then find the end of the VideoClip interface (lines 4759-4761):

```typescript
  createdAt: string;
  updatedAt: string;
  exportedAt?: string;
}
```

Replace it with (adds three optional fields before the closing brace):

```typescript
  createdAt: string;
  updatedAt: string;
  exportedAt?: string;
  // --- Auto-clean (Phase 1): backend removes filler + long pauses at creation ---
  /** URL of the cleaned render. Present only when autoCleanApplied is true. */
  cleanedUrl?: string;
  /** True when the backend applied an auto-clean pass to this clip. */
  autoCleanApplied?: boolean;
  /** What the auto-clean pass removed. Present only when autoCleanApplied is true. */
  cleanReport?: CleanReport;
}
```

- [ ] **Step 2: Write the failing test for the selector**

Create `src/components/content-kit/clip-video-src.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { selectClipVideoSrc } from './clip-video-src';
import type { VideoClip } from '@/lib/api-client';

// Minimal builder — only the fields selectClipVideoSrc reads.
function makeClip(overrides: Partial<VideoClip> = {}): VideoClip {
  return {
    exports: [{ url: 'https://cdn/original.mp4' }],
    ...overrides,
  } as VideoClip;
}

describe('selectClipVideoSrc', () => {
  it('returns the cleaned URL by default when auto-clean was applied', () => {
    const clip = makeClip({ autoCleanApplied: true, cleanedUrl: 'https://cdn/cleaned.mp4' });
    expect(selectClipVideoSrc(clip, 'single', false)).toBe('https://cdn/cleaned.mp4');
  });

  it('returns the original URL when the user is comparing (showOriginal=true)', () => {
    const clip = makeClip({ autoCleanApplied: true, cleanedUrl: 'https://cdn/cleaned.mp4' });
    expect(selectClipVideoSrc(clip, 'single', true)).toBe('https://cdn/original.mp4');
  });

  it('returns the original URL when auto-clean was not applied', () => {
    const clip = makeClip({ autoCleanApplied: false });
    expect(selectClipVideoSrc(clip, 'single', false)).toBe('https://cdn/original.mp4');
  });

  it('returns the split-screen URL in split view', () => {
    const clip = makeClip({ autoCleanApplied: true, cleanedUrl: 'https://cdn/cleaned.mp4' });
    (clip as Record<string, unknown>).splitScreenUrl = 'https://cdn/split.mp4';
    expect(selectClipVideoSrc(clip, 'split', false)).toBe('https://cdn/split.mp4');
  });

  it('falls back to empty string when there are no exports', () => {
    const clip = makeClip({ exports: [] });
    expect(selectClipVideoSrc(clip, 'single', false)).toBe('');
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npm run test:unit -- src/components/content-kit/clip-video-src.test.ts`
Expected: FAIL — `Failed to resolve import "./clip-video-src"` (module does not exist yet).

- [ ] **Step 4: Write the selector**

Create `src/components/content-kit/clip-video-src.ts`:

```typescript
import type { VideoClip } from '@/lib/api-client';

/**
 * Decide which URL the clip player/exporter should use.
 *
 * Split view wins when a split-screen render exists. Otherwise the cleaned
 * render is the default once auto-clean has been applied, unless the user is
 * comparing against the original (showOriginal). Falls back to the first
 * export URL, then to an empty string.
 */
export function selectClipVideoSrc(
  clip: VideoClip,
  viewMode: 'single' | 'split',
  showOriginal: boolean,
): string {
  const splitScreenUrl = (clip as Record<string, unknown>).splitScreenUrl as string | undefined;
  if (viewMode === 'split' && splitScreenUrl) return splitScreenUrl;

  const baseSrc = clip.exports?.[0]?.url || '';
  const cleanedAvailable = !!clip.autoCleanApplied && !!clip.cleanedUrl;
  if (cleanedAvailable && !showOriginal) return clip.cleanedUrl as string;
  return baseSrc;
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npm run test:unit -- src/components/content-kit/clip-video-src.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "\.next/" || echo "clean"`
Expected: `clean` (ignore any pre-existing `.next/` generated-file errors).

- [ ] **Step 7: Commit**

```bash
git add src/lib/api-client.ts src/components/content-kit/clip-video-src.ts src/components/content-kit/clip-video-src.test.ts
git commit -m "feat(clips): add auto-clean clip fields + video-source selector"
```

---

### Task 2: ClipCleanBanner component

A presentational banner that summarizes the clean report and offers a compare-to-original toggle. Pure component, no API calls — fully unit-testable.

**Files:**
- Create: `src/components/content-kit/ClipCleanBanner.tsx`
- Test: `src/components/content-kit/ClipCleanBanner.test.tsx`

**Interfaces:**
- Consumes: `CleanReport` from `@/lib/api-client` (Task 1).
- Produces: `export function ClipCleanBanner(props: { report: CleanReport; showingOriginal: boolean; onToggleOriginal: (showOriginal: boolean) => void }): JSX.Element`

- [ ] **Step 1: Write the failing test**

Create `src/components/content-kit/ClipCleanBanner.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ClipCleanBanner } from './ClipCleanBanner';

const report = { fillerRemoved: 8, pausesTrimmed: 3, secondsSaved: 4 };

describe('ClipCleanBanner', () => {
  it('summarizes the clean report with correct pluralization', () => {
    render(<ClipCleanBanner report={report} showingOriginal={false} onToggleOriginal={vi.fn()} />);
    expect(screen.getByText(/removed 8 filler words/i)).toBeInTheDocument();
    expect(screen.getByText(/trimmed 3 pauses/i)).toBeInTheDocument();
    expect(screen.getByText(/saved 4s/i)).toBeInTheDocument();
  });

  it('uses singular nouns when counts are 1', () => {
    render(
      <ClipCleanBanner
        report={{ fillerRemoved: 1, pausesTrimmed: 1, secondsSaved: 1 }}
        showingOriginal={false}
        onToggleOriginal={vi.fn()}
      />,
    );
    expect(screen.getByText(/removed 1 filler word,/i)).toBeInTheDocument();
    expect(screen.getByText(/trimmed 1 pause,/i)).toBeInTheDocument();
  });

  it('shows "Compare to original" and toggles on click', async () => {
    const onToggle = vi.fn();
    render(<ClipCleanBanner report={report} showingOriginal={false} onToggleOriginal={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /compare to original/i }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('shows "Back to cleaned" when viewing the original', async () => {
    const onToggle = vi.fn();
    render(<ClipCleanBanner report={report} showingOriginal={true} onToggleOriginal={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /back to cleaned/i }));
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test:unit -- src/components/content-kit/ClipCleanBanner.test.tsx`
Expected: FAIL — cannot resolve `./ClipCleanBanner`.

- [ ] **Step 3: Write the component**

Create `src/components/content-kit/ClipCleanBanner.tsx`:

```tsx
import { Sparkles } from 'lucide-react';
import type { CleanReport } from '@/lib/api-client';

interface ClipCleanBannerProps {
  report: CleanReport;
  showingOriginal: boolean;
  onToggleOriginal: (showOriginal: boolean) => void;
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/**
 * Compact banner shown above the caption controls when a clip has been
 * auto-cleaned. States what was removed and lets the user flip the player
 * between the cleaned render and the original for comparison.
 */
export function ClipCleanBanner({ report, showingOriginal, onToggleOriginal }: ClipCleanBannerProps) {
  const summary = `Removed ${plural(report.fillerRemoved, 'filler word')}, trimmed ${plural(
    report.pausesTrimmed,
    'pause',
  )}, saved ${Math.round(report.secondsSaved)}s.`;

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 mt-0.5 text-primary-interactive shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Auto-cleaned</p>
          <p className="text-[12px] text-muted-foreground">{summary}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggleOriginal(!showingOriginal)}
        className="text-[12px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors shrink-0"
      >
        {showingOriginal ? 'Back to cleaned' : 'Compare to original'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test:unit -- src/components/content-kit/ClipCleanBanner.test.tsx`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add src/components/content-kit/ClipCleanBanner.tsx src/components/content-kit/ClipCleanBanner.test.tsx
git commit -m "feat(clips): add ClipCleanBanner with compare-to-original toggle"
```

---

### Task 3: Wire banner + source selector into ClipEditorModal

Wiring only. The logic lives in the two units tested in Tasks 1-2; this task connects them and is verified by typecheck plus the full unit suite. (A full render test of `ClipEditorModal` is intentionally omitted: it composes `VideoPlayer`, `CaptionStylePopover`, `VisualPostActions`, and `PostCaptionBlock` plus API calls, so a render test would be mock-heavy and brittle. The extracted units carry the behavior and their tests are the regression guard.)

**Files:**
- Modify: `src/components/content-kit/ClipEditorModal.tsx` (import at line 12; video-source block at lines 155-159; caption-controls anchor at line 409; state cluster near line 125)

**Interfaces:**
- Consumes: `selectClipVideoSrc` (Task 1), `ClipCleanBanner` (Task 2), `VideoClip.autoCleanApplied` / `cleanedUrl` / `cleanReport` (Task 1).
- Produces: no new exported surface.

- [ ] **Step 1: Add imports**

In `src/components/content-kit/ClipEditorModal.tsx`, find the existing import (line 12):

```typescript
import { api, type VideoClip } from '@/lib/api-client';
```

Add these two lines immediately after it:

```typescript
import { selectClipVideoSrc } from './clip-video-src';
import { ClipCleanBanner } from './ClipCleanBanner';
```

- [ ] **Step 2: Add the compare-to-original state**

Find the existing saving state (line 125):

```typescript
  const [saving, setSaving] = useState(false);
```

Add immediately after it:

```typescript
  // When auto-clean ran, the player shows the cleaned render by default;
  // this flips it to the original for comparison.
  const [showOriginal, setShowOriginal] = useState(false);
```

- [ ] **Step 3: Replace the video-source derivation with the selector**

Find the current derivation (lines 155-159):

```typescript
  // Determine video source based on view mode
  const hasSplitScreen = !!(clip as any).splitScreenUrl;
  const videoSrc = viewMode === 'split' && hasSplitScreen
    ? (clip as any).splitScreenUrl
    : clip.exports?.[0]?.url || '';
```

Replace it with:

```typescript
  // Determine video source: split view, then cleaned-vs-original (see selectClipVideoSrc).
  const cleanedAvailable = !!clip.autoCleanApplied && !!clip.cleanedUrl;
  const videoSrc = selectClipVideoSrc(clip, viewMode, showOriginal);
```

- [ ] **Step 4: Render the banner above the caption controls**

Find the caption-controls comment block (starts line 409):

```tsx
            {/* Caption Controls — only show when captions are not burned in.
                Style picker stays as a discrete pick. The 3-position enum is
                gone — drag the caption block on the video to position it
                anywhere. The "Reset" button restores the smart-default
                placement (face-aware bottom for portrait, etc). */}
```

Insert this block immediately BEFORE that comment:

```tsx
            {cleanedAvailable && clip.cleanReport && (
              <ClipCleanBanner
                report={clip.cleanReport}
                showingOriginal={showOriginal}
                onToggleOriginal={setShowOriginal}
              />
            )}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "\.next/" || echo "clean"`
Expected: `clean`.

- [ ] **Step 6: Run the full unit suite**

Run: `npm run test:unit`
Expected: all tests pass, including the Task 1 + Task 2 suites.

- [ ] **Step 7: Manual smoke (note for reviewer, not automated)**

With a backend that returns `autoCleanApplied: true`, open a clip in the editor: the "Auto-cleaned" banner appears above Caption Style; "Compare to original" swaps the player to `exports[0].url`; "Back to cleaned" swaps back. Clips without the field show no banner and behave exactly as before.

- [ ] **Step 8: Commit**

```bash
git add src/components/content-kit/ClipEditorModal.tsx
git commit -m "feat(clips): surface auto-clean banner + compare toggle in ClipEditorModal"
```

---

### Task 4: "Auto-clean my clips" settings toggle

Adds the user preference field and a toggle on the Settings → Preferences tab, mirroring the existing Email Notifications toggle and its `api.auth.updateProfile` persistence.

**Files:**
- Modify: `src/types/index.ts` (UserProfile lines 36-57; UserProfileUpdate lines 62-79)
- Modify: `src/app/app/settings/SettingsContent.tsx` (state near line 80; loadProfile seed near lines 133-135; handlePreferenceChange lines 226-250; toggle JSX after line 953)
- Test: `src/app/app/settings/SettingsContent.test.tsx`

**Interfaces:**
- Consumes: `api.auth.updateProfile(updates: Record<string, boolean | string>)` (existing), `api.auth.getProfile()` (existing).
- Produces: `UserProfile.auto_clean_clips?: boolean` and `UserProfileUpdate.auto_clean_clips?: boolean`.

- [ ] **Step 1: Add the preference field to both profile types**

In `src/types/index.ts`, find in `UserProfile` (around lines 48-49):

```typescript
  // Preferences
  email_notifications?: boolean;
  weekly_digest?: boolean;
  theme?: 'light' | 'dark' | 'auto';
```

Replace with:

```typescript
  // Preferences
  email_notifications?: boolean;
  weekly_digest?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  /** Opt-in to auto-removing filler words + long pauses from new clips. */
  auto_clean_clips?: boolean;
```

Then find in `UserProfileUpdate` (around lines 73-75):

```typescript
  // Preferences
  email_notifications?: boolean;
  weekly_digest?: boolean;
  theme?: 'light' | 'dark' | 'auto';
```

Replace with:

```typescript
  // Preferences
  email_notifications?: boolean;
  weekly_digest?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  auto_clean_clips?: boolean;
```

- [ ] **Step 2: Write the failing test**

Create `src/app/app/settings/SettingsContent.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Land directly on the Preferences tab so the toggle renders.
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (k: string) => (k === 'tab' ? 'preferences' : null) }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@example.com' } }),
}));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isFreeUser: false, tier: 'studio', subscription: null }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { resetPasswordForEmail: vi.fn() } },
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const profileFixture = {
  id: 'u1',
  email: 'test@example.com',
  subscription_tier: 'studio',
  credits_remaining: 100,
  email_notifications: true,
  weekly_digest: false,
  auto_clean_clips: true,
};

const updateProfile = vi.fn().mockResolvedValue({
  success: true,
  data: { ...profileFixture, auto_clean_clips: false },
});

vi.mock('@/lib/api-client', () => ({
  api: {
    auth: {
      getProfile: vi.fn().mockResolvedValue({ success: true, data: profileFixture }),
      updateProfile: (...a: unknown[]) => updateProfile(...a),
      uploadProfileImage: vi.fn(),
    },
    stripe: {
      getUsageLimits: vi.fn().mockResolvedValue({ success: true, data: {} }),
      getPortalUrl: vi.fn(),
    },
    account: {
      getDataSummary: vi.fn(),
      submitFeedback: vi.fn(),
      applyWinback: vi.fn(),
      cancelSubscription: vi.fn(),
      deleteAccount: vi.fn(),
    },
  },
}));

import SettingsContent from './SettingsContent';

describe('SettingsContent — Auto-clean preference', () => {
  beforeEach(() => updateProfile.mockClear());

  it('renders the toggle checked from profile and persists when toggled off', async () => {
    render(<SettingsContent />);
    const toggle = await screen.findByLabelText(/auto-clean my clips/i);
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    expect(updateProfile).toHaveBeenCalledWith({ auto_clean_clips: false });
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npm run test:unit -- src/app/app/settings/SettingsContent.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: /auto-clean my clips/i` (toggle not built yet).

- [ ] **Step 4: Add the state variable**

In `src/app/app/settings/SettingsContent.tsx`, find (line 80):

```typescript
  const [emailNotifications, setEmailNotifications] = useState(true);
```

Add immediately after it:

```typescript
  const [autoCleanClips, setAutoCleanClips] = useState(true);
```

- [ ] **Step 5: Seed the value on profile load**

Find (lines 133-135):

```typescript
        setEmailNotifications(response.data.email_notifications ?? true);
        setWeeklyDigest(response.data.weekly_digest ?? false);
        setTheme(response.data.theme ?? 'light');
```

Replace with:

```typescript
        setEmailNotifications(response.data.email_notifications ?? true);
        setWeeklyDigest(response.data.weekly_digest ?? false);
        setTheme(response.data.theme ?? 'light');
        setAutoCleanClips(response.data.auto_clean_clips ?? true);
```

- [ ] **Step 6: Extend handlePreferenceChange**

Find the signature (line 226):

```typescript
  const handlePreferenceChange = async (key: 'email_notifications' | 'weekly_digest' | 'theme', value: boolean | string) => {
```

Replace with:

```typescript
  const handlePreferenceChange = async (key: 'email_notifications' | 'weekly_digest' | 'theme' | 'auto_clean_clips', value: boolean | string) => {
```

Then find the local-state update branch (lines 235-241):

```typescript
        if (key === 'email_notifications') {
          setEmailNotifications(value as boolean);
        } else if (key === 'weekly_digest') {
          setWeeklyDigest(value as boolean);
        } else if (key === 'theme') {
          setTheme(value as 'light' | 'dark' | 'auto');
        }
```

Replace with:

```typescript
        if (key === 'email_notifications') {
          setEmailNotifications(value as boolean);
        } else if (key === 'weekly_digest') {
          setWeeklyDigest(value as boolean);
        } else if (key === 'theme') {
          setTheme(value as 'light' | 'dark' | 'auto');
        } else if (key === 'auto_clean_clips') {
          setAutoCleanClips(value as boolean);
        }
```

- [ ] **Step 7: Add the toggle JSX**

Find the end of the Email Notifications block and the start of Weekly Summary (the `{/* Weekly Summary */}` comment, around line 955):

```tsx
            </div>

            {/* Weekly Summary */}
```

Replace with (inserts the new toggle between Email Notifications and Weekly Summary):

```tsx
            </div>

            {/* Auto-clean clips */}
            <div>
              <label className="flex items-center justify-between p-4 border-2 border-border rounded-lg hover:border-accent transition-colors cursor-pointer">
                <div>
                  <p className="text-body font-medium">Auto-clean my clips</p>
                  <p className="text-small text-text-secondary">
                    Automatically remove filler words and long pauses from new clips
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-accent"
                  checked={autoCleanClips}
                  onChange={(e) => handlePreferenceChange('auto_clean_clips', e.target.checked)}
                />
              </label>
            </div>

            {/* Weekly Summary */}
```

- [ ] **Step 8: Run the test, verify it passes**

Run: `npm run test:unit -- src/app/app/settings/SettingsContent.test.tsx`
Expected: PASS (1 passed). If the render fails on an unmocked dependency, add it to the `vi.mock('@/lib/api-client', ...)` block — do not change the assertion.

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "\.next/" || echo "clean"`
Expected: `clean`.

- [ ] **Step 10: Commit**

```bash
git add src/types/index.ts src/app/app/settings/SettingsContent.tsx src/app/app/settings/SettingsContent.test.tsx
git commit -m "feat(settings): add Auto-clean my clips preference toggle"
```

---

## Self-Review

**Spec coverage (against `2026-06-18-clip-auto-clean-and-descript-scope-design.md` §4.5 frontend slice):**
- "extend VideoClip with cleanedUrl/autoCleanApplied/cleanReport" → Task 1, Step 1. ✓
- "surface the cleanReport ... in ClipEditorModal" → Task 2 (banner) + Task 3 (wiring). ✓
- "Restore original / Re-clean control" → reframed to a non-destructive compare-to-original VIEW toggle (Tasks 2-3). **Re-clean is intentionally deferred**: it requires a backend reprocess endpoint that does not exist in Phase 1, so a button would be dead. Noted here as the one scope reduction. ✓ (with deviation flagged)
- "Auto-clean my clips settings toggle (default ON)" → Task 4; `?? true` makes it default-on. ✓
- Backend (filler/silence cut, cleanReport contract) → out of scope, per plan header. ✓

**Placeholder scan:** No TBD/TODO. All steps contain full code or exact commands.

**Type consistency:** `CleanReport` defined once in `api-client.ts` (Task 1) and consumed by `VideoClip.cleanReport`, `clip-video-src.ts`, and `ClipCleanBanner` (imported, not re-declared). `selectClipVideoSrc(clip, viewMode, showOriginal)` signature is identical across Task 1 (definition), its test, and Task 3 (call site). `auto_clean_clips` spelled identically in types, seed, handler union, toggle, and test. `handlePreferenceChange` key union extended consistently. ✓

**Open decision deferred to execution:** the spec's open decision #2 (include `like`/`you know` as filler) and #3 (pause thresholds) are backend concerns and do not affect this frontend plan.
