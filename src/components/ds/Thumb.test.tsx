import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { formatDuration } from './format';
import { PlatformBadge } from './PlatformBadge';
import { Thumb } from './Thumb';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [42, '0:42'],
    [42.9, '0:42'],
    [65, '1:05'],
    [3725, '1:02:05'],
    [null, null],
    [undefined, null],
    [NaN, null],
    [-3, null],
    [Infinity, null],
  ])('formats %s as %s', (input, expected) => {
    expect(formatDuration(input as number | null | undefined)).toBe(expected);
  });
});

describe('Thumb', () => {
  it('renders an img with the alt', () => {
    render(<Thumb src="/a.jpg" alt="Clip one" />);
    expect(screen.getByRole('img', { name: 'Clip one' }).tagName).toBe('IMG');
  });

  it('swaps to a placeholder when the image errors', () => {
    const { container } = render(<Thumb src="/a.jpg" alt="Clip one" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Clip one' })).toBeInTheDocument();
  });

  it('shows the placeholder when the image already failed before hydration', () => {
    const proto = HTMLImageElement.prototype;
    const origComplete = Object.getOwnPropertyDescriptor(proto, 'complete');
    const origWidth = Object.getOwnPropertyDescriptor(proto, 'naturalWidth');
    Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => true });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => 0 });
    try {
      const { container } = render(<Thumb src="/missing.jpg" alt="Clip one" />);
      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByRole('img', { name: 'Clip one' })).toBeInTheDocument();
    } finally {
      if (origComplete) Object.defineProperty(proto, 'complete', origComplete);
      else delete (proto as unknown as Record<string, unknown>).complete;
      if (origWidth) Object.defineProperty(proto, 'naturalWidth', origWidth);
      else delete (proto as unknown as Record<string, unknown>).naturalWidth;
    }
  });

  it('retries when src changes after an error', () => {
    const { container, rerender } = render(<Thumb src="/a.jpg" alt="Clip one" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    rerender(<Thumb src="/b.jpg" alt="Clip one" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/b.jpg');
  });

  it('renders a placeholder without src', () => {
    const { container } = render(<Thumb alt="Nothing" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Nothing' })).toBeInTheDocument();
  });

  it('shows a formatted duration, and none for NaN', () => {
    const { rerender } = render(<Thumb alt="x" duration={65} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
    rerender(<Thumb alt="x" duration={NaN} />);
    expect(screen.queryByText(/:/)).toBeNull();
  });

  it('exposes Posted for done and Loading for pending', () => {
    const { rerender } = render(<Thumb alt="x" state="done" />);
    expect(screen.getByText('Posted')).toBeInTheDocument();
    rerender(<Thumb alt="x" state="pending" />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('hides an empty-alt placeholder from assistive tech', () => {
    const { container } = render(<Thumb alt="" />);
    const ph = container.querySelector('[aria-hidden="true"][style]') as HTMLElement;
    expect(ph).not.toBeNull();
    expect(ph).not.toHaveAttribute('role');
    expect(ph).not.toHaveAttribute('aria-label');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('keeps alt="" on the img', () => {
    const { container } = render(<Thumb src="/a.jpg" alt="" />);
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('gives the done check a drop shadow', () => {
    const { container } = render(<Thumb alt="x" state="done" />);
    expect(container.querySelector('svg')!.parentElement!.className).toContain('drop-shadow');
  });

  it('renders a platform badge', () => {
    render(<Thumb alt="x" platform="instagram" />);
    expect(screen.getByRole('img', { name: 'Instagram' })).toBeInTheDocument();
  });
});

describe('PlatformBadge', () => {
  it.each([
    ['instagram', 'Instagram', 'IG'],
    ['linkedin', 'LinkedIn', 'in'],
    ['facebook', 'Facebook', 'f'],
    ['tiktok', 'TikTok', 'TT'],
    ['youtube', 'YouTube', 'YT'],
    ['twitter', 'X', 'X'],
    ['x', 'X', 'X'],
    ['threads', 'Threads', '@'],
    ['blog', 'Blog', 'B'],
  ])('maps %s to %s / %s', (platform, name, glyph) => {
    render(<PlatformBadge platform={platform} />);
    expect(screen.getByRole('img', { name })).toHaveTextContent(glyph);
  });

  it('renders known platforms case-insensitively', () => {
    render(<PlatformBadge platform="Instagram" />);
    const el = screen.getByRole('img', { name: 'Instagram' });
    expect(el).toHaveTextContent('IG');
  });

  it('capitalises unknown platforms', () => {
    render(<PlatformBadge platform="mastodon" />);
    expect(screen.getByRole('img', { name: 'Mastodon' })).toHaveTextContent('M');
  });

  it('uses an AA-safe fallback colour for unknown platforms', () => {
    render(<PlatformBadge platform="mastodon" />);
    expect(screen.getByRole('img', { name: 'Mastodon' }).style.background).toMatch(/#5b6070|rgb\(91, 96, 112\)/i);
  });

  it('renders nothing for empty string', () => {
    const { container } = render(<PlatformBadge platform="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
