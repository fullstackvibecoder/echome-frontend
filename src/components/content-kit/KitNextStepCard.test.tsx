import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { KitNextStepCard, nextStepFor } from './KitNextStepCard';

describe('nextStepFor', () => {
  it('asks to connect when no account is connected', () => {
    expect(nextStepFor(0, false)).toBe('connect');
  });
  it('asks to schedule when connected but nothing scheduled yet', () => {
    expect(nextStepFor(2, false)).toBe('schedule');
  });
  it('nudges nothing once a post has been scheduled', () => {
    expect(nextStepFor(0, true)).toBeNull();
    expect(nextStepFor(3, true)).toBeNull();
  });
});

describe('KitNextStepCard', () => {
  it('links to Connections for the connect step', () => {
    render(<KitNextStepCard step="connect" onSchedule={vi.fn()} />);
    expect(screen.getByRole('link', { name: /connect an account/i })).toHaveAttribute(
      'href',
      '/app/settings?tab=connections',
    );
  });

  it('opens the schedule flow for the schedule step', async () => {
    const onSchedule = vi.fn();
    render(<KitNextStepCard step="schedule" onSchedule={onSchedule} />);
    await userEvent.click(screen.getByRole('button', { name: /schedule with echo/i }));
    expect(onSchedule).toHaveBeenCalledTimes(1);
  });

  it('renders nothing without a step', () => {
    const { container } = render(<KitNextStepCard step={null} onSchedule={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
