import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getRules = vi.fn();
const saveRules = vi.fn();
const suggestRules = vi.fn();
const paste = vi.fn();
vi.mock('@/lib/api-client', () => ({
  api: {
    voice: { getRules: () => getRules(), saveRules: (r: unknown) => saveRules(r), suggestRules: (t?: string) => suggestRules(t) },
    kbContent: { paste: (b: unknown) => paste(b) },
  },
}));
vi.mock('@/lib/toast', () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn(), showInfoToast: vi.fn() }));

import { VoiceRulesReview, mergeRules } from './VoiceRulesReview';
import { FillFromClaude } from '@/app/app/voice/components/FillFromClaude';

const SUGGESTED = {
  usePhrases: ['Six weeks. Flat rate.', 'Context is King.'],
  neverUse: ['Vibrant'],
  formatRules: ['No em dashes.'],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(window, 'open').mockImplementation(() => null);
});

describe('mergeRules', () => {
  it('appends new items and skips duplicates', () => {
    expect(mergeRules({ usePhrases: ['A'], neverUse: [], formatRules: [] }, { usePhrases: ['a', 'B'], neverUse: ['C'], formatRules: [] }))
      .toEqual({ usePhrases: ['A', 'B'], neverUse: ['C'], formatRules: [] });
  });
});

describe('VoiceRulesReview', () => {
  it('saves only ticked suggestions, added to what the user already has', async () => {
    getRules.mockResolvedValue({ success: true, data: { usePhrases: [], neverUse: ['Leverage'], formatRules: [] } });
    saveRules.mockResolvedValue({ success: true });
    const onDone = vi.fn();
    render(<VoiceRulesReview suggestions={SUGGESTED} onDone={onDone} />);
    fireEvent.click(screen.getByLabelText('Context is King.'));
    fireEvent.click(screen.getByRole('button', { name: 'Save 3 to my voice' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(saveRules).toHaveBeenCalledWith({
      usePhrases: ['Six weeks. Flat rate.'],
      neverUse: ['Leverage', 'Vibrant'],
      formatRules: ['No em dashes.'],
    });
  });

  it('Not now saves nothing', () => {
    const onDone = vi.fn();
    render(<VoiceRulesReview suggestions={SUGGESTED} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDone).toHaveBeenCalledWith(false);
    expect(saveRules).not.toHaveBeenCalled();
  });
});

describe('FillFromClaude then voice rules', () => {
  const REPLY = 'PHRASES I USE\nSix weeks. Flat rate.\nWORDS AND PHRASES I NEVER USE\nVibrant. '.repeat(3);

  async function transfer(onAdded: () => void) {
    paste.mockResolvedValue({});
    render(<FillFromClaude knowledgeBaseId={null} onAdded={onAdded} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start transfer' }));
    fireEvent.change(screen.getByLabelText("Claude's reply"), { target: { value: REPLY } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to my knowledge base' }));
  }

  it('offers the suggested rules before finishing', async () => {
    suggestRules.mockResolvedValue({ success: true, data: SUGGESTED });
    const onAdded = vi.fn();
    await transfer(onAdded);
    expect(await screen.findByText('Echo found your voice rules')).toBeInTheDocument();
    expect(suggestRules).toHaveBeenCalledWith(REPLY.trim());
    expect(onAdded).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onAdded).toHaveBeenCalled();
  });

  it('finishes straight away when there is nothing to suggest or it fails', async () => {
    suggestRules.mockRejectedValue(new Error('down'));
    const onAdded = vi.fn();
    await transfer(onAdded);
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
  });
});
