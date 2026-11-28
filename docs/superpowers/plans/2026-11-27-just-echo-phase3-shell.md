# Just Echo Phase 3 (Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the new Just Echo app at `/app`, shown only to people on the `JUST_ECHO_USERS` allowlist. It has three columns: a conversations list on the left, the stage with the Echo box in the middle, and on the right a default side that a panel replaces when something is open. It talks to the Phase 2 Echo backend. Everyone else keeps today's app, unchanged.

**Architecture:**
- A new client module wraps the Phase 2 endpoints and their SSE stream.
- A pure thread model folds stored messages and live stream events into display items. Hooks own the data: one conversation, the conversation list, and home data.
- Presentational components build on the Phase 1 `ds/` kit. One `JustEchoApp` root assembles the columns and keeps the open conversation (`?c=`) and the open panel (`?open=kind:id`) in the URL.
- `src/app/app/layout.tsx` renders `JustEchoApp` instead of `AppShell` only when the path is exactly `/app`, access is on, and `?classic=1` is absent. Every other route is untouched.
- The panel views themselves are Phase 4. In Phase 3, an open panel shows a placeholder with an "Open full page" link to today's page.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4 with the Phase 1 `je-*` tokens, lucide-react, Vitest and Testing Library. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-27-just-echo-redesign-design.md`. Sections 2, 4, 7 (Phase 3), 10 (calls 1, 5, 6, 7), and the mockup `docs/superpowers/specs/assets/2026-11-27-just-echo/just-echo-v4.html` (the "Home" and "Home, light" screens).

## Global Constraints

- **Repo and branch:** FE repo `/Users/aramammo/Side Quests/echome-frontend`. Branch `feat/just-echo-shell` off `origin/develop`, in worktree `.worktrees/just-echo-shell`. Use `rtk proxy git` for git and assert the branch before any commit or merge.
- **Do not modify:** `src/app/auth/`, `src/app/app/admin/`, `src/lib/api-client.ts`, billing and subscription components, `src/components/app-shell.tsx`, `src/components/echo/*`, `src/hooks/useEcho*`. The old flow must behave exactly as today.
- **New code location:** `src/components/just-echo/`, `src/hooks/just-echo/`, `src/lib/just-echo-client.ts`, `src/lib/sse.ts`. The only edits to existing files are `src/app/app/layout.tsx` (Task 9) and `src/lib/echo-client.ts`, where Task 1 only exports `echoAuthHeader`.
- **Theme scope:**
  - The whole shell renders inside exactly one `<div className="je je-canvas ...">`. Never nest `.je`.
  - `JustEchoApp` calls `useThemePref()` at its root, so Auto follows the OS for as long as the shell is mounted.
- **Styling `ds/` components:** `cx` has no tailwind-merge, so never set size or radius on a `ds/` component through `className`. Wrap it in an element instead.
- **Gradient use:** `je-grad`, `je-grad-text` and `je-ring` are allowed only on:
  - the Echo box ring and glow
  - the send button and primary buttons
  - the greeting's second line
  - the logo mark
  - the knowledge count number
  - the running-job dot

  Nowhere else.
- **Type:** Satoshi (already loaded). Display 36/900, tracking -0.04em. Titles 15 to 17/700. Body 13 to 14/400 to 500. Small labels 12/700 in `text-je-muted`. Durations, counts and timestamps use the `je-mono` class at 10 to 11px.
- **Radius and spacing:** radius 8 (controls), 12 (rows, cards, thumbnails), 20 to 22 (Echo box, containers). Spacing only from 4/8/12/16/24.
- **Layout widths:** left column 208px and right column 392px, from the `xl` breakpoint (1280px) up. Below `xl` it is a single column with header buttons (Task 8).
- **Icons:** lucide-react with `strokeWidth={1.7}`. No emoji.
- **Copy:** no em dashes (U+2014) or en dashes (U+2013) in any user-facing string. Plain words.
- **No dead controls:** no attach or mic buttons in the Echo box until uploads work in the shell (Phase 4/5).
- **Never invent data:**
  - A home section that comes back `null` is not rendered.
  - Empty lists show the designed empty copy given in each task.
  - No placeholder numbers, posts or suggestions.
- **Clicks do not call the model:** suggestion tiles, home items and Cmd+K results open panels or fill the box. They never send a message by themselves (spec call 5).
- **Commands:**
  - Unit tests: `npx vitest run <path>`.
  - Type check: `node_modules/.bin/tsc --noEmit`.
  - Lint: `npx eslint <changed files>`.
  - Build, once at the end: `npm run build`.
  - Baseline: 775 vitest pass on develop.
  - Never `pkill`. If you start `next dev`, kill only its own PID.

## Review Focus

1. **Double send:** pressing Enter twice, or clicking send while a turn is streaming, sends one message. Pinned in Task 4 (`ignores send while a turn is streaming`).
2. **Switching conversation mid-stream:** events from the old stream never land in the newly opened thread, and the old stream is aborted. Pinned in Task 4 (`aborts the stream and drops its events when the conversation changes`).
3. **Double-clicking Confirm:** one request goes out, and buttons are disabled while it is pending. Pinned in Task 5 (`ConfirmRow disables both buttons while resolving`) and Task 4 (`confirm is ignored while one is in flight for the same message`).
4. **Stale or foreign `?c=`:** a deleted, foreign or garbage conversation id shows "This conversation is not available." with a New button, and never crashes. Pinned in Task 4 (`marks notFound on a 404`) and Task 8 (`renders the not-available state for ?c= that 404s`).
5. **Allowlist turned off while a cached "on" exists:** the shell must fall back to the classic app, not show a broken empty shell. Pinned in Task 9 (`revalidates a cached on and switches to classic when the server says off`).

