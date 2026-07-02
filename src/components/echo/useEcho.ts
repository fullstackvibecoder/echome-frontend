'use client';

/**
 * useEcho.ts
 * State machine, classify, and per-intent execution for the Echo pill.
 * v1 contract: always require one explicit chip/confirm click before executing.
 */

import { useState, useCallback, useRef } from 'react';
import {
  classifyEchoInput,
  streamEchoChat,
  confirmEchoAction,
  EchoChatGateError,
  type EchoClassification,
  type EchoIntent,
} from '@/lib/echo-client';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { INTENT_META, COMMAND_ROUTE_MAP, formatReceipt, classifyFile, MAX_ECHO_AUDIO_BYTES, MAX_ECHO_TEXT_BYTES, MAX_ECHO_DOCUMENT_BYTES } from './intent-meta';
import { stashEchoHandoff } from './file-handoff';
import { extractFirstUrl, detectIngestUrlKind, detectVideoUrlTarget, type VideoUrlTarget } from '@/lib/url-platform';

// ---- State machine phases ----
export type EchoPhase =
  | 'idle'         // pill collapsed
  | 'open'         // expanded, awaiting input
  | 'classifying'  // POST /echo/classify in flight
  | 'confirming'   // classified; awaiting chip/confirm click
  | 'executing'    // intent execution in flight
  | 'answered'     // question intent: answer rendered
  | 'done';        // receipt shown, ready for next input

export interface Receipt {
  id: string;
  text: string;
}

export interface EchoState {
  phase: EchoPhase;
  inputText: string;
  /** Attached file (video, audio, or text doc) — null when none */
  attachment: File | null;
  /** Inline error specific to the attachment (type or size) */
  attachmentError: string | null;
  classification: EchoClassification | null;
  /** User-overridden intent (null = use classification.intent) */
  selectedIntent: EchoIntent | null;
  answer: string | null;
  receipts: Receipt[];
  error: string | null;
  /**
   * Loud success card shown in the 'done' phase after an ingest. null for
   * create/question/command, which navigate or render their own result, so
   * only "added to your Voice" outcomes get the confirmation.
   */
  confirmation: { title: string; detail: string | null } | null;
  /** Set when the submitted text contains a video URL (YouTube/Instagram single or channel). null otherwise. */
  videoUrlTarget: VideoUrlTarget | null;
  /** Set immediately when the user attaches a video file, triggering the file fork. null otherwise. */
  videoFileTarget: { file: File } | null;
  /** 0-100 while a "Save to clip later" upload is in flight; null otherwise. Drives the Store progress bar. */
  fileUploadProgress: number | null;
  /** Videos saved by the stockpile choice (Task 7 reads this). null until a stockpile completes. */
  savedVideos: Array<{ uploadId: string; sourceUrl: string; title: string }> | null;
  /** Count of videos saved by the most recent stockpile. null until a stockpile completes. */
  savedCount: number | null;
  /**
   * Ownership declaration for a pasted video URL. null until the user picks a chip.
   * 'self' = user owns this content; 'third_party' = repurposing someone else's.
   * Always null when there is no videoUrlTarget (forced null on each new URL submission).
   */
  videoOwnership: 'self' | 'third_party' | null;
  /** Ingest-polling phase for the Store/stockpile path. null = not in store flow. */
  ingestPhase: 'importing' | 'success' | 'failed' | null;
  /**
   * Agentic Echo paused on a confirm-tier action (e.g. schedule a post) and is
   * waiting for the user's approve/cancel. The SSE stream stays open while
   * this is set; confirmAction() resolves it. null = no pause pending.
   */
  pendingAction: { toolCallId: string; tool: string; summary: string } | null;
  /**
   * True when a free user's question was answered by the plain KB path after
   * the agentic endpoint gated them (402). Drives the upgrade card under the
   * answer — the FOMO seam for the paid-only agentic Echo.
   */
  answerUpsell: boolean;
}

export interface UseEchoReturn {
  state: EchoState;
  open: () => void;
  close: () => void;
  setInputText: (text: string) => void;
  setAttachment: (file: File | null) => void;
  submit: () => Promise<void>;
  selectIntent: (intent: EchoIntent) => void;
  confirm: () => Promise<void>;
  reset: () => void;
  /** Set the ownership for a pasted video URL before choosing a destination. */
  chooseOwnership: (o: 'self' | 'third_party') => void;
  chooseDestination: (choice: 'create' | 'stockpile') => Promise<void>;
  chooseFileDestination: (dest: 'create' | 'stockpile') => Promise<void>;
  clipSavedVideo: (uploadId: string) => Promise<void>;
  /** Approve or cancel the pending agentic action (state.pendingAction). */
  confirmAction: (approved: boolean) => Promise<void>;
}

