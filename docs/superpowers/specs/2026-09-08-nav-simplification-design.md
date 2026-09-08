# Nav Simplification — Design

**Date:** 2026-09-08
**Repo:** echome-frontend (zero backend changes)
**Status:** approved by founder 2026-09-08

## Goal

Cut the authenticated sidebar from 13 items to 4. Nothing is deleted. Every
demoted destination keeps its route and gains an entry point somewhere that
already makes sense.

## Why now

`/app` is already the single ingestion point. The composer accepts text,
links, documents, `.mbox`, audio, and video; `KBUnifiedInput` is described in
its own callers as retired and survives only as the read view on `/app/voice`.

The second half of that decision was parked at the time:

> Side-menu trim DEFERRED until new Create page proves as main ingestion point.

It proved. The composer got unified; the chrome around it never did. `/app/voice`
still sits in the nav as a co-equal destination, which is what makes the product
feel two-doored when only one door is load-bearing.

## Precedent

This is not a new pattern. `/app/reels` was already folded into `/app/library`
as a `?tab=reels` tab, documented in `LibraryTabs.tsx`:

> Tier 3 Phase 2 (audit §5.2 cont'd): folds /app/reels list into /app/library
> as a tab. The reel editor at /reels/[id] is unchanged.

`VoiceTabs.tsx` uses the same shape. This design applies it twice more.

## Live sidebar as of 2026-09-08 (prod, `www.tryechome.com`)

Six headed groups plus a VoiceSwitcher card and a footer:

- Active Voice: `VoiceSwitcher` card
- Create: Create, Your Library, Reel Maker (admin)
- Your Voice: Your Voice (strength meter icon), Team Voices, Toolkit
- Discover: Guides, Creator Radar, Calendar, Community
- Tools: Video Compressor (FREE), YouTube Transcript (FREE)
- Account: Billing, Developers, Settings
- Admin: Dashboard, Drafts Analytics
- Footer: avatar, name, email, Logout

The sidebar scrolls on a 772px-tall viewport; Calendar is the first item cut
off. Mobile drawer mirrors this exactly. The Your Voice item carries a live
voice-strength icon; that signal already lives on `/app` in
`VoiceStrengthStrip`, so nothing is lost when the item goes.

## Target nav

One group, no group headers, four items:

| id | label | path |
|---|---|---|
| `create` | Create | `/app` |
| `library` | Library | `/app/library` |
| `calendar` | Calendar | `/app/calendar` |
| `settings` | Settings | `/app/settings` |

`ADMIN_NAV_GROUP` is unchanged and still appended for admins.

## Where each demoted item goes

| Item | Route (unchanged) | New entry point |
|---|---|---|
| Your Voice | `/app/voice` | Already linked from `VoiceStrengthStrip.tsx:87` on `/app`. No new wiring. |
| Toolkit | `/app/toolkit` | Library tab `?tab=toolkit` |
| Creator Radar | `/app/radar` | Library tab `?tab=radar` |
| Billing | `/app/billing` | Settings already has a Billing tab (`?tab=billing`); add a plain link to the full page there |
| Developers | `/app/developers` | Link from Settings |
| Guides | `/guides` | Account menu (external) |
| Community | `/community` | Account menu (external) |
| Video Compressor | `/tools/compress-video` | Account menu (external, keeps FREE badge) |
| YouTube Transcript | `/tools/transcribe` | Account menu (external, keeps FREE badge) |
| Team Voices | `/app/voice?tab=team` | Already reachable from `VoiceSwitcher` in the sidebar. Unchanged. |
| Reel Maker | `/app/library?tab=reels` | Already a Library tab. Unchanged. |

Toolkit renders `CreatorLibraryContent` and Radar renders `FollowingContent`.
Both are browse-and-collect surfaces, the same job Library does, which is why
they fold there rather than into Settings.

Both components render their own page `<h1>` and description under the tab
bar. That matches the existing Library tabs: `ContentKitContent` renders
"Your Library" and `ReelsContent` renders "Reel Maker" the same way. Keep
the headers; do not add an `embedded` prop. Toolkit's inner B-Roll / Caption
Templates / Reel Scripts switcher is local `useState`, not `?tab=`, so it does
not collide with the Library tab param. Radar has no inner tabs.

Settings **links out** to Billing and Developers rather than absorbing them.
`SettingsContent.tsx` is 54KB; growing it further is the wrong trade when a
link costs nothing and leaves both routes untouched.

Live check 2026-09-08: Settings already renders a Billing tab (usage meter,
"Upgrade to Pro" that hard-navigates to `/app/billing` for free users, "Open
Billing Portal"). Paid users currently have no path from that tab to
`/app/billing`. Add one plain link ("View plans") inside the Billing tab that
shows for every tier, plus a Developers link in the Account tab. Nothing else
in Settings changes.

## Account menu placement

Live check 2026-09-08. Desktop sidebar footer already holds avatar, name,
email, and a Logout link. Mobile drawer footer holds the same plus a full-width
Logout button. `AccountMenu` replaces that footer block in both: clicking the
avatar row opens a popover with Guides, Community, Video Compressor (FREE),
YouTube Transcript (FREE), and Logout. The mobile header avatar (top right)
is decorative today and stays untouched.

The product tour (`src/components/tour/tours/echo-hero.tsx`, "Replay tour"
pill bottom-left) targets only `data-tour` attributes inside `EchoHero` and
`VoiceStrengthStrip`. No tour step targets a sidebar item, so the nav cut
does not break it. Verified by grep of every `data-tour=` in `src/`.

## Two defects this work must fix

Both are pre-existing and both become load-bearing once more items move behind
`?tab=`.

### 1. `activeItem` cannot match a query string

`useAppNavigation.ts` computes the active item as:

```ts
return pathname.startsWith(item.path);
```

`pathname` never contains a query string, so an item whose `path` is
`/app/library?tab=reels` can never match. The Reel Maker nav item has never
highlighted. Fix: split the shape into a `path` used for matching and an
optional `query` used only for navigation.

```ts
export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;          // pathname only, used for active matching
  query?: string;        // e.g. 'tab=reels', appended on navigate
  comingSoon?: boolean;
  teamsOnly?: boolean;
  adminOnly?: boolean;
  external?: boolean;
  badge?: string;
}
```

### 2. Demoted routes would wrongly highlight Create

`activeItem` falls back to `'create'` when nothing matches. Once `/app/voice`,
`/app/toolkit`, `/app/radar`, `/app/billing`, and `/app/developers` leave
`NAV_GROUPS`, visiting any of them highlights Create, which is worse than
highlighting nothing.

Fix: introduce an explicit ownership map from demoted pathname to the nav item
that owns it, and fall back to no active item rather than to `create`.

```ts
const DEMOTED_OWNER: Record<string, string> = {
  '/app/voice': 'create',
  '/app/toolkit': 'library',
  '/app/radar': 'library',
  '/app/billing': 'settings',
  '/app/developers': 'settings',
};
```

`/app/voice` maps to `create` deliberately: its only entry point is the voice
strip on `/app`, so Create is genuinely where the user came from.

## Also in scope

`sidebar.tsx:12` and `mobile-sidebar.tsx:13` both declare:

```ts
const HINT_ITEMS = new Set(['knowledge', 'content-kit']);
```

Neither id exists in `NAV_GROUPS` — the real ids are `voice` and `library`. The
first-time sidebar hint system has been firing on nothing since the ids were
renamed. **Delete it** from both sidebars, along with the `useFirstTimeUser`
wiring that only serves it. Founder ruling: first-run hints on a four-item nav
buy nothing.

Verified 2026-09-08: `sidebarHintsSeen` / `markSidebarHintSeen` are consumed
only by the two sidebars. Remove them from `useFirstTimeUser` too. Keep the
hook itself and `isFirstTime` if any other caller remains; check at
implementation time.

## Out of scope

- Deleting any route, page, or content component.
- Backend changes of any kind.
- Mobile app (`echome-mobile`) — it has its own navigation.
- Changing what `/app` itself renders. The composer is already correct.

## Files

| File | Change |
|---|---|
| `src/hooks/useAppNavigation.ts` | Cut `NAV_GROUPS` to one 4-item group; add `query` to `NavItem`; add `DEMOTED_OWNER`; fix active matching and fallback |
| `src/components/sidebar.tsx` | Drop group headers; delete `HINT_ITEMS` + hint wiring; add account menu in footer |
| `src/components/mobile-sidebar.tsx` | Same nav shape; delete `HINT_ITEMS` + hint wiring; account menu |
| `src/hooks/useFirstTimeUser.ts` | Drop `sidebarHintsSeen` / `markSidebarHintSeen` (no remaining callers) |
| `src/components/AccountMenu.tsx` | Create: the four external links plus logout |
| `src/app/app/library/LibraryTabs.tsx` | Add `toolkit` and `radar` tabs |
| `src/app/app/settings/SettingsContent.tsx` | Billing tab: add "View plans" link to `/app/billing` for all tiers; Account tab: add Developers link to `/app/developers` |

## Testing

Existing tests that already pin behavior and must stay green:
`AppContent.resting.test.tsx`, `VoiceStrengthStrip.test.tsx` (pins the
`/app/voice` href), `SettingsContent.test.tsx`.

New tests:

1. Nav renders exactly 4 items for a paid non-admin.
2. Admin additionally gets `ADMIN_NAV_GROUP`.
3. A Teams user still reaches Team Voices via `VoiceSwitcher`.
4. `activeItem` is `library` on `/app/toolkit` and `/app/radar`.
5. `activeItem` is `settings` on `/app/billing` and `/app/developers`.
6. `activeItem` is `create` on `/app/voice`.
7. `activeItem` is `library` on `/app/library?tab=reels` for an admin — the
   defect fixed above.
8. Each demoted route still resolves and renders its content component.
9. Library `?tab=toolkit` renders `CreatorLibraryContent`; `?tab=radar`
   renders `FollowingContent`.
10. Settings Billing tab shows a link to `/app/billing` for a paid user;
    Account tab shows a link to `/app/developers`.
11. `AccountMenu` renders the four external links and calls logout.

## Risks

- **Deep links.** Emails and in-app links pointing at `/app/toolkit` or
  `/app/radar` keep working because the routes stay. Verified 2026-09-08:
  backend email templates reference these routes 18 times; none change shape.
- **Muscle memory.** Existing users lose items from a place they know. Mitigated
  by keeping every route alive; a user who bookmarked one is unaffected.
- **`useFirstTimeUser` coupling.** Removing `HINT_ITEMS` may strand hook members;
  see the check noted above.
