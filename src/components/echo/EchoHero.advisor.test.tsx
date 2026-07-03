/**
 * EchoHero.advisor.test.tsx
 * Tests that EchoHero correctly wires useAdvisor + CreateHeroHeader +
 * ProposalChips/CreateIntentButtons/CreateStarterCards + DraftsThreadMessage, and routes proposal
 * selection to the ingestion mechanics.
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

vi.mock('@/components/create/RecentKitsStrip', () => ({
  RecentKitsStrip: () => <div data-testid="recent-kits-strip" />,
}));

vi.mock('@/components/create/VoiceStrengthStrip', () => ({
  VoiceStrengthStrip: () => <div data-testid="voice-strength-strip" />,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Ara Mamourian' } }),
}));

// Also stub heavy UI deps that EchoHero imports
vi.mock('@/components/ui/waveform', () => ({
  Waveform: () => <svg data-testid="waveform" />,
}));

// ---- Advisor fixtures ----

const EMPTY_COVERAGE = {
  work: { covered: false, strength: 0, sampleCount: 0 },
  industry: { covered: false, strength: 0, sampleCount: 0 },
  interests: { covered: false, strength: 0, sampleCount: 0 },
  personal: { covered: false, strength: 0, sampleCount: 0 },
  relationships: { covered: false, strength: 0, sampleCount: 0 },
  voice: { covered: false, strength: 0, sampleCount: 0 },
};

const EMPTY_FIXTURE: AdvisorResponse = {
  state: 'empty',
  coverage: EMPTY_COVERAGE,
  nudge: {
    headline: 'Get started',
    subhead: 'Tell me about yourself.',
    actions: [],
  },
  proposals: [],
};

const RICH_FIXTURE: AdvisorResponse = {
  state: 'rich',
  coverage: EMPTY_COVERAGE,
  nudge: {
    headline: 'Echo can build from what you shared',
    subhead: '',
    actions: [],
  },
  proposals: [
    { id: 'p1', title: 'My Proposal', rationale: '', kitType: 'linkedin_post', sourceRefs: [] },
  ],
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
    // Default: empty KB
    vi.mocked(useAdvisor).mockReturnValue({
      advisor: EMPTY_FIXTURE,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it('renders the personalized header and proposal chips when advisor is rich', () => {
    vi.mocked(useAdvisor).mockReturnValue({ advisor: RICH_FIXTURE, loading: false, error: null, refetch: vi.fn() });
    render(<EchoHero />);
    expect(screen.getByRole('heading', { name: /what do you want to create, ara\?/i })).toBeTruthy();
    expect(screen.getByText('My Proposal')).toBeTruthy();
    expect(screen.getByTestId('drafts-thread')).toBeTruthy();
  });

  it('renders the outcome hero header, intent buttons, and starter cards when advisor is empty', () => {
    render(<EchoHero />);
    expect(screen.getByText('Talk for a minute. Post for a week.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /what do you want to create/i })).toBeNull();
    expect(screen.getByText('Turn a video into clips')).toBeTruthy();
    expect(screen.getByText('Write posts from a topic')).toBeTruthy();
    expect(screen.getByText('Create from what Echo knows')).toBeTruthy();
    expect(screen.getByText('Record')).toBeTruthy();
    expect(screen.getByText('Upload')).toBeTruthy();
    expect(screen.getByText('Paste a link')).toBeTruthy();
    expect(screen.getByText('Plan your week')).toBeTruthy();
    expect(screen.getByTestId('drafts-thread')).toBeTruthy();
  });

  it('renders the outcome hero header, intent buttons, and starter cards when advisor is null', () => {
    vi.mocked(useAdvisor).mockReturnValue({ advisor: null, loading: false, error: null, refetch: vi.fn() });
    render(<EchoHero />);
    expect(screen.getByText('Talk for a minute. Post for a week.')).toBeTruthy();
    expect(screen.getByText('Turn a video into clips')).toBeTruthy();
    expect(screen.getByText('Record')).toBeTruthy();
    expect(screen.getByTestId('drafts-thread')).toBeTruthy();
  });

  it('intent buttons and starter cards also render in the rich state', () => {
    vi.mocked(useAdvisor).mockReturnValue({ advisor: RICH_FIXTURE, loading: false, error: null, refetch: vi.fn() });
    render(<EchoHero />);
    expect(screen.getByText('Turn a video into clips')).toBeTruthy();
    expect(screen.getByText('Record')).toBeTruthy();
  });

  it('KB intent button prefills the composer', () => {
    render(<EchoHero />);
    fireEvent.click(screen.getByText('Create from what Echo knows'));
    expect(setInputText).toHaveBeenCalledWith('Make content from my knowledge base');
  });

  it('clip intent button opens the file picker', () => {
    render(<EchoHero />);
    fireEvent.click(screen.getByText('Turn a video into clips'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('clicking a proposal chip calls setInputText with the proposal title', () => {
    vi.mocked(useAdvisor).mockReturnValue({ advisor: RICH_FIXTURE, loading: false, error: null, refetch: vi.fn() });
    render(<EchoHero />);
    fireEvent.click(screen.getByText('My Proposal'));
    expect(setInputText).toHaveBeenCalledWith('My Proposal');
  });

  it('belowFold={false} skips RecentKitsStrip and VoiceStrengthStrip (hidden GenerationForm mount)', () => {
    vi.mocked(useAdvisor).mockReturnValue({ advisor: RICH_FIXTURE, loading: false, error: null, refetch: vi.fn() });
    render(<EchoHero belowFold={false} />);
    expect(screen.queryByTestId('recent-kits-strip')).toBeNull();
    expect(screen.queryByTestId('voice-strength-strip')).toBeNull();
  });

  it('default belowFold renders RecentKitsStrip and VoiceStrengthStrip when advisor is rich', () => {
    vi.mocked(useAdvisor).mockReturnValue({ advisor: RICH_FIXTURE, loading: false, error: null, refetch: vi.fn() });
    render(<EchoHero />);
    expect(screen.getByTestId('recent-kits-strip')).toBeTruthy();
    expect(screen.getByTestId('voice-strength-strip')).toBeTruthy();
  });

  it('wires useEcho onIngestComplete to the advisor refetch', () => {
    const refetch = vi.fn();
    vi.mocked(useAdvisor).mockReturnValue({ advisor: EMPTY_FIXTURE, loading: false, error: null, refetch });
    render(<EchoHero />);
    // EchoHero hands its advisor refetch to useEcho; firing it (as a successful
    // composer ingest would) must refresh the advisor thread.
    expect(hoisted.echoOptions.onIngestComplete).toBeTypeOf('function');
    hoisted.echoOptions.onIngestComplete!();
    expect(refetch).toHaveBeenCalled();
  });
});