const MAX_RECEIPTS = 3;

// Module-level KB id cache (session lifetime, cleared on page unload)
let cachedKbId: string | null = null;

async function resolveDefaultKbId(): Promise<string | null> {
  if (cachedKbId) return cachedKbId;
  try {
    const response = await api.kb.list();
    if (response.success && response.data && response.data.length > 0) {
      const defaultKb = response.data.find((kb) => kb.is_default) ?? response.data[0];
      cachedKbId = defaultKb.id;
      return cachedKbId;
    }
  } catch {
    // swallow; will show inline error
  }
  return null;
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

const INITIAL_STATE: EchoState = {
  phase: 'idle',
  inputText: '',
  attachment: null,
  attachmentError: null,
  classification: null,
  selectedIntent: null,
  answer: null,
  receipts: [],
  error: null,
  confirmation: null,
  videoUrlTarget: null,
  videoFileTarget: null,
  fileUploadProgress: null,
  savedVideos: null,
  savedCount: null,
  videoOwnership: null,
  ingestPhase: null,
  pendingAction: null,
  answerUpsell: false,
};

export interface UseEchoOptions {
  /**
   * Called after any successful KB ingest (voice/doc/mbox/text/URL-import).
   * EchoHero passes its advisor refetch here so the nudge thread reflects the
   * just-added material — the job the now-retired KBUnifiedInput pill used to
   * do via onImportComplete. Stored in a ref so confirm()'s dep list is stable.
   */
  onIngestComplete?: () => void;
}

export function useEcho(
  navigate: (path: string) => void,
  options?: UseEchoOptions,
): UseEchoReturn {
  const [state, setState] = useState<EchoState>(INITIAL_STATE);
  // Keep a ref so callbacks always read fresh state
  const stateRef = useRef(state);
  stateRef.current = state;

  // Keep onIngestComplete in a ref so confirm()'s useCallback deps stay stable
  // while always firing the latest callback.
  const onIngestCompleteRef = useRef(options?.onIngestComplete);
  onIngestCompleteRef.current = options?.onIngestComplete;

  // Run counter for the stockpile poll loop. Increment to abort any in-flight
  // poll (reset or second call starts a new run, stale loops detect the change
  // and exit without touching state).
  const pollRunRef = useRef(0);

  // Stable per-mount session id for the agentic Echo chat loop (threads
  // turns into one server-side session).
  const echoSessionRef = useRef(`web-${makeId()}${makeId()}`);

  const open = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: prev.phase === 'idle' ? 'open' : prev.phase,
      error: null,
    }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: 'idle',
    }));
  }, []);

  const setInputText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, inputText: text }));
  }, []);

  const setAttachment = useCallback((file: File | null) => {
    if (!file) {
      setState((prev) => ({
        ...prev,
        attachment: null,
        attachmentError: null,
        videoFileTarget: null,
        // If we entered confirming phase only because of a video file, go back to input
        phase: prev.videoFileTarget && prev.phase === 'confirming' ? 'open' : prev.phase,
      }));
      return;
    }
    const kind = classifyFile(file);
    if (kind === 'unsupported') {
      setState((prev) => ({
        ...prev,
        attachment: null,
        attachmentError:
          'That file type isn\'t supported yet. Video, audio, documents (PDF, Word), text, and .mbox email archives work.',
      }));
      return;
    }
    if (kind === 'audio' && file.size > MAX_ECHO_AUDIO_BYTES) {
      setState((prev) => ({
        ...prev,
        attachment: null,
        attachmentError: `Audio files must be under 250 MB. This file is ${(file.size / (1024 * 1024)).toFixed(0)} MB.`,
      }));
      return;
    }
    if (kind === 'text' && file.size > MAX_ECHO_TEXT_BYTES) {
      setState((prev) => ({
        ...prev,
        attachment: null,
        attachmentError: `Text files must be under 1 MB. This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`,
      }));
      return;
    }
    if (kind === 'document' && file.size > MAX_ECHO_DOCUMENT_BYTES) {
      setState((prev) => ({
        ...prev,
        attachment: null,
        attachmentError: `Documents must be under 500 MB. This file is ${(file.size / (1024 * 1024)).toFixed(0)} MB.`,
      }));
      return;
    }
    if (kind === 'video') {
      // Video files skip the classify round-trip and show the destination fork
      // immediately. No "press Enter" gate — the fork appears on attach.
      setState((prev) => ({
        ...prev,
        attachment: file,
        attachmentError: null,
        videoFileTarget: { file },
        phase: 'confirming',
      }));
      return;
    }
    setState((prev) => ({
      ...prev,
      attachment: file,
      attachmentError: null,
      // Attaching a file means a fresh input is in progress: surface the input
      // phase from any resting/terminal state (idle, or a finished exchange's
      // 'done'). Staying in 'done' would hide the textarea and let "Ask another"
      // silently discard the file the user just attached.
      phase: prev.phase === 'idle' || prev.phase === 'done' ? 'open' : prev.phase,
    }));
  }, []);

  const reset = useCallback(() => {
    // Bump the run counter so any in-flight stockpile poll loop detects it has
    // been superseded and exits without writing state.
    pollRunRef.current += 1;
    setState((prev) => ({
      ...INITIAL_STATE,
      phase: 'open',
      receipts: prev.receipts,
    }));
  }, []);

  /**
   * Resolve the agentic confirm-pause (state.pendingAction). The SSE stream
   * is still open in the question case's for-await; approving/cancelling here
   * lets the server loop resume and the stream continue emitting.
   */
  const confirmAction = useCallback(async (approved: boolean) => {
    const pending = stateRef.current.pendingAction;
    if (!pending) return;
    setState((prev) => ({ ...prev, pendingAction: null }));
    try {
      await confirmEchoAction(pending.toolCallId, approved);
    } catch {
      // Unresolved confirms expire server-side; the loop fails safe.
    }
  }, []);

  const addReceipt = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      receipts: [{ id: makeId(), text }, ...prev.receipts].slice(0, MAX_RECEIPTS),
    }));
  }, []);

  // Step 1: user submits text (or text + attachment) -> classify
  const submit = useCallback(async () => {
    const { inputText, attachment } = stateRef.current;
    const text = inputText.trim();
    if (!text && !attachment) return;

    // Invalidate any in-flight stockpile poll so it exits without touching state.
    pollRunRef.current += 1;

    // Clear any prior success card and poll phase so a new exchange starts clean.
    setState((prev) => ({ ...prev, phase: 'classifying', error: null, confirmation: null, ingestPhase: null }));

    try {
      const page = typeof window !== 'undefined' ? window.location.pathname : undefined;
      const hasAttachment = !!attachment;
      // When the user is viewing a content kit, tell the classifier — "redo
      // this, it doesn't sound like me" means regenerate THAT kit, not start
      // a new create flow.
      const itemId = page?.match(/^\/app\/library\/([^/?#]+)/)?.[1];
      // Use file name as fallback text when there is no typed text
      const classifyText = text || (attachment ? attachment.name : '');
      const classification = await classifyEchoInput(classifyText, {
        page,
        hasAttachment,
        itemId,
      });

      // Coerce intent based on file kind (overrides classifier when file present)
      let coercedIntent: EchoIntent | null = null;
      if (attachment) {
        const kind = classifyFile(attachment);
        if (kind === 'video') {
          coercedIntent = 'create';
        } else if (kind === 'text' || kind === 'document' || kind === 'mbox') {
          coercedIntent = 'ingest';
        } else if (kind === 'audio') {
          // Trust classifier for create/ingest; coerce question/command
          const ci = classification.intent;
          if (ci === 'create' || ci === 'ingest') {
            coercedIntent = ci;
          } else {
            // No typed text asking for content = default ingest; text present and
            // classifier called it a question/command = treat as content request = create
            coercedIntent = text ? 'create' : 'ingest';
          }
        }
      }

      // Fire-and-forget telemetry — never throw, never block UX
      api.telemetry.event({
        event_name: 'echo_classified',
        event_data: {
          intent: classification.intent,
          confidence: classification.confidence,
          source: classification.source,
          text_length: text.length,
          has_attachment: hasAttachment,
        },
      }).catch(() => {});

      const firstUrl = extractFirstUrl(classifyText);
      const videoUrlTarget = firstUrl ? detectVideoUrlTarget(firstUrl) : null;

      setState((prev) => ({
        ...prev,
        phase: 'confirming',
        classification,
        selectedIntent: coercedIntent,
        answer: null,
        videoUrlTarget,
        savedVideos: null,
        savedCount: null,
        // Force ownership chip to be answered fresh on each new URL submission
        videoOwnership: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: 'open',
        error: extractErrorMessage(err, 'Could not classify input. Please try again.'),
      }));
    }
  }, []);

  // Step 2a: user may correct the intent
  const selectIntent = useCallback((intent: EchoIntent) => {
    const { classification } = stateRef.current;
    // Emit correction telemetry only when the user picks a different intent than classified
    if (classification && intent !== classification.intent) {
      api.telemetry.event({
        event_name: 'echo_intent_corrected',
        event_data: {
          detected: classification.intent,
          corrected: intent,
          confidence: classification.confidence,
          source: classification.source,
        },
      }).catch(() => {});
    }
    setState((prev) => ({
      ...prev,
      selectedIntent: intent,
    }));
  }, []);

  // Step 2b: user confirms (clicks chip or confirm button) -> execute
  const confirm = useCallback(async () => {
    // Re-entry guard: prevent double-clicks or execution from terminal phases
    if (stateRef.current.phase === 'executing' || stateRef.current.phase === 'answered' || stateRef.current.phase === 'done') return;

    const { classification, selectedIntent, inputText, attachment } = stateRef.current;
    if (!classification) return;

    const intent: EchoIntent = selectedIntent ?? classification.intent;
    const text = inputText.trim();
    const args = classification.args ?? {};

    setState((prev) => ({ ...prev, phase: 'executing', error: null }));

    try {
      // ---- Attachment routing ----
      if (attachment) {
        const kind = classifyFile(attachment);

        // Documents and email archives only have an ingest pipeline — there is
        // no server-side text extraction feeding /generate. Guard the chip
        // override instead of silently dropping the file.
        if (intent === 'create' && (kind === 'document' || kind === 'mbox')) {
          setState((prev) => ({
            ...prev,
            phase: 'confirming',
            error: 'That file type goes to Your Voice. Pick "Adding to your Voice" to save it.',
          }));
          return;
        }

        if (intent === 'create') {
          if (kind === 'video') {
            // Video handed off directly to Create form via in-memory store
            stashEchoHandoff({ kind: 'video-file', file: attachment, note: text || undefined });
            navigate('/app?echoFile=1');
            addReceipt(formatReceipt(`${INTENT_META.create.receiptVerb} · ${attachment.name}`));
            setState((prev) => ({ ...prev, phase: 'done', inputText: '', attachment: null, attachmentError: null }));
            setTimeout(() => {
              setState((prev) => ({ ...prev, phase: 'idle' }));
            }, 1200);
            api.telemetry.event({
              event_name: 'echo_executed',
              event_data: {
                intent,
                corrected: selectedIntent !== null && selectedIntent !== classification.intent,
              },
            }).catch(() => {});
            return;
          }

          if (kind === 'audio') {
            // Audio must be transcribed first — the backend clip upload only accepts video MIME types
            try {
              const result = await api.kbContent.transcribeVoice(attachment);
              if (result.success && result.text) {
                stashEchoHandoff({ kind: 'text', text: result.text });
                navigate('/app?echoFile=1');
                addReceipt(formatReceipt('TRANSCRIBED AND HANDED TO CREATE'));
                setState((prev) => ({ ...prev, phase: 'done', inputText: '', attachment: null, attachmentError: null }));
                setTimeout(() => {
                  setState((prev) => ({ ...prev, phase: 'idle' }));
                }, 1200);
                api.telemetry.event({
                  event_name: 'echo_executed',
                  event_data: {
                    intent,
                    corrected: selectedIntent !== null && selectedIntent !== classification.intent,
                  },
                }).catch(() => {});
              } else {
                throw new Error('No transcript returned');
              }
            } catch {
              setState((prev) => ({
                ...prev,
                phase: 'confirming',
                error: 'Could not transcribe that audio. Try again or use a smaller file.',
              }));
            }
            return;
          }
        }

        if (intent === 'ingest' && kind === 'audio') {
          await api.kbContent.ingestVoice({
            audioBlob: attachment,
            title: attachment.name,
            fileName: attachment.name,
          });
          addReceipt(formatReceipt(`${INTENT_META.ingest.receiptVerb} · AUDIO`));
          setState((prev) => ({ ...prev, phase: 'done', inputText: '', attachment: null, attachmentError: null, confirmation: { title: 'Added to your Voice', detail: attachment.name } }));
          onIngestCompleteRef.current?.();
          api.telemetry.event({
            event_name: 'echo_executed',
            event_data: {
              intent,
              corrected: selectedIntent !== null && selectedIntent !== classification.intent,
            },
          }).catch(() => {});
          return;
        }

        if (intent === 'ingest' && kind === 'document') {
          // Same pipeline as the Your Voice document uploader:
          // POST /files/upload?kbId= (PDF/DOCX/DOC/TXT, server-side extraction).
          const kbId = await resolveDefaultKbId();
          if (!kbId) {
            setState((prev) => ({
              ...prev,
              phase: 'confirming',
              error: 'No Voice KB found. Add content to Your Voice first.',
            }));
            return;
          }
          await api.files.upload(kbId, attachment);
          addReceipt(formatReceipt(`${INTENT_META.ingest.receiptVerb} · ${attachment.name}`));
          setState((prev) => ({ ...prev, phase: 'done', inputText: '', attachment: null, attachmentError: null, confirmation: { title: 'Added to your Voice', detail: attachment.name } }));
          onIngestCompleteRef.current?.();
          api.telemetry.event({
            event_name: 'echo_executed',
            event_data: {
              intent,
              corrected: selectedIntent !== null && selectedIntent !== classification.intent,
            },
          }).catch(() => {});
          return;
        }

        if (intent === 'ingest' && kind === 'mbox') {
          // Same client-side parse + batch ingest as the Your Voice mbox flow.
          // Lazy import keeps the 600-line streaming parser out of the pill's
          // initial bundle (the pill mounts globally in app-shell).
          const { parseMboxFile } = await import('@/lib/mbox-parser');
          const parsed = await parseMboxFile(attachment, {
            maxEmails: 100,
            minContentLength: 50,
          });
          if (parsed.emails.length === 0) {
            setState((prev) => ({
              ...prev,
              phase: 'confirming',
              error: 'No emails found in that archive. Make sure you exported your "Sent" folder.',
            }));
            return;
          }
          await api.kbContent.ingestParsedEmails({
            emails: parsed.emails,
            fileName: attachment.name,
            parseStats: {
              totalEmailsFound: parsed.totalEmailsFound,
              emailsParsed: parsed.emailsParsed,
              emailsFiltered: parsed.emailsFiltered,
              parseErrors: parsed.parseErrors,
            },
          });
          addReceipt(formatReceipt(`${INTENT_META.ingest.receiptVerb} · ${parsed.emails.length} EMAILS`));
          setState((prev) => ({ ...prev, phase: 'done', inputText: '', attachment: null, attachmentError: null, confirmation: { title: 'Added to your Voice', detail: `${parsed.emails.length} emails` } }));
          onIngestCompleteRef.current?.();
          api.telemetry.event({
            event_name: 'echo_executed',
            event_data: {
              intent,
              corrected: selectedIntent !== null && selectedIntent !== classification.intent,
            },
          }).catch(() => {});
          return;
        }

        if (intent === 'ingest' && kind === 'text') {
          const fileText = await attachment.text();
          await api.kbContent.paste({
            text: fileText,
            sourceType: 'writing_sample',
            title: attachment.name,
          });
          addReceipt(formatReceipt(`${INTENT_META.ingest.receiptVerb} · ${attachment.name}`));
          setState((prev) => ({ ...prev, phase: 'done', inputText: '', attachment: null, attachmentError: null, confirmation: { title: 'Added to your Voice', detail: attachment.name } }));
          onIngestCompleteRef.current?.();
          api.telemetry.event({
            event_name: 'echo_executed',
            event_data: {
              intent,
              corrected: selectedIntent !== null && selectedIntent !== classification.intent,
            },
          }).catch(() => {});
          return;
        }
      }

      // ---- Text-only routing (no attachment) ----
      switch (intent) {
        case 'create': {
          const prompt = args.prompt ?? text;
          navigate(`/app?echoPrompt=${encodeURIComponent(prompt)}`);
          addReceipt(formatReceipt(INTENT_META.create.receiptVerb));
          setState((prev) => ({ ...prev, phase: 'done', inputText: '' }));
          // Collapse after navigation
          setTimeout(() => {
            setState((prev) => ({ ...prev, phase: 'idle' }));
          }, 1200);
          break;
        }

        case 'ingest': {
          const note = args.note ?? text;
          // A pasted link should import the source, not save the raw URL
          // string as a note. Reuses the Your Voice import pipeline:
          // YouTube/Instagram have dedicated importers; a generic page goes
          // through the blog importer (RSS/sitemap discovery from the URL).
          const url = extractFirstUrl(note);
          if (url) {
            const kind = detectIngestUrlKind(url);
            // Zoom/Loom/Vimeo are personal recordings with NO KB importer.
            // Before, they fell to 'blog' and silently failed in the scraper.
            // Point the user at the Create path (clip a video into a kit)
            // instead of pretending to add the recording to their Voice.
            if (kind === 'recording') {
              setState((prev) => ({
                ...prev,
                phase: 'confirming',
                error: 'That looks like a video recording. Pick "Creating a kit" to clip it into content. Recordings can’t be added to Your Voice directly.',
              }));
              return;
            }
            await api.kbContent.startSocialImport({ platform: kind, url });
            addReceipt(formatReceipt(`${INTENT_META.ingest.receiptVerb} · ${kind.toUpperCase()} IMPORT`));
            setState((prev) => ({ ...prev, phase: 'done', inputText: '', confirmation: { title: 'Importing to your Voice', detail: `${kind} link` } }));
            onIngestCompleteRef.current?.();
            break;
          }
          await api.kbContent.paste({
            text: note,
            sourceType: 'text',
            title: 'Echo note',
          });
          addReceipt(formatReceipt(`${INTENT_META.ingest.receiptVerb} · TEXT NOTE`));
          setState((prev) => ({ ...prev, phase: 'done', inputText: '', confirmation: { title: 'Added to your Voice', detail: 'Your note' } }));
          onIngestCompleteRef.current?.();
          break;
        }

        case 'question': {
          const query = args.query ?? text;

          // Agentic-first: the paid Echo v2 loop answers AND can act
          // (schedule, build, navigate). The server enforces the paid gate —
          // free users get a 402 before the stream opens and fall through to
          // the KB answer below plus the upgrade card. Server as the single
          // source of truth means no client-side tier plumbing to drift.
          let gatedFree = false;
          try {
            let acc = '';
            for await (const ev of streamEchoChat(echoSessionRef.current, query, {
              route: typeof window !== 'undefined' ? window.location.pathname : undefined,
            })) {
              if (ev.type === 'text') {
                acc += ev.content;
                const answerSoFar = acc;
                setState((prev) => ({ ...prev, phase: 'answered', answer: answerSoFar }));
              } else if (ev.type === 'tool_done') {
                addReceipt(formatReceipt(`${ev.receipt.verb} · ${ev.receipt.label}`));
              } else if (ev.type === 'confirm_request') {
                setState((prev) => ({
                  ...prev,
                  pendingAction: {
                    toolCallId: ev.toolCallId,
                    tool: ev.tool,
                    summary: ev.tool.replace(/[_-]/g, ' '),
                  },
                }));
              } else if (ev.type === 'error') {
                throw new Error(ev.message);
              }
            }
            if (acc) {
              setState((prev) => ({ ...prev, phase: 'answered', pendingAction: null }));
              break;
            }
            // Stream ended without text — fall through to the KB answer.
            setState((prev) => ({ ...prev, pendingAction: null }));
          } catch (e) {
            if (e instanceof EchoChatGateError && e.status === 402) {
              gatedFree = true; // free user — KB answer + upgrade card below
            } else if (e instanceof EchoChatGateError && e.status === 429) {
              setState((prev) => ({
                ...prev,
                phase: 'confirming',
                pendingAction: null,
                error: "You've hit today's Echo limit. It resets tomorrow.",
              }));
              return;
            }
            // Any other agentic failure: fall back to the KB answer silently.
            setState((prev) => ({ ...prev, pendingAction: null }));
          }

          const kbId = await resolveDefaultKbId();
          if (!kbId) {
            setState((prev) => ({
              ...prev,
              phase: 'confirming',
              error: 'No Voice KB found. Add content to Your Voice first.',
            }));
            return;
          }
          const raw = await api.kb.chat(kbId, query);
          // Parse SSE response (same pattern as help-widget.tsx)
          let answer = '';
          const lines = raw.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6);
              if (payload === '[DONE]') break;
              try {
                const parsed = JSON.parse(payload);
                if (parsed.content) answer += parsed.content;
                if (parsed.text) answer += parsed.text;
              } catch {
                if (payload && payload !== '[DONE]') answer += payload;
              }
            }
          }
          if (!answer) answer = 'No answer found. Try rephrasing your question.';
          addReceipt(formatReceipt(INTENT_META.question.receiptVerb));
          setState((prev) => ({
            ...prev,
            phase: 'answered',
            answer,
            answerUpsell: gatedFree,
          }));
          break;
        }

        case 'command': {
          const target = (args.target ?? '').toLowerCase();

          // Regenerate the kit the user is currently viewing, threading their
          // guidance ("doesn't sound like me") into the generation as
          // additionalInstructions. Reuses POST /content-kits/:id/regenerate
          // (same endpoint as the kit page's per-platform regenerate UI).
          if (target === 'regenerate') {
            const path = typeof window !== 'undefined' ? window.location.pathname : '';
            const kitId = path.match(/^\/app\/library\/([^/?#]+)/)?.[1];
            if (kitId) {
              await api.contentKits.regenerate(kitId, {
                additionalInstructions: args.detail || text,
              });
              addReceipt(formatReceipt('REGENERATED IN YOUR VOICE'));
              setState((prev) => ({ ...prev, phase: 'done', inputText: '' }));
              // Kit content is fetched on mount; reload so the page shows
              // the regenerated copy.
              setTimeout(() => {
                window.location.reload();
              }, 1200);
              break;
            }
            // Not on a kit page — fall through to library navigation below.
          }

          const route = COMMAND_ROUTE_MAP[target];
          if (route) {
            navigate(route);
            addReceipt(formatReceipt(`${INTENT_META.command.receiptVerb} ${(args.target ?? target).toUpperCase()}`));
          } else {
            // Fallback: just navigate home
            navigate('/app');
            addReceipt(formatReceipt(INTENT_META.command.receiptVerb));
          }
          setState((prev) => ({ ...prev, phase: 'done', inputText: '' }));
          setTimeout(() => {
            setState((prev) => ({ ...prev, phase: 'idle' }));
          }, 1200);
          break;
        }
      }
      // Fire-and-forget execution telemetry
      api.telemetry.event({
        event_name: 'echo_executed',
        event_data: {
          intent,
          corrected: selectedIntent !== null && selectedIntent !== classification.intent,
        },
      }).catch(() => {});
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: 'confirming',
        error: extractErrorMessage(err, 'Something went wrong. Please try again.'),
      }));
    }
  }, [navigate, addReceipt]);

  const chooseOwnership = useCallback((o: 'self' | 'third_party') => {
    setState((prev) => ({ ...prev, videoOwnership: o }));
  }, []);

  const chooseDestination = useCallback(async (choice: 'create' | 'stockpile') => {
    const { inputText, videoUrlTarget, videoOwnership } = stateRef.current;
    const url = extractFirstUrl(inputText);
    if (!url || !videoUrlTarget) return;

    const ownership = videoOwnership ?? 'self';

    setState((prev) => ({ ...prev, phase: 'executing', error: null }));
    try {
      if (choice === 'create') {
        const uploadResponse = await api.clips.upload({ sourceType: videoUrlTarget.platform, sourceUrl: url, ownership });
        if (!uploadResponse.success || !uploadResponse.data?.upload) {
          throw new Error('Failed to upload video');
        }
        const upload = uploadResponse.data.upload;
        await api.clips.process(upload.id, { generateContent: true });
        addReceipt(formatReceipt('CLIP · MAKE CONTENT NOW'));
        setState((prev) => ({
          ...prev, phase: 'done', inputText: '', videoUrlTarget: null,
          savedVideos: null, savedCount: null,
          confirmation: { title: 'Clipping your video', detail: 'Making content now' },
        }));
      } else {
        const res = await api.kbContent.startChannelStockpile({ url, ownership });
        addReceipt(formatReceipt(`STOCKPILE · SAVED ${res.savedCount} VIDEOS`));
        setState((prev) => ({
          ...prev, phase: 'done', inputText: '', videoUrlTarget: null,
          savedVideos: res.videos, savedCount: res.savedCount,
          confirmation: { title: `Saved ${res.savedCount} videos to clip later`, detail: '' },
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev, phase: 'confirming',
        error: err instanceof Error ? err.message : 'Something went wrong. Try again.',
      }));
    }
  }, [addReceipt]);

  const chooseFileDestination = useCallback(async (dest: 'create' | 'stockpile') => {
    const { videoFileTarget, inputText } = stateRef.current;
    const file = videoFileTarget?.file;
    if (!file) return;

    setState((prev) => ({ ...prev, phase: 'executing', error: null }));
    try {
      if (dest === 'create') {
        // Mirror the video-file create branch from confirm() — stash the file
        // for the Create form to pick up, then navigate.
        const note = inputText.trim() || undefined;
        stashEchoHandoff({ kind: 'video-file', file, note });
        navigate('/app?echoFile=1');
        addReceipt(formatReceipt(`${INTENT_META.create.receiptVerb} · ${file.name}`));
        setState((prev) => ({
          ...prev,
          phase: 'done',
          inputText: '',
          attachment: null,
          attachmentError: null,
          videoFileTarget: null,
        }));
        setTimeout(() => {
          setState((prev) => ({ ...prev, phase: 'idle' }));
        }, 1200);
        api.telemetry.event({
          event_name: 'echo_executed',
          event_data: { intent: 'create', corrected: false },
        }).catch(() => {});
      } else {
        // Capture a run id before any async work so this poll loop can detect
        // if it has been superseded (by a reset or a second stockpile call).
        pollRunRef.current += 1;
        const runId = pollRunRef.current;

        // Upload the file to R2 and mark it for later clipping. Surface upload
        // progress so the user sees movement instead of a frozen greyed button.
        setState((prev) => ({ ...prev, fileUploadProgress: 0, ingestPhase: null }));
        const result = await api.clips.uploadViaR2(file, { saveForLater: true, ownership: 'self' }, (p) => {
          setState((prev) => ({ ...prev, fileUploadProgress: p }));
        });
        const uploadId = result.data?.upload?.id;
        addReceipt(formatReceipt(`SAVED TO LIBRARY · ${file.name}`));

        // If the user reset or kicked off a new stockpile during the upload, bail
        // without writing state (the new run owns the component now).
        if (runId !== pollRunRef.current) return;

        // Transition to done/importing — keep videoFileTarget so Retry can re-read the file
        setState((prev) => ({
          ...prev,
          phase: 'done',
          inputText: '',
          attachment: null,
          attachmentError: null,
          fileUploadProgress: null,
          ingestPhase: 'importing',
        }));
        // Poll until backend ingest completes (terminal status_message)
        const MAX_ATTEMPTS = 40;
        const POLL_INTERVAL_MS = 3000;
        let settled = false;
        if (uploadId) {
          for (let i = 0; i < MAX_ATTEMPTS; i++) {
            await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
            // Abort guard — check at the top of every iteration before any setState
            if (runId !== pollRunRef.current) return;
            try {
              const res = await api.clips.get(uploadId);
              // Abort guard — check again after the async call
              if (runId !== pollRunRef.current) return;
              const statusMessage = res.data?.upload?.statusMessage;
              if (statusMessage === 'Saved to your library.') {
                setState((prev) => ({
                  ...prev,
                  ingestPhase: 'success',
                  videoFileTarget: null,
                  confirmation: { title: 'Saved to clip later · added to your voice', detail: null },
                }));
                settled = true;
                break;
              }
              if (statusMessage?.startsWith('library-ingest-failed:')) {
                setState((prev) => ({ ...prev, ingestPhase: 'failed' }));
                settled = true;
                break;
              }
            } catch {
              // network error — keep polling
            }
          }
        }
        // Abort guard — check before the timeout setState so a reset does not
        // clobber a successfully running new flow with a stale 'failed'.
        if (runId !== pollRunRef.current) return;
        if (!settled) {
          // Timeout or missing upload ID — surface failure so user can retry
          setState((prev) => ({ ...prev, ingestPhase: 'failed' }));
        }
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        phase: 'confirming',
        fileUploadProgress: null,
        error: err instanceof Error ? err.message : 'Something went wrong. Try again.',
      }));
    }
  }, [navigate, addReceipt]);

  const clipSavedVideo = useCallback(async (uploadId: string) => {
    setState((prev) => ({ ...prev, phase: 'executing', error: null }));
    try {
      await api.clips.process(uploadId, { generateContent: true });
      addReceipt(formatReceipt('CLIP · STARTED'));
      setState((prev) => ({
        ...prev,
        phase: 'done',
        savedVideos: prev.savedVideos ? prev.savedVideos.filter((v) => v.uploadId !== uploadId) : null,
        confirmation: { title: 'Clipping started', detail: '' },
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev, phase: 'done',
        error: err instanceof Error ? err.message : 'Could not start clipping. Try again.',
      }));
    }
  }, [addReceipt]);

  return {
    state,
    open,
    close,
    setInputText,
    setAttachment,
    submit,
    selectIntent,
    confirm,
    reset,
    chooseOwnership,
    chooseDestination,
    chooseFileDestination,
    clipSavedVideo,
    confirmAction,
  };
}
