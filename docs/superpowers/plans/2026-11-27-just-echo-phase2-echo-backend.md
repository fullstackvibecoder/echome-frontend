# Just Echo Phase 2: Echo Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the backend durable Echo conversations: a single tool registry shared with MCP, typed panel targets, confirms that survive deploys, jobs linked to conversations, and a single home-data endpoint. All of it sits behind `JUST_ECHO_USERS`, and nothing user-visible changes.

**Architecture:** A new router (`src/routes/just-echo.ts`, mounted at `/api/echo` alongside the old router) serves the conversation, confirm, receipt, home and access endpoints.
- A new turn loop (`conversation-loop.ts`) runs over a registry made of `MCP_TOOLS` plus a new `ECHO_ONLY` tier. It persists every message and event to Supabase.
- Confirm-tier tools use MCP's stateless token. The token is stored server-side on the message, and only the confirm endpoint can redeem it.
- The old `POST /api/echo/chat` path stays as it is (old loop, session-store, confirm-manager, old registry) until the Phase 6 cutover deletes it.

**Tech Stack:** Express + TypeScript, Supabase (service role), zod, Jest (`@/` alias), `callClaude()` and `MODELS.*`.

**Spec:** `/Users/aramammo/Side Quests/echome-frontend/.worktrees/just-echo-spec/docs/superpowers/specs/2026-11-27-just-echo-redesign-design.md`, sections 6, 7, 9 and 10.

**Repo / branch:** `echome-platform-v2`, worktree `.worktrees/just-echo-phase2` on `feat/just-echo-echo-backend`, branched from `origin/develop` (7dee2dd1 or later).

## Global Constraints

- Sensitive paths are NOT modified: `src/routes/auth.ts`, `src/services/auth.service.ts`, `src/routes/stripe.ts`, `src/services/stripe/`, `src/middleware/`, `src/services/email/`, `src/routes/webhooks/`. Importing from them is fine.
- No hardcoded model ids. Use `MODELS.SONNET` for the turn loop and `MODELS.HAIKU` for titles, every LLM call goes through `callClaude()`, and no direct SDK calls are made outside the injected test client.
- No em dashes in any user-facing string (replies, receipts, titles, preview text, errors).
- Never invent results, links, counts or suggestions. If a section has no real data, it returns empty or `null`.
- Railway runs no migrations. Apply the migration by hand to staging and prod before merging to develop. That is a controller step, and it needs the user's go.
- The old flow keeps working: `POST /api/echo/chat`, `/chat/confirm`, `/classify`, `loop.ts`, `session-store.ts`, `confirm-manager.ts` and `tools/registry.ts` stay byte-for-byte unchanged, and the tests in `tests/unit/echo/*` that exist today stay green.
- MCP behaviour is unchanged: `MCP_TOOLS`, MCP tool names and the MCP tier counts (read 15, write 10, confirm 4) stay the same.
- Rollout flag: the `JUST_ECHO_USERS` env var holds comma-separated emails (case-insensitive) or `*`, and is read at call time. There is no admin bypass, because the founder-first, admins-second order needs the list alone. It is not implemented under `src/middleware/`.
- Every new endpoint runs `authenticateUser`, then `requireTier('pro')` (same as `/chat`), then the Just Echo gate. A user not on the list gets 404 `{ error: 'Not found' }`.
- Confirm tokens are never sent to the client and never shown to the model.
- In-app confirm principal is the literal `'echo:web'`. Token TTL is MCP's `CONFIRM_TOKEN_TTL_SECONDS` (300).
- New tables have RLS ENABLED with `REVOKE ALL ... FROM anon, authenticated`, following `20261118_mcp_consumed_nonces.sql`. They are service-role only.
- Model context is the last 24 stored user/assistant/event messages. Older history stays stored but is not sent to the model.

## Review Focus

1. **The model tries to confirm on its own:** it passes `confirmation_token` itself, or the preview result leaks the token to it. Expected: nothing executes; only the confirm endpoint can execute. Pinned in Task 4.
2. **Confirm clicked twice, after a deploy, or after 5 minutes.** Expected: the action runs at most once, an expired token shows `expired` rather than a working button, and no response body contains a token. Pinned in Task 5.
3. **Someone else's conversation or message id.** Expected: 404 from every endpoint, never their data, never a write. Pinned in Tasks 2 and 8.
4. **Stored history that would break Anthropic's role rules.** Examples: a turn where the loop failed before any assistant text, consecutive user messages, or an event row first. Expected: the history built for the model always starts with `user` and alternates. Pinned in Task 2.
5. **Home data when one source fails or the user is brand new** (no default KB, KB service throws, no posts). Expected: the other sections still return; the failed section is `null`; a new user gets empty lists and `count: 0`, never placeholders; when the KB item list length differs from `totalItems`, the sparkline is `null`. Pinned in Task 7.

---

### Task 1: Just Echo access flag

**Files:**
- Create: `src/services/echo/just-echo-access.ts`
- Test: `tests/unit/echo/just-echo-access.test.ts`

**Interfaces:**
- Produces: `parseJustEchoAllowlist(raw?: string): { all: boolean; emails: Set<string> }` and `hasJustEchoAccess(email: string | undefined): boolean`

- [ ] **Step 1: Write the failing tests**

