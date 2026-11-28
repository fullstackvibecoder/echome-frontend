import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelHost } from './PanelHost';

describe('PanelHost', () => {
  it('PanelHost links to the full page and closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PanelHost target={{ kind: 'calendar' }} onClose={onClose} />);
    expect(screen.getByRole('link', { name: 'Open full page' })).toHaveAttribute('href', '/app/calendar');
    expect(screen.getByText('This view is moving into the panel. For now it opens as a full page.')).toBeInTheDocument();
    screen.getByRole('link', { name: 'Open full page' }).focus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
