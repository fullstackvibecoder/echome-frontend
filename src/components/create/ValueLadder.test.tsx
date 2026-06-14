import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValueLadder, type LadderActionId } from './ValueLadder';

const DASH = /[–—]/; // en dash, em dash

describe('ValueLadder', () => {
  it('renders the five rungs in priority order', () => {
    render(<ValueLadder onAction={vi.fn()} />);
    const ctas = screen.getAllByTestId('ladder-cta').map((n) => n.textContent ?? '');
    expect(ctas[0]).toMatch(/record your voice/i);
    expect(ctas[1]).toMatch(/video of you talking/i);
    expect(ctas[2]).toMatch(/bring your emails/i);
    expect(ctas[3]).toMatch(/paste something you wrote/i);
    expect(ctas[4]).toMatch(/published work/i);
  });

  it('demotes the cold-topic path (not a peer rung)', () => {
    render(<ValueLadder onAction={vi.fn()} />);
    const demoted = screen.getByTestId('ladder-demoted');
    expect(demoted.textContent).toMatch(/in a hurry/i);
    // It must not be one of the five ranked CTAs.
    expect(screen.getAllByTestId('ladder-cta')).toHaveLength(5);
  });

  it('fires onAction with the correct id per rung', async () => {
    const onAction = vi.fn();
    render(<ValueLadder onAction={onAction} />);
    await userEvent.click(screen.getAllByTestId('ladder-cta')[0]);
    expect(onAction).toHaveBeenCalledWith('voice' satisfies LadderActionId);
    await userEvent.click(screen.getByTestId('ladder-demoted'));
    expect(onAction).toHaveBeenCalledWith('topic' satisfies LadderActionId);
  });

  it('contains no em or en dashes in copy', () => {
    const { container } = render(<ValueLadder onAction={vi.fn()} />);
    expect(container.textContent ?? '').not.toMatch(DASH);
  });
});
