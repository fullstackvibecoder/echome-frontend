'use client';

/**
 * useEcho.ts
 * State machine, classify, and per-intent execution for the Echo pill.
 * v1 contract: always require one explicit chip/confirm click before executing.
 */

import { useState, useCallback, useRef } from 'react';
import { classifyEchoInput, type EchoClassification, type EchoIntent } from '@/lib/echo-client';
import { api } from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/error-utils';
import { INTENT_META, COMMAND_ROUTE_MAP, formatReceipt, classifyFile, MAX_ECHO_AUDIO_BYTES, MAX_ECHO_TEXT_BYTES } from './intent-meta';
import { stashEchoHandoff } from './file-handoff';

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
};

export function useEcho(navigate: (path: string) => void): UseEchoReturn {
  const [state, setState] = useState<EchoState>(INITIAL_STATE);
  // Keep a ref so callbacks always read fresh state
  const stateRef = useRef(state);
  stateRef.current = state;

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
      setState((prev) => ({ ...prev, attachment: null, attachmentError: null }));
      return;
    }
    const kind = classifyFile(file);
    if (kind === 'unsupported') {
      setState((prev) => ({
        ...prev,
        attachment: null,
        attachmentError:
          'That file type isn\'t supported yet. Video, audio, and text files work.',
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
    setState((prev) => ({
      ...INITIAL_STATE,
      phase: 'open',
      receipts: prev.receipts,
    }));
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

    setState((prev) => ({ ...prev, phase: 'classifying', error: null }));

    try {
      const page = typeof window !== 'undefined' ? window.location.pathname : undefined;
      const hasAttachment = !!attachment;
      // Use file name as fallback text when there is no typed text
      const classifyText = text || (attachment ? attachment.name : '');
      const classification = await classifyEchoInput(classifyText, {
        page,
        hasAttachment,
      });

      // Coerce intent based on file kind (overrides classifier when file present)
      let coercedIntent: EchoIntent | null = null;
      if (attachment) {
        const kind = classifyFile(attachment);
        if (kind === 'video') {
          coercedIntent = 'create';
        } else if (kind === 'text') {
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

      setState((prev) => ({
        ...prev,
        phase: 'confirming',
        classification,
        selectedIntent: coercedIntent,
        answer: null,
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
          setState((prev) => ({ ...prev, phase: 'done', inputText: '', attachment: null, attachmentError: null }));
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
          setState((prev) => ({ ...prev, phase: 'done', inputText: '', attachment: null, attachmentError: null }));
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
          // YouTube/Instagram have dedicated importers; anything else goes
          // through the blog importer (RSS/sitemap discovery from the URL).
          const urlMatch = note.match(/https?:\/\/[^\s<>"']+/i);
          if (urlMatch) {
            const url = urlMatch[0].replace(/[.,;:!?)\]}]+$/, '');
            const platform = /youtube\.com|youtu\.be/i.test(url)
              ? ('youtube' as const)
              : /instagram\.com/i.test(url)
              ? ('instagram' as const)
              : ('blog' as const);
            await api.kbContent.startSocialImport({ platform, url });
            addReceipt(formatReceipt(`${INTENT_META.ingest.receiptVerb} · ${platform.toUpperCase()} IMPORT`));
            setState((prev) => ({ ...prev, phase: 'done', inputText: '' }));
            break;
          }
          await api.kbContent.paste({
            text: note,
            sourceType: 'text',
            title: 'Echo note',
          });
          addReceipt(formatReceipt(`${INTENT_META.ingest.receiptVerb} · TEXT NOTE`));
          setState((prev) => ({ ...prev, phase: 'done', inputText: '' }));
          break;
        }

        case 'question': {
          const kbId = await resolveDefaultKbId();
          if (!kbId) {
            setState((prev) => ({
              ...prev,
              phase: 'confirming',
              error: 'No Voice KB found. Add content to Your Voice first.',
            }));
            return;
          }
          const raw = await api.kb.chat(kbId, args.query ?? text);
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
          }));
          break;
        }

        case 'command': {
          const target = (args.target ?? '').toLowerCase();
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
  };
}
