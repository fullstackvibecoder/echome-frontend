import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/api-client', () => ({ api: { kbContent: { paste: vi.fn().mockResolvedValue({}) } } }));
vi.mock('@/lib/toast', () => ({ showSuccessToast: vi.fn(), showErrorToast: vi.fn() }));

import { api } from '@/lib/api-client';
import ClaudeContent from './ClaudeContent';

describe('onboarding Claude step', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('Skip for now goes to the app without saving', () => {
    render(<ClaudeContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));
    expect(push).toHaveBeenCalledWith('/app');
    expect(api.kbContent.paste).not.toHaveBeenCalled();
  });

  it('saves the pasted reply to the default knowledge base, then goes to the app', async () => {
    render(<ClaudeContent />);
    fireEvent.click(screen.getByRole('button', { name: 'Start transfer' }));
    fireEvent.change(screen.getByLabelText("Claude's reply"), { target: { value: 'I help first-time buyers in Halifax. '.repeat(4) } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to my knowledge base' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app'));
    expect(vi.mocked(api.kbContent.paste).mock.calls[0][0]).toMatchObject({ sourceType: 'claude_profile', knowledgeBaseId: undefined });
  });
});