```ts
describe('JUST_ECHO_USERS', () => {
  afterEach(() => { delete process.env.JUST_ECHO_USERS; });
  it('unset or empty means nobody', () => {
    expect(hasJustEchoAccess('a@x.com')).toBe(false);
    process.env.JUST_ECHO_USERS = '  ';
    expect(hasJustEchoAccess('a@x.com')).toBe(false);
  });
  it('matches listed emails case-insensitively, trimmed', () => {
    process.env.JUST_ECHO_USERS = ' Founder@TryEchoMe.com , b@x.com';
    expect(hasJustEchoAccess('founder@tryechome.com')).toBe(true);
    expect(hasJustEchoAccess('B@X.COM')).toBe(true);
    expect(hasJustEchoAccess('c@x.com')).toBe(false);
  });
  it('* lets everyone in, but never a missing email', () => {
    process.env.JUST_ECHO_USERS = '*';
    expect(hasJustEchoAccess('anyone@x.com')).toBe(true);
    expect(hasJustEchoAccess(undefined)).toBe(false);
  });
  it('reads the env at call time', () => {
    process.env.JUST_ECHO_USERS = 'a@x.com';
    expect(hasJustEchoAccess('a@x.com')).toBe(true);
    process.env.JUST_ECHO_USERS = 'b@x.com';
    expect(hasJustEchoAccess('a@x.com')).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npx jest tests/unit/echo/just-echo-access.test.ts`. Expected: FAIL, because the module is not found.
- [ ] **Step 3: Implement** both functions, mirroring `parseGmailAllowlist` in `src/services/gmail/gmail-beta-access.ts`. A `*` entry anywhere in the list sets `all`.
- [ ] **Step 4: Run** the test again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(echo): JUST_ECHO_USERS access flag`

---

### Task 2: Conversations schema and store

**Files:**
- Create: `supabase/migrations/20261127_echo_conversations.sql`
- Create: `src/services/echo/conversations.ts`
- Test: `tests/unit/echo/conversations.test.ts` (mock `@/utils/supabase` the way `tests/unit/echo/action-log.test.ts` does)

**Schema (exact):**

```sql
-- Just Echo durable conversations (spec 2026-11-27 §6.1, §10.3, §10.4).
-- Service role only. Railway runs no migrations: apply to staging and prod by hand.
CREATE TABLE IF NOT EXISTS public.echo_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  thumbnail_url text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS echo_conversations_user_updated_idx
  ON public.echo_conversations (user_id, updated_at DESC) WHERE archived = false;

