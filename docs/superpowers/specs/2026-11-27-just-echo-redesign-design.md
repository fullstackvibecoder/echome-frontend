# Just Echo: EchoMe Web App Redesign

**Date:** 2026-11-27
**Status:** Design, awaiting founder approval. No build until approved.
**Scope:** The authenticated web app (`/app/*`) plus the Echo backend it needs. Marketing site, mobile app and admin pages are out of scope (see Non-goals).
**Approved mockup:** `assets/2026-11-27-just-echo/just-echo-v4.html` (open in a browser; three screens: Home dark, Home light, Making something). This file is the visual source of truth.
**Supersedes in part:** `2026-06-10-platform-redesign-echo-copilot-design.md` (pill placement, "outputs never in chat", cyan-only look). Its intake-unification goal stands and is completed here.

---

## 1. Intent

The founder's brief (11-19): redesign the platform "along the same lines as our Closr work": low UI, feature rich, "very sexy and styled", a clear dark/light toggle that defaults to the system setting, and designed progress states for every long-running job instead of bare spinners.

Brainstorm on 11-27 found the structure is mostly right already (one create input is the source of truth; the knowledge base updates itself). The real problems are:

1. **The UI looks dated and cluttered.**
2. **Good pieces that don't connect.** There are three chat surfaces today: the Home box (`EchoHero`), a floating pill (`EchoPill`, same `useEcho` brain, but users don't know it exists), and a separate Help widget (`HelpWidget`, its own AI and FAQ). Plus an orphaned `AskYourVoice.tsx` nothing imports.

People come to the app to do three things: **make content, schedule or post what's ready, and teach Echo something new.** The redesign is built around those three jobs instead of around pages.

## 2. The concept: the conversation is the app

One Echo, everywhere. No page navigation. The app is a conversation with Echo; when there's something to look at (a kit, clips, a carousel, the calendar), it opens in a **panel** beside the conversation and closes when done, the way Claude opens an artifact.

This keeps the lesson from the March chat-as-KB failure and the June spec: **outputs are spatial, not chat bubbles.** Generated content lives in the panel. The thread only holds short replies, progress, and a compact row per thing made, which reopens it in the panel.

### Layout (desktop), three columns

| Column | Contents |
|---|---|
| **Left, ~208px: Conversations** | Logo, "New" button with search, list of conversations (each with a small thumbnail of what it made, a pulsing dot if a job is running), avatar and theme switch at the bottom. |
| **Center: the stage** | On a new conversation: two-line greeting, the Echo box (largest, brightest element, glow ring), three picture suggestion tiles. In a conversation: thread above, Echo box docked at the bottom. |
| **Right, ~392px: context side** | **Default (nothing open):** This week (7 post thumbnails with platform badges, posted faded with a tick, open days dashed "+", today highlighted, a 4/7 covered meter), Next up (one row), Ready (strip of clip thumbnails with durations plus a "N posts left" kit tile), and the knowledge counter (count of things Echo knows, small growth sparkline, "+N today"). **When something is open:** that thing (clips, kit, carousel editor, full calendar), with a close button that returns to the default. |

