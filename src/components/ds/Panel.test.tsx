import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Panel } from './Panel';

describe('Panel', () => {
  it('renders a region named by title with children', () => {
    render(
      <Panel title="Kit" onClose={() => {}}>
        <p>Body text</p>
      </Panel>,
    );
    const region = screen.getByRole('region', { name: 'Kit' });
    expect(region.textContent).toContain('Body text');
  });

  it('calls onClose once when Close is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Panel title="Kit" onClose={onClose}>
        x
      </Panel>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape when focus is inside the panel', async () => {
    const onClose = vi.fn();
    render(
      <Panel title="Kit" onClose={onClose}>
        <button type="button">Inside</button>
      </Panel>,
    );
    screen.getByRole('button', { name: 'Inside' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on Escape when focus is outside the panel', async () => {
    const onClose = vi.fn();
    render(
      <>
        <input aria-label="Echo box" />
        <Panel title="Kit" onClose={onClose}>
          x
        </Panel>
      </>,
    );
    screen.getByLabelText('Echo box').focus();
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
