import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ClipCleanBanner } from './ClipCleanBanner';

const report = { fillerRemoved: 8, pausesTrimmed: 3, secondsSaved: 4 };

describe('ClipCleanBanner', () => {
  it('summarizes the clean report with correct pluralization', () => {
    render(<ClipCleanBanner report={report} showingOriginal={false} onToggleOriginal={vi.fn()} />);
    expect(screen.getByText(/removed 8 filler words/i)).toBeInTheDocument();
    expect(screen.getByText(/trimmed 3 pauses/i)).toBeInTheDocument();
    expect(screen.getByText(/saved 4s/i)).toBeInTheDocument();
  });

  it('uses singular nouns when counts are 1', () => {
    render(
      <ClipCleanBanner
        report={{ fillerRemoved: 1, pausesTrimmed: 1, secondsSaved: 1 }}
        showingOriginal={false}
        onToggleOriginal={vi.fn()}
      />,
    );
    expect(screen.getByText(/removed 1 filler word,/i)).toBeInTheDocument();
    expect(screen.getByText(/trimmed 1 pause,/i)).toBeInTheDocument();
  });

  it('shows "Compare to original" and toggles on click', async () => {
    const onToggle = vi.fn();
    render(<ClipCleanBanner report={report} showingOriginal={false} onToggleOriginal={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /compare to original/i }));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('shows "Back to cleaned" when viewing the original', async () => {
    const onToggle = vi.fn();
    render(<ClipCleanBanner report={report} showingOriginal={true} onToggleOriginal={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /back to cleaned/i }));
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