---

### Task 1: Client module and SSE reader

**Files:**
- Create: `src/lib/sse.ts`, `src/lib/just-echo-client.ts`
- Modify: `src/lib/echo-client.ts`. Add `export` to `echoAuthHeader` only; change nothing else.
- Test: `src/lib/sse.test.ts`, `src/lib/just-echo-client.test.ts`

**Interfaces:**
- Produces, in `src/lib/sse.ts`:
  - `readSSE<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T, void, unknown>`. It yields the JSON payload of each `data: ` frame, where frames are separated by a blank line. It skips frames that do not parse, and returns after yielding a frame whose `type === 'done'`.
- Produces, in `src/lib/just-echo-client.ts`. Types mirror the backend (`echome-platform-v2/src/services/echo/{panel-targets,conversations,conversation-actions,conversation-jobs,home-data,sse}.ts` on develop):
  - Panel types: `PanelKind`, `PANEL_KINDS`, `PanelTarget`.
  - Conversation types:
    - `ConversationSummary {id, title, updatedAt, thumbnailUrl, jobRunning}`
    - `ConversationRow {id, title, thumbnailUrl, archived, createdAt, updatedAt}`
  - Message types:
    - `PublicEvent`, the union of `receipt`, `confirm` (no token), `upgrade` and `job_done`
    - `PublicMessage {id, conversationId, role: 'user'|'assistant'|'event', content, event: PublicEvent|null, confirmState: string|null, actionId: string|null, createdAt}`
  - Job and confirm types:
    - `JobView {jobType, jobId, state: 'processing'|'ready'|'failed', progressPercent, panel}`
    - `ResolveResult {state: 'confirmed'|'cancelled'|'expired'|'failed'|'already_resolved', receipt?: PublicEvent, panel?: PanelTarget, message?: string}`
  - Home types: `HomeData`, `HomePost`, `ReadyItem`, `HomeSuggestion`.
  - `EchoTurnEvent`: the backend `EchoSSEEvent` union.
  - `class JustEchoHttpError extends Error { status: number }`.
  - Functions, all through `apiClient` (the default export of api-client is not touched), unwrapping `response.data.data`:
    - `getJustEchoAccess(): Promise<boolean>`: `GET /echo/access` returns `data.justEcho === true`.
    - `getHome(tz: string): Promise<HomeData>`: `GET /echo/home?tz=`.
    - `listConversations(): Promise<ConversationSummary[]>`: `GET /echo/conversations?limit=50`, which returns `data.conversations`.
    - `createConversation(): Promise<ConversationRow>`: `POST /echo/conversations`.
    - `getConversation(id: string): Promise<{conversation: ConversationRow; messages: PublicMessage[]; jobs: JobView[]}>`: `GET /echo/conversations/:id?limit=200`.
    - `resolveConfirm(conversationId: string, messageId: string, approved: boolean): Promise<ResolveResult>`: `POST /echo/conversations/:id/confirms/:messageId`.
  - `streamTurn(conversationId: string, message: string, panel: PanelTarget | null, signal?: AbortSignal): AsyncGenerator<EchoTurnEvent>`:
    - Uses `fetch` with `echoAuthHeader()` and `NEXT_PUBLIC_API_URL`, the same as `streamEchoChat`.
    - The body is `{message, panel}`, with `panel` omitted when null.
    - A non-ok response throws `JustEchoHttpError(body.error.message || 'Echo error <status>', status)` before yielding anything.
    - Otherwise it delegates to `readSSE`.
  - Axios rejections from the other functions are rethrown as `JustEchoHttpError` carrying `err.response.status` (0 when there is no response) and `err.response.data.error.message ?? err.message`.

- [ ] **Step 1: Write failing tests**
  - `sse.test.ts`:
    - `yields frames split across chunks`: two frames delivered in three chunks, one boundary falling mid-JSON, yield both objects in order.
    - `skips a malformed frame and keeps going`.
    - `stops after a done frame`: frames after `{type:'done'}` are not yielded.
  - `just-echo-client.test.ts` (mock `@/lib/api-client` and `global.fetch`):
    - `getConversation unwraps data and hits the limit=200 url`.
    - `streamTurn throws JustEchoHttpError with status and server message on 429 before yielding`: fetch returns `{ok:false,status:429,json:()=>({error:{message:"You've hit today's Echo limit. It resets tomorrow."}})}`. Assert `err.status === 429` and the exact message.
    - `streamTurn omits panel when null`: the request body JSON has no `panel` key.
    - `axios errors become JustEchoHttpError with the response status`: a 404 reject gives `status === 404`.
- [ ] **Step 2: Run** `npx vitest run src/lib/sse.test.ts src/lib/just-echo-client.test.ts`. Expected: FAIL, because the modules are missing.
- [ ] **Step 3: Implement both modules** with the signatures above.
- [ ] **Step 4: Run the same command.** Expected: PASS. Also run `npx vitest run src/lib` to confirm echo-client tests still pass.
- [ ] **Step 5: Commit** with `feat(just-echo): client module and SSE reader for the Phase 2 endpoints`.

### Task 2: Thread model (pure)

**Files:**
- Create: `src/components/just-echo/thread/thread-model.ts`
- Test: `src/components/just-echo/thread/thread-model.test.ts`

