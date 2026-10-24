import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const submitFeedback = vi.fn();
const captureException = vi.fn();

vi.mock('@/lib/api-client', () => ({
  api: { help: { submitFeedback: (...args: unknown[]) => submitFeedback(...args), chat: vi.fn() } },
}));
vi.mock('@sentry/nextjs', () => ({ captureException: (...args: unknown[]) => captureException(...args) }));
vi.mock('@/components/guides/WatchWalkthroughLink', () => ({ WatchWalkthroughLink: () => null }));

import { HelpWidget } from './help-widget';

async function openFeedbackAndType(text: string) {
  render(<HelpWidget />);
  await userEvent.click(screen.getByRole('button', { name: /open help/i }));
  await userEvent.click(screen.getByRole('button', { name: 'Feedback' }));
  await userEvent.type(screen.getByPlaceholderText(/tell us what you think/i), text);
}

describe('HelpWidget feedback', () => {
  beforeEach(() => {
    submitFeedback.mockReset();
    captureException.mockReset();
  });

  it('shows a thank-you after a successful submit', async () => {
    submitFeedback.mockResolvedValue({ success: true });
    await openFeedbackAndType('Love it');
    await userEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    expect(submitFeedback).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/your feedback has been submitted/i)).toBeInTheDocument();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('keeps the text, shows an error and reports to Sentry when the request never reaches the server', async () => {
    submitFeedback.mockRejectedValue(new Error('Network Error'));
    await openFeedbackAndType('Upload keeps failing');
    await userEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't reach echome/i);
    expect(screen.getByPlaceholderText(/tell us what you think/i)).toHaveValue('Upload keeps failing');
    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { feature: 'help_feedback', status: 'no_response' } }),
    );
  });

  it('points to support email on a server error, and clears the error when the user edits', async () => {
    submitFeedback.mockRejectedValue({ response: { status: 500 } });
    await openFeedbackAndType('Bug');
    await userEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('support@tryechome.com');
    expect(captureException).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tags: { feature: 'help_feedback', status: '500' } }),
    );

    await userEvent.type(screen.getByPlaceholderText(/tell us what you think/i), '!');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('locks the button while sending so a slow request cannot double-submit', async () => {
    let resolve!: (v: unknown) => void;
    submitFeedback.mockReturnValue(new Promise((r) => { resolve = r; }));
    await openFeedbackAndType('Slow network');
    const button = screen.getByRole('button', { name: /submit feedback/i });
    await userEvent.click(button);

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /sending/i }));
    expect(submitFeedback).toHaveBeenCalledTimes(1);

    resolve({ success: true });
    expect(await screen.findByText(/your feedback has been submitted/i)).toBeInTheDocument();
  });
});
