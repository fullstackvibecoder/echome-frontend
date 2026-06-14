# Echo v2: Tool-Calling Engine

**Date:** 2026-06-12
**Status:** Approved pending final review
**Scope:** Echo copilot capability overhaul — backend engine (`echome-platform-v2`) + pill upgrade (`echome-frontend`). Successor to the 2026-06-10 platform redesign spec; assumes Pass 2c is GA (it is, as of 2026-06-12).

## Context & Goal

Pass 2c shipped Echo v1: a classify-and-dispatch pill (create / ingest / question / command) that GA'd to all users on 2026-06-12. The April "chat-drives-everything" vision is now in reach. This project builds the engine for it.

**The reframe that shaped this design:** chat drives everything does NOT mean chat replaces pages. All pages where outputs live remain. Chat never displays results. Echo becomes able to *do* everything; outcomes land as Closr-style linked receipts that deep-link to the page where the output lives. The capped-exchange rule from the 2026-06-10 spec stays structural.

**Capability bar:** full app drivability. Every meaningful user action gets a sentence equivalent — content edits, regeneration, voice corrections, clip operations, scheduling, posting, navigation. Excluded permanently: billing/Stripe, auth, email sending, admin operations (sensitive paths get no tools).

## Decision Log

| Decision | Choice |
|---|---|
| Output display | Pages only, never chat. Receipts deep-link to outputs |
| IA / nav | Untouched. No page or nav removal in this project |
| Capability scope | Full drivability (content, clips, distribution, voice, radar, account-read, navigation) |
| Client strategy | Web-first; one `/api/echo/chat` contract designed for web + iOS, iOS adopts in a later release |
| Conversation memory | Session memory (in-memory, dies on tab close/deploy) + persistent server-side action log queryable as a tool. No persistent chat threads — rejected to avoid rebuilding the March transcript failure |
| Confirmation policy | Risk-tiered: reads + reversible writes auto-execute; outward-facing (post_now, schedule_post) and destructive (delete_*) always confirm via chip |
| Long-running work | Live receipts with SSE interim progress; jobs ride a persistent user events channel |
| Engine architecture | Hand-rolled server-side agentic loop (Option A). Fat-classifier dispatch rejected as a dead end; Agent SDK runtime rejected for control over confirm-pause, cost, and Railway fit |
| Rollout | Existing release policy (develop → staging smoke → main) + new admin-only `echoV2` flag for prod soak. Staging validates blast radius (migrations, tool execution); admin soak validates quality on real data |
| Model | Sonnet for the loop; existing classifier stays as fast path |

## Architecture

### Engine core (backend)

