# Guided-tour system — design spec

*Drafted 2026-05-23 · Source: feature-discovery audit + brainstorm session.*

---

## 1. Context

A scoped feature-discovery audit ([prior session, 2026-05-23](../../../docs/2026-04-30-onboarding-flow-map.md)) found that EchoMe's high-value features (teleprompter, clip editing, carousel editing, auto-posting) are systematically underused because their discoverability is poor: cards look like finished assets rather than editing canvases, empty states say "No content available" instead of teaching, and powerful affordances (drag handles, slide reorder, transcript-seek) are styled at opacity-40 or only appear mid-interaction.

The audit produced a P1 recommendation for coach marks on the clip and carousel editors and a P2 recommendation for a dashboard "Get started" checklist. This spec covers both, plus the highest-impact empty-state upgrade.

Sister-app **closr** already ships a production guided-tour system (`react-joyride` + `User.preferences.toursSeen` JSONB). This spec lifts that pattern with three deliberate EchoMe-specific additions: a mobile bottom-sheet variant, a Get Started checklist, and one empty-state rewrite.

## 2. Goals

- Surface the clip editor's drag/resize/transcript-seek affordances on first open.
- Surface the carousel editor's text edit / photo swap / slide management affordances on first open.
- Give new users a 4-step activation path on the dashboard until they've connected a social account, generated a kit, scheduled a post, and recorded on the teleprompter.
- Replace the empty-state on kit detail with content that teaches what each section produces and surfaces the teleprompter as an alternative path.
- Match the visual chrome of existing patterns (`OutcomeChips`, `SuggestedScheduleModal`, `CarouselEditorModal`) so additions feel native, not bolted-on.

## 3. Non-goals (deliberately out of scope)