**Interfaces:**
- Consumes: Task 1 types.
- Produces:

```ts
export type ConfirmState = 'pending' | 'running' | 'confirmed' | 'cancelled' | 'expired' | 'failed';
export type ThreadItem =
  | { kind: 'user'; key: string; text: string }
  | { kind: 'echo'; key: string; text: string }
  | { kind: 'working'; key: string; label: string }
  | { kind: 'receipt'; key: string; verb: string; label: string; link?: string; panel?: PanelTarget }
  | { kind: 'confirm'; key: string; messageId: string; tool: string; preview: string; expiresAt: number; state: ConfirmState }
  | { kind: 'upgrade'; key: string; message: string }
  | { kind: 'job'; key: string; label: string; state: 'ready' | 'failed'; panel?: PanelTarget }
  | { kind: 'error'; key: string; message: string };
export function itemsFromMessages(messages: PublicMessage[], nowSec: number): ThreadItem[];
export function applyTurnEvent(items: ThreadItem[], event: EchoTurnEvent): ThreadItem[];
export function effectiveConfirmState(item: Extract<ThreadItem, { kind: 'confirm' }>, nowSec: number): ConfirmState;
```

Rules (each one is a test):

- **`itemsFromMessages`:** maps by message `id`, keeping order.
  - `user` becomes `user`, and `assistant` becomes `echo`, with empty content skipped.
  - Event messages map by type:
    - `receipt` becomes `receipt`.
    - `confirm` becomes `confirm`, with `state = confirmState ?? 'pending'`.
    - `upgrade` becomes `upgrade`.
    - `job_done` becomes `job`.
  - A null event is skipped.
- **`applyTurnEvent`:** never mutates its input.
  - `text`:
    - If the last item is `echo` with a key starting `live-`, append to it.
    - Otherwise push `{kind:'echo', key:'live-text-<index>', text}`, with leading newlines trimmed on a new item.
  - `tool_start`: push `{kind:'working', key:'live-tool-<toolCallId>', label: summary}`.
  - `tool_done`:
    - If `receipt.verb === 'PREVIEW'`, remove the matching working item and add nothing, because a confirm card follows.
    - Otherwise replace the matching working item with a `receipt` under the same key, or push one if there is none.
  - `panel`: set `panel` on the receipt whose key is `live-tool-<toolCallId>`. No item is added.
  - `confirm_pending`:
    - Set `state:'cancelled'` on every earlier `confirm` item with the same `tool` and `state==='pending'`. The backend supersedes them.
    - Push `{kind:'confirm', key: messageId, messageId, tool, preview, expiresAt, state:'pending'}`.
  - `upgrade`: push an `upgrade` item.
  - `error`: push `{kind:'error', key:'live-error-<index>', message}`.
  - `conversation`, `title`, `done` and `confirm_request` return the items unchanged.
- **`effectiveConfirmState`:**
  - `pending` with `expiresAt < nowSec` gives `expired`.
  - `running` with `expiresAt + 60 < nowSec` gives `failed`.
  - Anything else gives the item's state.

- [ ] **Step 1: Write the failing tests.** Use one `it` per rule above, named after the rule:
  - `itemsFromMessages maps roles and events in order`
  - `appends streamed text to the live echo item`
  - `starts a new echo item after a tool row`
  - `replaces the working row with its receipt`
  - `drops the PREVIEW receipt so the confirm card stands alone`
  - `attaches a panel to its receipt`
  - `a new confirm cancels older pending confirms of the same tool`
  - `effectiveConfirmState expires a lapsed pending confirm`
  - `does not mutate the input array`
- [ ] **Step 2: Run** `npx vitest run src/components/just-echo/thread/thread-model.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `thread-model.ts`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(just-echo): thread model folding stored messages and live events`.

### Task 3: Panel targets and URL state (pure)

**Files:**
- Create: `src/components/just-echo/panel/panel-targets.ts`
- Test: `src/components/just-echo/panel/panel-targets.test.ts`

**Interfaces:**
- Consumes: `PanelTarget`, `PANEL_KINDS` from Task 1.
- Produces:
  - `parseOpenParam(raw: string | null): PanelTarget | null`.
    - `'kit:abc'` gives `{kind:'kit', id:'abc'}`.
    - `'calendar'` gives `{kind:'calendar'}`.
    - An unknown kind, an empty string, null, or an id over 100 characters gives `null`.
  - `formatOpenParam(t: PanelTarget): string`. This is `kind` or `kind:id`; the filter is never put in the URL.
  - `panelTitle(t: PanelTarget): string`, with exact copy:
    - kit `Kit`
    - clips `Clips`
    - carousel `Carousel`
    - calendar `Calendar`
    - voice `Your voice`
    - list with `filter.source==='list_drafts'` `Drafts`
    - list with `list_recent_posts` `Recent posts`
    - any other list `Your kits`
  - `fullPageHref(t: PanelTarget): string`:
    - kit with an id `/app/library/<encodeURIComponent(id)>`, and kit without one `/app/library`
    - clips `/app/clips`
    - carousel with an id `/app/library/<id>`, and without one `/app/library`
    - calendar `/app/calendar`
    - voice `/app/voice`
    - list with `list_recent_posts` `/app/calendar`
    - any other list `/app/library`
  - `samePanel(a: PanelTarget | null, b: PanelTarget | null): boolean`. Compares kind, id, and filter equality.
  - `isUuid(s: string | null): boolean`.

