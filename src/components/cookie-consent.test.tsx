import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

import { CookieConsent } from './cookie-consent';

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.removeItem('cookie-consent');
  });

  it('shows the banner on marketing pages when consent is missing', () => {
    mockUsePathname.mockReturnValue('/');
    render(<CookieConsent />);
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
  });

  it('never shows the banner inside the signed-in app', () => {
    mockUsePathname.mockReturnValue('/app');
    const { container } = render(<CookieConsent />);
    expect(container).toBeEmptyDOMElement();
  });

  it('never shows the banner on nested app routes', () => {
    mockUsePathname.mockReturnValue('/app/library');
    const { container } = render(<CookieConsent />);
    expect(container).toBeEmptyDOMElement();
  });

  it('stays hidden on marketing pages once consent is stored', () => {
    localStorage.setItem('cookie-consent', 'accepted');
    mockUsePathname.mockReturnValue('/');
    const { container } = render(<CookieConsent />);
    expect(container).toBeEmptyDOMElement();
  });
});