- A generic "tour engine" framework for non-engineers to author tours. Engineers add tours in code, period.
- Coach marks for reels (the reels page is flagged for overhaul in `project_outstand_scheduling_live` and related memory — no point onboarding to a UI that's about to change).
- A teleprompter tour. The teleprompter's in-modal instructions are adequate; the gap is upstream awareness, fixed via the checklist + empty-state changes.
- Library / calendar / KB / voice empty-state rewrites. Worth doing eventually but each adds scope. v1 ships one empty state.
- A celebration UI when the checklist completes. Matches the founder's "low UI" tenet — card just animates out.

## 4. Architecture

Three sub-systems sharing one persistence backbone (`users.preferences.toursSeen`).

```
              users.preferences JSONB
       (new column on echome-platform-v2)
                    ▲
        PATCH /api/profile (extended)
                    │
   ┌────────────────┼────────────────┐
   │                │                │
   ▼                ▼                ▼
FeatureTour    GetStarted-       EmptyState
(desktop +     Checklist         upgrade
 mobile)       (dashboard)       (kit detail)
```

All three read from `user.preferences.toursSeen: string[]` via a shared hook `useTourState()`. The hook centralises the persistence path — if we ever swap from JSONB to a dedicated table, only the hook changes.

### 4.1 File layout

```
src/
├─ components/
│  ├─ tour/
│  │  ├─ FeatureTour.tsx          # lifted from closr, EchoMe-themed
│  │  ├─ MobileTourSheet.tsx      # new, bottom-sheet variant
│  │  └─ tours/
│  │     ├─ clip-editor.tsx       # steps + <ClipEditorTour /> wrapper
│  │     └─ carousel-editor.tsx   # steps + <CarouselEditorTour /> wrapper
│  └─ dashboard/
│     └─ GetStartedChecklist.tsx  # new
└─ hooks/
   ├─ useTourState.ts             # shared hasSeen / markSeen
   └─ useTourViewport.ts          # 'desktop' | 'mobile' from matchMedia
```

```
echome-platform-v2/
├─ supabase/migrations/
│  └─ <date>_users_preferences_jsonb.sql   # new
└─ src/routes/auth.ts                      # extend GET /me + PATCH /profile
```

## 5. Coach mark system

### 5.1 `FeatureTour` (desktop)

Lifted near-verbatim from `closr/src/components/tour/feature-tour.tsx` (≈150 LOC). Three EchoMe-specific edits:

1. CSS variables in the `styles` override map to EchoMe tokens (`--accent`, `--surface-low`, `--border`).
2. The `useUser` import points at EchoMe's `useAuth` (or equivalent — verify during implementation).
3. The component mounts inside the editor modals (`CarouselEditorModal`, `ClipEditorModal`), not at the page level. Tour anchors are guaranteed to be in the DOM at mount.

Library: `react-joyride@^2.9.3` (closr's pinned version). Dynamically imported with `ssr: false` to keep it out of the SSR bundle.

Trigger: on mount, after a 500ms delay, fire if `!hasSeen(tourId) || forceShow`. The delay gives the modal's layout and animations time to settle before Joyride locks onto its anchor.

Persistence: on tour `finished | skipped | close`, call `markSeen(tourId)` which PATCHes `/api/profile` with `{ preferences: { toursSeen: [...existing, tourId] } }` and refetches user context.

### 5.2 `MobileTourSheet` (mobile)

New component, ~80 LOC. Renders the same `Step[]` array as the desktop tour but as a bottom sheet on viewports `< 768px`.

Visual shape (per `mobile-tour-sheet.html` mockup in brainstorm session):
- Position: `fixed inset-x-0 bottom-0`, max height 45vh.
- Backdrop dims the upper content at 35% opacity (matches Joyride's spotlight feel).
- Grabber at top + tap-outside both call `onSkip` (marks all steps seen at once, per the "no nag" anti-pattern).
- Step-to-step transition: opacity + transform CSS transition, ~150ms.
- Animation library: none — Tailwind transitions + a `useState` step counter.

The sheet does NOT use anchor positioning — it's modal, sitting over the editor. Content cards are dimmed visually so the user knows the editor is "paused" behind the sheet.

### 5.3 Breakpoint switch

Single hook `useTourViewport()` returns `'desktop' | 'mobile'` based on `window.matchMedia('(min-width: 768px)')` with a SSR-safe default of `'desktop'`. `FeatureTour` reads this and renders either the Joyride path or the `MobileTourSheet`. Same `tourId`, same persistence — a user who starts on mobile and revisits on desktop won't re-see the tour.

### 5.4 Anchor convention

`data-tour="<scope>-<id>"` attributes on target DOM nodes. Example: `data-tour="clip-editor-caption"` on the caption overlay. Mobile sheet ignores anchors; desktop Joyride uses them to position the spotlight.

### 5.5 Replay UX

Floating "?" pill, bottom-right on mobile (per mockup), bottom-left on desktop. Click → `forceShow={true}` → tour re-runs without writing to `toursSeen` again. Same pattern as closr's `NewChatTourHelpButton`.

### 5.6 Versioning convention

Tour IDs include a version suffix: `clip-editor-v1`, `carousel-editor-v1`. Bump to `-v2` when an affordance changes meaningfully (e.g., resize handle moves, new keyboard shortcut added). All users who saw v1 will see v2 once.

## 6. Get Started checklist

### 6.1 Placement

Top of `/app` dashboard, between the welcome line / hero input and the existing `OutcomeChips` section. Hides when complete OR when dismissed.

### 6.2 Items (v1) — exactly 4

| # | Item | Server-side completion check | CTA |
|---|---|---|---|
| 1 | Generate your first content kit | `content_kits` count > 0 | Scrolls to hero input |
| 2 | Connect a social account | `user_social_accounts` count > 0 | `/app/settings?tab=connections` |
| 3 | Schedule your first post | `scheduled_posts` count > 0 | Locked until items 1 + 2 done; then links to most recent kit |
| 4 | Record yourself on the teleprompter | KB entries with `metadata.source = 'teleprompter'` count > 0 | Inline italic helper text "Open any kit's Video Script tab" — no CTA button, since it requires a kit to exist first |

All four completion checks are derivable server-side with a single SQL query. No client-side instrumentation needed.

### 6.3 Backend endpoint

New: `GET /api/me/setup-progress` returns `{ generatedFirstKit: bool, connectedSocial: bool, scheduledFirstPost: bool, recordedTeleprompter: bool }`. Cached on user-context for the session (one fetch per page load).

If the response is all-true AND the user has never seen the checklist, mark `get-started-checklist-v1` as seen silently (server-side) and don't include the data — the dashboard skips rendering.

### 6.4 Visual chassis

Matches `OutcomeChips` chrome: same card background, same border radius, same hover affordances. See `checklist.html` mockup from brainstorm session for layout.

Progress bar at the top, "Dismiss" text link top-right, items listed with: filled accent circle for done (strikethrough), accent-bordered left edge for the next actionable item, plain border for pending. Items with hard prerequisites show "Locked until you ___" instead of a CTA.

### 6.5 Dismiss + auto-mark-seen

"Dismiss" link writes `get-started-checklist-v1` to `toursSeen` and unmounts the card. No "are you sure?" confirmation.

When the server-side check returns all-4-true, the card animates out and writes `toursSeen` automatically. No celebration UI.

Once in `toursSeen`, never shown again. If the user later disconnects a social account, the checklist does not reappear.

## 7. Empty-state upgrade (kit detail)

Replace the current `ContentKitDetailContent` empty state (currently a single "No content available" message at line ~691–704) with four labeled cards explaining what each section produces.

### 7.1 The four cards

| Section | Card copy |
|---|---|
| Clips | "30–90 sec moments auto-found in your video. Edit captions, fix typos, drag them around. Appears after your video finishes processing." |
| Carousel | "10 swipeable slides for Instagram. Reorder, edit text, swap photos. Appears within ~60s of generation." |
| Reels | "Stitched-together highlights set to music. Appears once clips are ready." |
| Teleprompter | "Want to record on camera instead? Open any Video Script tab and read it back while we record." |

### 7.2 Visual treatment

Each card uses the same chrome as `OutputCard` but with reduced opacity (~70%) and a "Coming when ready" or "Try this instead" label in place of the action button. No spinners, no fake progress.

The teleprompter card is the discoverability lever — it links to the Video Script tab of the user's most recent kit (or `/app/create` if they have none). This is the only place in v1 that surfaces the teleprompter as an alternative path.

### 7.3 No persistence, no tour

Pure static render based on the same condition that fires today: `kit.clips.length === 0 && kit.carousel === null && ...`. No additions to `toursSeen`, no tracking.

## 8. Persistence + migration

### 8.1 Migration

```sql
-- echome-platform-v2/supabase/migrations/<date>_users_preferences_jsonb.sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.users.preferences IS
  'Arbitrary user-scoped JSON preferences. Reserved keys: toursSeen (string[]), setupChecklistDismissed (bool).';
```

No index — `toursSeen` is only read via the user row itself, never queried across users.

RLS: per memory `feedback_rls_disabled.md`, `users` table writes go through service-role; no policy change needed.

Backfill: `DEFAULT '{}'` covers all existing rows.

### 8.2 Backend route changes

`GET /api/auth/me` (also mounted at `/api/me`): extend response to include `preferences: user.preferences`.

`PATCH /api/profile` (existing route): accept an optional `preferences` partial object. Merge with existing via `Object.assign`, write back. Closr's reference shape at `closr/src/app/api/me/route.ts:83–110`.

### 8.3 Frontend hook

```ts
// src/hooks/useTourState.ts
export function useTourState() {
  const { user, refetch } = useAuth();
  const toursSeen: string[] = user?.preferences?.toursSeen ?? [];
  const hasSeen = (id: string) => toursSeen.includes(id);
  const markSeen = async (id: string) => {
    if (toursSeen.includes(id)) return;
    try {
      await api.profile.updatePreferences({ toursSeen: [...toursSeen, id] });
      await refetch();
    } catch {
      // Tombstone in localStorage so the same tab doesn't re-fire mid-session
      // if the PATCH failed (Outstand-class network blips happen in field).
      const local = JSON.parse(localStorage.getItem('toursSeenFallback') || '[]');
      localStorage.setItem('toursSeenFallback', JSON.stringify([...local, id]));
    }
  };
  return { hasSeen, markSeen };
}
```

The `hasSeen` check should also consult the localStorage fallback for the current session.

## 9. Tour content

### 9.1 Clip editor — `tourId: clip-editor-v1`

| # | Anchor (`data-tour=`) | Title | Body |
|---|---|---|---|
| 1 | `clip-editor-caption` | Drag the caption to move it | Captions are auto-positioned at the bottom, but you can drag them anywhere on the video. |
| 2 | `clip-editor-resize` | Resize from the corner handle | Drag the small square at the caption's bottom-right corner to scale font and padding together. |
| 3 | `clip-editor-transcript` | Click a transcript line to jump | Tap any line in the transcript and the preview seeks to that moment. Useful for fast review. |

Trigger: mounts inside `ClipEditorModal`; fires 500ms after modal open if `!hasSeen('clip-editor-v1')`.

### 9.2 Carousel editor — `tourId: carousel-editor-v1`

| # | Anchor (`data-tour=`) | Title | Body |
|---|---|---|---|
| 1 | `carousel-editor-text` | Edit any slide's text here | Cover, body, CTA — each field is editable. Changes save automatically and re-render the preview. |
| 2 | `carousel-editor-photo` | Swap the photo on cover / last slides | Tap "Change photo" to upload your own image or pick from a curated set. Body slides keep the template look. |
| 3 | `carousel-editor-filmstrip` | Reorder, add, or remove slides | Drag any thumbnail to reorder. Click `+` to insert a slide. Hover and tap `✕` to delete. |

Trigger: mounts inside `CarouselEditorModal`; same 500ms delay.

All step bodies are ≤25 words per closr's release policy quoted in `closr/src/components/tour/feature-tour.tsx:22`.

## 10. Implementation order

Three independent shippable chunks. Recommended order maximises learning per ship.

1. **Persistence + hook** (~half day). Migration, route changes, `useTourState`, GET-includes-preferences. No user-visible change yet but unblocks everything else.
2. **Empty-state upgrade** (~half day). Static-copy edit to `ContentKitDetailContent`. No tour code, no persistence. Highest impact per LOC; ships independently.
3. **`FeatureTour` + clip-editor tour + carousel-editor tour** (~1.5 days). Lift closr's `FeatureTour`, theme it, build `MobileTourSheet`, wire two tours with `data-tour` anchors and 3 steps each.
4. **`GetStartedChecklist` + `/setup-progress` endpoint** (~1 day). Backend SQL + frontend card + dismiss/auto-mark-seen logic.

Total: ~3.5 days engineering, plus QA. Each step ships as its own PR on `develop` per the release policy.

## 11. Open questions

None at write time. All decisions resolved in the brainstorm session:
- Library: react-joyride (matched closr).
- Persistence: `users.preferences.toursSeen` JSONB (matched closr).
- Trigger: mount-on-modal-open + 500ms delay (matched closr).
- Mobile: bottom-sheet variant with shared step content.
- Empty-state scope: kit-detail only for v1.
- Checklist items: 4 (server-derivable, no instrumentation).

## 12. Risks

- **Joyride anchor race.** If the editor's animation isn't done when Joyride locks on, the spotlight can target an off-screen element. 500ms delay matches closr's empirical fix; if it proves insufficient, bump to 800ms.
- **`preferences` schema drift between FE and BE.** No shared schema today. Mitigation: TypeScript interface defined in one place (`src/hooks/useTourState.ts`) and re-used by `api-client.ts`. Backend remains permissive (accept any JSON for `preferences.toursSeen` as long as it's `string[]`).
- **Localstorage tombstone divergence.** A user could see a tour, get a failed PATCH, then move to a different browser/device where the tombstone doesn't exist, and re-see the tour. Acceptable: low-frequency, low-harm. The tour is short and skippable.
- **Mobile sheet on landscape phones.** 45vh on a landscape phone is most of the screen. If field reports show this, switch to fixed 320px height with internal scroll. Defer to post-ship if it surfaces.

## 13. Success criteria

Post-ship, measure (no formal A/B):
- % of new users completing all 4 checklist items within 7 days.
- % of users who open the clip editor and subsequently use the resize handle within the same session.
- % of users who open the carousel editor and subsequently swap a photo or reorder a slide.

Numbers don't gate the ship; they inform whether to iterate (e.g., reword a tour step, change an anchor).