### Phones (web)
Single column: the conversation. The context side becomes a full-screen sheet over the conversation; the default "week" view is reachable from a header button. Conversation list is a slide-over. *(Builder's call on the exact affordances; the mockup has no phone screens.)*

### What happens to today's pages

| Today | In Just Echo |
|---|---|
| Create (`/app`) | The stage. |
| Library (`/app/library`, tabs incl. Radar, Toolkit) | Gone as a page. "Show me…" asks to Echo open lists in the panel; Cmd+K search finds any kit, clip or conversation. Radar picks surface as suggestion tiles and on request. |
| Library item (`/app/library/[id]`), clips, carousel editor, reel editor | Re-hosted in the panel. Restyled, not rewritten. |
| Calendar (`/app/calendar`) | Default side shows this week; "open the calendar" or clicking the week opens the full calendar in the panel. |
| Voice (`/app/voice`) | Opens in the panel on request ("show me what you know about me", or clicking the knowledge counter). |
| Settings, Billing, Developers, Profile | Behind the avatar. Remain ordinary pages, restyled. |
| Admin (`/app/admin/*`) | Unchanged structurally (founder-only); picks up the new tokens for free. |
| EchoPill, HelpWidget, sidebar, mobile sidebar, `AskYourVoice.tsx` | Removed in the last phase. Help questions go to Echo (its `search_help` tool already exists). |

Old URLs must keep working through the transition (emails, guides and the MCP connector deep-link to them). After cutover each old URL redirects to the conversation with the matching panel open (e.g. `/app/library/[id]` → stage with that kit in the panel).

## 3. Decisions made with the founder (11-27)

| Decision | Choice |
|---|---|
| Structure | Concept 1 "Just Echo": the conversation is the app; panel for anything to look at. (Rejected: "Your week" as Home; "Ready to go" approval stack.) |
| Echo outside Home | Moot: there is no outside. One Echo, one box. |
| Help widget | Removed. Help goes through Echo. |
| Conversation memory | **Separate conversations with a history list** (like Claude), not one endless thread. |
| Visual direction | **B, "Studio glass"**: cool neutrals, Satoshi bold display, frosted surfaces, one cyan→violet gradient. |
| Density | v4 mockup: keep the information, show it as pictures, numbers and badges instead of sentences. v2 (all rows and labels) was too wordy; v3 (box only) was too barren. |
| Build approach | **A: new app behind a switch, in phases**, shipped on the normal Thursday train; old pages keep working until replaced. |

## 4. Design system

Taken from the approved mockup. Tokens replace today's `globals.css` palette (Electric Cyan + purple/pink/yellow accents are retired).

**Colour**

| Token | Dark | Light |
|---|---|---|
| canvas | `#08090D` with two soft radial glows (violet top-center, cyan top-left) | `#F4F5F8` with the same glows at lower opacity |
| gradient (g1 → g2) | `#22D3EE` → `#A78BFA` | `#06B6D4` → `#8B5CF6` |
| ink / ink-2 / muted | `#F2F3F7` / `#C3C6D1` / `#7D8294` | `#0F1117` / `#363A48` / `#7B8091` |
| item (row/tile fill) | `rgba(255,255,255,.04)` | `rgba(15,17,23,.03)` |
| hairline | `rgba(255,255,255,.07)` | `rgba(15,17,23,.08)` |
| accent text | `#C4B5FD` | `#6D28D9` |
| tint (selected, today) | `rgba(167,139,250,.14)` | `rgba(124,58,237,.08)` |
| success | `#4ADE80` | `#16A34A` |

**The gradient is a scalpel, not a spray.** Allowed on: the Echo box ring and glow, the send button, primary buttons, progress fills and the scan line, the greeting's second line, the logo, big stat numbers. Nowhere else. All text meets WCAG AA against its surface in both themes (gradient text only at display sizes).

**Type:** Satoshi only (already loaded). Display 36/900, tight tracking (-0.04em). Title 15–17/700. Body 13–14/400–500. Small labels 12/700 muted. Machine details (durations, counts, timestamps) in **DM Mono** 10–11 (replaces JetBrains Mono, so it has to be added to `lib/fonts`; or keep JetBrains Mono: builder's call, visual weight is what matters). Drop Manrope, Montserrat, Inter and Bebas Neue from the app shell if nothing else uses them.

**Shape and spacing:** radius 8 (controls), 12 (rows, cards, thumbnails), 20–22 (Echo box, containers). Spacing scale 4/8/12/16/24. Every gap uses the scale.

**Shared components** (new, small, in `src/components/ds/`): `Row` (thumb or tag left, title and detail, status right: the one row style for every list), `Tile` (picture top, one-line action bottom), `Thumb` (image with optional duration badge and platform badge), `PlatformBadge`, `Meter` (segmented bars + mono fraction), `Button` (primary gradient, secondary hairline), `IconButton`, `ThemeSwitch`, `Panel`, `ProgressWave`, `StepBar`.

**Theme:** Dark / Light / Auto, default Auto (follows `prefers-color-scheme`). Choice stored per user (localStorage at minimum; profile setting if cheap) and applied before first paint to avoid a flash (Closr's `src/lib/theme-bootstrap.ts` + `ds/theme-toggle.tsx` is the reference implementation). The switch sits by the avatar.

**Icons:** lucide-react (already in use), 1.7 stroke. No emoji as icons.

## 5. Progress states (every long job)

No bare spinners. Each long job shows, in the thread, a compact card and, in the panel, results arriving as they're ready:

- **Card:** source thumbnail (with duration if media) + an animated visual + a segmented step bar with step names; the current step pulses in accent colour; the job's ETA in words in the reply ("about 3 minutes").
- **Panel:** placeholders with a shimmer, filled in place as each result lands.
- **Conversation list:** a pulsing gradient dot on any conversation with a running job, so the user can leave and come back.

Per job (step names come from the backend's existing progress reporting where it exists):

| Job | Visual | Steps |
|---|---|---|
| Clip a video | Waveform of the video with a scan line; found moments light up | Upload · Transcribe · Find moments · Captions |
| Upload (any file) | Bytes-progress fill on the source thumbnail | Upload · Process |
| Kit / take generation | Output tiles (one per platform) shimmering, then filling | Read source · Write · Score voice · Done |
| Radar take | Same as kit | Read source · Write · Done |
| Imports (YouTube, Instagram, blog, mbox, Gmail) | Item counter climbing + knowledge counter ticking up | Fetch · Read · Learn |
| Carousel / images | Slide frames filling in order | Write · Design · Render |

Mockup: "Making something" screen in v4. Animations respect `prefers-reduced-motion` (static fill, no scan or shimmer).

## 6. Echo backend changes

What exists (verified 11-27): `src/services/echo/loop.ts` is an agentic tool loop over SSE (`POST /api/echo/chat`, `/chat/confirm`, plus `/classify`), max 8 iterations, with its own 9 tools (`get_kit`, `list_kits`, `update_kit_content`, `regenerate_output`, `schedule_posts`, `search_help`, `get_recent_actions`, `get_page_context`, `navigate`). Session memory is an **in-memory LRU of 12 messages that dies on every deploy** (`session-store.ts`). The MCP connector has a separate, larger tool set (`src/services/mcp/`, ~28 tools in tiers READ / WRITE / CONFIRM, with a confirm-token flow). The FE `useEcho` hook today classifies then hands off to pages.

Changes:

1. **Durable conversations.** New tables (e.g. `echo_conversations`: id, user_id, title, created_at, updated_at, archived; `echo_messages`: conversation_id, role, content, tool events/receipts, created_at). Migration applied by hand to staging and prod before merge (Railway runs no migrations). Conversations survive deploys. Long conversations are trimmed or summarised for the model context; the full history stays stored. **Title** auto-generated from the first exchange with the cheap text model, via `MODELS.*` (no hardcoded model ids). List endpoint returns title, updated_at, a thumbnail URL of the latest thing made, and whether a job is running.
2. **One tool set.** Echo's in-app tools and the MCP tools converge on one registry, so anything Echo can do in the app the Claude connector can do too (satisfies the "MCP parity for every feature" rule by construction). Confirm-tier tools (post, schedule, cancel, delete) keep a confirm step in-app too, rendered as a preview row with Confirm/Cancel. In-app-only tools (`navigate` becomes `open_panel`, `get_page_context` becomes "what's open in the panel") stay excluded from MCP. **Tool count tests** (`tests/unit/mcp/tiers.test.ts`) must be updated deliberately.
3. **Outputs open the panel.** The system prompt's "never put content in replies; send people to pages" becomes "never put content in replies; open it in the panel". Tool results carry a typed panel target (`{ kind: 'kit' | 'clips' | 'carousel' | 'calendar' | 'voice' | 'list', id?, filter? }`) that the FE renders. The thread stores a receipt row for each.
4. **Long jobs report progress into the conversation.** A job started from a conversation is linked to it (conversation_id on the job or a link table), so progress and completion land in the right thread even if the user left. Reuse existing progress endpoints (`routes/progress.ts`, compress/clip job progress) rather than new pipelines.
5. **Home data in one call.** A single endpoint for the default side and suggestions: week (from `scheduling` GET `/`), ready items (from `/unscheduled` + unscheduled clips), next up, knowledge count + 14-day sparkline + today's delta, and up to three suggestions (open day today, newest unclipped video, top Radar pick; each only if real). Never invent items; empty states are designed, not faked.

All Echo replies still follow existing rules: Claude-first via `callClaude()` (O-02), no em dashes in user-facing copy, never invent results or links.

## 7. Phases

Each phase ships through develop → staging → main on the Thursday train and is its own implementation plan. Nothing user-visible changes until Phase 3's switch is turned on for the founder.

| Phase | What | Visible to users? |
|---|---|---|
| **1. Look** | Tokens, fonts, theme switch + bootstrap, `ds/` components. Old pages adopt the new tokens only where it's free (no page restyles: those pages are going away). | Barely (colours shift slightly if tokens are shared; builder may scope tokens to the new shell to avoid this). |
| **2. Echo backend** | Durable conversations, one tool registry, panel targets, job→conversation linking, home-data endpoint. Old `useEcho` flow keeps working. | No. |
| **3. New shell behind a switch** | Conversations column, stage, default side, Cmd+K search, new-conversation flow, theme switch. Behind a per-user flag: founder first, then admins, then all. Flag reuses the `useEchoExperience` pattern but must be per-user. | Founder only. |
| **4. Panel views** | Kit, clips, carousel editor, reel editor, full calendar, voice/knowledge, lists ("show me…") re-hosted in the panel and restyled. Old URLs redirect into the shell for flagged users. | Founder/admins. |
| **5. Progress designs** | The section 5 table, job by job. | Founder/admins. |
| **6. Cutover and cleanup** | Flag on for everyone; remove EchoPill, HelpWidget, sidebar, mobile sidebar, `AskYourVoice.tsx`, retired pages and the old palette; all old URLs redirect. Guides and the tour (`components/tour`) updated or retired. Settings, Billing, Developers, Profile restyled. | Everyone. |

## 8. Goals, non-goals, anti-goals

**Goals:** the three jobs are each reachable from the box in one step; one Echo; the app looks premium in both themes; every long job has a designed progress state; anything Echo can do, the Claude connector can do.

**Non-goals:** marketing site (separate; the in-flight `feat/homepage-revamp` branch is untouched); mobile app (web companion rule stands; it keeps working against the same API); admin page redesign; new generation features or new pipelines; changing what plans include.

**Anti-goals (fails even if it technically works):**
- Generated content scrolling away in a chat thread (the March failure).
- Echo saying it did something it didn't, or showing invented posts, numbers or suggestions. Empty is better than fake.
- A long, wordy UI (v2) or an empty one (v3).
- The gradient sprayed everywhere.
- Breaking deep links from emails, guides or the MCP connector.
- Losing a running job's progress because the user navigated or a deploy happened.

## 9. Constraints

- Sensitive paths are off-limits to auto-modification (`src/routes/auth.ts`, `stripe`, `src/middleware/`, `email`, `webhooks`). Settings/Billing restyle is FE-only.
- No hardcoded model ids; `MODELS.*` + env override.
- Railway runs no migrations: apply by hand to both envs before merge.
- Release policy: develop → staging → main, merge never squash.
- FE work branches off `develop` in a worktree.
- Deploys kill in-flight processing: check before promoting.

## 10. Calls made after the builder check (not discussed with the founder; flag any that are wrong)

1. **Rollout switch.** Server-side env allowlist `JUST_ECHO_USERS` on Railway (comma-separated emails, or `*` for everyone), same pattern as `GMAIL_CONNECT_ALLOWLIST`. Exposed to the FE as a boolean on the existing current-user response. Flipping it needs no deploy (`--skip-deploys` var change + restart) and no migration. Not implemented in `src/middleware/`.
2. **One registry, MCP's confirm model.** The unified registry is built from the MCP tool modules (`src/services/mcp/*`) and their tiers; Echo's 9 tools fold into it (duplicates such as `get_kit` / `list_kits` collapse to the MCP version). In-app-only tools (`open_panel`, `get_panel_context`, `get_recent_actions`) sit in a new `ECHO_ONLY` tier that MCP never exposes. Confirm-tier tools use MCP's stateless preview + server-minted token flow in-app too, replacing the in-memory promise in `confirm-manager.ts`.
3. **Pending confirms survive deploys.** Because of call 2, a confirm preview is stored as a message with a pending state and its token. If the token expires, the row shows "expired, ask again" instead of a dead button.
4. **Job linking.** One link table (`echo_conversation_jobs`: conversation_id, job_type, job_id), not a column on every job table. Jobs started outside a conversation (mobile, MCP, cron imports) do not appear in any thread; they show in the default side's Ready strip (shimmering tile while running) and in the knowledge counter. Step names in section 5 are illustrative: Phase 5 starts with an audit of what each job actually reports, and the UI shows only real steps (fewer steps beats invented ones).
5. **Not everything goes through the model.** Free text in the box goes through the Echo agent. Suggestion tiles, panel buttons (Schedule, Post now, Edit) and Cmd+K call the existing endpoints directly and post a receipt row into the current conversation. No new LLM cost for clicks.
6. **Plan limits.** The same 402/403 rules apply. In the thread a blocked action renders as a short Echo reply plus an upgrade row linking to billing; the stage itself is never paywalled.
7. **Deep links.** Canonical form `/app?open=<kind>:<id>` (e.g. `kit:abc`). It opens the stage with that panel and no conversation; a conversation starts only when the user types. Old URLs (`/app/library/[id]`, `/app/calendar`, etc.) redirect to the canonical form for switched-on users and keep rendering the old page for everyone else until cutover. MCP and email links therefore keep working throughout.
8. **Knowledge counter.** "Things Echo knows" uses exactly the count the Voice page shows today (same query); sparkline and "+N today" count those rows by `created_at`. If the two numbers can't be made to match, ship without the sparkline rather than show a different number.
9. **Action log stays.** `echo_actions` remains the audit and recent-actions record; message receipts reference action ids. No migration of old rows.

## 11. Left to the builder

Exact component APIs and file layout; phone affordances; whether new tokens are global or scoped to the new shell during Phases 1–5; how conversation context is trimmed for the model; search implementation (client-side over list endpoints or a server endpoint); redirect mechanics; animation implementation (CSS vs a library: prefer CSS, no heavy new dependency); test strategy per phase (unit tests for registry/tier counts, conversation persistence, home-data endpoint; e2e smoke for the shell behind the flag).
