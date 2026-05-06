# EchoMe Refactor Manifest: Systematic Implementation

## 🏗️ Path Grounding (Immutable)
Use these exact paths; do not invent new locations.
- **Generation Entry:** `src/lib/api-client.ts` (generation.generate, generation.getRequest)
- **Dashboard:** `src/app/app/AppContent.tsx`
- **Create Input:** `src/components/UnifiedCreateInput.tsx` + `generation-form.tsx`
- **Output Cards:** `src/components/content-kit/{OutputCard,ReelOutputCard,WrittenContentModal}.tsx`
- **Scheduling:** `src/components/scheduling/*`
- **Broadcast:** `src/components/email-editor/EmailComposeModal.tsx`

## 🚀 Systematic Build Sequence

### Phase 1: Type Definitions & Response Shapes
- **Task:** Update `src/types/index.ts` with `NinePointBreakdown`, `PsychologicalScorecard`, `SignatureMethod`, and `LeadMagnet` types.
- **Task:** Modify `src/lib/api-client.ts` to support the new `breakdown` field in the generation response.
- **Goal:** Ensure the frontend can receive the 9-point psychological data from the Railway backend.

### Phase 2: The "Invisible" Hemingway Audit
- **Task:** Create `src/lib/hemingway.ts`. [cite_start]Implement a readability checker that scores copy against the **6th-grade reading level rule** [cite: 631-633, 1599].
- **Task:** Integrate audit warnings into `EmailComposeModal.tsx` and profile field editors.
- **Goal:** Proactively simplify user-edited copy without a heavy UI.

### Phase 3: The Receipt Card & Outcome Chips
- **Task:** Build `src/components/shared/ReceiptCard.tsx`. It must replace post-action "Toasts" at 8 sites (Scheduling, Broadcast, Connected Accounts).
- **Task:** Implement `src/hooks/useDataState.ts` and `src/components/dashboard/OutcomeChips.tsx`.
- **Goal:** Move from "navigation" to "delegation" by teaching vocabulary via chips and proof-of-work via receipts.

### Phase 4: The Authority Pipeline Surface
- **Task:** Create `src/app/app/authority/` routes and `src/hooks/useAuthorityPipeline.ts`.
- **Task:** Build `PodcastPitchCard.tsx` and `EvergreenSegmentList.tsx`. 
- [cite_start]**Goal:** Surface the "Earned Media" capabilities once the backend classifies evergreen segments [cite: 2307-2310, 2330].

### Phase 5: Nurture Monitoring & Rotation
- **Task:** Implement `src/hooks/useNurtureMonitor.ts` and `src/lib/nurture-rotation.ts`.
- [cite_start]**Task:** Detect drops in upload frequency and prompt for 30-second voice notes [cite: 645-646].
- [cite_start]**Task:** Integrate background/outfit rotation tracking into `SuggestedScheduleModal.tsx` to prevent scroll fatigue [cite: 661-665].

## ⚠️ Constraint Checklist
- [cite_start]**No Stock Imagery:** Receipt Cards must flag stock photos and prioritize faces/pets [cite: 2190-2192].
- [cite_start]**Facebook Personal Toggle:** `PlatformPersonalToggle.tsx` must strip corporate branding and force Soft CTAs [cite: 228-235].
- [cite_start]**Case Study Pivot:**Closing-related content must toggle to the Catalyst -> Process -> Outcome framework [cite: 94-116, 2437-2465].