- [ ] **Step 1: Write failing tests** covering each mapping above, including `parseOpenParam rejects unknown kinds and long ids` and `fullPageHref encodes the kit id`.
- [ ] **Step 2: Run** `npx vitest run src/components/just-echo/panel/panel-targets.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the module.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(just-echo): panel target helpers and open= URL format`.

### Task 4: Data hooks

**Files:**
- Create:
  - `src/hooks/just-echo/useConversation.ts`
  - `src/hooks/just-echo/useConversationList.ts`
  - `src/hooks/just-echo/useHomeData.ts`
- Test:
  - `src/hooks/just-echo/useConversation.test.tsx`
  - `src/hooks/just-echo/useConversationList.test.tsx`
  - `src/hooks/just-echo/useHomeData.test.tsx`

**Interfaces:**
- Consumes:
  - Task 1 client functions. Tests mock `@/lib/just-echo-client`.
  - Task 2 `itemsFromMessages` and `applyTurnEvent`.
- Produces:

```ts
export function useConversation(opts: {
  conversationId: string | null;
  panel: PanelTarget | null;                    // sent with every message
  onCreated: (id: string) => void;
  onPanel: (target: PanelTarget) => void;
  onTitle: (id: string, title: string) => void;
  onTurnDone: () => void;                       // lets the shell refresh list + home
}): {
  items: ThreadItem[]; loading: boolean; sending: boolean; notFound: boolean;
  confirmingId: string | null;                  // messageId of the confirm in flight
  send: (text: string) => Promise<void>;
  confirm: (messageId: string, approved: boolean) => Promise<void>;
};
export function useConversationList(): {
  conversations: ConversationSummary[]; loading: boolean; error: boolean;
  refresh: () => Promise<void>; setTitle: (id: string, title: string) => void;
};
export function useHomeData(): { data: HomeData | null; loading: boolean; error: boolean; refresh: () => Promise<void> };
```

Behaviour, with one test each, named as given:

**`useConversation`**
- **Creating and sending**
  - `creates the conversation on first send and reports it`: with `conversationId:null`, `send('hi')`:
    - calls `createConversation` once, then `onCreated(newId)`, then `streamTurn(newId, 'hi', panel, signal)`
    - appends a `user` item immediately, before any stream event
  - `applies live events and opens panels`: a `panel` event calls `onPanel(target)`, and a `title` event calls `onTitle(id, title)`.
  - `reloads the conversation when the turn is done`: after `done`:
    - `getConversation` is called
    - items equal `itemsFromMessages` of its messages
    - `onTurnDone` is called
  - `ignores send while a turn is streaming`: a second `send` before the first resolves makes no second `streamTurn` call.
  - Empty or whitespace text is ignored.
- **Send errors**
  - `maps a 429 to an error item with the server message`.
  - `maps a 402 to an upgrade item`. The message is exactly `Echo is part of the paid plans.`
  - `maps a 404 on send to notFound`.
  - `a dropped stream leaves an error item and reloads`: the generator throws a plain `Error` mid-stream. The result is:
    - an error item `Lost connection to Echo. Anything it finished is saved.`
    - `sending` false
    - one `getConversation` reload
- **Loading and switching**
  - `marks notFound on a 404`: loading a conversation id whose `getConversation` rejects with status 404 sets `notFound` true and `items` empty.
  - `aborts the stream and drops its events when the conversation changes`:
    - Rerendering with a new `conversationId` while streaming aborts the `AbortSignal` passed to `streamTurn`.
    - Events yielded afterwards do not change `items`.
    - The new conversation loads.
- **Confirms**
  - `confirm updates the card, appends the receipt and opens the panel`:
    - `resolveConfirm` returns `{state:'confirmed', receipt:{type:'receipt',verb:'DELETED',label:'content kit'}, panel:{kind:'calendar'}}`.
    - The card's state becomes `confirmed`, a receipt item is appended, and `onPanel` is called.
  - `confirm is ignored while one is in flight for the same message`.
  - Other results:
    - `already_resolved` reloads the conversation.
    - `expired` and `failed` set the card state.
    - `failed` also appends an error item with `result.message ?? 'That did not go through.'`.
- **Polling**
  - `polls every 15 seconds while a job is processing and stops after`: use fake timers.

**`useConversationList`**
- `loads conversations and polls every 30 seconds only while one has jobRunning`.
- `setTitle updates one row in place`.
- `refresh refetches`.

**`useHomeData`**
- `passes the browser time zone`: `getHome` is called with `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `error is true and data null when the call fails`.

- [ ] **Step 1: Write the failing tests** listed above, using `renderHook` and `waitFor`, mocking `@/lib/just-echo-client`, and using `vi.useFakeTimers()` for polling.
- [ ] **Step 2: Run** `npx vitest run src/hooks/just-echo`. Expected: FAIL.
- [ ] **Step 3: Implement** the three hooks.
  - `useConversation` holds an `AbortController` per turn and a `currentId` ref. It drops events whenever the ref no longer matches the turn's id.
  - Polling uses `setInterval`, cleared on unmount and whenever the condition goes false.
- [ ] **Step 4: Run** `npx vitest run src/hooks/just-echo`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(just-echo): conversation, list and home data hooks`.

### Task 5: Thread UI and Echo box

**Files:**
- Create:
  - `src/components/just-echo/thread/Thread.tsx`
  - `src/components/just-echo/thread/rows.tsx`
  - `src/components/just-echo/thread/linkify.tsx`
  - `src/components/just-echo/EchoBox.tsx`
