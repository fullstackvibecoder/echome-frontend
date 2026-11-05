/**
 * Fill from Claude: one click opens Claude with the request, the pasted reply
 * is saved as a claude_profile source. No em or en dashes in user copy.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({ api: { kbContent: { paste: vi.fn() } } }));
vi.mock('@/lib/toast', () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));

import { api } from '@/lib/api-client';
import { FillFromClaude, CLAUDE_PROFILE_REQUEST } from './FillFromClaude';

const REPLY = 'What I do and who I serve: I run a real estate team in Halifax helping first-time buyers. '.repeat(2);

describe('FillFromClaude', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('copies the request and opens Claude with it prefilled', async () => {
    render(<FillFromClaude knowledgeBaseId="kb-1" onAdded={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Claude' }));
    await waitFor(() => expect(window.open).toHaveBeenCalled());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(CLAUDE_PROFILE_REQUEST);
    expect((window.open as any).mock.calls[0][0]).toBe(`https://claude.ai/new?q=${encodeURIComponent(CLAUDE_PROFILE_REQUEST)}`);
    expect(CLAUDE_PROFILE_REQUEST).not.toMatch(/[–—]/);
  });

  it('saves the pasted reply as a claude_profile source', async () => {
    (api.kbContent.paste as any).mockResolvedValue({});
    const onAdded = vi.fn();
    render(<FillFromClaude knowledgeBaseId="kb-1" onAdded={onAdded} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask Claude' }));
    const save = await screen.findByRole('button', { name: 'Add to my knowledge base' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Claude's reply"), { target: { value: REPLY } });
    fireEvent.click(save);
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(api.kbContent.paste).toHaveBeenCalledWith({
      text: REPLY.trim(),
      title: 'What Claude knows about me',
      sourceType: 'claude_profile',
      knowledgeBaseId: 'kb-1',
    });
  });
});
