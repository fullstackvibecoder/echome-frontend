/**
 * EchoHero.copy.test.tsx
 * TDD copy-deck-v3 assertions for composer tooltips, placeholder, and source line.
 *
 * Rendering strategy: EchoExchange is rendered REAL (unmocked) because the
 * textarea placeholder lives there and we need to assert on it. Heavy deps
 * (AdvisorThread, DraftsThreadMessage, EchoExchange-adjacent UI) are mocked
 * the same way as EchoHero.advisor.test.tsx. Hooks are mocked so no network
 * or state-machine side effects fire.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAdvisor } from '@/components/echo/useAdvisor';

// ---- Module mocks (mirror EchoHero.advisor.test.tsx exactly) ----

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

vi.mock('@/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: () => ({ selectedKb: 'kb1' }),
}));

// EchoExchange is NOT mocked here; it renders real so we can assert on the textarea.

vi.mock('@/components/create/DraftsThreadMessage', () => ({
  DraftsThreadMessage: () => <div data-testid="drafts-thread" />,
}));

vi.mock('@/components/create/AdvisorThread', () => ({
  AdvisorThread: () => <div data-testid="advisor-thread" />,
}));

vi.mock('@/components/ui/waveform', () => ({
  Waveform: () => <svg data-testid="waveform" />,
}));

// ---- Import component under test (after mocks registered) ----

import { EchoHero } from './EchoHero';

// ---- Tests ----

describe('EchoHero copy-deck-v3', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    vi.mocked(useAdvisor).mockReturnValue({ advisor: null, loading: false, error: null, refetch: vi.fn() });
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it('attach control has correct aria-label and title', () => {
    render(<EchoHero />);
    const el = screen.getByLabelText('Attach a video, PDF, or document');
    expect(el).toBeTruthy();
    expect(el.getAttribute('title')).toBe('Attach a video, PDF, or document');
  });

  it('mic button has correct aria-label and title', () => {
    render(<EchoHero />);
    const el = screen.getByLabelText('Record your voice');
    expect(el).toBeTruthy();
    expect(el.getAttribute('title')).toBe('Record your voice');
  });

  it('textarea has correct placeholder', () => {
    render(<EchoHero />);
    const el = screen.getByPlaceholderText(
      'Type here. Paste a link, or use the buttons on the left to attach a video or record your voice.',
    );
    expect(el).toBeTruthy();
  });

  it('source helper line is present with correct text', () => {
    render(<EchoHero />);
    const el = screen.getByText(
      /Best way to start: tap the mic and talk for a minute\. You can also paste a link, drop a file, or type a topic\. YouTube links and articles teach your voice\. Zoom, Loom, and Vimeo recordings become clips\./,
    );
    expect(el).toBeTruthy();
  });

  it('no em dash or en dash in rendered output', () => {
    render(<EchoHero />);
    const text = document.body.textContent ?? '';
    expect(text).not.toContain('—'); // em dash
    expect(text).not.toContain('–'); // en dash
  });
});