- Test:
  - `src/components/just-echo/thread/Thread.test.tsx`
  - `src/components/just-echo/thread/linkify.test.tsx`
  - `src/components/just-echo/EchoBox.test.tsx`

**Interfaces:**
- Consumes:
  - Task 2 `ThreadItem` and `effectiveConfirmState`
  - Task 3 `panelTitle`
  - `ds/` `Row`, `Button`, `IconButton`
- Produces:
  - `Thread({ items, onOpenPanel, onConfirm, confirmingId }: { items: ThreadItem[]; onOpenPanel: (t: PanelTarget) => void; onConfirm: (messageId: string, approved: boolean) => void; confirmingId: string | null })`:
    - The container is `role="log"` with `aria-live="polite"`.
    - It auto-scrolls to the bottom when `items.length` grows, but only if the user was already within 80px of the bottom.
  - `linkify(text: string): ReactNode[]`. Turns `https://` URLs and absolute `/app/...` paths into links. Everything else stays text, with newlines preserved by `whitespace-pre-wrap` on the parent.
  - `EchoBox({ onSend, disabled, placeholder, autoFocus, value, onChange }: { onSend: (text: string) => void; disabled: boolean; placeholder: string; autoFocus?: boolean; value: string; onChange: (v: string) => void })`:
    - It is controlled, so the stage can prefill it.
    - It is a textarea that grows to 6 lines and then scrolls.
    - Enter sends and Shift+Enter makes a newline.
    - The send button is an `IconButton` with variant `grad`, `label="Send"`, and lucide `ArrowUp`.
    - `disabled` blocks sending but not typing.
    - The wrapper is `je-ring` with radius 22 and the soft glow.
    - There are no other buttons.

Row rendering, matched to the mockup's `.msg` styles:

- **`user`:** a right-aligned bubble, `bg-je-item`, radius 12, text 14/500.
- **`echo`:** left-aligned plain text, 14/400, `text-je-ink`, run through `linkify`.
- **`working`:** a `Row` with a pulsing dot (CSS `je-pulse`, a muted colour, not the gradient), the title set to the label, and no trail.
- **`receipt`:** a `Row` showing `verb` lowercased with the first letter capitalised (for example "Fetched voice rules").
  - It has a lucide `Check` in `text-je-ok`.
  - When `panel` is set, the trail is an "Open" text button that calls `onOpenPanel(panel)`.
- **`confirm`:**
  - The card body is the preview text.
  - In state `pending`, it shows a primary `Button` "Confirm" and a secondary `Button` "Cancel". Both are disabled when `confirmingId === messageId`.
  - Other states show a status line instead of buttons:
    - `running` "Working on it."
    - `confirmed` "Done."
    - `cancelled` "Cancelled."
    - `expired` "Expired. Ask Echo again."
    - `failed` "That did not go through."
- **`upgrade`:** the message plus a link "See plans" to `/app/billing`.
- **`job`:**
  - `ready` shows a `Row` "<label> is ready" with "Open" when `panel` is set.
  - `failed` shows "<label> did not finish".
- **`error`:** the message in `text-je-ink-2` with a lucide `CircleAlert`.

- [ ] **Step 1: Write the failing tests.**
  - `renders each item kind with its copy`.
  - `ConfirmRow disables both buttons while resolving`.
  - `an expired pending confirm shows the expired line and no buttons`: pass an item whose `expiresAt` is in the past.
  - `Open on a receipt calls onOpenPanel with its target`.
  - `linkify links https urls and /app paths only`.
  - `EchoBox sends on Enter, not on Shift+Enter, and not when disabled`.
  - `EchoBox trims and ignores empty input`.
  - `no em dashes in rendered copy`: render every kind, then assert `container.textContent` has no `—` or `–`.
- [ ] **Step 2: Run** `npx vitest run src/components/just-echo/thread src/components/just-echo/EchoBox.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the components.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(just-echo): thread rows and the Echo box`.

### Task 6: Conversations column and default side

**Files:**
- Create:
  - `src/components/just-echo/ConversationList.tsx`
  - `src/components/just-echo/home/HomeSide.tsx`
  - `src/components/just-echo/home/week.ts`
- Test:
  - `src/components/just-echo/ConversationList.test.tsx`
  - `src/components/just-echo/home/HomeSide.test.tsx`
  - `src/components/just-echo/home/week.test.ts`

**Interfaces:**
- Consumes:
  - Task 1 types
  - Task 3 helpers
  - `ds/` `Row`, `Thumb`, `PlatformBadge`, `Meter`, `ThemeSwitch`, `Button`
  - `useAuth()` from `@/hooks/useAuth`, for `user.name`, `user.avatar` and `user.email`
