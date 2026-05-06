# EchoMe — Zero-Step Utility Implementation Manifest

This document tracks progress against the four specs in `corevaluedeepdive/` (9-Point Conversion Sequence, Outcome-Aware Filters, Authority Pipeline, Zero-Step UI Components). It exists to satisfy task #2 of the original mission and serves as the single-source progress reference.

## Original mission (verbatim)

1. Read all four spec files
2. Create global `IMPLEMENTATION_MANIFEST.md` (this file)
3. Cross-reference psychological principles for every code change
4. Audit existing prompt templates against the 9-Point Sequence
5. (Implicit) ship the work without breaking paying users

## Spec coverage at a glance

| Spec | Frontend | Backend |
|---|---|---|
| 9-Point Conversion Sequence | ✅ types, ReceiptCard rendering, breakdown passthrough | ✅ TLL principles + 9-Point structure injected into `core-prompt-system.ts` |
| Outcome-Aware Filters | ❌ Not started | ❌ Not started |
| Authority Pipeline | ❌ No surface, no types | ⚠️ `authority-hook-generator.ts` TLL-tuned for B-roll overlays; pitch kit / podcast logic not built |
| Zero-Step UI | ✅ Outcome Chips, ReceiptCard component, ReceiptHost, imperative API | N/A |

## Detailed status

### Spec 1 — 9-Point Conversion Sequence

**Frontend (shipped):**
- `src/types/index.ts` — `NinePointStep`, `NinePointStepResult` (discriminated union with strict-evidence-on-present), `NinePointBreakdown` (with `auditStatus` resilience handle and `auditError`), `PsychologicalScorecard`, `SignatureMethod`, `LeadMagnet`, `HemingwayScore`
- `src/lib/api-client.ts` — `getRequest` returns `GenerationRequestDetailWithBreakdown`, snake/camel dual lookup, defaults `auditStatus` to `'pending'` on missing field
- `src/components/shared/ReceiptCard.tsx` — renders 4-row scorecard rolled up from 9 steps with provenance pills, handles complete/pending/partial/failed/no-breakdown states

**Backend (shipped this session):**
- `src/services/generation/core-prompt-system.ts` — TLL Anti-Aggression Guards (section 6) and 9-Point structure (section 7) added to `buildCoreSystemPrompt`. Every generation now flows through these.
- `src/services/knowledge-base/kb-chat-service.ts` — `SYSTEM_PROMPT` rewritten with TLL anti-padding rules. Powers the Mind-Reader chip and all KB chat queries.

**Open:**
- Backend doesn't yet emit a structured `breakdown` field in the `/api/generate/:id` response. Frontend types are ready; backend needs to construct and persist the `NinePointBreakdown` shape during/after generation. Until this lands, all Receipt Cards render in the no-breakdown variant.
- `useTllValidator` field still being sent by frontend, ignored by backend (dead code). Decide: kill from frontend, or rebuild as a real validator pass.
- `SignatureMethod` and `LeadMagnet` need backend tables and CRUD endpoints. Currently typed but not stored.

### Spec 2 — Outcome-Aware Content Filters

**Status:** Not started.

The four-stage Case Study framework (Catalyst → Specific Challenge → Process → Desired Outcome) for closing-related content is not implemented. The "HGTV bot" rejection of Just-Listed templates is not implemented. Authenticity Audit (face-prefer, stock-photo flag) is not implemented. Facebook Personal soft-CTA toggle is not implemented.

The TLL principles in the new `core-prompt-system.ts` cover the *spirit* of these rules (anti-aggression, story-anchored framing) but no detection logic, no UI toggle, no warning surface.

**To unblock:** keyword detection at compose time (frontend), face/stock heuristic on generated images (backend), Facebook Personal platform-aware composer (frontend).

### Spec 3 — Authority Pipeline

**Frontend status:** Not started. No `/app/authority` route, no `useAuthorityPipeline` hook, no `PodcastPitchCard` component.

**Backend status:** Partial. `authority-hook-generator.ts` (B-roll text overlay) was already implementing a HOOK/TENSION/RESOLUTION/TAKEAWAY mini-funnel; this session added explicit TLL alignment (lead with symptom, soft-CTA option, no-padding). The Evergreen Expertise Extraction (2-3 minute video segment surfacing) and Podcast Pitch Kit (Heart→Tension→Resolution→Value bio + Gift DM) are not built.

**To unblock:** new backend service for podcast pitch generation, new `/app/authority` frontend surface, evergreen-segment classifier on existing clip pipeline.

### Spec 4 — Zero-Step UI Components

**Frontend (shipped):**
- `src/hooks/useDataState.ts` — three-state machine (pre / partial / full) synthesized from existing hooks
- `src/components/dashboard/OutcomeChips.tsx` — three intent-driven cards on the empty-state dashboard, brand-aligned (cyan icons, ambient glow)
- `src/components/shared/ReceiptCard.tsx` + `ReceiptHost.tsx` + `src/lib/receipt.ts` — full Receipt Card system with imperative API mirroring sonner
- `src/app/layout.tsx` — `<ReceiptHost />` mounted alongside `<Toaster />`
- `src/components/scheduling/SuggestedScheduleModal.tsx` — first toast site replaced with `receipt.show()`
- `src/app/app/voice/KBChat.tsx` — Mind-Reader chip auto-fire wired (TLL-tuned user query)