- **Route:** `POST /api/echo/chat`, SSE response. Existing JWT middleware and subscription gating. Request: `{ sessionId, message, pageContext?, attachmentRefs? }`.
- **Loop:** hand-rolled tool-use loop (~300 lines) around the Anthropic SDK. Model context: system prompt + voice context + page context + session history + tool registry. Think → call tool → observe → repeat. Max 8 tool iterations, hard per-turn token ceiling. All events stream over SSE as they occur.
- **Session memory:** in-memory LRU keyed by `sessionId`. Last 12 messages max enter context. Dies on tab close or deploy — deliberately ephemeral. Durable state lives in the action log, voice profile, and kits. No sessions table, no Redis.
- **Fast path:** the existing classify endpoint stays. Single-action utterances with obvious intent (v1's create/ingest/question/command) skip the loop entirely — identical latency and cost to today. The loop engages only when the classifier reports `complex` or low confidence. The fast path is also the permanent kill switch: `echoV2` off = pill behaves exactly as today.

### Tool registry

Each tool is a TypeScript module: `{ name, description, inputSchema (zod), riskTier: 'auto' | 'confirm', handler(ctx, args) }`. Handlers call services directly — never HTTP loopback. Registry is assembled per request with tier gating (subscription checks reused as guard functions). ~30 tools in 7 packs:

| Pack | Tools | Tier |
|---|---|---|
| Content | generate_kit, regenerate_kit, edit_kit_section, get_kit, list_kits | auto |
| Clips | clip_video, get_clip_status, recrop_clip, burn_captions, set_thumbnail | auto |
| Distribution | schedule_post, post_now, list_scheduled, move_scheduled, cancel_scheduled | post_now + schedule_post confirm; rest auto |
| Voice/KB | ingest_text, ingest_url, search_voice, ask_voice, voice_correction, get_voice_strength | auto |
| Radar | get_suggestions, dismiss_suggestion | auto |
| Account | get_usage, update_preferences | auto |
| Meta | get_recent_actions, navigate, get_page_context | auto |

Notes:
- `schedule_post` is confirm-tier despite being cancelable: it commits a future outward action. Cancel/move stay auto.
- `voice_correction` is the "I'd never say 'folks'" path — writes to the AI blacklist / signature phrases.
- `navigate` is a client-side tool: the loop emits an SSE event and the pill routes the app.
- Any future `delete_*` tool defaults to confirm tier.
- No tools, ever: billing/Stripe, auth, email sending, admin operations.

### Wire protocol

Two SSE channels:

**1. Per-turn chat stream** (the `POST /api/echo/chat` response body):
- `text` — assistant clarification fragments (capped exchange, never outputs)
- `tool_start { toolCallId, tool, summary }` → interim receipt appears
- `tool_done { toolCallId, receipt: { verb, label, link? } }` → receipt finalizes with deep link
- `confirm_request { toolCallId, tool, argsPreview }` → loop pauses
- `done` / `error { code, message }`

**2. Persistent user events channel** — `GET /api/events`, one per logged-in tab:
- `job_progress { jobId, stage, pct? }` — bridged from existing `status_message` DB updates
- `job_done { jobId, receipt }` — updates the receipt in place; badges the pill if the exchange is closed
- Long-running tools (e.g. clip_video) return a `jobId` immediately and end their loop turn; progress rides this channel. Client polls every 10s as fallback if the stream drops.

**Confirm-pause:** the loop awaits an in-memory promise per `toolCallId`. The pill shows a chip (e.g. `POST NOW TO LINKEDIN — CONFIRM / SKIP`). Client resolves via `POST /api/echo/chat/confirm { sessionId, toolCallId, approved }`. Two-minute timeout → tool skipped, receipt reads `SKIPPED · TIMED OUT`, loop continues with that result. A deploy mid-pause kills the promise → receipt shows `EXPIRED`, user re-issues. No persistence machinery for pending confirms — deliberate.

### Receipts + action log

New table `echo_actions` (migration; RLS disabled — backend-only table):

```
id, user_id, session_id, tool, args_summary jsonb,
status (running | done | failed | skipped | expired),
receipt_text, link_path, job_id nullable,
created_at, updated_at
```

- Row written at `tool_start`, updated at terminal state. Every receipt is the render of a row.
- `link_path` is the deep link (e.g. `/app/content-kit/...`). Receipt clicks navigate; outputs never render in chat.
- `get_recent_actions` queries this table — "what did you make yesterday" and "undo that" resolve from here, not chat history.
- Failed tools write `failed` rows with an error summary. Accountability includes failures.
- No receipts drawer UI in this project. History access is through Echo. The pill shows current-exchange receipts plus the async-completion badge.
- Retention: indefinite; rows are tiny.

### Frontend (pill upgrade)

- **useEcho state machine** gains a streaming `executing` phase: consumes the chat SSE, renders interim receipts live, raises confirm chips on `confirm_request`, supports multiple receipts per exchange.
- **Transport:** chat is `fetch` + ReadableStream (POST SSE); the events channel is one `EventSource` mounted in the app shell alongside the pill.
- **Page context provider:** small React context — `{ route, focusedEntity: { type: 'kit' | 'clip', id } }`. Detail pages register themselves. Sent with every message; this is how "make this punchier" needs no target.
- **`navigate` tool** → SSE event → `router.push`.
- **Receipt component** becomes status-aware: running (waveform pulse) → done (link) → failed/skipped (muted).
- **v1 fast paths untouched:** create handoff, ingest routing, question — current behavior preserved. The loop is additive.
- All new wire code lives in `echo-client.ts`. `api-client.ts` (protected path) is not hand-edited.
- iOS: out of scope; the API contract is the deliverable for it.

## Error Handling

- Tool handler throws → `failed` action row + failed receipt with a plain-language summary; the loop sees the error and may retry once or explain. Never a silent drop.
- Anthropic API failure mid-loop → `error` SSE event; partial receipts stand (they record actions that actually happened); exchange notes that completed work is shown above.
- SSE drop mid-turn → client reconnects the events channel; the turn reconciles from the action log (rows are the source of truth).
- Known footgun (sync-in-handler timeouts): any tool handler touching external services or doing >5s of work must go through the job path. Enforced by convention in the tool template.

## Cost Guardrails

- Max 8 tool iterations and a hard per-turn token budget; exceeded → graceful "this needs smaller steps" message.
- Fast path keeps the majority of traffic off the loop entirely.
- Session history truncation at 12 messages.
- Per-user daily loop-turn cap (generous, ~200) as runaway protection; pill shows a rate-limit message past it.
- Sonnet for the loop; the classifier stays on its current model.

## Implementation Phasing

Four sub-projects, each with its own plan → staging → soak cycle:

1. **Engine core.** `/api/echo/chat` loop, SSE protocol, confirm-pause, `echo_actions` migration, meta pack + read-only content tools. Proves the spine with zero write risk.
2. **Pill streaming upgrade.** Streaming exchange, events channel, page context provider, status receipts, navigate handling.
3. **Domain packs**, in risk order: content writes → voice/KB → clips (job bridge) → distribution (confirm tier last).
4. **GA flip** after founder soak.

## Testing & Rollout

- Unit tests per tool handler (existing backend jest setup). Loop integration tests with a mocked Anthropic client: confirm-pause, timeout, max-iterations, and error paths all covered.
- Staging smoke per release: migration applies, tool registry dry-run (every tool callable with stub args), SSE round-trip.
- Prod soak behind a new admin-only `echoV2` flag (same hook pattern as `useEchoExperience`, which stays GA'd and untouched). Flag off = pill behaves exactly as v1 today; instant kill without UX regression.
- Release policy unchanged: develop → staging smoke → main.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Loop quality disappoints on real tasks | Admin soak on real data before any user sees it; fast path means v1 quality is the floor |
| Tool bug writes bad data in prod | Staging tool dry-run; sub-project sequencing puts write tools after the spine is proven; confirm tier on outward actions |
| Token cost runaway | Iteration cap, token ceiling, daily per-user cap, fast-path triage |
| Deploy kills in-flight loop/confirm | Action log preserves what happened; receipts show EXPIRED; no pending-confirm persistence by design |
| Transcript creep (March failure) | No thread persistence exists to creep into; exchange stays capped; outputs structurally cannot render in chat |

## Out of Scope

- iOS client work (contract only)
- Billing, auth, email, admin tools
- Receipts drawer / activity feed UI
- Nav or page removal
- Persistent chat threads
- Marketing site