- Produces:
  - `ConversationList({ conversations, loading, activeId, onNew, onSearch, onPick }: {...; onNew: () => void; onSearch: () => void; onPick: (id: string) => void })`:
    - **Top:** the logo (a `je-grad` square with radius 8, then "EchoMe" at 15/700), and a "New" button with a lucide `Search` icon button beside it that calls `onSearch`.
    - **List:** each conversation is a row with:
      - a 24px rounded thumb (`thumbnailUrl`, or `--je-thumb` when null)
      - the title, or `New conversation` when null, truncated to one line
      - when `jobRunning`, a pulsing `je-grad` dot with `aria-label="Working"`
    - **Active row:** gets `bg-je-tint`.
    - **Empty list copy:** `Your conversations will show up here.`
    - **Bottom:** an avatar menu built from a `<details>` disclosure. Its items:
      - Settings `/app/settings`
      - Billing `/app/billing`
      - Developers `/app/developers`
      - Profile `/app/profile`
      - Classic view `/app?classic=1`
      - Sign out, using `useAuth().logout` (verify the exact name in `useAuth.ts`)

      `ThemeSwitch` sits beside the avatar.
  - `HomeSide({ data, onOpen }: { data: HomeData | null; onOpen: (t: PanelTarget) => void })`. Sections are in mockup order, and a section whose data is `null` is not rendered:
    - **This week:**
      - A label, plus `Meter value={covered} total={7} label="Days covered this week"`.
      - 7 day columns, Monday to Sunday of the user's current week, with a single-letter day name (M T W T F S S).
      - Each day shows its first post as a `Thumb` with `src={null}` and a `PlatformBadge` of `platforms[0]`:
        - posted (status `posted`) gets `state="done"`
        - otherwise `default`
        - a day with no post today or later gets a dashed "+" open cell
        - a past day with no post is an empty cell
      - Today's column gets `bg-je-tint`.
      - Clicking anywhere in the week calls `onOpen({kind:'calendar'})`.
    - **Next up:**
      - One `Row` with the title (or `Untitled post`), detail `Next · <weekday> <h:mm>` in local time, and trail badges for each platform.
      - Clicking it calls `onOpen({kind:'calendar'})`.
    - **Ready:**
      - A label, then a horizontal strip of `Thumb aspect="reel"`:
        - `clip` items open `{kind:'clips', id}`
        - `kit` items open `{kind:'kit', id}`
        - `running` items render a shimmer placeholder that is not clickable
      - Empty `items` shows `Nothing waiting. Make something and it lands here.`
    - **Knowledge:**
      - The count, large (`je-grad-text`, 28/900), and the label `things Echo knows about you`.
      - A 14-bar sparkline from `sparkline` (bars scaled to the max, hidden when `sparkline` is null).
      - `+<today> today` when `today > 0`.
      - Clicking calls `onOpen({kind:'voice'})`.
  - `weekDays(posts: HomePost[], now: Date): Array<{ key: string; letter: string; isToday: boolean; isPast: boolean; post: HomePost | null }>`:
    - The days run Monday to Sunday of the week containing `now`, in local time.
    - The `post` is the earliest non-cancelled post that day.
  - `coveredDays(days): number`: the count of days that have a post.

- [ ] **Step 1: Write the failing tests.**
  - `weekDays builds Monday to Sunday with today flagged`: fix `now` to a Wednesday.
  - `weekDays ignores cancelled and skipped posts`.
  - `HomeSide hides null sections`: `week:null` renders no "This week" label.
  - `HomeSide shows the ready empty copy`.
  - `HomeSide opens the right panel per item`: clip, kit, knowledge and week each produce the expected target.
  - `ConversationList shows the running dot and the untitled fallback`.
  - `ConversationList calls onSearch and onNew`.
  - `avatar menu links to the classic view`.
- [ ] **Step 2: Run** `npx vitest run src/components/just-echo/ConversationList.test.tsx src/components/just-echo/home`. Expected: FAIL.
- [ ] **Step 3: Implement** the components.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(just-echo): conversations column and the default side`.

### Task 7: Stage, suggestion tiles, panel host, Cmd+K

**Files:**
- Create:
  - `src/components/just-echo/Stage.tsx`
  - `src/components/just-echo/panel/PanelHost.tsx`
  - `src/components/just-echo/search/CommandK.tsx`
  - `src/components/just-echo/search/search.ts`
- Test:
  - `src/components/just-echo/Stage.test.tsx`
  - `src/components/just-echo/panel/PanelHost.test.tsx`
  - `src/components/just-echo/search/CommandK.test.tsx`
  - `src/components/just-echo/search/search.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 6, plus `ds/` `Tile`, `Panel` and `Row`.
