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

  it('renders a platform badge', () => {
    render(<Thumb alt="x" platform="instagram" />);
    expect(screen.getByRole('img', { name: 'Instagram' })).toBeInTheDocument();
  });
});

describe('PlatformBadge', () => {
  it('renders known platforms case-insensitively', () => {
    render(<PlatformBadge platform="Instagram" />);
    const el = screen.getByRole('img', { name: 'Instagram' });
    expect(el).toHaveTextContent('IG');
  });

  it('capitalises unknown platforms', () => {
    render(<PlatformBadge platform="mastodon" />);
    expect(screen.getByRole('img', { name: 'Mastodon' })).toHaveTextContent('M');
  });

  it('renders nothing for empty string', () => {
    const { container } = render(<PlatformBadge platform="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
