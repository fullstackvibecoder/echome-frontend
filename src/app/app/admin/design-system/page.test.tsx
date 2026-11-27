import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DesignSystemPage from './page';

describe('DesignSystemPage', () => {
  it('shows a Dark and a Light column and the live theme switch', () => {
    const { container } = render(<DesignSystemPage />);
    expect(screen.getByRole('heading', { name: 'Dark' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Light' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    const forced = Array.from(container.querySelectorAll('[data-je-theme]')).map((el) =>
      el.getAttribute('data-je-theme'),
    );
    expect(forced).toEqual(['dark', 'light']);
  });
});
