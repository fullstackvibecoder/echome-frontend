import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({ api: { kbContent: { paste: vi.fn().mockResolvedValue({}) } } }));
vi.mock('@/lib/toast', () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));

let mockQuery = '';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mockQuery) }));

import { api } from '@/lib/api-client';
import { ClaudeNudgeCard } from './ClaudeNudgeCard';
import { CLAUDE_FILL_DONE_KEY } from '@/app/app/voice/components/FillFromClaude';

describe('ClaudeNudgeCard on Create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockQuery = '';
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('shows the transfer card with the Claude logo', () => {
    render(<ClaudeNudgeCard />);
    expect(screen.getByText('Transfer what Claude knows about you into Echo')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Claude' }).length).toBeGreaterThan(0);
  });

  it('stays hidden once done', () => {
    localStorage.setItem(CLAUDE_FILL_DONE_KEY, 'x');
    render(<ClaudeNudgeCard />);
    expect(screen.queryByText('Transfer what Claude knows about you into Echo')).toBeNull();
  });

  it('Skip hides it for good', () => {
    render(<ClaudeNudgeCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(screen.queryByText('Transfer what Claude knows about you into Echo')).toBeNull();
    expect(localStorage.getItem(CLAUDE_FILL_DONE_KEY)).toBeTruthy();
  });

  it('adding a profile refreshes Echo and hides the card', async () => {
    const onIngest = vi.fn();
    window.addEventListener('echo:ingest-complete', onIngest);
    render(<ClaudeNudgeCard />);
    fireEvent.click(screen.getByRole('button', { name: /Start transfer/ }));
    fireEvent.change(screen.getByLabelText("Claude's reply"), { target: { value: 'WHAT I DO\nI help first-time buyers in Halifax. '.repeat(4) } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to my knowledge base' }));
    await waitFor(() => expect(onIngest).toHaveBeenCalled());
    expect(api.kbContent.paste).toHaveBeenCalled();
    expect(localStorage.getItem(CLAUDE_FILL_DONE_KEY)).toBeTruthy();
    window.removeEventListener('echo:ingest-complete', onIngest);
  });

  it('?transfer=claude shows the card even after it was done or skipped, and scrolls to it', () => {
    localStorage.setItem(CLAUDE_FILL_DONE_KEY, 'x');
    mockQuery = 'transfer=claude';
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<ClaudeNudgeCard />);
    expect(screen.getByText('Transfer what Claude knows about you into Echo')).toBeInTheDocument();
    expect(scroll).toHaveBeenCalled();
  });

  it('other query params do not override the done flag', () => {
    localStorage.setItem(CLAUDE_FILL_DONE_KEY, 'x');
    mockQuery = 'transfer=other';
    render(<ClaudeNudgeCard />);
    expect(screen.queryByText('Transfer what Claude knows about you into Echo')).toBeNull();
  });
});