**Open:**
- 7 of 8 toast sites not yet replaced (`FanoutCalendar`, `WeekGrid`, `FailedPostsPanel`, `EventPreviewModal`, `ConnectedAccounts`, `KBUnifiedInput`, others)
- `NurtureMonitor` (proactive "Echo notices upload-frequency drop" prompt) not built
- Receipt Card pending → complete refresh contract (polling vs SSE) not wired — currently relies on backend never returning `'pending'`

## File-level cross-reference

| File | Specs touched | Phase |
|---|---|---|
| `src/types/index.ts` | 1 | 1 |
| `src/lib/api-client.ts` | 1 | 1 |
| `src/lib/hemingway.ts` | 1 (Hemingway middleware) | 2 |
| `src/components/email-editor/HemingwayPanel.tsx` | 1 | 2 |
| `src/components/email-editor/EmailComposeModal.tsx` | 1 | 2 |
| `src/components/content-kit/WrittenContentModal.tsx` | 1 | 2 |
| `src/hooks/useDataState.ts` | 4 | 3 |
| `src/components/dashboard/OutcomeChips.tsx` | 4 | 3 |
| `src/components/shared/ReceiptCard.tsx` | 1, 4 | 3 |
| `src/components/shared/ReceiptHost.tsx` | 4 | 3 |
| `src/lib/receipt.ts` | 4 | 3 |
| `src/app/layout.tsx` | 4 | 3 |
| `src/app/app/AppContent.tsx` | 4 | 3 |
| `src/components/scheduling/SuggestedScheduleModal.tsx` | 4 | 3 |
| `src/app/app/voice/KBChat.tsx` | 1, 4 | 3 |
| *(backend)* `core-prompt-system.ts` | 1 | 4 |
| *(backend)* `kb-chat-service.ts` | 1, 4 | 4 |
| *(backend)* `authority-hook-generator.ts` | 3 | 4 |

## Anti-aggression alignment

The original session noted "past TLL implementations were too aggressive." Every shipped change has been audited against this concern:

- **Hemingway middleware** never blocks `Send`. Soft nudge only.
- **ReceiptCard** has `auditStatus: 'pending' | 'partial' | 'failed' | 'complete'` so the UI never blocks content delivery on a slow audit.
- **Mind-Reader prompt** has explicit anti-padding rule: *"if you can't find 3 angles, return only what fits."*
- **`core-prompt-system.ts` Section 6** encodes seven anti-aggression guards including the headache-not-blood-clot rule, conditional CTAs, three-criterion personal-story filter, and "speak to the 97%, not the top 3%."
- **`kb-chat-service.ts` SYSTEM_PROMPT** explicitly overrides "be helpful at any cost" with the no-fabrication rule.

The ten anti-aggression rules in `docs/2026-05-06-tll-methodology.md` are the canonical reference. The 21 [CRITICAL — anti-aggression] callouts in `docs/tll-methodology-enrichment.md` provide quote-level depth.

## Open items, ranked by leverage

1. **Backend emits `breakdown` field** — single biggest unlock. Without it, the entire 9-Point UI surface (provenance pills, scorecard, Mind-Reader effect) renders as no-breakdown variants on prod.
2. **Replace remaining 7 toast sites with Receipt Cards** — extends the receipt-of-action pattern across the app.
3. **Audit + decide on `useTllValidator` dead field** — either kill or rebuild.
4. **`SignatureMethod` + `LeadMagnet` backend tables and endpoints** — frontend types stub these but they're un-stored.
5. **Outcome-Aware Filters (Spec 2)** — keyword detection, Case Study framework toggle, FB Personal soft-CTA. Not started.
6. **Authority Pipeline frontend (Spec 3)** — `/app/authority` route, podcast pitch kit UI. Not started.
7. **Calendar's TLL-aligned recommendation engine** — current logic balances 4 categories; TLL canonicalizes 9.
8. **Nurture Monitor** — proactive "Echo notices upload-frequency drop" prompt.
9. **Receipt Card pending refresh contract** — polling vs SSE, decide before backend ships partial audits.

## Reference docs

- `docs/2026-05-05-echo-voice.md` — voice and presence guide
- `docs/2026-05-06-tll-methodology.md` — canonical TLL spec (~2 pages)
- `docs/tll-methodology-enrichment.md` — depth layer from 48 training transcripts (~5 pages)
- `corevaluedeepdive/*.md` — original four spec files
- `corevaluedeepdive/receipt-card-preview.html` — design sandbox
- *(backend)* `docs/EchoMe — Operating Briefing (May 2026).md` — current product snapshot

## Maintenance

Update this manifest when:
- A new spec area is started, finished, or descoped
- A file is added that implements one of the four specs
- An open item is closed (move to "shipped" with the commit hash)

Keep it concise. Detailed implementation notes belong in commit messages and the methodology doc.
