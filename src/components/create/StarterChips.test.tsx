import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StarterChips } from './StarterChips';

describe('StarterChips', () => {
  it('renders the three starter actions', () => {
    render(<StarterChips onTalk={vi.fn()} onAttach={vi.fn()} onType={vi.fn()} />);
    expect(screen.getByText('Talk for one minute')).toBeInTheDocument();
    expect(screen.getByText('Drop a Zoom recording')).toBeInTheDocument();
    expect(screen.getByText('Paste a YouTube link')).toBeInTheDocument();
  });

  it('wires each chip to its handler', async () => {
    const onTalk = vi.fn(); const onAttach = vi.fn(); const onType = vi.fn();
    render(<StarterChips onTalk={onTalk} onAttach={onAttach} onType={onType} />);
    await userEvent.click(screen.getByText('Talk for one minute'));
    await userEvent.click(screen.getByText('Drop a Zoom recording'));
    await userEvent.click(screen.getByText('Paste a YouTube link'));
    expect(onTalk).toHaveBeenCalledOnce();
    expect(onAttach).toHaveBeenCalledOnce();
    expect(onType).toHaveBeenCalledOnce();
  });
});
