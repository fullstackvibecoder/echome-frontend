import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CreateStarterCards } from './CreateStarterCards';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('CreateStarterCards', () => {
  it('renders the four starter cards', () => {
    render(<CreateStarterCards onRecord={vi.fn()} onUpload={vi.fn()} onPasteLink={vi.fn()} />);
    expect(screen.getByText('Record')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Paste a link')).toBeInTheDocument();
    expect(screen.getByText('Plan your week')).toBeInTheDocument();
  });

  it('wires record, upload, and link cards to their handlers', async () => {
    const onRecord = vi.fn(); const onUpload = vi.fn(); const onPasteLink = vi.fn();
    render(<CreateStarterCards onRecord={onRecord} onUpload={onUpload} onPasteLink={onPasteLink} />);
    await userEvent.click(screen.getByText('Record'));
    await userEvent.click(screen.getByText('Upload'));
    await userEvent.click(screen.getByText('Paste a link'));
    expect(onRecord).toHaveBeenCalledOnce();
    expect(onUpload).toHaveBeenCalledOnce();
    expect(onPasteLink).toHaveBeenCalledOnce();
  });

  it('plan card navigates to the calendar', async () => {
    render(<CreateStarterCards onRecord={vi.fn()} onUpload={vi.fn()} onPasteLink={vi.fn()} />);
    await userEvent.click(screen.getByText('Plan your week'));
    expect(pushMock).toHaveBeenCalledWith('/app/calendar');
  });
});
