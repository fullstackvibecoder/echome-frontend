/**
 * EchoHero.advisor.test.tsx
 * Tests that EchoHero correctly wires useAdvisor + AdvisorThread + DraftsThreadMessage
 * and routes ladder/nudge/proposal callbacks to the ingestion mechanics.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAdvisor } from '@/components/echo/useAdvisor';
import type { AdvisorResponse } from '@/types/advisor';

// ---- Module mocks ----

const startMic = vi.fn();
const setInputText = vi.fn();

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
  useEcho: () => ({
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
    },
    open: vi.fn(),
    setInputText,
    setAttachment: vi.fn(),
    submit: vi.fn(),
    selectIntent: vi.fn(),
    confirm: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock('./useAdvisor', () => ({
  useAdvisor: vi.fn(),
}));

vi.mock('./EchoExchange', () => ({
  EchoExchange: () => <div data-testid="echo-exchange" />,
}));

vi.mock('@/components/create/DraftsThreadMessage', () => ({
  DraftsThreadMessage: () => <div data-testid="drafts-thread" />,
}));

vi.mock('@/components/create/AdvisorThread', () => ({
  AdvisorThread: ({
    onLadderAction,
    onNudgeAction,
    onProposalSelect,
  }: {
    onLadderAction: (id: string) => void;
    onNudgeAction: (action: { type: string; label: string; payload?: Record<string, unknown> }) => void;
    onProposalSelect: (proposal: { id: string; title: string; rationale: string; kitType: string; sourceRefs: string[] }) => void;
  }) => (
    <div data-testid="advisor-thread">
      <button data-testid="la-voice" onClick={() => onLadderAction('voice')} />
      <button data-testid="la-video" onClick={() => onLadderAction('video')} />
      <button
        data-testid="na-create"
        onClick={() =>
          onNudgeAction({ type: 'create', label: 'x', payload: { prompt: 'hello world' } })
        }
      />
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
    vi.mocked(useAdvisor).mockReturnValue({ advisor: null, loading: false, error: null });
    render(<EchoHero />);
    expect(screen.queryByTestId('advisor-thread')).toBeNull();
    expect(screen.getByTestId('drafts-thread')).toBeTruthy();
  });

  it('clicking la-voice calls startMic', () => {
    render(<EchoHero />);
    fireEvent.click(screen.getByTestId('la-voice'));
    expect(startMic).toHaveBeenCalled();
  });

  it('clicking la-video triggers the hidden file input click', () => {
    render(<EchoHero />);
    fireEvent.click(screen.getByTestId('la-video'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('clicking na-create calls setInputText with the prompt payload', () => {
    render(<EchoHero />);
    fireEvent.click(screen.getByTestId('na-create'));
    expect(setInputText).toHaveBeenCalledWith('hello world');
  });

  it('clicking prop-select calls setInputText with the proposal title', () => {
    render(<EchoHero />);
    fireEvent.click(screen.getByTestId('prop-select'));
    expect(setInputText).toHaveBeenCalledWith('My Proposal');
  });
});
