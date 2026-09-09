import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AccountMenu } from './AccountMenu';

describe('AccountMenu', () => {
  it('opens on avatar click and shows the four external links plus logout', async () => {
    const onLogout = vi.fn();
    render(<AccountMenu user={{ name: 'Ara', email: 'ara@example.com' }} onLogout={onLogout} />);

    const trigger = screen.getByRole('button', { name: /account menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();

    const links = screen.getAllByRole('menuitem').filter((el) => el.tagName === 'A') as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/guides',
      '/community',
      '/tools/compress-video',
      '/tools/transcribe',
    ]);
    for (const a of links) {
      expect(a).toHaveAttribute('target', '_blank');
      expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(screen.getAllByText('FREE')).toHaveLength(2);

    await userEvent.click(screen.getByRole('menuitem', { name: /logout/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and on outside click', async () => {
    render(
      <div>
        <button>outside</button>
        <AccountMenu user={{ name: 'Ara', email: 'ara@example.com' }} onLogout={vi.fn()} />
      </div>,
    );
    const trigger = screen.getByRole('button', { name: /account menu/i });

    await userEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(screen.getByText('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('falls back to U when the user has no name', () => {
    render(<AccountMenu user={{ email: 'x@example.com' }} onLogout={vi.fn()} />);
    expect(screen.getByRole('button', { name: /account menu/i })).toHaveTextContent('U');
  });
});