CREATE TABLE IF NOT EXISTS public.echo_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.echo_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','event')),
  content text NOT NULL DEFAULT '',
  event jsonb,
  confirm_state text CHECK (confirm_state IN ('pending','running','confirmed','cancelled','expired','failed')),
  action_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS echo_messages_conversation_created_idx
  ON public.echo_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.echo_conversation_jobs (
  conversation_id uuid NOT NULL REFERENCES public.echo_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('generation','video')),
  job_id text NOT NULL,
  state text NOT NULL DEFAULT 'processing' CHECK (state IN ('processing','ready','failed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, job_type, job_id)
);
CREATE INDEX IF NOT EXISTS echo_conversation_jobs_open_idx
  ON public.echo_conversation_jobs (user_id) WHERE completed_at IS NULL;

ALTER TABLE public.echo_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.echo_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.echo_conversation_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.echo_conversations FROM anon, authenticated;
REVOKE ALL ON public.echo_messages FROM anon, authenticated;
REVOKE ALL ON public.echo_conversation_jobs FROM anon, authenticated;
```

**Interfaces:**
- Produces, in `conversations.ts`:
  - `type MessageRole = 'user' | 'assistant' | 'event'`
  - `type EchoEvent = { type: 'receipt'; verb: string; label: string; link?: string; panel?: PanelTarget } | { type: 'confirm'; tool: string; preview: string; token: string; expiresAt: number } | { type: 'upgrade'; message: string; status: 402 | 403 } | { type: 'job_done'; jobType: 'generation' | 'video'; jobId: string; state: 'ready' | 'failed'; label: string; panel?: PanelTarget }`
    - `PanelTarget` is imported as a type from `./panel-targets` (Task 3). Until Task 3 lands, declare it locally as `type PanelTarget = { kind: string; id?: string; filter?: Record<string, string> }` and switch to the import in Task 3.
  - `interface StoredMessage { id; conversationId; role; content; event: EchoEvent | null; confirmState: string | null; actionId: string | null; createdAt }`
  - `createConversation(userId): Promise<{ id: string }>`
  - `getConversation(userId, id): Promise<ConversationRow | null>`. This is the ownership check: filter on both `id` and `user_id`, and return null when either does not match.
  - `listConversations(userId, opts: { limit: number; before?: string }): Promise<ConversationSummary[]>`, where `ConversationSummary = { id; title: string | null; updatedAt; thumbnailUrl: string | null; jobRunning: boolean }`. Non-archived only, newest `updated_at` first. `jobRunning` is true when the conversation has a job row with `completed_at IS NULL` and `created_at` in the last 24h.
  - `appendMessage(userId, conversationId, msg: { role; content?; event?; confirmState?; actionId? }): Promise<StoredMessage>`. Also bumps `echo_conversations.updated_at`.
  - `listMessages(userId, conversationId, opts: { limit: number }): Promise<StoredMessage[]>`, oldest first, returning the last `limit`.
  - `updateConversation(userId, id, patch: { title?: string; archived?: boolean; thumbnailUrl?: string }): Promise<boolean>`
  - `toModelHistory(messages: StoredMessage[]): Anthropic.Messages.MessageParam[]`
  - `MODEL_HISTORY_LIMIT = 24`

- [ ] **Step 1: Write the failing tests** (Review Focus 3 and 4)

```ts
it('getConversation filters on id AND user_id', async () => {
  // build a chain mock; assert .eq('id','c-1') and .eq('user_id','u-1') were both called
});
it('toModelHistory drops leading assistant/event rows so history starts with user', () => {
  const h = toModelHistory([msg('assistant', 'hi'), msg('user', 'make a post')]);
  expect(h[0].role).toBe('user');
});
it('toModelHistory merges consecutive same-role rows (failed turn left two user rows)', () => {
  const h = toModelHistory([msg('user', 'a'), msg('user', 'b'), msg('assistant', 'ok')]);
  expect(h.map((m) => m.role)).toEqual(['user', 'assistant']);
  expect(h[0].content).toBe('a\n\nb');
});
it('toModelHistory folds events into assistant text lines and never includes tokens', () => {
  const h = toModelHistory([
    msg('user', 'post it'),
    evt({ type: 'confirm', tool: 'post_now', preview: 'Post to IG', token: 'SECRET', expiresAt: 1 }),
    evt({ type: 'receipt', verb: 'OPENED', label: 'My kit' }),
  ]);
  expect(h).toHaveLength(2);
  expect(h[1].role).toBe('assistant');
  expect(JSON.stringify(h)).not.toContain('SECRET');
  expect(h[1].content).toContain('OPENED My kit');
});
it('toModelHistory keeps only the last 24 rows before normalising', () => { /* 30 rows in, <=24 used */ });
it('listConversations marks jobRunning from open job rows under 24h old', async () => { /* … */ });
```

- [ ] **Step 2: Run** `npx jest tests/unit/echo/conversations.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the migration file and `conversations.ts`. Event folding writes one line per event as `[<VERB or type> <label or tool>]`. A confirm event folds to `[asked to confirm <tool>]`, and its `preview` text is allowed. A trailing user message is fine; the loop appends the new user turn after the history.
- [ ] **Step 4: Run** the test again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(echo): durable conversations schema and store`

---

### Task 3: One registry: ECHO_ONLY tier, panel targets, echo-only tools

**Files:**
- Create: `src/services/echo/panel-targets.ts`
- Create: `src/services/echo/echo-only-tools.ts`
- Create: `src/services/echo/unified-registry.ts`
- Modify: `src/services/mcp/tiers.ts`. Add `ECHO_ONLY`, remove `get_recent_actions` from `MCP_EXCLUDED` (it now lives in `ECHO_ONLY`), and keep the `navigate`, `get_page_context` and `schedule_posts` exclusions (the old registry still has them).
- Modify: `src/services/echo/tools/types.ts`. Add the optional `panel?: PanelTarget` to `ToolContext` (type import only).
- Modify: `src/services/echo/conversations.ts`. Switch to the real `PanelTarget` import.
- Test: `tests/unit/mcp/tiers.test.ts` (update deliberately), `tests/unit/echo/unified-registry.test.ts`, `tests/unit/echo/panel-targets.test.ts`

**Interfaces:**
- Produces:
  - `type PanelKind = 'kit' | 'clips' | 'carousel' | 'calendar' | 'voice' | 'list'`
  - `type PanelTarget = { kind: PanelKind; id?: string; filter?: Record<string, string> }`
  - `panelTargetSchema` (zod; id max 100; filter is up to 5 string entries, each max 100)
  - `panelTargetFor(toolName: string, result: ToolResult): PanelTarget | null`
  - `ECHO_ONLY = ['open_panel', 'get_panel_context', 'get_recent_actions'] as const`
  - `ECHO_ONLY_TOOLS: EchoTool[]`
  - `buildEchoRegistry(): EchoTool[]`, which returns `[...MCP_TOOLS, ...ECHO_ONLY_TOOLS]`
  - `getEchoTool(name): EchoTool | undefined`

**`panelTargetFor` mapping (exact):**

| Tool | Target |
|---|---|
| `open_panel` | `result.data.panel` |
| receipt `link` matching `^/app/library/([^/?#]+)` | `{ kind: 'kit', id: <match> }` |
| `make_clips_from_video` with `data.uploadId` | `{ kind: 'clips', id: data.uploadId }` |
| `list_scheduled_posts`, `schedule_post`, `cancel_scheduled_post` | `{ kind: 'calendar' }` |
| `get_voice_rules`, `get_voice_strength`, `get_voice_brief`, `set_voice_rules`, `add_kb_source`, `search_knowledge_base` | `{ kind: 'voice' }` |
| `list_kits`, `list_drafts`, `list_recent_posts` | `{ kind: 'list', filter: { source: <toolName> } }` |
| anything else | `null` |

When a row matches both a tool rule and the link rule, the tool rule wins. The rows are checked in table order.

- [ ] **Step 1: Write the failing tests**

```ts
// tiers.test.ts: MCP counts stay pinned; add
it('pins the Echo-only tier', () => {
  expect([...ECHO_ONLY]).toEqual(['open_panel', 'get_panel_context', 'get_recent_actions']);
});
it('MCP never exposes an Echo-only tool', () => {
  for (const name of ECHO_ONLY) expect(MCP_TOOLS.find((t) => t.name === name)).toBeUndefined();
});

// unified-registry.test.ts
it('Echo registry = every MCP tool + Echo-only, 32 tools, no duplicates', () => {
  const names = buildEchoRegistry().map((t) => t.name);
  expect(names).toHaveLength(32);
  expect(new Set(names).size).toBe(32);
  expect([...names].sort()).toEqual([...MCP_READ, ...MCP_WRITE, ...MCP_CONFIRM, ...ECHO_ONLY].sort());
});
it('old Echo tool names are gone from the new registry', () => {
  const names = buildEchoRegistry().map((t) => t.name);
  for (const old of ['navigate', 'get_page_context', 'schedule_posts']) expect(names).not.toContain(old);
});
it('get_panel_context returns ctx.panel or an empty panel', async () => {
  const tool = getEchoTool('get_panel_context')!;
  expect((await tool.handler({ userId: 'u', sessionId: 's', panel: { kind: 'kit', id: 'k1' } }, {})).data)
    .toEqual({ panel: { kind: 'kit', id: 'k1' } });
  expect((await tool.handler({ userId: 'u', sessionId: 's' }, {})).data).toEqual({ panel: null });
});
it('open_panel rejects an unknown kind', () => {
  expect(getEchoTool('open_panel')!.inputSchema.safeParse({ kind: 'billing' }).success).toBe(false);
});

// panel-targets.test.ts: one case per table row, including the precedence case:
// make_clips_from_video with uploadId AND a /app/library link -> clips
```

- [ ] **Step 2: Run** `npx jest tests/unit/mcp/tiers.test.ts tests/unit/echo/unified-registry.test.ts tests/unit/echo/panel-targets.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `open_panel` takes `panelTargetSchema` as input and returns the receipt `{ verb: 'OPENED', label: <kind> }` with data `{ panel }`.
  - Its description: `Show something in the panel beside the chat: a kit, clips, carousel, calendar, voice, or a list. Use this instead of describing content in your reply.`
  - `get_recent_actions` reuses the existing tool object from `src/services/echo/tools/meta.ts` (import `metaTools` and pick it by name); it is not a copy.
- [ ] **Step 4: Run** the same tests, then `npx jest tests/unit/mcp tests/unit/echo`. Expected: all PASS, and the old Echo tests are untouched.
- [ ] **Step 5: Commit** `feat(echo): unified tool registry with ECHO_ONLY tier and panel targets`

---

### Task 4: Conversation turn loop

**Files:**
- Create: `src/services/echo/conversation-loop.ts`
- Modify: `src/services/echo/sse.ts`. Add new event variants only; leave the existing variants and functions alone.
- Test: `tests/unit/echo/conversation-loop.test.ts` (inject `anthropic` and `tools` the way `tests/unit/echo/loop.test.ts` does, and mock `conversations`, `action-log` and `conversation-jobs`)

**Interfaces:**
- Consumes:
  - From Task 2: `appendMessage`, `listMessages`, `toModelHistory`, `MODEL_HISTORY_LIMIT`, `updateConversation`, `getConversation`
  - From Task 3: `buildEchoRegistry`, `panelTargetFor`, `PanelTarget`
  - From Task 6: `linkJobFromResult(userId, conversationId, toolName, data): Promise<void>`. Mock it in this task's tests. Until Task 6 lands, a stub file `conversation-jobs.ts` that exports a no-op is acceptable; Task 6 replaces it.
  - Existing: `toAnthropicTools` from `tools/registry.ts`, `summarizeArgs` from `loop.ts`, `createAction` and `finishAction`, `mcpTier`, `MCP_HEAVY_TOOLS`, `mcpHeavyToolLimiter`, and `AppError`.
- Produces:
  - New `EchoSSEEvent` variants:
    - `{ type: 'conversation'; id: string }`
    - `{ type: 'panel'; toolCallId: string; target: PanelTarget }`
    - `{ type: 'confirm_pending'; messageId: string; tool: string; preview: string; expiresAt: number }`
    - `{ type: 'upgrade'; message: string; status: 402 | 403 }`
    - `{ type: 'title'; title: string }`
  - `ECHO_CONFIRM_PRINCIPAL = 'echo:web'`
  - `CONVERSATION_SYSTEM_PROMPT` (exported for tests)
  - `runConversationTurn(params: { userId; conversationId; message; panel?: PanelTarget; emit }, deps?: { anthropic?; tools? }): Promise<void>`

**Behaviour (decisions the tests pin):**
- Order of a turn:
  1. Emit `conversation`.
  2. Store the user message.
  3. Build the model history from the last `MODEL_HISTORY_LIMIT` stored rows plus the new message.
  4. Run the loop. Keep `MAX_ITERATIONS` 8 and `MAX_TURN_TOKENS` 60 000, and import both from `loop.ts`.
  5. Store the assistant text as one row.
  6. Emit `done`.
  7. Generate the title (first turn only).
- `ToolContext` is `{ userId, sessionId: 'echo:' + conversationId, principalId: ECHO_CONFIRM_PRINCIPAL, panel }`.
- System prompt: it is the existing `loop.ts` prompt with these changes:
  - "Outputs live on pages; tools return links, and the UI shows receipts that deep-link to them" becomes "Outputs open in the panel beside the chat. Call open_panel to show something; never paste it into your reply."
  - `get_page_context` becomes `get_panel_context`.
  - A new rule is added: "Posting, scheduling, cancelling and deleting show the user a preview with Confirm and Cancel buttons. Call the tool once with its normal arguments; the user confirms in the app, never in chat."
- A model tool call whose input has `confirmation_token` is refused before the handler runs. Its `tool_result` is `is_error` with `Confirmation happens in the app, not in chat.`, and no handler is called (Review Focus 1).
- A confirm-tier result (`data.needs_confirmation === true`) is intercepted. The loop stores an event row `{ type: 'confirm', tool, preview, token, expiresAt }` with `confirmState: 'pending'` and emits `confirm_pending` without the token. The model gets `{ shown_to_user: true, preview }`, which carries no token and no `confirmation_token` key.
- After any successful tool result:
  - Store a receipt event (with `panel` when `panelTargetFor` gives one, and `actionId`).
  - Emit `tool_done`, then `panel` if there is a target.
  - Call `linkJobFromResult`.
  - If `data.thumbnail_url` or `data.thumbnailUrl` is a string, call `updateConversation(..., { thumbnailUrl })`.
- Heavy tools (`MCP_HEAVY_TOOLS`) are checked with `mcpHeavyToolLimiter.hit(userId)`. When it refuses, the `tool_result` is `is_error` and reads `Hourly limit reached for <tool>. Try again in <n> minutes.`
- A tool that throws an `AppError` with status 402 or 403:
  - The loop stores an event `{ type: 'upgrade', message: err.message, status }` and emits `upgrade`.
  - The model gets `is_error` with `Blocked by the user's plan: <message>. Tell them in one sentence; the upgrade link is already shown.`
  - Any other error is handled the way `loop.ts` does it.
- Title: runs only when the conversation's `title` is null after the first assistant reply.
  - Call `callClaude({ model: MODELS.HAIKU, max_tokens: 30, ... }, { label: 'echo-title' })` with the prompt `Title this conversation in 3 to 6 plain words. No quotes, no ending punctuation, no em dashes. Reply with the title only.`
  - Strip quotes and trailing punctuation, replace any `—` with `-`, and cap at 60 characters.
  - If the call fails, fall back to the first 60 characters of the user message.
  - Then call `updateConversation` and emit `title`.
- Loop failure: the loop stores whatever assistant text exists and emits `error` with `loop_failed` and the same message `loop.ts` uses. It never throws.

- [ ] **Step 1: Write the failing tests**

```ts
it('refuses a model-supplied confirmation_token without calling the handler', async () => {
  const handler = jest.fn();
  const tools = [fakeTool('post_now', handler)];
  const anthropic = scripted([toolUse('post_now', { confirmation_token: 'x' }), text('ok')]);
  await runConversationTurn(params(), { anthropic, tools });
  expect(handler).not.toHaveBeenCalled();
  expect(lastToolResult(anthropic)).toMatchObject({ is_error: true });
});
it('stores a confirm preview with its token, but neither the model nor the stream sees the token', async () => {
  const tools = [fakeTool('post_now', async () => ({ receipt: { verb: 'PREVIEW', label: 'p' },
    data: { needs_confirmation: true, preview: 'Post to Instagram now', confirmation_token: 'TOK', expires_in_seconds: 300 } }))];
  const events: unknown[] = [];
  const anthropic = scripted([toolUse('post_now', { kitId: 'k' }), text('Confirm above.')]);
  await runConversationTurn(params({ emit: (e) => events.push(e) }), { anthropic, tools });
  expect(appendMessage).toHaveBeenCalledWith('u-1', 'c-1', expect.objectContaining({
    role: 'event', confirmState: 'pending', event: expect.objectContaining({ type: 'confirm', token: 'TOK' }) }));
  expect(JSON.stringify(events)).not.toContain('TOK');
  expect(JSON.stringify(anthropic.calls)).not.toContain('TOK');
});
it('emits a panel event and stores it on the receipt for a kit link', async () => { /* receipt.link /app/library/k1 -> panel {kind:'kit',id:'k1'} */ });
it('renders a 402 from a tool as an upgrade event, not a failure', async () => { /* AppError('Upgrade to Studio', 402) */ });
it('blocks a heavy tool past the hourly limit', async () => { /* mock limiter.hit -> false */ });
it('sets the title once, from MODELS.HAIKU, with no em dash', async () => { /* callClaude mock returns '"Weekly — plan."' -> 'Weekly - plan' */ });
it('does not retitle a conversation that already has one', async () => { /* … */ });
it('builds history from stored rows and appends the new user turn last', async () => { /* … */ });
it('on an Anthropic failure stores partial text and emits loop_failed without throwing', async () => { /* … */ });
```

- [ ] **Step 2: Run** `npx jest tests/unit/echo/conversation-loop.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `conversation-loop.ts` and the new SSE variants.
- [ ] **Step 4: Run** `npx jest tests/unit/echo`. Expected: all PASS, including the untouched `loop.test.ts` and `sse.test.ts`.
- [ ] **Step 5: Commit** `feat(echo): persistent conversation turn loop with in-app token confirms`

---

### Task 5: Confirm and receipt actions (no model)

**Files:**
- Create: `src/services/echo/conversation-actions.ts`
- Test: `tests/unit/echo/conversation-actions.test.ts`

**Interfaces:**
- Consumes: Task 2 store, Task 3 `getEchoTool` and `panelTargetFor`, Task 4 `ECHO_CONFIRM_PRINCIPAL`, the existing `createAction` and `finishAction`
- Produces:
  - `resolveConfirm(userId, conversationId, messageId, approved: boolean): Promise<{ state: 'confirmed' | 'cancelled' | 'expired' | 'failed' | 'already_resolved'; receipt?: EchoEvent; panel?: PanelTarget; message?: string }>`
  - `postReceipt(userId, conversationId, r: { verb: string; label: string; link?: string; panel?: PanelTarget; actionId?: string }): Promise<StoredMessage>`
  - `publicMessage(m: StoredMessage, nowSec?: number): PublicMessage`. This is the only shape any endpoint returns. It strips `event.token`, and maps `confirmState 'pending'` to `'expired'` when `event.expiresAt < now`.

**Behaviour:**
- `resolveConfirm`:
  1. Load the message, filtered by `conversation_id` and `user_id`, `role = 'event'`, `event.type = 'confirm'`. If none is found, throw `AppError('Not found', 404)`.
  2. Claim it with a conditional update `confirm_state = 'running'` where `confirm_state = 'pending'` (`.eq('confirm_state','pending')` with `.select()`). If no row comes back, return `already_resolved` and do nothing else.
  3. If `approved` is false, set `cancelled` and store the receipt `SKIPPED` / `<tool words> cancelled`.
  4. If `expiresAt < now`, set `expired` and return `message: 'That preview expired. Ask Echo again.'`
  5. Otherwise call `getEchoTool(event.tool).handler({ userId, sessionId: 'echo:' + conversationId, principalId: ECHO_CONFIRM_PRINCIPAL }, { confirmation_token: event.token })`, wrapped in `createAction` and `finishAction`.
  6. On success: set `confirmed`, store the receipt event (with panel and actionId), and return it.
  7. On `McpUserError` or an `AppError` below 500: set `failed`, return its message, and record nothing else. An expired or used token from MCP lands here too.
  8. On any other error: set `failed` and return the message `That did not go through. Nothing was posted.` Return it rather than throwing.
- `postReceipt` validates `verb` against `/^[A-Z ]{2,20}$/`, caps `label` at 120 characters, requires `link` to start with `/app`, and validates `panel` with `panelTargetSchema`. On bad input it throws `AppError(…, 400)`. It also bumps `updated_at` through `appendMessage`.

- [ ] **Step 1: Write the failing tests** (Review Focus 2)

```ts
it('a second resolve of the same message does nothing', async () => {
  // conditional update returns [] on the second call
  expect((await resolveConfirm('u', 'c', 'm', true)).state).toBe('already_resolved');
  expect(handler).not.toHaveBeenCalled();
});
it('an expired preview never calls the tool', async () => { /* expiresAt in the past -> 'expired', handler not called */ });
it('passes only the stored token to the tool, with the echo:web principal', async () => {
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ principalId: 'echo:web' }), { confirmation_token: 'TOK' });
});
it('declining stores a SKIPPED receipt and never calls the tool', async () => { /* … */ });
it('a token MCP rejects (used/expired) becomes state failed with MCP\'s user message', async () => { /* handler throws McpUserError */ });
it('publicMessage never includes the token and shows lapsed pending confirms as expired', () => {
  const pub = publicMessage(confirmMsg({ token: 'TOK', expiresAt: 100 }), 200);
  expect(JSON.stringify(pub)).not.toContain('TOK');
  expect(pub.confirmState).toBe('expired');
});
it('postReceipt rejects a non-/app link and a lowercase verb', async () => { /* 400s */ });
```

- [ ] **Step 2: Run** `npx jest tests/unit/echo/conversation-actions.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(echo): confirm and receipt actions that survive deploys`

---

### Task 6: Job links and settling

**Files:**
- Create or replace: `src/services/echo/conversation-jobs.ts`
- Test: `tests/unit/echo/conversation-jobs.test.ts`

**Interfaces:**
- Consumes: Task 2 store; `getMcpTool('get_kit_status')` from `src/services/mcp/tools.ts`. Its handler accepts a kit id, upload id or request id and returns `data.state` (`processing` / `ready` / `failed`), `progress_percent`, `kit_id`, `title` and `link`.
- Produces:
  - `linkJobFromResult(userId, conversationId, toolName, data: unknown): Promise<void>`
  - `settleJobs(userId, conversationId): Promise<JobView[]>`, where `JobView = { jobType: 'generation' | 'video'; jobId: string; state: 'processing' | 'ready' | 'failed'; progressPercent: number | null; panel: PanelTarget | null }`

**Behaviour:**
- Linking rules:
  - `data.uploadId` (string) links as `video`.
  - Otherwise, `data.requestId` (string) links as `generation`.
  - Anything else does nothing.
  - The insert uses upsert on the primary key with ignoreDuplicates.
  - A linking failure is logged and swallowed; it never fails the turn.
- `settleJobs` lists every job row for the conversation. For rows with `completed_at IS NULL`, it calls the `get_kit_status` handler with `{ kitId: job_id }` (ctx `{ userId, sessionId: 'echo:' + conversationId }`).
  - The first time a row reaches `ready` or `failed`, it sets `state` and `completed_at` and appends one event `{ type: 'job_done', jobType, jobId, state, label, panel }`. The label is the kit title, or `Your kit` / `Your clips` when there is none.
  - The panel is `{ kind: 'clips', id: jobId }` for video, and `{ kind: 'kit', id: kit_id }` for generation when `kit_id` is set.
  - Make the transition idempotent with a conditional update `.is('completed_at', null)`, and append the event only when that update returned a row.
  - A status lookup that throws leaves the row as `processing`.
  - Settled rows are returned from stored state without calling the tool.

- [ ] **Step 1: Write the failing tests**

```ts
it('links uploadId as video and requestId as generation, ignores the rest', async () => { /* … */ });
it('a ready job posts exactly one job_done event even when settled twice concurrently', async () => {
  // second conditional update returns no row -> no second appendMessage
});
it('a failed status lookup leaves the job processing and posts nothing', async () => { /* … */ });
it('settled jobs are returned from the table without calling get_kit_status', async () => { /* … */ });
```

- [ ] **Step 2: Run** `npx jest tests/unit/echo/conversation-jobs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test, then `npx jest tests/unit/echo`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(echo): link jobs to conversations and settle them into the thread`

---

### Task 7: Home data

**Files:**
- Create: `src/services/echo/home-data.ts`
- Test: `tests/unit/echo/home-data.test.ts`

**Interfaces:**
- Consumes:
  - `getSchedulingService().getScheduledPosts(userId, { startDate, endDate })` and `.getUnscheduledContent(userId)`
  - `new KnowledgeBaseService().getUnifiedContent(kbId, userId)`, with the default KB found by `user_id` and `is_default = true`, the same lookup as `defaultKnowledgeBaseId` in `src/services/mcp/write-tools.ts`
  - The `get_radar_picks` handler through `getMcpTool`
  - `hasJustEchoAccess`
- Produces: `getHomeData(user: { id: string; email?: string }, q: { tz: string; now?: Date }): Promise<HomeData>`

```ts
interface HomeData {
  justEcho: boolean;
  week: { posts: Array<{ id: string; scheduledAt: string; platforms: string[]; title: string | null; status: string }> } | null;
  nextUp: { id: string; scheduledAt: string; platforms: string[]; title: string | null } | null;
  ready: { items: Array<{ kind: 'kit' | 'clip' | 'running'; id: string; title: string | null; thumbnailUrl: string | null; createdAt: string; jobType?: 'generation' | 'video' }> } | null;
  knowledge: { count: number; today: number | null; sparkline: number[] | null } | null;
  suggestions: Array<{ kind: 'open_day' | 'unclipped_video' | 'radar_pick'; label: string; id?: string }>;
}
```

**Behaviour:**
- `tz` must be a valid IANA zone (check it with `Intl.DateTimeFormat(undefined, { timeZone })` inside try/catch); fall back to `'UTC'`.
- **Week:** Monday 00:00 through next Monday 00:00 in `tz`.
- **Next up:** the first post in `week` with `scheduledAt > now` and a non-final status.
  - Final statuses are `posted`, `failed` and `cancelled`; verify the exact strings in `scheduling-service.ts`.
  - If the week has none, query the next 30 days and take the first.
- Each section runs in its own try/catch. When one throws, it is logged and becomes `null`, and the other sections are unaffected. `suggestions` becomes `[]` on failure.
- **Ready** is up to 8 items, newest first, built from:
  - `getUnscheduledContent`, as kind `kit`.
  - Ready clips not yet scheduled, as kind `clip`. The implementer verifies how a scheduled post references a clip. If no such link exists, leave clips out and add a ledger note; do not guess.
  - Running jobs in the last 24h (`generation_requests.status = 'processing'`, and `video_uploads` in a non-terminal status, where the terminal statuses are verified in code), as kind `running`.
- **Knowledge:**
  - `count = stats.totalItems` from `getUnifiedContent`. This is exactly what the Voice page shows.
  - `sparkline` is 14 daily counts of `items[].createdAt` in `tz`, oldest first, ending today. `today = sparkline[13]`.
  - If `items.length !== stats.totalItems`, both `sparkline` and `today` are `null`. Spec §10.8: never show a different number.
  - With no default KB, the result is `{ count: 0, today: 0, sparkline: Array(14).fill(0) }`.
- **Suggestions** come at most three, in this order, and each only when real:
  - `open_day` when no week post falls on today in `tz`. Label: `Nothing scheduled today`.
  - `unclipped_video`: the newest of the user's `video_uploads` that is ready or saved, not deleted, and has no `video_clips` rows. The label is its title, or `Your latest video`.
  - `radar_pick`: the first item of `get_radar_picks` with `{ limit: 1 }`. The label is the pick's title or creator.
- All copy has no em dashes.

- [ ] **Step 1: Write the failing tests** (Review Focus 5)

```ts
it('a brand-new user gets empty sections, count 0, and no suggestions except open_day', async () => { /* … */ });
it('knowledge.count is exactly stats.totalItems', async () => { /* totalItems 37, items 37 -> count 37 */ });
it('sparkline is null when items.length differs from totalItems', async () => {
  // totalItems 40, items 37
  expect(home.knowledge).toEqual({ count: 40, today: null, sparkline: null });
});
it('sparkline buckets by the user timezone, 14 entries, today last', async () => { /* item at 2026-11-27T03:00Z, tz America/Toronto -> counts on 11-26 */ });
it('one failing source nulls only its section', async () => { /* getUnifiedContent throws -> knowledge null, week intact */ });
it('never more than 3 suggestions and none without data', async () => { /* … */ });
it('an invalid tz falls back to UTC', async () => { /* … */ });
it('justEcho mirrors hasJustEchoAccess', async () => { /* … */ });
```

- [ ] **Step 2: Run** `npx jest tests/unit/echo/home-data.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(echo): home data in one call`

---

### Task 8: Just Echo routes

**Files:**
- Create: `src/routes/just-echo.ts`
- Modify: `src/index.ts`. Mount it with `app.use('/api/echo', justEchoRoutes)` directly after the existing `app.use('/api/echo', echoRoutes)` (line ~365).
- Test: `tests/unit/echo/just-echo-routes.test.ts`. Use the same express/http harness and auth/admin/stripe mocks as `tests/unit/echo/routes.test.ts`, and mock the Task 2 and 4 to 7 services.

**Endpoints.** Every endpoint runs `authenticateUser`, then `requireTier('pro')`, then a local `requireJustEcho`. Bodies are validated with zod and return the `ApiResponse` envelope.

| Method + path | Body / query | Response `data` |
|---|---|---|
| `GET /access` | (no Just Echo gate, only auth) | `{ justEcho: boolean }` |
| `GET /home` | `?tz=` | `HomeData` |
| `GET /conversations` | `?limit=1..50 (20)&before=ISO` | `{ conversations: ConversationSummary[] }` |
| `POST /conversations` | none | `{ id }` |
| `GET /conversations/:id` | `?limit=1..200 (100)` | `{ conversation, messages: PublicMessage[], jobs: JobView[] }` (calls `settleJobs` first) |
| `PATCH /conversations/:id` | `{ title?: 1..60, archived?: boolean }` | `{ ok: true }` |
| `POST /conversations/:id/messages` | `{ message: 1..4000 trimmed, panel?: PanelTarget }` | SSE via `runConversationTurn` |
| `POST /conversations/:id/confirms/:messageId` | `{ approved: boolean }` | result of `resolveConfirm` |
| `POST /conversations/:id/receipts` | `{ verb, label, link?, panel?, actionId? }` | `{ message: PublicMessage }` |

- `requireJustEcho` returns 404 `Not found` when `hasJustEchoAccess(req.user.email)` is false. It lives in this file, not `src/middleware/`.
- `:id` and `:messageId` must be UUIDs; anything else gets 404. Every `:id` route calls `getConversation(userId, id)` first and returns 404 when it gets null.
- `POST …/messages` does all its checks before `openSSE`: zod, ownership, and then `checkAndCountLoopTurn`, which returns 429 with the same message as `/chat`. Nothing after `openSSE` may throw. This is the pattern `routes/echo.ts` uses.
- The `/classify`, `/chat` and `/chat/confirm` routes on the old router are untouched, and their tests still pass. No path collides.

- [ ] **Step 1: Write the failing tests**

```ts
it('404s every Just Echo route for a user not on JUST_ECHO_USERS', async () => { /* GET /home, GET /conversations, POST /conversations */ });
it('GET /access answers false/true without the gate', async () => { /* … */ });
it('404s another user\'s conversation on GET, PATCH, messages, confirms and receipts', async () => {
  // getConversation mock returns null
  for (const [method, path] of routesFor(OTHER_ID)) expect((await call(method, path)).status).toBe(404);
  expect(runConversationTurn).not.toHaveBeenCalled();
  expect(resolveConfirm).not.toHaveBeenCalled();
});
it('404s a non-uuid id without touching the store', async () => { /* … */ });
it('validates and 429s before opening the stream', async () => { /* empty message -> 400 JSON; limit hit -> 429 JSON */ });
it('streams a turn as SSE frames', async () => { /* runConversationTurn mock emits conversation, text, done */ });
it('GET /conversations/:id settles jobs and returns tokenless messages', async () => { /* … */ });
it('the old /api/echo/chat route still answers', async () => { /* mount both routers like index.ts */ });
```

- [ ] **Step 2: Run** `npx jest tests/unit/echo/just-echo-routes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `just-echo.ts` and the one-line mount.
- [ ] **Step 4: Run** `npx jest tests/unit/echo tests/unit/mcp`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(echo): Just Echo conversation, confirm, receipt and home routes`

---

### Task 9: Whole-branch verification and hand-off

**Files:** none new. This task is mostly controller work.

- [ ] **Step 1:** Run `npm test` and `npx tsc --noEmit`. Expected: green, with the same failure count as `origin/develop` if anything there is already red (record the baseline first).
- [ ] **Step 2:** Run `rtk proxy git grep -n "—" -- src/services/echo/conversation-loop.ts src/services/echo/conversation-actions.ts src/services/echo/home-data.ts src/services/echo/echo-only-tools.ts src/routes/just-echo.ts`. Expected: no matches in string literals.
- [ ] **Step 3:** Run `rtk proxy git diff origin/develop --stat -- src/middleware src/routes/auth.ts src/services/auth.service.ts src/routes/stripe.ts src/services/stripe src/services/email src/routes/webhooks src/services/echo/loop.ts src/services/echo/session-store.ts src/services/echo/confirm-manager.ts src/services/echo/tools/registry.ts src/routes/echo.ts`. Expected: empty.
- [ ] **Step 4: Stop for the user.** Apply `supabase/migrations/20261127_echo_conversations.sql` to staging and prod; this needs the user's go. Then verify in both envs that the three tables exist with RLS on.
- [ ] **Step 5: Stop for the user.** Push the branch and open a PR to `develop`, merging rather than squashing. Do not set `JUST_ECHO_USERS` on any env until Phase 3 needs it; unset means everyone gets a 404, so nothing is visible.
