/**
 * EchoHero.advisor.test.tsx
 * Tests that EchoHero correctly wires useAdvisor + AdvisorThread + DraftsThreadMessage
 * and routes nudge/proposal callbacks to the ingestion mechanics.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAdvisor } from '@/components/echo/useAdvisor';
import type { AdvisorResponse } from '@/types/advisor';

// ---- Module mocks ----

const startMic = vi.fn();
const setInputText = vi.fn();

// Capture the options EchoHero passes to useEcho so we can drive its
// onIngestComplete callback (the advisor-refetch-on-ingest wiring).
const hoisted = vi.hoisted(() => ({
  echoOptions: { onIngestComplete: undefined as (() => void) | undefined },
}));

vi.mock('@/hooks/useAppNavigation', () => ({
  useAppNavigation: () => ({ navigate: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('./useEchoMic', () => ({
  useEchoMic: () => ({
    micState: 'idle' as const,
    elapsed: 0,
    micError: null,
    start: startMic,
    stop: vi.fn(),
  }),
}));

vi.mock('./useEcho', () => ({
  useEcho: (_navigate: unknown, options?: { onIngestComplete?: () => void }) => {
    hoisted.echoOptions.onIngestComplete = options?.onIngestComplete;
    return {
      state: {
        phase: 'open' as const,
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
      },
      open: vi.fn(),
      close: vi.fn(),
      setInputText,
      setAttachment: vi.fn(),
      submit: vi.fn(),
      selectIntent: vi.fn(),
      confirm: vi.fn(),
      reset: vi.fn(),
      chooseOwnership: vi.fn(),
      chooseDestination: vi.fn(),
      chooseFileDestination: vi.fn(),
      clipSavedVideo: vi.fn(),
    };
  },
}));

vi.mock('./useAdvisor', () => ({
  useAdvisor: vi.fn(),
}));

vi.mock('@/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: () => ({ selectedKb: 'kb1' }),
}));

vi.mock('./EchoExchange', () => ({
  EchoExchange: ({ onTextareaMount }: { onTextareaMount?: (el: HTMLTextAreaElement | null) => void }) => (
    <div data-testid="echo-exchange">
      <textarea
        data-testid="echo-textarea"
        ref={(el) => { if (onTextareaMount) onTextareaMount(el); }}
      />
    </div>
  ),
}));

vi.mock('@/components/create/DraftsThreadMessage', () => ({
  DraftsThreadMessage: () => <div data-testid="drafts-thread" />,
}));

vi.mock('@/components/create/AdvisorThread', () => ({
  AdvisorThread: ({
    onProposalSelect,
  }: {
    onProposalSelect: (proposal: { id: string; title: string; rationale: string; kitType: string; sourceRefs: string[] }) => void;
  }) => (
    <div data-testid="advisor-thread">
      <button
        data-testid="prop-select"
        onClick={() =>
          onProposalSelect({
            id: 'p1',
            title: 'My Proposal',
            rationale: '',
            kitType: '',
            sourceRefs: [],
          })
        }
      />
    </div>
  ),
}));

// Also stub heavy UI deps that EchoHero imports
vi.mock('@/components/ui/waveform', () => ({
  Waveform: () => <svg data-testid="waveform" />,
}));

// ---- Advisor fixture ----

const ADVISOR_FIXTURE: AdvisorResponse = {
  state: 'empty',
  coverage: {
    work: { covered: false, strength: 0, sampleCount: 0 },
    industry: { covered: false, strength: 0, sampleCount: 0 },
    interests: { covered: false, strength: 0, sampleCount: 0 },
    personal: { covered: false, strength: 0, sampleCount: 0 },
    relationships: { covered: false, strength: 0, sampleCount: 0 },
    voice: { covered: false, strength: 0, sampleCount: 0 },
  },
  nudge: {
    headline: 'Get started',
    subhead: 'Tell me about yourself.',
    actions: [],
  },
  proposals: [],
};

// ---- Import component under test (after mocks registered) ----

import { EchoHero } from './EchoHero';

// ---- Test suite ----

describe('EchoHero advisor + drafts wiring', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on HTMLInputElement.click so we can assert fileInputRef.current?.click()
    clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    // Default: advisor present
    vi.mocked(useAdvisor).mockReturnValue({
      advisor: ADVISOR_FIXTURE,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it('renders AdvisorThread and DraftsThreadMessage when advisor is present', () => {
    render(<EchoHero />);
    expect(screen.getByTestId('advisor-thread')).toBeTruthy();
    expect(screen.getByTestId('drafts-thread')).toBeTruthy();
  });

  it('hides AdvisorThread but still renders DraftsThreadMessage when advisor is null', () => {
    vi.mocked(useAdvisor).mockReturnValue({ advisor: null, loading: false, error: null, refetch: vi.fn() });
    render(<EchoHero />);
    expect(screen.queryByTestId('advisor-thread')).toBeNull();
    expect(screen.getByTestId('drafts-thread')).toBeTruthy();
  });

  it('clicking prop-select calls setInputText with the proposal title', () => {
    render(<EchoHero />);
    fireEvent.click(screen.getByTestId('prop-select'));
    expect(setInputText).toHaveBeenCalledWith('My Proposal');
  });

  it('wires useEcho onIngestComplete to the advisor refetch', () => {
    const refetch = vi.fn();
    vi.mocked(useAdvisor).mockReturnValue({ advisor: ADVISOR_FIXTURE, loading: false, error: null, refetch });
    render(<EchoHero />);
    // EchoHero hands its advisor refetch to useEcho; firing it (as a successful
    // composer ingest would) must refresh the advisor thread.
    expect(hoisted.echoOptions.onIngestComplete).toBeTypeOf('function');
    hoisted.echoOptions.onIngestComplete!();
    expect(refetch).toHaveBeenCalled();
  });
});