- Produces:
  - `Stage(props)`. The props are:

    ```ts
    {
      mode: 'new' | 'thread';
      firstName: string | null;
      suggestions: HomeSuggestion[];
      items: ThreadItem[];
      sending: boolean;
      notFound: boolean;
      draft: string;
      setDraft: (v: string) => void;
      onSend: (t: string) => void;
      onOpenPanel: (t: PanelTarget) => void;
      onConfirm: (id: string, ok: boolean) => void;
      confirmingId: string | null;
      onNew: () => void;
    }
    ```

    - **`mode 'new'`:** a vertically centred greeting, the `EchoBox`, then up to 3 tiles.
      - **Greeting:**
        - Line 1 is `<Morning|Afternoon|Evening>, <firstName>.` (hour before 12, before 18, otherwise), or `<Part of day>.` when the name is null.
        - Line 2, in `je-grad-text`, is `What should we make?`.
        - Display 36/900, tracking -0.04em.
      - **Box:** placeholder `Paste a link or tell Echo what to make...`, with `autoFocus`.
      - **Tiles, from `suggestions`:**
        - `open_day`:
          - The picture is a lucide `CalendarPlus` on `bg-je-item`.
          - The action is `Fill today`.
          - Clicking calls `onOpenPanel({kind:'calendar'})`.
        - `unclipped_video`:
          - The picture is a lucide `Clapperboard` with the label as the caption.
          - The action is `Clip this video`.
          - Clicking calls `onOpenPanel({kind:'clips', id})`.
        - `radar_pick`:
          - The picture is the label in 13/700 with `Radar` small and muted.
          - The action is `Write my take`.
          - Clicking sets the draft to `Write my take on "<label>". My angle: ` and focuses the box. It does not send.
      - **No tiles:** when there are no suggestions, the stage shows no tile row and no placeholder tiles.
    - **`mode 'thread'`:** `Thread` fills the column and the `EchoBox` docks at the bottom with placeholder `Steer it...`.
      - When `notFound` is set, the column shows:
        - `This conversation is not available.`
        - a primary `Button` "New conversation" that calls `onNew`, in place of the thread and box
  - `PanelHost({ target, onClose }: { target: PanelTarget; onClose: () => void })`:
    - It renders `ds/Panel` with `title={panelTitle(target)}` and an `actions` link "Open full page" to `fullPageHref(target)`.
    - The body copy is exactly `This view is moving into the panel. For now it opens as a full page.`
    - Escape calls `onClose`.
  - `CommandK(props)`. The props are:

    ```ts
    {
      open: boolean;
      onClose: () => void;
      conversations: ConversationSummary[];
      onPickConversation: (id: string) => void;
      onOpenPanel: (t: PanelTarget) => void;
    }
    ```

    - **Data:** on first open, it loads kits with `api.contentKits.list(100)` (`data.kits`, using `id` and `title`) and videos with `api.clips.list(50)` (`data.uploads`).
      - Use the video's filename field as `ClipsContent.tsx` reads it, falling back to `Untitled video`.
      - The default import of `@/lib/api-client` is read-only use.
      - A failure in one source leaves the other searchable.
    - **Dialog:**
      - `role="dialog"`, `aria-modal`, and an input with `aria-label="Search conversations, kits and videos"`.
      - Results are in a `role="listbox"`, and the active option is tracked with `aria-activedescendant`.
    - **Keys:** ArrowUp/ArrowDown move the active option, Enter picks it, and Escape closes.
    - **Picking:** a conversation calls `onPickConversation`, a kit calls `onOpenPanel({kind:'kit',id})`, and a video calls `onOpenPanel({kind:'clips',id})`. The dialog then closes.
  - `searchItems(query: string, src: { conversations: ConversationSummary[]; kits: {id: string; title: string | null}[]; videos: {id: string; title: string}[] }): Array<{ group: 'Conversations' | 'Kits' | 'Videos'; id: string; title: string }>`:
    - Matching is a case-insensitive substring on the title, with at most 6 per group, in group order.
    - An empty query returns the 8 most recent conversations only.
    - A null title is searchable as `New conversation` (conversations) or `Untitled kit` (kits).

- [ ] **Step 1: Write the failing tests.**
  - `greets by part of day and first name`: fake 09:00 gives "Morning, Ara.".
  - `renders only real suggestions`: `[]` gives no tiles.
  - `radar tile fills the box without sending`.
  - `open_day and unclipped tiles open their panels`.
  - `thread mode shows the not-available state with a New button`.
  - `PanelHost links to the full page and closes on Escape`.
  - `searchItems groups, caps at 6 and falls back to recent conversations`.
  - `CommandK keyboard navigation picks the active result`.
  - `CommandK still searches conversations when the kits call fails`.
