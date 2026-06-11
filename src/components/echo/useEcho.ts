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
import { INTENT_META, COMMAND_ROUTE_MAP, formatReceipt } from './intent-meta';

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

  // Step 1: user submits text -> classify
  const submit = useCallback(async () => {
    const text = stateRef.current.inputText.trim();
    if (!text) return;

    setState((prev) => ({ ...prev, phase: 'classifying', error: null }));

    try {
      const page = typeof window !== 'undefined' ? window.location.pathname : undefined;
      const classification = await classifyEchoInput(text, { page });
      setState((prev) => ({
        ...prev,
        phase: 'confirming',
        classification,
        selectedIntent: null,
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
    setState((prev) => ({
      ...prev,
      selectedIntent: intent,
    }));
  }, []);

  // Step 2b: user confirms (clicks chip or confirm button) -> execute
  const confirm = useCallback(async () => {
    const { classification, selectedIntent, inputText } = stateRef.current;
    if (!classification) return;

    const intent: EchoIntent = selectedIntent ?? classification.intent;
    const text = inputText.trim();
    const args = classification.args ?? {};

    setState((prev) => ({ ...prev, phase: 'executing', error: null }));

    try {
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
          await api.kbContent.paste({
            text: args.note ?? text,
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
    submit,
    selectIntent,
    confirm,
    reset,
  };
}