- [ ] **Step 2: Run** `npx vitest run src/components/just-echo/Stage.test.tsx src/components/just-echo/panel src/components/just-echo/search`. Expected: FAIL.
- [ ] **Step 3: Implement** the components.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(just-echo): stage, suggestion tiles, panel placeholder and Cmd+K`.

### Task 8: JustEchoApp root (layout, URL state, responsive)

**Files:**
- Create: `src/components/just-echo/JustEchoApp.tsx`
- Test: `src/components/just-echo/JustEchoApp.test.tsx`

**Interfaces:**
- Consumes: everything above, plus `useRouter`, `useSearchParams` and `usePathname` from `next/navigation` (mocked in tests), `useAuth` and `useThemePref`.
- Produces: `JustEchoApp(): JSX.Element`, with no props.

**Behaviour:**
- **Root:**
  - One `<div className="je je-canvas h-screen overflow-hidden">`. Never nest `.je`.
  - Calls `useThemePref()`.
- **URL state (`?c=` and `?open=`):**
  - `c` is read through `isUuid`. A non-uuid is treated as an invalid id, so it shows the not-available state.
  - `open` is read through `parseOpenParam`.
  - Changes use `router.replace` and keep the other param.
  - `onCreated(id)` sets `c` without adding history noise.
  - New clears `c` and `open`, and resets the draft.
- **Panel state:**
  - The panel target lives in state, seeded from `open`, so filters survive.
  - Opening sets both the state and `open`. Closing clears both.
  - The open panel is sent as `panel` with each message, through `useConversation`'s `panel` option.
- **Wiring:**
  - `useConversation({conversationId: c, panel, onCreated, onPanel: openPanel, onTitle: list.setTitle, onTurnDone: () => { list.refresh(); home.refresh(); }})`
  - `confirmingId` comes from `useConversation` and is passed to `Stage`.
- **Desktop layout (`xl` and up):**
  - A grid of `208px 1fr 392px`.
  - The left column is `ConversationList`.
  - The centre is `Stage`, with `mode` set to `'new'` when there is no `c`, otherwise `'thread'`.
  - The right column is `PanelHost` when a panel is open, otherwise `HomeSide`.
- **Below `xl`:**
  - A single column with a slim header holding:
    - an `IconButton` `Menu`, label "Conversations", that opens the list as a left slide-over
    - an `IconButton` `CalendarDays`, label "This week", that opens `HomeSide` as a full-screen sheet
  - An open panel shows as the full-screen sheet.
  - Each overlay closes with Escape and has a close button.
- **Cmd+K:** Cmd+K (mac) or Ctrl+K toggles `CommandK`. The handler goes on `window` and is removed on unmount.
- **Loading:** while the first list or home load is pending, show `bg-je-item` skeleton blocks in the side columns. Never fake content.

- [ ] **Step 1: Write the failing tests.**
  - `renders the new-conversation stage with no c param`.
  - `opens a thread from ?c= and a panel from ?open=kit:abc`.
  - `renders the not-available state for ?c= that 404s`.
  - `sending from the new stage sets ?c= to the created id`.
  - `opening a receipt panel replaces the default side and closing restores it`.
  - `Cmd+K opens search and Escape closes it`.
  - `exactly one .je element in the tree`.
- [ ] **Step 2: Run** `npx vitest run src/components/just-echo/JustEchoApp.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the component.
- [ ] **Step 4: Run** `npx vitest run src/components/just-echo src/hooks/just-echo src/lib`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(just-echo): JustEchoApp root with URL state and responsive columns`.

### Task 9: Access gate and the switch in the app layout

**Files:**
- Create:
  - `src/hooks/just-echo/useJustEchoAccess.ts`
  - `src/components/just-echo/ShellSwitch.tsx`
- Modify: `src/app/app/layout.tsx`. Inside `AuthGuard`, wrap the provider tree with `ShellSwitch`. The classic branch stays byte-for-byte what it renders today.
- Test:
  - `src/hooks/just-echo/useJustEchoAccess.test.tsx`
  - `src/components/just-echo/ShellSwitch.test.tsx`

**Interfaces:**
- Consumes:
  - Task 1 `getJustEchoAccess`
  - Task 8 `JustEchoApp`, loaded with `next/dynamic` (`ssr:false`) so the classic bundle does not grow
  - `useAuth().user.id`
- Produces:
  - `useJustEchoAccess(userId: string | null): 'loading' | 'on' | 'off'`:
    - Cache key: `localStorage['je-access:<userId>']`, holding `'1'` or `'0'`.
    - It returns the cached value immediately when present, and always revalidates once per mount.
    - Revalidation writes the cache and updates the state.
    - A request error leaves the cached value, or gives `'off'` when nothing is cached.
    - A null `userId` gives `'off'`.
  - `ShellSwitch({ children }: { children: ReactNode })`. It renders `JustEchoApp` only when all three hold:
    - `usePathname() === '/app'`
    - `useSearchParams().get('classic') !== '1'`
    - access is `'on'`

    While access is `'loading'` with no cache, on `/app` only, it renders a neutral full-screen `je je-canvas` block with no text, so classic never flashes for allowlisted people. In every other case it renders `children`, the unchanged classic tree.
  - In `layout.tsx`, `ShellSwitch` wraps `<NavigationProvider><VoiceProvider><AppShell>{children}</AppShell></VoiceProvider></NavigationProvider>`. `JustEchoApp` renders outside `AppShell`, so EchoPill and HelpWidget do not mount for it.

- [ ] **Step 1: Write the failing tests.**
  - `returns the cached value immediately and revalidates`.
  - `revalidates a cached on and switches to classic when the server says off`: the cache holds `'1'` and the server returns false. The result goes from `'on'` to `'off'` and the cache becomes `'0'`.
  - `request errors fall back to the cache, else off`.
  - `ShellSwitch renders the classic children on /app/library even when on`.
  - `ShellSwitch renders classic for /app?classic=1`.
  - `ShellSwitch renders JustEchoApp on /app when on`. Mock `next/dynamic`, or the `JustEchoApp` module, to a stub.
  - `ShellSwitch never calls the access endpoint without a user`.
- [ ] **Step 2: Run** `npx vitest run src/hooks/just-echo/useJustEchoAccess.test.tsx src/components/just-echo/ShellSwitch.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** both, then edit `layout.tsx`.
- [ ] **Step 4: Full verification.** Each of these must pass:
  - `npx vitest run` passes, with 775 plus the new tests and 0 failures.
  - `node_modules/.bin/tsc --noEmit` exits 0.
  - `npx eslint src/components/just-echo src/hooks/just-echo src/lib/just-echo-client.ts src/lib/sse.ts src/lib/echo-client.ts src/app/app/layout.tsx` shows no errors.
  - `npm run build` exits 0.
  - `grep -rnP "\x{2014}|\x{2013}" src/components/just-echo src/hooks/just-echo` returns no matches.
- [ ] **Step 5: Commit** with `feat(just-echo): per-user switch renders the new shell at /app`.

---

## Handoff after the plan (controller, not a task)

1. Merge into FE `develop` locally with `--no-ff`. Push only when the founder says so.
2. Staging smoke, as the founder or `echo-smoke-admin@tryechome.com`, both of whom are on staging's `JUST_ECHO_USERS`, at desktop 1440px and phone 375px, in dark and light. Check each of these:
   - `/app` shows the new shell.
   - `/app/library` still shows the classic page.
   - `/app?classic=1` shows classic.
   - A full turn works: a voice rules question, then a kit delete with Confirm, then a reload of `?c=` that shows the same thread.
   - Cmd+K finds a kit and opens its placeholder panel, whose "Open full page" link works.
   - There are no new console errors.
3. Prod keeps `JUST_ECHO_USERS` unset until the founder asks to be added.
